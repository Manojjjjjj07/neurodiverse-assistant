/**
 * SaveSessionDialog - Modal dialog to save or discard a session
 * 
 * Shows session summary and prompts user to save or discard.
 */

import { useState } from 'react';
import type { SessionStats } from '../../hooks/useSessionTracking';

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
    sad: '😢',
    angry: '😠',
};

interface SaveSessionDialogProps {
    isOpen: boolean;
    stats: SessionStats;
    onSave: (title: string) => void;
    onDiscard: () => void;
    isLoading?: boolean;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

export function SaveSessionDialog({
    isOpen,
    stats,
    onSave,
    onDiscard,
    isLoading = false,
}: SaveSessionDialogProps) {
    const [title, setTitle] = useState('');

    if (!isOpen) return null;

    const icon = EMOTION_ICONS[stats.dominantEmotion] || '😐';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-900/50 backdrop-blur-sm">
            <div className="bg-cream-50 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-semibold text-cream-800 mb-4">
                    Save Session?
                </h2>

                {/* Session Summary */}
                <div className="bg-cream-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-4 mb-3">
                        <span className="text-4xl">{icon}</span>
                        <div>
                            <div className="text-lg font-medium capitalize text-cream-800">
                                {stats.dominantEmotion}
                            </div>
                            <div className="text-sm text-cream-600">
                                {stats.dominantEmotionPercentage}% of session
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-cream-600">
                            <span className="font-medium">Duration:</span>{' '}
                            {formatDuration(stats.durationSeconds)}
                        </div>
                        <div className="text-cream-600">
                            <span className="font-medium">Readings:</span>{' '}
                            {stats.totalReadings}
                        </div>
                    </div>

                    {/* Emotion Breakdown */}
                    <div className="mt-3 pt-3 border-t border-cream-200">
                        <div className="text-xs font-medium text-cream-600 mb-2">
                            Emotion Breakdown
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.emotionBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 4)
                                .map(([emotion, percentage]) => (
                                    <span
                                        key={emotion}
                                        className="inline-flex items-center gap-1 text-xs bg-cream-200 px-2 py-1 rounded-full"
                                    >
                                        {EMOTION_ICONS[emotion] || '😐'}
                                        <span className="capitalize">{emotion}</span>
                                        <span className="text-cream-500">{percentage}%</span>
                                    </span>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Title Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Session Title (optional)
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Team Meeting, Study Session"
                        className="w-full px-3 py-2 rounded-lg border border-cream-300 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onDiscard}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg border border-cream-300 text-cream-700 hover:bg-cream-100 transition-colors disabled:opacity-50"
                    >
                        Discard
                    </button>
                    <button
                        onClick={() => onSave(title)}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : 'Save Session'}
                    </button>
                </div>
            </div>
        </div>
    );
}
