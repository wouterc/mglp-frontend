import React, { useRef, useEffect, useState } from 'react';
import { Besked } from '../../types_kommunikation';
import { User, Team } from '../../types_kommunikation';
import { User as UserType } from '../../types';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { Reply, MoreVertical, Copy, Trash2, ArrowRight, CornerUpLeft, Book } from 'lucide-react';

interface ChatWindowProps {
    recipient?: UserType | Team;
    recipientType?: 'user' | 'team';
    messages: Besked[];
    currentUser: UserType;
    onReply: (msg: Besked) => void;
    onDelete: (id: number) => void;
    onForward: (msg: Besked) => void;
    onToVidensbank: (msg: Besked) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onBack?: () => void; // Add onBack prop
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    recipient,
    recipientType,
    messages,
    currentUser,
    onReply,
    onDelete,
    onForward,
    onToVidensbank,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    onBack // Destructure onBack
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    const [prevMessagesLength, setPrevMessagesLength] = React.useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    // Handle scroll to load more
    const handleScroll = () => {
        if (!scrollContainerRef.current || isLoadingMore || !hasMore || !onLoadMore) return;

        const { scrollTop } = scrollContainerRef.current;
        if (scrollTop < 50) { // Near top
            // Save scroll height to maintain position after load
            const currentScrollHeight = scrollContainerRef.current.scrollHeight;

            // This is a bit tricky, we need to handle the scroll jump after messages arrive.
            // Usually we'd do this in a requestAnimationFrame or useEffect after messages update.
            (scrollContainerRef.current as any)._prevScrollHeight = currentScrollHeight;

            onLoadMore();
        }
    };

    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const prevHeight = (container as any)._prevScrollHeight;

