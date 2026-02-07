// --- Fil: src/components/SagsAktivitetForm.tsx ---
import React, { useState, useEffect, ReactElement, ChangeEvent, FormEvent } from 'react';
import { Save, Maximize2 } from 'lucide-react';
import type { Aktivitet } from '../types';
import { AktivitetService } from '../services/AktivitetService';
import Modal from './Modal';

interface SagsAktivitetFormProps {
    onSave: () => void;
    onCancel: () => void;
    aktivitet: Aktivitet | null;
    sagId: number | null;
    mode?: 'kommentar' | 'resultat';
}

interface FormDataState {
    aktivitet: string;
    kommentar: string;
    resultat: string;
    mail_titel: string;
    kommentar_vigtig: boolean;
    sag_id: number | null;
}

function SagsAktivitetForm({ onSave, onCancel, aktivitet, sagId, mode = 'kommentar' }: SagsAktivitetFormProps): ReactElement {
    const [formData, setFormData] = useState<FormDataState>({
        aktivitet: '',
        kommentar: '',
        resultat: '',
        mail_titel: '',
        kommentar_vigtig: false,
        sag_id: sagId,
    });
    const [baseAktivitet, setBaseAktivitet] = useState<Aktivitet | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const erRedigering = aktivitet != null;

    useEffect(() => {
        if (erRedigering && aktivitet) {
            setFormData({
                aktivitet: aktivitet.aktivitet || '',
                kommentar: aktivitet.kommentar || '',
                resultat: aktivitet.resultat || '',
                mail_titel: aktivitet.mail_titel || '',
                kommentar_vigtig: aktivitet.kommentar_vigtig || false,
                sag_id: sagId,
            });
            setBaseAktivitet(aktivitet);
        }
    }, [aktivitet, erRedigering, sagId]);

    const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-save logic for the "Important" flag
        if (name === 'kommentar_vigtig' && erRedigering && aktivitet) {
            try {
                await AktivitetService.updateAktivitet(aktivitet.id, {
                    kommentar_vigtig: value
                });
                // Update baseAktivitet so the Save button dims again if no other changes
                setBaseAktivitet(prev => prev ? { ...prev, kommentar_vigtig: value as boolean } : null);
            } catch (err) {
                console.error("Auto-save error:", err);
            }
        }
    };

    const handleSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);

        try {
            if (aktivitet?.id) {
                await AktivitetService.updateAktivitet(aktivitet.id, formData);
            }
            onSave();
        } catch (error: any) {
            console.error('Fejl ved lagring af sagsaktivitet:', error);
            alert(`Fejl ved gemning: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const isComment = mode === 'kommentar';
    const title = isComment ? "Rediger kommentar" : "Rediger resultat";
    const label = isComment ? `Kommentar til "${formData.aktivitet}"` : `Resultat til "${formData.aktivitet}"`;
    const fieldName = isComment ? 'kommentar' : 'resultat';
    const fieldValue = isComment ? formData.kommentar : formData.resultat;
    const placeholder = isComment ? "Skriv din kommentar her..." : "Skriv resultatet her...";

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={title}
            maxWidth="max-w-lg"
            headerActions={
                <button
                    onClick={() => handleSubmit()}
                    disabled={isSaving || (
                        formData.aktivitet === (baseAktivitet?.aktivitet || '') &&
                        formData.kommentar === (baseAktivitet?.kommentar || '') &&
                        formData.resultat === (baseAktivitet?.resultat || '') &&
                        formData.kommentar_vigtig === (baseAktivitet?.kommentar_vigtig || false)
                    )}
                    className={`p-2 rounded-full text-white transition-all shadow-md active:scale-95 disabled:opacity-30 ${(formData.aktivitet === (baseAktivitet?.aktivitet || '') &&
                        formData.kommentar === (baseAktivitet?.kommentar || '') &&
                        formData.resultat === (baseAktivitet?.resultat || '') &&
                        formData.kommentar_vigtig === (baseAktivitet?.kommentar_vigtig || false))
                        ? 'bg-gray-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    title="Gem"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save size={20} />
                    )}
                </button>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {label}
                        </label>
                        {isComment && (
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    name="kommentar_vigtig"
                                    checked={formData.kommentar_vigtig}
                                    onChange={handleChange}
                                    className="rounded text-red-600 focus:ring-red-500"
                                />
                                <span className={formData.kommentar_vigtig ? "font-bold text-red-600" : ""}>Vigtig / Obs</span>
                            </label>

                        )}
                    </div>
                    {isComment && (
                        <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mail Titel</label>
                            <input
                                type="text"
                                name="mail_titel"
                                value={formData.mail_titel}
                                onChange={handleChange}
                                placeholder="F.eks. Husk bankgaranti"
                                className="w-full p-2 border border-blue-200 rounded-md shadow-sm outline-none text-sm"
                            />
                        </div>
                    )}
                    <textarea
                        name={fieldName}
                        value={fieldValue}
                        onChange={handleChange}
                        rows={6}
                        autoFocus
                        placeholder={placeholder}
                        className={`mt-1 w-full p-2 border rounded-md shadow-sm outline-none transition-all text-[11px] placeholder-gray-400 ${isComment && formData.kommentar_vigtig
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                    ></textarea>
                </div>
            </form>
        </Modal >
    );
}

export default SagsAktivitetForm;