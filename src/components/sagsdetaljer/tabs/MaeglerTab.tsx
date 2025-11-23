// --- Fil: src/components/sagsdetaljer/tabs/MaeglerTab.tsx ---
// @# 2025-11-22 18:00 - Udtrukket Mægler-logik til selvstændig fane.
// @# 2025-11-23 11:30 - Opdateret layout: Ikoner altid synlige, Hus-ikon kopierer, Rediger-knapper tilføjet.
import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { Building2, Phone, Mail, Home, User, Check, Copy, Loader2, Edit } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { Sag, Virksomhed, Kontakt } from '../../../types';
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
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // State til redigering
    const [visVirksomhedForm, setVisVirksomhedForm] = useState(false);
    const [visKontaktForm, setVisKontaktForm] = useState(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);
    const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);

    useEffect(() => {
        const fetchMaeglere = async () => {
            setIsLoadingMaeglere(true);
            try {
                const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_maegler=true`);
                if (res.ok) {
                    const data = await res.json();
                    setAlleMaeglere(Array.isArray(data) ? data : data.results);
                }
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
                    const res = await fetch(`${API_BASE_URL}/register/kontakter/?virksomhed=${sag.maegler_virksomhed?.id}&er_maegler_kontakt=true`);
                    if (res.ok) {
                        const data = await res.json();
                        setKontakter(Array.isArray(data) ? data : data.results);
                    }
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
            const res = await fetch(`${API_BASE_URL}/sager/${sag.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opdatering),
            });
            if (res.ok) {
                onUpdate();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
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
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolonne 1: Virksomhed */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <Building2 size={20} className="mr-3 text-gray-500" />
                            Mæglervirksomhed
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-600" />}
                        </h2>
                        {sag.maegler_virksomhed && (
                            <button onClick={handleEditVirksomhed} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger virksomhed">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                    
                    <select
                        value={sag.maegler_virksomhed?.id || ''}
                        onChange={handleVirksomhedChange}
                        disabled={isLoadingMaeglere || isSaving}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {isLoadingMaeglere ? <option>Henter...</option> : <option value="">Vælg mægler...</option>}
                        {alleMaeglere.map(m => (
                            <option key={m.id} value={m.id}>{m.navn} {m.afdeling ? `- ${m.afdeling}` : ''}</option>
                        ))}
                    </select>

                    {sag.maegler_virksomhed && (
                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
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
                                        <button onClick={(e) => handleCopy(sag.maegler_virksomhed!.email!, 'mv-email', e)} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                            {copiedId === 'mv-email' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                        </button>
                                    </>
                                ) : <span className="text-gray-400">-</span>}
                            </div>

                            {/* Adresse */}
                            <div className="flex items-start text-sm text-gray-600">
                                <button 
                                    onClick={(e) => handleCopy(`${sag.maegler_virksomhed?.adresse_vej}\n${sag.maegler_virksomhed?.adresse_postnr} ${sag.maegler_virksomhed?.adresse_by}`, 'mv-adr', e)} 
                                    className="mr-3 mt-0.5 text-gray-400 hover:text-blue-700 flex-shrink-0"
                                    title="Kopier adresse"
                                    disabled={!sag.maegler_virksomhed.adresse_vej && !sag.maegler_virksomhed.adresse_postnr}
                                >
                                    {copiedId === 'mv-adr' ? <Check size={16} className="text-green-500"/> : <Home size={16}/>}
                                </button>
                                <div>
                                    {(sag.maegler_virksomhed.adresse_vej || sag.maegler_virksomhed.adresse_postnr) ? (
                                        <>
                                            <div>{sag.maegler_virksomhed.adresse_vej}</div>
                                            <div>{sag.maegler_virksomhed.adresse_postnr} {sag.maegler_virksomhed.adresse_by}</div>
                                        </>
                                    ) : <span className="text-gray-400">-</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Kolonne 2: Kontakt */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <User size={20} className="mr-3 text-gray-500" />
                            Kontaktperson
                        </h2>
                        {sag.maegler_kontakt && (
                            <button onClick={handleEditKontakt} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger kontakt">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>

                    <select
                        value={sag.maegler_kontakt?.id || ''}
                        onChange={handleKontaktChange}
                        disabled={!sag.maegler_virksomhed || isLoadingKontakter || isSaving}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        {!sag.maegler_virksomhed ? <option>Vælg virksomhed først</option> : 
                        isLoadingKontakter ? <option>Henter kontakter...</option> :
                        kontakter.length === 0 ? <option>Ingen kontakter fundet</option> :
                        <>
                            <option value="">Vælg kontakt...</option>
                            {kontakter.map(k => <option key={k.id} value={k.id}>{k.fulde_navn}</option>)}
                        </>
                        }
                    </select>

                    {sag.maegler_kontakt && (
                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
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
                                        <button onClick={(e) => handleCopy(sag.maegler_kontakt!.email!, 'mk-email', e)} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                            {copiedId === 'mk-email' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                        </button>
                                    </>
                                ) : <span className="text-gray-400">-</span>}
                            </div>
                        </div>
                    )}
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
        </>
    );
}

export default MaeglerTab;