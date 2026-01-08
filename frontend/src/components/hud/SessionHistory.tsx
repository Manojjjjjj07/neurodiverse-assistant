/**
 * SessionHistory - Display past emotion analysis sessions
 * 
 * Shows a list of saved sessions with quick stats and delete option.
 */

import { useState, useEffect, useCallback } from 'react';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

interface Session {
    id: number;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    dominant_emotion: string;
    dominant_emotion_percentage: number;
    emotion_breakdown: Record<string, number>;
    total_readings: number;
    title: string;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface SessionHistoryProps {
    className?: string;
    maxItems?: number;
    refreshTrigger?: number; // Increment to trigger refresh
    onSessionsLoaded?: (count: number) => void;
}

export function SessionHistory({
    className = '',
    maxItems = 10,
    refreshTrigger = 0,
    onSessionsLoaded,
}: SessionHistoryProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/sessions/emotion/`);
            if (response.ok) {
                const data = await response.json();
                const loadedSessions = data.sessions.slice(0, maxItems);
                setSessions(loadedSessions);
                onSessionsLoaded?.(loadedSessions.length);
            }
        } catch (e) {
            console.error('[SessionHistory] Fetch failed:', e);
        } finally {
            setIsLoading(false);
        }
    }, [maxItems, onSessionsLoaded]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions, refreshTrigger]);

    const handleDelete = async (sessionId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent expand/collapse

        if (!confirm('Delete this session?')) return;

        setDeletingId(sessionId);
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/emotion/${sessionId}/`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            }
        } catch (e) {
            console.error('[SessionHistory] Delete failed:', e);
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className={`card ${className}`}>
                <h3 className="text-lg font-semibold text-cream-800 mb-3">Session Collection</h3>
                <div className="text-cream-500 text-sm flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-sage-400 border-t-transparent rounded-full" />
                    Loading sessions...
                </div>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className={`card ${className}`}>
                <h3 className="text-lg font-semibold text-cream-800 mb-3">Session Collection</h3>
                <div className="text-cream-500 text-sm py-4 text-center">
                    <span className="text-2xl mb-2 block">📊</span>
                    No sessions saved yet. Start a session and save it to see it here.
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-cream-800">Session Collection</h3>
                <span className="text-xs text-cream-500 bg-cream-200 px-2 py-1 rounded-full">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
                {sessions.map((session) => {
                    const icon = EMOTION_ICONS[session.dominant_emotion] || '😐';
                    const isExpanded = expandedId === session.id;
                    const isDeleting = deletingId === session.id;

                    return (
                        <div
                            key={session.id}
                            className={`bg-cream-100 rounded-lg p-3 transition-all ${isDeleting ? 'opacity-50' : 'hover:bg-cream-200 cursor-pointer'
                                }`}
                            onClick={() => !isDeleting && setExpandedId(isExpanded ? null : session.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{icon}</span>
                                    <div>
                                        <div className="text-sm font-medium text-cream-800">
                                            {session.title || `Session ${session.id}`}
                                        </div>
                                        <div className="text-xs text-cream-500">
                                            {formatDate(session.started_at)} • {formatDuration(session.duration_seconds)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-cream-700 capitalize">
                                            {session.dominant_emotion}
                                        </div>
                                        <div className="text-xs text-cream-500">
                                            {session.dominant_emotion_percentage}%
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(session.id, e)}
                                        disabled={isDeleting}
                                        className="p-1.5 text-cream-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete session"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-cream-200">
                                    <div className="text-xs text-cream-600 mb-2">Emotion Breakdown</div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(session.emotion_breakdown)
                                            .sort((a, b) => b[1] - a[1])
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
                                    <div className="mt-2 text-xs text-cream-500">
                                        {session.total_readings} reading{session.total_readings !== 1 ? 's' : ''} captured
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
