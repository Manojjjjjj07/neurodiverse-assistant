/**
 * EmotionIndicator - Visual display of current emotional state
 * 
 * Shows:
 * - Current dominant emotion with icon
 * - Emotion distribution bar
 * - Conflict/sarcasm alerts (when detected)
 */

import { useEmotionStore, type EmotionVector } from '../../stores';

// Emotion icons (using simple shapes for accessibility)
const EMOTION_ICONS: Record<keyof EmotionVector, string> = {
    neutral: '😐',
    happiness: '😊',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    surprise: '😮',
    disgust: '😖',
    contempt: '😏',
};

// Emotion color classes
const EMOTION_BAR_COLORS: Record<keyof EmotionVector, string> = {
    neutral: 'bg-sage-400',
    happiness: 'bg-terracotta-300',
    sadness: 'bg-blue-300',
    anger: 'bg-terracotta-400',
    fear: 'bg-purple-300',
    surprise: 'bg-sage-300',
    disgust: 'bg-teal-300',
    contempt: 'bg-cream-500',
};

interface EmotionIndicatorProps {
    compact?: boolean;
    className?: string;
}

export function EmotionIndicator({ compact = false, className = '' }: EmotionIndicatorProps) {
    // Use smoothedEmotion for stable display (averaged over ~2 seconds)
    const smoothedEmotion = useEmotionStore((s) => s.smoothedEmotion);
    const visionResult = useEmotionStore((s) => s.visionResult);
    const audioResult = useEmotionStore((s) => s.audioResult);

    if (!smoothedEmotion) {
        return (
            <div className={`card ${className}`}>
                <div className="text-cream-500 text-center py-4">
                    Waiting for emotion data...
                </div>
            </div>
        );
    }

    const {
        dominantEmotion,
        confidence,
        conflictDetected,
        conflictType,
        conflictDescription,
        emotionVector,
    } = smoothedEmotion;

    const icon = EMOTION_ICONS[dominantEmotion as keyof EmotionVector] || '😐';
    const confidencePercent = Math.round(confidence * 100);

    if (compact) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <span className="text-2xl" role="img" aria-label={dominantEmotion}>
                    {icon}
                </span>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize text-cream-700">
                            {dominantEmotion}
                        </span>
                        <span className="text-xs text-cream-500">{confidencePercent}%</span>
                    </div>
                    <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${EMOTION_BAR_COLORS[dominantEmotion as keyof EmotionVector] || 'bg-sage-400'} transition-all duration-500`}
                            style={{ width: `${confidencePercent}%` }}
                        />
                    </div>
                </div>
                {conflictDetected && (
                    <span
                        className="text-terracotta-500 text-xs font-medium"
                        title={conflictDescription || ''}
                    >
                        ⚠️
                    </span>
                )}
            </div>
        );
    }

    // Full view with emotion breakdown
    const emotions = Object.entries(emotionVector) as [keyof EmotionVector, number][];
    const sortedEmotions = emotions.sort((a, b) => b[1] - a[1]);

    return (
        <div className={`card space-y-4 ${className}`}>
            {/* Header with dominant emotion */}
            <div className="flex items-center gap-4">
                <span className="text-4xl" role="img" aria-label={dominantEmotion}>
                    {icon}
                </span>
                <div>
                    <h3 className="text-lg font-semibold capitalize text-cream-800">
                        {dominantEmotion}
                    </h3>
                    <p className="text-sm text-cream-500">
                        {confidencePercent}% confidence
                    </p>
                </div>
            </div>

            {/* Conflict Alert */}
            {conflictDetected && (
                <div className="bg-terracotta-100 border border-terracotta-300 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-terracotta-600 font-medium text-sm">
                            {conflictType === 'sarcasm' && '🎭 Possible Sarcasm'}
                            {conflictType === 'masking' && '🎭 Emotional Masking'}
                            {conflictType === 'mixed' && '↔️ Mixed Signals'}
                        </span>
                    </div>
                    <p className="text-sm text-terracotta-700">{conflictDescription}</p>
                </div>
            )}

            {/* Emotion Breakdown */}
            <div className="space-y-2">
                <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">
                    Emotion Breakdown
                </p>
                {sortedEmotions.slice(0, 4).map(([emotion, value]) => (
                    <div key={emotion} className="flex items-center gap-2">
                        <span className="w-6 text-center">
                            {EMOTION_ICONS[emotion]}
                        </span>
                        <span className="w-20 text-xs text-cream-600 capitalize">{emotion}</span>
                        <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${EMOTION_BAR_COLORS[emotion]} transition-all duration-500`}
                                style={{ width: `${Math.round(value * 100)}%` }}
                            />
                        </div>
                        <span className="w-8 text-xs text-cream-500 text-right">
                            {Math.round(value * 100)}%
                        </span>
                    </div>
                ))}
            </div>

            {/* Modality Sources */}
            <div className="flex gap-4 pt-2 border-t border-cream-200">
                <div className="flex items-center gap-2">
                    <div
                        className={`status-dot ${visionResult ? 'status-dot-active' : 'status-dot-inactive'}`}
                    />
                    <span className="text-xs text-cream-500">Face</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className={`status-dot ${audioResult ? 'status-dot-active' : 'status-dot-inactive'}`}
                    />
                    <span className="text-xs text-cream-500">Voice</span>
                </div>
            </div>
        </div>
    );
}
