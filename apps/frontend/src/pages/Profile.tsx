import React, { useEffect, useState } from 'react';
import { Background } from '../components/Background';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import WeeklyScheduler, { SchedulerEvent } from '../apps/calendar/components/WeeklyScheduler';
import { parseISO } from 'date-fns';

interface User {
  id: number;
  discord_id: string;
  username: string;
  display_name?: string;
  avatar_url: string;
}

interface UnavailabilityBlock {
    id: number;
    start_time: string;
    end_time: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<UnavailabilityBlock[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const handleAddBlock = async (start: Date, end: Date) => {
      try {
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
      start_time: parseISO(b.start_time),
      end_time: parseISO(b.end_time),
      label: 'Unavailable',
      color: 'bg-stone-200 border-stone-300 text-stone-700' // Using a muted stone/gray color
  }));

  return (
    <Background>
      <div className="min-h-screen w-full p-8 md:p-12 overflow-y-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-12 max-w-5xl mx-auto">
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

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

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
                         <span className="text-ink">Today</span>
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
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-stone-100 p-2 rounded-lg text-stone-600">
                             <CalendarIcon size={20} />
                        </div>
                        <div>
                             <h3 className="text-lg font-serif text-ink">Availability & Schedule</h3>
                             <p className="text-sm text-jade-600">Mark times when you are busy or unavailable.</p>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <WeeklyScheduler
                            events={schedulerEvents}
                            currentDate={currentDate}
                            onDateChange={setCurrentDate}
                            onAddEvent={handleAddBlock}
                            onRemoveEvent={handleRemoveBlock}
                            isEditable={true}
                        />
                    </div>

                    <div className="mt-4 flex items-start space-x-2 text-xs text-jade-500 bg-jade-50 p-3 rounded-lg border border-jade-100">
                        <div className="mt-0.5">ℹ️</div>
                        <p>
                            These blocks indicate when you are busy. Click and drag to create a block. Right-click a block to remove it.
                            Currently, this information is private and only visible to you.
                        </p>
                    </div>
                 </div>
            </motion.div>

        </div>
      </div>
    </Background>
  );
};

export default Profile;
