// --- Fil: src/components/sagsdetaljer/tabs/MaeglerTab.tsx ---
// @# 2025-11-22 18:00 - Udtrukket Mægler-logik til selvstændig fane.
// @# 2025-11-23 11:30 - Opdateret layout: Ikoner altid synlige, Hus-ikon kopierer, Rediger-knapper tilføjet.
import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { Building2, Phone, Mail, Home, User, Check, Copy, Loader2, Edit, Save } from 'lucide-react';
import { Sag, Virksomhed, Kontakt } from '../../../types';
import { SagService } from '../../../services/SagService';
import { api } from '../../../api'; // Stadig brugt til hentning af mæglere/kontakter
import useDebounce from '../../../hooks/useDebounce';
import VirksomhedForm from '../../VirksomhedForm';
import KontaktForm from '../../KontaktForm';

interface MaeglerTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function MaeglerTab({ sag, onUpdate }: MaeglerTabProps) {
    const [alleMaeglere, setAlleMaeglere] = useState<Virksomhed[]>([]);
    const [kontakter, setKontakter] = useState<Kontakt[]>([]);
    const [isLoadingMaeglere, setIsLoadingMaeglere] = useState(false);
    const [isLoadingKontakter, setIsLoadingKontakter] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSagsNr, setIsSavingSagsNr] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Lokal state for sagsnummer for at undgå API-kald ved hvert tastetryk
    const [localSagsNr, setLocalSagsNr] = useState(sag.maegler_sagsnr || '');
    const debouncedSagsNr = useDebounce(localSagsNr, 1000);

    // Opdater lokal state hvis sagen ændres udefra
    useEffect(() => {
        setLocalSagsNr(sag.maegler_sagsnr || '');
    }, [sag.maegler_sagsnr]);

    // Effekt til automatisk gemning (debounce)
    useEffect(() => {
        if (debouncedSagsNr !== (sag.maegler_sagsnr || '')) {
            saveSagsNr(debouncedSagsNr);
        }
    }, [debouncedSagsNr]);

    // State til redigering
    const [visVirksomhedForm, setVisVirksomhedForm] = useState(false);
    const [visKontaktForm, setVisKontaktForm] = useState(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);
    const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);

    useEffect(() => {
        const fetchMaeglere = async () => {
            setIsLoadingMaeglere(true);
            try {
                const data = await api.get<any>('/register/virksomheder/?er_maegler=true');
                setAlleMaeglere(Array.isArray(data) ? data : data.results);
            } catch (error) {
                console.error("Fejl ved hentning af mæglere:", error);
            } finally {
                setIsLoadingMaeglere(false);
            }
        };
        fetchMaeglere();
    }, []);

    useEffect(() => {
        if (sag.maegler_virksomhed) {
            const fetchKontakter = async () => {
                setIsLoadingKontakter(true);
                try {
                    const data = await api.get<any>(`/register/kontakter/?virksomhed=${sag.maegler_virksomhed?.id}&er_maegler_kontakt=true`);
                    setKontakter(Array.isArray(data) ? data : data.results);
                } catch (error) {
                    console.error("Fejl ved hentning af kontakter:", error);
                } finally {
                    setIsLoadingKontakter(false);
                }
            };
            fetchKontakter();
        } else {
            setKontakter([]);
        }
    }, [sag.maegler_virksomhed?.id]);

    const saveSagUpdate = async (opdatering: any) => {
        setIsSaving(true);
        try {
            await SagService.updateSag(sag.id, opdatering);
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
            await SagService.updateSag(sag.id, { maegler_sagsnr: value });
            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingSagsNr(false);
        }
    };

    const handleVirksomhedChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value ? parseInt(e.target.value) : null;
        saveSagUpdate({ maegler_virksomhed_id: id, maegler_kontakt_id: null });
    };

    const handleKontaktChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value ? parseInt(e.target.value) : null;
        saveSagUpdate({ maegler_kontakt_id: id });
    };

    const handleCopy = (text: string, key: string, e: MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(key);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    // Redigerings handlers
    const handleEditVirksomhed = () => {
        if (sag.maegler_virksomhed) {
            setVirksomhedTilRedigering(sag.maegler_virksomhed);
            setVisVirksomhedForm(true);
        }
    };

    const handleEditKontakt = () => {
        if (sag.maegler_kontakt) {
            setKontaktTilRedigering(sag.maegler_kontakt);
            setVisKontaktForm(true);
        }
    };

    const handleFormSave = () => {
        setVisVirksomhedForm(false);
        setVisKontaktForm(false);
        setVirksomhedTilRedigering(null);
        setKontaktTilRedigering(null);
        onUpdate(); // Opdater hele sagen
    };

    return (
        <div className="space-y-6">
            {/* Topbar: Sagsnummer Reference */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                <div className="flex justify-between items-center mb-1">
                    <label htmlFor="maegler_sagsnr" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Mæglerens sagsnummer</label>
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
                            id="maegler_sagsnr"
                            name="maegler_sagsnr"
                            type="text"
                            value={localSagsNr}
                            onChange={(e) => setLocalSagsNr(e.target.value)}
                            onBlur={() => {
                                if (localSagsNr !== (sag.maegler_sagsnr || '')) {
                                    saveSagsNr(localSagsNr);
                                }
                            }}
                            placeholder="Indtast sagsnr..."
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                            aria-label="Mæglerens sagsnummer"
                        />
                    </div>
                    {sag.maegler_sagsnr && (
                        <button onClick={(e) => handleCopy(sag.maegler_sagsnr!, 'm-sagsnr', e)} className="p-2 text-gray-400 hover:text-blue-600 border border-gray-300 rounded-md transition-colors bg-gray-50">
                            {copiedId === 'm-sagsnr' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Venstre kolonne: Mæglervirksomhed */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <Building2 size={24} className="mr-3 text-gray-400" />
                            <label htmlFor="maegler_virksomhed_id">Mæglervirksomhed</label>
                            {isSaving && <Loader2 size={16} className="ml-2 animate-spin text-blue-600" />}
                        </h2>
                        <button onClick={handleEditVirksomhed} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit size={18} />
                        </button>
                    </div>

                    <select
                        id="maegler_virksomhed_id"
                        name="maegler_virksomhed_id"
                        value={sag.maegler_virksomhed?.id || ''}
                        onChange={handleVirksomhedChange}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2 bg-white text-sm"
                        aria-label="Vælg mæglervirksomhed"
                    >
                        {isLoadingMaeglere ? <option>Henter...</option> : <option value="">Vælg mægler...</option>}
                        {alleMaeglere.map(m => (
                            <option key={m.id} value={m.id}>{m.navn} {m.afdeling ? `- ${m.afdeling}` : ''}</option>
                        ))}
                    </select>

                    <div className="flex-grow">
                        {sag.maegler_virksomhed ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {/* Telefon */}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{sag.maegler_virksomhed.telefon || "-"}</span>
                                </div>

                                {/* Email */}
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {sag.maegler_virksomhed.email ? (
                                        <>
                                            <a href={`mailto:${sag.maegler_virksomhed.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                                {sag.maegler_virksomhed.email}
                                            </a>
                                            <button onClick={(e) => handleCopy(sag.maegler_virksomhed!.email!, 'm-email', e)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                {copiedId === 'm-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-300" />}
                                            </button>
                                        </>
                                    ) : <span className="text-gray-600">-</span>}
                                </div>

                                {/* Adresse */}
                                <div className="flex items-start text-sm text-gray-600">
                                    <Home size={16} className="mr-3 mt-1 text-gray-400 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <div className="flex items-center">
                                            <span>{sag.maegler_virksomhed.adresse_vej}</span>
                                            {sag.maegler_virksomhed.adresse_vej && (
                                                <button
                                                    onClick={(e) => handleCopy(`${sag.maegler_virksomhed!.adresse_vej}, ${sag.maegler_virksomhed!.adresse_postnr} ${sag.maegler_virksomhed!.adresse_by}`, 'm-adr', e)}
                                                    className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
                                                >
                                                    {copiedId === 'm-adr' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-300" />}
                                                </button>
                                            )}
                                        </div>
                                        <div>{sag.maegler_virksomhed.adresse_postnr} {sag.maegler_virksomhed.adresse_by}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400 italic">
                                Ingen mægler valgt
                            </div>
                        )}
                    </div>
                </div>

                {/* Højre kolonne: Kontaktperson */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <User size={24} className="mr-3 text-gray-400" />
                            <label htmlFor="maegler_kontakt_id">Kontaktperson</label>
                        </h2>
                        <button onClick={handleEditKontakt} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" disabled={!sag.maegler_kontakt}>
                            <Edit size={18} />
                        </button>
                    </div>

                    <select
                        id="maegler_kontakt_id"
                        name="maegler_kontakt_id"
                        value={sag.maegler_kontakt?.id || ''}
                        onChange={handleKontaktChange}
                        disabled={!sag.maegler_virksomhed}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2 bg-white text-sm disabled:bg-gray-50 disabled:text-gray-400"
                        aria-label="Vælg kontaktperson"
                    >
                        {isLoadingKontakter ? <option>Henter...</option> : <option value="">Vælg kontaktperson...</option>}
                        {kontakter.map(k => (
                            <option key={k.id} value={k.id}>{k.fulde_navn}</option>
                        ))}
                    </select>

                    <div className="flex-grow">
                        {sag.maegler_kontakt ? (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {/* Telefon */}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    <span>{sag.maegler_kontakt.telefon || "-"}</span>
                                </div>

                                {/* Email */}
                                <div className="flex items-center text-sm">
                                    <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                    {sag.maegler_kontakt.email ? (
                                        <>
                                            <a href={`mailto:${sag.maegler_kontakt.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                                {sag.maegler_kontakt.email}
                                            </a>
                                            <button onClick={(e) => handleCopy(sag.maegler_kontakt!.email!, 'k-email', e)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                {copiedId === 'k-email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-300" />}
                                            </button>
                                        </>
                                    ) : <span className="text-gray-600">-</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400 italic">
                                Ingen kontaktperson valgt
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Popup Forms */}
            {visVirksomhedForm && (
                <VirksomhedForm
                    virksomhedTilRedigering={virksomhedTilRedigering}
                    onSave={handleFormSave}
                    onCancel={() => setVisVirksomhedForm(false)}
                />
            )}
            {visKontaktForm && (
                <KontaktForm
                    kontaktTilRedigering={kontaktTilRedigering}
                    onSave={handleFormSave}
                    onCancel={() => setVisKontaktForm(false)}
                />
            )}
        </div>
    );
}

export default MaeglerTab;