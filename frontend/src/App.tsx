/**
 * NeuroBridge - AI Social Co-Pilot
 * 
 * A professional-grade, privacy-preserving AI assistant for
 * neurodivergent professionals (ADHD, ASD, Social Anxiety).
 * 
 * PRIVACY: All ML inference happens locally in the browser.
 * No raw audio/video data ever leaves your device.
 */

import { useState, useCallback } from 'react';
import './index.css';
import { useMediaStream, useInference } from './hooks';
import { useSettingsStore, useSessionStore } from './stores';
import { AmbientHUD, EmotionIndicator, TopicAnchor } from './components/hud';
import { KillSwitch, HardwareStatus, VideoPreview } from './components/controls';

function App() {
    const [showVideoPreview, setShowVideoPreview] = useState(true);
    const [demoMode, setDemoMode] = useState(true); // Start in demo mode

    // Settings
    const hudIntensity = useSettingsStore((s) => s.hudIntensity);
    const setHudIntensity = useSettingsStore((s) => s.setHudIntensity);
    const enableTopicAnchoring = useSettingsStore((s) => s.enableTopicAnchoring);

    // Session
    const currentSession = useSessionStore((s) => s.currentSession);

    // Media stream hook (must be first to get videoRef)
    const {
        state: mediaState,
        start: startMedia,
        stop: stopMedia,
        killSwitch,
        videoRef,
    } = useMediaStream({
        enableVideo: true,
        enableAudio: false, // Audio disabled - using vision only
    });

    // Inference hook - calls backend API every 10 seconds
    const { isLoading, error: inferenceError, modelStatus } = useInference({
        useMockData: demoMode,
        videoRef: videoRef,
    });

    // Demo mode is now handled internally by useInference hook

    // Handle start/stop toggle
    const handleToggle = useCallback(async () => {
        if (mediaState.isActive) {
            stopMedia();
        } else {
            setDemoMode(false); // Exit demo mode when starting real media
            await startMedia();
        }
    }, [mediaState.isActive, startMedia, stopMedia]);

    // Handle kill switch
    const handleKill = useCallback(() => {
        killSwitch();
        setDemoMode(true); // Return to demo mode
    }, [killSwitch]);

    return (
        <div className="min-h-screen bg-cream-100">
            {/* Ambient HUD Overlay */}
            <AmbientHUD />

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-display font-bold text-gradient">
                                NeuroBridge
                            </h1>
                            <p className="text-cream-600 mt-1">
                                AI Social Co-Pilot for Neurodivergent Professionals
                            </p>
                        </div>

                        {/* Demo Mode Badge */}
                        {demoMode && (
                            <div className="px-4 py-2 rounded-full bg-sage-100 border border-sage-300 text-sage-700 text-sm font-medium">
                                🎭 Demo Mode
                            </div>
                        )}
                    </div>
                </header>

                {/* Hardware Status Bar */}
                <div className="mb-6">
                    <HardwareStatus mediaState={mediaState} />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Video & Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Video Preview */}
                        <div className="card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-cream-800">Camera</h2>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showVideoPreview}
                                        onChange={(e) => setShowVideoPreview(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div
                                        className={`w-10 h-6 rounded-full transition-colors ${showVideoPreview ? 'bg-sage-400' : 'bg-cream-300'
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-1 ${showVideoPreview ? 'translate-x-5 ml-0.5' : 'translate-x-1'
                                                }`}
                                        />
                                    </div>
                                    <span className="text-sm text-cream-600">Preview</span>
                                </label>
                            </div>

                            <VideoPreview
                                ref={videoRef}
                                isActive={mediaState.isActive}
                                showPreview={showVideoPreview}
                                className="aspect-video"
                            />

                            {/* Start/Stop Button */}
                            <div className="mt-4 flex justify-center">
                                <KillSwitch
                                    onKill={mediaState.isActive ? handleKill : handleToggle}
                                    isActive={mediaState.isActive}
                                />
                            </div>
                        </div>

                        {/* Session Info */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-cream-800 mb-3">Session</h2>
                            {currentSession ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-cream-600">
                                        <span className="font-medium">Title:</span> {currentSession.title || 'Untitled'}
                                    </p>
                                    <p className="text-sm text-cream-600">
                                        <span className="font-medium">Started:</span>{' '}
                                        {new Date(currentSession.startedAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-cream-500">
                                    Start the assistant to begin a session
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Center Column - Emotion Display */}
                    <div className="lg:col-span-1 space-y-6">
                        <EmotionIndicator />

                        {/* Inference Status */}
                        {isLoading && (
                            <div className="card text-center py-4">
                                <div className="animate-spin w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full mx-auto mb-2" />
                                <p className="text-sm text-cream-600">Loading models...</p>
                            </div>
                        )}

                        {/* Model Status */}
                        {!demoMode && !isLoading && (
                            <div className="card">
                                <h3 className="text-sm font-semibold text-cream-700 mb-2">AI Models</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${modelStatus.vision === 'ready' ? 'bg-sage-400' :
                                            modelStatus.vision === 'loading' ? 'bg-terracotta-300 animate-pulse' :
                                                modelStatus.vision === 'error' ? 'bg-red-400' : 'bg-cream-400'
                                            }`} />
                                        <span className="text-xs text-cream-600">Face: {modelStatus.vision}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${modelStatus.audio === 'ready' ? 'bg-sage-400' :
                                            modelStatus.audio === 'loading' ? 'bg-terracotta-300 animate-pulse' :
                                                modelStatus.audio === 'error' ? 'bg-red-400' : 'bg-cream-400'
                                            }`} />
                                        <span className="text-xs text-cream-600">Voice: {modelStatus.audio}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {inferenceError && (
                            <div className="card bg-terracotta-50 border-terracotta-200">
                                <p className="text-sm text-terracotta-700">
                                    ⚠️ {inferenceError}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Topic Anchoring & Settings */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Topic Anchoring */}
                        {enableTopicAnchoring && <TopicAnchor />}

                        {/* Settings Card */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-cream-800 mb-4">Settings</h2>

                            {/* HUD Intensity */}
                            <div className="mb-4">
                                <label className="text-sm text-cream-600 block mb-2">
                                    HUD Intensity
                                </label>
                                <div className="flex gap-2">
                                    {(['subtle', 'moderate', 'prominent'] as const).map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setHudIntensity(level)}
                                            className={`flex-1 px-3 py-2 rounded-xl text-sm capitalize transition-colors ${hudIntensity === level
                                                ? 'bg-sage-400 text-white'
                                                : 'bg-cream-100 text-cream-700 hover:bg-cream-200'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Privacy Notice */}
                            <div className="bg-sage-50 border border-sage-200 rounded-xl p-3 mt-4">
                                <p className="text-xs text-sage-700">
                                    🔒 <span className="font-medium">Privacy First:</span> All emotion
                                    analysis happens locally in your browser. No raw audio or video
                                    ever leaves your device.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t border-cream-200">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-cream-500">
                            NeuroBridge — Designed for cognitive accessibility
                        </p>
                        <div className="flex items-center gap-4">
                            <a
                                href="#"
                                className="text-sm text-cream-500 hover:text-sage-600 transition-colors"
                            >
                                About
                            </a>
                            <a
                                href="#"
                                className="text-sm text-cream-500 hover:text-sage-600 transition-colors"
                            >
                                Privacy
                            </a>
                            <a
                                href="#"
                                className="text-sm text-cream-500 hover:text-sage-600 transition-colors"
                            >
                                Help
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;
