// --- Fil: src/components/sagsdetaljer/tabs/BankTab.tsx ---
// @# 2025-11-22 18:00 - Udtrukket Bank-logik til selvstændig fane.
// @# 2025-11-23 11:30 - Opdateret layout: Ikoner, Rediger-knapper og Popups.
import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { Landmark, Phone, Mail, Home, User, Check, Copy, Loader2, Edit } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { Sag, Virksomhed, Kontakt } from '../../../types';
import VirksomhedForm from '../../VirksomhedForm';
import KontaktForm from '../../KontaktForm';

interface BankTabProps {
    sag: Sag;
    onUpdate: () => void;
}

function BankTab({ sag, onUpdate }: BankTabProps) {
    const [alleBanker, setAlleBanker] = useState<Virksomhed[]>([]);
    const [kontakter, setKontakter] = useState<Kontakt[]>([]);
    const [isLoadingBanker, setIsLoadingBanker] = useState(false);
    const [isLoadingKontakter, setIsLoadingKontakter] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // State til redigering
    const [visVirksomhedForm, setVisVirksomhedForm] = useState(false);
    const [visKontaktForm, setVisKontaktForm] = useState(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);
    const [kontaktTilRedigering, setKontaktTilRedigering] = useState<Kontakt | null>(null);

    useEffect(() => {
        const fetchBanker = async () => {
            setIsLoadingBanker(true);
            try {
                const res = await fetch(`${API_BASE_URL}/register/virksomheder/?er_bank=true`);
                if (res.ok) {
                    const data = await res.json();
                    setAlleBanker(Array.isArray(data) ? data : data.results);
                }
            } catch (error) {
                console.error("Fejl ved hentning af banker:", error);
            } finally {
                setIsLoadingBanker(false);
            }
        };
        fetchBanker();
    }, []);

    useEffect(() => {
        if (sag.bank_virksomhed) {
            const fetchKontakter = async () => {
                setIsLoadingKontakter(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/register/kontakter/?virksomhed=${sag.bank_virksomhed?.id}&er_bank_kontakt=true`);
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
    }, [sag.bank_virksomhed?.id]);

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
        saveSagUpdate({ bank_virksomhed_id: id, bank_kontakt_id: null });
    };

    const handleKontaktChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value ? parseInt(e.target.value) : null;
        saveSagUpdate({ bank_kontakt_id: id });
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
        if (sag.bank_virksomhed) {
            setVirksomhedTilRedigering(sag.bank_virksomhed);
            setVisVirksomhedForm(true);
        }
    };

    const handleEditKontakt = () => {
        if (sag.bank_kontakt) {
            setKontaktTilRedigering(sag.bank_kontakt);
            setVisKontaktForm(true);
        }
    };

    const handleFormSave = () => {
        setVisVirksomhedForm(false);
        setVisKontaktForm(false);
        setVirksomhedTilRedigering(null);
        setKontaktTilRedigering(null);
        onUpdate();
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <Landmark size={20} className="mr-3 text-gray-500" />
                            Bank
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-600" />}
                        </h2>
                        {sag.bank_virksomhed && (
                            <button onClick={handleEditVirksomhed} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger bank">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                    
                    <select
                        value={sag.bank_virksomhed?.id || ''}
                        onChange={handleVirksomhedChange}
                        disabled={isLoadingBanker || isSaving}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {isLoadingBanker ? <option>Henter...</option> : <option value="">Vælg bank...</option>}
                        {alleBanker.map(b => (
                            <option key={b.id} value={b.id}>{b.navn} {b.afdeling ? `- ${b.afdeling}` : ''}</option>
                        ))}
                    </select>

                    {sag.bank_virksomhed && (
                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                            {/* Telefon */}
                            <div className="flex items-center text-sm text-gray-600">
                                <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                <span>{sag.bank_virksomhed.telefon || "-"}</span>
                            </div>

                            {/* Email */}
                            <div className="flex items-center text-sm group">
                                <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                {sag.bank_virksomhed.email ? (
                                    <>
                                        <a href={`mailto:${sag.bank_virksomhed.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                            {sag.bank_virksomhed.email}
                                        </a>
                                        <button onClick={(e) => handleCopy(sag.bank_virksomhed!.email!, 'bv-email', e)} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                            {copiedId === 'bv-email' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                        </button>
                                    </>
                                ) : <span className="text-gray-400">-</span>}
                            </div>

                            {/* Adresse */}
                            <div className="flex items-start text-sm text-gray-600 group">
                                <button 
                                    onClick={(e) => handleCopy(`${sag.bank_virksomhed?.adresse_vej}\n${sag.bank_virksomhed?.adresse_postnr} ${sag.bank_virksomhed?.adresse_by}`, 'bv-adr', e)} 
                                    className="mr-3 mt-0.5 text-gray-400 hover:text-blue-700 flex-shrink-0"
                                    title="Kopier adresse"
                                    disabled={!sag.bank_virksomhed.adresse_vej && !sag.bank_virksomhed.adresse_postnr}
                                >
                                    {copiedId === 'bv-adr' ? <Check size={16} className="text-green-500"/> : <Home size={16}/>}
                                </button>
                                <div>
                                    {(sag.bank_virksomhed.adresse_vej || sag.bank_virksomhed.adresse_postnr) ? (
                                        <>
                                            <div>{sag.bank_virksomhed.adresse_vej}</div>
                                            <div>{sag.bank_virksomhed.adresse_postnr} {sag.bank_virksomhed.adresse_by}</div>
                                        </>
                                    ) : <span className="text-gray-400">-</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                            <User size={20} className="mr-3 text-gray-500" />
                            Kontaktperson
                        </h2>
                        {sag.bank_kontakt && (
                            <button onClick={handleEditKontakt} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger kontakt">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>

                    <select
                        value={sag.bank_kontakt?.id || ''}
                        onChange={handleKontaktChange}
                        disabled={!sag.bank_virksomhed || isLoadingKontakter || isSaving}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        {!sag.bank_virksomhed ? <option>Vælg bank først</option> : 
                        isLoadingKontakter ? <option>Henter kontakter...</option> :
                        kontakter.length === 0 ? <option>Ingen kontakter fundet</option> :
                        <>
                            <option value="">Vælg kontakt...</option>
                            {kontakter.map(k => <option key={k.id} value={k.id}>{k.fulde_navn}</option>)}
                        </>
                        }
                    </select>

                    {sag.bank_kontakt && (
                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                            <div className="flex items-center text-sm text-gray-600">
                                <Phone size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                {sag.bank_kontakt.telefon || "-"}
                            </div>
                            <div className="flex items-center text-sm group">
                                <Mail size={16} className="mr-3 text-gray-400 flex-shrink-0" />
                                {sag.bank_kontakt.email ? (
                                    <>
                                        <a href={`mailto:${sag.bank_kontakt.email}`} className="text-blue-600 hover:underline mr-2 truncate">
                                            {sag.bank_kontakt.email}
                                        </a>
                                        <button onClick={(e) => handleCopy(sag.bank_kontakt!.email!, 'bk-email', e)} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                                            {copiedId === 'bk-email' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
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

export default BankTab;