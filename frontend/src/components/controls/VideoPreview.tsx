/**
 * VideoPreview - Optional preview of camera feed (privacy controlled)
 * 
 * Shows a small, local-only preview of the camera feed.
 * This is purely for user comfort - no data is sent anywhere.
 */

import { forwardRef } from 'react';

interface VideoPreviewProps {
    isActive: boolean;
    showPreview?: boolean;
    className?: string;
}

export const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(
    ({ isActive, showPreview = true, className = '' }, ref) => {
        if (!showPreview) {
            return null;
        }

        return (
            <div className={`relative overflow-hidden rounded-2xl ${className}`}>
                {/* Video element - always muted, local only */}
                <video
                    ref={ref}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover bg-cream-200 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                    style={{ transform: 'scaleX(-1)' }} // Mirror for natural selfie view
                />

                {/* Placeholder when inactive */}
                {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-cream-100">
                        <div className="text-center text-cream-500">
                            <div className="text-4xl mb-2">📷</div>
                            <p className="text-sm">Camera off</p>
                        </div>
                    </div>
                )}

                {/* Privacy indicator */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-xs text-white/90">
                        {isActive ? 'Local only' : 'Off'}
                    </span>
                </div>
            </div>
        );
    }
);

VideoPreview.displayName = 'VideoPreview';
