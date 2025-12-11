import React from 'react';
import { format, startOfYear, eachMonthOfInterval, endOfYear, isBefore, startOfMonth, addYears, subYears } from 'date-fns';
import { parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    value?: number;
    hasMarker?: boolean;
}

interface YearViewProps {
    events: CalendarEvent[];
    currentDate: Date;
    onMonthSelect: (date: Date) => void;
    onYearChange?: (date: Date) => void;
    minDate?: Date;
}

const YearView: React.FC<YearViewProps> = ({ events, currentDate, onMonthSelect, onYearChange, minDate }) => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    // Calculate event density per day for the entire year
    const eventDensity = new Map<string, number>();
    events.forEach(evt => {
        const d = typeof evt.date === 'string' ? parseUTCDate(evt.date) : evt.date;
        const dateStr = format(d, 'yyyy-MM-dd');
        eventDensity.set(dateStr, (eventDensity.get(dateStr) || 0) + (evt.value || 1));
    });

    const getHeatmapColor = (count: number, isDisabled: boolean) => {
        if (isDisabled) return 'bg-gray-100';
        if (count === 0) return 'bg-transparent';
        if (count === 1) return 'bg-jade-200';
        if (count === 2) return 'bg-jade-400';
        return 'bg-jade-600';
    };

    const nextYear = () => {
        if (onYearChange) {
            onYearChange(addYears(currentDate, 1));
        }
    };

    const prevYear = () => {
        if (onYearChange) {
            const newDate = subYears(currentDate, 1);
            if (!minDate || !isBefore(endOfYear(newDate), minDate)) {
                onYearChange(newDate);
            }
        }
    };

    // Check if prev year is disabled
    const isPrevDisabled = minDate ? isBefore(endOfYear(subYears(currentDate, 1)), minDate) : false;

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-ink">{format(currentDate, 'yyyy')}</h2>
                {onYearChange && (
                    <div className="flex items-center space-x-1">
                        <button
                            type="button"
                            onClick={prevYear}
                            disabled={isPrevDisabled}
                            className={cn(
                                "p-1 rounded text-jade-600",
                                isPrevDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-jade-100"
                            )}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={nextYear}
                            className="p-1 hover:bg-jade-100 rounded text-jade-600"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {months.map(month => {
                    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                    const startDayOfWeek = new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 0=Sun

                    // We check if the whole month is in past? Or if the month contains valid dates.
                    // Simple check: if month start is before minDate's month start
                    let isMonthDisabled = false;
                    if (minDate && isBefore(month, startOfMonth(minDate))) {
                        // Strict check: if minDate is 15th, previous days are disabled. 
                        // But typically for year view selection we select the whole month.
                        // Let's just disable past months entirely for selection.
                        isMonthDisabled = true;
                    }

                    return (
                        <div
                            key={month.toString()}
                            onClick={() => !isMonthDisabled && onMonthSelect(month)}
                            className={cn(
                                "bg-white/40 p-3 rounded-lg border border-transparent transition-all",
                                isMonthDisabled ? "opacity-50 cursor-not-allowed grayscale" : "hover:border-jade-300 hover:shadow-md cursor-pointer"
                            )}
                        >
                            <h3 className="text-sm font-bold text-jade-800 mb-2">{format(month, 'MMMM')}</h3>
                            <div className="grid grid-cols-7 gap-1">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <div key={d} className="text-[10px] text-jade-400 text-center">{d}</div>
                                ))}
                                {/* Padding */}
                                {Array(startDayOfWeek).fill(null).map((_, i) => (
                                    <div key={`pad-${i}`} />
                                ))}
                                {/* Days */}
                                {Array(daysInMonth).fill(null).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = format(new Date(month.getFullYear(), month.getMonth(), day), 'yyyy-MM-dd');
                                    const count = eventDensity.get(dateStr) || 0;

                                    return (
                                        <div
                                            key={day}
                                            className={cn(
                                                "w-full pt-[100%] relative rounded-sm",
                                                getHeatmapColor(count, isMonthDisabled)
                                            )}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default YearView;
