import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal'; // @# Use project Modal
import { Aktivitet, SagsDokument } from '../../types';
import { Search, Link as LinkIcon, Unlink, FileText, Check, ListFilter, X, RefreshCw } from 'lucide-react';
import Tooltip from '../Tooltip';

interface ActivityDocumentLinkerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sagId: number;
    initialAktivitetId?: number | null;
    aktiviteter: Aktivitet[];
    dokumenter: SagsDokument[];
    onLinkChanges: (aktivitetId: number, documentIds: number[]) => Promise<void>;
}

export default function ActivityDocumentLinkerModal({
    isOpen,
    onClose,
    sagId,
    initialAktivitetId,
    aktiviteter,
    dokumenter,
    onLinkChanges
}: ActivityDocumentLinkerModalProps) {
    // Selection state
    const [selectedAktivitetId, setSelectedAktivitetId] = useState<number | null>(initialAktivitetId || null);

    // Filter states
    const [activitySearch, setActivitySearch] = useState('');
    const [documentSearch, setDocumentSearch] = useState('');

    // Update selected activity if initial changes (e.g. from props)
    useEffect(() => {
        if (initialAktivitetId) handleSelectActivity(initialAktivitetId);
    }, [initialAktivitetId]);

    // Derived state: Selected Activity Object
    const selectedAktivitet = useMemo(() =>
        aktiviteter.find(a => a.id === selectedAktivitetId),
        [aktiviteter, selectedAktivitetId]
    );

    // Initial linked docs state (to track changes)
    // We maintain a local "pending" state for the linked docs of the SELECTED activity.
    // When we switch activity, we might want to auto-save or warn? 
    // For simplicity: We trigger onLinkChanges IMMEDIATELY when usage changes.
    // So UI just reflects current state + optimistic updates if needed, 
    // but here we just rely on parent props unless we want local pending state.
    // Let's assume onLinkChanges is called for every link/unlink action.

    const handleSelectActivity = (id: number) => {
        setSelectedAktivitetId(id);
    };

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

    // Filter Logic
    const filteredActivities = useMemo(() => {
        return aktiviteter.filter(a => {
            if (!a.aktiv) return false; // Optional: Only show active?
            const search = activitySearch.toLowerCase();
            return (
                (a.aktivitet?.toLowerCase().includes(search)) ||
                (a.aktivitet_nr?.toString().includes(search))
            );
        }).sort((a, b) => (a.aktivitet_nr || 0) - (b.aktivitet_nr || 0));
    }, [aktiviteter, activitySearch]);

    const { linkedDocs, availableDocs } = useMemo(() => {
        if (!selectedAktivitet) return { linkedDocs: [], availableDocs: [] };

        const linkedIds = selectedAktivitet.dokumenter || [];
        const search = documentSearch.toLowerCase();

        const allFilteredDocs = dokumenter.filter(d => {
            const matches = (
                (d.titel?.toLowerCase().includes(search)) ||
                (d.filnavn?.toLowerCase().includes(search)) ||
                (d.dokument_nr?.toString().includes(search))
            );
            return matches;
        });

        const linked = allFilteredDocs.filter(d => linkedIds.includes(d.id));
        const available = allFilteredDocs.filter(d => !linkedIds.includes(d.id));

        return { linkedDocs: linked, availableDocs: available };
    }, [selectedAktivitet, dokumenter, documentSearch]);


    // Render Helpers
    const renderActivityItem = (a: Aktivitet) => (
        <div
            key={a.id}
            onClick={() => handleSelectActivity(a.id)}
            className={`
                p-3 border-b border-gray-100 cursor-pointer flex justify-between items-center text-sm
                hover:bg-gray-50 transition-colors
                ${selectedAktivitetId === a.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
            `}
        >
            <div className="truncate">
                <span className="font-mono text-gray-500 mr-2">{a.aktivitet_nr}</span>
                <span className="font-medium text-gray-800">{a.aktivitet}</span>
            </div>
            {a.dokumenter && a.dokumenter.length > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <LinkIcon size={10} /> {a.dokumenter.length}
                </span>
            )}
        </div>
    );

    const renderDocItem = (d: SagsDokument, type: 'linked' | 'available') => (
        <div key={d.id} className="flex items-center justify-between p-2 border border-gray-100 rounded mb-1 bg-white hover:border-gray-300 group">
            <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className={d.fil ? "text-blue-500" : "text-gray-400"} />
                <div className="flex flex-col truncate">
                    <span className="text-sm font-medium text-gray-700 truncate">{d.titel || d.filnavn}</span>
                    <span className="text-xs text-gray-500">{d.dokument_nr} • {d.gruppe_navn}</span>
                </div>
            </div>

            <button
                onClick={() => type === 'linked' ? handleUnlink(d.id) : handleLink(d.id)}
                className={`
                    p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all
                    ${type === 'linked' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}
                `}
                title={type === 'linked' ? "Fjern link" : "Tilføj link"}
            >
                {type === 'linked' ? <Unlink size={16} /> : <LinkIcon size={16} />}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Link Aktiviteter og Dokumenter"
            maxWidth="max-w-6xl"
        >
            <div className="flex h-[70vh] gap-4">
                {/* Left Column: Activities List */}
                <div className="w-1/3 flex flex-col border-r border-gray-200 pr-4">
                    <div className="mb-2 relative">
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Søg aktivitet..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={activitySearch}
                            onChange={(e) => setActivitySearch(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md bg-white">
                        {filteredActivities.length > 0 ? (
                            filteredActivities.map(renderActivityItem)
                        ) : (
                            <div className="p-4 text-center text-gray-400 text-sm">Ingen aktiviteter fundet</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Interaction Area */}
                <div className="w-2/3 flex flex-col gap-4">
                    {!selectedAktivitet ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <ListFilter size={48} className="mb-4 opacity-20" />
                            <p>Vælg en aktivitet til venstre for at administrere dokument-links.</p>
                        </div>
                    ) : (
                        <>
                            {/* Selected Activity Header */}
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">{selectedAktivitet.aktivitet_nr}</span>
                                    {selectedAktivitet.aktivitet}
                                </h4>
                            </div>

                            {/* Linked Documents Section */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <LinkIcon size={14} className="text-blue-600" />
                                    Linkede Dokumenter
                                    <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs">{linkedDocs.length}</span>
                                </h5>
                                <div className="flex-1 overflow-y-auto bg-gray-50 p-2 rounded-md border border-gray-200 mb-4 min-h-[100px]">
                                    {linkedDocs.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">Ingen dokumenter linket endnu.</div>
                                    ) : (
                                        linkedDocs.map(d => renderDocItem(d, 'linked'))
                                    )}
                                </div>

                                {/* Available Documents Section */}
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FileText size={14} className="text-gray-500" />
                                        Tilgængelige Dokumenter
                                    </h5>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2 top-1.5 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Find dokument at linke..."
                                            className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                            value={documentSearch}
                                            onChange={(e) => setDocumentSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto bg-gray-50 p-2 rounded-md border border-gray-200 min-h-[150px]">
                                    {availableDocs.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            {documentSearch ? "Ingen dokumenter matcher søgningen." : "Ingen flere dokumenter tilgængelige."}
                                        </div>
                                    ) : (
                                        availableDocs.map(d => renderDocItem(d, 'available'))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};


