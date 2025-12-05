import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

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
  description?: string;
  creator_id: number;
  created_at: string;
  options: PollOption[];
}

interface CalendarMonthViewProps {
    polls: Poll[];
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({ polls }) => {
    // Current date for initial view. For a robust app, we might want to navigate months.
    // For now, let's assume we show the current month or maybe the month of the latest poll?
    // Let's stick to current system month.
    const today = new Date();
    const [currentDate, setCurrentDate] = React.useState(today);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start of month
    const startDayOfWeek = monthStart.getDay(); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);

    // Group Polls by Date
    // A poll appears on a date if it has an option on that date.
    // We want to list unique polls per day.
    const eventsByDate = new Map<string, Poll[]>();

    polls.forEach(poll => {
        poll.options.forEach(opt => {
            const dateStr = format(parseISO(opt.start_time), 'yyyy-MM-dd');
            if (!eventsByDate.has(dateStr)) {
                eventsByDate.set(dateStr, []);
            }
            const existing = eventsByDate.get(dateStr)!;
            if (!existing.some(p => p.id === poll.id)) {
                existing.push(poll);
            }
        });
    });

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif text-ink">{format(currentDate, 'MMMM yyyy')}</h2>
                <div className="flex space-x-2">
                    <button onClick={prevMonth} className="p-1 hover:bg-jade-100 rounded text-jade-600">Prev</button>
                    <button onClick={nextMonth} className="p-1 hover:bg-jade-100 rounded text-jade-600">Next</button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-jade-100 border border-jade-100 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-jade-50/50 p-2 text-center text-xs font-bold text-jade-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}

                {paddingDays.map((_, i) => (
                     <div key={`pad-${i}`} className="bg-white/30 h-32" />
                ))}

                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dateStr) || [];
                    const isToday = isSameDay(day, today);

                    return (
                        <div key={dateStr} className={cn("bg-white h-32 p-2 flex flex-col group hover:bg-white/80 transition-colors", isToday && "bg-jade-50/30")}>
                            <span className={cn(
                                "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                isToday ? "bg-jade-500 text-white" : "text-jade-700"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {dayEvents.map(poll => (
                                    <Link to={`${poll.id}`} key={poll.id} className="block text-xs bg-jade-100/50 text-jade-800 p-1 rounded hover:bg-jade-200 transition-colors truncate border-l-2 border-jade-400">
                                        {poll.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarMonthView;
