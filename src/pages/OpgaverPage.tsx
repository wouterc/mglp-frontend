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
    closestCorners,
    UniqueIdentifier,
    rectIntersection,
    pointerWithin,
    CollisionDetection,
    useDroppable
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { opgaveService } from '../services/opgaveService';
import { useAppState } from '../StateContext';
import { Opgave, OpgaveStatus, User, OpgavePriority } from '../types';
import TaskColumn from '../components/opgaver/TaskColumn';
import TaskCard from '../components/opgaver/TaskCard';
import TaskDetailModal from '../components/opgaver/TaskDetailModal';
import { Plus, Filter, Search, X, User as UserIcon, ChevronLeft, ChevronRight, PauseCircle } from 'lucide-react';
import ArchiveDropZone from '../components/opgaver/ArchiveDropZone';
import ArchiveModal from '../components/opgaver/ArchiveModal';

const OpgaverBoardContent: React.FC<{
    tasks: Opgave[];
    isLoading: boolean;
    activeDragTask: Opgave | null;
    overId: UniqueIdentifier | null;
    users: User[];
    filterAnsvarlig: string;
    setFilterAnsvarlig: (v: string) => void;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    setIsArchiveOpen: (v: boolean) => void;
    setIsModalOpen: (v: boolean) => void;
    setEditingTask: (t: Opgave | undefined) => void;
    fetchTasks: () => void;
    handleAssigneeChange: (id: number, uids: number[]) => void;
    getFilteredTasks: (status: OpgaveStatus) => Opgave[];
    currentUser: User | null;
    showOnHold: boolean;
    setShowOnHold: (v: boolean) => void;
}> = (props) => {

    const handleTaskClick = async (t: Opgave) => {
        props.setEditingTask(t);
        props.setIsModalOpen(true);
        try {
            const fullTask = await opgaveService.get(t.id);
            props.setEditingTask(fullTask);
        } catch (e) {
            console.error(e);
        }
    };
    const { setNodeRef: setArchiveRef, isOver: archiveIsOver } = useDroppable({
        id: 'archive-dropzone',
    });

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans">
            {/* Toolbar / Archive Zone */}
            <div
                ref={setArchiveRef}
                className="bg-white px-4 py-3 shadow-sm z-10 flex flex-wrap gap-4 items-center justify-between transition-colors duration-200"
                style={archiveIsOver ? { backgroundColor: '#fef2f2' } : {}}
            >
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Opgaver</h1>
                    <p className="text-xs text-gray-500">Udvikling og fejlrettelser</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Søg i opgaver..."
                            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={props.searchQuery}
                            onChange={(e) => props.setSearchQuery(e.target.value)}
                        />
                        {props.searchQuery && (
                            <button
                                onClick={() => props.setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Quick Filter: My Tasks */}
                    {props.currentUser && (
                        <button
                            onClick={() => {
                                const myId = String(props.currentUser?.id);
                                if (props.filterAnsvarlig === myId) {
                                    props.setFilterAnsvarlig('');
                                } else {
                                    props.setFilterAnsvarlig(myId);
                                }
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${props.filterAnsvarlig === String(props.currentUser.id)
                                ? 'bg-blue-100 text-blue-600 border-blue-200'
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                }`}
                            title="Mine opgaver"
                        >
                            <UserIcon size={16} />
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            className="bg-transparent text-sm focus:outline-none text-gray-600"
                            value={props.filterAnsvarlig}
                            onChange={(e) => props.setFilterAnsvarlig(e.target.value)}
                        >
                            <option value="">Alle ansvarlige</option>
                            {props.users.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                            ))}
                        </select>
                    </div>

                    <ArchiveDropZone
                        onClick={() => props.setIsArchiveOpen(true)}
                        isOver={archiveIsOver}
                    />

                    <button
                        onClick={() => { props.setEditingTask(undefined); props.setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
                    >
                        <Plus size={18} />
                        Ny Opgave
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-2">
                <div className="flex h-full gap-2 min-w-max">
                    {/* Backlog Column with Toggle Button */}
                    <TaskColumn
                        key={OpgaveStatus.BACKLOG}
                        id={OpgaveStatus.BACKLOG}
                        title="Indbakke"
                        tasks={props.getFilteredTasks(OpgaveStatus.BACKLOG)}
                        onTaskClick={handleTaskClick}
                        users={props.users}
                        onAssigneeChange={props.handleAssigneeChange}
                        headerAction={
                            <button
                                onClick={() => props.setShowOnHold(!props.showOnHold)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                title={props.showOnHold ? "Skjul On Hold" : "Vis On Hold"}
                            >
                                {props.showOnHold ?
                                    <ChevronLeft size={16} className="text-gray-500" /> :
                                    <ChevronRight size={16} className="text-gray-500" />
                                }
                            </button>
                        }
                    />

                    {/* On Hold / Afventer Column */}
                    {props.showOnHold && (
                        <TaskColumn
                            key={OpgaveStatus.ON_HOLD}
                            id={OpgaveStatus.ON_HOLD}
                            title={
                                <div className="flex items-center gap-2">
                                    <PauseCircle size={18} className="text-gray-500" />
                                    <span>On Hold</span>
                                </div>
                            }
                            tasks={props.getFilteredTasks(OpgaveStatus.ON_HOLD)}
                            onTaskClick={handleTaskClick}
                            users={props.users}
                            onAssigneeChange={props.handleAssigneeChange}
                        />
                    )}

                    {/* Other Columns */}
                    {[OpgaveStatus.TODO, OpgaveStatus.IN_PROGRESS, OpgaveStatus.TEST, OpgaveStatus.DONE].map(status => (
                        <TaskColumn
                            key={status}
                            id={status}
                            title={status === OpgaveStatus.TODO ? 'Klar til start' :
                                status === OpgaveStatus.IN_PROGRESS ? 'Igang' :
                                    status === OpgaveStatus.TEST ? 'Test' : 'Færdig'}
                            tasks={props.getFilteredTasks(status)}
                            onTaskClick={handleTaskClick}
                            users={props.users}
                            onAssigneeChange={props.handleAssigneeChange}
                        />
                    ))}
                </div>
            </div>

            <DragOverlay dropAnimation={null}>
                {props.activeDragTask ? (
                    <div style={{ pointerEvents: 'none' }}>
                        <TaskCard
                            opgave={props.activeDragTask}
                            onClick={() => { }}
                            isOverlay
                            isOverArchive={archiveIsOver || props.overId === 'archive-dropzone'}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </div>
    );
};

const OpgaverPage: React.FC = () => {
    const { state } = useAppState();
    const { users } = state;
    const [tasks, setTasks] = useState<Opgave[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Opgave | undefined>(undefined);
    const [activeDragTask, setActiveDragTask] = useState<Opgave | null>(null);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
    const [filterAnsvarlig, setFilterAnsvarlig] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnHold, setShowOnHold] = useState(false);

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
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id && tasks.length > 0 && !isLoading) {
            const task = tasks.find(t => t.id === Number(id));
            if (task) {
                setEditingTask(task);
                setIsModalOpen(true);
            }
        }
    }, [tasks, isLoading]);

    useEffect(() => {
        if (editingTask) {
            const updated = tasks.find(t => t.id === editingTask.id);
            if (updated && updated !== editingTask) {
                setEditingTask(updated);
            }
        }
    }, [tasks]);

    useEffect(() => {
        if (searchQuery.trim()) {
            const onHoldMatches = getFilteredTasks(OpgaveStatus.ON_HOLD);
            setShowOnHold(onHoldMatches.length > 0);
        }
    }, [searchQuery, tasks, filterAnsvarlig]); // React to search, data, or filter changes

    const customCollisionDetection: CollisionDetection = (args) => {
        const archiveContainer = args.droppableContainers.find(c => c.id === 'archive-dropzone');
        if (archiveContainer) {
            const archiveIntersection = pointerWithin({
                ...args,
                droppableContainers: [archiveContainer]
            });
            if (archiveIntersection.length > 0) {
                return archiveIntersection;
            }
        }
        return closestCorners(args);
    };

    const memoizedTasksByStatus = React.useMemo(() => {
        const groups: Record<OpgaveStatus, Opgave[]> = {
            [OpgaveStatus.BACKLOG]: [],
            [OpgaveStatus.ON_HOLD]: [],
            [OpgaveStatus.TODO]: [],
            [OpgaveStatus.IN_PROGRESS]: [],
            [OpgaveStatus.TEST]: [],
            [OpgaveStatus.DONE]: [],
        };
        tasks.forEach(task => {
            if (groups[task.status]) groups[task.status].push(task);
        });
        const priorityWeight: Record<OpgavePriority, number> = {
            [OpgavePriority.URGENT]: 4, [OpgavePriority.HIGH]: 3, [OpgavePriority.MEDIUM]: 2, [OpgavePriority.LOW]: 1,
        };
        Object.values(OpgaveStatus).forEach(status => {
            groups[status].sort((a, b) => {
                const weightA = priorityWeight[a.prioritet] || 0;
                const weightB = priorityWeight[b.prioritet] || 0;
                if (weightA !== weightB) return weightB - weightA;
                return (a.index || 0) - (b.index || 0);
            });
        });
        return groups;
    }, [tasks]);

    const getFilteredTasks = (status: OpgaveStatus) => {
        let list = memoizedTasksByStatus[status];

        // Filter by Assignee
        if (filterAnsvarlig) {
            const filterId = Number(filterAnsvarlig);
            list = list.filter(t => t.ansvarlige && t.ansvarlige.includes(filterId));
        }

        // Filter by Search Query (Title and Description)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(t => {
                const titleMatch = t.titel.toLowerCase().includes(query);

                // Strip HTML from description and handle entities
                const descriptionText = t.beskrivelse
                    ? t.beskrivelse
                        .replace(/<[^>]*>/g, ' ') // Replace tags with space to avoid fusing words
                        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                        .replace(/\s+/g, ' ')    // Normalize whitespace to single space
                        .toLowerCase()
                    : '';

                return titleMatch || descriptionText.includes(query);
            });
        }

        return list;
    };



    const handleAssigneeChange = async (opgaveId: number, userIds: number[]) => {
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === opgaveId ? {
                ...t,
                ansvarlige: userIds,
                ansvarlige_details: users.filter(u => userIds.includes(u.id))
            } : t
        ));

        try {
            const updatedTask = await opgaveService.update(opgaveId, { ansvarlige: userIds });
            // Confirm with server response
            setTasks(prev => prev.map(t => t.id === opgaveId ? updatedTask : t));
        } catch (error) {
            console.error("Failed to update assignee:", error);
            fetchTasks(); // Revert on error
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveDragTask(task);
        setOverId(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        setOverId(event.over?.id || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragTask(null);
        setOverId(null);

        if (!over) return;

        // Robust ID lookup (handles string vs number)
        const activeTask = tasks.find(t => String(t.id) === String(active.id));

        if (!activeTask) {
            console.warn('DragEnd: No active task found for ID', active.id);
            return;
        }

        if (over.id === 'archive-dropzone') {
            const taskId = activeTask.id;
            console.log('[Archive] Drop detected for ID:', taskId);

            // Optimistic update using robust string-safe filter
            setTasks(prev => prev.filter(t => String(t.id) !== String(active.id)));

            try {
                await opgaveService.archive(taskId);
                console.log('[Archive] Server success');
            } catch (error) {
                console.error('[Archive] FAILED - reloading tasks:', error);
                fetchTasks(); // Restore from server
            }
            return;
        }

        let targetStatus: OpgaveStatus | undefined;
        if (Object.values(OpgaveStatus).includes(over.id as OpgaveStatus)) {
            targetStatus = over.id as OpgaveStatus;
        } else {
            const overTask = tasks.find(t => String(t.id) === String(over.id));
            if (overTask) targetStatus = overTask.status;
        }

        if (targetStatus && targetStatus !== activeTask.status) {
            setTasks(prev => prev.map(t => String(t.id) === String(activeTask.id) ? { ...t, status: targetStatus! } : t));
            try {
                const updatedTask = await opgaveService.updateStatus(activeTask.id, targetStatus);
                setTasks(prev => prev.map(t => String(t.id) === String(activeTask.id) ? updatedTask : t));
            } catch (error) { fetchTasks(); }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
        >
            <OpgaverBoardContent
                tasks={tasks}
                isLoading={isLoading}
                activeDragTask={activeDragTask}
                overId={overId}
                users={users}
                filterAnsvarlig={filterAnsvarlig}
                setFilterAnsvarlig={setFilterAnsvarlig}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setIsArchiveOpen={setIsArchiveOpen}
                setIsModalOpen={setIsModalOpen}
                setEditingTask={setEditingTask}
                fetchTasks={fetchTasks}
                handleAssigneeChange={handleAssigneeChange}
                getFilteredTasks={getFilteredTasks}
                currentUser={state.currentUser}
                showOnHold={showOnHold}
                setShowOnHold={setShowOnHold}
            />

            {isArchiveOpen && (
                <ArchiveModal
                    isOpen={isArchiveOpen}
                    onClose={() => setIsArchiveOpen(false)}
                    onRestore={fetchTasks}
                    onTaskClick={(t) => {
                        setEditingTask(t);
                        setIsModalOpen(true);
                    }}
                />
            )}

            {isModalOpen && (
                <TaskDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    opgave={editingTask}
                    onSaved={fetchTasks}
                    users={users}
                />
            )}
        </DndContext>
    );
};

export default OpgaverPage;
