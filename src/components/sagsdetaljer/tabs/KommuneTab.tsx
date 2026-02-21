// --- Fil: src/components/sagsdetaljer/tabs/KommuneTab.tsx ---
// @# 2025-11-22 18:15 - Fane der viser kommune-info baseret på kommunekode.
// @# 2025-11-23 12:15 - Tilføjet redigerings-mulighed (popup) for kommune-adresser.
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Home, Phone, Mail, MapPin, Edit } from 'lucide-react';
import { LookupService } from '../../../services/LookupService';
import { Sag, Virksomhed } from '../../../types';
import VirksomhedForm from '../../VirksomhedForm';

interface KommuneTabProps {
    sag: Sag;
}

function KommuneTab({ sag }: KommuneTabProps) {
    const [adresser, setAdresser] = useState<Virksomhed[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // State til redigering
    const [visForm, setVisForm] = useState(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);

    // Flyttet fetch-logik ud i en genbrugelig funktion
    const fetchKommune = useCallback(async () => {
        if (!sag.kommunekode) return;

        setIsLoading(true);
        try {
            const data = await LookupService.getVirksomheder({ er_kommune: 'true', kommunekode: sag.kommunekode });
            setAdresser(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [sag.kommunekode]);

    // Initial load
    useEffect(() => {
        fetchKommune();
    }, [fetchKommune]);

    const handleEdit = (v: Virksomhed) => {
        setVirksomhedTilRedigering(v);
        setVisForm(true);
    };

    const handleFormSave = () => {
        setVisForm(false);
        setVirksomhedTilRedigering(null);
        fetchKommune(); // Genindlæs listen for at vise opdaterede data (f.eks. ny tlf)
    };

    if (!sag.kommunekode) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                <MapPin size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Sagen mangler kommunekode.</p>
                <p className="text-sm mt-1">Opdater adressen på sagen for at se kommune-info.</p>
            </div>
        );
    }

    if (isLoading && adresser.length === 0) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (!isLoading && adresser.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
                <p>Ingen kommunale adresser fundet for kode {sag.kommunekode}.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-300 p-4 -m-4 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adresser.map(k => (
                    <div key={k.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-300">

                        {/* Header med Navn + Rediger knap */}
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-800 text-lg">{k.navn}</h3>
                            <button
                                onClick={() => handleEdit(k)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Rediger stamdata"
                            >
                                <Edit size={16} />
                            </button>
                        </div>

                        {k.afdeling && <div className="text-sm font-semibold text-blue-600 mb-4">{k.afdeling}</div>}

                        <div className="space-y-3 text-sm text-gray-600">
                            {(k.adresse_vej || k.adresse_postnr) && (
                                <div className="flex items-start space-x-3">
                                    <Home size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <div>{k.adresse_vej}</div>
                                        <div>{k.adresse_postnr} {k.adresse_by}</div>
                                    </div>
                                </div>
                            )}
                            {k.telefon && (
                                <div className="flex items-center space-x-3">
                                    <Phone size={16} className="text-gray-400 flex-shrink-0" />
                                    <span>{k.telefon}</span>
                                </div>
                            )}
                            {k.email && (
                                <div className="flex items-center space-x-3">
                                    <Mail size={16} className="text-gray-400 flex-shrink-0" />
                                    <a href={`mailto:${k.email}`} className="text-blue-600 hover:underline truncate">
                                        {k.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Popup Form */}
            {visForm && (
                <VirksomhedForm
                    virksomhedTilRedigering={virksomhedTilRedigering}
                    onSave={handleFormSave}
                    onCancel={() => setVisForm(false)}
                />
            )}
        </div>
    );
}

export default KommuneTab;