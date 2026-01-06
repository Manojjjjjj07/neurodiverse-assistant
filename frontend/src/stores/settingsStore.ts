/**
 * Settings Store - User preferences and app settings
 * 
 * These settings are synced with the backend user profile
 * when authenticated.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HudIntensity = 'subtle' | 'moderate' | 'prominent';

export interface SensoryPreferences {
    theme: 'calm' | 'dark' | 'light';
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
    };
    animations: {
        enabled: boolean;
        reducedMotion: boolean;
        transitionSpeed: 'slow' | 'normal' | 'fast';
    };
}

interface SettingsState {
    // HUD Settings
    hudIntensity: HudIntensity;
    enableTopicAnchoring: boolean;
    enableSarcasmDetection: boolean;

    // Media Settings
    enableAudioAnalysis: boolean;
    enableFacialAnalysis: boolean;

    // Privacy Settings
    autoDeleteSessions: boolean;

    // Sensory Preferences
    sensoryPreferences: SensoryPreferences;

    // Auth tokens (stored in memory, not persisted)
    accessToken: string | null;
    refreshToken: string | null;

    // Actions
    setHudIntensity: (intensity: HudIntensity) => void;
    setTopicAnchoring: (enabled: boolean) => void;
    setSarcasmDetection: (enabled: boolean) => void;
    setAudioAnalysis: (enabled: boolean) => void;
    setFacialAnalysis: (enabled: boolean) => void;
    setAutoDeleteSessions: (enabled: boolean) => void;
    setSensoryPreferences: (prefs: Partial<SensoryPreferences>) => void;
    setTokens: (access: string | null, refresh: string | null) => void;
    clearAuth: () => void;
    resetToDefaults: () => void;
}

const defaultSensoryPreferences: SensoryPreferences = {
    theme: 'calm',
    colors: {
        primary: '#8B9A82',      // Sage green
        secondary: '#D4C5B9',    // Warm beige
        accent: '#C4A484',       // Muted terracotta
        background: '#F5F1EB',   // Soft cream
        surface: '#E8E2D9',      // Light taupe
        text: '#4A4A4A',         // Soft charcoal
    },
    animations: {
        enabled: true,
        reducedMotion: false,
        transitionSpeed: 'normal',
    },
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Defaults
            hudIntensity: 'moderate',
            enableTopicAnchoring: true,
            enableSarcasmDetection: true,
            enableAudioAnalysis: true,
            enableFacialAnalysis: true,
            autoDeleteSessions: false,
            sensoryPreferences: defaultSensoryPreferences,
            accessToken: null,
            refreshToken: null,

            // Actions
            setHudIntensity: (intensity) => set({ hudIntensity: intensity }),

            setTopicAnchoring: (enabled) => set({ enableTopicAnchoring: enabled }),

            setSarcasmDetection: (enabled) => set({ enableSarcasmDetection: enabled }),

            setAudioAnalysis: (enabled) => set({ enableAudioAnalysis: enabled }),

            setFacialAnalysis: (enabled) => set({ enableFacialAnalysis: enabled }),

            setAutoDeleteSessions: (enabled) => set({ autoDeleteSessions: enabled }),

            setSensoryPreferences: (prefs) => set((state) => ({
                sensoryPreferences: {
                    ...state.sensoryPreferences,
                    ...prefs,
                    colors: {
                        ...state.sensoryPreferences.colors,
                        ...(prefs.colors || {}),
                    },
                    animations: {
                        ...state.sensoryPreferences.animations,
                        ...(prefs.animations || {}),
                    },
                },
            })),

            setTokens: (access, refresh) => set({
                accessToken: access,
                refreshToken: refresh,
            }),

            clearAuth: () => set({
                accessToken: null,
                refreshToken: null,
            }),

            resetToDefaults: () => set({
                hudIntensity: 'moderate',
                enableTopicAnchoring: true,
                enableSarcasmDetection: true,
                enableAudioAnalysis: true,
                enableFacialAnalysis: true,
                autoDeleteSessions: false,
                sensoryPreferences: defaultSensoryPreferences,
            }),
        }),
        {
            name: 'neurobridge-settings',
            // Don't persist auth tokens
            partialize: (state) => ({
                hudIntensity: state.hudIntensity,
                enableTopicAnchoring: state.enableTopicAnchoring,
                enableSarcasmDetection: state.enableSarcasmDetection,
                enableAudioAnalysis: state.enableAudioAnalysis,
                enableFacialAnalysis: state.enableFacialAnalysis,
                autoDeleteSessions: state.autoDeleteSessions,
                sensoryPreferences: state.sensoryPreferences,
            }),
        }
    )
);
