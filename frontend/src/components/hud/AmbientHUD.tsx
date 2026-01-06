/**
 * AmbientHUD - Non-intrusive emotion display
 * 
 * DESIGN PHILOSOPHY:
 * - No jarring notifications or text popups
 * - Soft, ambient color gradients that shift based on detected emotions
 * - Respects sensory sensitivities common in neurodivergent individuals
 * - Intensity adjustable via user preferences
 */

import { useEmotionStore, useSettingsStore, type EmotionVector } from '../../stores';

// Color mapping for emotions (calm, accessible versions)
const EMOTION_COLORS: Record<keyof EmotionVector, string> = {
    neutral: 'rgba(139, 154, 130, 0.3)',     // Sage green
    happiness: 'rgba(212, 184, 150, 0.4)',    // Warm beige/gold
    sadness: 'rgba(156, 179, 201, 0.35)',     // Gentle blue
    anger: 'rgba(201, 164, 154, 0.35)',       // Soft terracotta
    fear: 'rgba(184, 167, 201, 0.35)',        // Muted lavender
    surprise: 'rgba(167, 201, 184, 0.35)',    // Seafoam
    disgust: 'rgba(154, 201, 184, 0.3)',      // Teal-ish
    contempt: 'rgba(184, 184, 201, 0.3)',     // Soft gray-purple
};

// Intensity multipliers
const INTENSITY_MULTIPLIERS = {
    subtle: 0.3,
    moderate: 0.6,
    prominent: 1.0,
};

interface AmbientHUDProps {
    className?: string;
}

export function AmbientHUD({ className = '' }: AmbientHUDProps) {
    // Use smoothedEmotion for stable color transitions
    const smoothedEmotion = useEmotionStore((s) => s.smoothedEmotion);
    const hudIntensity = useSettingsStore((s) => s.hudIntensity);
    const animations = useSettingsStore((s) => s.sensoryPreferences.animations);

    // Get the dominant emotion color
    const dominantEmotion = smoothedEmotion?.dominantEmotion || 'neutral';
    const confidence = smoothedEmotion?.confidence || 0;
    const conflictDetected = smoothedEmotion?.conflictDetected || false;

    // Calculate opacity based on confidence and intensity setting
    const baseOpacity = confidence * INTENSITY_MULTIPLIERS[hudIntensity];
    const opacity = Math.min(baseOpacity, 0.5); // Cap at 50% to avoid overwhelming

    // Get the color for the dominant emotion
    const emotionColor = EMOTION_COLORS[dominantEmotion as keyof EmotionVector] || EMOTION_COLORS.neutral;

    // Determine transition speed
    const transitionDuration = animations.reducedMotion
        ? '0.1s'
        : animations.transitionSpeed === 'slow'
            ? '1.5s'
            : animations.transitionSpeed === 'fast'
                ? '0.3s'
                : '0.8s';

    // Create gradient style
    const gradientStyle: React.CSSProperties = {
        background: conflictDetected
            ? `radial-gradient(ellipse at center, ${emotionColor}, transparent 70%), 
         radial-gradient(ellipse at bottom right, rgba(196, 164, 132, 0.3), transparent 60%)`
            : `radial-gradient(ellipse at center, ${emotionColor}, transparent 70%)`,
        opacity: animations.enabled ? opacity : 0,
        transition: `all ${transitionDuration} ease-out`,
    };

    return (
        <div
            className={`hud-overlay ${className}`}
            style={gradientStyle}
            role="presentation"
            aria-hidden="true"
        >
            {/* Conflict indicator - subtle pulsing border */}
            {conflictDetected && (
                <div
                    className="absolute inset-4 rounded-3xl border-2 border-terracotta-300/30 animate-gentle-pulse"
                    style={{ transition: `all ${transitionDuration} ease-out` }}
                />
            )}
        </div>
    );
}
