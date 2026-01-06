/**
 * useInference Hook - Orchestrates ML inference workers
 * 
 * Manages:
 * - Vision Worker (facial emotion recognition with ONNX)
 * - Audio Worker (speech emotion recognition with Transformers.js)
 * - Fusion Algorithm (multi-modal combination)
 * - Mock mode for development/demo
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useEmotionStore, type EmotionVector, type FusedEmotion } from '../stores';

// Import workers using Vite's worker syntax
import VisionWorker from '../workers/vision.worker?worker';
import AudioWorker from '../workers/audio.worker?worker';

export interface InferenceOptions {
    useMockData?: boolean;
    visionModel?: string;
    audioModel?: string;
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

// Emotion labels matching our models
const EMOTION_LABELS = [
    'neutral',
    'happiness',
    'sadness',
    'anger',
    'fear',
    'surprise',
    'disgust',
    'contempt',
] as const;

// Weights for fusion algorithm
const FUSION_WEIGHTS = {
    vision: 0.6,
    audio: 0.4,
};

// Conflict detection threshold
const CONFLICT_THRESHOLD = 0.4;

/**
 * Create a normalized emotion vector from raw scores
 */
function createEmotionVector(scores: number[]): EmotionVector {
    const total = scores.reduce((sum, s) => sum + s, 0) || 1;
    const normalized = scores.map((s) => s / total);

    return {
        neutral: normalized[0] ?? 0,
        happiness: normalized[1] ?? 0,
        sadness: normalized[2] ?? 0,
        anger: normalized[3] ?? 0,
        fear: normalized[4] ?? 0,
        surprise: normalized[5] ?? 0,
        disgust: normalized[6] ?? 0,
        contempt: normalized[7] ?? 0,
    };
}

/**
 * Find dominant emotion from vector
 */
function getDominantEmotion(vector: EmotionVector): { emotion: string; confidence: number } {
    let maxEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(vector)) {
        if (score > maxScore) {
            maxScore = score;
            maxEmotion = emotion;
        }
    }

    return { emotion: maxEmotion, confidence: maxScore };
}

/**
 * Fuse vision and audio emotion vectors
 */
function fuseEmotions(
    vision: EmotionVector | null,
    audio: EmotionVector | null
): FusedEmotion {
    const timestamp = Date.now();

    // If no modality available
    if (!vision && !audio) {
        return {
            emotionVector: {
                neutral: 1,
                happiness: 0,
                sadness: 0,
                anger: 0,
                fear: 0,
                surprise: 0,
                disgust: 0,
                contempt: 0,
            },
            dominantEmotion: 'neutral',
            confidence: 0,
            conflictDetected: false,
            conflictType: 'none',
            conflictDescription: null,
            timestamp,
        };
    }

    if (!audio) {
        const { emotion, confidence } = getDominantEmotion(vision!);
        return {
            emotionVector: vision!,
            dominantEmotion: emotion,
            confidence,
            conflictDetected: false,
            conflictType: 'none',
            conflictDescription: null,
            timestamp,
        };
    }

    if (!vision) {
        const { emotion, confidence } = getDominantEmotion(audio);
        return {
            emotionVector: audio,
            dominantEmotion: emotion,
            confidence,
            conflictDetected: false,
            conflictType: 'none',
            conflictDescription: null,
            timestamp,
        };
    }

    // Weighted fusion of both modalities
    const fused: EmotionVector = {
        neutral: vision.neutral * FUSION_WEIGHTS.vision + audio.neutral * FUSION_WEIGHTS.audio,
        happiness: vision.happiness * FUSION_WEIGHTS.vision + audio.happiness * FUSION_WEIGHTS.audio,
        sadness: vision.sadness * FUSION_WEIGHTS.vision + audio.sadness * FUSION_WEIGHTS.audio,
        anger: vision.anger * FUSION_WEIGHTS.vision + audio.anger * FUSION_WEIGHTS.audio,
        fear: vision.fear * FUSION_WEIGHTS.vision + audio.fear * FUSION_WEIGHTS.audio,
        surprise: vision.surprise * FUSION_WEIGHTS.vision + audio.surprise * FUSION_WEIGHTS.audio,
        disgust: vision.disgust * FUSION_WEIGHTS.vision + audio.disgust * FUSION_WEIGHTS.audio,
        contempt: vision.contempt * FUSION_WEIGHTS.vision + audio.contempt * FUSION_WEIGHTS.audio,
    };

    const { emotion: fusedEmotion, confidence } = getDominantEmotion(fused);
    const { emotion: visionEmotion } = getDominantEmotion(vision);
    const { emotion: audioEmotion } = getDominantEmotion(audio);

    // Detect conflicts between modalities
    let conflictDetected = false;
    let conflictType: FusedEmotion['conflictType'] = 'none';
    let conflictDescription: string | null = null;

    // Check for sarcasm: happy face + negative voice
    if (
        visionEmotion === 'happiness' &&
        (audioEmotion === 'anger' || audioEmotion === 'contempt' || audioEmotion === 'disgust')
    ) {
        const visionConfidence = vision.happiness;
        const audioConfidence = audio[audioEmotion as keyof EmotionVector];

        if (visionConfidence > CONFLICT_THRESHOLD && audioConfidence > CONFLICT_THRESHOLD) {
            conflictDetected = true;
            conflictType = 'sarcasm';
            conflictDescription = `Possible sarcasm detected: face shows ${visionEmotion} but voice suggests ${audioEmotion}`;
        }
    }

    // Check for emotional masking: neutral face + emotional voice
    if (
        visionEmotion === 'neutral' &&
        audioEmotion !== 'neutral' &&
        vision.neutral > 0.5 &&
        audio[audioEmotion as keyof EmotionVector] > CONFLICT_THRESHOLD
    ) {
        conflictDetected = true;
        conflictType = 'masking';
        conflictDescription = `Possible emotional masking: face is neutral but voice suggests ${audioEmotion}`;
    }

    // Check for mixed signals
    if (
        !conflictDetected &&
        visionEmotion !== audioEmotion &&
        visionEmotion !== 'neutral' &&
        audioEmotion !== 'neutral'
    ) {
        const visionConfidence = vision[visionEmotion as keyof EmotionVector];
        const audioConfidence = audio[audioEmotion as keyof EmotionVector];

        if (visionConfidence > CONFLICT_THRESHOLD && audioConfidence > CONFLICT_THRESHOLD) {
            conflictDetected = true;
            conflictType = 'mixed';
            conflictDescription = `Mixed signals: face shows ${visionEmotion}, voice suggests ${audioEmotion}`;
        }
    }

    return {
        emotionVector: fused,
        dominantEmotion: fusedEmotion,
        confidence,
        conflictDetected,
        conflictType,
        conflictDescription,
        timestamp,
    };
}

