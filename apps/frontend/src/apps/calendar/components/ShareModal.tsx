import React, { useState, useEffect } from 'react';
import { Loader2, Share2, AlertCircle, Hash, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MentionSelector } from './MentionSelector';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Channel {
    id: string;
    name: string;
    position: number;
    parent_id?: string;
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    pollId: number;
    pollTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, pollId, pollTitle }) => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [success, setSuccess] = useState(false);

    const [customMessage, setCustomMessage] = useState('Hey! I created a new poll: ' + pollTitle + '. Please vote!');
    const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchChannels();
            setSuccess(false);
            setError(null);
            setSelectedChannelId(null);
            // Reset message
            setCustomMessage('Hey! I created a new poll: ' + pollTitle + '. Please vote!');
            setMentionedUserIds([]);
        }
    }, [isOpen, pollTitle]);

    const fetchChannels = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/discord/channels');
            if (!res.ok) throw new Error('Failed to fetch channels');
            const data = await res.json();
            setChannels(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Could not load channels.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!selectedChannelId) return;
        setSharing(true);
        setError(null);

        try {
            const res = await fetch('/api/discord/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    poll_id: pollId,
                    channel_id: selectedChannelId,
                    custom_message: customMessage,
                    mentioned_user_ids: mentionedUserIds
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to share event');
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to share event.');
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-jade-100 max-h-[90vh] overflow-y-auto"
            >
                <div className="bg-jade-50/50 p-4 border-b border-jade-100 flex justify-between items-center rounded-t-xl sticky top-0 backdrop-blur-md">
                    <h3 className="text-lg font-serif text-ink font-bold flex items-center gap-2">
                        <Share2 size={20} className="text-jade-600" />
                        Share Event
                    </h3>
                    <button onClick={onClose} className="text-jade-400 hover:text-jade-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h4 className="text-xl font-serif text-ink mb-2">Sent!</h4>
                            <p className="text-jade-600 text-sm">Event shared to Discord successfully.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message (Optional)
                                </label>
                                <textarea
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="Add a message..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-jade-500 focus:border-jade-500 text-sm min-h-[80px]"
                                />
                            </div>

                             <div className="mb-4">
                                <MentionSelector
                                    label="Mention Users"
                                    selectedUserIds={mentionedUserIds}
                                    onChange={setMentionedUserIds}
                                />
                            </div>

                            <p className="text-sm text-jade-700 mb-2">
                                Select a Discord channel to share <strong>{pollTitle}</strong>.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {loading ? (
                                <div className="py-8 flex justify-center text-jade-500">
                                    <Loader2 className="animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {channels.length === 0 ? (
                                        <div className="text-center text-sm text-gray-400 py-4">No text channels found.</div>
                                    ) : (
                                        channels.map(channel => (
                                            <button
                                                key={channel.id}
                                                onClick={() => setSelectedChannelId(channel.id)}
                                                className={cn(
                                                    "w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3",
                                                    selectedChannelId === channel.id
                                                        ? "bg-jade-50 border-jade-500 ring-1 ring-jade-500"
                                                        : "bg-white border-gray-200 hover:border-jade-300 hover:bg-jade-50/30"
                                                )}
                                            >
                                                <Hash size={18} className={cn(
                                                    selectedChannelId === channel.id ? "text-jade-600" : "text-gray-400"
                                                )} />
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    selectedChannelId === channel.id ? "text-jade-900" : "text-gray-600"
                                                )}>
                                                    {channel.name}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!success && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl sticky bottom-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 font-medium hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={!selectedChannelId || sharing}
                            className="px-4 py-2 bg-jade-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-jade-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {sharing && <Loader2 size={14} className="animate-spin" />}
                            Share Event
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ShareModal;
