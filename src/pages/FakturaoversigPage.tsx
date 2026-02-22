// --- Fil: src/pages/FakturaoversigPage.tsx ---
// @# 2026-02-21 - Ny side: Fakturaoversigt - optimeret med server-side pagination, sorting og filtering.
// @# 2026-02-21 - Tilføjet persistence via FakturaContext for at huske filtre, side og sortering.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ReceiptText, Search, Loader2, ArrowUp, ArrowDown, Download,
    MessageSquare, ExternalLink, ChevronLeft, ChevronRight
} from 'lucide-react';
import { FakturaLine, Status } from '../types';
import { SagService } from '../services/SagService';
import { LookupService } from '../services/LookupService';
import { useAppState } from '../StateContext';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { useFaktura } from '../contexts/FakturaContext';
import dayjs from 'dayjs';
import 'dayjs/locale/da';

dayjs.locale('da');

type SortKey = keyof FakturaLine | 'sag_sags_nr' | 'sag_alias' | 'sag_maegler_sagsnr' | 'sag_maegler_navn';

// Mapper frontend sort-nøgler til backend-felter
const SORT_MAPPING: Record<string, string> = {
    'sag_sags_nr': 'sag__sags_nr',
    'sag_alias': 'sag__alias',
    'sag_maegler_sagsnr': 'sag__maegler_sagsnr',
    'sag_maegler_navn': 'sag__maegler_virksomhed__navn',
    'dato': 'dato',
    'pris': 'pris',
    'beskrivelse': 'beskrivelse',
    'faktura_nummer': 'faktura_nummer',
    'varenummer': 'varenummer'
};

