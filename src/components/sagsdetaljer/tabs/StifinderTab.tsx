import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Folder, File, ChevronRight, Upload, Trash2, Edit2, Plus, Download, RefreshCw, MoreVertical, FolderPlus, Home, Move } from 'lucide-react';
import { api } from '../../../api';
import { API_BASE_URL } from '../../../config';
import { useDropzone } from 'react-dropzone';
import ConfirmModal from '../../ui/ConfirmModal';
import PromptModal from '../../ui/PromptModal';
import Toast, { ToastType } from '../../ui/Toast';
import { DndContext, useDraggable, useDroppable, DragEndEvent, useSensors, useSensor, PointerSensor, pointerWithin, closestCenter } from '@dnd-kit/core';
import RenameFileModal from '../../ui/RenameFileModal';
import MoveModal from '../../ui/MoveModal';

interface FileItem {
    name: string;
    is_dir: boolean;
    size: number;
    modified: number;
    path: string;
    linked_info?: {
        id: number;
        titel: string;
        gruppe_navn: string;
        gruppe_nr: number;
    } | null;
}

interface StifinderTabProps {
    sag: {
        id: number;
        sags_nr: string;
    };
}

interface DraggableRowProps {
    item: FileItem;
    sagId: number;
    onOpen: (item: FileItem) => void;
    onRename: (item: FileItem) => void;
    onDelete: (item: FileItem) => void;
    onMove: (item: FileItem) => void;
    formatSize: (size: number) => string;
    formatDate: (mtime: number) => string;
}

