import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Team } from '../../types_kommunikation';
import { User as UserType } from '../../types';
import { Users, User as UserIcon, Search, MessageSquare, X, Book, PlusCircle } from 'lucide-react';
import { Besked } from '../../types_kommunikation';
import dayjs from 'dayjs';

interface ChatSidebarProps {
    currentUser: UserType;
    users: UserType[];
    teams: Team[];
    onSelectUser: (user: UserType) => void;
    onSelectTeam: (team: Team) => void;
    activeRecipientId?: number; // ID of user or team
    activeType?: 'user' | 'team';
    onAddTeam?: () => void;
    unreadCounts?: { [key: string]: number };
    layoutMode: 'bottom' | 'right';
    onToggleLayout: () => void;
    onDropMessage?: (messageId: number, recipientId: number, type: 'user' | 'team') => void;
    isPopup?: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    searchResults: Besked[];
    onlyActiveChat: boolean;
    onToggleOnlyActive: () => void;
    onSelectMessage?: (msg: Besked) => void;
    className?: string; // Add className prop
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    users,
    teams,
    onSelectUser,
    onSelectTeam,
    activeRecipientId,
    activeType,
    onAddTeam,
    unreadCounts = {},
    layoutMode,
    onToggleLayout,
    onDropMessage,
    isPopup,
    searchTerm,
    onSearchChange,
    searchResults,
    onlyActiveChat,
    onToggleOnlyActive,
    onSelectMessage,
    className = '' // Default to empty string
}) => {
    const [dragOverTarget, setDragOverTarget] = useState<{ id: number, type: 'user' | 'team' } | null>(null);

    const handleDragOver = (e: React.DragEvent, id: number, type: 'user' | 'team') => {
        e.preventDefault();
        if (dragOverTarget?.id !== id || dragOverTarget?.type !== type) {
            setDragOverTarget({ id, type });
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragOverTarget(null);
    };

    const handleDrop = (e: React.DragEvent, id: number, type: 'user' | 'team') => {
        e.preventDefault();
        setDragOverTarget(null);
        const msgId = Number(e.dataTransfer.getData('text/plain'));
        if (msgId && onDropMessage) {
            onDropMessage(msgId, id, type);
        }
    };

    return (
        <div className={`w-full md:w-80 bg-gray-50 border-r border-gray-200 h-full flex flex-col shrink-0 ${className}`}>
            <div className="p-4 font-bold text-gray-700 bg-gray-100 border-b border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <span>ChatCha</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleLayout}
                        className={`p-1.5 rounded transition-colors ${layoutMode === 'bottom' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-500'}`}
                        title="Standard Layout"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                            <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </button>
                    <button
                        onClick={onToggleLayout}
                        className={`p-1.5 rounded transition-colors ${layoutMode === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-500'}`}
                        title="Split Layout"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                            <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </button>
                    {!isPopup && (
                        <>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <button
                                onClick={() => {
                                    const w = localStorage.getItem('chatPopup_w') || '1000';
                                    const h = localStorage.getItem('chatPopup_h') || '700';
                                    const x = localStorage.getItem('chatPopup_x');
                                    const y = localStorage.getItem('chatPopup_y');

                                    let features = `width=${w},height=${h},resizable=yes,scrollbars=yes`;
                                    if (x) features += `,left=${x}`;
                                    if (y) features += `,top=${y}`;

                                    window.open('/chat-popup', 'ChatPopup', features);
                                }}
                                className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                                title="Åbn i nyt vindue"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        id="chat-search-input"
                        name="chatSearch"
                        type="text"
                        placeholder="Søg i beskeder..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        aria-label="Søg i beskeder"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-2 top-2.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <label className="mt-2 flex items-center gap-2 cursor-pointer group">
                    <input
                        id="chat-filter-active-only"
                        name="chatFilterActiveOnly"
                        type="checkbox"
                        checked={onlyActiveChat}
                        onChange={onToggleOnlyActive}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        aria-label="Vis kun beskeder i denne chat"
                    />
                    <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">Kun i denne chat</span>
                </label>
            </div>

            <div className="flex-1 overflow-y-auto">
                {searchTerm ? (
                    <div className="py-2">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Søgeresultater ({searchResults.length})</span>
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">Ingen beskeder fundet</p>
                            </div>
                        ) : (
                            <ul>
                                {searchResults.map(msg => (
                                    <li
                                        key={`search-res-${msg.id}`}
                                        className="px-4 py-3 cursor-pointer hover:bg-white border-b border-gray-100 last:border-0 transition-colors group"
                                        onClick={() => onSelectMessage?.(msg)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-gray-900 truncate flex-1 mr-2">
                                                {msg.afsender_details.first_name} {msg.afsender_details.last_name}
                                            </span>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {dayjs(msg.oprettet).format('DD. MMM')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <MessageSquare className="w-3 h-3 text-blue-400 shrink-0" />
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                                {msg.modtager_team ? 'Team' : 'Direkte'}
                                            </span>
                                        </div>
                                        <p
                                            className="text-xs text-gray-500 line-clamp-2 italic"
                                            dangerouslySetInnerHTML={{ __html: msg.indhold.substring(0, 100) }}
                                        ></p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="px-4 py-4">
                            <button
                                onClick={() => onSearchChange('')}
                                className="w-full py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50/50 rounded hover:bg-blue-50 transition-colors"
                            >
                                Ryd søgning
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Teams Section */}
                        <div className="mb-4">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Teams</span>
                                <button onClick={onAddTeam} className="text-blue-600 hover:text-blue-800 text-lg" title="Opret Team">+</button>
                            </div>
                            <ul>
                                {teams.map(team => {
                                    const unread = unreadCounts[`team-${team.id}`] || 0;
                                    const isDragOver = dragOverTarget?.type === 'team' && dragOverTarget?.id === team.id;
                                    const isActive = activeType === 'team' && activeRecipientId === team.id;

                                    let liClass = "px-4 py-2 cursor-pointer flex items-center transition-colors ";
                                    if (isDragOver) {
                                        liClass += "bg-red-100 border-2 border-red-500";
                                    } else if (isActive) {
                                        liClass += "bg-blue-100 text-blue-900 border-r-4 border-blue-600";
                                    } else {
                                        liClass += "hover:bg-gray-100 text-gray-700";
                                    }

                                    return (
                                        <li
                                            key={`team-${team.id}`}
                                            className={liClass}
                                            onClick={() => onSelectTeam(team)}
                                            onDragOver={(e) => handleDragOver(e, team.id, 'team')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, team.id, 'team')}
                                        >
                                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="truncate flex-1">{team.navn}</span>
                                            {unread > 0 && (
                                                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                    {unread > 9 ? '9+' : unread}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Direct Messages Section */}
                        <div>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Personer
                            </div>
                            <ul>
                                {users.map(user => {
                                    const unread = unreadCounts[`user-${user.id}`] || 0;
                                    const isDragOver = dragOverTarget?.type === 'user' && dragOverTarget?.id === user.id;
                                    const isActive = activeType === 'user' && activeRecipientId === user.id;

                                    let liClass = "px-4 py-2 cursor-pointer flex items-center transition-colors ";
                                    if (isDragOver) {
                                        liClass += "bg-red-100 border-2 border-red-500";
                                    } else if (isActive) {
                                        liClass += "bg-blue-100 text-blue-900 border-r-4 border-blue-600";
                                    } else {
                                        liClass += "hover:bg-gray-100 text-gray-700";
                                    }

                                    return (
                                        <li
                                            key={`user-${user.id}`}
                                            className={liClass}
                                            onClick={() => onSelectUser(user)}
                                            onDragOver={(e) => handleDragOver(e, user.id, 'user')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, user.id, 'user')}
                                        >
                                            <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="truncate flex-1">{user.first_name} {user.last_name}</span>

                                            <div className="flex items-center gap-2">
                                                {unread > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                                        {unread > 9 ? '9+' : unread}
                                                    </span>
                                                )}
                                                {user.is_online && (
                                                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
export default ChatSidebar;
