import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ReceiptText, Search, Loader2, ArrowUp, ArrowDown, Download,
    ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { SagsPunktafgift } from '../../types';
import { SagService } from '../../services/SagService';
import { useAppState } from '../../StateContext';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../../hooks/useDebounce';
import { usePunktafgift } from '../../contexts/PunktafgiftContext';
import dayjs from 'dayjs';
import 'dayjs/locale/da';

dayjs.locale('da');

const SORT_MAPPING: Record<string, string> = {
    'sag_sags_nr': 'sag__sags_nr',
    'sag_alias': 'sag__alias',
    'sag_maegler_sagsnr': 'sag__maegler_sagsnr',
    'sag_maegler_navn': 'sag__maegler_virksomhed__navn',
    'dato_opkraevet': 'dato_opkraevet',
    'beloeb': 'beloeb',
    'sagsidentification': 'sagsidentification'
};

const PunktafgiftOversigt = () => {
    const navigate = useNavigate();
    const { dispatch: appDispatch } = useAppState();
    const { state: punktafgiftState, dispatch: punktafgiftDispatch } = usePunktafgift();

    const { lines, totalCount, page, filters, sortConfig, erDataHentet } = punktafgiftState;
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const isFirstMount = useRef(true);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const doFetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const ordering = `${sortConfig.direction === 'desc' ? '-' : ''}${SORT_MAPPING[sortConfig.key] || sortConfig.key}`;

            const response = await SagService.getAllPunktafgifter({
                page,
                page_size: 50,
                search: filters.search,
                afregnet: filters.afregnet,
                ordering
            });

            punktafgiftDispatch({
                type: 'SET_PUNKTAFGIFT_STATE',
                payload: {
                    lines: response.results,
                    totalCount: response.count,
                    erDataHentet: true
                }
            });
        } catch (error) {
            console.error("Fejl ved hentning af punktafgiftsdata:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, filters.search, filters.afregnet, sortConfig.key, sortConfig.direction, punktafgiftDispatch]);

    useEffect(() => {
        if (!erDataHentet) {
            doFetch();
        }
        isFirstMount.current = false;
    }, []);

    useEffect(() => {
        if (isFirstMount.current) return;
        doFetch();
    }, [page, filters.search, filters.afregnet, sortConfig.key, sortConfig.direction]);

    useEffect(() => {
        if (isFirstMount.current) return;
        if (debouncedSearch !== filters.search) {
            punktafgiftDispatch({
                type: 'SET_PUNKTAFGIFT_STATE',
                payload: {
                    filters: { ...filters, search: debouncedSearch },
                    page: 1
                }
            });
        }
    }, [debouncedSearch]);

    const handleUpdateLine = async (id: number, data: Partial<SagsPunktafgift>) => {
        setIsSaving(true);
        try {
            const updatedLine = await SagService.updatePunktafgift(id, data);
            punktafgiftDispatch({
                type: 'SET_PUNKTAFGIFT_STATE',
                payload: { lines: lines.map(l => l.id === id ? updatedLine : l) }
            });
        } catch (error) {
            console.error("Fejl ved opdatering af punktafgift:", error);
            doFetch();
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoToSag = (line: SagsPunktafgift) => {
        if (line.sag) {
            appDispatch({ type: 'SET_VALGT_SAG', payload: { id: line.sag, sags_nr: line.sag_sags_nr || '' } as any });
            navigate('/sagsdetaljer');
        }
    };

    const requestSort = (key: string) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
        punktafgiftDispatch({
            type: 'SET_PUNKTAFGIFT_STATE',
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
            const response = await SagService.getAllPunktafgifter({
                page_size: 5000,
                search: filters.search,
                afregnet: filters.afregnet,
                ordering
            });

            const headers = [
                'Sagsnr', 'Mæglers sagsnr', 'Alias', 'Mægler', 'Sagsidentification',
                'Beløb', 'Opkrævet', 'Modtaget', 'Dok. anmeldt', 'Afregnet skat', 'Afregnet den', 'Kontaktperson'
            ];

            const rows = response.results.map(line => [
                line.sag_sags_nr || '',
                line.sag_maegler_sagsnr || '',
                line.sag_alias || '',
                line.sag_maegler_navn || '',
                line.sagsidentification || '',
                line.beloeb || '',
                line.dato_opkraevet ? dayjs(line.dato_opkraevet).format('DD-MM-YYYY') : '',
                line.dato_modtaget ? dayjs(line.dato_modtaget).format('DD-MM-YYYY') : '',
                line.dato_dokument_anmeldt ? dayjs(line.dato_dokument_anmeldt).format('DD-MM-YYYY') : '',
                line.afregnet_skat ? 'Ja' : 'Nej',
                line.dato_afregnet_skat ? dayjs(line.dato_afregnet_skat).format('DD-MM-YYYY') : '',
                line.kontaktperson_navn || ''
            ]);

            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `punktafgifter_${dayjs().format('YYYY-MM-DD')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Fejl under eksport:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / 50);

    const SortableHeader = ({ label, sortField, className = '' }: { label: string; sortField: string; className?: string }) => (
        <th
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none transition-colors ${className}`}
            onClick={() => requestSort(sortField)}
        >
            {label}{getSortIcon(sortField)}
        </th>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end items-center mb-2 gap-4">
                {(isSaving || isLoading) && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-full border border-purple-100 animate-pulse">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                            {isLoading ? 'Henter...' : 'Gemmer...'}
                        </span>
                    </div>
                )}
                <button
                    onClick={handleExport}
                    disabled={totalCount === 0 || isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-xs font-semibold uppercase shadow-sm"
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExporting ? 'Eksporterer...' : 'Eksportér CSV'}
                </button>
            </div>

            <div className="mb-4 p-2 bg-gray-300 rounded-lg border border-gray-400 flex flex-wrap gap-3 items-center shadow-inner">
                <div className="relative flex-grow max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Søg..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 h-[30px] w-full border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                    />
                </div>
                <select
                    value={filters.afregnet}
                    onChange={(e) => punktafgiftDispatch({ type: 'SET_PUNKTAFGIFT_STATE', payload: { filters: { ...filters, afregnet: e.target.value }, page: 1 } })}
                    className="px-3 h-[30px] border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                >
                    <option value="all">Alle</option>
                    <option value="ja">Afregnet</option>
                    <option value="nej">Ikke afregnet</option>
                </select>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        disabled={page === 1 || isLoading}
                        onClick={() => punktafgiftDispatch({ type: 'SET_PUNKTAFGIFT_STATE', payload: { page: page - 1 } })}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-opacity"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs font-medium text-gray-700">
                        Side {page} af {totalPages || 1}
                    </span>
                    <button
                        disabled={page >= totalPages || isLoading}
                        onClick={() => punktafgiftDispatch({ type: 'SET_PUNKTAFGIFT_STATE', payload: { page: page + 1 } })}
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
                <table className="w-full text-left border-collapse min-w-[1500px]">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-gray-800 text-white text-[11px]">
                            <SortableHeader label="Sagsnr" sortField="sag_sags_nr" className="w-24" />
                            <SortableHeader label="Mgl. sagsnr" sortField="sag_maegler_sagsnr" className="w-28" />
                            <SortableHeader label="Alias" sortField="sag_alias" className="w-32" />
                            <SortableHeader label="Sagsidentification" sortField="sagsidentification" className="w-48" />
                            <SortableHeader label="Beløb" sortField="beloeb" className="w-28 text-right" />
                            <SortableHeader label="Opkrævet" sortField="dato_opkraevet" className="w-28" />
                            <th className="px-3 py-2 font-semibold uppercase w-28 tracking-wider">Modtaget</th>
                            <th className="px-3 py-2 font-semibold uppercase w-28 tracking-wider">Anmeldt</th>
                            <th className="px-3 py-2 font-semibold uppercase w-24 text-center tracking-wider">Skift Skat</th>
                            <th className="px-3 py-2 font-semibold uppercase w-32 tracking-wider">Afregnet</th>
                            <th className="px-3 py-2 font-semibold uppercase w-36 tracking-wider">Kontaktperson</th>
                            <th className="px-3 py-2 font-semibold uppercase w-12 text-center tracking-wider">🔗</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map(line => (
                            <tr key={line.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors text-[11px]">
                                <td className="px-3 py-2 text-gray-700 font-semibold">{line.sag_sags_nr || '-'}</td>
                                <td className="px-3 py-2 text-gray-500">{line.sag_maegler_sagsnr || '-'}</td>
                                <td className="px-3 py-2 text-gray-700">{line.sag_alias || '-'}</td>
                                <td className="px-3 py-2 text-gray-900 font-medium">{line.sagsidentification || '-'}</td>
                                <td className="px-3 py-2 text-gray-900 text-right font-bold">
                                    {line.beloeb ? new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(parseFloat(line.beloeb)) : '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-700 font-mono">
                                    {line.dato_opkraevet ? dayjs(line.dato_opkraevet).format('DD-MM-YYYY') : '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-700 font-mono">
                                    {line.dato_modtaget ? dayjs(line.dato_modtaget).format('DD-MM-YYYY') : '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-700 font-mono">
                                    {line.dato_dokument_anmeldt ? dayjs(line.dato_dokument_anmeldt).format('DD-MM-YYYY') : '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={line.afregnet_skat}
                                        onChange={(e) => {
                                            const today = dayjs().format('YYYY-MM-DD');
                                            handleUpdateLine(line.id, {
                                                afregnet_skat: e.target.checked,
                                                dato_afregnet_skat: e.target.checked ? today : null
                                            });
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                </td>
                                <td className="px-3 py-2 text-gray-700 font-mono">
                                    {line.dato_afregnet_skat ? dayjs(line.dato_afregnet_skat).format('DD-MM-YYYY') : ''}
                                </td>
                                <td className="px-3 py-2 text-gray-700">{line.kontaktperson_navn || '-'}</td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => handleGoToSag(line)}
                                        className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!isLoading && lines.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-4 py-12 text-center text-gray-400 italic">
                                    Ingen punktafgifter fundet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PunktafgiftOversigt;
