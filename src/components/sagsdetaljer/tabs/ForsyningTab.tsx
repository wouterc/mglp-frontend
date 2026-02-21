// --- Fil: src/components/sagsdetaljer/tabs/ForsyningTab.tsx ---
// @# 2025-11-22 18:15 - Selvstændig fane med Smart Vælger og Lazy Loading.
// @# 2025-11-23 11:30 - Opdateret layout: Stakket vertikalt, ikoner altid synlige, redigerings-popup tilføjet.
import React, { useState, useEffect, useMemo, MouseEvent } from 'react';
import { Droplet, Flame, Waves, Phone, Mail, Home, Copy, Check, Loader2, Edit } from 'lucide-react';
import { SagService } from '../../../services/SagService';
import { LookupService } from '../../../services/LookupService';
import { Sag, Virksomhed } from '../../../types';
import SearchableSelect, { SearchableOption } from '../../SearchableSelect';
import VirksomhedForm from '../../VirksomhedForm';

interface ForsyningTabProps {
    sag: Sag;
    onUpdate: () => void;
}

const formatVirksomhedsnavn = (v: Virksomhed | null | undefined): string => {
    if (!v) return '';
    return v.afdeling ? `${v.navn} - ${v.afdeling}` : v.navn;
};

function ForsyningTab({ sag, onUpdate }: ForsyningTabProps) {
    const [alleForsyninger, setAlleForsyninger] = useState<Virksomhed[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Redigerings state
    const [visVirksomhedForm, setVisVirksomhedForm] = useState(false);
    const [virksomhedTilRedigering, setVirksomhedTilRedigering] = useState<Virksomhed | null>(null);

    useEffect(() => {
        const fetchForsyninger = async () => {
            setIsLoading(true);
            try {
                const data = await LookupService.getVirksomheder({ er_forsyning: 'true' });
                setAlleForsyninger(data);
            } catch (error) {
                console.error("Fejl ved hentning af forsyning:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchForsyninger();
    }, []);

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

    const handleForsyningChange = (id: number | null, type: 'vand' | 'varme' | 'spildevand') => {
        saveSagUpdate({ [`${type}_virksomhed_id`]: id });
    };

    const handleCopy = (text: string, key: string, e: MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(key);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleEdit = (virksomhed: Virksomhed) => {
        setVirksomhedTilRedigering(virksomhed);
        setVisVirksomhedForm(true);
    };

    const handleFormSave = () => {
        setVisVirksomhedForm(false);
        setVirksomhedTilRedigering(null);
        onUpdate();
    };

    const getOptions = useMemo(() => (type: 'vand' | 'varme' | 'spildevand') => {
        const relevante = alleForsyninger.filter(v => {
            if (!v.gruppe) return false;
            if (type === 'vand') return v.gruppe.er_vand;
            if (type === 'varme') return v.gruppe.er_varme;
            if (type === 'spildevand') return v.gruppe.er_spildevand;
            return false;
        });

        const sagKommuneKode = sag.kommunekode ? Number(sag.kommunekode) : null;

        const options: SearchableOption[] = relevante.map(v => {
            const virkKommuneKode = v.kommunekode ? Number(v.kommunekode) : null;
            const isMatch = sagKommuneKode !== null && virkKommuneKode !== null && sagKommuneKode === virkKommuneKode;

            let extraInfo = [];
            if (formatVirksomhedsnavn(v) !== v.navn) extraInfo.push(v.afdeling || '');
            if (virkKommuneKode) extraInfo.push(`Kommune: ${virkKommuneKode}`);

            return {
                id: v.id,
                label: v.navn,
                subLabel: extraInfo.length > 0 ? extraInfo.join(' - ') : undefined,
                isHighlight: isMatch
            };
        });

        return options.sort((a, b) => {
            if (a.isHighlight && !b.isHighlight) return -1;
            if (!a.isHighlight && b.isHighlight) return 1;
            return a.label.localeCompare(b.label);
        });
    }, [alleForsyninger, sag.kommunekode]);

    // Hjælpe-komponent til visning af detaljer (Genbruger logikken fra MaeglerTab)
    const ForsyningInfo = ({ virksomhed, typePrefix }: { virksomhed: Virksomhed, typePrefix: string }) => (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {/* Telefon */}
            <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span>{virksomhed.telefon || "-"}</span>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-2 text-sm">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                {virksomhed.email ? (
                    <>
                        <a href={`mailto:${virksomhed.email}`} className="text-blue-600 hover:underline truncate">{virksomhed.email}</a>
                        <button onClick={(e) => handleCopy(virksomhed.email!, `${typePrefix}-email`, e)} className="p-0.5 rounded hover:bg-gray-200 text-blue-500 hover:text-blue-700 flex-shrink-0">
                            {copiedId === `${typePrefix}-email` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    </>
                ) : <span className="text-gray-400">-</span>}
            </div>

            {/* Adresse */}
            <div className="flex items-start space-x-3 text-sm text-gray-600">
                <button
                    onClick={(e) => handleCopy(`${virksomhed.adresse_vej}\n${virksomhed.adresse_postnr} ${virksomhed.adresse_by}`, `${typePrefix}-adr`, e)}
                    className="mt-0.5 text-gray-400 hover:text-blue-700 flex-shrink-0"
                    title="Kopier adresse"
                    disabled={!virksomhed.adresse_vej && !virksomhed.adresse_postnr}
                >
                    {copiedId === `${typePrefix}-adr` ? <Check size={14} className="text-green-500" /> : <Home size={14} />}
                </button>
                <div>
                    {(virksomhed.adresse_vej || virksomhed.adresse_postnr) ? (
                        <>
                            <div>{virksomhed.adresse_vej}</div>
                            <div>{virksomhed.adresse_postnr} {virksomhed.adresse_by}</div>
                        </>
                    ) : <span className="text-gray-400">-</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 bg-gray-300 p-4 -m-4 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* VAND */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 flex-none">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-blue-600">
                            <Droplet size={24} className="mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Vandforsyning</h3>
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </div>
                        {sag.vand_virksomhed && (
                            <button onClick={() => handleEdit(sag.vand_virksomhed!)} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger vandforsyning">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>

                    <SearchableSelect
                        id="vand_virksomhed_id"
                        name="vand_virksomhed_id"
                        options={getOptions('vand')}
                        value={sag.vand_virksomhed?.id || null}
                        onChange={(id) => handleForsyningChange(id, 'vand')}
                        placeholder="Vælg vandselskab..."
                        disabled={isLoading || isSaving}
                        emptyMessage="Ingen vandselskaber fundet"
                    />
                    {sag.vand_virksomhed && <ForsyningInfo virksomhed={sag.vand_virksomhed} typePrefix="vand" />}
                </div>

                {/* VARME */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-red-600">
                            <Flame size={24} className="mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Varmeforsyning</h3>
                        </div>
                        {sag.varme_virksomhed && (
                            <button onClick={() => handleEdit(sag.varme_virksomhed!)} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger varmeforsyning">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                    <SearchableSelect
                        id="varme_virksomhed_id"
                        name="varme_virksomhed_id"
                        options={getOptions('varme')}
                        value={sag.varme_virksomhed?.id || null}
                        onChange={(id) => handleForsyningChange(id, 'varme')}
                        placeholder="Vælg varmeselskab..."
                        disabled={isLoading || isSaving}
                        emptyMessage="Ingen varmeselskaber fundet"
                    />
                    {sag.varme_virksomhed && <ForsyningInfo virksomhed={sag.varme_virksomhed} typePrefix="varme" />}
                </div>

                {/* SPILDEVAND */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-green-700">
                            <Waves size={24} className="mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Spildevand</h3>
                        </div>
                        {sag.spildevand_virksomhed && (
                            <button onClick={() => handleEdit(sag.spildevand_virksomhed!)} className="p-1 text-gray-400 hover:text-blue-600" title="Rediger spildevand">
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                    <SearchableSelect
                        id="spildevand_virksomhed_id"
                        name="spildevand_virksomhed_id"
                        options={getOptions('spildevand')}
                        value={sag.spildevand_virksomhed?.id || null}
                        onChange={(id) => handleForsyningChange(id, 'spildevand')}
                        placeholder="Vælg spildevand..."
                        disabled={isLoading || isSaving}
                        emptyMessage="Ingen spildevandsselskaber fundet"
                    />
                    {sag.spildevand_virksomhed && <ForsyningInfo virksomhed={sag.spildevand_virksomhed} typePrefix="spildevand" />}
                </div>
            </div>

            {/* Popup Form */}
            {visVirksomhedForm && (
                <VirksomhedForm
                    virksomhedTilRedigering={virksomhedTilRedigering}
                    onSave={handleFormSave}
                    onCancel={() => setVisVirksomhedForm(false)}
                />
            )}
        </div>
    );
}

export default ForsyningTab;