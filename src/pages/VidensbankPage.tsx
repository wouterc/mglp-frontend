import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, LibraryBig, Filter, Trash2, Edit, ExternalLink, Copy, Share2, FileText, Loader2, ChevronRight, X, MessageCircleHeart, GripVertical, HelpCircle, Save, ChevronDown, Unlink, Archive, Star, ArchiveRestore, Lock } from 'lucide-react';
import { api } from '../api';
import HelpButton from '../components/ui/HelpButton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HjaelpPunkt, Viden, VidensKategori } from '../types';
import { useAppState } from '../StateContext';
// Layout is provided by App.tsx
import VidensbankModal from '../components/vidensbank/VidensbankModal';
import VidensbankViewModal from '../components/vidensbank/VidensbankViewModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Toast, { ToastType } from '../components/ui/Toast';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';

interface VidensbankPageProps {
    standalone?: boolean;
}

interface SortableArticleItemProps {
    viden: Viden;
    onView: (v: Viden) => void;
    onEdit: (v: Viden) => void;
    onCopy: (v: Viden) => void;
    onSend: (v: Viden) => void;
    onUnlink: (v: Viden) => void;
    onArchive: (v: Viden) => void;
    onToggleFavorite: (v: Viden) => void;
    onDelete?: (id: number) => void;
}

