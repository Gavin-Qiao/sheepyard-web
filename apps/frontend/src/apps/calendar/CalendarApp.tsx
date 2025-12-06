import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import PollList from './components/PollList';
import PollCreate from './components/PollCreate';
import PollDetail from './components/PollDetail';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CalendarApp: React.FC = () => {
    const location = useLocation();

    // Determine back button destination
    // If we are at the root of the calendar app, go back to dashboard
    // Otherwise go back to the calendar app root
    const isRoot = location.pathname === '/apps/calendar' || location.pathname === '/apps/calendar/';
    const backDestination = isRoot ? '/' : '/apps/calendar/';

    return (
        <div className="min-h-screen bg-paper text-ink font-sans">
             {/* Header */}
             <header className="border-b border-jade-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                        <Link to={backDestination} className="text-jade-600 hover:text-jade-800 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="h-6 w-px bg-jade-200"></div>
                        <Link to="/apps/calendar/" className="flex items-center space-x-2 text-jade-800 hover:text-jade-600 transition-colors">
                             <CalendarIcon size={20} />
                             <span className="font-serif text-lg tracking-wide font-bold">Moonlight Calendar</span>
                        </Link>
                     </div>
                </div>
             </header>

             <main className="max-w-7xl mx-auto px-6 py-8">
                <Routes>
                    <Route path="/" element={<PollList />} />
                    <Route path="/create" element={<PollCreate />} />
                    <Route path="/:pollId" element={<PollDetail />} />
                </Routes>
             </main>
        </div>
    );
};

export default CalendarApp;
