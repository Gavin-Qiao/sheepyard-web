import React, { useEffect, useRef, useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, differenceInMinutes, startOfDay, addMinutes, setHours, setMinutes, isBefore } from 'date-fns';
import { parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Helper to ensure we treat strings as UTC for display
function parseUTCDate(dateString: string): Date {
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        return parseISO(dateString + 'Z');
    }
    return parseISO(dateString);
}

export interface SchedulerEvent {
    id: string | number;
    label?: string;
    start_time: string | Date; // Can be ISO string or Date object
    end_time: string | Date;
    color?: string;
    data?: any; // Extra data like votes
}

interface WeeklySchedulerProps {
    events: SchedulerEvent[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onAddEvent?: (start: Date, end: Date) => void;
    onRemoveEvent?: (eventId: string | number) => void;
    isEditable?: boolean; // If true, allows adding/removing
    isReadOnly?: boolean; // If true, no interactions at all
    deadline?: Date | null; // Deadline line to display
    onDeadlineChange?: (date: Date) => void; // Callback when deadline is clicked/set
    eventDuration?: number; // Duration in minutes for new events (default 30)
}

const WeeklyScheduler: React.FC<WeeklySchedulerProps> = ({
    events,
    currentDate,
    onDateChange,
    onAddEvent,
    onRemoveEvent,
    isEditable = false,
    isReadOnly = false,
    deadline,
    onDeadlineChange,
    eventDuration = 30
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hourHeight, setHourHeight] = useState(60);
    const [now, setNow] = useState(new Date());

    // Update 'now' every minute to keep visual accurate
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Calculate actual duration in minutes
    const getActualDuration = () => {
        return eventDuration;
    };

    // Calculate week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Scroll to 8am
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 8 * hourHeight;
        }
    }, []);

    // Zoom handler
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setHourHeight(prev => Math.max(30, Math.min(200, prev - e.deltaY * 0.1)));
            }
        };
        const container = containerRef.current;
        if (container) container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container?.removeEventListener('wheel', handleWheel);
    }, []);

    const getEventStyle = (evt: SchedulerEvent) => {
        const start = typeof evt.start_time === 'string' ? parseUTCDate(evt.start_time) : evt.start_time;
        const end = typeof evt.end_time === 'string' ? parseUTCDate(evt.end_time) : evt.end_time;

        const dayStart = startOfDay(start);
        const startMinutes = differenceInMinutes(start, dayStart);
        const durationMinutes = differenceInMinutes(end, start);

        return {
            top: `${(startMinutes / 60) * hourHeight}px`,
            height: `${(durationMinutes / 60) * hourHeight}px`,
            left: '2px',
            right: '2px'
        };
    };

    const handleGridClick = (day: Date, e: React.MouseEvent) => {
        if (isReadOnly) return;
        // If neither editable nor deadline mode, do nothing
        if (!isEditable && !onDeadlineChange) return;

        const offsetY = e.nativeEvent.offsetY;
        const clickedHour = Math.floor(offsetY / hourHeight);
        const clickedMinutes = Math.floor((offsetY % hourHeight) / (hourHeight / 2)) * 30; // Snap to 30m

        const clickedTime = setMinutes(setHours(day, clickedHour), clickedMinutes);

        // Prevent past clicks
        // Logic: Cannot create event in the past.
        // Also check if clickedTime + duration is in the past?
        // User said "Start time must be in the future".
        // Let's enforce start time > now.
        if (isBefore(clickedTime, new Date())) {
            // Maybe show a toast or shake? For now just ignore.
            return;
        }

        // Deadline mode: if onDeadlineChange is provided, prioritize it
        if (onDeadlineChange) {
            onDeadlineChange(clickedTime);
            return;
        }

        // Event add mode
        if (isEditable && onAddEvent) {
            const end = addMinutes(clickedTime, getActualDuration());
            onAddEvent(clickedTime, end);
        }
    };

    const handleRightClickEvent = (e: React.MouseEvent, eventId: string | number) => {
        if (!isEditable || isReadOnly) return;
        e.preventDefault();
        if (onRemoveEvent) onRemoveEvent(eventId);
    };

    // Filter events for this week
    const weekEvents = events.filter(evt => {
        const start = typeof evt.start_time === 'string' ? parseUTCDate(evt.start_time) : evt.start_time;
        return start >= weekStart && start < addDays(weekStart, 7);
    });

    return (
        <div className="flex flex-col h-full bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden select-none">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-jade-200 bg-jade-50/50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => onDateChange(addDays(currentDate, -7))} className="p-1.5 hover:bg-jade-100 rounded text-jade-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold text-ink w-32 text-center">
                            {format(currentDate, "'Week of' MMM d")}
                        </span>
                        <button onClick={() => onDateChange(addDays(currentDate, 7))} className="p-1.5 hover:bg-jade-100 rounded text-jade-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="text-xs font-bold text-jade-400">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
            </div>

            {/* Header Days */}
            <div className="flex border-b border-jade-200 bg-white">
                <div className="w-16 shrink-0 border-r border-jade-100"></div>
                {weekDays.map(day => (
                    <div key={day.toString()} className={cn(
                        "flex-1 text-center py-2 border-r border-jade-100 last:border-0",
                        isSameDay(day, new Date()) && "bg-jade-50"
                    )}>
                        <div className="text-xs font-bold text-jade-500 uppercase">{format(day, 'EEE')}</div>
                        <div className={cn("text-lg font-serif font-bold", isSameDay(day, new Date()) ? "text-jade-600" : "text-ink")}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-white relative">
                <div className="flex relative" style={{ height: hourHeight * 24 }}>
                    {/* Time Axis */}
                    <div className="w-16 shrink-0 border-r border-jade-100 bg-jade-50/20 text-xs text-jade-400 font-medium relative">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="absolute w-full text-center border-t border-jade-50" style={{ top: i * hourHeight, height: hourHeight }}>
                                <span className="-mt-2 block bg-white/50 px-1">{i}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Columns */}
                    {weekDays.map(day => {
                        const dayEvents = weekEvents.filter(evt => {
                            const start = typeof evt.start_time === 'string' ? parseUTCDate(evt.start_time) : evt.start_time;
                            return isSameDay(start, day);
                        });

                        // Visual contrast for past:
                        // If day is entirely before today (start of today), dim whole column.
                        // If day is today, dim only past hours.
                        // If day is future, normal.

                        // BUT "moment of creation is threshold".
                        // So for "today", we calculate the pixel height of "now".

                        let pastHeight = 0;
                        if (isBefore(day, startOfDay(now))) {
                            pastHeight = hourHeight * 24; // Full day
                        } else if (isSameDay(day, now)) {
                            const minutesSinceStart = differenceInMinutes(now, startOfDay(now));
                            pastHeight = (minutesSinceStart / 60) * hourHeight;
                        }

                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "flex-1 border-r border-jade-50 relative last:border-0 group/col",
                                    isEditable && !isReadOnly && "cursor-pointer hover:bg-jade-50/30"
                                )}
                                onClick={(e) => handleGridClick(day, e)}
                            >
                                {/* Grid Lines */}
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="border-t border-dotted border-jade-100 absolute w-full pointer-events-none" style={{ top: i * hourHeight }}></div>
                                ))}

                                {/* Past Overlay */}
                                <div
                                    className="absolute left-0 right-0 top-0 bg-gray-100/50 pointer-events-none z-10"
                                    style={{ height: `${pastHeight}px` }}
                                >
                                    {/* Optional diagonal lines or pattern to indicate 'disabled' elegantly?
                                        Solid semi-transparent gray is usually fine.
                                        User said "dim the background".
                                    */}
                                </div>

                                {/* Current Time Indicator (if today) */}
                                {isSameDay(day, now) && (
                                    <div
                                        className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none opacity-60"
                                        style={{ top: `${pastHeight}px` }}
                                    />
                                )}

                                {/* Events */}
                                {dayEvents.map(evt => (
                                    <div
                                        key={evt.id}
                                        style={getEventStyle(evt)}
                                        className={cn(
                                            "absolute rounded p-1 text-[10px] overflow-hidden hover:z-30 hover:shadow-md transition-all border select-none z-20", // Events above past overlay
                                            evt.color || "bg-jade-100 border-jade-300 text-jade-700"
                                        )}
                                        onClick={(e) => e.stopPropagation()} // Prevent triggering add
                                        onContextMenu={(e) => handleRightClickEvent(e, evt.id)}
                                        title={evt.label}
                                    >
                                        <div className="font-bold truncate opacity-90">
                                            {format(typeof evt.start_time === 'string' ? parseUTCDate(evt.start_time) : evt.start_time, 'HH:mm')}
                                        </div>
                                        <div className="truncate font-medium">{evt.label || '(No Label)'}</div>

                                        {/* Optional Delete Button overlay on hover for better UX than just right click */}
                                        {isEditable && (
                                            <div className="absolute top-0 right-0 p-1 opacity-0 hover:opacity-100 transition-opacity">
                                                {/* Using right click mainly as requested, but visual cue is good */}
                                            </div>
                                        )}
                                        {/* Display Votes Count if in data */}
                                        {evt.data?.votes && evt.data.votes.length > 0 && (
                                            <div className="absolute bottom-0 right-1 bg-jade-500 text-white text-[9px] px-1 rounded-full shadow-sm">
                                                {evt.data.votes.length}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Deadline Line (Per Day) */}
                                {deadline && isSameDay(day, deadline) && (
                                    <div
                                        className="absolute left-0 right-0 flex items-center pointer-events-none z-30"
                                        style={{ top: `${(differenceInMinutes(deadline, startOfDay(deadline)) / 60) * hourHeight}px` }}
                                    >
                                        <div className="w-full h-0.5 bg-red-500 shadow-sm" />
                                        <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow" />
                                        <div className="absolute left-1 -top-5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow whitespace-nowrap z-40">
                                            Deadline: {format(deadline, 'h:mm a')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}


                </div>
            </div>
        </div>
    );
};

export default WeeklyScheduler;