function FakturaoversigPage() {
    const navigate = useNavigate();
    const { dispatch: appDispatch } = useAppState();
    const { state: fakturaState, dispatch: fakturaDispatch } = useFaktura();

    const { lines, totalCount, page, filters, sortConfig, erDataHentet } = fakturaState;
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Track om det er første mount – bruges til at undgå dobbelt-fetch
    const isFirstMount = useRef(true);

    // Local filter state for immediate UI feedback (search input)
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Comment Modal
    const [commentModal, setCommentModal] = useState<{ isOpen: boolean; lineId: number | null; kommentar: string }>({
        isOpen: false, lineId: null, kommentar: ''
    });

    // Alert Modal
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false, title: '', message: ''
    });

    // Hent statusser én gang
    useEffect(() => {
        LookupService.getStatusser(4).then(setStatuses);
    }, []);

    // --- Core data fetch ---
    const doFetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const ordering = `${sortConfig.direction === 'desc' ? '-' : ''}${SORT_MAPPING[sortConfig.key] || sortConfig.key}`;

            const response = await SagService.getAllFakturaLines({
                page,
                page_size: 50,
                search: filters.search,
                status: filters.status,
                ordering
            });

            fakturaDispatch({
                type: 'SET_FAKTURA_STATE',
                payload: {
                    lines: response.results,
                    totalCount: response.count,
                    erDataHentet: true
                }
            });
        } catch (error) {
            console.error("Fejl ved hentning af fakturadata:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, filters.search, filters.status, sortConfig.key, sortConfig.direction, fakturaDispatch]);

    // Initial mount: kun hent hvis vi ikke har data fra context
    useEffect(() => {
        if (!erDataHentet) {
            doFetch();
        }
        isFirstMount.current = false;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch ved ændring af filters/sorting/page (men IKKE ved første mount)
    useEffect(() => {
        if (isFirstMount.current) return;
        doFetch();
    }, [page, filters.search, filters.status, sortConfig.key, sortConfig.direction]); // eslint-disable-line react-hooks/exhaustive-deps

    // Synkroniser debounced søgning til context
    useEffect(() => {
        if (isFirstMount.current) return;
        if (debouncedSearch !== filters.search) {
            fakturaDispatch({
                type: 'SET_FAKTURA_STATE',
                payload: {
                    filters: { ...filters, search: debouncedSearch },
                    page: 1
                }
            });
        }
    }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    // Status change handler
    const handleUpdateLine = async (id: number, data: Partial<FakturaLine>) => {
        const line = lines.find(l => l.id === id);
        if (!line) return;

        let finalData = { ...data };

        if (data.status_id) {
            const targetStatus = statuses.find(s => s.id === data.status_id);
            if (targetStatus?.status_nummer === 99 && (line.faktura_nummer || data.faktura_nummer)) {
                setAlertModal({
                    isOpen: true,
                    title: 'Kan ikke annulleres',
                    message: 'Du kan ikke annullere en linje, der har et fakturanummer.'
                });
                return;
            }
        }

        if (data.faktura_nummer && data.faktura_nummer.trim() !== '') {
            if (line.status?.status_nummer === 10) {
                const faktureretStatus = statuses.find(s => s.status_nummer === 20);
                if (faktureretStatus) finalData.status_id = faktureretStatus.id;
            }
        }

        setIsSaving(true);
        try {
            const updatedLine = await SagService.updateFakturaLine(id, finalData);
            fakturaDispatch({
                type: 'SET_FAKTURA_STATE',
                payload: { lines: lines.map(l => l.id === id ? updatedLine : l) }
            });
        } catch (error) {
            console.error("Fejl ved opdatering af fakturalinje:", error);
            doFetch();
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveComment = async () => {
        if (commentModal.lineId === null) return;
        await handleUpdateLine(commentModal.lineId, { kommentar: commentModal.kommentar });
        setCommentModal({ isOpen: false, lineId: null, kommentar: '' });
    };

    const handleGoToSag = (line: FakturaLine) => {
        if (line.sag) {
            appDispatch({ type: 'SET_VALGT_SAG', payload: { id: line.sag, sags_nr: line.sag_sags_nr || '' } as any });
            navigate('/sagsdetaljer');
        }
    };

    const requestSort = (key: SortKey) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
        fakturaDispatch({
            type: 'SET_FAKTURA_STATE',
            payload: { sortConfig: { key, direction }, page: 1 }
        });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="inline-block ml-1 h-3 w-3" />
            : <ArrowDown className="inline-block ml-1 h-3 w-3" />;
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const ordering = `${sortConfig.direction === 'desc' ? '-' : ''}${SORT_MAPPING[sortConfig.key] || sortConfig.key}`;
            const response = await SagService.getAllFakturaLines({
                page_size: 5000,
                search: filters.search,
                status: filters.status,
                ordering
            });

            const headers = [
                'Sagsnr', 'Mæglers sagsnr', 'Alias', 'Mægler', 'Varenummer',
                'Beskrivelse', 'Pris', 'Dato', 'Faktura nr.', 'Status', 'Kommentar'
            ];

            const rows = response.results.map(line => [
                line.sag_sags_nr || '',
                line.sag_maegler_sagsnr || '',
                line.sag_alias || '',
                line.sag_maegler_navn || '',
                line.varenummer || line.vare?.varenummer || '',
                line.beskrivelse,
                line.pris,
                line.dato ? dayjs(line.dato).format('DD-MM-YYYY') : '',
                line.faktura_nummer || '',
                line.status?.beskrivelse || '',
                (line.kommentar || '').replace(/[\n\r]+/g, ' ')
            ]);

            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fakturaoversigt_${dayjs().format('YYYY-MM-DD')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Fejl under eksport:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleStatusFilterChange = (value: string) => {
        fakturaDispatch({
            type: 'SET_FAKTURA_STATE',
            payload: { filters: { ...filters, status: value }, page: 1 }
        });
    };

    const totalPages = Math.ceil(totalCount / 50);

    const SortableHeader = ({ label, sortField, className = '' }: { label: string; sortField: SortKey; className?: string }) => (
        <th
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none transition-colors ${className}`}
            onClick={() => requestSort(sortField)}
        >
            {label}{getSortIcon(sortField)}
        </th>
    );

    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ReceiptText className="text-blue-600" />
                        Fakturaoversigt
                    </h2>
                    {(isSaving || isLoading) && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                                {isLoading ? 'Henter...' : 'Gemmer...'}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleExport}
                    disabled={totalCount === 0 || isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-xs font-semibold uppercase shadow-sm"
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExporting ? 'Eksporterer...' : 'Eksportér CSV'}
                </button>
            </div>

            <div className="mb-4 p-2 bg-gray-300 rounded-lg border border-gray-400 flex flex-wrap gap-3 items-center">
                <div className="relative flex-grow max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Søg..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 h-[30px] w-full border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                </div>
                <select
                    value={filters.status}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    style={{
                        color: filters.status !== 'all' ? (statuses.find(s => s.id.toString() === filters.status)?.farve || '#1F2937') : '#1F2937',
                        fontWeight: filters.status !== 'all' ? 'bold' : 'normal'
                    }}
                    className="px-3 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                    <option value="all">Alle statusser (excl. annulleret)</option>
                    {statuses.map(s => (
                        <option key={s.id} value={s.id} style={{ color: s.farve }}>{s.beskrivelse}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        disabled={page === 1 || isLoading}
                        onClick={() => fakturaDispatch({ type: 'SET_FAKTURA_STATE', payload: { page: page - 1 } })}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-opacity"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs font-medium text-gray-700">
                        Side {page} af {totalPages || 1}
                    </span>
                    <button
                        disabled={page >= totalPages || isLoading}
                        onClick={() => fakturaDispatch({ type: 'SET_FAKTURA_STATE', payload: { page: page + 1 } })}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-opacity"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter ml-2 p-1 bg-white/50 rounded">
                        {totalCount} linjer totalt
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-auto rounded-lg border border-gray-200 shadow-md ${isLoading ? 'opacity-50' : ''}`}>
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-gray-800 text-white">
                            <SortableHeader label="Sagsnr" sortField="sag_sags_nr" className="w-24" />
                            <SortableHeader label="Mgl. sagsnr" sortField="sag_maegler_sagsnr" className="w-28" />
                            <SortableHeader label="Alias" sortField="sag_alias" className="w-32" />
                            <SortableHeader label="Mægler" sortField="sag_maegler_navn" className="w-36" />
                            <SortableHeader label="Varenr" sortField="varenummer" className="w-20" />
                            <SortableHeader label="Beskrivelse" sortField="beskrivelse" />
                            <SortableHeader label="Pris" sortField="pris" className="w-28 text-right" />
                            <SortableHeader label="Dato" sortField="dato" className="w-28" />
                            <SortableHeader label="Faktura nr." sortField="faktura_nummer" className="w-28" />
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider w-44 text-right">Status</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider w-16 text-center">💬</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider w-12 text-center">🔗</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map(line => (
                            <tr key={line.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors text-xs">
                                <td className="px-3 py-2 text-gray-700 font-semibold">{line.sag_sags_nr || '-'}</td>
                                <td className="px-3 py-2 text-gray-500">{line.sag_maegler_sagsnr || '-'}</td>
                                <td className="px-3 py-2 text-gray-700">{line.sag_alias || '-'}</td>
                                <td className="px-3 py-2 text-gray-500">{line.sag_maegler_navn || '-'}</td>
                                <td className="px-3 py-2 text-gray-700">{line.varenummer || line.vare?.varenummer || '-'}</td>
                                <td className="px-3 py-2 text-gray-900 font-medium">{line.beskrivelse}</td>
                                <td className="px-3 py-2 text-gray-900 text-right font-bold">
                                    {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(parseFloat(line.pris))}
                                </td>
                                <td className="px-3 py-2 text-gray-700 font-mono">
                                    {line.dato ? dayjs(line.dato).format('DD-MM-YYYY') : '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-center">{line.faktura_nummer || '-'}</td>
                                <td className="px-3 py-2 text-right">
                                    <select
                                        disabled={isSaving}
                                        value={line.status?.id || ''}
                                        onChange={(e) => handleUpdateLine(line.id, { status_id: parseInt(e.target.value) })}
                                        style={{
                                            color: line.status?.farve || '#4B5563',
                                            borderColor: line.status?.farve || '#D1D5DB',
                                            backgroundColor: (line.status?.farve ? `${line.status.farve}20` : '#F9FAFB'),
                                            borderWidth: '2px'
                                        }}
                                        className="w-full h-[26px] px-1 text-[10px] font-extrabold uppercase rounded border outline-none transition-all focus:ring-1 focus:ring-offset-1"
                                    >
                                        {statuses.map(s => (
                                            <option key={s.id} value={s.id}>{s.beskrivelse}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => setCommentModal({ isOpen: true, lineId: line.id, kommentar: line.kommentar || '' })}
                                        className={`p-1 rounded transition-colors ${line.kommentar ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500'}`}
                                        title={line.kommentar || 'Tilføj kommentar'}
                                    >
                                        <MessageSquare size={16} fill={line.kommentar ? 'currentColor' : 'none'} />
                                    </button>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => handleGoToSag(line)}
                                        className="p-1 rounded text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!isLoading && lines.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-4 py-12 text-center text-gray-400 italic">
                                    Ingen fakturalinjer fundet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Comment Modal */}
            {commentModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-blue-600" />
                            Kommentar
                        </h3>
                        <textarea
                            value={commentModal.kommentar}
                            onChange={(e) => setCommentModal(prev => ({ ...prev, kommentar: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
                            placeholder="Skriv kommentar..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setCommentModal({ isOpen: false, lineId: null, kommentar: '' })}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                Annuller
                            </button>
                            <button
                                onClick={handleSaveComment}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                            >
                                Gem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{alertModal.title}</h3>
                        <p className="text-gray-600 mb-4 text-sm">{alertModal.message}</p>
                        <button
                            onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FakturaoversigPage;
