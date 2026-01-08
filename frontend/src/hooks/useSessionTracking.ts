/**
 * useSessionTracking - Hook for tracking emotion session data
 * 
 * Tracks emotion readings during a session and provides
 * summary stats for saving.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useEmotionStore } from '../stores';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface SessionStats {
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    dominantEmotion: string;
    dominantEmotionPercentage: number;
    emotionBreakdown: Record<string, number>;
    totalReadings: number;
    averageConfidence: number;
}

export interface SavedSession extends SessionStats {
    id: number;
    title: string;
    createdAt: string;
}

interface EmotionReading {
    emotion: string;
    confidence: number;
    timestamp: number;
}

export function useSessionTracking() {
    const [isTracking, setIsTracking] = useState(false);
    const [currentStats, setCurrentStats] = useState<SessionStats | null>(null);
    const [lastSession, setLastSession] = useState<SavedSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const startTimeRef = useRef<Date | null>(null);
    const readingsRef = useRef<EmotionReading[]>([]);
    const fusedEmotion = useEmotionStore((s) => s.fusedEmotion);

    // Track emotion readings
    useEffect(() => {
        if (isTracking && fusedEmotion) {
            readingsRef.current.push({
                emotion: fusedEmotion.dominantEmotion,
                confidence: fusedEmotion.confidence,
                timestamp: fusedEmotion.timestamp,
            });
        }
    }, [isTracking, fusedEmotion]);

    // Start tracking a new session
    const startSession = useCallback(() => {
        startTimeRef.current = new Date();
        readingsRef.current = [];
        setIsTracking(true);
        setCurrentStats(null);
    }, []);

    // End tracking and calculate stats
    const endSession = useCallback((): SessionStats | null => {
        if (!startTimeRef.current) return null;

        const endedAt = new Date();
        const durationSeconds = Math.floor(
            (endedAt.getTime() - startTimeRef.current.getTime()) / 1000
        );

        const readings = readingsRef.current;
        const totalReadings = readings.length;

        if (totalReadings === 0) {
            setIsTracking(false);
            return null;
        }

        // Calculate emotion breakdown
        const emotionCounts: Record<string, number> = {};
        let totalConfidence = 0;

        for (const reading of readings) {
            emotionCounts[reading.emotion] = (emotionCounts[reading.emotion] || 0) + 1;
            totalConfidence += reading.confidence;
        }

        // Convert counts to percentages
        const emotionBreakdown: Record<string, number> = {};
        for (const [emotion, count] of Object.entries(emotionCounts)) {
            emotionBreakdown[emotion] = Math.round((count / totalReadings) * 1000) / 10;
        }

        // Find dominant emotion
        let dominantEmotion = 'neutral';
        let maxCount = 0;
        for (const [emotion, count] of Object.entries(emotionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantEmotion = emotion;
            }
        }

        const stats: SessionStats = {
            startedAt: startTimeRef.current,
            endedAt,
            durationSeconds,
            dominantEmotion,
            dominantEmotionPercentage: emotionBreakdown[dominantEmotion] || 0,
            emotionBreakdown,
            totalReadings,
            averageConfidence: Math.round((totalConfidence / totalReadings) * 100) / 100,
        };

        setCurrentStats(stats);
        setIsTracking(false);

        return stats;
    }, []);

    // Save session to backend
    const saveSession = useCallback(async (title: string = ''): Promise<boolean> => {
        if (!currentStats) return false;

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/emotion/save/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    started_at: currentStats.startedAt.toISOString(),
                    ended_at: currentStats.endedAt.toISOString(),
                    duration_seconds: currentStats.durationSeconds,
                    dominant_emotion: currentStats.dominantEmotion,
                    dominant_emotion_percentage: currentStats.dominantEmotionPercentage,
                    emotion_breakdown: currentStats.emotionBreakdown,
                    total_readings: currentStats.totalReadings,
                    average_confidence: currentStats.averageConfidence,
                    title,
                }),
            });

            if (!response.ok) throw new Error('Failed to save session');

            // Fetch the latest session after saving
            await fetchLatestSession();
            setCurrentStats(null);
            return true;
        } catch (e) {
            console.error('[SessionTracking] Save failed:', e);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentStats]);

    // Discard session without saving
    const discardSession = useCallback(() => {
        setCurrentStats(null);
        startTimeRef.current = null;
        readingsRef.current = [];
    }, []);

    // Fetch latest session from backend
    const fetchLatestSession = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/sessions/emotion/latest/`);
            if (!response.ok) return;

            const data = await response.json();
            if (data.session) {
                setLastSession({
                    id: data.session.id,
                    startedAt: new Date(data.session.started_at),
                    endedAt: new Date(data.session.ended_at),
                    durationSeconds: data.session.duration_seconds,
                    dominantEmotion: data.session.dominant_emotion,
                    dominantEmotionPercentage: data.session.dominant_emotion_percentage,
                    emotionBreakdown: data.session.emotion_breakdown,
                    totalReadings: data.session.total_readings,
                    averageConfidence: data.session.average_confidence,
                    title: data.session.title,
                    createdAt: data.session.created_at,
                });
            }
        } catch (e) {
            console.error('[SessionTracking] Fetch latest failed:', e);
        }
    }, []);

    // Fetch latest session on mount
    useEffect(() => {
        fetchLatestSession();
    }, [fetchLatestSession]);

    return {
        isTracking,
        currentStats,
        lastSession,
        isLoading,
        startSession,
        endSession,
        saveSession,
        discardSession,
        fetchLatestSession,
    };
}
