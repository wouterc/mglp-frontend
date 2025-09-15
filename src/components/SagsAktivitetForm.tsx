// --- Fil: src/components/SagsAktivitetForm.tsx ---
// @ 2025-09-13 13:35 - Oprettet ny formular til redigering af sags-specifikke aktiviteter.
import React, { useState, useEffect, ReactElement, ChangeEvent, FormEvent } from 'react';
import { API_BASE_URL } from '../config.ts';
import { Save, X } from 'lucide-react';

// Type-definitioner
type AktivitetTilRedigering = {
    id: number;
    aktivitet: string | null;
    kommentar: string | null;
    sag_id: number;
} | null;

interface SagsAktivitetFormProps {
    onSave: () => void;
    onCancel: () => void;
    aktivitet: AktivitetTilRedigering;
    sagId: number | null;
}

interface FormDataState {
    aktivitet: string;
    kommentar: string;
    sag_id: number | null;
}

function SagsAktivitetForm({ onSave, onCancel, aktivitet, sagId }: SagsAktivitetFormProps): ReactElement {
    const [formData, setFormData] = useState<FormDataState>({
        aktivitet: '',
        kommentar: '',
        sag_id: sagId,
    });

    const erRedigering = aktivitet != null;

    useEffect(() => {
        if (erRedigering && aktivitet) {
            setFormData({
                aktivitet: aktivitet.aktivitet || '',
                kommentar: aktivitet.kommentar || '',
                sag_id: aktivitet.sag_id,
            });
         }
    }, [aktivitet, erRedigering]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const url = erRedigering
            ? `${API_BASE_URL}/aktiviteter/${aktivitet?.id}/`
            : `${API_BASE_URL}/aktiviteter/`;
        const method = erRedigering ? 'PATCH' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Netværksfejl.');
            onSave();
        } catch (error) {
            console.error('Fejl ved lagring af sagsaktivitet:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">{erRedigering ? 'Rediger Aktivitet' : 'Opret Ny Aktivitet'}</h2>
                        <div>
                            <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                            <button type="submit" className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 ml-2"><Save size={20}/></button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="aktivitet" className="block text-sm font-medium">Aktivitet</label>
                        <input type="text" name="aktivitet" value={formData.aktivitet} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="kommentar" className="block text-sm font-medium">Kommentar</label>
                        <textarea name="kommentar" value={formData.kommentar} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border rounded-md"></textarea>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SagsAktivitetForm;