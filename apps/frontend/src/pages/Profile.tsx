import React, { useEffect, useState } from 'react';
import { addDays, addMonths, addWeeks, getDay } from 'date-fns';
import { Background } from '../components/Background';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, Calendar as CalendarIcon, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import WeeklyScheduler, { SchedulerEvent } from '../apps/calendar/components/WeeklyScheduler';
import { RecurrenceControls, RecurrenceType } from '../apps/calendar/components/RecurrenceControls';

import ShareModal from '../apps/calendar/components/ShareModal';
import { DurationSelector } from '../apps/calendar/components/DurationSelector';

interface User {
    id: number;
    discord_id: string;
    username: string;
    display_name?: string;
    avatar_url: string;
    guild_joined_at?: string;
}

interface UnavailabilityBlock {
    id: number;
    start_time: string;
    end_time: string;
}

// Day mapping for recurrence expansion
const DAY_MAP: Record<string, number> = {
    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
};

const Profile: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [blocks, setBlocks] = useState<UnavailabilityBlock[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Recurrence state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('WEEKLY');
    const [recurrenceEndMode, setRecurrenceEndMode] = useState<'DATE' | 'COUNT'>('COUNT');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
    const [customDays, setCustomDays] = useState<string[]>([]);

    // Share state
    const [shareModalOpen, setShareModalOpen] = useState(false);


    const [duration, setDuration] = useState(30);

    useEffect(() => {
        // Fetch User
        fetch('/api/users/me')
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then((data) => {
                setUser(data);
                setLoading(false);
            })
            .catch((e) => {
                console.error(e);
                setLoading(false);
            });

        // Fetch Unavailability
        fetchUnavailability();
    }, []);

    const fetchUnavailability = () => {
        fetch('/api/profile/unavailability')
            .then(res => res.json())
            .then(data => setBlocks(data))
            .catch(err => console.error(err));
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // Expand recurring pattern into individual dates
    const expandRecurringDates = (baseStart: Date, baseEnd: Date): { start: Date; end: Date }[] => {
        const dates: { start: Date; end: Date }[] = [];
        const duration = baseEnd.getTime() - baseStart.getTime();

        if (recurrenceType === 'DAILY') {
            const count = recurrenceEndMode === 'COUNT' ? recurrenceCount : 30;
            for (let i = 0; i < count; i++) {
                const start = addDays(baseStart, i);
                const end = new Date(start.getTime() + duration);
                if (recurrenceEndMode === 'DATE' && recurrenceEndDate && start > recurrenceEndDate) break;
                dates.push({ start, end });
            }
        } else if (recurrenceType === 'WEEKLY') {
            const count = recurrenceEndMode === 'COUNT' ? recurrenceCount : 12;
            for (let i = 0; i < count; i++) {
                const start = addWeeks(baseStart, i);
                const end = new Date(start.getTime() + duration);
                if (recurrenceEndMode === 'DATE' && recurrenceEndDate && start > recurrenceEndDate) break;
                dates.push({ start, end });
            }
        } else if (recurrenceType === 'MONTHLY') {
            const count = recurrenceEndMode === 'COUNT' ? recurrenceCount : 6;
            for (let i = 0; i < count; i++) {
                const start = addMonths(baseStart, i);
                const end = new Date(start.getTime() + duration);
                if (recurrenceEndMode === 'DATE' && recurrenceEndDate && start > recurrenceEndDate) break;
                dates.push({ start, end });
            }
        } else if (recurrenceType === 'CUSTOM' && customDays.length > 0) {
            // For custom days, find matching days of week within the count/date range
            const maxWeeks = recurrenceEndMode === 'COUNT' ? Math.ceil(recurrenceCount / customDays.length) + 1 : 52;
            let added = 0;
            const baseDayOfWeek = getDay(baseStart);

            for (let week = 0; week < maxWeeks && (recurrenceEndMode === 'COUNT' ? added < recurrenceCount : true); week++) {
                for (const day of customDays) {
                    const targetDay = DAY_MAP[day];
                    const dayOffset = (targetDay - baseDayOfWeek + 7) % 7;
                    const start = addDays(addWeeks(baseStart, week), dayOffset);
                    const end = new Date(start.getTime() + duration);

                    if (start < baseStart) continue;
                    if (recurrenceEndMode === 'DATE' && recurrenceEndDate && start > recurrenceEndDate) break;
                    if (recurrenceEndMode === 'COUNT' && added >= recurrenceCount) break;

                    dates.push({ start, end });
                    added++;
                }
            }
        }

        return dates;
    };

    const handleAddBlock = async (start: Date, end: Date) => {
        try {
            if (isRecurring && recurrenceType !== 'AI') {
                // Create multiple blocks for recurring
                const expandedDates = expandRecurringDates(start, end);

                for (const { start: s, end: e } of expandedDates) {
                    await fetch('/api/profile/unavailability', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start_time: s.toISOString(),
                            end_time: e.toISOString()
                        })
                    });
                }
                fetchUnavailability();
            } else {
                // Single block
                const res = await fetch('/api/profile/unavailability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        start_time: start.toISOString(),
                        end_time: end.toISOString()
                    })
                });
                if (res.ok) {
                    fetchUnavailability();
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveBlock = async (eventId: string | number) => {
        try {
            const res = await fetch(`/api/profile/unavailability/${eventId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setBlocks(prev => prev.filter(b => b.id !== Number(eventId)));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center">
                <div className="text-[#84A695] animate-pulse font-serif tracking-widest">LOADING PROFILE...</div>
            </div>
        );
    }

    // Convert blocks to SchedulerEvents
    const schedulerEvents: SchedulerEvent[] = blocks.map(b => ({
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        label: 'Unavailable',
        color: 'bg-stone-200 border-stone-300 text-stone-700'
    }));

    return (
        <Background>
            <div className="min-h-screen w-full p-8 md:p-12 overflow-y-auto">

                {/* Header */}
                <header className="flex items-center justify-between mb-12 max-w-6xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="text-jade-600 hover:text-jade-800 transition-colors p-2 rounded-full hover:bg-jade-50">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-3xl font-light text-ink font-serif">Your Profile</h1>
                    </div>
                    <button onClick={handleLogout} className="flex items-center space-x-2 text-red-400 hover:text-red-500 transition-colors px-4 py-2 hover:bg-red-50 rounded-lg">
                        <LogOut size={18} />
                        <span className="font-sans text-sm font-medium">Log Out</span>
                    </button>
                </header>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* User Info Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="col-span-1 h-fit bg-white/60 backdrop-blur-md border border-jade-100 rounded-xl p-6 shadow-sm flex flex-col items-center text-center"
                    >
                        <div className="relative mb-4">
                            <img
                                src={user?.avatar_url}
                                alt={user?.username}
                                className="w-24 h-24 rounded-full border-4 border-white shadow-md"
                            />
                            <div className="absolute bottom-0 right-0 bg-jade-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <h2 className="text-xl font-serif text-ink font-bold mb-1">{user?.display_name || user?.username}</h2>
                        <p className="text-sm text-jade-600 mb-6 font-mono bg-jade-50 px-3 py-1 rounded-full">@{user?.username}</p>

                        <div className="w-full border-t border-jade-100 pt-6 text-left space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-jade-800/60">Discord ID</span>
                                <span className="text-ink font-mono text-xs">{user?.discord_id}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-jade-800/60">Member Since</span>
                                <span className="text-ink">
                                    {user?.guild_joined_at
                                        ? new Date(user.guild_joined_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })
                                        : 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Unavailability Scheduler */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="col-span-1 lg:col-span-2 space-y-6"
                    >
                        <div className="bg-white/60 backdrop-blur-md border border-jade-100 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-stone-100 p-2 rounded-lg text-stone-600">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-serif text-ink">Availability & Schedule</h3>
                                        <p className="text-sm text-jade-600">Mark times when you are busy or unavailable.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShareModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-jade-700 bg-jade-50 hover:bg-jade-100 rounded-lg transition-colors border border-jade-200"
                                >
                                    <Share2 size={16} />
                                    Share
                                </button>
                            </div>

                            {/* Recurrence Controls */}
                            <RecurrenceControls
                                isRecurring={isRecurring}
                                onRecurringChange={setIsRecurring}
                                recurrenceType={recurrenceType}
                                onTypeChange={setRecurrenceType}
                                recurrenceEndMode={recurrenceEndMode}
                                onEndModeChange={setRecurrenceEndMode}
                                recurrenceEndDate={recurrenceEndDate}
                                onEndDateChange={setRecurrenceEndDate}
                                recurrenceCount={recurrenceCount}
                                onCountChange={setRecurrenceCount}
                                customDays={customDays}
                                onCustomDaysChange={setCustomDays}
                                showAIOption={false}
                                label="Recurring Unavailability"
                                radioGroupName="profileEndMode"
                            />

                            <div className="flex justify-end mt-4">
                                <DurationSelector duration={duration} onChange={setDuration} />
                            </div>

                            <div className="mt-4 flex items-start space-x-2 text-xs text-jade-500 bg-jade-50 p-3 rounded-lg border border-jade-100">
                                <div className="mt-0.5">ℹ️</div>
                                <p>
                                    Click on the calendar to create a block. Right-click a block to remove it.
                                    {isRecurring && ` Recurring mode active: ${recurrenceCount} ${recurrenceType.toLowerCase()} occurrences will be created.`}
                                </p>
                            </div>

                            <div className="h-[500px] mt-2">
                                <WeeklyScheduler
                                    events={schedulerEvents}
                                    currentDate={currentDate}
                                    onDateChange={setCurrentDate}
                                    onAddEvent={handleAddBlock}
                                    onRemoveEvent={handleRemoveBlock}
                                    isEditable={true}
                                    eventDuration={duration}
                                />
                            </div>


                        </div>
                    </motion.div>

                </div>
            </div>

            {/* Share Modal - Reusing poll share modal with dummy poll data */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                pollId={0}
                pollTitle={`${user?.display_name || user?.username}'s Availability`}
            />
        </Background>
    );
};

export default Profile;
