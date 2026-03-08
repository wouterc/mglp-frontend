import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FlowRegel } from '../types';
import { Loader2, Workflow, Plus, Pencil, X } from 'lucide-react';
import FlowRegelForm from './FlowRegelForm';

interface WorkflowLinkModalProps {
    targetId: number;
    targetName: string;
    targetType: 'aktivitet' | 'dokument';
    onClose: () => void;
}

const WorkflowLinkModal: React.FC<WorkflowLinkModalProps> = ({ targetId, targetName, targetType, onClose }) => {
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
            // Filter regler der har denne aktivitet/dokument som mål
            const filtered = (data || []).filter(r => {
                if (targetType === 'aktivitet') {
                    return r.maal_aktivitet === targetId;
                } else {
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

    const handleCreateNew = () => {
        // Prefill mål baseret på targetId og targetType
        const initialRegel: Partial<FlowRegel> = {
            navn: `Workflow for ${targetName}`,
            maal_aktivitet: targetType === 'aktivitet' ? targetId : null,
            maal_dokument: targetType === 'dokument' ? targetId : null,
            handling: 'ACTIVATE'
        };
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
            <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
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
                            <Workflow size={32} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-600 mb-4">Ingen workflows er tilknyttet dette element endnu.</p>
                            <button
                                onClick={handleCreateNew}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                            >
                                <Plus size={16} className="mr-2" />
                                Opret første workflow regle
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Eksisterende regler</span>
                                <button
                                    onClick={handleCreateNew}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                                >
                                    <Plus size={14} /> OPRET NY
                                </button>
                            </div>
                            {regler.map(r => (
                                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-colors group shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-800 mb-1">{r.navn}</h4>
                                            <div className="text-[11px] text-gray-500 space-y-0.5">
                                                <p>Trigger: <span className="font-medium text-gray-700">{r.trigger_aktivitet_navn || 'Initialisering'}</span></p>
                                                <p>Handling: <span className="font-medium text-gray-700">{r.handling}</span></p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleEdit(r)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
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
                <div className="p-3 border-top border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded bg-white hover:bg-gray-50"
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
