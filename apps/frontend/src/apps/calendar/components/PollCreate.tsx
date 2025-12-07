import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { Loader2, Save, Repeat, Bot, Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import ConfirmModal from './Modal';
import WeeklyScheduler, { SchedulerEvent } from './WeeklyScheduler';
import { MentionSelector } from './MentionSelector';
import './datepicker-custom.css';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

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
    const [deadlineOffset, setDeadlineOffset] = useState<number>(24); // Hours
    const [deadlineOffsetUnit, setDeadlineOffsetUnit] = useState<'hours' | 'days'>('hours');
    const [deadlineChannelId, setDeadlineChannelId] = useState<string>('');
    const [deadlineMessage, setDeadlineMessage] = useState('The deadline has passed! Here is the plan:');
    const [deadlineMentions, setDeadlineMentions] = useState<number[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);

    // Scheduler State
    const [currentSchedulerDate, setCurrentSchedulerDate] = useState(new Date());

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
                payload.deadline_channel_id = deadlineChannelId;
                payload.deadline_message = deadlineMessage;
                payload.deadline_mention_ids = deadlineMentions;

                if (isRecurring) {
                    // Calculate total minutes
                    const minutes = deadlineOffsetUnit === 'days' ? deadlineOffset * 24 * 60 : deadlineOffset * 60;
                    payload.deadline_offset_minutes = minutes;
                } else {
                    if (deadlineDate) {
                        payload.deadline_date = deadlineDate.toISOString();
                    } else {
                        // Default to now? or require it.
                        // Let's assume if null, we disable?
                        alert("Please select a deadline date.");
                        setIsSubmitting(false);
                        return;
                    }
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

                    {/* Deadline Toggle */}
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
                                            <label className="block text-sm font-medium text-jade-800 mb-1">Deadline Time</label>
                                            {isRecurring ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-jade-700">Notify</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={deadlineOffset}
                                                        onChange={(e) => setDeadlineOffset(parseInt(e.target.value))}
                                                        className="w-20 px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                                    />
                                                    <select
                                                        value={deadlineOffsetUnit}
                                                        onChange={(e) => setDeadlineOffsetUnit(e.target.value as any)}
                                                        className="px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                                    >
                                                        <option value="hours">Hours</option>
                                                        <option value="days">Days</option>
                                                    </select>
                                                    <span className="text-sm text-jade-700">before each event.</span>
                                                </div>
                                            ) : (
                                                 <DatePicker
                                                    selected={deadlineDate}
                                                    onChange={(date) => setDeadlineDate(date)}
                                                    showTimeSelect
                                                    dateFormat="MMM d, yyyy h:mm aa"
                                                    className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                                    placeholderText="Select deadline date & time"
                                                />
                                            )}
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

                    <div className="border-t border-jade-100 pt-6">
                        <label className="block text-sm font-medium text-jade-800 mb-4">
                            {isRecurring ? "Set Time Template (First Occurrence)" : "Propose Times"}
                        </label>
                        <p className="text-xs text-jade-500 mb-4">
                            Select a duration and click on the calendar to add time slots. Right-click to remove.
                        </p>

                        <div className="h-[500px]">
                            <WeeklyScheduler
                                events={schedulerEvents}
                                currentDate={currentSchedulerDate}
                                onDateChange={setCurrentSchedulerDate}
                                onAddEvent={handleAddEvent}
                                onRemoveEvent={handleRemoveEvent}
                                isEditable={true}
                            />
                        </div>

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
