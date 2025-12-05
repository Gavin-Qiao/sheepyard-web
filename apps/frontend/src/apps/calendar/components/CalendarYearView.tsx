import React, { useState } from 'react';
import { format, startOfYear, eachMonthOfInterval, endOfYear, getMonth } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PollOption {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
}

interface Poll {
  id: number;
  title: string;
  options: PollOption[];
}

interface CalendarYearViewProps {
    polls: Poll[];
    onMonthSelect: (date: Date) => void;
    currentDate: Date;
}

const CalendarYearView: React.FC<CalendarYearViewProps> = ({ polls, onMonthSelect, currentDate }) => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    // Calculate event density per day for the entire year
    // Map: 'yyyy-MM-dd' -> count
    const eventDensity = new Map<string, number>();
    polls.forEach(poll => {
        poll.options.forEach(opt => {
            // Only count if option has start time
            if(opt.start_time) {
                const dateStr = format(new Date(opt.start_time), 'yyyy-MM-dd');
                eventDensity.set(dateStr, (eventDensity.get(dateStr) || 0) + 1);
            }
        });
    });

    const getHeatmapColor = (count: number) => {
        if (count === 0) return 'bg-transparent';
        if (count === 1) return 'bg-jade-200';
        if (count === 2) return 'bg-jade-400';
        return 'bg-jade-600';
    };

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif text-ink">{format(currentDate, 'yyyy')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {months.map(month => {
                    const monthStart = month;
                    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                    const startDayOfWeek = new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 0=Sun

                    return (
                        <div
                            key={month.toString()}
                            onClick={() => onMonthSelect(month)}
                            className="bg-white/40 p-3 rounded-lg border border-transparent hover:border-jade-300 hover:shadow-md cursor-pointer transition-all"
                        >
                            <h3 className="text-sm font-bold text-jade-800 mb-2">{format(month, 'MMMM')}</h3>
                            <div className="grid grid-cols-7 gap-1">
                                {['S','M','T','W','T','F','S'].map(d => (
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
                                                getHeatmapColor(count)
                                            )}
                                        >
                                           {/* Optional: Show day number if space permits, but for heatmap usually just color.
                                               Let's hide number for cleaner heatmap look or make it very small.
                                           */}
                                        </div>
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

export default CalendarYearView;