const DraggableRow: React.FC<DraggableRowProps> = ({ item, sagId, onOpen, onRename, onDelete, onMove, formatSize, formatDate }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.path,
        data: item,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: item.path,
        disabled: !item.is_dir,
        data: item,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <tr
            ref={(node) => {
                setNodeRef(node);
                if (item.is_dir) setDropRef(node);
            }}
            style={style}
            onClick={() => onOpen(item)}
            className={`
                group transition-colors cursor-pointer border-b border-gray-50
                ${isOver ? 'bg-blue-100/50 outline-2 outline-dashed outline-blue-400' : 'hover:bg-blue-50/30'}
                ${isDragging ? 'shadow-lg bg-white ring-1 ring-blue-200' : ''}
            `}
            {...attributes}
            {...listeners}
        >
            <td className="px-6 py-3 text-center">
                {item.is_dir ?
                    <Folder size={20} className="text-blue-500 fill-blue-50" /> :
                    <File size={20} className={item.linked_info ? "text-red-500 fill-red-50" : "text-gray-400"} />
                }
            </td>
            <td className="px-4 py-3">
                <span className="font-medium text-gray-700">{item.name}</span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
                {formatSize(item.size)}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
                {formatDate(item.modified)}
            </td>
            <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-1 transition-opacity">
                    {!item.is_dir && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const url = `${API_BASE_URL}/sager/filer/download/?sag_id=${sagId}&path=${encodeURIComponent(item.path)}`;
                                window.open(url, '_blank');
                            }}
                            className="p-1.5 bg-white border border-gray-100 rounded shadow-sm text-gray-500 hover:text-green-600 transition"
                            title="Download"
                        >
                            <Download size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove(item); }}
                        className="p-1.5 bg-white border border-gray-100 rounded shadow-sm text-gray-500 hover:text-blue-600 transition"
                        title="Flyt"
                    >
                        <Move size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRename(item); }}
                        className="p-1.5 bg-white border border-gray-100 rounded shadow-sm text-gray-500 hover:text-blue-600 transition"
                        title="Omdøb"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        className="p-1.5 bg-white border border-gray-100 rounded shadow-sm text-gray-500 hover:text-red-600 transition"
                        title="Slet"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const StifinderTab: React.FC<StifinderTabProps> = ({ sag }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get path from URL if present
    const getInitialPath = () => {
        const params = new URLSearchParams(location.search);
        return params.get('f_path') || '';
    };

    const [currentPath, setCurrentPath] = useState(getInitialPath());
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync path to URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const currentUrlPath = params.get('f_path') || '';

        if (currentUrlPath !== currentPath) {
            params.set('f_path', currentPath);
            navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        }
    }, [currentPath, navigate, location.pathname, location.search]);

    // Modal state
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; item: FileItem | null }>({ isOpen: false, item: null });
    const [promptState, setPromptState] = useState<{
        isOpen: boolean;
        type: 'create' | 'rename';
        item: FileItem | null;
        title: string;
        message: string;
        defaultValue: string;
    }>({
        isOpen: false,
        type: 'create',
        item: null,
        title: '',
        message: '',
        defaultValue: ''
    });

    const [renameState, setRenameState] = useState<{
        isOpen: boolean;
        item: FileItem | null;
        initialName: string;
        prefix: string;
        extension: string;
    }>({
        isOpen: false,
        item: null,
        initialName: '',
        prefix: '',
        extension: ''
    });

    // Toast state
    const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
        isVisible: false,
        message: '',
        type: 'info'
    });

    // Move modal state
    const [moveState, setMoveState] = useState<{ isOpen: boolean; item: FileItem | null }>({ isOpen: false, item: null });

    // Blocked state for linked files
    const [blockedInfo, setBlockedInfo] = useState<{
        isOpen: boolean;
        type: 'delete' | 'move';
        item: FileItem | null;
        linked_details?: any;
    }>({ isOpen: false, type: 'delete', item: null });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ isVisible: true, message, type });
    };

    const fetchItems = async (path: string = currentPath) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get<FileItem[]>(`/sager/filer/?sag_id=${sag.id}&path=${encodeURIComponent(path)}`);
            setItems(data);
        } catch (err: any) {
            setError(err.message || 'Kunne ikke hente filer');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [sag.id, currentPath]);

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split('/').filter(p => p);
        return [
            { name: sag.sags_nr, path: '' },
            ...parts.map((p, i) => ({
                name: p,
                path: parts.slice(0, i + 1).join('/')
            }))
        ];
    }, [currentPath, sag.sags_nr]);

    const onDrop = async (acceptedFiles: File[]) => {
        const formData = new FormData();
        formData.append('sag_id', sag.id.toString());
        formData.append('path', currentPath);
        acceptedFiles.forEach(file => {
            formData.append('files', file);
            formData.append('last_modifieds', file.lastModified.toString());
        });

        try {
            await api.post('/sager/filer/upload/', formData);
            showToast('Filer uploadet', 'success');
            fetchItems();
        } catch (err: any) {
            showToast('Fejl ved upload: ' + err.message, 'error');
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true
    });

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (mtime: number) => {
        return new Date(mtime * 1000).toLocaleString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const openCreateFolder = () => {
        setPromptState({
            isOpen: true,
            type: 'create',
            item: null,
            title: 'Ny mappe',
            message: 'Indtast navnet på den nye mappe:',
            defaultValue: ''
        });
    };

    const handleCreateFolder = async (name: string) => {
        if (!name) return;
        try {
            await api.post('/sager/filer/create_folder/', {
                sag_id: sag.id,
                path: currentPath,
                name: name
            });
            showToast('Mappe oprettet', 'success');
            fetchItems();
        } catch (err: any) {
            showToast('Fejl ved oprettelse af mappe: ' + err.message, 'error');
        }
    };

    const openDeleteConfirm = (item: FileItem) => {
        if (item.linked_info) {
            setBlockedInfo({
                isOpen: true,
                type: 'delete',
                item: item,
                linked_details: item.linked_info
            });
            return;
        }
        setConfirmDelete({ isOpen: true, item });
    };

    const handleDelete = async () => {
        const item = confirmDelete.item;
        if (!item) return;
        try {
            await api.post('/sager/filer/delete_entry/', {
                sag_id: sag.id,
                path: item.path
            });
            showToast(`${item.is_dir ? 'Mappe' : 'Fil'} slettet`, 'success');
            setConfirmDelete({ isOpen: false, item: null });
            fetchItems();
        } catch (err: any) {
            if (err.response?.data?.error === 'linked') {
                setConfirmDelete({ isOpen: false, item: null });
                setBlockedInfo({
                    isOpen: true,
                    type: 'delete',
                    item: item,
                    linked_details: err.response.data.details
                });
            } else {
                showToast('Fejl ved sletning: ' + (err.response?.data?.error || err.message), 'error');
            }
        }
    };

    const openRenamePrompt = (item: FileItem) => {
        if (item.is_dir) {
            setPromptState({
                isOpen: true,
                type: 'rename',
                item: item,
                title: 'Omdøb mappe',
                message: `Omdøb "${item.name}" til:`,
                defaultValue: item.name
            });
        } else {
            const lastDotIndex = item.name.lastIndexOf('.');
            let baseName = item.name;
            let extension = '';

            if (lastDotIndex > 0) {
                baseName = item.name.substring(0, lastDotIndex);
                extension = item.name.substring(lastDotIndex);
            }

            // Prefix handling
            const pref = sag.sags_nr ? `${sag.sags_nr}_` : '';
            if (pref) {
                while (baseName.startsWith(pref)) {
                    baseName = baseName.substring(pref.length);
                }
            }

            setRenameState({
                isOpen: true,
                item: item,
                initialName: baseName,
                prefix: pref,
                extension: extension
            });
        }
    };

    const handleRename = async (newName: string) => {
        const item = renameState.isOpen ? renameState.item : promptState.item;
        if (!item || !newName) return;

        let finalName = newName;
        // If it's the RenameFileModal (for files), finalName already contains extension if applicable
        // If it's the PromptModal (for folders), extension logic doesn't apply the same way

        if (!renameState.isOpen && !item.is_dir) {
            const lastDotIndex = item.name.lastIndexOf('.');
            if (lastDotIndex > 0) {
                const extension = item.name.substring(lastDotIndex);
                if (!newName.endsWith(extension)) {
                    finalName = newName + extension;
                }
            }
        }

        setLoading(true);

        // Enforce sagsnummer_ prefix
        const prefix = `${sag.sags_nr}_`;
        if (!finalName.startsWith(prefix)) {
            finalName = prefix + finalName;
        }

        if (finalName === item.name) {
            setPromptState(prev => ({ ...prev, isOpen: false }));
            setRenameState(prev => ({ ...prev, isOpen: false }));
            setLoading(false);
            return;
        }

        try {
            await api.post('/sager/filer/rename_entry/', {
                sag_id: sag.id,
                path: item.path,
                new_name: finalName
            });
            showToast('Omdøbt succesfuldt', 'success');
            setPromptState(prev => ({ ...prev, isOpen: false }));
            setRenameState(prev => ({ ...prev, isOpen: false }));
            fetchItems();
        } catch (err: any) {
            showToast('Fejl ved omdøbning: ' + (err.response?.data?.error || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const item = active.data.current as FileItem;
        const sourcePath = active.id as string;
        let targetPath = over.id as string;

        // If target is a breadcrumb
        if (targetPath.startsWith('breadcrumb-')) {
            targetPath = targetPath.replace('breadcrumb-', '');
        }

        // Don't move to self or if source is same as target
        if (sourcePath === targetPath) return;

        // Block if linked
        if (item.linked_info) {
            setBlockedInfo({
                isOpen: true,
                type: 'move',
                item: item,
                linked_details: item.linked_info
            });
            return;
        }

        try {
            await api.post('/sager/filer/move_entry/', {
                sag_id: sag.id,
                source_path: sourcePath,
                target_path: targetPath
            });
            showToast('Flyttet succesfuldt', 'success');
            fetchItems();
        } catch (err: any) {
            if (err.response?.data?.error === 'linked') {
                const item = items.find(i => i.path === sourcePath);
                setBlockedInfo({
                    isOpen: true,
                    type: 'move',
                    item: item || null,
                    linked_details: err.response.data.details
                });
            } else {
                showToast('Fejl ved flytning: ' + (err.response?.data?.error || err.message), 'error');
            }
        }
    };

    const handleMoveTo = async (targetPath: string) => {
        const item = moveState.item;
        if (!item) return;

        try {
            await api.post('/sager/filer/move_entry/', {
                sag_id: sag.id,
                source_path: item.path,
                target_path: targetPath
            });
            showToast('Flyttet succesfuldt', 'success');
            setMoveState({ isOpen: false, item: null });
            fetchItems();
        } catch (err: any) {
            if (err.response?.data?.error === 'linked') {
                setMoveState({ isOpen: false, item: null });
                setBlockedInfo({
                    isOpen: true,
                    type: 'move',
                    item: item,
                    linked_details: err.response.data.details
                });
            } else {
                showToast('Fejl ved flytning: ' + (err.response?.data?.error || err.message), 'error');
            }
        }
    };

    const handleOpen = (item: FileItem) => {
        if (item.is_dir) {
            setCurrentPath(item.path);
        } else {
            const url = `${API_BASE_URL}/sager/filer/download/?sag_id=${sag.id}&path=${encodeURIComponent(item.path)}&view=1`;
            window.open(url, '_blank');
        }
    };

    const BreadcrumbDropZone: React.FC<{ name: string; path: string; isHome?: boolean; isLast: boolean; showChevron: boolean }> = ({ name, path, isHome, isLast, showChevron }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `breadcrumb-${path}`,
            disabled: isLast,
            data: { type: 'breadcrumb', path }
        });

        return (
            <div ref={setNodeRef} className="flex items-center">
                {showChevron && <ChevronRight size={14} className="text-gray-400 mx-1" />}
                <button
                    onClick={() => setCurrentPath(path)}
                    className={`
                        hover:text-blue-600 px-2 py-1 rounded-md transition flex items-center
                        ${isOver ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400 font-bold scale-105' : ''}
                        ${isLast ? 'font-semibold text-gray-900' : 'text-gray-500'}
                    `}
                >
                    {isHome ? <Home size={16} className="inline mr-1.5" /> : null}
                    {name}
                </button>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[700px]">
            <DndContext
                onDragEnd={handleDragEnd}
                sensors={sensors}
                collisionDetection={pointerWithin}
            >
                {/* Toolbar */}
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center text-sm">
                        {breadcrumbs.map((bc, i) => (
                            <BreadcrumbDropZone
                                key={bc.path}
                                name={bc.name}
                                path={bc.path}
                                isHome={i === 0}
                                isLast={i === breadcrumbs.length - 1}
                                showChevron={i > 0}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={open}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                        >
                            <Upload size={16} className="text-blue-600" />
                            Upload
                        </button>
                        <button
                            onClick={openCreateFolder}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                        >
                            <FolderPlus size={16} className="text-blue-600" />
                            Ny mappe
                        </button>
                        <button
                            onClick={() => fetchItems()}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                            title="Opdater"
                        >
                            <RefreshCw size={16} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* File List */}
                <div
                    {...getRootProps()}
                    className={`flex-1 overflow-y-auto relative ${isDragActive ? 'bg-blue-50/50' : ''}`}
                >
                    <input {...getInputProps()} />

                    {loading && items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <RefreshCw size={32} className="animate-spin mb-2" />
                            <span>Indlæser filer...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Upload size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">Ingen filer her endnu</p>
                            <p className="text-sm">Træk filer herover for at uploade</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-6 py-3 w-12"></th>
                                    <th className="px-4 py-3">Navn</th>
                                    <th className="px-4 py-3 w-32">Størrelse</th>
                                    <th className="px-4 py-3 w-48">Ændret</th>
                                    <th className="px-6 py-3 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((item) => (
                                    <DraggableRow
                                        key={item.path}
                                        item={item}
                                        sagId={sag.id}
                                        onOpen={handleOpen}
                                        onRename={openRenamePrompt}
                                        onDelete={openDeleteConfirm}
                                        onMove={(item) => {
                                            if (item.linked_info) {
                                                setBlockedInfo({
                                                    isOpen: true,
                                                    type: 'move',
                                                    item: item,
                                                    linked_details: item.linked_info
                                                });
                                            } else {
                                                setMoveState({ isOpen: true, item });
                                            }
                                        }}
                                        formatSize={formatSize}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}

                    {isDragActive && (
                        <div className="absolute inset-0 bg-blue-600/10 border-2 border-dashed border-blue-400 flex items-center justify-center z-50 pointer-events-none">
                            <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
                                <Upload size={48} className="text-blue-600 animate-bounce" />
                                <span className="text-xl font-bold text-blue-900">Slip for at uploade</span>
                            </div>
                        </div>
                    )}
                </div>
            </DndContext>

            {/* Footer / Info */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
                <div>{items.length} emner</div>
                <div>Stifinder v1.0</div>
            </div>

            {/* Modals & Toasts */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                title={`Slet ${confirmDelete.item?.is_dir ? 'mappe' : 'fil'}`}
                message={
                    <div>
                        <div className="mb-2">Er du sikker på, at du vil slette</div>
                        <div className="font-semibold text-gray-900 break-all mb-4">"{confirmDelete.item?.name}"?</div>
                        <div className="text-red-600">Dette kan ikke fortrydes.</div>
                    </div>
                }
                confirmText="Slet"
                isDestructive={true}
            />

            <PromptModal
                isOpen={promptState.isOpen}
                onClose={() => setPromptState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={promptState.type === 'create' ? handleCreateFolder : handleRename}
                title={promptState.title}
                message={promptState.message}
                defaultValue={promptState.defaultValue}
                confirmText={promptState.type === 'create' ? 'Opret' : 'Omdøb'}
            />

            <RenameFileModal
                isOpen={renameState.isOpen}
                onClose={() => setRenameState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleRename}
                title="Omdøb fil"
                prefix={renameState.prefix}
                initialName={renameState.initialName}
                extension={renameState.extension}
                isLoading={loading}
            />

            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            <MoveModal
                isOpen={moveState.isOpen}
                onClose={() => setMoveState({ isOpen: false, item: null })}
                onMove={handleMoveTo}
                itemName={moveState.item?.name || ''}
                sagId={sag.id}
            />

            {/* Blocked Information Modal */}
            <ConfirmModal
                isOpen={blockedInfo.isOpen}
                onClose={() => setBlockedInfo({ isOpen: false, type: 'delete', item: null })}
                onConfirm={() => {
                    // Navigate to Tjekliste tab and trigger filtering
                    // This is a bit complex as it depends on how the parent handles tab switching
                    // For now, let's assume we can trigger a global event or update a shared state
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.set('tab', 'tjekliste');
                    searchParams.set('ids', blockedInfo.linked_details?.id);
                    window.location.href = `${window.location.pathname}?${searchParams.toString()}`;
                }}
                title={`Emnet er linket`}
                message={
                    <div className="space-y-3">
                        <div className="font-semibold text-gray-900 break-all">
                            {blockedInfo.item?.name}
                        </div>
                        <div>
                            kan ikke {blockedInfo.type === 'delete' ? 'slettes' : 'flyttes'}, da den er linket til et dokument-emne på tjeklisten:
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-100 space-y-1">
                            <div><span className="text-gray-400">Gruppe:</span> <span className="font-medium text-gray-700">{blockedInfo.linked_details?.gruppe_nr} - {blockedInfo.linked_details?.gruppe_navn}</span></div>
                            <div><span className="text-gray-400">Emne:</span> <span className="font-medium text-gray-700">{blockedInfo.linked_details?.titel}</span></div>
                        </div>
                        <div className="text-gray-600 italic">
                            {blockedInfo.type === 'delete' ? (
                                "Linket skal først slettes på dokument-siden før filen kan slettes."
                            ) : (
                                "Linket skal enten slettes på dokument-siden før filen kan flyttes i Stifinderen, eller flyttes ved at ændre 'Mappe' direkte under emnet på tjeklisten."
                            )}
                        </div>
                    </div>
                }
                confirmText="Vis emnet"
                cancelText="Luk"
                isDestructive={false}
            />
        </div>
    );
};

export default StifinderTab;
