import React, { useState, useEffect } from 'react';
import { User, ClipboardList, Check, Copy, Loader2, Phone, Mail, Home } from 'lucide-react';
import { api } from '../../../api';
import { Sag, SagRaadgiverTilknytning, Kontakt } from '../../../types';
import RaadgiverStyring from '../../RaadgiverStyring';
import useDebounce from '../../../hooks/useDebounce';

interface RaadgivereTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function RaadgivereTab({ sag, onUpdate }: RaadgivereTabProps) {
    const [tilknytninger, setTilknytninger] = useState<SagRaadgiverTilknytning[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSagsNr, setIsSavingSagsNr] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alleRaadgiverKontakter, setAlleRaadgiverKontakter] = useState<Kontakt[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Lokal state for sagsnummer for at undgå API-kald ved hvert tastetryk
    const [localSagsNr, setLocalSagsNr] = useState(sag.raadgiver_sagsnr || '');
    const debouncedSagsNr = useDebounce(localSagsNr, 1000);

    // Opdater lokal state hvis sagen ændres udefra
    useEffect(() => {
        setLocalSagsNr(sag.raadgiver_sagsnr || '');
    }, [sag.raadgiver_sagsnr]);

    // Effekt til automatisk gemning (debounce)
    useEffect(() => {
        if (debouncedSagsNr !== (sag.raadgiver_sagsnr || '')) {
            saveSagsNr(debouncedSagsNr);
        }
    }, [debouncedSagsNr]);

    // Hent data ved mount (Lazy Load)
    useEffect(() => {
        const fetchRaadgivere = async () => {
            setIsLoading(true);
            try {
                // Hent tilknytninger
                const data = await api.get<SagRaadgiverTilknytning[]>(`/sager/raadgivere/?sag_id=${sag.id}`);
                setTilknytninger(data || []);

                // Hent alle rådgiver-kontakter (til dropdown)
                const kData = await api.get<any>('/register/kontakter/?er_raadgiver_kontakt=true');
                setAlleRaadgiverKontakter(Array.isArray(kData) ? kData : kData.results);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRaadgivere();
    }, [sag.id]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (error) {
        return <div className="p-4 text-red-600 bg-red-50 rounded border border-red-200">Fejl: {error}</div>;
    }

    const saveSagUpdate = async (opdatering: any) => {
        setIsSaving(true);
        try {
            await api.patch(`/sager/${sag.id}/`, opdatering);
            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const saveSagsNr = async (value: string) => {
        setIsSavingSagsNr(true);
        try {
            await api.patch(`/sager/${sag.id}/`, { raadgiver_sagsnr: value });
            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingSagsNr(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(key);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <div className="space-y-6">
            {/* Topbar: Rådgiver sagsnummer */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Rådgiverens sagsnummer</label>
                    {isSavingSagsNr && (
                        <div className="flex items-center text-blue-500 text-xs font-medium animate-pulse">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Gemmer...
                        </div>
                    )}
                </div>
                <div className="flex gap-2 max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={localSagsNr}
                            onChange={(e) => setLocalSagsNr(e.target.value)}
                            onBlur={() => {
                                if (localSagsNr !== (sag.raadgiver_sagsnr || '')) {
                                    saveSagsNr(localSagsNr);
                                }
                            }}
                            placeholder="Indtast sagsnr..."
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                        />
                    </div>
                    {sag.raadgiver_sagsnr && (
                        <button onClick={() => handleCopy(sag.raadgiver_sagsnr!, 'r-sagsnr')} className="p-2 text-gray-400 hover:text-blue-600 border border-gray-300 rounded-md transition-colors bg-gray-50">
                            {copiedId === 'r-sagsnr' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Venstre kolonne: Virksomhedsinfo (Read-only baseret på valgt kontakt) */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <ClipboardList size={24} className="mr-3 text-gray-400" />
                            Rådgivningsvirksomhed
                        </h2>
                    </div>

                    <div className="w-full p-2 border border-transparent mb-2 bg-transparent text-sm h-[38px]">
                        {/* Placeholder for alignment with dropdown */}
                        {sag.raadgiver_kontakt?.virksomhed ? (
                            <span className="font-medium text-gray-900">{sag.raadgiver_kontakt.virksomhed.navn}</span>
                        ) : (
                            <span className="text-gray-400 italic">Afventer valg af rådgiver...</span>
                        )}
                    </div>

                    <div className="flex-grow">
                        {sag.raadgiver_kontakt?.virksomhed ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {/* Telefon */}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{sag.raadgiver_kontakt.virksomhed.telefon || "-"}</span>
                                </div>

                                {/* Email */}
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {sag.raadgiver_kontakt.virksomhed.email ? (
                                        <a href={`mailto:${sag.raadgiver_kontakt.virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                            {sag.raadgiver_kontakt.virksomhed.email}
                                        </a>
                                    ) : <span className="text-gray-600">-</span>}
                                </div>

                                {/* Adresse */}
                                <div className="flex items-start text-sm text-gray-600">
                                    <Home size={16} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <div>{sag.raadgiver_kontakt.virksomhed.adresse_vej}</div>
                                        <div>{sag.raadgiver_kontakt.virksomhed.adresse_postnr} {sag.raadgiver_kontakt.virksomhed.adresse_by}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400 italic">
                                Ingen virksomhed tilknyttet
                            </div>
                        )}
                    </div>
                </div>

                {/* Højre kolonne: Primær Rådgiver (Kontakt) */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <User size={24} className="mr-3 text-gray-400" />
                            Primær Rådgiver
                            {isSaving && <Loader2 size={16} className="ml-2 animate-spin text-blue-600" />}
                        </h2>
                    </div>

                    <select
                        value={sag.raadgiver_kontakt?.id || ''}
                        onChange={(e) => saveSagUpdate({ raadgiver_kontakt_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2 bg-white text-sm"
                    >
                        <option value="">Vælg primær rådgiver...</option>
                        {alleRaadgiverKontakter.map(k => (
                            <option key={k.id} value={k.id}>{k.fulde_navn} {k.virksomhed ? `(${k.virksomhed.navn})` : ''}</option>
                        ))}
                    </select>

                    <div className="flex-grow">
                        {sag.raadgiver_kontakt ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {/* Telefon */}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{sag.raadgiver_kontakt.telefon || "-"}</span>
                                </div>

                                {/* Email */}
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {sag.raadgiver_kontakt.email ? (
                                        <>
                                            <a href={`mailto:${sag.raadgiver_kontakt.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                                {sag.raadgiver_kontakt.email}
                                            </a>
                                            <button onClick={() => handleCopy(sag.raadgiver_kontakt!.email!, 'k-email')} className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                {copiedId === 'k-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-300" />}
                                            </button>
                                        </>
                                    ) : <span className="text-gray-600">-</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400 italic">
                                Ingen rådgiver valgt
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <User size={18} className="mr-2 text-gray-500" />
                    Alle tilknyttede rådgivere
                </h3>
                <RaadgiverStyring
                    sagId={sag.id}
                    initialTilknytninger={tilknytninger}
                    onTilknytningOpdateret={onUpdate}
                />
            </div>
        </div>
    );
}

export default RaadgivereTab;