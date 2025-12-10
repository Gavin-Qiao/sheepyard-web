import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isBefore, startOfDay, addMonths, subMonths } from 'date-fns';
import { parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight, ZoomOut } from 'lucide-react';

// Helper to ensure we treat strings as UTC for display
function parseUTCDate(dateString: string): Date {
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        return parseISO(dateString + 'Z');
    }
    return parseISO(dateString);
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export interface CalendarEvent {
    date: Date | string;
    value?: number; // Count/Weight for intensity
    hasMarker?: boolean; // Small dot
    color?: string; // Optional override color
}

interface MonthViewProps {
    events: CalendarEvent[];
    currentDate: Date;
    onDateSelect?: (date: Date) => void;
    onMonthChange?: (date: Date) => void;
    onYearChange?: (date: Date) => void;
    minDate?: Date; // If present, disable interaction for dates before this
}

const MonthView: React.FC<MonthViewProps> = ({ events, currentDate, onDateSelect, onMonthChange, onYearChange, minDate }) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = new Date();

    // Aggregates
    const eventsByDate = new Map<string, { count: number; hasMarker: boolean }>();

    events.forEach(evt => {
        const d = typeof evt.date === 'string' ? parseUTCDate(evt.date) : evt.date;
        const dateStr = format(d, 'yyyy-MM-dd');
        const existing = eventsByDate.get(dateStr) || { count: 0, hasMarker: false };

        eventsByDate.set(dateStr, {
            count: existing.count + (evt.value || 0),
            hasMarker: existing.hasMarker || !!evt.hasMarker || (!evt.value) // If no value but exists, implies marker
        });
    });

    // Max value for heatmapping
    let maxCount = 0;
    eventsByDate.forEach(val => {
        if (val.count > maxCount) maxCount = val.count;
    });

    const getIntensityClass = (count: number, isDisabled: boolean) => {
        if (isDisabled) return "bg-gray-50 text-gray-400";
        if (count === 0) return "bg-white hover:bg-jade-50";

        const ratio = maxCount > 0 ? count / maxCount : 0;
        if (ratio < 0.25) return "bg-jade-100 hover:bg-jade-200";
        if (ratio < 0.5) return "bg-jade-300 hover:bg-jade-400";
        if (ratio < 0.75) return "bg-jade-500 hover:bg-jade-600 text-white";
        return "bg-jade-700 hover:bg-jade-800 text-white";
    };

    const startDayOfWeek = getDay(monthStart); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);

    const handlePrevMonth = () => {
        if (onMonthChange) {
            onMonthChange(subMonths(currentDate, 1));
        }
    };

    const handleNextMonth = () => {
        if (onMonthChange) {
            onMonthChange(addMonths(currentDate, 1));
        }
    };

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-serif text-ink">{format(currentDate, 'MMMM yyyy')}</h3>

                <div className="flex items-center space-x-1">
                    {onYearChange && (
                        <button
                            onClick={() => onYearChange(currentDate)}
                            className="p-1 mr-1 text-jade-500 hover:text-jade-700 hover:bg-jade-100 rounded-full transition-colors"
                            title="Switch to Year View"
                        >
                            <ZoomOut size={20} />
                        </button>
                    )}
                    {onMonthChange && (
                        <>
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-jade-100 rounded text-jade-600" title="Previous Month">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-jade-100 rounded text-jade-600" title="Next Month">
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-jade-500 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}

                {paddingDays.map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}

                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const data = eventsByDate.get(dateStr) || { count: 0, hasMarker: false };
                    const isToday = isSameDay(day, today);

                    // Validation: check minDate
                    let isDisabled = false;
                    if (minDate && isBefore(day, startOfDay(minDate))) {
                        isDisabled = true;
                    }

                    return (
                        <div
                            key={dateStr}
                            onClick={() => !isDisabled && onDateSelect && onDateSelect(day)}
                            className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative border border-transparent select-none",
                                isDisabled ? "cursor-not-allowed bg-gray-50/50" : "cursor-pointer",
                                !isDisabled && getIntensityClass(data.count, false),
                                isToday && "border-jade-400 ring-1 ring-jade-400",
                                isDisabled && "opacity-50 grayscale"
                            )}
                            title={isDisabled ? "Past date" : `${data.count} items`}
                        >
                            <span className={cn(
                                "text-sm font-bold",
                                !isDisabled && data.count > 0 && maxCount > 0 && (data.count / maxCount) >= 0.5 ? "text-white" : "text-ink",
                                isDisabled && "text-gray-400"
                            )}>
                                {format(day, 'd')}
                            </span>

                            {data.hasMarker && data.count === 0 && (
                                <div className={cn("w-1.5 h-1.5 rounded-full mt-1", isDisabled ? "bg-gray-300" : "bg-jade-400")} />
                            )}
                            {data.count > 0 && (
                                <span className={cn("text-[10px]", !isDisabled && (data.count / maxCount) >= 0.5 ? "text-jade-100" : "text-jade-600", isDisabled && "text-gray-400")}>
                                    {data.count}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {maxCount > 0 && (
                <div className="flex items-center justify-end mt-4 text-xs text-jade-600 space-x-2">
                    <span>Less</span>
                    <div className="flex space-x-1">
                        <div className="w-4 h-4 rounded bg-jade-100"></div>
                        <div className="w-4 h-4 rounded bg-jade-300"></div>
                        <div className="w-4 h-4 rounded bg-jade-500"></div>
                        <div className="w-4 h-4 rounded bg-jade-700"></div>
                    </div>
                    <span>More</span>
                </div>
            )}
        </div>
    );
};

export default MonthView;
