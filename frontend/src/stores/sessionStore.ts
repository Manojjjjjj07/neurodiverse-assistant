/**
 * Session Store - Manages assistant session state
 * 
 * Handles:
 * - Active session tracking
 * - Session history
 * - WebSocket connection state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Session {
    id: number;
    title: string;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
    isActive: boolean;
}

interface SessionState {
    // Current session
    currentSession: Session | null;

    // Connection state
    isConnected: boolean;
    connectionError: string | null;

    // Session history (local cache)
    sessions: Session[];

    // Actions
    setCurrentSession: (session: Session | null) => void;
    setConnectionStatus: (connected: boolean, error?: string | null) => void;
    addSession: (session: Session) => void;
    updateSession: (id: number, updates: Partial<Session>) => void;
    setSessions: (sessions: Session[]) => void;
    clearSessions: () => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            currentSession: null,
            isConnected: false,
            connectionError: null,
            sessions: [],

            setCurrentSession: (session) => set({ currentSession: session }),

            setConnectionStatus: (connected, error = null) => set({
                isConnected: connected,
                connectionError: error,
            }),

            addSession: (session) => set((state) => ({
                sessions: [session, ...state.sessions],
            })),

            updateSession: (id, updates) => set((state) => ({
                sessions: state.sessions.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                ),
                currentSession: state.currentSession?.id === id
                    ? { ...state.currentSession, ...updates }
                    : state.currentSession,
            })),

            setSessions: (sessions) => set({ sessions }),

            clearSessions: () => set({ sessions: [], currentSession: null }),
        }),
        {
            name: 'neurobridge-session',
            partialize: (state) => ({
                sessions: state.sessions.slice(0, 50), // Keep last 50 sessions
            }),
        }
    )
);
