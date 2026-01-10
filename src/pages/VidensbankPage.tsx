import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, LibraryBig, Filter, Trash2, Edit, ExternalLink, Copy, Share2, FileText, Loader2, ChevronRight, X, MessageCircleHeart } from 'lucide-react';
import { api } from '../api';
import { Viden, VidensKategori } from '../types';
import { useAppState } from '../StateContext';
// Layout is provided by App.tsx
import VidensbankModal from '../components/vidensbank/VidensbankModal';
import VidensbankViewModal from '../components/vidensbank/VidensbankViewModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Toast, { ToastType } from '../components/ui/Toast';
import DOMPurify from 'dompurify';

const VidensbankPage: React.FC = () => {
    const navigate = useNavigate();
    const { state } = useAppState();
    const { currentUser } = state;
    const [vidensbank, setVidensbank] = useState<Viden[]>([]);
    const [kategorier, setKategorier] = useState<VidensKategori[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [valgtKategoriId, setValgtKategoriId] = useState<number | null>(null);

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

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    // ------------------------------------------------------------
    // Load categories once on component mount
    // ------------------------------------------------------------
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const katRes = await api.get<VidensKategori[]>('/vidensbank/kategorier/');
                setKategorier(katRes);
            } catch (error) {
                console.error('Fejl ved hentning af kategorier', error);
                showToast('Kunne ikke hente kategorier', 'error');
            }
        };
        loadCategories();
    }, []);

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
        localStorage.setItem('vidensbankSearch', searchTerm);
        if (!searchTerm && !valgtKategoriId) {
            setVidensbank([]);
            setLoading(false);
            setHasMore(false);
            return;
        }

        setLoading(true); // Set loading immediately to show spinner while debouncing
        const timer = setTimeout(() => {
            fetchArticles(false);
        }, searchTerm ? 300 : 0);

        return () => clearTimeout(timer);
    }, [searchTerm, valgtKategoriId]);

    const handleScroll = () => {
        if (!scrollContainerRef.current || loading || loadingMore || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            fetchArticles(true);
        }
    };

    // Deep linking: Open modal if ID is in URL
    useEffect(() => {
        if (!loading && vidensbank.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            if (id) {
                const article = vidensbank.find(v => v.id === Number(id));
                if (article) {
                    setViewingViden(article);
                    setIsViewModalOpen(true);
                }
            }
        }
    }, [loading, vidensbank]);

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
        } catch (error) {
            showToast("Kunne ikke slette artikel", "error");
        }
        setDeletingVidenId(null);
    };

    const handleSave = async () => {
        await fetchArticles(false);
        setIsModalOpen(false);
        setEditingViden(undefined);
    };

    return (
        <>
            <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <LibraryBig className="text-blue-600" size={32} />
                            Vidensbank
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

                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Sidebar / Filter */}
                    <aside className="w-64 flex flex-col gap-6 shrink-0">
                        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-300">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                            <ul className="space-y-1">
                                <li
                                    className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${!valgtKategoriId ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-600'}`}
                                    onClick={() => setValgtKategoriId(null)}
                                >
                                    Alle
                                </li>
                                {kategorier.map(kat => (
                                    <li
                                        key={kat.id}
                                        className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors flex items-center gap-2 ${valgtKategoriId === kat.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-600'}`}
                                        onClick={() => setValgtKategoriId(kat.id)}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: kat.farve }}></span>
                                        {kat.navn}
                                    </li>
                                ))}
                            </ul>
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
                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="animate-spin text-blue-600" size={48} />
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
                                        <div
                                            key={v.id}
                                            className="bg-white rounded-xl shadow-md border border-gray-300 border-l-4 p-4 hover:shadow-lg hover:bg-slate-50 transition-all group relative cursor-pointer"
                                            style={{ borderLeftColor: v.kategori_details?.farve || '#2563eb' }}
                                            onClick={() => { setViewingViden(v); setIsViewModalOpen(true); }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span
                                                        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1 inline-block"
                                                        style={{
                                                            backgroundColor: (v.kategori_details?.farve || '#2563eb') + '15',
                                                            color: v.kategori_details?.farve || '#2563eb'
                                                        }}
                                                    >
                                                        {v.kategori_details?.navn || 'Ukendt kategori'}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-gray-800 leading-tight">{v.titel}</h3>
                                                </div>
                                                <div className="flex items-center gap-0.5 transition-opacity opacity-20 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSendToChat(v)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Send til Chat"
                                                    >
                                                        <MessageCircleHeart size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCopyLink(v)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Kopier link"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingViden(v); setIsModalOpen(true); }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Rediger"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingVidenId(v.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Slet"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div
                                                className="prose prose-sm max-w-none text-gray-600 line-clamp-2 mb-2"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(v.indhold) }}
                                            />

                                            <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-auto text-[10px] text-gray-400">
                                                <div className="flex items-center gap-4">
                                                    {v.link && (
                                                        <a
                                                            href={v.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 flex items-center gap-1 font-semibold hover:underline"
                                                        >
                                                            <ExternalLink size={14} />
                                                            Eksternt Link
                                                        </a>
                                                    )}
                                                    {v.fil && (
                                                        <a
                                                            href={v.fil}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-green-600 flex items-center gap-1 font-semibold hover:underline"
                                                        >
                                                            <FileText size={14} />
                                                            Se vedhæftet fil
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    Oprettet af {v.oprettet_af_details?.first_name || 'System'} • {new Date(v.oprettet).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {loadingMore && (
                                        <div className="py-4 flex justify-center">
                                            <Loader2 className="animate-spin text-blue-600" size={24} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
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
