import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { parseUTCDate } from '../../../utils/dateUtils';
import { Check, Loader2, User as UserIcon, Edit2, X, Trash2, Save, Calendar, List, Clock, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import ConfirmModal from './Modal';
import ShareModal from './ShareModal';
import PollMonthView from './PollMonthView';
import PollWeekView from './PollWeekView';
import DatePicker from 'react-datepicker'; // For Edit Series date picker
import "react-datepicker/dist/react-datepicker.css";
import './datepicker-custom.css';

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
    const [viewMode, setViewMode] = useState<'list' | 'month' | 'week'>('list');
    const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar Views

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{ title: string; description: string }>({ title: '', description: '' });
    const [processingEdit, setProcessingEdit] = useState(false);

    // Edit Series State
    const [isEditingSeries, setIsEditingSeries] = useState(false);
    const [editSeriesDate, setEditSeriesDate] = useState<Date>(new Date());
    const [newPattern, setNewPattern] = useState<string>('WEEKLY'); // Simplified

    // New Option State
    const [newOption, setNewOption] = useState<{ label: string; start_time: string; end_time: string }>({ label: '', start_time: '', end_time: '' });
    const [addingOption, setAddingOption] = useState(false);

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
                setEditForm({ title: data.title, description: data.description || '' });
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

    const handleUpdatePoll = async () => {
        if (!pollId) return;
        setProcessingEdit(true);
        try {
            const res = await fetch(`/api/polls/${pollId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error('Failed to update poll');

            setIsEditing(false);
            await fetchPoll();
        } catch (error) {
            console.error(error);
            alert('Failed to update poll.');
        } finally {
            setProcessingEdit(false);
        }
    };

    const handleUpdateSeries = async () => {
        if (!pollId) return;

        const confirmUpdate = async () => {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            setProcessingEdit(true);
            try {
                // Construct RRULE based on simple selection for now
                const rrule = `FREQ=${newPattern}`; // Simplify for MVP

                const payload = {
                    ...editForm,
                    recurrence_pattern: rrule,
                    apply_changes_from: editSeriesDate.toISOString()
                };

                const res = await fetch(`/api/polls/${pollId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update series');

                setIsEditingSeries(false);
                await fetchPoll();
            } catch (error) {
                console.error(error);
                alert('Failed to update series.');
            } finally {
                setProcessingEdit(false);
            }
        };

        setModalConfig({
            isOpen: true,
            title: "Update Recurring Series",
            message: `Are you sure you want to change the schedule from ${format(editSeriesDate, 'MMM d')}? Future events will be regenerated.`,
            onConfirm: confirmUpdate,
            variant: 'warning',
            confirmText: "Update Series"
        });
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

    const handleAddOption = async () => {
        if (!pollId) return;
        if (!newOption.label || !newOption.start_time || !newOption.end_time) {
            alert("Please fill in all fields for the new option.");
            return;
        }
        setAddingOption(true);
        try {
            const res = await fetch(`/api/polls/${pollId}/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOption)
            });
            if (!res.ok) throw new Error('Failed to add option');

            // Reset and refresh
            setNewOption({ label: '', start_time: '', end_time: '' });
            await fetchPoll();
        } catch (error) {
            console.error(error);
            alert('Failed to add option.');
        } finally {
            setAddingOption(false);
        }
    };

    const handleDeleteOption = async (optionId: number) => {
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

    // Navigation handlers
    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(addMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(addWeeks(currentDate, 1));
        }
    };

    const handlePrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(subMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(subWeeks(currentDate, 1));
        }
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
                        {isEditing ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full text-3xl font-serif text-ink bg-white/50 border border-jade-200 rounded p-2 focus:ring-2 focus:ring-jade-400 focus:outline-none"
                                    placeholder="Event Title"
                                />
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full text-sm text-jade-700 bg-white/50 border border-jade-200 rounded p-2 focus:ring-2 focus:ring-jade-400 focus:outline-none"
                                    placeholder="Description (optional)"
                                    rows={2}
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleUpdatePoll}
                                        disabled={processingEdit}
                                        className="flex items-center space-x-1 px-3 py-1 bg-jade-600 text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-jade-700 disabled:opacity-50"
                                    >
                                        {processingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        <span>Save</span>
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold uppercase tracking-wider hover:bg-gray-300"
                                    >
                                        <X size={12} />
                                        <span>Cancel</span>
                                    </button>

                                    {poll.is_recurring && (
                                        <button
                                            onClick={() => setIsEditingSeries(true)}
                                            className="flex items-center space-x-1 px-3 py-1 bg-jade-100 text-jade-600 rounded text-xs font-bold uppercase tracking-wider hover:bg-jade-200"
                                        >
                                            <Clock size={12} />
                                            <span>Edit Series</span>
                                        </button>
                                    )}

                                    <div className="flex-1"></div>
                                    <button
                                        onClick={handleDeletePoll}
                                        className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold uppercase tracking-wider hover:bg-red-200 ml-auto"
                                    >
                                        <Trash2 size={12} />
                                        <span>Delete Event</span>
                                    </button>
                                </div>

                                {isEditingSeries && (
                                    <div className="mt-4 p-4 bg-jade-50 border border-jade-200 rounded-lg">
                                        <h4 className="text-sm font-bold text-jade-800 mb-2">Modify Series</h4>
                                        <div className="flex items-end gap-4">
                                            <div>
                                                <label className="text-xs text-jade-600 block mb-1">Effective Date</label>
                                                <DatePicker
                                                    selected={editSeriesDate}
                                                    onChange={date => date && setEditSeriesDate(date)}
                                                    className="w-full text-sm p-1 border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-jade-600 block mb-1">New Pattern</label>
                                                <select
                                                    value={newPattern}
                                                    onChange={e => setNewPattern(e.target.value)}
                                                    className="text-sm p-1.5 border rounded w-32"
                                                >
                                                    <option value="DAILY">Daily</option>
                                                    <option value="WEEKLY">Weekly</option>
                                                    <option value="MONTHLY">Monthly</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleUpdateSeries}
                                                disabled={processingEdit}
                                                className="bg-jade-600 text-white text-xs px-3 py-1.5 rounded hover:bg-jade-700"
                                            >
                                                Update Series
                                            </button>
                                            <button
                                                onClick={() => setIsEditingSeries(false)}
                                                className="text-gray-500 text-xs hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-jade-500 mt-2">
                                            Warning: This will delete all time slots starting from the selected date and regenerate them.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <h2 className="text-3xl font-serif text-ink mb-2">{poll.title}</h2>
                                {poll.description && (
                                    <p className="text-jade-700 font-sans text-sm max-w-2xl whitespace-pre-line">{poll.description}</p>
                                )}
                            </>
                        )}
                    </div>

                    {!isEditing && currentUser?.id === poll.creator.id && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setShareModalOpen(true)}
                                className="p-2 text-jade-400 hover:text-jade-600 hover:bg-jade-50 rounded-full transition-colors"
                                title="Share Event"
                            >
                                <Share2 size={18} />
                            </button>
                            {currentUser?.id === poll.creator.id && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-jade-400 hover:text-jade-600 hover:bg-jade-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit Event"
                                >
                                    <Edit2 size={18} />
                                </button>
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
                        <Clock size={16} /> {/* Using Clock icon for Weekly timeline feeling */}
                        <span>Week</span>
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
                        <button onClick={handlePrev} className="p-1 hover:bg-jade-100 rounded text-jade-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold text-ink w-32 text-center">
                            {viewMode === 'month' ? format(currentDate, 'MMM yyyy') : format(currentDate, "'Week of' MMM d")}
                        </span>
                        <button onClick={handleNext} className="p-1 hover:bg-jade-100 rounded text-jade-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Views */}
            {viewMode === 'month' && (
                <PollMonthView
                    options={poll.options}
                    currentDate={currentDate}
                    onDateSelect={(date) => {
                        // When clicking a day, switch to week view focused on that day?
                        // Or just highlight?
                        setCurrentDate(date);
                        setViewMode('week');
                    }}
                />
            )}

            {viewMode === 'week' && (
                <PollWeekView
                    options={poll.options}
                    currentDate={currentDate}
                />
            )}

            {viewMode === 'list' && (
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-max bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden">

                        {/* Header Row: Dates */}
                        <div className="flex border-b border-jade-200">
                            {/* Empty corner cell */}
                            <div className="w-48 p-4 shrink-0 flex flex-col justify-end bg-jade-50/50">
                                {isEditing && (
                                    <div className="p-2 border-b border-jade-200 mb-2">
                                        <div className="text-xs font-bold text-jade-600 mb-2">Add Time Slot</div>
                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Dinner)"
                                            className="w-full text-xs p-1 mb-1 border rounded"
                                            value={newOption.label}
                                            onChange={e => setNewOption({ ...newOption, label: e.target.value })}
                                        />
                                        <input
                                            type="datetime-local"
                                            className="w-full text-xs p-1 mb-1 border rounded"
                                            value={newOption.start_time}
                                            onChange={e => setNewOption({ ...newOption, start_time: e.target.value })}
                                        />
                                        <input
                                            type="datetime-local"
                                            className="w-full text-xs p-1 mb-1 border rounded"
                                            value={newOption.end_time}
                                            onChange={e => setNewOption({ ...newOption, end_time: e.target.value })}
                                        />
                                        <button
                                            onClick={handleAddOption}
                                            disabled={addingOption}
                                            className="w-full bg-jade-500 text-white text-xs py-1 rounded hover:bg-jade-600 disabled:opacity-50"
                                        >
                                            {addingOption ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                )}
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

                                        {isEditing && (
                                            <button
                                                onClick={() => handleDeleteOption(option.id)}
                                                className="absolute top-1 right-1 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 hover:text-red-700 transition-colors"
                                                title="Delete Option"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
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
