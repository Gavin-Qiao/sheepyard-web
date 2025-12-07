import React, { useState, useEffect, useRef } from 'react';
import { Search, User as UserIcon } from 'lucide-react';

interface DiscordMember {
    id: string;
    username: string;
    display_name: string;
    avatar?: string;
}

interface MentionSelectorProps {
    onSelect: (member: DiscordMember) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export const MentionSelector: React.FC<MentionSelectorProps> = ({ onSelect, isOpen: externalIsOpen, onClose }) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [members, setMembers] = useState<DiscordMember[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isEffectiveOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (externalIsOpen !== undefined && onClose) {
                    onClose();
                } else {
                    setInternalIsOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [externalIsOpen, onClose]);

    const fetchMembers = async () => {
        if (members.length > 0) return;
        setLoading(true);
        try {
            const res = await fetch('/api/discord/members');
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (error) {
            console.error('Failed to fetch members', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch members when opened
    useEffect(() => {
        if (isEffectiveOpen) {
            fetchMembers();
        }
    }, [isEffectiveOpen]);

    const handleFocus = () => {
        if (externalIsOpen === undefined) {
            setInternalIsOpen(true);
        } else if (onClose) {
            // If controlled, we might want to signal opening? 
            // But usually parent controls this key.
            // For the button click case:
            // If controlled mode is used for the textarea, this button might confusingly conflict or just work parallel.
            // Let's assume if controlled, the button calls a parent handler? 
            // Or simpler: handleFocus forces internal open? 
            // Let's stick to: if externalIsOpen is defined, we assume parent drives it. 
            // But the button inside this component should probably trigger the parent?
            // Actually, for simplicity, let's keep internal state for the BUTTON trigger 
            // and just OR it with external.
            // But then closing is tricky.
        }
        // Let's simplify: mixing controlled and uncontrolled is messy.
        // We'll keep it as "Uncontrolled BUT triggered by prop" or separate them.
        // Actually, let's just use effects.
        setInternalIsOpen(true);
        fetchMembers();
    };



    const filteredMembers = members.filter(member =>
        member.display_name.toLowerCase().includes(search.toLowerCase()) ||
        member.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={handleFocus}
                className="text-xs text-jade-600 hover:text-jade-700 font-medium flex items-center gap-1"
            >
                @ Mention User
            </button>

            {(isEffectiveOpen) && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search members..."
                                autoFocus
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-jade-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                        {loading && members.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">Loading members...</div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">No members found</div>
                        ) : (
                            filteredMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => {
                                        onSelect(member);
                                        if (onClose) onClose();
                                        else setInternalIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-jade-50 flex items-center gap-2 transition-colors"
                                >
                                    {member.avatar ? (
                                        <img
                                            src={`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=32`}
                                            alt={member.username}
                                            className="w-6 h-6 rounded-full"
                                            onError={(e) => {
                                                // Fallback if avatar fails
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                            <UserIcon size={14} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">{member.display_name}</div>
                                        <div className="text-xs text-gray-500 truncate">@{member.username}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
