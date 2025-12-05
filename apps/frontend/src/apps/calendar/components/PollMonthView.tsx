import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
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

interface PollMonthViewProps {
    options: PollOption[];
    currentDate: Date;
    onDateSelect?: (date: Date) => void;
}

const PollMonthView: React.FC<PollMonthViewProps> = ({ options, currentDate, onDateSelect }) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = new Date();

    // Map: 'yyyy-MM-dd' -> total votes
    const votesByDate = new Map<string, number>();

    // Also track if there is an event on that day
    const eventsByDate = new Set<string>();

    options.forEach(opt => {
        const dateStr = format(parseISO(opt.start_time), 'yyyy-MM-dd');
        const count = opt.votes ? opt.votes.length : 0;
        votesByDate.set(dateStr, (votesByDate.get(dateStr) || 0) + count);
        eventsByDate.add(dateStr);
    });

    // Determine max votes for scaling intensity
    let maxVotes = 0;
    votesByDate.forEach(count => {
        if (count > maxVotes) maxVotes = count;
    });

    // Helper for color intensity
    const getIntensityClass = (count: number) => {
        if (count === 0) return "bg-white hover:bg-jade-50";
        // Simple relative scale
        const ratio = maxVotes > 0 ? count / maxVotes : 0;
        if (ratio < 0.25) return "bg-jade-100 hover:bg-jade-200";
        if (ratio < 0.5) return "bg-jade-300 hover:bg-jade-400";
        if (ratio < 0.75) return "bg-jade-500 hover:bg-jade-600 text-white";
        return "bg-jade-700 hover:bg-jade-800 text-white";
    };

    const startDayOfWeek = getDay(monthStart); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);

    return (
        <div className="bg-white/60 backdrop-blur-md border border-jade-200 rounded-xl shadow-sm overflow-hidden p-6">
            <h3 className="text-xl font-serif text-ink mb-4">{format(currentDate, 'MMMM yyyy')}</h3>

            <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-jade-500 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}

                {paddingDays.map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}

                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const voteCount = votesByDate.get(dateStr) || 0;
                    const hasEvent = eventsByDate.has(dateStr);
                    const isToday = isSameDay(day, today);

                    return (
                        <div
                            key={dateStr}
                            onClick={() => onDateSelect && onDateSelect(day)}
                            className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all relative border border-transparent",
                                getIntensityClass(voteCount),
                                isToday && "border-jade-400 ring-1 ring-jade-400"
                            )}
                            title={`${voteCount} votes`}
                        >
                            <span className={cn("text-sm font-bold", voteCount > 0 && maxVotes > 0 && (voteCount/maxVotes) >= 0.5 ? "text-white" : "text-ink")}>
                                {format(day, 'd')}
                            </span>

                            {hasEvent && voteCount === 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-jade-400 mt-1" />
                            )}
                            {voteCount > 0 && (
                                <span className={cn("text-[10px]", (voteCount/maxVotes) >= 0.5 ? "text-jade-100" : "text-jade-600")}>
                                    {voteCount} votes
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

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
        </div>
    );
};

export default PollMonthView;
