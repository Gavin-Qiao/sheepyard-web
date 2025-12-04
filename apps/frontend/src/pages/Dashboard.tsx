import React from 'react';
import { Background } from '../components/Background';
import { motion } from 'framer-motion';
import { Hammer, LogOut, LayoutGrid, User as UserIcon } from 'lucide-react';

interface User {
  id: number;
  discord_id: string;
  username: string;
  display_name?: string;
  avatar_url: string;
}

interface DashboardProps {
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {

  const handleLogout = async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        // After logout, redirect to login page (which happens automatically if we reload or navigate)
        window.location.href = '/login';
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };

  return (
    <Background>
      <div className="flex h-screen w-full flex-col md:flex-row">

        {/* Sidebar / Navigation */}
        <motion.aside
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-64 bg-white/30 backdrop-blur-md border-b md:border-b-0 md:border-r border-jade-100 flex flex-col justify-between p-6 z-20"
        >
            <div>
                <div className="flex items-center space-x-3 mb-10 text-ink">
                    <div className="w-8 h-8 rounded-full bg-jade-400 flex items-center justify-center text-paper font-serif font-bold">
                        S
                    </div>
                    <span className="font-serif text-xl tracking-widest">SHEEPYARD</span>
                </div>

                <nav className="space-y-4">
                    <div className="flex items-center space-x-3 text-jade-800 bg-jade-50 px-4 py-2 rounded-lg cursor-pointer">
                        <LayoutGrid size={18} />
                        <span className="font-sans text-sm tracking-wide">Dashboard</span>
                    </div>
                    {/* Placeholder for future links */}
                    <div className="flex items-center space-x-3 text-jade-600/60 px-4 py-2 rounded-lg cursor-not-allowed">
                        <UserIcon size={18} />
                        <span className="font-sans text-sm tracking-wide">Profile</span>
                    </div>
                </nav>
            </div>

            {user && (
                <div className="flex items-center space-x-3 pt-6 border-t border-jade-100/50">
                    <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full border-2 border-jade-200"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{user.display_name || user.username}</p>
                        <p className="text-xs text-jade-600 truncate">#{user.discord_id.slice(-4)}</p>
                    </div>
                    <button onClick={handleLogout} className="text-jade-400 hover:text-red-400 transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            )}
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
            <header className="mb-12">
                <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-3xl font-light text-ink font-serif mb-2"
                >
                    Welcome back, {user?.display_name || user?.username || 'Traveler'}.
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-jade-600 font-sans text-sm"
                >
                    The pasture is quiet today.
                </motion.p>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Under Construction Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="col-span-1 min-h-[200px] border border-jade-200 bg-white/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center text-center hover:shadow-lg hover:shadow-jade-100/50 transition-all duration-500 cursor-default group"
                >
                    <div className="bg-jade-50 p-4 rounded-full mb-4 group-hover:bg-jade-100 transition-colors duration-500">
                        <Hammer className="text-jade-500 w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-serif text-ink mb-2">Under Construction</h3>
                    <p className="text-sm text-jade-600 font-sans leading-relaxed">
                        New tools are being forged in the mist. <br/> Check back soon.
                    </p>
                </motion.div>

                {/* Placeholder Cards for layout demonstration */}
                {[1, 2].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + (i * 0.1), duration: 0.8 }}
                        className="col-span-1 min-h-[200px] border border-dashed border-jade-200/60 rounded-xl flex items-center justify-center"
                    >
                         <span className="text-jade-300 font-serif italic">Coming Soon</span>
                    </motion.div>
                ))}

            </div>
        </main>
      </div>
    </Background>
  );
};

export default Dashboard;
