import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { Loader2, Save, Repeat, Bot, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import ConfirmModal from './Modal';
import WeeklyScheduler, { SchedulerEvent } from './WeeklyScheduler';
import { MentionSelector } from './MentionSelector';

import { DurationSelector } from './DurationSelector';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const formatDuration = (totalMinutes: number) => {
    if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;

    // Hours
    if (totalMinutes < 60 * 24) {
        const hours = Math.round((totalMinutes / 60) * 10) / 10;
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    // Days (if < 7 days)
    if (totalMinutes < 60 * 24 * 7) {
        const days = Math.round((totalMinutes / (60 * 24)) * 10) / 10;
        return `${days} day${days !== 1 ? 's' : ''}`;
    }

    // Weeks
    const weeks = Math.round((totalMinutes / (60 * 24 * 7)) * 10) / 10;
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
};

interface PollOptionInput {
    start_time: Date;
    end_time: Date;
}

interface Channel {
    id: string;
    name: string;
    position: number;
}

type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'AI';

const PollCreate: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState<PollOptionInput[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('WEEKLY');
    const [recurrenceEndMode, setRecurrenceEndMode] = useState<'DATE' | 'COUNT'>('DATE');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
    const [customDays, setCustomDays] = useState<string[]>([]);

    // Deadline State
    const [enableDeadline, setEnableDeadline] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
    const [deadlineChannelId, setDeadlineChannelId] = useState<string>('');
    const [deadlineMessage, setDeadlineMessage] = useState('The deadline has passed! Here is the plan:');
    const [deadlineMentions, setDeadlineMentions] = useState<number[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);


    // Scheduler State
    const [currentSchedulerDate, setCurrentSchedulerDate] = useState(new Date());
    const [isInvalidDeadline, setIsInvalidDeadline] = useState(false);
    const [duration, setDuration] = useState(30);

    // Modal state for recurring template replacement
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    useEffect(() => {
        // Fetch channels for deadline
        fetch('/api/discord/channels')
            .then(res => res.json())
            .then(data => setChannels(data))
            .catch(err => console.error("Failed to fetch channels", err));
    }, []);

    const handleAddEvent = (start: Date, end: Date) => {
        // If recurring, only one option allowed as template
        if (isRecurring && options.length > 0) {
            setModalConfig({
                isOpen: true,
                title: "Replace Time Slot",
                message: "Recurring events use a single time slot as a template. Do you want to replace the existing time?",
                onConfirm: () => {
                    setOptions([{ start_time: start, end_time: end }]);
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
            return;
        }

        // Avoid duplicates
        const exists = options.some(opt =>
            opt.start_time.getTime() === start.getTime() &&
            opt.end_time.getTime() === end.getTime()
        );

        if (!exists) {
            setOptions([...options, { start_time: start, end_time: end }].sort((a, b) => a.start_time.getTime() - b.start_time.getTime()));
        }
    };

    const handleRemoveEvent = (eventId: string | number) => {
        // Event ID is index in this simple case
        const index = Number(eventId);
        setOptions(options.filter((_, i) => i !== index));
    };

    const constructRRule = () => {
        if (!isRecurring) return null;

        let freq = recurrenceType;
        if (freq === 'CUSTOM') freq = 'WEEKLY'; // Custom days is just weekly with BYDAY
        if (freq === 'AI') return null; // Handle separately or fail?

        const parts = [`FREQ=${freq}`];

        if (recurrenceType === 'CUSTOM' && customDays.length > 0) {
            parts.push(`BYDAY=${customDays.join(',')}`);
        }

        return parts.join(';');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || options.length === 0) return;
        if (enableDeadline && !deadlineChannelId) {
            alert("Please select a channel for notifications.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Construct payload
            const baseOptions = options.map(opt => ({
                label: format(opt.start_time, 'EEE, MMM d'),
                start_time: opt.start_time.toISOString(),
                end_time: opt.end_time.toISOString()
            }));

            const payload: any = {
                title,
                description,
                options: baseOptions,
                is_recurring: isRecurring
            };

            if (isRecurring) {
                if (recurrenceType === 'AI') {
                    // Placeholder behavior
                    alert("AI Auto-Schedule is under construction!");
                    setIsSubmitting(false);
                    return;
                }

                payload.recurrence_pattern = constructRRule();
                if (recurrenceEndMode === 'DATE' && recurrenceEndDate) {
                    payload.recurrence_end_date = recurrenceEndDate.toISOString();
                } else if (recurrenceEndMode === 'COUNT') {
                    payload.recurrence_pattern += `;COUNT=${recurrenceCount}`;
                }
            }

            // Add Deadline Data
            if (enableDeadline) {
                if (!deadlineDate) {
                    alert("Please select a deadline time on the calendar.");
                    setIsSubmitting(false);
                    return;
                }

                if (deadlineDate <= new Date()) {
                    alert("Deadline cannot be in the past.");
                    setIsSubmitting(false);
                    return;
                }

                payload.deadline_channel_id = deadlineChannelId;
                payload.deadline_message = deadlineMessage;
                payload.deadline_mention_ids = deadlineMentions;

                if (isRecurring) {
                    // Calculate offset from visual deadline - difference between first event and deadline
                    if (options.length > 0) {
                        const firstEventStart = options[0].start_time;
                        const offsetMinutes = Math.round((firstEventStart.getTime() - deadlineDate.getTime()) / (1000 * 60));
                        if (offsetMinutes <= 0) {
                            alert("Deadline must be before the event time.");
                            setIsSubmitting(false);
                            return;
                        }
                        payload.deadline_offset_minutes = offsetMinutes;
                    } else {
                        // Should technically be caught by options.length check above outer scope if we enforced it, 
                        // but here we just need to ensure we can calculate offset.
                        alert("Please propose time slots first so we can validate the deadline.");
                        setIsSubmitting(false);
                        return;
                    }
                } else {
                    // Non-recurring
                    // Validate deadline is before first event
                    if (options.length > 0) {
                        const sortedOptions = [...options].sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
                        const firstEventStart = sortedOptions[0].start_time;
                        if (deadlineDate >= firstEventStart) {
                            alert("Deadline must be BEFORE the first event starts.");
                            setIsSubmitting(false);
                            return;
                        }
                    }
                    payload.deadline_date = deadlineDate.toISOString();
                }
            }

            const res = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create poll');

            // Record mention history implicitly?
            // The backend doesn't automatically do it on create, but we have an API for it or we rely on the `MentionService` being called manually.
            // Actually, in our plan, we didn't hook `create_poll` to `record_mentions`.
            // But usually mentions are recorded when sending messages.
            // The deadline mentions will be used later.
            // Let's call the mention record API now so they are ranked high immediately?
            // Optional but good UX.
            if (deadlineMentions.length > 0) {
                // Fire and forget
                // But we don't have a direct "record" endpoint exposed, we only have "send message" or implicit.
                // It's fine. Ranking updates when they are actually mentioned/notified.
            }

            navigate('../'); // Go back to list
        } catch (error) {
            console.error(error);
            alert('Failed to create poll. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCustomDay = (day: string) => {
        if (customDays.includes(day)) {
            setCustomDays(customDays.filter(d => d !== day));
        } else {
            setCustomDays([...customDays, day]);
        }
    };

    // Convert options to SchedulerEvents
    const schedulerEvents: SchedulerEvent[] = options.map((opt, idx) => ({
        id: idx,
        start_time: opt.start_time,
        end_time: opt.end_time,
        label: isRecurring ? 'Template' : 'Option',
    }));

    return (
        <div className="max-w-4xl mx-auto">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                variant="warning"
                confirmText="Replace"
            />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/60 backdrop-blur-md border border-jade-100 rounded-xl p-8 shadow-sm"
            >
                <h2 className="text-2xl font-serif text-ink mb-6">Create New Gathering</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-jade-800 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-jade-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-jade-300 transition-all font-serif"
                            placeholder="e.g., Weekly Sync"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-jade-800 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-jade-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-jade-300 transition-all font-sans text-sm h-24"
                            placeholder="Add details about the event..."
                        />
                    </div>

                    {/* Recurrence Toggle */}
                    <div className="border-t border-jade-100 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center space-x-2 text-sm font-medium text-jade-800 cursor-pointer">
                                <div className={cn("w-10 h-6 rounded-full p-1 transition-colors duration-200", isRecurring ? "bg-jade-500" : "bg-gray-300")}>
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200", isRecurring ? "translate-x-4" : "translate-x-0")}></div>
                                </div>
                                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="hidden" />
                                <span className="flex items-center space-x-1">
                                    <Repeat size={16} />
                                    <span>Recurring Event</span>
                                </span>
                            </label>
                        </div>

                        <AnimatePresence>
                            {isRecurring && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-jade-50/50 rounded-lg p-4 border border-jade-100 space-y-4 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-jade-600 uppercase tracking-wider mb-2 block">Frequency</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setRecurrenceType(type)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded text-xs font-medium transition-colors border",
                                                            recurrenceType === type
                                                                ? "bg-jade-500 text-white border-jade-500"
                                                                : "bg-white text-jade-700 border-jade-200 hover:border-jade-300"
                                                        )}
                                                    >
                                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setRecurrenceType('AI')}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded text-xs font-medium transition-colors border flex items-center space-x-1",
                                                        recurrenceType === 'AI'
                                                            ? "bg-jade-500 text-white border-jade-500"
                                                            : "bg-white text-jade-700 border-jade-200 hover:border-jade-300"
                                                    )}
                                                >
                                                    <Bot size={12} />
                                                    <span>AI Auto-Schedule</span>
                                                </button>
                                            </div>
                                        </div>

                                        {recurrenceType === 'AI' && (
                                            <div className="text-xs text-jade-600 italic bg-jade-100 p-2 rounded">
                                                AI Auto-Schedule is currently under construction. Please check back later!
                                            </div>
                                        )}

                                        {recurrenceType === 'CUSTOM' && (
                                            <div>
                                                <label className="text-xs font-bold text-jade-600 uppercase tracking-wider mb-2 block">Days of Week</label>
                                                <div className="flex gap-2">
                                                    {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleCustomDay(day)}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full text-[10px] font-bold transition-colors border flex items-center justify-center",
                                                                customDays.includes(day)
                                                                    ? "bg-jade-500 text-white border-jade-500"
                                                                    : "bg-white text-jade-700 border-jade-200 hover:border-jade-300"
                                                            )}
                                                        >
                                                            {day}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {recurrenceType !== 'AI' && (
                                            <div className="flex items-end gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-jade-600 uppercase tracking-wider mb-2 block">Ends</label>
                                                    <div className="flex items-center space-x-4">
                                                        <label className="flex items-center space-x-2 text-sm text-ink cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="endMode"
                                                                checked={recurrenceEndMode === 'DATE'}
                                                                onChange={() => setRecurrenceEndMode('DATE')}
                                                                className="text-jade-600 focus:ring-jade-500"
                                                            />
                                                            <span>On Date</span>
                                                        </label>
                                                        <label className="flex items-center space-x-2 text-sm text-ink cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="endMode"
                                                                checked={recurrenceEndMode === 'COUNT'}
                                                                onChange={() => setRecurrenceEndMode('COUNT')}
                                                                className="text-jade-600 focus:ring-jade-500"
                                                            />
                                                            <span>After</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="w-48">
                                                    {recurrenceEndMode === 'DATE' ? (
                                                        <DatePicker
                                                            selected={recurrenceEndDate}
                                                            onChange={(date) => setRecurrenceEndDate(date)}
                                                            className="w-full px-3 py-1.5 rounded border border-jade-200 bg-white text-sm"
                                                            dateFormat="MMM d, yyyy"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="100"
                                                                value={recurrenceCount}
                                                                onChange={(e) => setRecurrenceCount(parseInt(e.target.value))}
                                                                className="w-20 px-3 py-1.5 rounded border border-jade-200 bg-white text-sm"
                                                            />
                                                            <span className="text-sm text-jade-600">occurrences</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="border-t border-jade-100 pt-6">
                        <label className="block text-sm font-medium text-jade-800 mb-4">
                            {isRecurring ? "Set Time Template (First Occurrence)" : "Propose Times"}
                        </label>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs text-jade-500">
                                Click on the calendar to add time slots. Right-click to remove.
                            </p>
                            <DurationSelector duration={duration} onChange={setDuration} />
                        </div>

                        <div className="h-[500px]">
                            <WeeklyScheduler
                                events={schedulerEvents}
                                currentDate={currentSchedulerDate}
                                onDateChange={setCurrentSchedulerDate}
                                onAddEvent={handleAddEvent}
                                onRemoveEvent={handleRemoveEvent}
                                isEditable={true}
                                deadline={enableDeadline ? deadlineDate : null}
                                eventDuration={duration}
                            />
                        </div>

                    </div>

                    {/* Deadline Toggle - Now after time slots */}
                    <div className="border-t border-jade-100 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center space-x-2 text-sm font-medium text-jade-800 cursor-pointer">
                                <div className={cn("w-10 h-6 rounded-full p-1 transition-colors duration-200", enableDeadline ? "bg-jade-500" : "bg-gray-300")}>
                                    <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200", enableDeadline ? "translate-x-4" : "translate-x-0")}></div>
                                </div>
                                <input type="checkbox" checked={enableDeadline} onChange={e => setEnableDeadline(e.target.checked)} className="hidden" />
                                <span className="flex items-center space-x-1">
                                    <Bell size={16} />
                                    <span>Set Final Deadline</span>
                                </span>
                            </label>
                        </div>

                        <AnimatePresence>
                            {enableDeadline && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-jade-50/50 rounded-lg p-4 border border-jade-100 space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-jade-800 mb-1">Notification Channel</label>
                                            <select
                                                value={deadlineChannelId}
                                                onChange={(e) => setDeadlineChannelId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                            >
                                                <option value="">Select a Discord Channel...</option>
                                                {channels.map(c => (
                                                    <option key={c.id} value={c.id}>#{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-jade-800 mb-2">
                                                Deadline Time - Click on the calendar above to set
                                            </label>
                                            <p className="text-xs text-jade-500 mb-2">
                                                {deadlineDate
                                                    ? `Selected: ${format(deadlineDate, 'EEE, MMM d h:mm a')}`
                                                    : 'Click on the time slots calendar above to set the deadline line.'
                                                }
                                            </p>
                                            {options.length > 0 && deadlineDate && (
                                                <p className="text-xs text-amber-600">
                                                    ⏱ Deadline is {formatDuration(Math.round((options[0].start_time.getTime() - deadlineDate.getTime()) / (1000 * 60)))} before {isRecurring ? 'each event' : 'the event starts'}.
                                                </p>
                                            )}
                                            {/* Secondary Scheduler for deadline selection */}
                                            <div className={cn("h-[300px] mt-2 rounded-lg transition-all duration-300", isInvalidDeadline ? "bg-red-50 ring-2 ring-red-400" : "")}>
                                                <WeeklyScheduler
                                                    events={schedulerEvents}
                                                    currentDate={currentSchedulerDate}
                                                    onDateChange={setCurrentSchedulerDate}
                                                    deadline={deadlineDate}
                                                    onDeadlineChange={(date) => {
                                                        // Validate: Deadline must be FUTURE
                                                        if (date <= new Date()) {
                                                            setIsInvalidDeadline(true);
                                                            setTimeout(() => setIsInvalidDeadline(false), 800);
                                                            return;
                                                        }

                                                        // Validate: Deadline must be BEFORE the first event
                                                        if (options.length > 0) {
                                                            // For recurring, we compare relative to the day/time if we were smart, 
                                                            // but actually the scheduler returns a specific date on the template week.
                                                            // The events on the template week are also specific dates.
                                                            // So simpler: just find the earliest event START time.
                                                            const sortedOptions = [...options].sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
                                                            const firstEventStart = sortedOptions[0].start_time;

                                                            if (date >= firstEventStart) {
                                                                // Visual feedback instead of alert
                                                                setIsInvalidDeadline(true);
                                                                setTimeout(() => setIsInvalidDeadline(false), 800);
                                                                return;
                                                            }
                                                        } else {
                                                            // If no events defined yet, maybe warn? Or allow.
                                                            // User should probably define times first. 
                                                            // But the UI puts deadline below times now, so likely times exist.
                                                            if (options.length === 0) {
                                                                alert("Please propose time slots first so we can validate the deadline.");
                                                                return;
                                                            }
                                                        }
                                                        setDeadlineDate(date);
                                                    }}
                                                    isReadOnly={false}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-jade-800 mb-1">Notification Message</label>
                                            <textarea
                                                value={deadlineMessage}
                                                onChange={(e) => setDeadlineMessage(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm h-20"
                                            />
                                        </div>

                                        <div>
                                            <MentionSelector
                                                label="Also mention:"
                                                selectedUserIds={deadlineMentions}
                                                onChange={setDeadlineMentions}
                                            />
                                            <p className="text-xs text-jade-500 mt-1">All voters will be automatically mentioned.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting || options.length === 0}
                            className="flex items-center space-x-2 bg-jade-600 text-white px-6 py-2.5 rounded-lg hover:bg-jade-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Create Poll</span>
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default PollCreate;
