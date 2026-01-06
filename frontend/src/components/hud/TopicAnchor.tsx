/**
 * TopicAnchor - ADHD-friendly conversation topic tracking
 * 
 * Helps users:
 * - See what topic they're currently on
 * - Track how long they've been on a topic
 * - Review recent topic history
 * - Re-engage after losing focus
 */

import { useEmotionStore } from '../../stores';

interface TopicAnchorProps {
    className?: string;
}

export function TopicAnchor({ className = '' }: TopicAnchorProps) {
    const currentTopic = useEmotionStore((s) => s.currentTopic);
    const topicHistory = useEmotionStore((s) => s.topicHistory);

    // Format duration
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    // Mock current topic for demo
    const mockTopic = {
        id: '1',
        topic: 'Project Timeline',
        startedAt: Date.now() - 120000, // 2 mins ago
        durationSeconds: 120,
        isActive: true,
    };

    const displayTopic = currentTopic || mockTopic;
    const displayHistory = topicHistory.length > 0 ? topicHistory : [
        { id: '2', topic: 'Budget Review', startedAt: Date.now() - 300000, durationSeconds: 180, isActive: false },
        { id: '3', topic: 'Team Updates', startedAt: Date.now() - 600000, durationSeconds: 300, isActive: false },
    ];

    return (
        <div className={`card space-y-4 ${className}`}>
            {/* Current Topic */}
            <div>
                <p className="text-xs text-cream-500 uppercase tracking-wide font-medium mb-2">
                    Current Topic
                </p>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="topic-chip">
                            <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse mr-2" />
                            <span>{displayTopic.topic}</span>
                        </div>
                    </div>
                    <span className="text-sm text-cream-500">
                        {formatDuration(displayTopic.durationSeconds)}
                    </span>
                </div>
            </div>

            {/* Topic History */}
            <div>
                <p className="text-xs text-cream-500 uppercase tracking-wide font-medium mb-2">
                    Recent Topics
                </p>
                <div className="space-y-2">
                    {displayHistory.slice(0, 3).map((topic) => (
                        <div
                            key={topic.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-cream-100 transition-colors"
                        >
                            <span className="text-sm text-cream-700">{topic.topic}</span>
                            <span className="text-xs text-cream-500">
                                {formatDuration(topic.durationSeconds)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Re-engagement prompt */}
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-3">
                <p className="text-sm text-sage-700">
                    💡 <span className="font-medium">Lost track?</span> You were discussing{' '}
                    <span className="font-medium">{displayTopic.topic}</span> for about{' '}
                    {formatDuration(displayTopic.durationSeconds)}.
                </p>
            </div>
        </div>
    );
}
