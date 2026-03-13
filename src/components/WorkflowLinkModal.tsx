import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FlowRegel } from '../types';
import { Loader2, Workflow, Plus, Pencil, X } from 'lucide-react';
import FlowRegelForm from './FlowRegelForm';
import { useAppState } from '../StateContext';

interface WorkflowLinkModalProps {
    targetId: number;
    targetName: string;
    targetType: 'aktivitet' | 'dokument';
    onClose: () => void;
}

const WorkflowLinkModal: React.FC<WorkflowLinkModalProps> = ({ targetId, targetName, targetType, onClose }) => {
    const { state } = useAppState();
    const [regler, setRegler] = useState<FlowRegel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRegel, setSelectedRegel] = useState<FlowRegel | null>(null);

    const fetchRegler = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.get<FlowRegel[]>('/skabeloner/flow-regler/');
            // Filter regler der har denne aktivitet/dokument som mål eller trigger
            const filtered = (data || []).filter(r => {
                if (targetType === 'aktivitet') {
                    // En aktivitet kan både være en trigger og et mål
                    return r.maal_aktivitet === targetId || r.trigger_aktivitet === targetId;
                } else {
                    // Et dokument kan pt. kun være et mål
                    return r.maal_dokument === targetId;
                }
            });
            setRegler(filtered);
        } catch (err: any) {
            console.error('Fejl ved hentning af regler:', err);
            setError('Kunne ikke hente regler');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegler();
    }, [targetId, targetType]);

    const handleCreate = (type: 'REQUIRE' | 'ACTIVATE') => {
        // Find ID for status 80 (Færdig)
        const faerdigStatus = (state.aktivitetStatusser || []).find(s => s.status_nummer === 80);

        // Prefill smartere baseret på targetType og handling
        const initialRegel: Partial<FlowRegel> = {
            navn: `${targetName} - ${type === 'REQUIRE' ? 'Krav' : 'Aktivering'}`,
            handling: type
        };

        if (type === 'REQUIRE') {
            // For KRAV: Aktiviteter er Trigger (det der bremses), Dokumenter er Mål (det der kræves)
            initialRegel.trigger_status = faerdigStatus ? faerdigStatus.id : null;
            if (targetType === 'aktivitet') {
                initialRegel.trigger_aktivitet = targetId;
            } else if (targetType === 'dokument') {
                initialRegel.maal_dokument = targetId;
            }
        } else {
            // For AKTIVER: Vi antager oftest at det aktuelle element er Målet (det der skal aktiveres)
            initialRegel.trigger_status = null;
            initialRegel.trigger_aktivitet = null;
            if (targetType === 'aktivitet') {
                initialRegel.maal_aktivitet = targetId;
            } else if (targetType === 'dokument') {
                initialRegel.maal_dokument = targetId;
            }
        }

        setSelectedRegel(initialRegel as FlowRegel);
        setIsFormOpen(true);
    };

    const handleEdit = (regel: FlowRegel) => {
        setSelectedRegel(regel);
        setIsFormOpen(true);
    };

    const handleFormSave = (savedRegel: FlowRegel) => {
        setIsFormOpen(false);
        fetchRegler(); // Genindlæs listen
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-300 rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center bg-gray-800 text-white px-4 py-3 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Workflow size={18} className="text-blue-400" />
                        <h3 className="font-semibold text-sm">
                            Workflows tilknyttet: <span className="text-blue-300">{targetName}</span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-xs">Henter tilknyttede workflows...</p>
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center text-red-600 text-xs">
                            {error}
                        </div>
                    ) : regler.length === 0 ? (
                        <div className="py-8 text-center">
                            <Workflow size={32} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-sm text-gray-700 font-medium mb-6">Ingen workflows er tilknyttet dette element endnu.</p>

                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={() => handleCreate('REQUIRE')}
                                    title={targetType === 'aktivitet' ? 'Kræv at et dokument er færdigt før denne aktivitet kan afsluttes' : 'Gør dette dokument påkrævet for en aktivitet'}
                                    className="w-full max-w-xs inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                                >
                                    <Plus size={16} className="mr-2" />
                                    {targetType === 'aktivitet' ? 'Ny dokument afhængighed (Krav)' : 'Opret som krav på aktivitet'}
                                </button>
                                <button
                                    onClick={() => handleCreate('ACTIVATE')}
                                    title={targetType === 'aktivitet' ? 'Gør noget andet synligt når denne aktivitet afsluttes' : 'Gør dette dokument synligt via en regel'}
                                    className="w-full max-w-xs inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 text-sm font-medium transition-colors shadow-sm"
                                >
                                    <Plus size={16} className="mr-2" />
                                    {targetType === 'aktivitet' ? 'Ny aktiverings-regel' : 'Opret som mål for aktivering'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Eksisterende regler</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCreate('REQUIRE')}
                                        title="Opret en regel der kræver at et mål er færdigt"
                                        className="text-blue-700 hover:text-blue-900 text-[10px] font-bold flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-400 shadow-sm"
                                    >
                                        <Plus size={12} /> KRAV
                                    </button>
                                    <button
                                        onClick={() => handleCreate('ACTIVATE')}
                                        title="Opret en regel der aktiverer et mål"
                                        className="text-blue-700 hover:text-blue-900 text-[10px] font-bold flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-400 shadow-sm"
                                    >
                                        <Plus size={12} /> AKTIVER
                                    </button>
                                </div>
                            </div>
                            {regler.map(r => (
                                <div key={r.id} className="bg-white border border-gray-400 rounded-lg p-3 hover:border-blue-500 transition-colors group shadow-md ring-1 ring-black ring-opacity-5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-900 mb-1">{r.navn}</h4>
                                            <div className="text-[11px] text-gray-600 space-y-0.5">
                                                <p>Trigger: <span className="font-semibold text-gray-800">{r.trigger_aktivitet_navn || 'Initialisering'}</span></p>
                                                <p>Handling: <span className="text-blue-600 font-bold">{r.handling}</span></p>
                                                <p>Mål: <span className="font-semibold text-blue-800">{r.maal_aktivitet_navn || r.maal_dokument_navn || 'Ingen'}</span></p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleEdit(r)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all sm:opacity-0 group-hover:opacity-100 border border-transparent hover:border-blue-200"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-400 bg-gray-200 flex justify-end rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 text-sm font-bold text-gray-800 hover:text-black border border-gray-400 rounded bg-white hover:bg-gray-50 shadow-sm"
                    >
                        Luk
                    </button>
                </div>
            </div>

            {/* Nested Form Modal */}
            {isFormOpen && (
                <FlowRegelForm
                    regel={selectedRegel}
                    onSave={handleFormSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}
        </div>
    );
};

export default WorkflowLinkModal;
