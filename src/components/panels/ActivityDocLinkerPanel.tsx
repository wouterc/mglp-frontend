import React, { useState, useMemo } from 'react';
import { SkabAktivitet, SkabDokument } from '../../types';
import { Search, Link as LinkIcon, Unlink, FileText, X, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    SortableContext,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityDocLinkerPanelProps {
    selectedAktivitet: SkabAktivitet | null;
    dokumenter: SkabDokument[];
    onLinkChanges: (aktivitetId: number, documentIds: number[]) => Promise<void>;
    onClose: () => void;
    isLoadingDocs?: boolean;
}

interface SortableDocItemProps {
    doc: SkabDokument;
    type: 'linked' | 'available';
    onAction: (id: number) => void;
}

function SortableDocItem({ doc, type, onAction }: SortableDocItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: doc.id, data: { type, doc } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between py-1 px-2 border rounded mb-0.5 bg-white group select-none ${type === 'linked' ? 'border-blue-100' : 'border-gray-100 hover:border-gray-300'
                }`}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
                    <GripVertical size={14} />
                </div>

                <FileText size={14} className={`shrink-0 ${doc.aktiv ? "text-blue-500" : "text-gray-400"}`} />
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate min-w-0" title={doc.dokument || doc.filnavn || ''}>
                        {doc.dokument || doc.filnavn}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="shrink-0">{doc.dokument_nr}</span>
                        {doc.gruppe?.titel_kort && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="truncate">{doc.gruppe.titel_kort}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onAction(doc.id); }}
                className={`
                    p-1 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0
                    ${type === 'linked' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}
                `}
                title={type === 'linked' ? "Fjern link" : "Tilføj link"}
            >
                {type === 'linked' ? <Unlink size={14} /> : <LinkIcon size={14} />}
            </button>
        </div>
    );
}

// Helper for Droppable Container
function DroppableContainer({ id, children, className, placeholder }: { id: string, children: React.ReactNode, className?: string, placeholder?: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const style = {
        backgroundColor: isOver ? 'rgba(239, 246, 255, 0.5)' : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className={className}>
            {children}
            {React.Children.count(children) === 0 && placeholder}
        </div>
    );
}

// Helper for Drag Overlay (Plain view without sortable logic)
function DocItemOverlay({ doc, type }: { doc: SkabDokument, type: 'linked' | 'available' }) {
    return (
        <div className="flex items-center justify-between py-1 px-2 border border-blue-300 rounded mb-0.5 bg-white shadow-lg opacity-90">
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <GripVertical size={14} className="text-gray-500" />
                <FileText size={14} className={`shrink-0 ${doc.aktiv ? "text-blue-500" : "text-gray-400"}`} />
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{doc.dokument || doc.filnavn}</span>
                </div>
            </div>
        </div>
    );
}

export default function ActivityDocLinkerPanel({
    selectedAktivitet,
    dokumenter,
    onLinkChanges,
    onClose,
    isLoadingDocs = false
}: ActivityDocLinkerPanelProps) {
    const [documentSearch, setDocumentSearch] = useState('');
    const [activeDragItem, setActiveDragItem] = useState<{ doc: SkabDokument, type: 'linked' | 'available' } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleLink = async (docId: number) => {
        if (!selectedAktivitet) return;
        const currentIds = selectedAktivitet.dokumenter || [];
        if (currentIds.includes(docId)) return;

        const newIds = [...currentIds, docId];
        await onLinkChanges(selectedAktivitet.id, newIds);
    };

    const handleUnlink = async (docId: number) => {
        if (!selectedAktivitet) return;
        const currentIds = selectedAktivitet.dokumenter || [];
        const newIds = currentIds.filter(id => id !== docId);
        await onLinkChanges(selectedAktivitet.id, newIds);
    };

    const { linkedDocs, availableDocs } = useMemo(() => {
        if (!selectedAktivitet) return { linkedDocs: [], availableDocs: [] };

        const linkedIds = selectedAktivitet.dokumenter || [];
        const search = documentSearch.toLowerCase();

        const allFilteredDocs = dokumenter.filter(d => {
            if (!search) return true;
            return (
                (d.dokument?.toLowerCase().includes(search)) ||
                (d.filnavn?.toLowerCase().includes(search)) ||
                (d.dokument_nr?.toString().includes(search))
            );
        });

        const linked = allFilteredDocs.filter(d => linkedIds.includes(d.id));
        const available = allFilteredDocs.filter(d => !linkedIds.includes(d.id));

        return { linkedDocs: linked, availableDocs: available };
    }, [selectedAktivitet, dokumenter, documentSearch]);

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current as { doc: SkabDokument, type: 'linked' | 'available' } | undefined;
        if (data) {
            setActiveDragItem(data);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const activeId = active.id as number;
        // Determine source type from active item data
        const activeData = active.data.current as { type: 'linked' | 'available' } | undefined;
        const sourceType = activeData?.type;

        // Determine target container
        // If over a container directly ('linked-container' or 'available-container')
        // OR over an item currently IN that container.

        let targetType: 'linked' | 'available' | null = null;

        if (over.id === 'linked-container' || linkedDocs.some(d => d.id === over.id)) {
            targetType = 'linked';
        } else if (over.id === 'available-container' || availableDocs.some(d => d.id === over.id)) {
            targetType = 'available';
        }

        if (sourceType === 'available' && targetType === 'linked') {
            handleLink(activeId);
        } else if (sourceType === 'linked' && targetType === 'available') {
            handleUnlink(activeId);
        }
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    if (!selectedAktivitet) {
        return (
            <div className="flex flex-col h-full bg-white overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Dokument Linker</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <LinkIcon size={48} className="mb-4 opacity-20" />
                    <p>Vælg en aktivitet i listen til venstre for at redigere links.</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full bg-white overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">{selectedAktivitet.aktivitet_nr}</span>
                        <span className="truncate max-w-[400px]" title={selectedAktivitet.aktivitet || ''}>{selectedAktivitet.aktivitet}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex flex-col p-4 overflow-hidden bg-gray-50/50 gap-4">

                    {/* Linked Documents Section */}
                    <div className="flex flex-col min-h-0 shrink-0 max-h-[40%]">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <LinkIcon size={14} className="text-blue-600" />
                            Linkede Dokumenter
                            <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs">{linkedDocs.length}</span>
                        </h5>

                        <div className="flex-1 overflow-y-auto bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                            <SortableContext
                                id="linked-container"
                                items={linkedDocs.map(d => d.id)}
                                strategy={rectSortingStrategy}
                            >
                                {isLoadingDocs ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">Henter skabeloner...</div>
                                ) : linkedDocs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded">
                                        <span>Træk dokumenter hertil for at linke</span>
                                    </div>
                                ) : (
                                    linkedDocs.map(d => (
                                        <SortableDocItem
                                            key={d.id}
                                            doc={d}
                                            type="linked"
                                            onAction={handleUnlink}
                                        />
                                    ))
                                )}
                            </SortableContext>
                        </div>
                    </div>

                    {/* Available Documents Section */}
                    <div className="flex flex-col min-h-0 flex-1">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText size={14} className="text-gray-500" />
                            Tilgængelige Dokumenter
                        </h5>

                        <div className="mb-2 relative">
                            <Search className="absolute left-2 top-2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Søg..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                value={documentSearch}
                                onChange={(e) => setDocumentSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                            <SortableContext
                                id="available-container"
                                items={availableDocs.map(d => d.id)}
                                strategy={rectSortingStrategy}
                            >
                                {isLoadingDocs ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">Henter skabeloner...</div>
                                ) : availableDocs.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        {documentSearch ? "Ingen dokumenter matcher søgningen." : "Ingen flere dokumenter tilgængelige."}
                                    </div>
                                ) : (
                                    availableDocs.map(d => (
                                        <SortableDocItem
                                            key={d.id}
                                            doc={d}
                                            type="available"
                                            onAction={handleLink}
                                        />
                                    ))
                                )}
                            </SortableContext>
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeDragItem ? (
                    <DocItemOverlay doc={activeDragItem.doc} type={activeDragItem.type} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
