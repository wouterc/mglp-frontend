import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    closestCorners
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { opgaveService } from '../services/opgaveService';
import { useAppState } from '../StateContext';
import { Opgave, OpgaveStatus, User, OpgavePriority } from '../types';
import TaskColumn from '../components/opgaver/TaskColumn';
import TaskCard from '../components/opgaver/TaskCard';
import TaskDetailModal from '../components/opgaver/TaskDetailModal';
import { Plus, Filter } from 'lucide-react';

const OpgaverPage: React.FC = () => {
    const { state } = useAppState(); // Get global state
    const { users } = state; // Use users from context
    const [tasks, setTasks] = useState<Opgave[]>([]);
    // const [users, setUsers] = useState<User[]>([]); // Removed local user state
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Opgave | undefined>(undefined);
    const [activeDragTask, setActiveDragTask] = useState<Opgave | null>(null);

    // Filter states
    const [filterAnsvarlig, setFilterAnsvarlig] = useState<string>('');

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const data = await opgaveService.getAll();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // fetchUsers(); // Removed
    }, []);

    // Deep linking: Open modal if ID is in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id && tasks.length > 0 && !isLoading) {
            const task = tasks.find(t => t.id === Number(id));
            if (task) {
                setEditingTask(task);
                setIsModalOpen(true);
                // Clear URL param? Maybe not, so reload keeps it open.
            }
        }
    }, [tasks, isLoading]);

    // Reactivity fix: Update editingTask when tasks list changes (e.g. after comment add/delete)
    useEffect(() => {
        if (editingTask) {
            const updated = tasks.find(t => t.id === editingTask.id);
            if (updated && updated !== editingTask) {
                setEditingTask(updated);
            }
        }
    }, [tasks]);

    // Memoized grouping and sorting
    const memoizedTasksByStatus = React.useMemo(() => {
        const groups: Record<OpgaveStatus, Opgave[]> = {
            [OpgaveStatus.BACKLOG]: [],
            [OpgaveStatus.TODO]: [],
            [OpgaveStatus.IN_PROGRESS]: [],
            [OpgaveStatus.TEST]: [],
            [OpgaveStatus.DONE]: [],
        };

        tasks.forEach(task => {
            if (groups[task.status]) {
                groups[task.status].push(task);
            }
        });

        // Priority weights
        const priorityWeight: Record<OpgavePriority, number> = {
            [OpgavePriority.URGENT]: 4,
            [OpgavePriority.HIGH]: 3,
            [OpgavePriority.MEDIUM]: 2,
            [OpgavePriority.LOW]: 1,
        };

        // Sort each group
        Object.values(OpgaveStatus).forEach(status => {
            groups[status].sort((a, b) => {
                const weightA = priorityWeight[a.prioritet] || 0;
                const weightB = priorityWeight[b.prioritet] || 0;

                if (weightA !== weightB) {
                    return weightB - weightA;
                }
                return (a.index || 0) - (b.index || 0);
            });
        });

        return groups;
    }, [tasks]);

    const getFilteredTasks = (status: OpgaveStatus) => {
        let list = memoizedTasksByStatus[status];
        if (filterAnsvarlig) {
            list = list.filter(t => t.ansvarlig?.toString() === filterAnsvarlig);
        }
        return list;
    };

    const handleAssigneeChange = async (opgaveId: number, userId: number | null) => {
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === opgaveId ? { ...t, ansvarlig: userId, ansvarlig_details: users.find(u => u.id === userId) } : t
        ));

        try {
            await opgaveService.update(opgaveId, { ansvarlig: userId });
        } catch (error) {
            console.error("Failed to update assignee", error);
            fetchTasks(); // Revert on error
        }
    };


    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveDragTask(task);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Optional: Handling drag over if we want real-time rearranging across columns visually before drop
        // For simplicity, we mostly rely on dragEnd for cross-column logic in this initial version, 
        // but sorting within column needs live updates.
        // Implementing full sortable across containers is complex, simplified for now:
        // We just let the overlay be the feedback.
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id;
        const overId = over.id; // Could be a task ID or a column ID

        // Find the active task object
        const activeTask = tasks.find(t => t.id === activeId);
        if (!activeTask) return;

        // Determine target status
        let targetStatus: OpgaveStatus | undefined;
        let newIndex = 0; // Simplified index logic for now

        // Check if over is a Column
        if (Object.values(OpgaveStatus).includes(overId as OpgaveStatus)) {
            targetStatus = overId as OpgaveStatus;
            // append to end
        } else {
            // Over is another Task
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                targetStatus = overTask.status;
                // Insert logic would go here if we want precise reordering
            }
        }

        if (targetStatus && targetStatus !== activeTask.status) {
            // Optimistic Update (status only)
            setTasks(prev => prev.map(t =>
                t.id === activeTask.id ? { ...t, status: targetStatus! } : t
            ));

            // API Call
            try {
                const updatedTask = await opgaveService.updateStatus(activeTask.id, targetStatus);
                // Update with full data from backend (including new history)
                setTasks(prev => prev.map(t =>
                    t.id === activeTask.id ? updatedTask : t
                ));
            } catch (error) {
                console.error("Failed to update status", error);
                // Revert or show error
                fetchTasks(); // Reload to be safe
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans">
            {/* Toolbar */}
            <div className="bg-white px-4 py-3 shadow-sm z-10 flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Opgaver</h1>
                    <p className="text-xs text-gray-500">Udvikling og fejlrettelser</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Filters */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            className="bg-transparent text-sm focus:outline-none text-gray-600"
                            value={filterAnsvarlig}
                            onChange={(e) => setFilterAnsvarlig(e.target.value)}
                        >
                            <option value="">Alle ansvarlige</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
                    >
                        <Plus size={18} />
                        Ny Opgave
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                >
                    <div className="flex h-full gap-2 min-w-max">
                        {Object.values(OpgaveStatus).map(status => (
                            <TaskColumn
                                key={status}
                                id={status}
                                title={status === OpgaveStatus.BACKLOG ? 'Indbakke' :
                                    status === OpgaveStatus.TODO ? 'Klar til start' :
                                        status === OpgaveStatus.IN_PROGRESS ? 'Igang' :
                                            status === OpgaveStatus.TEST ? 'Test' : 'Færdig'}
                                tasks={getFilteredTasks(status)}
                                onTaskClick={async (t) => {
                                    setEditingTask(t);
                                    setIsModalOpen(true);
                                    // Fetch full details (comments, history)
                                    try {
                                        const fullTask = await opgaveService.get(t.id);
                                        setEditingTask(fullTask);
                                    } catch (e) {
                                        console.error("Failed to fetch task details", e);
                                    }
                                }}
                                users={users}
                                onAssigneeChange={handleAssigneeChange}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeDragTask ? <TaskCard opgave={activeDragTask} onClick={() => { }} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {isModalOpen && (
                <TaskDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    opgave={editingTask}
                    onSaved={fetchTasks}
                    users={users}
                />
            )}
        </div>
    );
};

export default OpgaverPage;
