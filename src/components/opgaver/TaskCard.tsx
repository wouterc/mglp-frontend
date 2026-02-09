import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Opgave, OpgavePriority, User } from '../../types';
import { Calendar, MessageSquare, User as UserIcon, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { opgaveService } from '../../services/opgaveService';

interface TaskCardProps {
    opgave: Opgave;
    onClick: (opgave: Opgave) => void;
    users?: User[];
    onAssigneeChange?: (opgaveId: number, userIds: number[]) => void;
    isOverlay?: boolean;
}

const priorityColors = {
    [OpgavePriority.LOW]: 'bg-gray-100 text-gray-600',
    [OpgavePriority.MEDIUM]: 'bg-blue-50 text-blue-600',
    [OpgavePriority.HIGH]: 'bg-orange-50 text-orange-600',
    [OpgavePriority.URGENT]: 'bg-red-50 text-red-600',
};

// UI-only component to avoid hook conflicts
const TaskCardUI: React.FC<TaskCardProps & {
    innerRef?: (element: HTMLElement | null) => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isOver?: boolean;
    isOverArchive?: boolean;
}> = ({ opgave, onClick, users, onAssigneeChange, innerRef, style, attributes, listeners, isOverlay, isOver, isOverArchive }) => {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const [assigneePopupPos, setAssigneePopupPos] = useState({ top: 0, left: 0, flip: false });
    const [showAssigneeSelector, setShowAssigneeSelector] = useState(false);
    const assigneeRef = useRef<HTMLDivElement>(null);
    const assigneePopupRef = useRef<HTMLDivElement>(null);

    const [history, setHistory] = useState<any[] | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);



    const toggleHistory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showHistory) {
            setShowHistory(false);
            return;
        }

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX + (rect.width / 2)
            });
        }

        setIsLoadingHistory(true);
        try {
            const data = await opgaveService.getStatusHistory(opgave.id);
            setHistory(data);
            setShowHistory(true);
        } catch (err) {
            console.error('Kunne ikke hente historik', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!showHistory && !showAssigneeSelector) return;
        const handleDown = (e: MouseEvent) => {
            // Check if click is inside the assignee popup (portal) or the button (ref)
            if (showAssigneeSelector) {
                const isInData = assigneePopupRef.current && assigneePopupRef.current.contains(e.target as Node);
                const isInButton = assigneeRef.current && assigneeRef.current.contains(e.target as Node);

                if (!isInData && !isInButton) {
                    setShowAssigneeSelector(false);
                }
            }
            if (showHistory) {
                setShowHistory(false);
            }
        };
        window.addEventListener('mousedown', handleDown);
        return () => window.removeEventListener('mousedown', handleDown);
    }, [showHistory, showAssigneeSelector]);

    const getCardStyles = () => {
        // PRIORITY 1: Archive feedback (requested by user)
        if (isOverArchive) return 'bg-red-50 border-red-500 border-dashed shadow-xl scale-[1.02] z-[200] ring-4 ring-red-100 ring-opacity-50';

        // PRIORITY 2: Normal Drag over column/task
        if (isOver) return 'bg-blue-100 border-blue-500 shadow-md ring-2 ring-blue-400 ring-opacity-50 z-10';

        if (opgave.deadline) {
            const deadlineDate = new Date(opgave.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (deadlineDate < today) return 'bg-red-200 border-red-400 shadow-[0_2px_4px_rgba(220,38,38,0.15)]';
            if (deadlineDate <= tomorrow) return 'bg-orange-200 border-orange-400';
        }

        if (opgave.status_direction === -1) return 'bg-purple-200 border-purple-400 shadow-[0_2px_4px_rgba(139,92,246,0.1)]';
        if (opgave.status_direction === 1) return 'bg-emerald-200 border-emerald-400';

        return 'bg-white border-gray-300';
    };

    const STATUS_LABELS: Record<string, string> = {
        'BACKLOG': 'Indbakke',
        'TODO': 'Klar til start',
        'IN_PROGRESS': 'Igang',
        'TEST': 'Test',
        'DONE': 'Færdig'
    };

    return (
        <div
            ref={innerRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(opgave)}
            className={`${getCardStyles()} px-4 py-2 rounded-xl shadow-sm border-2 transition-all cursor-pointer group mb-3 relative overflow-hidden`}
        >
            {showHistory && createPortal(
                <div
                    className="fixed w-[380px] bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] p-3 text-[11px] animate-in fade-in zoom-in duration-150"
                    style={{
                        top: `${popupPos.top}px`,
                        left: `${popupPos.left}px`,
                        transform: 'translateX(-50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
                        <span className="font-bold text-gray-700">Historik</span>
                        <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    {history && history.length > 0 ? (
                        <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {history.map((log) => (
                                <div key={log.id} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-1 rounded transition-colors group/row">
                                    <div className="w-8 shrink-0 font-bold text-blue-600 truncate" title={log.bruger_navn}>
                                        {log.bruger_username}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div className="w-20 shrink-0 text-gray-400 truncate text-right">{STATUS_LABELS[log.gammel_status] || log.gammel_status}</div>
                                        <span className="text-gray-300 shrink-0">→</span>
                                        <div className="w-20 shrink-0 font-bold text-gray-800 truncate">{STATUS_LABELS[log.ny_status] || log.ny_status}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 tabular-nums shrink-0 ml-auto">
                                        {new Date(log.tidspunkt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-400 text-center py-4 italic">Ingen historik fundet</div>
                    )}
                </div>,
                document.body
            )}

            <div className="grid grid-cols-3 items-center mb-1">
                <div className="flex justify-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityColors[opgave.prioritet]}`}>
                        {opgave.prioritet}
                    </span>
                </div>

                <div className="flex justify-center relative" ref={buttonRef}>
                    {opgave.status_direction === 1 && (
                        <div
                            onClick={toggleHistory}
                            className={`flex items-center gap-1 bg-emerald-300 text-emerald-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-500 shadow-sm transition-transform active:scale-95 ${isLoadingHistory ? 'animate-pulse' : 'hover:brightness-95'}`}
                            title="Klik for historik"
                        >
                            <ArrowRight size={10} />
                            <span className="uppercase tracking-wider">Frem</span>
                        </div>
                    )}
                    {opgave.status_direction === -1 && (
                        <div
                            onClick={toggleHistory}
                            className={`flex items-center gap-1 bg-purple-300 text-purple-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-500 shadow-sm transition-transform active:scale-95 ${isLoadingHistory ? 'animate-pulse' : 'hover:brightness-95'}`}
                            title="Klik for historik"
                        >
                            <ArrowLeft size={10} />
                            <span className="uppercase tracking-wider">Retur</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end min-w-0">
                    {opgave.deadline && (
                        <div className={`flex items-center text-[10px] gap-1 whitespace-nowrap ${new Date(opgave.deadline) < new Date() ? 'text-red-600 font-black' : 'text-gray-500 font-bold'}`}>
                            <Calendar size={12} />
                            {new Date(opgave.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </div>
                    )}
                </div>
            </div>

            <h4 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2 leading-relaxed min-h-[2.75rem] flex items-start">
                {opgave.titel}
            </h4>

            <div className="grid grid-cols-3 items-center pt-1.5 mt-0">
                {/* Left: Assignee */}
                {/* Left: Assignees */}
                <div
                    className="flex items-center relative group/assignee cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Determine if we should show the selector
                        if (users && onAssigneeChange) {
                            if (!showAssigneeSelector && assigneeRef.current) {
                                const rect = assigneeRef.current.getBoundingClientRect();
                                const popoverHeight = 300; // Estimated max height
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const flip = spaceBelow < popoverHeight;

                                setAssigneePopupPos({
                                    top: flip ? (rect.top + window.scrollY - 8) : (rect.bottom + window.scrollY + 8),
                                    left: rect.left + window.scrollX,
                                    flip
                                });
                            }
                            setShowAssigneeSelector(!showAssigneeSelector);
                        }
                    }}
                    ref={assigneeRef}
                >
                    <div className="flex -space-x-2 overflow-hidden pl-1 py-1">
                        {opgave.ansvarlige_details && opgave.ansvarlige_details.length > 0 ? (
                            opgave.ansvarlige_details.map((user) => (
                                <div
                                    key={user.id}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white ring-1 ring-gray-100 shadow-sm z-10 hover:z-20 hover:scale-110 transition-all relative"
                                    title={`${user.first_name} ${user.last_name}`}
                                    style={{ backgroundColor: user.color || '#2563EB' }}
                                >
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                </div>
                            ))
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200" title="Ingen ansvarlig">
                                <UserIcon size={12} />
                            </div>
                        )}
                    </div>

                    {/* Hover indicator that it's clickable */}
                    {users && onAssigneeChange && (
                        <div className="ml-1 opacity-0 group-hover/assignee:opacity-100 transition-opacity text-gray-400">
                            <ChevronDown size={10} />
                        </div>
                    )}

                    {/* Popover for selection */}
                    {showAssigneeSelector && users && onAssigneeChange && createPortal(
                        <div
                            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-56 z-[9999] max-h-60 overflow-y-auto animate-in fade-in zoom-in duration-150"
                            style={{
                                top: `${assigneePopupPos.top}px`,
                                left: `${assigneePopupPos.left}px`,
                                transform: assigneePopupPos.flip ? 'translateY(-100%)' : 'none'
                            }}
                            ref={assigneePopupRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 sticky top-0">
                                Vælg ansvarlige
                            </div>
                            <div className="p-1">
                                {users
                                    .filter(u => (u.opgave_sortering || 0) > 0)
                                    .sort((a, b) => (a.opgave_sortering || 0) - (b.opgave_sortering || 0))
                                    .map(user => {
                                        const isSelected = opgave.ansvarlige && opgave.ansvarlige.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer text-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const currentIds = opgave.ansvarlige || [];
                                                    let newIds: number[];
                                                    if (isSelected) {
                                                        newIds = currentIds.filter(id => id !== user.id);
                                                    } else {
                                                        newIds = [...currentIds, user.id];
                                                    }
                                                    onAssigneeChange(opgave.id, newIds);
                                                }}
                                            >
                                                <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                </div>
                                                <div className="flex-1 truncate">
                                                    {user.first_name} {user.last_name}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                {/* Center: Created Date */}
                <div className="flex justify-center">
                    <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">
                        {new Date(opgave.oprettet).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </span>
                </div>

                {/* Right: Comments */}
                <div className="flex justify-end">
                    {opgave.kommentarer_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageSquare size={12} />
                            {opgave.kommentarer_count}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TaskCard: React.FC<TaskCardProps & { isOverArchive?: boolean }> = (props) => {
    // Only use sortable logic if NOT in overlay
    if (props.isOverlay) {
        return <TaskCardUI {...props} />;
    }

    return <TaskCardSortable {...props} />;
};

const TaskCardSortable: React.FC<TaskCardProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver
    } = useSortable({
        id: props.opgave.id,
        data: { opgave: props.opgave }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-32 w-full opacity-50 mb-3"
            />
        );
    }

    return (
        <TaskCardUI
            {...props}
            innerRef={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
            isOver={isOver}
        />
    );
};

export default TaskCard;
