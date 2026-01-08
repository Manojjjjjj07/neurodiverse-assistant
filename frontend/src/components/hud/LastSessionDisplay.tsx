/**
 * LastSessionDisplay - Shows last saved session stats when camera is off
 */

import type { SavedSession } from '../../hooks/useSessionTracking';

// Emotion icons
const EMOTION_ICONS: Record<string, string> = {
    neutral: '😐',
    happiness: '😊',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    surprise: '😮',
    disgust: '😖',
    contempt: '😏',
    happy: '😊',
};

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface LastSessionDisplayProps {
    session: SavedSession;
    className?: string;
}

export function LastSessionDisplay({ session, className = '' }: LastSessionDisplayProps) {
    const icon = EMOTION_ICONS[session.dominantEmotion] || '😐';

    return (
        <div className={`card ${className}`}>
            <div className="text-xs text-cream-500 mb-2">Last Session</div>

            {/* Header with emotion */}
            <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{icon}</span>
                <div>
                    <div className="text-lg font-medium capitalize text-cream-800">
                        {session.title || session.dominantEmotion}
                    </div>
                    <div className="text-sm text-cream-600">
                        {formatDate(session.endedAt)}
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="bg-cream-100 rounded-lg p-2">
                    <div className="text-lg font-semibold text-cream-800">
                        {formatDuration(session.durationSeconds)}
                    </div>
                    <div className="text-xs text-cream-500">Duration</div>
                </div>
                <div className="bg-cream-100 rounded-lg p-2">
                    <div className="text-lg font-semibold text-cream-800">
                        {session.totalReadings}
                    </div>
                    <div className="text-xs text-cream-500">Readings</div>
                </div>
                <div className="bg-cream-100 rounded-lg p-2">
                    <div className="text-lg font-semibold text-cream-800">
                        {Math.round(session.averageConfidence * 100)}%
                    </div>
                    <div className="text-xs text-cream-500">Confidence</div>
                </div>
            </div>

            {/* Emotion breakdown */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(session.emotionBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([emotion, percentage]) => (
                        <span
                            key={emotion}
                            className="inline-flex items-center gap-1 text-xs bg-cream-100 px-2 py-1 rounded-full"
                        >
                            {EMOTION_ICONS[emotion] || '😐'}
                            <span className="capitalize">{emotion}</span>
                            <span className="text-cream-500">{percentage}%</span>
                        </span>
                    ))}
            </div>
        </div>
    );
}
