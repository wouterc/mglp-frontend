// --- Fil: src/components/sagsdetaljer/tabs/ProcesserTab.tsx ---
import React, { useState } from 'react';
import { useAppState } from '../../../StateContext';
import { Sag, Blokinfo } from '../../../types';
import { SagService } from '../../../services/SagService';
import { Check, Loader2, Save } from 'lucide-react';

interface ProcesserTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function ProcesserTab({ sag, onUpdate }: ProcesserTabProps) {
    const { state } = useAppState();
    const { blokinfoSkabeloner } = state;

    // Filter til kun at vise processer (Formaal = 1)
    const alleProcesser = blokinfoSkabeloner.filter(b => b.formaal === 1);

    // Lokalt state til at håndtere valg inden vi gemmer
    const [valgteIds, setValgteIds] = useState<number[]>(
        sag.valgte_processer?.map(p => p.id) || []
    );
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const toggleProces = (id: number) => {
        setValgteIds(prev =>
            prev.includes(id)
                ? prev.filter(pId => pId !== id)
                : [...prev, id]
        );
        setMessage(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await SagService.updateSag(sag.id, {
                valgte_processer_ids: valgteIds
            });
            setMessage({ type: 'success', text: 'Processer gemt korrekt.' });
            onUpdate();
        } catch (error) {
            console.error("Fejl ved gem processer:", error);
            setMessage({ type: 'error', text: 'Der skete en fejl ved gemning.' });
        } finally {
            setIsSaving(false);
        }
    };

    const isChanged = JSON.stringify([...valgteIds].sort()) !== JSON.stringify((sag.valgte_processer?.map(p => p.id) || []).sort());

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sagens processer</h2>
                    <p className="text-gray-500 text-sm">Vælg hvilke overordnede processer der er relevante for denne sag.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Gem knap */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isChanged}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${isChanged
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            }`}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Gem ændringer
                    </button>
                    {message && (
                        <div className={`px-4 py-2 rounded-md text-sm font-medium animate-pulse ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alleProcesser.map((proces) => {
                    const isSelected = valgteIds.includes(proces.id);
                    return (
                        <div
                            key={proces.id}
                            onClick={() => toggleProces(proces.id)}
                            className={`cursor-pointer flex items-center justify-between p-4 rounded-lg border transition-all ${isSelected
                                ? 'border-blue-600 bg-blue-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                    Proces {proces.nr}
                                </span>
                                <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                    {proces.titel_kort}
                                </span>
                            </div>

                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-300 text-transparent'
                                }`}>
                                <Check size={14} strokeWidth={4} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {alleProcesser.length === 0 && (
                <div className="text-center py-12 text-gray-400 italic">
                    Ingen processer fundet i systemet.
                </div>
            )}
        </div>
    );
}

export default ProcesserTab;
