import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Opgave, User } from '../../types';
import TaskCard from './TaskCard';

interface TaskColumnProps {
    id: string;
    title: string;
    tasks: Opgave[];
    onTaskClick: (opgave: Opgave) => void;
    users?: User[];
    onAssigneeChange?: (opgaveId: number, userId: number | null) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({ id, title, tasks, onTaskClick, users, onAssigneeChange }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            className={`
                flex flex-col h-full w-72 rounded-xl border-2 transition-all flex-shrink-0
                ${isOver
                    ? 'bg-blue-50 border-blue-400 shadow-lg scale-[1.01] z-20'
                    : 'bg-gray-50/50 border-gray-100/50'
                }
            `}
        >
            {/* Header */}
            <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-700">{title}</h3>
                    <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-gray-400 shadow-sm border border-gray-100">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Droppable Area */}
            <div ref={setNodeRef} className="flex-1 px-2 pb-2 overflow-y-auto custom-scrollbar">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            opgave={task}
                            onClick={onTaskClick}
                            users={users}
                            onAssigneeChange={onAssigneeChange}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs italic">
                        Slip opgave her
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskColumn;
