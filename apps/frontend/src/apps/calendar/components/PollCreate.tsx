import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { Calendar, Clock, X, Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';

// Custom CSS wrapper for DatePicker to match aesthetic
import './datepicker-custom.css';

interface PollOptionInput {
  start_time: Date;
  end_time: Date;
}

const PollCreate: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState<PollOptionInput[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Temporary state for the date picker
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [startTime, setStartTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(9, 0, 0, 0);
        return d;
    });
    const [endTime, setEndTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(17, 0, 0, 0);
        return d;
    });

    const addOption = () => {
        if (!selectedDate) return;

        const start = new Date(selectedDate);
        start.setHours(startTime.getHours(), startTime.getMinutes());

        const end = new Date(selectedDate);
        end.setHours(endTime.getHours(), endTime.getMinutes());

        // Avoid duplicates (simple check)
        const exists = options.some(opt =>
            opt.start_time.getTime() === start.getTime() &&
            opt.end_time.getTime() === end.getTime()
        );

        if (!exists) {
            setOptions([...options, { start_time: start, end_time: end }].sort((a,b) => a.start_time.getTime() - b.start_time.getTime()));
        }
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || options.length === 0) return;

        setIsSubmitting(true);
        try {
            const payload = {
                title,
                description,
                options: options.map(opt => ({
                    label: format(opt.start_time, 'EEE, MMM d'), // Simple label
                    start_time: opt.start_time.toISOString(),
                    end_time: opt.end_time.toISOString()
                }))
            };

            const res = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create poll');

            navigate('../'); // Go back to list
        } catch (error) {
            console.error(error);
            alert('Failed to create poll. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
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

                    <div className="border-t border-jade-100 pt-6">
                        <label className="block text-sm font-medium text-jade-800 mb-4">Propose Times</label>

                        <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-jade-600 mb-1 block">Date</label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                    dateFormat="MMMM d, yyyy"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-jade-600 mb-1 block">Start</label>
                                <DatePicker
                                    selected={startTime}
                                    onChange={(date) => date && setStartTime(date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={30}
                                    dateFormat="h:mm aa"
                                    className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-jade-600 mb-1 block">End</label>
                                <DatePicker
                                    selected={endTime}
                                    onChange={(date) => date && setEndTime(date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={30}
                                    dateFormat="h:mm aa"
                                    className="w-full px-3 py-2 rounded-lg border border-jade-200 bg-white text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={addOption}
                                className="bg-jade-100 text-jade-700 px-4 py-2 rounded-lg hover:bg-jade-200 transition-colors font-medium text-sm h-[38px]"
                            >
                                Add
                            </button>
                        </div>

                        {/* Selected Options List */}
                        <div className="space-y-2 mt-4">
                            {options.length === 0 && (
                                <p className="text-sm text-jade-400 italic">No times added yet.</p>
                            )}
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-jade-50/50 px-3 py-2 rounded border border-jade-100">
                                    <div className="flex items-center space-x-3 text-sm text-ink">
                                        <Calendar size={14} className="text-jade-500" />
                                        <span className="font-medium">{format(opt.start_time, 'MMM d, yyyy')}</span>
                                        <span className="text-jade-400">|</span>
                                        <Clock size={14} className="text-jade-500" />
                                        <span>
                                            {format(opt.start_time, 'h:mm a')} - {format(opt.end_time, 'h:mm a')}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeOption(idx)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
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
