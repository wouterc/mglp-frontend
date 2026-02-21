import React, { useState, useEffect } from 'react';
import { User, ClipboardList, Check, Copy, Loader2, Phone, Mail, Home } from 'lucide-react';
import { Sag, SagRaadgiverTilknytning, Kontakt } from '../../../types';
import { SagService } from '../../../services/SagService';
import { LookupService } from '../../../services/LookupService';
import RaadgiverStyring from '../../RaadgiverStyring';
import useDebounce from '../../../hooks/useDebounce';

interface RaadgivereTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function RaadgivereTab({ sag, onUpdate }: RaadgivereTabProps) {
    // Brug data der allerede er hentet i sag-objektet som starttilstand
    const [tilknytninger, setTilknytninger] = useState<SagRaadgiverTilknytning[]>(sag.raadgiver_tilknytninger || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSagsNr, setIsSavingSagsNr] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Dropdown-data - starter tom, hentes i baggrunden
    const [alleRaadgiverKontakter, setAlleRaadgiverKontakter] = useState<Kontakt[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    // Lokal state for valgt kontakt-ID (til øjeblikkelig visning af virksomhed uden at vente på onUpdate)
    const [selectedKontaktId, setSelectedKontaktId] = useState<number | null>(sag.raadgiver_kontakt?.id || null);

    // Lokal state for sagsnummer for at undgå API-kald ved hvert tastetryk
    const [localSagsNr, setLocalSagsNr] = useState(sag.raadgiver_sagsnr || '');
    const debouncedSagsNr = useDebounce(localSagsNr, 1000);

    // Opdater lokal state hvis sagen ændres udefra
    useEffect(() => {
        setLocalSagsNr(sag.raadgiver_sagsnr || '');
    }, [sag.raadgiver_sagsnr]);

    // Opdater tilknytninger + valgt kontakt hvis sag-objektet opdateres udefra
    useEffect(() => {
        setTilknytninger(sag.raadgiver_tilknytninger || []);
        setSelectedKontaktId(sag.raadgiver_kontakt?.id || null);
    }, [sag.raadgiver_tilknytninger, sag.raadgiver_kontakt]);

    // Effekt til automatisk gemning (debounce)
    useEffect(() => {
        if (debouncedSagsNr !== (sag.raadgiver_sagsnr || '')) {
            saveSagsNr(debouncedSagsNr);
        }
    }, [debouncedSagsNr]);

    // Separat funktion til kun at genindlæse tilknytninger (hurtig refresh)
    const fetchTilknytninger = async () => {
        try {
            const data = await SagService.getRaadgiverTilknytninger(sag.id);
            setTilknytninger(data || []);
        } catch (e: any) {
            console.error('Fejl ved genindlæsning af tilknytninger:', e);
        }
    };

    // Hent kun dropdown-data i baggrunden - blokerer IKKE visningen
    useEffect(() => {
        LookupService.getKontakter({ er_raadgiver_kontakt: 'true' })
            .then(kData => setAlleRaadgiverKontakter(kData))
            .catch(e => console.error('Fejl ved hentning af rådgiver-kontakter:', e));
    }, []);

    if (error) {
        return <div className="p-4 text-red-600 bg-red-50 rounded border border-red-200">Fejl: {error}</div>;
    }

    // Gem valg af primær rådgiver med optimistisk UI-opdatering
    const savePrimaerRaadgiver = async (kontaktId: number | null) => {
        // Opdater lokalt med det samme → virksomhedsblokken opdateres øjeblikkeligt
        setSelectedKontaktId(kontaktId);
        setIsSaving(true);
        try {
            await SagService.updateSag(sag.id, { raadgiver_kontakt_id: kontaktId });
            onUpdate();
        } catch (e) {
            console.error(e);
            // Rul tilbage ved fejl
            setSelectedKontaktId(sag.raadgiver_kontakt?.id || null);
        } finally {
            setIsSaving(false);
        }
    };

    const saveSagsNr = async (value: string) => {
        setIsSavingSagsNr(true);
        try {
            await SagService.updateSag(sag.id, { raadgiver_sagsnr: value });
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

    // Find den valgte kontakt i vores lokale liste (har fuld virksomhedsdata inkl. virksomhed)
    // Fallback til sag.raadgiver_kontakt hvis dropdown-listen endnu ikke er hentet
    const visKontakt = alleRaadgiverKontakter.find(k => k.id === selectedKontaktId)
        ?? (sag.raadgiver_kontakt?.id === selectedKontaktId ? sag.raadgiver_kontakt : null);
    const virksomhed = visKontakt?.virksomhed ?? null;

    return (
        <div className="space-y-6 bg-gray-300 p-4 -m-4 flex-1 flex flex-col">
            {/* Topbar: Rådgiver sagsnummer */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="raadgiver_sagsnr" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Rådgiverens sagsnummer</label>
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
                            id="raadgiver_sagsnr"
                            name="raadgiver_sagsnr"
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
                            aria-label="Rådgiverens sagsnummer"
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
                {/* Venstre kolonne: Primær Rådgiver (aktiv styring) */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <User size={24} className="mr-3 text-gray-400" />
                            <label htmlFor="raadgiver_kontakt_id">Primær Rådgiver</label>
                            {isSaving && <Loader2 size={16} className="ml-2 animate-spin text-blue-600" />}
                        </h2>
                    </div>

                    <select
                        id="raadgiver_kontakt_id"
                        name="raadgiver_kontakt_id"
                        value={selectedKontaktId ?? ''}
                        onChange={(e) => savePrimaerRaadgiver(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2 bg-white text-sm"
                        aria-label="Vælg primær rådgiver"
                    >
                        <option value="">Vælg primær rådgiver...</option>
                        {alleRaadgiverKontakter.map(k => (
                            <option key={k.id} value={k.id}>{k.fulde_navn} {k.virksomhed ? `(${k.virksomhed.navn})` : ''}</option>
                        ))}
                    </select>

                    <div className="flex-grow">
                        {visKontakt ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{visKontakt.telefon || "-"}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {visKontakt.email ? (
                                        <>
                                            <a href={`mailto:${visKontakt.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                                {visKontakt.email}
                                            </a>
                                            <button onClick={() => handleCopy(visKontakt!.email!, 'k-email')} className="p-1 rounded hover:bg-gray-100 transition-colors">
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

                {/* Højre kolonne: Rådgivningsvirksomhed (automatisk afledt af valgt kontakt) */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <ClipboardList size={24} className="mr-3 text-gray-400" />
                            Rådgivningsvirksomhed
                        </h2>
                    </div>

                    {/* Vises automatisk baseret på den valgte rådgivers virksomhed */}
                    <div className="w-full p-2 mb-2 bg-gray-50 rounded text-sm h-[38px] flex items-center">
                        {virksomhed ? (
                            <span className="font-semibold text-gray-900">{virksomhed.navn}</span>
                        ) : (
                            <span className="text-gray-400 italic">
                                {selectedKontaktId ? 'Kontakt er ikke tilknyttet en virksomhed' : 'Udfyldes automatisk når rådgiver er valgt...'}
                            </span>
                        )}
                    </div>

                    <div className="flex-grow">
                        {virksomhed ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{virksomhed.telefon || "-"}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {virksomhed.email ? (
                                        <a href={`mailto:${virksomhed.email}`} className="text-blue-600 hover:underline truncate">
                                            {virksomhed.email}
                                        </a>
                                    ) : <span className="text-gray-600">-</span>}
                                </div>
                                <div className="flex items-start text-sm text-gray-600">
                                    <Home size={16} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <div>{virksomhed.adresse_vej}</div>
                                        <div>{virksomhed.adresse_postnr} {virksomhed.adresse_by}</div>
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
            </div>

            {/* Alle tilknyttede rådgivere */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <User size={18} className="mr-2 text-gray-500" />
                    Alle tilknyttede rådgivere
                </h3>
                <RaadgiverStyring
                    sagId={sag.id}
                    initialTilknytninger={tilknytninger}
                    onTilknytningOpdateret={fetchTilknytninger}
                />
            </div>
        </div>
    );
}

export default RaadgivereTab;