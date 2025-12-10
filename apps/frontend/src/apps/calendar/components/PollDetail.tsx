import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { parseUTCDate } from '../../../utils/dateUtils';
import { Check, Loader2, User as UserIcon, Edit2, Trash2, Calendar, List, Clock, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import ConfirmModal from './Modal';
import ShareModal from './ShareModal';
import MonthView from '../../../components/Calendar/MonthView';
import WeeklyScheduler, { SchedulerEvent } from '../../../components/Calendar/WeeklyScheduler'; // Replaced PollWeekView

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface PollOption {
    id: number;
    label: string;
    start_time: string;
    end_time: string;
}

interface User {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
}

interface Vote {
    poll_option_id: number;
    user: User;
}

interface PollDetailData {
    id: number;
    title: string;
    description?: string;
    creator: User;
    created_at: string;
    options: PollOption[];
    is_recurring: boolean;
    recurrence_pattern?: string;
    recurrence_end_date?: string;
    deadline_date?: string;
    deadline_offset_minutes?: number;
    deadline_channel_id?: string;
    deadline_message?: string;
    deadline_mention_ids?: number[];
}

interface OptionWithVotes extends PollOption {
    votes: Vote[];
}

interface PollWithVotes extends PollDetailData {
    options: OptionWithVotes[];
}

const PollDetail: React.FC = () => {
    const { pollId } = useParams();
    const navigate = useNavigate();
    const [poll, setPoll] = useState<PollWithVotes | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null); // To highlight own votes
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingOptionId, setTogglingOptionId] = useState<number | null>(null);
    // Default view mode is now 'week' (Calendar)
    const [viewMode, setViewMode] = useState<'list' | 'month' | 'week'>('week');
    const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar Views

    // New Option State (for List view fallback)

    // New Option State (for List view fallback)



    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Share Modal State
    const [shareModalOpen, setShareModalOpen] = useState(false);

    // Fetch Current User
    useEffect(() => {
        fetch('/api/users/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => setCurrentUser(data))
            .catch(() => { }); // Ignore error, just wont highlight
    }, []);

    const fetchPoll = () => {
        if (!pollId) return;
        fetch(`/api/polls/${pollId}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch poll');
                return res.json();
            })
            .then(data => {
                setPoll(data);
                // If options exist, set currentDate to start of first option?
                if (data.options.length > 0) {
                    // Check if there are future options?
                    const future = data.options.find((o: PollOption) => parseUTCDate(o.start_time) > new Date());
                    if (future) setCurrentDate(parseUTCDate(future.start_time));
                    else setCurrentDate(parseUTCDate(data.options[data.options.length - 1].start_time));
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPoll();
    }, [pollId]);

    const handleVote = async (optionId: number) => {
        if (togglingOptionId) return; // Prevent double click
        setTogglingOptionId(optionId);

        try {
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poll_option_id: optionId })
            });

            if (!res.ok) throw new Error('Vote failed');

            // Refresh poll data to see updated votes
            await fetchPoll();
        } catch (error) {
            console.error(error);
            alert('Failed to cast vote.');
        } finally {
            setTogglingOptionId(null);
        }
    };

    const handleEditRecreate = () => {
        if (!poll) return;
        // Navigate to Create page with poll data
        navigate('../create', { state: { editingPoll: poll } });
    };



    const handleDeletePoll = async () => {
        if (!pollId) return;

        const confirmDelete = async () => {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            try {
                const res = await fetch(`/api/polls/${pollId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete poll');
                // Redirect to list
                navigate('..');
            } catch (error) {
                console.error(error);
                alert('Failed to delete poll.');
            }
        };

        setModalConfig({
            isOpen: true,
            title: "Delete Event",
            message: 'Are you sure you want to delete this ENTIRE event? This action cannot be undone.',
            onConfirm: confirmDelete,
            variant: 'danger',
            confirmText: "Delete Event"
        });
    };



    const handleAddOptionScheduler = async (start: Date, end: Date) => {
        if (!pollId) return;
        try {
            const res = await fetch(`/api/polls/${pollId}/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: format(start, 'EEE, MMM d'),
                    start_time: start.toISOString(),
                    end_time: end.toISOString()
                })
            });
            if (!res.ok) throw new Error('Failed to add option');
            await fetchPoll();
        } catch (error) {
            console.error(error);
            alert('Failed to add option.');
        }
    };

    const handleDeleteOption = async (optionId: number | string) => {
        if (!pollId) return;

        const confirmDelete = async () => {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            try {
                const res = await fetch(`/api/polls/${pollId}/options/${optionId}`, {
                    method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete option');
                await fetchPoll();
            } catch (error) {
                console.error(error);
                alert('Failed to delete option.');
            }
        };

        setModalConfig({
            isOpen: true,
            title: "Delete Time Slot",
            message: 'Are you sure you want to delete this option? All votes for it will be lost.',
            onConfirm: confirmDelete,
            variant: 'danger',
            confirmText: "Delete"
        });
    };



    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-jade-500" /></div>;
    if (error || !poll) return <div className="text-center py-12 text-red-400">Error: {error || 'Poll not found'}</div>;

    // Derived state: unique voters
    const allVotersMap = new Map<number, User>();
    poll.options.forEach(opt => {
        opt.votes.forEach(vote => {
            if (vote.user) allVotersMap.set(vote.user.id, vote.user);
        });
    });
    const voters = Array.from(allVotersMap.values());

    const isCreator = currentUser?.id === poll.creator.id;

    // Prepare scheduler events
    const schedulerEvents: SchedulerEvent[] = poll.options.map(opt => ({
        id: opt.id,
        start_time: opt.start_time,
        end_time: opt.end_time,
        label: opt.label,
        data: { votes: opt.votes } // Pass votes to scheduler
    }));

    // Prepare calendar events for MonthView
    const calendarEvents = poll.options.map(opt => ({
        date: parseUTCDate(opt.start_time),
        value: opt.votes?.length || 0, // Pass raw vote count for display
        hasMarker: true,
        color: opt.votes?.some(v => v.user?.id === currentUser?.id) ? 'bg-jade-500' : 'bg-jade-300'
    }));

    return (
        <div className="space-y-8">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant}
                confirmText={modalConfig.confirmText}
            />

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                pollId={poll.id}
                pollTitle={poll.title}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 backdrop-blur-sm border-b border-jade-100 pb-6 relative group"
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        <h2 className="text-3xl font-serif text-ink mb-2">{poll.title}</h2>
                        {poll.description && (
                            <p className="text-jade-700 font-sans text-sm max-w-2xl whitespace-pre-line">{poll.description}</p>
                        )}
                    </div>

                    {isCreator && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setShareModalOpen(true)}
                                className="p-2 text-jade-400 hover:text-jade-600 hover:bg-jade-50 rounded-full transition-colors"
                                title="Share Event"
                            >
                                <Share2 size={18} />
                            </button>
                            {isCreator && (
                                <>
                                    <button
                                        onClick={handleEditRecreate}
                                        className="p-2 text-jade-400 hover:text-jade-600 hover:bg-jade-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Edit Event"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={handleDeletePoll}
                                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Event"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 mt-4 text-xs text-jade-500 uppercase tracking-widest font-bold">
                    <span>Organized by {poll.creator?.display_name || poll.creator?.username || 'Unknown'}</span>
                    {poll.is_recurring && (
                        <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                                <Clock size={12} />
                                <span>Recurring</span>
                            </span>
                        </>
                    )}
                </div>
            </motion.div>

            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-jade-50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-md transition-all flex items-center space-x-2 text-xs font-bold uppercase tracking-wider",
                            viewMode === 'list' ? "bg-white text-jade-600 shadow-sm" : "text-jade-400 hover:text-jade-600 hover:bg-jade-100"
                        )}
                    >
                        <List size={16} />
                        <span>List</span>
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={cn(
                            "p-2 rounded-md transition-all flex items-center space-x-2 text-xs font-bold uppercase tracking-wider",
                            viewMode === 'week' ? "bg-white text-jade-600 shadow-sm" : "text-jade-400 hover:text-jade-600 hover:bg-jade-100"
                        )}
                    >
                        <Clock size={16} />
                        <span>Calendar</span>
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={cn(
                            "p-2 rounded-md transition-all flex items-center space-x-2 text-xs font-bold uppercase tracking-wider",
                            viewMode === 'month' ? "bg-white text-jade-600 shadow-sm" : "text-jade-400 hover:text-jade-600 hover:bg-jade-100"
                        )}
                    >
                        <Calendar size={16} />
                        <span>Month</span>
                    </button>
                </div>

                {/* Navigation for Month/Week views */}
                {(viewMode === 'month' || viewMode === 'week') && (
                    <div className="flex items-center space-x-2">
                        {/* Only show navigation if NOT in week/editable mode to avoid clutter? No, keep it. */}
                    </div>
                )}
            </div>

            {/* Views */}
            {viewMode === 'month' && (
                <>
                    <MonthView
                        events={calendarEvents}
                        currentDate={currentDate}
                        onDateSelect={(date) => {
                            setCurrentDate(date);
                            setViewMode('week');
                        }}
                        onMonthChange={(date) => setCurrentDate(date)}
                        minDate={new Date()} // Keep minDate consistent with creation logic
                    />
                </>
            )}

            {viewMode === 'week' && (
                <div className="h-[600px]">
                    <WeeklyScheduler
                        events={schedulerEvents}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        isEditable={false}
                        isReadOnly={!isCreator}
                        onAddEvent={handleAddOptionScheduler}
                        onRemoveEvent={handleDeleteOption}
                        preventPastEvents={true}
                        deadline={poll.deadline_date ? parseUTCDate(poll.deadline_date) : null}
                    />
                </div>
            )}

            {viewMode === 'list' && (
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-max bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden">

                        {/* Header Row: Dates */}
                        <div className="flex border-b border-jade-200">
                            {/* Empty corner cell */}
                            <div className="w-48 p-4 shrink-0 flex flex-col justify-end bg-jade-50/50">

                                <div className="p-4">
                                    <span className="text-xs font-bold text-jade-400 uppercase tracking-wider">Participants</span>
                                </div>
                            </div>

                            {/* Options */}
                            {poll.options.map(option => {
                                const start = parseUTCDate(option.start_time);
                                const end = parseUTCDate(option.end_time);
                                return (
                                    <div key={option.id} className="w-32 shrink-0 border-l border-jade-100 p-3 text-center flex flex-col justify-center bg-white/50 relative group">
                                        <span className="text-xs font-bold text-jade-600 uppercase mb-1">{format(start, 'MMM')}</span>
                                        <span className="text-xl font-serif text-ink font-bold mb-1">{format(start, 'd')}</span>
                                        <span className="text-[10px] text-jade-500 font-medium">
                                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                        </span>
                                        <span className="text-[10px] text-jade-400 truncate w-full">{option.label}</span>


                                    </div>
                                );
                            })}
                        </div>

                        {/* Current User Voting Row (Sticky or Top) */}
                        {currentUser && (
                            <div className={cn(
                                "flex border-b border-jade-200/50 bg-jade-50/30 relative",
                                // Visual effect: highlight row with a subtle glow/border
                                "after:absolute after:inset-0 after:border-2 after:border-jade-300/50 after:pointer-events-none after:rounded-lg after:shadow-sm"
                            )}>
                                <div className="w-48 p-4 shrink-0 flex items-center space-x-3">
                                    {currentUser.avatar_url ? (
                                        <img src={currentUser.avatar_url} alt={currentUser.username} className="w-8 h-8 rounded-full border border-jade-300 shadow-sm" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-jade-200 flex items-center justify-center text-jade-700 font-bold border border-jade-300">
                                            {currentUser.display_name?.[0] || currentUser.username[0]}
                                        </div>
                                    )}
                                    <span className="text-sm font-bold text-ink truncate">{currentUser.display_name || currentUser.username}</span>
                                </div>

                                {poll.options.map(option => {
                                    const hasVoted = option.votes.some(v => v.user?.id === currentUser.id);
                                    const isToggling = togglingOptionId === option.id;

                                    return (
                                        <div key={option.id} className="w-32 shrink-0 border-l border-jade-100 p-2 flex items-center justify-center">
                                            <button
                                                onClick={() => handleVote(option.id)}
                                                disabled={isToggling}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                                                    hasVoted
                                                        ? "bg-jade-500 text-white shadow-md shadow-jade-200 scale-100"
                                                        : "bg-white border-2 border-jade-100 text-jade-200 hover:border-jade-300 hover:text-jade-300 scale-90 hover:scale-100"
                                                )}
                                            >
                                                {isToggling ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <Check size={20} className={cn("transition-transform", hasVoted ? "scale-100" : "scale-0 opacity-0 group-hover:opacity-50")} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Other Participants Rows */}
                        {voters.filter(v => v.id !== currentUser?.id).map(voter => (
                            <div key={voter.id} className="flex border-b border-jade-100 last:border-0 hover:bg-jade-50/20 transition-colors">
                                <div className="w-48 p-4 shrink-0 flex items-center space-x-3">
                                    {voter.avatar_url ? (
                                        <img src={voter.avatar_url} alt={voter.username} className="w-8 h-8 rounded-full border border-jade-200" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-jade-400">
                                            <UserIcon size={16} />
                                        </div>
                                    )}
                                    <span className="text-sm text-ink/80 truncate">{voter.display_name || voter.username}</span>
                                </div>

                                {poll.options.map(option => {
                                    const hasVoted = option.votes.some(v => v.user?.id === voter.id);
                                    return (
                                        <div key={option.id} className="w-32 shrink-0 border-l border-jade-100 p-2 flex items-center justify-center">
                                            {hasVoted && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-8 h-8 rounded-full bg-jade-100 text-jade-600 flex items-center justify-center"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Summary Row (Counts) */}
                        <div className="flex bg-jade-50/50 border-t border-jade-200">
                            <div className="w-48 p-4 shrink-0 flex items-center justify-end">
                                <span className="text-xs font-bold text-jade-400 uppercase tracking-wider">Total</span>
                            </div>
                            {poll.options.map(option => (
                                <div key={option.id} className="w-32 shrink-0 border-l border-jade-100 p-3 flex items-center justify-center">
                                    <span className={cn(
                                        "text-lg font-bold font-serif",
                                        option.votes.length > 0 ? "text-jade-600" : "text-jade-300"
                                    )}>
                                        {option.votes.length}
                                    </span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default PollDetail;
