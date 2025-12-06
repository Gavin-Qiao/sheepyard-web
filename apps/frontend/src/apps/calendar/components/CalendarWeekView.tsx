import React, { useEffect, useRef, useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
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
  creator?: User;
  options: PollOption[];
}

interface CalendarWeekViewProps {
    polls: Poll[];
    currentDate: Date;
    onDateSelect?: (date: Date) => void;
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({ polls, currentDate }) => {
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

    // Helper to calculate position
    const getEventStyle = (opt: PollOption) => {
        const start = parseISO(opt.start_time);
        const end = parseISO(opt.end_time);
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

    // Flatten all options from all polls
    const allOptions = polls.flatMap(poll =>
        poll.options.map(opt => ({ ...opt, poll }))
    );

    // Filter options for this week
    const weekOptions = allOptions.filter(opt => {
        const start = parseISO(opt.start_time);
        return start >= weekStart && start < addDays(weekStart, 7);
    });

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px] relative">
             {/* Header */}
             <div className="flex border-b border-jade-200 bg-jade-50/50">
                 <div className="w-16 shrink-0 border-r border-jade-200 p-2 text-xs font-bold text-jade-400 flex items-center justify-center">
                     GMT
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
                         const dayEvents = weekOptions.filter(opt => isSameDay(parseISO(opt.start_time), day));

                         return (
                             <div key={day.toString()} className="flex-1 border-r border-jade-50 relative last:border-0">
                                 {/* Grid Lines */}
                                 {Array.from({ length: 24 }).map((_, i) => (
                                     <div key={i} className="border-t border-dotted border-jade-100 absolute w-full" style={{ top: i * hourHeight }}></div>
                                 ))}

                                 {/* Events */}
                                 {dayEvents.map(opt => (
                                     <Link
                                        to={`${opt.poll.id}`}
                                        key={`${opt.poll.id}-${opt.id}`}
                                        style={getEventStyle(opt)}
                                        className="absolute bg-jade-100 border border-jade-300 rounded p-1 text-[10px] overflow-hidden hover:z-20 hover:shadow-md transition-all cursor-pointer group block"
                                        title={`${opt.poll.title}: ${opt.label}`}
                                     >
                                         <div className="font-bold text-jade-700 truncate">{format(parseISO(opt.start_time), 'HH:mm')}</div>
                                         <div className="text-jade-800 font-bold truncate">{opt.poll.title}</div>
                                         <div className="text-jade-500 truncate text-[9px]">by {opt.poll.creator?.display_name || opt.poll.creator?.username || 'Unknown'}</div>
                                     </Link>
                                 ))}
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
    );
};

export default CalendarWeekView;
