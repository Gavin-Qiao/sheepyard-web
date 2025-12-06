import React, { useEffect, useRef, useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, differenceInMinutes, startOfDay } from 'date-fns';
import { parseUTCDate } from '../../../utils/dateUtils';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Vote {
    poll_option_id: number;
}

interface PollOption {
    id: number;
    label: string;
    start_time: string;
    end_time: string;
    votes: Vote[];
}

interface PollWeekViewProps {
    options: PollOption[];
    currentDate: Date; // The "focus" date, usually selects the week containing this date
}

const PollWeekView: React.FC<PollWeekViewProps> = ({ options, currentDate }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hourHeight, setHourHeight] = useState(60); // px per hour

    // Calculate week start (Sunday)
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Handle Zoom
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setHourHeight(prev => {
                    const next = prev - e.deltaY * 0.1;
                    return Math.max(30, Math.min(200, next));
                });
            }
        };
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Auto-scroll to 8am on mount
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 8 * hourHeight;
        }
    }, [hourHeight]); // Re-adjust if zoom changes, though simpler to just do on mount. But dynamic zoom might need re-centering? Let's just do it on mount/hourHeight change so it stays consistent.

    // Helper to calculate position
    const getEventStyle = (opt: PollOption) => {
        const start = parseUTCDate(opt.start_time);
        const end = parseUTCDate(opt.end_time);
        const dayStart = startOfDay(start);

        const startMinutes = differenceInMinutes(start, dayStart);
        const durationMinutes = differenceInMinutes(end, start);

        const top = (startMinutes / 60) * hourHeight;
        const height = (durationMinutes / 60) * hourHeight;

        return {
            top: `${top}px`,
            height: `${height}px`,
            left: '2px',
            right: '2px'
        };
    };

    // Filter options for this week
    const weekOptions = options.filter(opt => {
        const start = parseUTCDate(opt.start_time);
        return start >= weekStart && start < addDays(weekStart, 7);
    });

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="flex border-b border-jade-200 bg-jade-50/50">
                <div className="w-16 shrink-0 border-r border-jade-200 p-2 text-xs font-bold text-jade-400 flex items-center justify-center break-words text-center leading-tight">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] || 'Local'}
                </div>
                {weekDays.map(day => (
                    <div key={day.toString()} className={cn(
                        "flex-1 text-center py-2 border-r border-jade-100 last:border-0",
                        isSameDay(day, new Date()) && "bg-jade-100/50"
                    )}>
                        <div className="text-xs font-bold text-jade-500 uppercase">{format(day, 'EEE')}</div>
                        <div className={cn("text-lg font-serif font-bold", isSameDay(day, new Date()) ? "text-jade-600" : "text-ink")}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Scrollable Grid */}
            <div ref={containerRef} className="flex-1 overflow-y-auto relative custom-scrollbar bg-white">
                <div className="flex relative" style={{ height: hourHeight * 24 }}>
                    {/* Time Axis */}
                    <div className="w-16 shrink-0 border-r border-jade-100 bg-jade-50/20 text-xs text-jade-400 font-medium relative">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="absolute w-full text-center border-t border-jade-50" style={{ top: i * hourHeight, height: hourHeight }}>
                                <span className="-mt-2 block bg-white/50 px-1">{i}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {weekDays.map(day => {
                        // Find events for this day
                        const dayEvents = weekOptions.filter(opt => isSameDay(parseUTCDate(opt.start_time), day));

                        return (
                            <div key={day.toString()} className="flex-1 border-r border-jade-50 relative last:border-0">
                                {/* Grid Lines */}
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="border-t border-dotted border-jade-100 absolute w-full" style={{ top: i * hourHeight }}></div>
                                ))}

                                {/* Events */}
                                {dayEvents.map(opt => (
                                    <div
                                        key={opt.id}
                                        style={getEventStyle(opt)}
                                        className="absolute bg-jade-100 border border-jade-300 rounded p-1 text-[10px] overflow-hidden hover:z-10 hover:shadow-md transition-all cursor-pointer group"
                                        title={`${opt.label} (${opt.votes.length} votes)`}
                                    >
                                        <div className="font-bold text-jade-700 truncate">{format(parseUTCDate(opt.start_time), 'HH:mm')}</div>
                                        <div className="text-jade-600 truncate">{opt.label}</div>
                                        {opt.votes.length > 0 && (
                                            <div className="absolute bottom-0 right-1 bg-jade-500 text-white text-[9px] px-1 rounded-full">
                                                {opt.votes.length}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PollWeekView;