const SortableArticleItem: React.FC<SortableArticleItemProps> = ({ viden, onView, onEdit, onCopy, onSend, onUnlink, onArchive, onToggleFavorite }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: viden.id,
        data: { type: 'sortable-article', viden }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            className={`bg-white rounded-xl shadow-md border border-gray-300 border-l-4 p-4 hover:shadow-lg transition-all group relative flex items-center gap-4 ${viden.arkiveret ? 'opacity-60 grayscale-[0.5]' : ''}`}
            style={{ ...style, borderLeftColor: viden.kategori_details?.farve || '#2563eb' }}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-500 p-1">
                <GripVertical size={24} />
            </div>

            <div className="flex-1 min-w-0" onClick={() => onView(viden)}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-block"
                                style={{
                                    backgroundColor: (viden.kategori_details?.farve || '#2563eb') + '15',
                                    color: viden.kategori_details?.farve || '#2563eb'
                                }}
                            >
                                {viden.kategori_details?.navn || 'Ukendt kategori'}
                            </span>
                            {viden.arkiveret && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                    Arkiveret
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-800 leading-tight truncate">{viden.titel}</h3>
                            {viden.favorit && <Star size={16} className="text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(viden); }}
                    className={`p-2 rounded-lg ${viden.favorit ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                    title={viden.favorit ? "Fjern fra favoritter" : "Marker som favorit"}
                >
                    <Star size={18} className={viden.favorit ? "fill-amber-500" : ""} />
                </button>
                <button onClick={() => onSend(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Send til Chat">
                    <MessageCircleHeart size={18} />
                </button>
                <button onClick={() => onCopy(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Kopier link">
                    <Copy size={18} />
                </button>
                <button onClick={() => onEdit(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Rediger">
                    <Edit size={18} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onArchive(viden); }}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                    title={viden.arkiveret ? "Gendan fra arkiv" : "Arkiver"}
                >
                    {viden.arkiveret ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                </button>
                <button onClick={() => onUnlink(viden)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Fjern tilknytning">
                    <Unlink size={18} />
                </button>
            </div>
        </div>
    );
};

const DraggableArticleCard: React.FC<{ viden: Viden; onClick: () => void; onSend: (v: Viden) => void; onCopy: (v: Viden) => void; onEdit: (v: Viden) => void; onDelete: (id: number) => void; onArchive: (v: Viden) => void; onToggleFavorite: (v: Viden) => void }> = ({ viden, onClick, onSend, onCopy, onEdit, onDelete, onArchive, onToggleFavorite }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `draggable-${viden.id}`,
        data: { type: 'article', viden }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`bg-white rounded-xl shadow-md border border-gray-300 border-l-4 p-5 hover:shadow-xl hover:bg-slate-50 transition-all group relative flex flex-col h-full cursor-grab active:cursor-grabbing ${isDragging ? 'rotate-1 shadow-2xl scale-105 border-blue-500' : ''} ${viden.arkiveret ? 'opacity-60 grayscale-[0.5]' : ''}`}
            style={{ ...style, borderLeftColor: viden.kategori_details?.farve || '#2563eb' }}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-4 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block shadow-sm"
                            style={{
                                backgroundColor: (viden.kategori_details?.farve || '#2563eb') + '15',
                                color: viden.kategori_details?.farve || '#2563eb'
                            }}
                        >
                            {viden.kategori_details?.navn || 'Ukendt kategori'}
                        </span>
                        {viden.arkiveret && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                Arkiveret
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-800 leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">{viden.titel}</h3>
                        {viden.favorit && <Star size={18} className="text-amber-400 fill-amber-400 shrink-0" />}
                    </div>
                </div>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(viden); }}
                        className={`p-2 rounded-lg ${viden.favorit ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                        title={viden.favorit ? "Fjern fra favoritter" : "Marker som favorit"}
                    >
                        <Star size={18} className={viden.favorit ? "fill-amber-500" : ""} />
                    </button>
                    <button onClick={() => onSend(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Send til Chat">
                        <MessageCircleHeart size={18} />
                    </button>
                    <button onClick={() => onCopy(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Kopier link">
                        <Copy size={18} />
                    </button>
                    <button onClick={() => onEdit(viden)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Rediger">
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(viden); }}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        title={viden.arkiveret ? "Gendan fra arkiv" : "Arkiver"}
                    >
                        {viden.arkiveret ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                    </button>
                    <button onClick={() => onDelete(viden.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Slet">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div
                className="text-sm text-gray-600 line-clamp-3 mb-4 overflow-hidden pointer-events-none"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(viden.indhold, {
                        ALLOWED_TAGS: ['p', 'br', 'span', 'b', 'i', 'u', 'strong', 'em'],
                        ALLOWED_ATTR: []
                    })
                }}
            />

            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto pointer-events-none">
                <div className="flex items-center gap-3">
                    {viden.link && <ExternalLink size={14} className="text-blue-500" />}
                    {viden.fil && <FileText size={14} className="text-green-500" />}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(viden.oprettet).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

const DroppableHelpPoint: React.FC<{ hp: HjaelpPunkt; active: boolean; onClick: () => void }> = ({ hp, active, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `droppable-hp-${hp.id}`,
        data: { type: 'hjaelpPunkt', hp }
    });

    return (
        <li
            ref={setNodeRef}
            className={`px-3 py-1.5 rounded-md cursor-pointer text-xs transition-all flex items-center justify-between gap-2 border ${isOver ? 'bg-blue-100 border-blue-400 scale-105 shadow-md z-10' : active ? 'bg-blue-100 border-blue-200 text-blue-700 font-semibold shadow-sm' : 'hover:bg-gray-100 border-transparent text-gray-600'}`}
            onClick={onClick}
        >
            <span className="truncate flex-1">{hp.alias}</span>
            <span className={`shrink-0 text-[10px] min-w-[1.25rem] h-5 flex items-center justify-center rounded-full px-1.5 font-bold ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-400 opacity-60'} transition-all`}>
                {hp.artikler?.length || 0}
            </span>
        </li>
    );
};

const VidensbankPage: React.FC<VidensbankPageProps> = ({ standalone = false }) => {
    const navigate = useNavigate();
    const { state } = useAppState();
    const { currentUser } = state;
    const [vidensbank, setVidensbank] = useState<Viden[]>([]);
    const [kategorier, setKategorier] = useState<VidensKategori[]>([]);
    const [hjaelpPunkter, setHjaelpPunkter] = useState<HjaelpPunkt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [valgtKategoriId, setValgtKategoriId] = useState<number | null>(null);
    const [valgtHjaelpPunktId, setValgtHjaelpPunktId] = useState<number | null>(null);
    const [orderedArticles, setOrderedArticles] = useState<Viden[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    // Pagination state
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const ARTICLES_PER_PAGE = 20;

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingViden, setEditingViden] = useState<Viden | undefined>(undefined);
    const [viewingViden, setViewingViden] = useState<Viden | undefined>(undefined);
    const [deletingVidenId, setDeletingVidenId] = useState<number | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isHjaelpPunkterOpen, setIsHjaelpPunkterOpen] = useState(false);
    const [activeArticle, setActiveArticle] = useState<Viden | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: any) => {
        if (event.active.data.current?.type === 'article') {
            setActiveArticle(event.active.data.current.viden);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveArticle(null);
        const { active, over } = event;
        if (!over) return;

        // Case 1: Reordering within a help point
        if (active.data.current?.type === 'sortable-article' && over.data.current?.type === 'sortable-article') {
            if (active.id !== over.id) {
                setOrderedArticles((items) => {
                    const oldIndex = items.findIndex((i) => i.id === active.id);
                    const newIndex = items.findIndex((i) => i.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
            return;
        }

        // Case 2: Dragging an article from main list to a help point in sidebar
        if (active.data.current?.type === 'article' && over.data.current?.type === 'hjaelpPunkt') {
            const article = active.data.current.viden as Viden;
            const hp = over.data.current.hp as HjaelpPunkt;

            try {
                await api.post(`/vidensbank/punkter/${hp.id}/link_article/`, {
                    article_id: article.id
                });
                showToast(`"${article.titel}" er nu tilknyttet "${hp.alias}"`, "success");

                // Refresh help points data
                const res = await api.get<any>('/vidensbank/punkter/');
                const list = Array.isArray(res.results) ? res.results : res;
                setHjaelpPunkter(list);

                // If we are currently viewing this help point, refresh the ordered articles too
                if (valgtHjaelpPunktId === hp.id) {
                    const freshHp = list.find((h: HjaelpPunkt) => h.id === hp.id);
                    if (freshHp && freshHp.artikler_details) {
                        setOrderedArticles(freshHp.artikler_details);
                    }
                }
            } catch (error) {
                console.error("Fejl ved tilknytning af artikel", error);
                showToast("Kunne ikke tilknytte artikel", "error");
            }
        }
    };

    const saveOrder = async () => {
        if (!valgtHjaelpPunktId) return;
        setIsSavingOrder(true);
        try {
            await api.post(`/vidensbank/punkter/${valgtHjaelpPunktId}/reorder/`, {
                article_ids: orderedArticles.map(a => a.id)
            });
            showToast("Rækkefølge gemt", "success");
            // Reload help points to get fresh data
            const res = await api.get<any>('/vidensbank/punkter/');
            const list = Array.isArray(res.results) ? res.results : res;
            setHjaelpPunkter(list);
        } catch (error) {
            console.error("Fejl ved gemning af rækkefølge", error);
            showToast("Kunne ikke gemme rækkefølge", "error");
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const loadInitialData = useCallback(async () => {
        try {
            const [katRes, hjaelpRes] = await Promise.all([
                api.get<VidensKategori[]>('/vidensbank/kategorier/'),
                api.get<any>('/vidensbank/punkter/')
            ]);
            setKategorier(katRes);
            const list = Array.isArray(hjaelpRes.results) ? hjaelpRes.results : hjaelpRes;
            setHjaelpPunkter(list);
        } catch (error) {
            console.error('Fejl ved hentning af initial data', error);
            showToast('Kunne ikke hente kategorier eller hjælpepunkter', 'error');
        }
    }, []);

    // ------------------------------------------------------------
    // Load categories once on component mount
    // ------------------------------------------------------------
    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // ------------------------------------------------------------
    // Persist/restore search term between visits
    // ------------------------------------------------------------
    useEffect(() => {
        const saved = localStorage.getItem('vidensbankSearch');
        if (saved) {
            setSearchTerm(saved);
        }
    }, []);

    const fetchArticles = async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (valgtKategoriId) params.append('kategori', valgtKategoriId.toString());
            if (showArchived) params.append('show_archived', 'true');

            params.append('limit', ARTICLES_PER_PAGE.toString());
            const currentOffset = isLoadMore ? vidensbank.length : 0;
            params.append('offset', currentOffset.toString());

            const videnRes = await api.get<Viden[]>(`/vidensbank/artikler/?${params.toString()}`);

            if (isLoadMore) {
                setVidensbank(prev => [...prev, ...videnRes]);
            } else {
                setVidensbank(videnRes);
                // Scroll to top on new search/category
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }
            setHasMore(videnRes.length === ARTICLES_PER_PAGE);
        } catch (error) {
            console.error('Fejl ved hentning af artikler', error);
            showToast('Kunne ikke hente artikler', 'error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // ------------------------------------------------------------
    // Initial fetch and filter changes
    // ------------------------------------------------------------
    useEffect(() => {
        if (!valgtHjaelpPunktId) {
            localStorage.setItem('vidensbankSearch', searchTerm);
            if (!searchTerm && !valgtKategoriId) {
                setVidensbank([]);
                setLoading(false);
                setHasMore(false);
                return;
            }

            setLoading(true);
            const timer = setTimeout(() => {
                fetchArticles(false);
            }, searchTerm ? 300 : 0);

            return () => clearTimeout(timer);
        } else {
            // If help point is selected, we show its articles
            const hp = hjaelpPunkter.find(h => h.id === valgtHjaelpPunktId);
            if (hp && hp.artikler_details) {
                setOrderedArticles(hp.artikler_details);
            } else if (hp) {
                // Fetch full details if needed (though prefetch should have handled it)
                api.get<HjaelpPunkt>(`/vidensbank/punkter/${valgtHjaelpPunktId}/`).then(res => {
                    setOrderedArticles(res.artikler_details || []);
                });
            }
        }
    }, [searchTerm, valgtKategoriId, valgtHjaelpPunktId, hjaelpPunkter, showArchived]);

    const handleScroll = () => {
        if (!scrollContainerRef.current || loading || loadingMore || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            fetchArticles(true);
        }
    };

    // Deep linking: Open modal if ID is in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) return;

        const articleInList = vidensbank.find(v => v.id === Number(id));
        if (articleInList) {
            setViewingViden(articleInList);
            setIsViewModalOpen(true);
        } else if (!loading && !loadingMore) {
            // Fetch single article if not in list
            const fetchSingle = async () => {
                try {
                    const res = await api.get<Viden>(`/vidensbank/artikler/${id}/`);
                    setViewingViden(res);
                    setIsViewModalOpen(true);
                } catch (error) {
                    console.error('Fejl ved hentning af specifik artikel', error);
                }
            };
            fetchSingle();
        }
    }, [loading, vidensbank, window.location.search]);

    const filteredViden = React.useMemo(() => vidensbank, [vidensbank]);

    const handleCopyLink = async (v: Viden) => {
        try {
            const url = `${window.location.origin}/vidensbank?id=${v.id}`;
            await navigator.clipboard.writeText(url);
            showToast("Link kopieret til udklipsholder", "success");
        } catch (err) {
            showToast("Kunne ikke kopiere link", "error");
        }
    };

    const handleSendToChat = (v: Viden) => {
        const url = `${window.location.origin}/vidensbank?id=${v.id}`;
        const content = `Tjek venligst denne artikel i Vidensbanken: <a href="${url}">${v.titel}</a>`;
        navigate('/kommunikation', { state: { initialMessage: content, initialLinkUrl: url, initialLinkTitle: v.titel } });
    };

    const handleDelete = async () => {
        if (!deletingVidenId) return;
        try {
            await api.delete(`/vidensbank/artikler/${deletingVidenId}/`);
            setVidensbank(prev => prev.filter(v => v.id !== deletingVidenId));
            showToast("Artikel slettet", "success");
            loadInitialData(); // Refresh counts
        } catch (error) {
            showToast("Kunne ikke slette artikel", "error");
        }
        setDeletingVidenId(null);
    };

    const handleUnlink = async (v: Viden) => {
        if (!valgtHjaelpPunktId) return;
        try {
            await api.post(`/vidensbank/punkter/${valgtHjaelpPunktId}/unlink_article/`, {
                article_id: v.id
            });
            showToast(`"${v.titel}" er nu fjernet fra dette hjælpepunkt`, "success");
            // Refresh help points and the current list
            await loadInitialData();
            // Refresh the orderedArticles list since we are in a help point view
            const hjaelpRes = await api.get<any>('/vidensbank/punkter/');
            const list = Array.isArray(hjaelpRes.results) ? hjaelpRes.results : hjaelpRes;
            const freshHp = list.find((h: HjaelpPunkt) => h.id === valgtHjaelpPunktId);
            if (freshHp && freshHp.artikler_details) {
                setOrderedArticles(freshHp.artikler_details);
            } else {
                setOrderedArticles([]);
            }
        } catch (error) {
            console.error("Fejl ved fjernelse af tilknytning", error);
            showToast("Kunne ikke fjerne tilknytning", "error");
        }
    };

    const handleSave = async () => {
        await fetchArticles(false);
        await loadInitialData(); // Refresh counts
        setIsModalOpen(false);
        setEditingViden(undefined);
    };

    const handleArchive = async (v: Viden) => {
        try {
            const newValue = !v.arkiveret;
            await api.patch(`/vidensbank/artikler/${v.id}/`, { arkiveret: newValue });
            showToast(newValue ? "Artikel arkiveret" : "Artikel gendannet", "success");

            // Opdater listen lokalt eller genindlæs
            if (!showArchived && newValue) {
                // Hvis vi ikke viser arkiverede og den blev arkiveret, fjern den fra listen
                setVidensbank(prev => prev.filter(item => item.id !== v.id));
                setOrderedArticles(prev => prev.filter(item => item.id !== v.id));
            } else {
                // Ellers bare opdater flaget
                const updater = (prev: Viden[]) => prev.map(item => item.id === v.id ? { ...item, arkiveret: newValue } : item);
                setVidensbank(updater);
                setOrderedArticles(updater);
            }
            loadInitialData(); // Refresh counts
        } catch (error) {
            showToast("Kunne ikke opdatere arkiv-status", "error");
        }
    };

    const handleToggleFavorite = async (v: Viden) => {
        try {
            const newValue = !v.favorit;
            await api.patch(`/vidensbank/artikler/${v.id}/`, { favorit: newValue });
            showToast(newValue ? "Tilføjet til favoritter" : "Fjernet fra favoritter", "success");

            // Opdater listen lokalt
            const updater = (prev: Viden[]) => {
                const updated = prev.map(item => item.id === v.id ? { ...item, favorit: newValue } : item);
                // Sorter hvis vi ikke er i et hjælpepunkt (hvor rækkefølgen er manuel)
                if (!valgtHjaelpPunktId) {
                    return [...updated].sort((a, b) => {
                        if (a.favorit === b.favorit) {
                            return new Date(b.oprettet).getTime() - new Date(a.oprettet).getTime();
                        }
                        return a.favorit ? -1 : 1;
                    });
                }
                return updated;
            };
            setVidensbank(updater);
            setOrderedArticles(updater);
        } catch (error) {
            showToast("Kunne ikke opdatere favorit-status", "error");
        }
    };

    if (standalone) {
        return (
            <div className="h-full bg-gray-50 flex flex-col overflow-hidden relative">
                {!viewingViden && (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Henter vejledning...</p>
                    </div>
                )}
                {viewingViden && (
                    <div className="flex-1 overflow-y-auto bg-white article-preview-container">
                        <div className="p-8 max-w-4xl mx-auto">
                            <h1 className="text-3xl font-black text-gray-900 border-b-4 pb-4 mb-6" style={{ borderColor: viewingViden.kategori_details?.farve || '#2563eb' }}>
                                {viewingViden.titel}
                            </h1>

                            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm mb-10 overflow-hidden vidensbank-view-read-only">
                                <ReactQuill
                                    value={viewingViden.indhold}
                                    readOnly={true}
                                    theme="bubble"
                                    modules={{ toolbar: false }}
                                    className="text-gray-900"
                                />
                            </div>

                            {/* Attachments & Links */}
                            {(viewingViden.link || viewingViden.fil) && (
                                <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
                                    {viewingViden.link && (
                                        <a
                                            href={viewingViden.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-bold text-sm border-2 border-blue-100 shadow-sm"
                                        >
                                            <ExternalLink size={20} />
                                            Åbn Eksternt Link
                                        </a>
                                    )}
                                    {viewingViden.fil && (
                                        <a
                                            href={viewingViden.fil}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all font-bold text-sm border-2 border-green-100 shadow-sm"
                                        >
                                            <FileText size={20} />
                                            Se Vedhæftet Dokument
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={toast.isVisible}
                    onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                />
            </div>
        );
    }

    return (
        <>
            <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <LibraryBig className="text-blue-600" size={32} />
                            Vidensbank
                            <HelpButton helpPointCode="VIDENSBANK_HELP" className="ml-2" />
                        </h1>
                        <p className="text-gray-500 mt-1">Samling af viden, skabeloner og vejledninger til sagsbehandling.</p>
                    </div>
                    <button
                        onClick={() => { setEditingViden(undefined); setIsModalOpen(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all font-semibold"
                    >
                        <Plus size={20} />
                        Tilføj ny viden
                    </button>
                </header>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-6 flex-1 min-h-0">
                        {/* Sidebar / Filter */}
                        <aside className="w-64 flex flex-col gap-6 shrink-0">
                            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-300">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Filter size={14} />
                                    Kategorier
                                    {valgtKategoriId && (
                                        <button
                                            onClick={() => setValgtKategoriId(null)}
                                            className="ml-auto text-blue-600 hover:text-blue-800 normal-case text-xs font-medium"
                                        >
                                            Ryd
                                        </button>
                                    )}
                                </h2>
                                <div className="mb-2 pb-2 border-b border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={showArchived}
                                                onChange={() => setShowArchived(!showArchived)}
                                            />
                                            <div className={`block w-9 h-5 rounded-full transition-colors ${showArchived ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showArchived ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Vis arkiverede</span>
                                    </label>
                                </div>
                                <ul className="space-y-1">
                                    <li
                                        className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${(!valgtKategoriId && !valgtHjaelpPunktId) ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-600'}`}
                                        onClick={() => { setValgtKategoriId(null); setValgtHjaelpPunktId(null); }}
                                    >
                                        Alle
                                    </li>
                                    {kategorier
                                        .filter(kat => !kat.er_privat || (kat.artikler_count && kat.artikler_count > 0))
                                        .map(kat => (
                                            <li
                                                key={kat.id}
                                                className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors flex items-center justify-between gap-2 ${valgtKategoriId === kat.id ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}
                                                onClick={() => { setValgtKategoriId(kat.id); setValgtHjaelpPunktId(null); }}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: kat.farve }}></span>
                                                    <span className="truncate">{kat.navn}</span>
                                                    {kat.er_privat && <Lock size={12} className="text-gray-400 shrink-0" />}
                                                </div>
                                                <span className={`shrink-0 text-[10px] min-w-[1.25rem] h-5 flex items-center justify-center rounded-full px-1.5 font-bold ${valgtKategoriId === kat.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-400 opacity-60'} transition-all`}>
                                                    {kat.artikler_count || 0}
                                                </span>
                                            </li>
                                        ))}
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl shadow-md border border-gray-300 overflow-hidden">
                                <button
                                    onClick={() => setIsHjaelpPunkterOpen(!isHjaelpPunkterOpen)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <HelpCircle size={14} />
                                        Hjælpepunkter
                                    </h2>
                                    {isHjaelpPunkterOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                </button>

                                {isHjaelpPunkterOpen && (
                                    <div className="border-t border-gray-100 mt-[-4px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                        <ul className="space-y-1 p-3">
                                            {hjaelpPunkter.map(hp => (
                                                <DroppableHelpPoint
                                                    key={hp.id}
                                                    hp={hp}
                                                    active={valgtHjaelpPunktId === hp.id}
                                                    onClick={() => { setValgtHjaelpPunktId(hp.id); setValgtKategoriId(null); }}
                                                />
                                            ))}
                                            {hjaelpPunkter.length === 0 && (
                                                <li className="px-3 py-2 text-xs text-gray-400 italic">Ingen hjælpepunkter</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className="flex-1 flex flex-col gap-6 min-h-0">
                            {/* Search Bar */}
                            <div className="bg-white p-2 rounded-xl shadow-md border border-gray-300 relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Søg i titel eller tekst..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-gray-700 outline-none"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Tøm søgefelt"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {/* List of Knowledge */}
                            <div
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
                            >
                                {loading && !valgtHjaelpPunktId ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="animate-spin text-blue-600" size={48} />
                                    </div>
                                ) : valgtHjaelpPunktId ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                            <div>
                                                <h2 className="text-xl font-black text-amber-900">Bestem rækkefølge</h2>
                                                <p className="text-sm text-amber-700">Træk i ikonet til venstre for at ændre rækkefølgen af hjælpetekster.</p>
                                            </div>
                                            <button
                                                onClick={saveOrder}
                                                disabled={isSavingOrder}
                                                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 shadow-md font-bold flex items-center gap-2 disabled:bg-amber-400 transition-all"
                                            >
                                                {isSavingOrder ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                                Gem rækkefølge
                                            </button>
                                        </div>

                                        <SortableContext
                                            items={orderedArticles.map(a => a.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="grid grid-cols-1 gap-4">
                                                {orderedArticles.map(v => (
                                                    <SortableArticleItem
                                                        key={v.id}
                                                        viden={v}
                                                        onView={(v) => { setViewingViden(v); setIsViewModalOpen(true); }}
                                                        onEdit={(v) => { setEditingViden(v); setIsModalOpen(true); }}
                                                        onCopy={handleCopyLink}
                                                        onSend={handleSendToChat}
                                                        onUnlink={handleUnlink}
                                                        onArchive={handleArchive}
                                                        onToggleFavorite={handleToggleFavorite}
                                                    />
                                                ))}
                                                {orderedArticles.length === 0 && (
                                                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                                        <HelpCircle className="mx-auto text-gray-100 mb-4" size={64} />
                                                        <p className="text-gray-400 font-medium">Der er ingen artikler tilknyttet dette hjælpepunkt.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </SortableContext>
                                    </div>
                                ) : filteredViden.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                        <LibraryBig className="mx-auto text-gray-100 mb-4" size={64} />
                                        {(!searchTerm && !valgtKategoriId) ? (
                                            <p className="text-gray-400 font-medium">Indtast et emne i søgefeltet eller vælg en kategori for at komme i gang.</p>
                                        ) : (
                                            <>
                                                <p className="text-gray-400 font-medium">Vi fandt ikke noget, der matchede din søgning. Prøv med andre søgeord.</p>
                                                <button
                                                    onClick={() => { setSearchTerm(''); setValgtKategoriId(null); }}
                                                    className="text-blue-600 hover:underline mt-2 text-sm"
                                                >
                                                    Ryd alle filtre
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {filteredViden.map(v => (
                                            <DraggableArticleCard
                                                key={v.id}
                                                viden={v}
                                                onClick={() => { setViewingViden(v); setIsViewModalOpen(true); }}
                                                onSend={handleSendToChat}
                                                onCopy={handleCopyLink}
                                                onEdit={(v) => { setEditingViden(v); setIsModalOpen(true); }}
                                                onDelete={(id) => setDeletingVidenId(id)}
                                                onArchive={handleArchive}
                                                onToggleFavorite={handleToggleFavorite}
                                            />
                                        ))}
                                        {loadingMore && (
                                            <div className="py-4 flex justify-center col-span-full">
                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </main>
                    </div>

                    <DragOverlay>
                        {activeArticle ? (
                            <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-4 w-64 opacity-90 scale-105 cursor-grabbing rotate-2">
                                <h3 className="font-bold text-gray-800 truncate">{activeArticle.titel}</h3>
                                <p className="text-xs text-gray-400">Træk til et hjælpepunkt...</p>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <VidensbankViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                viden={viewingViden}
            />

            <VidensbankModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                editingViden={editingViden}
                kategorier={kategorier}
            />

            <ConfirmModal
                isOpen={!!deletingVidenId}
                onClose={() => setDeletingVidenId(null)}
                onConfirm={handleDelete}
                title="Slet viden"
                message="Er du sikker på at du vil slette denne artikel fra vidensbanken?"
                confirmText="Slet"
                isDestructive={true}
            />

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </>
    );
};

export default VidensbankPage;
