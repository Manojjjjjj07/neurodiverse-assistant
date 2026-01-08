/**
 * Emotion Store - Manages real-time emotion analysis state
 * 
 * Handles:
 * - Current emotion readings from vision and audio workers
 * - Fused emotion results with TEMPORAL SMOOTHING
 * - Conflict/sarcasm detection
 * - Topic anchoring data
 */

import { create } from 'zustand';

/**
 * Emotion vector representing probabilities for each emotion category.
 * Values range from 0 to 1 and should sum to approximately 1.
 */
export interface EmotionVector {
    neutral: number;
    happiness: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    contempt: number;
}

/**
 * Result from a single modality (vision or audio)
 */
export interface ModalityResult {
    emotionVector: EmotionVector;
    dominantEmotion: string;
    confidence: number;
    timestamp: number;
}

/**
 * Fused result combining multiple modalities
 */
export interface FusedEmotion {
    emotionVector: EmotionVector;
    dominantEmotion: string;
    confidence: number;
    conflictDetected: boolean;
    conflictType: 'none' | 'sarcasm' | 'masking' | 'mixed';
    conflictDescription: string | null;
    timestamp: number;
}

/**
 * Topic anchor for ADHD-friendly conversation tracking
 */
export interface TopicAnchor {
    id: string;
    topic: string;
    startedAt: number;
    durationSeconds: number;
    isActive: boolean;
}

interface EmotionState {
    // Latest results from each modality
    visionResult: ModalityResult | null;
    audioResult: ModalityResult | null;

    // Fused result (raw)
    fusedEmotion: FusedEmotion | null;

    // SMOOTHED emotion for display (averaged over time)
    smoothedEmotion: FusedEmotion | null;

    // Topic tracking
    currentTopic: TopicAnchor | null;
    topicHistory: TopicAnchor[];

    // Processing status
    isVisionProcessing: boolean;
    isAudioProcessing: boolean;

    // Hardware capabilities
    hasWebGPU: boolean;
    executionProvider: 'webgpu' | 'wasm' | 'unknown';

    // Actions
    setVisionResult: (result: ModalityResult) => void;
    setAudioResult: (result: ModalityResult) => void;
    setFusedEmotion: (emotion: FusedEmotion) => void;
    setProcessingStatus: (vision: boolean, audio: boolean) => void;
    setHardwareCapabilities: (hasWebGPU: boolean, provider: 'webgpu' | 'wasm') => void;
    setCurrentTopic: (topic: TopicAnchor | null) => void;
    addTopicToHistory: (topic: TopicAnchor) => void;
    clearEmotions: () => void;
}

/**
 * Creates a neutral emotion vector (all zeros except neutral)
 */
export const createNeutralEmotionVector = (): EmotionVector => ({
    neutral: 1,
    happiness: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    contempt: 0,
});

/**
 * Smoothing factor for Exponential Moving Average
 * Lower = smoother but slower response
 * Higher = more responsive but jittery
 * 0.3 means ~300ms to reach 95% of new value (quick response)
 */
const SMOOTHING_ALPHA = 0.3;

/**
 * Apply exponential moving average smoothing
 */
function smoothEmotionVector(
    current: EmotionVector | null,
    newValue: EmotionVector,
    alpha: number
): EmotionVector {
    if (!current) return newValue;

    return {
        neutral: current.neutral * (1 - alpha) + newValue.neutral * alpha,
        happiness: current.happiness * (1 - alpha) + newValue.happiness * alpha,
        sadness: current.sadness * (1 - alpha) + newValue.sadness * alpha,
        anger: current.anger * (1 - alpha) + newValue.anger * alpha,
        fear: current.fear * (1 - alpha) + newValue.fear * alpha,
        surprise: current.surprise * (1 - alpha) + newValue.surprise * alpha,
        disgust: current.disgust * (1 - alpha) + newValue.disgust * alpha,
        contempt: current.contempt * (1 - alpha) + newValue.contempt * alpha,
    };
}

/**
 * Find dominant emotion from smoothed vector
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

export const useEmotionStore = create<EmotionState>()((set, get) => ({
    visionResult: null,
    audioResult: null,
    fusedEmotion: null,
    smoothedEmotion: null,
    currentTopic: null,
    topicHistory: [],
    isVisionProcessing: false,
    isAudioProcessing: false,
    hasWebGPU: false,
    executionProvider: 'unknown',

    setVisionResult: (result) => set({ visionResult: result }),

    setAudioResult: (result) => set({ audioResult: result }),

    setFusedEmotion: (emotion) => {
        const state = get();

        // Apply temporal smoothing for stable display
        const smoothedVector = smoothEmotionVector(
            state.smoothedEmotion?.emotionVector ?? null,
            emotion.emotionVector,
            SMOOTHING_ALPHA
        );

        const { emotion: dominantEmotion, confidence } = getDominantEmotion(smoothedVector);

        set({
            fusedEmotion: emotion,
            smoothedEmotion: {
                emotionVector: smoothedVector,
                dominantEmotion,
                confidence,
                conflictDetected: emotion.conflictDetected,
                conflictType: emotion.conflictType,
                conflictDescription: emotion.conflictDescription,
                timestamp: emotion.timestamp,
            }
        });
    },

    setProcessingStatus: (vision, audio) => set({
        isVisionProcessing: vision,
        isAudioProcessing: audio,
    }),

    setHardwareCapabilities: (hasWebGPU, provider) => set({
        hasWebGPU,
        executionProvider: provider,
    }),

    setCurrentTopic: (topic) => set({ currentTopic: topic }),

    addTopicToHistory: (topic) => set((state) => ({
        topicHistory: [topic, ...state.topicHistory].slice(0, 20), // Keep last 20
    })),

    clearEmotions: () => set({
        visionResult: null,
        audioResult: null,
        fusedEmotion: null,
        smoothedEmotion: null,
        isVisionProcessing: false,
        isAudioProcessing: false,
    }),
}));