        if (prevHeight && messages.length > prevMessagesLength) {
            // We loaded more messages at the top
            const newHeight = container.scrollHeight;
            container.scrollTop = newHeight - prevHeight;
            (container as any)._prevScrollHeight = null;
        } else if (messages.length > prevMessagesLength) {
            // New message arrived at bottom or initial load
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (isAtBottom || isInitialLoad) {
                scrollToBottom();
                setIsInitialLoad(false);
            }
        }
        setPrevMessagesLength(messages.length);
    }, [messages.length]);

    // Reset when changing recipient
    useEffect(() => {
        setPrevMessagesLength(0);
        setIsInitialLoad(true);

        const timer = setTimeout(() => {
            scrollToBottom();
        }, 50);
        return () => clearTimeout(timer);
    }, [recipient?.id]);

    const handleCopy = async (msg: Besked) => {
        try {
            const htmlBlob = new Blob([msg.indhold], { type: "text/html" });
            const textBlob = new Blob([msg.indhold.replace(/<[^>]*>/g, '')], { type: "text/plain" });
            const data = [new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })];
            await navigator.clipboard.write(data);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert("Kunne ikke kopiere indholdet.");
        }
        setActiveMenuId(null);
    };

    const isOnlyEmojis = (html: string) => {
        const text = html.replace(/<[^>]*>/g, '').trim();
        if (!text) return false;
        const emojiRegex = /^(\p{Extended_Pictographic}|\s)+$/u;
        return emojiRegex.test(text) && Array.from(text).length <= 10;
    };

    const renderMessage = (msg: Besked) => {
        const isMe = msg.afsender === currentUser.id;
        const isEmoji = isOnlyEmojis(msg.indhold);

        let typeClass = "bg-white border-gray-200";
        let label = null;

        if (msg.type === 'VIGTIG') {
            typeClass = "bg-red-100 border-red-500";
            label = <span className="text-xs font-bold text-red-800 uppercase mb-1 block">Vigtig</span>;
        } else if (msg.type === 'INFO') {
            typeClass = "bg-blue-100 border-blue-500";
            label = <span className="text-xs font-bold text-blue-800 uppercase mb-1 block">Info</span>;
        } else if (msg.type === 'HANDLING') {
            typeClass = "bg-yellow-100 border-yellow-500";
            label = <span className="text-xs font-bold text-yellow-800 uppercase mb-1 block">Kræver Handling</span>;
        }

        return (
            <div
                key={msg.id}
                className="flex w-full mb-4 group relative"
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', msg.id.toString());
                    e.dataTransfer.effectAllowed = 'copy';
                }}
            >
                <div className={`w-1/2 min-w-0 flex flex-col ${isMe ? 'ml-auto items-start' : 'items-start'}`}>
                    <div className={`w-[98%] rounded-lg p-3 shadow-sm border-2 relative ${typeClass.replace('border-', 'border-')} ${isMe ? 'bg-blue-50 border-blue-400' : (typeClass.includes('bg-white') ? 'bg-gray-50 border-gray-400' : typeClass)}`}>

                        {/* Menu Trigger */}
                        <div className="absolute top-2 right-2 z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/50"
                            >
                                <MoreVertical size={16} />
                            </button>

                            {activeMenuId === msg.id && (
                                <div className="absolute right-0 top-6 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                                    <button
                                        onClick={() => { onReply(msg); setActiveMenuId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <CornerUpLeft size={14} /> Svar
                                    </button>
                                    <button
                                        onClick={() => handleCopy(msg)}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <Copy size={14} /> Kopier
                                    </button>
                                    <button
                                        onClick={() => { onForward(msg); setActiveMenuId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <ArrowRight size={14} /> Videresend
                                    </button>
                                    <button
                                        onClick={() => { onToVidensbank(msg); setActiveMenuId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <Book size={14} /> Vidensbank
                                    </button>
                                    {isMe && (
                                        <button
                                            onClick={() => { onDelete(msg.id); setActiveMenuId(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                        >
                                            <Trash2 size={14} /> Slet
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {label}
                        <div className="flex justify-between items-baseline mb-1 pr-6">
                            {(recipientType === 'team' || !isMe) && (
                                <span className="text-xs font-semibold text-gray-600 mr-2">
                                    {msg.afsender_details.first_name} {msg.afsender_details.last_name}
                                </span>
                            )}
                            <span className="text-xs text-gray-400">
                                {dayjs(msg.oprettet).format('DD/MM HH:mm')}
                            </span>
                        </div>

                        {msg.parent && (
                            (() => {
                                const parentMsg = messages.find(m => m.id === msg.parent);
                                return parentMsg ? (
                                    <div className="mb-2 p-1 border-l-2 border-gray-300 bg-gray-50 text-xs text-gray-500 italic truncate">
                                        <span className="font-semibold">{parentMsg.afsender_details.first_name}: </span>
                                        <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parentMsg.indhold).substring(0, 50) + '...' }} />
                                    </div>
                                ) : null;
                            })()
                        )}

                        <div
                            className={isEmoji
                                ? "text-5xl leading-tight text-gray-800 break-words overflow-hidden [&_*]:!bg-transparent"
                                : "prose prose-sm max-w-none text-gray-800 break-words overflow-hidden [&_*]:!bg-transparent"}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.indhold) }}
                        />

                        {msg.link_url && (
                            <div className="mt-2 pt-2 border-t border-gray-200/50">
                                <span className="text-xs text-gray-500 mr-1">Link:</span>
                                <a
                                    href={msg.link_url}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    🔗 {msg.link_titel || 'Klik her'}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative min-h-0">
            <div className="sticky top-0 z-10 p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    {/* Back Button for Mobile */}
                    <button
                        onClick={onBack}
                        className="md:hidden p-1 mr-[-4px] text-gray-500 hover:bg-gray-200 rounded-full"
                        aria-label="Tilbage til oversigt"
                    >
                        <CornerUpLeft className="transform rotate-[-90deg]" size={20} />
                    </button>

                    <h2 className="text-lg font-semibold text-gray-800 truncate max-w-[200px] md:max-w-none">
                        {recipient
                            ? (recipientType === 'team' ? (recipient as Team).navn : `${(recipient as UserType).first_name} ${(recipient as UserType).last_name}`)
                            : 'Vælg modtager'
                        }
                    </h2>
                    <span className="text-xs text-gray-400 font-mono">(v4.0)</span>
                </div>
            </div>


            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 pb-10 bg-gray-50 scroll-smooth"
            >
                {!recipient ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>Vælg en person eller et team for at starte en samtale</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        Ingen beskeder endnu.
                    </div>
                ) : (
                    <>
                        {hasMore && (
                            <div className="flex justify-center py-4">
                                {isLoadingMore ? (
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <button onClick={onLoadMore} className="text-xs text-blue-600 hover:underline">Indlæs tidligere beskeder</button>
                                )}
                            </div>
                        )}
                        {messages.map(renderMessage)}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default ChatWindow;
