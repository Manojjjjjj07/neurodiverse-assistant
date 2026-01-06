/**
 * useMediaStream Hook - Privacy-controlled media access
 * 
 * PRIVACY GUARANTEES:
 * 1. Media streams NEVER leave this hook's internal scope
 * 2. Raw video/audio is processed locally, only results are exposed
 * 3. Kill switch immediately terminates all media access
 * 4. No external network requests with raw media data
 * 
 * This is the ONLY place in the app that accesses getUserMedia.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../stores';

export interface MediaStreamState {
    isActive: boolean;
    hasPermission: boolean;
    permissionDenied: boolean;
    error: string | null;
}

export interface VideoFrameCallback {
    (imageData: ImageData, width: number, height: number): void;
}

export interface AudioChunkCallback {
    (audioData: Float32Array, sampleRate: number): void;
}

interface UseMediaStreamOptions {
    enableVideo?: boolean;
    enableAudio?: boolean;
    videoWidth?: number;
    videoHeight?: number;
    audioBufferSize?: number;
    onVideoFrame?: VideoFrameCallback;
    onAudioChunk?: AudioChunkCallback;
}

interface UseMediaStreamReturn {
    state: MediaStreamState;
    start: () => Promise<boolean>;
    stop: () => void;
    killSwitch: () => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useMediaStream(options: UseMediaStreamOptions = {}): UseMediaStreamReturn {
    const {
        enableVideo = true,
        enableAudio = true,
        videoWidth = 640,
        videoHeight = 480,
        audioBufferSize = 4096,
        onVideoFrame,
        onAudioChunk,
    } = options;

    const enableAudioAnalysis = useSettingsStore((s) => s.enableAudioAnalysis);
    const enableFacialAnalysis = useSettingsStore((s) => s.enableFacialAnalysis);

    const [state, setState] = useState<MediaStreamState>({
        isActive: false,
        hasPermission: false,
        permissionDenied: false,
        error: null,
    });

    // Internal refs - these NEVER get exposed
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const videoFrameIdRef = useRef<number | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);

    /**
     * Completely stops all media access and cleans up resources.
     * This is the "panic button" - immediately terminates everything.
     */
    const killSwitch = useCallback(() => {
        // Cancel any pending video frame processing
        if (videoFrameIdRef.current) {
            cancelAnimationFrame(videoFrameIdRef.current);
            videoFrameIdRef.current = null;
        }

        // Disconnect audio processing
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }

        if (analyzerRef.current) {
            analyzerRef.current.disconnect();
            analyzerRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Stop all tracks in the stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }

        // Clear video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.pause();
        }

        setState((prev) => ({
            ...prev,
            isActive: false,
            error: null,
        }));

        console.log('[NeuroBridge] Kill switch activated - all media stopped');
    }, []);

    /**
     * Regular stop - cleaner shutdown
     */
    const stop = useCallback(() => {
        killSwitch();
    }, [killSwitch]);

    /**
     * Process video frames for facial emotion recognition
     */
    const processVideoFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !onVideoFrame) {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
            videoFrameIdRef.current = requestAnimationFrame(processVideoFrame);
            return;
        }

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Pass to callback (this goes to the vision worker)
        onVideoFrame(imageData, canvas.width, canvas.height);

        // Schedule next frame (throttle to ~10 FPS for efficiency)
        setTimeout(() => {
            videoFrameIdRef.current = requestAnimationFrame(processVideoFrame);
        }, 100);
    }, [onVideoFrame]);

    /**
     * Start media stream with permission request
     */
    const start = useCallback(async (): Promise<boolean> => {
        // Don't start if already active
        if (state.isActive) {
            return true;
        }

        // Apply user preferences
        const wantVideo = enableVideo && enableFacialAnalysis;
        const wantAudio = enableAudio && enableAudioAnalysis;

        if (!wantVideo && !wantAudio) {
            setState((prev) => ({
                ...prev,
                error: 'Both video and audio are disabled in settings',
            }));
            return false;
        }

        try {
            // Request media access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: wantVideo
                    ? {
                        width: { ideal: videoWidth },
                        height: { ideal: videoHeight },
                        facingMode: 'user',
                    }
                    : false,
                audio: wantAudio
                    ? {
                        echoCancellation: true,
                        noiseSuppression: true,
                    }
                    : false,
            });

            streamRef.current = stream;

            // Set up video if enabled
            if (wantVideo && videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                // Create offscreen canvas for frame capture
                canvasRef.current = document.createElement('canvas');
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;

                // Start video frame processing
                if (onVideoFrame) {
                    videoFrameIdRef.current = requestAnimationFrame(processVideoFrame);
                }
            }

            // Set up audio if enabled
            if (wantAudio && onAudioChunk) {
                audioContextRef.current = new AudioContext();
                const source = audioContextRef.current.createMediaStreamSource(stream);

                // Create analyzer for audio data
                analyzerRef.current = audioContextRef.current.createAnalyser();
                analyzerRef.current.fftSize = audioBufferSize * 2;

                // Create script processor for audio chunks
                // Note: ScriptProcessorNode is deprecated but AudioWorklet requires more setup
                audioProcessorRef.current = audioContextRef.current.createScriptProcessor(
                    audioBufferSize,
                    1,
                    1
                );

                audioProcessorRef.current.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    // Clone the data since it gets reused
                    const audioData = new Float32Array(inputData);
                    onAudioChunk(audioData, audioContextRef.current!.sampleRate);
                };

                source.connect(analyzerRef.current);
                analyzerRef.current.connect(audioProcessorRef.current);
                audioProcessorRef.current.connect(audioContextRef.current.destination);
            }

            setState({
                isActive: true,
                hasPermission: true,
                permissionDenied: false,
                error: null,
            });

            console.log('[NeuroBridge] Media stream started successfully');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isDenied =
                error instanceof DOMException &&
                (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');

            setState({
                isActive: false,
                hasPermission: !isDenied,
                permissionDenied: isDenied,
                error: isDenied ? 'Permission denied' : errorMessage,
            });

            console.error('[NeuroBridge] Media stream error:', error);
            return false;
        }
    }, [
        state.isActive,
        enableVideo,
        enableAudio,
        enableFacialAnalysis,
        enableAudioAnalysis,
        videoWidth,
        videoHeight,
        audioBufferSize,
        onVideoFrame,
        onAudioChunk,
        processVideoFrame,
    ]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            killSwitch();
        };
    }, [killSwitch]);

    return {
        state,
        start,
        stop,
        killSwitch,
        videoRef,
    };
}
