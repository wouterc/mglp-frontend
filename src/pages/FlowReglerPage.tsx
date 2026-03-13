// --- Fil: src/pages/FlowReglerPage.tsx ---
import React, { useState, useEffect, useCallback, ReactElement } from 'react';
import { api } from '../api';
import { SkabelonService } from '../services/SkabelonService';
import type { FlowRegel } from '../types';
import { Plus, Pencil, Trash2, RefreshCw, Copy, Upload, Download } from 'lucide-react';
import FlowRegelForm from '../components/FlowRegelForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAppState } from '../StateContext';

function FlowReglerPage(): ReactElement {
    const { state, dispatch } = useAppState();
    const {
        flowRegler: regler,
        flowReglerIsLoading: isLoading,
        erFlowReglerHentet
    } = state;
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRegel, setSelectedRegel] = useState<FlowRegel | null>(null);

    // Delete state
    const [regelToDelete, setRegelToDelete] = useState<FlowRegel | null>(null);

    // Import state
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const excelInputRef = React.useRef<HTMLInputElement>(null);

    const fetchRegler = useCallback(async () => {
        dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: true } });
        setError(null);
        try {
            const data = await SkabelonService.getFlowRegler();
            dispatch({
                type: 'SET_FLOWREGLER_STATE',
                payload: {
                    flowRegler: data || [],
                    erFlowReglerHentet: true,
                    flowReglerIsLoading: false
                }
            });
        } catch (err: any) {
            console.error('Fejl ved hentning af flow-regler:', err);
            setError(err.message || 'Kunne ikke hente flow-regler');
            dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: false } });
        }
    }, [dispatch]);

    useEffect(() => {
        if (!erFlowReglerHentet) {
            fetchRegler();
        }
    }, [fetchRegler]);

    const handleCreate = () => {
        setSelectedRegel(null);
        setIsFormOpen(true);
    };

    const handleEdit = (regel: FlowRegel) => {
        setSelectedRegel(regel);
        setIsFormOpen(true);
    };

    const handleDuplicate = (regel: FlowRegel) => {
        // Opret en kopi uden ID, så formen tror det er en ny regel
        const { id, navn, ...rest } = regel;
        setSelectedRegel({
            ...rest,
            navn: `Kopi af ${navn}`
        } as FlowRegel);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (regel: FlowRegel) => {
        setRegelToDelete(regel);
    };

    const confirmDelete = async () => {
        if (!regelToDelete) return;
        try {
            await SkabelonService.deleteFlowRegel(regelToDelete.id);
            dispatch({
                type: 'SET_FLOWREGLER_STATE',
                payload: {
                    flowRegler: regler.filter(r => r.id !== regelToDelete.id)
                }
            });
        } catch (err: any) {
            console.error('Fejl ved sletning:', err);
            alert('Kunne ikke slette reglen: ' + (err.message || 'Ukendt fejl'));
        } finally {
            setRegelToDelete(null);
        }
    };

    const handleExport = async () => {
        try {
            const data = await SkabelonService.exportFlowReglerJson();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flow_regler_eksport_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Fejl ved eksport:', err);
            alert('Kunne ikke eksportere: ' + (err.message || 'Ukendt fejl'));
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: true } });
            const text = await file.text();
            const jsonData = JSON.parse(text);

            const response = await SkabelonService.importFlowReglerJson(jsonData);
            alert(response.message || 'Regler importeret succesfuldt!');
            fetchRegler();
        } catch (err: any) {
            console.error('Fejl ved import:', err);
            alert('Kunne ikke importere regler (tjek filformatet): ' + (err.message || 'Ukendt fejl'));
        } finally {
            dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: false } });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await SkabelonService.exportFlowReglerExcel();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flow_regler_eksport_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Fejl ved excel eksport:', err);
            alert('Kunne ikke eksportere til excel: ' + (err.message || 'Ukendt fejl'));
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: true } });
            const response = await SkabelonService.importFlowReglerExcel(formData);
            alert(response.message || 'Regler importeret succesfuldt fra Excel!');
            fetchRegler();
        } catch (err: any) {
            console.error('Fejl ved Excel import:', err);
            alert('Kunne ikke importere regler fra Excel: ' + (err.message || 'Ukendt fejl'));
        } finally {
            dispatch({ type: 'SET_FLOWREGLER_STATE', payload: { flowReglerIsLoading: false } });
            if (excelInputRef.current) {
                excelInputRef.current.value = '';
            }
        }
    };

    // Helper for at vise betingelser læsbart
    const formatBetingelser = (betingelser: Record<string, any[]>) => {
        if (!betingelser || Object.keys(betingelser).length === 0) return 'Ingen betingelser (Gælder alt)';

        return Object.entries(betingelser).map(([key, values]) => {
            return `${key}: ${values.join(', ')}`;
        }).join(' AND ');
    };

    const [filterText, setFilterText] = useState('');

    const filteredRegler = React.useMemo(() => {
        if (!filterText.trim()) return regler;
        const lowerFilter = filterText.toLowerCase();

        return regler.filter(regel => {
            const navn = (regel.navn || '').toLowerCase();
            const trigger = (regel.trigger_aktivitet_navn || 'initialisering (når sag oprettes)').toLowerCase();
            const handling = (regel.handling || '').toLowerCase();
            const maalAkt = (regel.maal_aktivitet_navn || '').toLowerCase();
            const maalDok = (regel.maal_dokument_navn || '').toLowerCase();
            const betingelserStr = formatBetingelser(regel.betingelser).toLowerCase();

            return (
                navn.includes(lowerFilter) ||
                trigger.includes(lowerFilter) ||
                handling.includes(lowerFilter) ||
                maalAkt.includes(lowerFilter) ||
                maalDok.includes(lowerFilter) ||
                betingelserStr.includes(lowerFilter)
            );
        });
    }, [regler, filterText]);

    return (
        <div className="flex flex-col h-full bg-gray-300">
            {/* Header */}
            <div className="flex-none bg-gray-300 border-b border-gray-400 px-4 py-2 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-bold text-gray-900">Workflow Regler</h1>
                    <p className="text-[11px] text-gray-500">Administrer automatiske handlinger baseret på statusændringer.</p>
                </div>

                <div className="flex space-x-2 items-center">
                    <input
                        type="text"
                        placeholder="Søg i oversigten..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-48 text-[11px] px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    />
                    <div className="border-l border-gray-300 mx-1 h-4"></div>
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center px-2 py-1 border border-green-300 shadow-sm text-[11px] font-medium rounded text-green-800 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-1 focus:ring-black"
                        title="Eksporter regler til Excel"
                    >
                        <Download className="h-3.5 w-3.5 mr-1 text-green-600" />
                        Excel
                    </button>
                    <input
                        type="file"
                        accept=".xlsx"
                        ref={excelInputRef}
                        onChange={handleImportExcel}
                        className="hidden"
                    />
                    <button
                        onClick={() => excelInputRef.current?.click()}
                        className="inline-flex items-center px-2 py-1 border border-green-300 shadow-sm text-[11px] font-medium rounded text-green-800 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-1 focus:ring-black"
                        title="Importer regler fra Excel"
                    >
                        <Upload className="h-3.5 w-3.5 mr-1 text-green-600" />
                        Excel
                    </button>
                    <div className="border-l border-gray-300 mx-1"></div>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-[11px] font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
                        title="Eksporter regler til JSON"
                    >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        JSON
                    </button>
                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleImport}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-[11px] font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
                        title="Importer regler fra JSON"
                    >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Importér
                    </button>
                    <div className="border-l border-gray-300 mx-1"></div>
                    <button
                        onClick={fetchRegler}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-[11px] font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
                        title="Opdater liste"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Opdater
                    </button>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-2 py-1 border border-transparent shadow-sm text-[11px] font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-black"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Opret ny regel
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex-none p-2 bg-red-50 border-b border-red-200 text-red-700 text-[11px]">
                    {error}
                </div>
            )}

            {/* Main Content (Table) */}
            <div className="flex-1 overflow-auto bg-gray-300 p-4">
                <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 table-fixed">
                        <thead className="bg-gray-800">
                            <tr>
                                <th scope="col" className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-white sm:pl-6 w-[20%]">Navn</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-white w-[25%]">Trigger</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-white w-[25%]">Betingelser</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-white w-[20%]">Handling</th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-white w-[10%]">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white">
                            {isLoading && regler.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                                        Indlæser regler...
                                    </td>
                                </tr>
                            ) : filteredRegler.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                                        Ingen workflow regler fundet.
                                    </td>
                                </tr>
                            ) : (
                                filteredRegler.map((regel) => (
                                    <tr key={regel.id} className="hover:bg-blue-50/50 group transition-all relative">
                                        <td className="whitespace-nowrap py-1.5 pl-4 pr-3 text-[11px] font-medium text-gray-900 sm:pl-6 truncate relative">
                                            {/* Hover marker */}
                                            <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {regel.navn}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-1.5 text-[11px] text-gray-500 truncate">
                                            {regel.trigger_aktivitet ? (
                                                <span title={regel.trigger_aktivitet_navn || ''}>
                                                    Når: <b>{regel.trigger_aktivitet_navn}</b>
                                                    <br />Status → <b>Færdig</b>
                                                </span>
                                            ) : (
                                                <span><span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Initialisering</span> (Når sag oprettes)</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-1.5 text-[11px] text-gray-500 text-wrap leading-tight">
                                            {formatBetingelser(regel.betingelser)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-1.5 text-[11px] text-gray-500 truncate">
                                            <span className="font-semibold">{regel.handling}</span>
                                            <br />
                                            Mål: {regel.maal_aktivitet ? (
                                                <span title={regel.maal_aktivitet_navn || ''}>Akt: {regel.maal_aktivitet_navn}</span>
                                            ) : regel.maal_dokument ? (
                                                <span title={regel.maal_dokument_navn || ''}>Dok: {regel.maal_dokument_navn}</span>
                                            ) : (
                                                <span className="text-red-500">Mål mangler</span>
                                            )}
                                        </td>
                                        <td className="relative whitespace-nowrap py-1.5 pl-3 pr-4 text-right text-[11px] font-medium sm:pr-6">
                                            <button
                                                onClick={() => handleDuplicate(regel)}
                                                className="text-gray-500 hover:text-gray-900 mr-3 inline-flex items-center"
                                                title="Dupliker"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(regel)}
                                                className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                                                title="Rediger"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(regel)}
                                                className="text-red-600 hover:text-red-900 inline-flex items-center"
                                                title="Slet"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Opret/Rediger */}
            {isFormOpen && (
                <FlowRegelForm
                    regel={selectedRegel}
                    onSave={(savedRegel) => {
                        setIsFormOpen(false);
                        // Hvis vi redigerer en eksisterende regel, opdater den. Ellers tilføj den.
                        if (selectedRegel && selectedRegel.id) {
                            dispatch({
                                type: 'SET_FLOWREGLER_STATE',
                                payload: {
                                    flowRegler: regler.map(r => r.id === savedRegel.id ? savedRegel : r)
                                }
                            });
                        } else {
                            dispatch({
                                type: 'SET_FLOWREGLER_STATE',
                                payload: {
                                    flowRegler: [...regler, savedRegel]
                                }
                            });
                        }
                    }}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!regelToDelete}
                title="Slet Workflow Regel"
                message={`Er du sikker på, at du vil slette reglen "${regelToDelete?.navn}"?`}
                confirmText="Ja, slet"
                cancelText="Nej, fortryd"
                onConfirm={confirmDelete}
                onClose={() => setRegelToDelete(null)}
                isDestructive={true}
            />
        </div>
    );
}

export default FlowReglerPage;
