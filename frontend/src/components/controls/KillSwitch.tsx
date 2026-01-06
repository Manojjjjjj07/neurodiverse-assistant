/**
 * KillSwitch - Toggle button for starting/stopping the assistant
 * 
 * CRITICAL PRIVACY CONTROL:
 * - Immediately stops all camera/microphone access
 * - Terminates all inference processing
 * - Clears any buffered media data
 * - Prominently displayed but not alarming
 */

interface KillSwitchProps {
    onKill: () => void;
    isActive: boolean;
    className?: string;
}

export function KillSwitch({ onKill, isActive, className = '' }: KillSwitchProps) {
    return (
        <button
            onClick={onKill}
            className={`kill-switch ${className}`}
            aria-label={isActive ? 'Stop assistant - immediately stops camera and microphone' : 'Start assistant - enable camera and microphone'}
        >
            <span className="flex items-center gap-2">
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    {isActive ? (
                        // Stop icon (square)
                        <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
                    ) : (
                        // Play icon (triangle)
                        <polygon points="5,3 19,12 5,21" strokeWidth="2" />
                    )}
                </svg>
                <span>{isActive ? 'Stop Assistant' : 'Start Assistant'}</span>
            </span>
        </button>
    );
}
