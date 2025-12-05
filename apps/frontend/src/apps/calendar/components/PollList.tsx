import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Clock, Loader2, List, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import CalendarMonthView from './CalendarMonthView';

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

const PollList: React.FC = () => {
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    useEffect(() => {
        fetch('/api/polls')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch polls');
                return res.json();
            })
            .then(data => {
                // Ensure polls are sorted by creation date descending
                const sorted = data.sort((a: Poll, b: Poll) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setPolls(sorted);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-jade-500" />
        </div>
    );

    if (error) return (
        <div className="text-center py-12 text-red-400">
            Error: {error}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-serif text-ink">Your Gatherings</h2>
                 <div className="flex items-center space-x-4">
                     {/* View Toggle */}
                     <div className="flex bg-white/50 rounded-lg p-1 border border-jade-200">
                         <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-jade-100 text-jade-700 shadow-sm' : 'text-jade-400 hover:text-jade-600'}`}
                            title="List View"
                         >
                             <List size={18} />
                         </button>
                         <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-jade-100 text-jade-700 shadow-sm' : 'text-jade-400 hover:text-jade-600'}`}
                            title="Calendar View"
                         >
                             <LayoutGrid size={18} />
                         </button>
                     </div>

                     <Link to="create" className="flex items-center space-x-2 bg-jade-600 text-white px-4 py-2 rounded-lg hover:bg-jade-700 transition-colors shadow-sm hover:shadow-md">
                        <Plus size={18} />
                        <span>New Poll</span>
                     </Link>
                 </div>
            </div>

            {polls.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-jade-200 rounded-xl bg-white/30">
                    <Calendar className="mx-auto h-12 w-12 text-jade-300 mb-4" />
                    <p className="text-jade-600 font-serif text-lg">No gatherings planned yet.</p>
                    <Link to="create" className="text-jade-500 hover:text-jade-700 mt-2 inline-block underline underline-offset-4">
                        Create the first one
                    </Link>
                </div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {polls.map((poll, index) => {
                                const isActive = poll.options.some(opt => new Date(opt.end_time) > new Date());
                                return (
                                <motion.div
                                    key={poll.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link to={`${poll.id}`} className="block h-full">
                                        <div className="h-full bg-white/60 backdrop-blur-sm border border-jade-100 rounded-xl p-6 hover:shadow-lg hover:border-jade-300 transition-all duration-300 group">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-serif text-ink group-hover:text-jade-700 transition-colors line-clamp-2">
                                                    {poll.title}
                                                </h3>
                                                <span className={`text-xs px-2 py-1 rounded-full ${isActive ? 'bg-jade-100 text-jade-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {isActive ? 'Active' : 'Closed'}
                                                </span>
                                            </div>

                                            {poll.description && (
                                                <p className="text-sm text-jade-800/70 mb-4 line-clamp-2">
                                                    {poll.description}
                                                </p>
                                            )}

                                            <div className="flex items-center text-xs text-jade-500 space-x-4 mt-auto pt-4 border-t border-jade-50">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar size={14} />
                                                    <span>{poll.options.length} Options</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock size={14} />
                                                    <span>Created {format(new Date(poll.created_at), 'MMM d')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <CalendarMonthView polls={polls} />
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
};

export default PollList;
