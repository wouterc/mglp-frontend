import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { Loader2, Link as LinkIcon, Trash2, FileText, ChevronRight, ChevronDown, CheckSquare, Search } from 'lucide-react';
import type { SkabAktivitet, SkabDokument, Blokinfo } from '../../types';
import Tooltip from '../Tooltip';

interface LinkingTabProps {
    blokinfo: Blokinfo[];
}

export default function LinkingTab({ blokinfo }: LinkingTabProps) {
    const [aktiviteter, setAktiviteter] = useState<SkabAktivitet[]>([]);
    const [allDocuments, setAllDocuments] = useState<SkabDokument[]>([]);
    const [loadingActs, setLoadingActs] = useState(true);
    const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

    // Activity Filters
    const [selectedProcesId, setSelectedProcesId] = useState<string>('');
    const [actSearch, setActSearch] = useState('');

    // Document Filters
    const [selectedDocGroupId, setSelectedDocGroupId] = useState<string>('');
    const [docSearch, setDocSearch] = useState('');

    // Data Load
    useEffect(() => {
        const load = async () => {
            setLoadingActs(true);
            try {
                // Fetch all activities (limit 1000 for now, paging later if needed)
                const resActs = await api.get<{ results: SkabAktivitet[] }>('/skabeloner/aktiviteter/?page_size=1000');
                setAktiviteter(resActs.results || []);

                // Fetch all documents
                const resDocs = await api.get<{ results: SkabDokument[] }>('/skabeloner/dokumenter/?page_size=2000');
                setAllDocuments(resDocs.results || []);
            } catch (e) {
                console.error("Failed to load data", e);
            } finally {
                setLoadingActs(false);
            }
        };
        load();
    }, []);

    // Derived Data
    const processes = useMemo(() => blokinfo.filter(b => b.formaal === 1), [blokinfo]);
    const docGroups = useMemo(() => blokinfo.filter(b => b.formaal === 3), [blokinfo]);

    const filteredActivities = useMemo(() => {
        return aktiviteter.filter(a => {
            if (selectedProcesId && a.proces?.id?.toString() !== selectedProcesId) return false;
            if (actSearch && !a.aktivitet?.toLowerCase().includes(actSearch.toLowerCase())) return false;
            return true;
        });
    }, [aktiviteter, selectedProcesId, actSearch]);

    const filteredDocuments = useMemo(() => {
        return allDocuments.filter(d => {
            if (selectedDocGroupId && d.gruppe?.id?.toString() !== selectedDocGroupId) return false;
            if (docSearch) {
                const term = docSearch.toLowerCase();
                return (d.dokument?.toLowerCase().includes(term) || d.dokument_nr?.toString().includes(term));
            }
            return true;
        });
    }, [allDocuments, selectedDocGroupId, docSearch]);

    const selectedActivity = useMemo(() =>
        aktiviteter.find(a => a.id === selectedActivityId),
        [aktiviteter, selectedActivityId]);

    // Linking Logic
    const handleLinkDocument = async (docId: number) => {
        if (!selectedActivity) return;
        // Optimistic update
        const prevActs = [...aktiviteter];
        setAktiviteter(prev => prev.map(a => {
            if (a.id === selectedActivity.id) {
                // Check if already linked
                if (a.dokumenter?.includes(docId)) return a;
                return { ...a, dokumenter: [...(a.dokumenter || []), docId] };
            }
            return a;
        }));

        try {
            await api.post(`/skabeloner/aktiviteter/${selectedActivity.id}/link_document/`, { document_id: docId });
        } catch (e) {
            console.error("Link failed", e);
            setAktiviteter(prevActs); // Revert
        }
    };

    const handleUnlinkDocument = async (docId: number) => {
        if (!selectedActivity) return;
        // Optimistic update
        const prevActs = [...aktiviteter];
        setAktiviteter(prev => prev.map(a => {
            if (a.id === selectedActivity.id) {
                return { ...a, dokumenter: (a.dokumenter || []).filter(id => id !== docId) };
            }
            return a;
        }));

        try {
            await api.post(`/skabeloner/aktiviteter/${selectedActivity.id}/unlink_document/`, { document_id: docId });
        } catch (e) {
            console.error("Unlink failed", e);
            setAktiviteter(prevActs);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, docId: number) => {
        e.dataTransfer.setData('docId', docId.toString());
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const docId = parseInt(e.dataTransfer.getData('docId'));
        if (docId && selectedActivity) {
            handleLinkDocument(docId);
        }
    };

    // Linked Docs resolved
    const linkedDocs = useMemo(() => {
        if (!selectedActivity || !selectedActivity.dokumenter) return [];
        return selectedActivity.dokumenter.map(id => allDocuments.find(d => d.id === id)).filter(Boolean) as SkabDokument[];
    }, [selectedActivity, allDocuments]);

    return (
        <div className="flex flex-1 h-full gap-4 p-4 overflow-hidden">

            {/* Left Column: Activities */}
            <div className="w-1/3 flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CheckSquare size={18} /> Aktiviteter
                    </h3>
                    <div className="mt-2 space-y-2">
                        <select
                            className="w-full text-sm border p-1 rounded"
                            value={selectedProcesId}
                            onChange={(e) => setSelectedProcesId(e.target.value)}
                        >
                            <option value="">Alle processer</option>
                            {processes.map(p => <option key={p.id} value={p.id}>{p.nr} - {p.titel_kort}</option>)}
                        </select>
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                            <input
                                className="w-full pl-8 text-sm border p-1 rounded"
                                placeholder="Søg i aktiviteter..."
                                value={actSearch}
                                onChange={(e) => setActSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingActs ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : (
                        <ul>
                            {filteredActivities.map(act => {
                                const isSelected = act.id === selectedActivityId;
                                return (
                                    <li
                                        key={act.id}
                                        onClick={() => setSelectedActivityId(act.id)}
                                        className={`px-2 py-0.5 border-b cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs h-7 ${isSelected ? 'bg-blue-50 border-blue-500 border-l-4' : 'border-l-4 border-transparent'}`}
                                    >
                                        <span className="text-gray-500 font-mono whitespace-nowrap flex-shrink-0 w-12">
                                            {act.proces?.nr}.{act.gruppe?.nr}.{act.aktivitet_nr}
                                        </span>
                                        <span className="font-medium text-gray-800 truncate flex-1" title={act.aktivitet || ''}>
                                            {act.aktivitet}
                                        </span>
                                        <ChevronRight size={12} className={`text-gray-300 flex-shrink-0 ${isSelected ? 'text-blue-500' : ''}`} />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="p-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
                    {filteredActivities.length} aktiviteter
                </div>
            </div>

            {/* Right Column: Documents & Linking */}
            <div className="w-2/3 flex flex-col gap-4">

                {/* Top: Linked Documents Area */}
                <div
                    className={`flex-shrink-0 min-h-[150px] max-h-[300px] overflow-y-auto bg-white rounded-lg shadow border-2 transition-colors ${selectedActivity ? 'border-dashed border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="p-3 border-b border-gray-200/50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <LinkIcon size={18} />
                            {selectedActivity ? `Linkede Dokumenter til "${selectedActivity.aktivitet}"` : 'Vælg en aktivitet for at se links'}
                        </h3>
                        {selectedActivity && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{linkedDocs.length}</span>}
                    </div>

                    {!selectedActivity ? (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                            <ChevronDown size={24} className="mb-2" />
                            <p>Vælg en aktivitet til venstre</p>
                        </div>
                    ) : (
                        <div className="p-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {linkedDocs.length === 0 ? (
                                <div className="col-span-2 text-center py-8 text-gray-400">
                                    træk dokumenter herop for at linke dem
                                </div>
                            ) : (
                                linkedDocs.map(doc => (
                                    <div key={doc.id} className="bg-white border border-blue-200 rounded px-2 py-0.5 flex items-center justify-between group shadow-sm h-7">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <FileText size={14} className="text-blue-500 flex-shrink-0" />
                                            <span className="text-xs text-gray-500 font-mono w-10 flex-shrink-0">{doc.gruppe?.nr}.{doc.dokument_nr}</span>
                                            <span className="text-xs truncate font-medium text-gray-800" title={doc.dokument || ''}>{doc.dokument}</span>
                                        </div>
                                        <button
                                            onClick={() => handleUnlinkDocument(doc.id)}
                                            className="text-gray-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Fjern link"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom: All Documents Selector */}
                <div className="flex-1 flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    {/* Filter Header */}
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-2">
                        <div className="w-1/3">
                            <select
                                className="w-full text-sm border p-1.5 rounded"
                                value={selectedDocGroupId}
                                onChange={(e) => setSelectedDocGroupId(e.target.value)}
                            >
                                <option value="">Alle grupper</option>
                                {docGroups.map(g => <option key={g.id} value={g.id}>{g.nr} - {g.titel_kort}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 relative">
                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                            <input
                                className="w-full pl-8 text-sm border p-1 rounded"
                                placeholder="Søg i dokumenter..."
                                value={docSearch}
                                onChange={(e) => setDocSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {filteredDocuments.map(doc => {
                                const isLinked = selectedActivity?.dokumenter?.includes(doc.id);
                                return (
                                    <div
                                        key={doc.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, doc.id)}
                                        className={`border rounded px-2 py-0.5 flex items-center gap-2 select-none group transition-all h-7 ${isLinked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing'}`}
                                    >
                                        <div className="cursor-grab text-gray-400 group-hover:text-blue-500 flex-shrink-0">
                                            <FileText size={14} />
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono w-10 flex-shrink-0">{doc.gruppe?.nr}.{doc.dokument_nr}</span>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <span className="text-xs truncate text-gray-800" title={doc.dokument || ''}>{doc.dokument}</span>
                                            {isLinked && <span className="text-blue-500 font-bold text-[9px] border border-blue-200 px-1 rounded">LINKET</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
