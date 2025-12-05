import React, { useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';
import { ZoomOut, User as UserIcon } from 'lucide-react';
import CalendarYearView from './CalendarYearView';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface Vote {
  poll_option_id: number;
  user: User;
}

interface PollOption {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  votes?: Vote[];
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  creator?: User;
  creator_id: number;
  created_at: string;
  options: PollOption[];
}

interface CalendarMonthViewProps {
    polls: Poll[];
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({ polls }) => {
    const today = new Date();
    const [currentDate, setCurrentDate] = React.useState(today);
    const [viewMode, setViewMode] = React.useState<'month' | 'year'>('month');

    // Handle initial wheel event for zoom out
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
             if (e.ctrlKey && e.deltaY > 0 && viewMode === 'month') {
                 setViewMode('year');
             }
        };
        // We might want to attach this to a specific container reference instead of window
        // But for global feel:
        window.addEventListener('wheel', handleWheel);
        return () => window.removeEventListener('wheel', handleWheel);
    }, [viewMode]);

    if (viewMode === 'year') {
        return (
            <div className="relative">
                <CalendarYearView
                    polls={polls}
                    currentDate={currentDate}
                    onMonthSelect={(date) => {
                        setCurrentDate(date);
                        setViewMode('month');
                    }}
                />
            </div>
        );
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start of month
    const startDayOfWeek = monthStart.getDay(); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);

    // Group PollOptions by Date (NOT just polls)
    // We want to show specific events (options) on the calendar.
    // Map: 'yyyy-MM-dd' -> Array<{ poll: Poll, option: PollOption }>
    const eventsByDate = new Map<string, Array<{ poll: Poll, option: PollOption }>>();

    polls.forEach(poll => {
        poll.options.forEach(opt => {
            const dateStr = format(parseISO(opt.start_time), 'yyyy-MM-dd');
            if (!eventsByDate.has(dateStr)) {
                eventsByDate.set(dateStr, []);
            }
            eventsByDate.get(dateStr)!.push({ poll, option: opt });
        });
    });

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden p-6 relative">
             <button
                onClick={() => setViewMode('year')}
                className="absolute top-6 right-24 p-2 text-jade-500 hover:text-jade-700 hover:bg-jade-100 rounded-full transition-colors"
                title="Zoom Out to Year View"
            >
                <ZoomOut size={20} />
            </button>

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
                        <div key={dateStr} className={cn("bg-white h-32 p-1 flex flex-col group hover:bg-white/80 transition-colors", isToday && "bg-jade-50/30")}>
                            <span className={cn(
                                "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1 ml-auto",
                                isToday ? "bg-jade-500 text-white" : "text-jade-400"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {dayEvents.map(({ poll, option }, idx) => {
                                    // Collect unique voters for this option
                                    // The backend structure for list polls might not include votes if I didn't verify it.
                                    // I verified that I updated PollService to include votes.
                                    // However, I need to make sure the Frontend Poll interface matches the response.
                                    // The `Poll` interface above has `options: PollOption[]`. `PollOption` has `votes`.

                                    const voters = option.votes?.map(v => v.user) || [];
                                    const creator = poll.creator;

                                    return (
                                        <Link
                                            to={`${poll.id}`}
                                            key={`${poll.id}-${option.id}`}
                                            className="block text-[10px] bg-jade-50 border border-jade-100 p-1 rounded hover:bg-jade-100 transition-colors"
                                        >
                                            <div className="font-bold text-jade-800 truncate mb-1">{poll.title}</div>
                                            <div className="flex items-center -space-x-1.5 overflow-hidden pb-0.5">
                                                {/* Creator Icon */}
                                                {creator && (
                                                    <div className="relative z-20" title={`Creator: ${creator.display_name || creator.username}`}>
                                                        {creator.avatar_url ? (
                                                            <img src={creator.avatar_url} className="w-4 h-4 rounded-full ring-1 ring-white" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-jade-600 text-white flex items-center justify-center text-[8px] ring-1 ring-white">
                                                                {creator.username[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Voter Icons */}
                                                {voters.map((voter, i) => (
                                                    <div key={i} className="relative z-10" title={`Voter: ${voter.display_name || voter.username}`}>
                                                        {voter.avatar_url ? (
                                                             <img src={voter.avatar_url} className="w-4 h-4 rounded-full ring-1 ring-white" />
                                                        ) : (
                                                             <div className="w-4 h-4 rounded-full bg-jade-300 text-jade-800 flex items-center justify-center text-[8px] ring-1 ring-white">
                                                                {voter.username[0].toUpperCase()}
                                                             </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {voters.length === 0 && !creator && <span className="text-jade-300 italic">No participants</span>}
                                            </div>
                                        </Link>
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

export default CalendarMonthView;
