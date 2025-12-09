import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Repeat, Bot } from 'lucide-react';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'AI';

export interface RecurrenceControlsProps {
    isRecurring: boolean;
    onRecurringChange: (value: boolean) => void;
    recurrenceType: RecurrenceType;
    onTypeChange: (type: RecurrenceType) => void;
    recurrenceEndMode: 'DATE' | 'COUNT';
    onEndModeChange: (mode: 'DATE' | 'COUNT') => void;
    recurrenceEndDate: Date | null;
    onEndDateChange: (date: Date | null) => void;
    recurrenceCount: number;
    onCountChange: (count: number) => void;
    customDays: string[];
    onCustomDaysChange: (days: string[]) => void;
    showAIOption?: boolean;
    label?: string;
    radioGroupName?: string;
}

export const RecurrenceControls: React.FC<RecurrenceControlsProps> = ({
    isRecurring,
    onRecurringChange,
    recurrenceType,
    onTypeChange,
    recurrenceEndMode,
    onEndModeChange,
    recurrenceEndDate,
    onEndDateChange,
    recurrenceCount,
    onCountChange,
    customDays,
    onCustomDaysChange,
    showAIOption = true,
    label = "Recurring Event",
    radioGroupName = "endMode"
}) => {
    const toggleCustomDay = (day: string) => {
        if (customDays.includes(day)) {
            onCustomDaysChange(customDays.filter(d => d !== day));
        } else {
            onCustomDaysChange([...customDays, day]);
        }
    };

    const frequencyOptions: RecurrenceType[] = showAIOption
        ? ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']
        : ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

    return (
        <div className="border-t border-jade-100 pt-4">
            {/* Toggle */}
            <div className="flex items-center justify-between mb-4">
                <label className="flex items-center space-x-2 text-sm font-medium text-jade-800 cursor-pointer">
                    <div className={cn("w-10 h-6 rounded-full p-1 transition-colors duration-200", isRecurring ? "bg-jade-500" : "bg-gray-300")}>
                        <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200", isRecurring ? "translate-x-4" : "translate-x-0")}></div>
                    </div>
                    <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={e => onRecurringChange(e.target.checked)}
                        className="hidden"
                    />
                    <span className="flex items-center space-x-1">
                        <Repeat size={16} />
                        <span>{label}</span>
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
                            {/* Frequency */}
                            <div>
                                <label className="text-xs font-bold text-jade-600 uppercase tracking-wider mb-2 block">Frequency</label>
                                <div className="flex flex-wrap gap-2">
                                    {frequencyOptions.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => onTypeChange(type)}
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
                                    {showAIOption && (
                                        <button
                                            type="button"
                                            onClick={() => onTypeChange('AI')}
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
                                    )}
                                </div>
                            </div>

                            {/* AI Notice */}
                            {recurrenceType === 'AI' && (
                                <div className="text-xs text-jade-600 italic bg-jade-100 p-2 rounded">
                                    AI Auto-Schedule is currently under construction. Please check back later!
                                </div>
                            )}

                            {/* Custom Days */}
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

                            {/* End Mode */}
                            {recurrenceType !== 'AI' && (
                                <div className="flex items-end gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-jade-600 uppercase tracking-wider mb-2 block">Ends</label>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2 text-sm text-ink cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={radioGroupName}
                                                    checked={recurrenceEndMode === 'DATE'}
                                                    onChange={() => onEndModeChange('DATE')}
                                                    className="text-jade-600 focus:ring-jade-500"
                                                />
                                                <span>On Date</span>
                                            </label>
                                            <label className="flex items-center space-x-2 text-sm text-ink cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={radioGroupName}
                                                    checked={recurrenceEndMode === 'COUNT'}
                                                    onChange={() => onEndModeChange('COUNT')}
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
                                                onChange={(date) => onEndDateChange(date)}
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
                                                    onChange={(e) => onCountChange(parseInt(e.target.value) || 1)}
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
    );
};

export default RecurrenceControls;
