/**
 * useInference Hook - Backend API-based Emotion Detection
 * 
 * Captures video frames every 10 seconds and sends them to the
 * backend API for emotion analysis using the FER+ ONNX model.
 * 
 * ARCHITECTURE:
 * - Frontend captures frame from video element
 * - Sends base64 image to POST /api/emotion/analyze/
 * - Backend runs face detection + FER+ emotion classification
 * - Returns dominant emotion with confidence
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useEmotionStore, type EmotionVector, type FusedEmotion } from '../stores';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const ANALYSIS_INTERVAL_MS = 10000; // 10 seconds

export interface InferenceOptions {
    useMockData?: boolean;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
}

interface UseInferenceReturn {
    isReady: boolean;
    isLoading: boolean;
    error: string | null;
    modelStatus: {
        vision: 'loading' | 'ready' | 'error' | 'idle';
        audio: 'loading' | 'ready' | 'error' | 'idle';
    };
    processVideoFrame: (imageData: ImageData) => void;
    processAudioChunk: (audioData: Float32Array, sampleRate: number) => void;
}

// Emotion mapping from backend to our store format
const EMOTION_MAP: Record<string, keyof EmotionVector> = {
    'neutral': 'neutral',
    'happiness': 'happiness',
    'happy': 'happiness',
    'surprise': 'surprise',
    'sadness': 'sadness',
    'sad': 'sadness',
    'anger': 'anger',
    'angry': 'anger',
    'disgust': 'disgust',
    'fear': 'fear',
    'contempt': 'contempt',
};

/**
 * Capture video frame as base64 JPEG
 */
function captureFrameAsBase64(video: HTMLVideoElement): string | null {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
        console.error('[Inference] Failed to capture frame:', e);
        return null;
    }
}

/**
 * Call backend API to analyze emotion
 */
async function analyzeEmotionAPI(imageBase64: string): Promise<{
    emotion: string;
    confidence: number;
    faceDetected: boolean;
    allEmotions: Record<string, number>;
}> {
    const response = await fetch(`${API_BASE_URL}/emotion/analyze/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
        emotion: data.emotion || 'neutral',
        confidence: data.confidence || 0,
        faceDetected: data.face_detected || false,
        allEmotions: data.all_emotions || {},
    };
}

/**
 * Create emotion vector from API response
 */
function createEmotionVector(allEmotions: Record<string, number>): EmotionVector {
    const vector: EmotionVector = {
        neutral: 0,
        happiness: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        surprise: 0,
        disgust: 0,
        contempt: 0,
    };

    // Map API emotions to our vector
    for (const [emotion, score] of Object.entries(allEmotions)) {
        const key = EMOTION_MAP[emotion];
        if (key && key in vector) {
            vector[key] = score;
        }
    }

    return vector;
}

export function useInference(options: InferenceOptions = {}): UseInferenceReturn {
    const { useMockData = false, videoRef } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modelStatus, setModelStatus] = useState<UseInferenceReturn['modelStatus']>({
        vision: 'idle',
        audio: 'idle',
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const setFusedEmotion = useEmotionStore((s) => s.setFusedEmotion);
    const setVisionResult = useEmotionStore((s) => s.setVisionResult);

    // Analyze emotion from backend
    const analyzeFrame = useCallback(async () => {
        if (!videoRef?.current || videoRef.current.readyState < 2) {
            return;
        }

        try {
            setIsLoading(true);

            // Capture frame
            const frameBase64 = captureFrameAsBase64(videoRef.current);
            if (!frameBase64) {
                throw new Error('Failed to capture frame');
            }

            // Call backend API
            const result = await analyzeEmotionAPI(frameBase64);

            if (result.faceDetected) {
                const emotionVector = createEmotionVector(result.allEmotions);
                const mappedEmotion = EMOTION_MAP[result.emotion] || result.emotion;

                // Update vision result
                setVisionResult({
                    emotionVector,
                    dominantEmotion: mappedEmotion,
                    confidence: result.confidence,
                    timestamp: Date.now(),
                });

                // Update fused emotion
                const fusedEmotion: FusedEmotion = {
                    emotionVector,
                    dominantEmotion: mappedEmotion,
                    confidence: result.confidence,
                    conflictDetected: false,
                    conflictType: 'none',
                    conflictDescription: null,
                    timestamp: Date.now(),
                };

                setFusedEmotion(fusedEmotion);
                setModelStatus((prev) => ({ ...prev, vision: 'ready' }));
                setError(null);
            } else {
                // No face detected
                setModelStatus((prev) => ({ ...prev, vision: 'ready' }));
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            console.error('[Inference] Analysis failed:', errorMessage);
            setError(errorMessage);
            setModelStatus((prev) => ({ ...prev, vision: 'error' }));
        } finally {
            setIsLoading(false);
        }
    }, [videoRef, setFusedEmotion, setVisionResult]);

    // Start/stop interval based on demo mode and videoRef
    useEffect(() => {
        if (useMockData) {
            // Mock data mode
            setModelStatus({ vision: 'ready', audio: 'idle' });

            const mockEmotions: (keyof EmotionVector)[] = ['happiness', 'neutral', 'sadness', 'surprise'];

            intervalRef.current = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * mockEmotions.length);
                const randomEmotion = mockEmotions[randomIndex] ?? 'neutral';
                const confidence = 0.6 + Math.random() * 0.3;

                const emotionVector: EmotionVector = {
                    neutral: 0, happiness: 0, sadness: 0, anger: 0,
                    fear: 0, surprise: 0, disgust: 0, contempt: 0,
                };
                emotionVector[randomEmotion] = confidence;

                setVisionResult({
                    emotionVector,
                    dominantEmotion: randomEmotion,
                    confidence,
                    timestamp: Date.now(),
                });

                setFusedEmotion({
                    emotionVector,
                    dominantEmotion: randomEmotion,
                    confidence,
                    conflictDetected: false,
                    conflictType: 'none',
                    conflictDescription: null,
                    timestamp: Date.now(),
                });
            }, 3000);

        } else if (videoRef?.current) {
            // Real mode - call backend every 10 seconds
            setModelStatus({ vision: 'loading', audio: 'idle' });

            // Initial analysis after short delay
            const initialTimeout = setTimeout(() => {
                analyzeFrame();
            }, 1000);

            // Set up interval
            intervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);

            return () => {
                clearTimeout(initialTimeout);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [useMockData, videoRef, analyzeFrame, setFusedEmotion, setVisionResult]);

    // Legacy callbacks (no-ops, kept for interface compatibility)
    const processVideoFrame = useCallback(() => { }, []);
    const processAudioChunk = useCallback(() => { }, []);

    return {
        isReady: modelStatus.vision === 'ready',
        isLoading,
        error,
        modelStatus,
        processVideoFrame,
        processAudioChunk,
    };
}
