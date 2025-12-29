// --- Fil: src/components/DokumentSkabelonForm.tsx ---
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { SkabDokument, Blokinfo, InformationsKilde } from '../types';
import { Save, X, Loader2 } from 'lucide-react';

interface DokumentSkabelonFormProps {
    dokument?: SkabDokument | null;
    onSave: () => void;
    onCancel: () => void;
    initialFilters?: { gruppe_nr?: string };
}

const DokumentSkabelonForm: React.FC<DokumentSkabelonFormProps> = ({ dokument, onSave, onCancel, initialFilters }) => {
    const isEditing = !!dokument;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [blokinfo, setBlokinfo] = useState<Blokinfo[]>([]);
    const [informationsKilder, setInformationsKilder] = useState<InformationsKilde[]>([]);

    const [formData, setFormData] = useState({
        dokument_nr: '',
        dokument: '',
        gruppe_id: '',
        dokument_type: 'Villa',
        link: '',
        filnavn: '',
        betingelse: '',
        metode: '',
        metode_beskrivelse: '',
        login: '',
        kommentar: '',
        aktiv: true,
        udgaaet: false,
        informations_kilde_id: '',
        mail_titel: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [blokData, infoData] = await Promise.all([
                    api.get<Blokinfo[]>('/skabeloner/blokinfo/'),
                    api.get<InformationsKilde[]>('/kerne/informationskilder/')
                ]);
                setBlokinfo(blokData.filter(b => b.formaal === 3));
                setInformationsKilder(infoData);
            } catch (e) {
                console.error("Fejl ved hentning af data", e);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isEditing && dokument) {
            setFormData({
                dokument_nr: dokument.dokument_nr?.toString() || '',
                dokument: dokument.dokument || '',
                gruppe_id: dokument.gruppe?.id.toString() || '',
                dokument_type: dokument.dokument_type || 'Villa',
                link: dokument.link || '',
                filnavn: dokument.filnavn || '',
                betingelse: dokument.betingelse || '',
                metode: dokument.metode || '',
                metode_beskrivelse: dokument.metode_beskrivelse || '',
                login: dokument.login || '',
                kommentar: dokument.kommentar || '',
                aktiv: dokument.aktiv ?? true,
                udgaaet: dokument.udgaaet ?? false,
                informations_kilde_id: dokument.informations_kilde?.id.toString() || '',
                mail_titel: dokument.mail_titel || ''
            });
        } else if (initialFilters?.gruppe_nr) {
            // Find ID baseret på nummer
            const g = blokinfo.find(b => b.nr.toString() === initialFilters.gruppe_nr);
            if (g) {
                setFormData(prev => ({ ...prev, gruppe_id: g.id.toString() }));
            }
        }
    }, [isEditing, dokument, initialFilters, blokinfo]);

    // Beregn næste nummer ved valg af gruppe (hvis ikke redigering)
    useEffect(() => {
        const beregnNr = async () => {
            if (!isEditing && formData.gruppe_id) {
                const valgtGruppe = blokinfo.find(g => g.id.toString() === formData.gruppe_id);
                if (valgtGruppe) {
                    try {
                        const data = await api.get<{ results: SkabDokument[] }>(`/skabeloner/dokumenter/?gruppe_nr=${valgtGruppe.nr}&limit=1000`);
                        const doks = data.results || [];
                        const maxNr = doks.length > 0 ? Math.max(...doks.map(d => d.dokument_nr || 0)) : 0;
                        setFormData(prev => ({ ...prev, dokument_nr: (maxNr + 1).toString() }));
                    } catch (e) {
                        console.error("Fejl ved beregning af nr", e);
                    }
                }
            }
        };
        beregnNr();
    }, [formData.gruppe_id, isEditing, blokinfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;
        const val = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const next = { ...prev, [name]: val };

            // Hvis dokument markeres som udgået, så deaktiver det også automatisk
            if (name === 'udgaaet' && checked === true) {
                next.aktiv = false;
            }

            // Forhindr at gøre den aktiv hvis den er markeret som udgået
            if (name === 'aktiv' && checked === true && next.udgaaet) {
                next.aktiv = false;
            }

            return next;
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            ...formData,
            dokument_nr: formData.dokument_nr ? parseInt(formData.dokument_nr) : null,
            gruppe_id: formData.gruppe_id ? parseInt(formData.gruppe_id) : null,
            informations_kilde_id: formData.informations_kilde_id ? parseInt(formData.informations_kilde_id) : null,
        };

        try {
            if (isEditing && dokument) {
                await api.put(`/skabeloner/dokumenter/${dokument.id}/`, payload);
            } else {
                await api.post('/skabeloner/dokumenter/', payload);
            }
            onSave();
        } catch (e: any) {
            setError(e.message || "Der skete en fejl ved lagring.");
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = formData.dokument.trim() !== '' && formData.gruppe_id !== '' && formData.dokument_nr !== '';

    return (
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {isEditing ? 'Rediger Dokument Skabelon' : 'Ny Dokument Skabelon'}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <button type="button" onClick={onCancel} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Annuller (Esc)">
                            <X size={24} />
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={`p-2 text-white rounded-full transition-all ${(!isFormValid || loading) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
                            title="Gem"
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gruppe *</label>
                        <select
                            name="gruppe_id"
                            value={formData.gruppe_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-1 focus:ring-black outline-none bg-white font-medium text-[12px]"
                            required
                        >
                            <option value="">Vælg gruppe...</option>
                            {blokinfo.map(g => <option key={g.id} value={g.id}>{g.nr} - {g.titel_kort}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dokument Nr. *</label>
                        <input
                            type="text"
                            name="dokument_nr_display"
                            value={(() => {
                                const g = blokinfo.find(b => b.id.toString() === formData.gruppe_id);
                                return g ? `${g.nr}.${formData.dokument_nr}` : formData.dokument_nr;
                            })()}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed font-medium text-[12px]"
                            title="Nummeret tildeles automatisk baseret på gruppe og næste ledige nr."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dokument Navn *</label>
                    <input
                        type="text"
                        name="dokument"
                        value={formData.dokument}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none text-[12px]"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <input
                        type="text"
                        name="link"
                        value={formData.link}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none text-[12px]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filnavn</label>
                    <input
                        type="text"
                        name="filnavn"
                        value={formData.filnavn}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none text-[12px]"
                    />
                </div>

                <div className="flex items-start space-x-6 pt-2">
                    <label className={`flex items-center space-x-2 ${formData.udgaaet ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input
                            type="checkbox"
                            name="aktiv"
                            checked={formData.aktiv}
                            onChange={handleChange}
                            disabled={!!formData.udgaaet}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Aktiv skabelon</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="udgaaet"
                            checked={formData.udgaaet}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Udgået skabelon</span>
                    </label>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Informationskilde</label>
                        <select
                            name="informations_kilde_id"
                            value={formData.informations_kilde_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white text-[12px]"
                        >
                            <option value="">Ingen</option>
                            {informationsKilder.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mail Titel</label>
                        <textarea
                            name="mail_titel"
                            value={formData.mail_titel}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-1 focus:ring-black outline-none text-[12px] resize-y"
                            placeholder="Titel til eksterne mails"
                            rows={2}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kommentar</label>
                    <textarea
                        name="kommentar"
                        value={formData.kommentar}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none resize-none text-[11px] placeholder-gray-400"
                    />
                </div>
            </form>
        </div>
    );
};

export default DokumentSkabelonForm;
