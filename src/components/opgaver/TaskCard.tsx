import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Opgave, OpgavePriority, User } from '../../types';
import { Calendar, MessageSquare, User as UserIcon, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface TaskCardProps {
    opgave: Opgave;
    onClick: (opgave: Opgave) => void;
    users?: User[];
    onAssigneeChange?: (opgaveId: number, userId: number | null) => void;
}

const priorityColors = {
    [OpgavePriority.LOW]: 'bg-gray-100 text-gray-600',
    [OpgavePriority.MEDIUM]: 'bg-blue-50 text-blue-600',
    [OpgavePriority.HIGH]: 'bg-orange-50 text-orange-600',
    [OpgavePriority.URGENT]: 'bg-red-50 text-red-600',
};

const TaskCard: React.FC<TaskCardProps> = ({ opgave, onClick, users, onAssigneeChange }) => {
    const [isHoveringAssignee, setIsHoveringAssignee] = useState(false);

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (onAssigneeChange) {
            const val = e.target.value;
            onAssigneeChange(opgave.id, val ? Number(val) : null);
        }
    };
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: opgave.id, data: { opgave } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-32 w-full opacity-50"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(opgave)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-300 hover:shadow-md transition-all cursor-pointer group mb-3 relative overflow-hidden"
        >
            {/* Status Flow Indicator */}
            {(() => {
                if (opgave.status_direction === 1) {
                    return (
                        <div className="absolute top-0 right-0 p-2">
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 shadow-sm" title="Flyttet frem">
                                <ArrowRight size={12} />
                                <span className="uppercase tracking-wider">Frem</span>
                            </div>
                        </div>
                    );
                } else if (opgave.status_direction === -1) {
                    return (
                        <div className="absolute top-0 right-0 p-2">
                            <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 shadow-sm" title="Sendt retur">
                                <ArrowLeft size={12} />
                                <span className="uppercase tracking-wider">Retur</span>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            <div className="flex justify-between items-start mb-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityColors[opgave.prioritet]}`}>
                    {opgave.prioritet}
                </span>
                {opgave.deadline && (
                    <div className={`flex items-center text-[10px] gap-1 ${new Date(opgave.deadline) < new Date() ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        <Calendar size={12} />
                        {new Date(opgave.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </div>
                )}
            </div>

            <h4 className="font-semibold text-gray-800 text-sm mb-3 line-clamp-2 leading-relaxed">
                {opgave.titel}
            </h4>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
                <div className="flex items-center gap-2 relative group/assignee" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                        {/* Hidden Select Overlay for quick switching */}
                        {users && onAssigneeChange && (
                            <select
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                value={opgave.ansvarlig || ''}
                                onChange={handleAssigneeChange}
                                title="Skift ansvarlig"
                            >
                                <option value="">Ingen</option>
                                {users
                                    .filter(u => (u.opgave_sortering || 0) > 0)
                                    .sort((a, b) => (a.opgave_sortering || 0) - (b.opgave_sortering || 0))
                                    .map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                            </select>
                        )}

                        {opgave.ansvarlig_details ? (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 border border-blue-200" title={opgave.ansvarlig_details.first_name}>
                                    {opgave.ansvarlig_details.first_name[0]}{opgave.ansvarlig_details.last_name[0]}
                                </div>
                                {/* Show dropdown arrow on hover if editable */}
                                {users && <ChevronDown size={10} className="text-gray-400 opacity-0 group-hover/assignee:opacity-100 transition-opacity" />}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                    <UserIcon size={12} />
                                </div>
                                {users && <ChevronDown size={10} className="text-gray-400 opacity-0 group-hover/assignee:opacity-100 transition-opacity" />}
                            </div>
                        )}
                    </div>
                </div>

                {opgave.kommentarer_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare size={12} />
                        {opgave.kommentarer_count}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