/**
 * Generate mock emotion data for demo/testing
 */
function generateMockEmotionVector(): EmotionVector {
    const scores = EMOTION_LABELS.map(() => Math.random());
    return createEmotionVector(scores);
}

export function useInference(options: InferenceOptions = {}): UseInferenceReturn {
    const { useMockData = false } = options;

    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modelStatus, setModelStatus] = useState<{
        vision: 'loading' | 'ready' | 'error' | 'idle';
        audio: 'loading' | 'ready' | 'error' | 'idle';
    }>({ vision: 'idle', audio: 'idle' });

    const setVisionResult = useEmotionStore((s) => s.setVisionResult);
    const setAudioResult = useEmotionStore((s) => s.setAudioResult);
    const setFusedEmotion = useEmotionStore((s) => s.setFusedEmotion);
    const setHardwareCapabilities = useEmotionStore((s) => s.setHardwareCapabilities);
    const visionResult = useEmotionStore((s) => s.visionResult);
    const audioResult = useEmotionStore((s) => s.audioResult);

    // Worker refs
    const visionWorkerRef = useRef<Worker | null>(null);
    const audioWorkerRef = useRef<Worker | null>(null);

    // Frame throttling
    const lastVisionProcessTime = useRef(0);
    const VISION_THROTTLE_MS = 100; // ~10 FPS

    /**
     * Initialize workers
     */
    useEffect(() => {
        if (useMockData) {
            console.log('[Inference] Using mock data mode');
            setHardwareCapabilities(false, 'wasm');
            setIsReady(true);
            setIsLoading(false);
            return;
        }

        const initWorkers = async () => {
            setIsLoading(true);
            setModelStatus({ vision: 'loading', audio: 'loading' });

            try {
                // Detect WebGPU
                let hasWebGPU = false;
                if ('gpu' in navigator) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const adapter = await (navigator as any).gpu?.requestAdapter();
                        hasWebGPU = !!adapter;
                    } catch {
                        hasWebGPU = false;
                    }
                }
                setHardwareCapabilities(hasWebGPU, hasWebGPU ? 'webgpu' : 'wasm');

                // Initialize Vision Worker
                visionWorkerRef.current = new VisionWorker();
                visionWorkerRef.current.onmessage = (event) => {
                    const { type, emotionVector, dominantEmotion, confidence, timestamp, error: workerError } = event.data;

                    if (type === 'initialized') {
                        console.log('[Inference] Vision model loaded');
                        setModelStatus((prev) => ({ ...prev, vision: 'ready' }));
                    } else if (type === 'result') {
                        setVisionResult({
                            emotionVector,
                            dominantEmotion,
                            confidence,
                            timestamp,
                        });
                    } else if (type === 'error') {
                        console.error('[Inference] Vision error:', workerError);
                        setModelStatus((prev) => ({ ...prev, vision: 'error' }));
                    }
                };

                // Initialize Audio Worker
                audioWorkerRef.current = new AudioWorker();
                audioWorkerRef.current.onmessage = (event) => {
                    const { type, emotionVector, dominantEmotion, confidence, timestamp, error: workerError, message } = event.data;

                    if (type === 'initialized') {
                        console.log('[Inference] Audio model loaded');
                        setModelStatus((prev) => ({ ...prev, audio: 'ready' }));
                    } else if (type === 'status') {
                        console.log('[Inference] Audio status:', message);
                    } else if (type === 'result') {
                        setAudioResult({
                            emotionVector,
                            dominantEmotion,
                            confidence,
                            timestamp,
                        });
                    } else if (type === 'error') {
                        console.error('[Inference] Audio error:', workerError);
                        setModelStatus((prev) => ({ ...prev, audio: 'error' }));
                    }
                };

                // Start initialization
                visionWorkerRef.current.postMessage({ type: 'init' });
                audioWorkerRef.current.postMessage({ type: 'init' });

                setIsReady(true);
                setIsLoading(false);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize inference';
                setError(errorMessage);
                setIsLoading(false);
            }
        };

        initWorkers();

        return () => {
            if (visionWorkerRef.current) {
                visionWorkerRef.current.postMessage({ type: 'terminate' });
                visionWorkerRef.current.terminate();
                visionWorkerRef.current = null;
            }
            if (audioWorkerRef.current) {
                audioWorkerRef.current.postMessage({ type: 'terminate' });
                audioWorkerRef.current.terminate();
                audioWorkerRef.current = null;
            }
        };
    }, [useMockData, setHardwareCapabilities, setVisionResult, setAudioResult]);

    /**
     * Update fused emotion when either modality changes
     */
    useEffect(() => {
        if (visionResult || audioResult) {
            const fused = fuseEmotions(
                visionResult?.emotionVector ?? null,
                audioResult?.emotionVector ?? null
            );
            setFusedEmotion(fused);
        }
    }, [visionResult, audioResult, setFusedEmotion]);

    /**
     * Process a video frame
     */
    const processVideoFrame = useCallback(
        (imageData: ImageData) => {
            if (!isReady) return;

            // Throttle to ~10 FPS
            const now = Date.now();
            if (now - lastVisionProcessTime.current < VISION_THROTTLE_MS) {
                return;
            }
            lastVisionProcessTime.current = now;

            if (useMockData) {
                const mockVector = generateMockEmotionVector();
                const { emotion, confidence } = getDominantEmotion(mockVector);
                setVisionResult({
                    emotionVector: mockVector,
                    dominantEmotion: emotion,
                    confidence,
                    timestamp: Date.now(),
                });
                return;
            }

            // Send to worker
            if (visionWorkerRef.current) {
                visionWorkerRef.current.postMessage({
                    type: 'process',
                    imageData,
                });
            }
        },
        [isReady, useMockData, setVisionResult]
    );

    /**
     * Process audio chunk
     */
    const processAudioChunk = useCallback(
        (audioData: Float32Array, sampleRate: number) => {
            if (!isReady) return;

            if (useMockData) {
                // Generate mock data every ~1 second
                const mockVector = generateMockEmotionVector();
                const { emotion, confidence } = getDominantEmotion(mockVector);
                setAudioResult({
                    emotionVector: mockVector,
                    dominantEmotion: emotion,
                    confidence,
                    timestamp: Date.now(),
                });
                return;
            }

            // Send to worker
            if (audioWorkerRef.current) {
                audioWorkerRef.current.postMessage({
                    type: 'process',
                    audioData,
                    sampleRate,
                });
            }
        },
        [isReady, useMockData, setAudioResult]
    );

    return {
        isReady,
        isLoading,
        error,
        modelStatus,
        processVideoFrame,
        processAudioChunk,
    };
}
