/**
 * HardwareStatus - Displays hardware capabilities and inference status
 * 
 * Shows:
 * - WebGPU vs WASM backend status
 * - Camera/microphone permission status
 * - Inference processing indicators
 */

import { useEmotionStore } from '../../stores';

// Media stream state interface
export interface MediaStreamState {
    isActive: boolean;
    hasPermission: boolean;
    permissionDenied: boolean;
    error: string | null;
}

interface HardwareStatusProps {
    mediaState: MediaStreamState;
    className?: string;
}

export function HardwareStatus({ mediaState, className = '' }: HardwareStatusProps) {
    const executionProvider = useEmotionStore((s) => s.executionProvider);
    const isVisionProcessing = useEmotionStore((s) => s.isVisionProcessing);
    const isAudioProcessing = useEmotionStore((s) => s.isAudioProcessing);

    return (
        <div className={`flex flex-wrap gap-3 ${className}`}>
            {/* Execution Provider */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream-100 border border-cream-200">
                <div
                    className={`status-dot ${executionProvider === 'webgpu'
                            ? 'bg-sage-400'
                            : executionProvider === 'wasm'
                                ? 'bg-terracotta-300'
                                : 'bg-cream-400'
                        }`}
                />
                <span className="text-xs text-cream-600 font-medium uppercase">
                    {executionProvider === 'webgpu'
                        ? 'GPU'
                        : executionProvider === 'wasm'
                            ? 'CPU'
                            : 'Init...'}
                </span>
            </div>

            {/* Camera Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream-100 border border-cream-200">
                <div
                    className={`status-dot ${mediaState.isActive
                            ? 'status-dot-active'
                            : mediaState.permissionDenied
                                ? 'status-dot-warning'
                                : 'status-dot-inactive'
                        }`}
                />
                <span className="text-xs text-cream-600">
                    {mediaState.isActive ? '📷 Active' : mediaState.permissionDenied ? '📷 Denied' : '📷 Off'}
                </span>
            </div>

            {/* Microphone Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream-100 border border-cream-200">
                <div
                    className={`status-dot ${mediaState.isActive
                            ? 'status-dot-active'
                            : mediaState.permissionDenied
                                ? 'status-dot-warning'
                                : 'status-dot-inactive'
                        }`}
                />
                <span className="text-xs text-cream-600">
                    {mediaState.isActive ? '🎤 Active' : mediaState.permissionDenied ? '🎤 Denied' : '🎤 Off'}
                </span>
            </div>

            {/* Processing Indicators */}
            {mediaState.isActive && (
                <>
                    {isVisionProcessing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 border border-sage-200">
                            <div className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
                            <span className="text-xs text-sage-700">Processing face...</span>
                        </div>
                    )}
                    {isAudioProcessing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 border border-sage-200">
                            <div className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
                            <span className="text-xs text-sage-700">Processing voice...</span>
                        </div>
                    )}
                </>
            )}

            {/* Error Display */}
            {mediaState.error && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-100 border border-terracotta-200">
                    <span className="text-xs text-terracotta-700">⚠️ {mediaState.error}</span>
                </div>
            )}
        </div>
    );
}
