// --- Fil: src/components/FlowRegelForm.tsx ---
import React, { useState, useEffect, ReactElement, useMemo } from 'react';
import type { FlowRegel, Status, SkabAktivitet, SkabDokument } from '../types';
import { api } from '../api';
import { Save, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAppState } from '../StateContext';
import SearchableSelect, { SearchableOption } from './SearchableSelect';
import MultiSearchableSelect, { MultiSearchableOption } from './MultiSearchableSelect';

interface FlowRegelFormProps {
    regel: FlowRegel | null;
    onSave: (regel: FlowRegel) => void;
    onCancel: () => void;
}

function FlowRegelForm({ regel, onSave, onCancel }: FlowRegelFormProps): ReactElement {
    const { state } = useAppState();

    // --- State: FormData ---
    const [formData, setFormData] = useState<Partial<FlowRegel>>({
        navn: '',
        trigger_aktivitet: null,
        trigger_status: null,
        betingelser: {},
        maal_aktivitet: null,
        maal_dokument: null,
        handling: 'ACTIVATE',
        handling_status: null,
    });

    // Betingelser UI state
    const [betingelseKey, setBetingelseKey] = useState<string>('Boligtype');

    // --- State: Lookups ---
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [skabAktiviteter, setSkabAktiviteter] = useState<SkabAktivitet[]>([]);
    const [skabDokumenter, setSkabDokumenter] = useState<SkabDokument[]>([]);
    const [boligtyper, setBoligtyper] = useState<{ id: number, navn: string }[]>([]);
    const [regioner, setRegioner] = useState<{ id: number, navn: string }[]>([]);
    const [kommuner, setKommuner] = useState<{ id: number, navn: string }[]>([]);
    const [bbrKoder, setBbrKoder] = useState<any[]>([]);
    const [isLookupsLoading, setIsLookupsLoading] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    useEffect(() => {
        if (regel) {
            setFormData({ ...regel });
        }

        // Hent lookups (Skabeloner)
        const fetchLookups = async () => {
            setIsLookupsLoading(true);
            try {
                // Vi henter alle for at få name/id
                const [aktRes, dokRes, boligRes, regRes, komRes, bbrRes] = await Promise.all([
                    api.get<SkabAktivitet[]>('/skabeloner/aktiviteter/dropdown_options/'),
                    api.get<SkabDokument[]>('/skabeloner/dokumenter/dropdown_options/'),
                    api.get<{ results: { id: number, navn: string }[] }>('/kerne/boligtyper/?page_size=1000'),
                    api.get<{ results: { id: number, navn: string }[] }>('/kerne/regioner/?page_size=1000'),
                    api.get<{ results: { id: number, navn: string }[] }>('/kerne/kommuner/?page_size=1000'),
                    api.get<{ results: any[] }>('/kerne/bbr-kodelister/?page_size=1000')
                ]);
                setSkabAktiviteter(Array.isArray(aktRes) ? aktRes : (aktRes as any).results || []);
                setSkabDokumenter(Array.isArray(dokRes) ? dokRes : (dokRes as any).results || []);
                setBoligtyper((boligRes as any).results || boligRes || []);
                setRegioner((regRes as any).results || regRes || []);
                setKommuner((komRes as any).results || komRes || []);
                setBbrKoder((bbrRes as any).results || bbrRes || []);
            } catch (err) {
                console.error('Kunne ikke hente skabeloner:', err);
            } finally {
                setIsLookupsLoading(false);
            }
        };
        fetchLookups();
    }, [regel]);

    // Filtrer til kun aktiviteter-statusser (nummer < 100)
    const aktStatusser = (state.aktivitetStatusser || []).filter(s => s.status_nummer === 10 || s.status_nummer === 20 || s.status_nummer === 80);

    // Options til SearchableSelect
    const aktivitetOptions: SearchableOption[] = useMemo(() => {
        return skabAktiviteter.map(a => ({
            id: a.id,
            label: a.aktivitet || 'Unavngivet Aktivitet',
            subLabel: `Aktivitet ${a.proces?.nr || '0'}.${a.gruppe?.nr || '0'}.${a.aktivitet_nr}`
        }));
    }, [skabAktiviteter]);

    const dokumentOptions: SearchableOption[] = useMemo(() => {
        return skabDokumenter.map((d: any) => {
            const prefix = d.gruppe?.titel_kort ? d.gruppe.titel_kort : (d.gruppe?.nr ? `Gruppe ${d.gruppe.nr}` : 'Ingen gruppe');
            const fileInfo = d.filnavn ? ` (${d.filnavn})` : '';
            return {
                id: d.id,
                label: d.dokument || 'Unavngivet Dokument',
                subLabel: `${prefix}${fileInfo}`
            };
        });
    }, [skabDokumenter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validering
        if (!formData.navn) {
            setError('Reglen skal have et navn.');
            return;
        }
        if (!formData.maal_aktivitet && !formData.maal_dokument) {
            setError('Du skal vælge et mål (Aktivitet eller Dokument).');
            return;
        }
        if (formData.trigger_aktivitet && !formData.trigger_status) {
            setError('Når du har valgt en trigger aktivitet, skal du også vælge en trigger status.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            let savedRegel: FlowRegel;
            if (regel?.id) {
                savedRegel = await api.put<FlowRegel>(`/skabeloner/flow-regler/${regel.id}/`, formData);
            } else {
                savedRegel = await api.post<FlowRegel>('/skabeloner/flow-regler/', formData);
            }
            onSave(savedRegel);
        } catch (err: any) {
            console.error('Fejl ved gem:', err);
            setError(err.message || 'Kunne ikke gemme reglen.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Betingelser Håndtering ---
    const updateBetingelserMulti = (nøgle: string, nyeVærdier: string[]) => {
        setFormData(prev => {
            const nyBetingelser = { ...(prev.betingelser || {}) };
            if (nyeVærdier.length === 0) {
                delete nyBetingelser[nøgle];
            } else {
                nyBetingelser[nøgle] = nyeVærdier;
            }
            return { ...prev, betingelser: nyBetingelser };
        });
    };

    const getCurrentMultiOptions = (): MultiSearchableOption[] => {
        if (betingelseKey === 'Boligtype') return boligtyper.map(bt => ({ value: bt.navn, label: bt.navn }));
        if (betingelseKey === 'Region') return regioner.map(reg => ({ value: reg.navn, label: reg.navn }));
        if (betingelseKey === 'Kommune') return kommuner.map(kom => ({ value: kom.navn, label: kom.navn }));

        if (betingelseKey === 'Privat Vandværk' || betingelseKey === 'Digelaug' || betingelseKey === 'Vejlaug') {
            return [{ value: 'Ja', label: 'Ja' }, { value: 'Nej', label: 'Nej' }];
        }
        if (betingelseKey === 'BBR Varmeinstallation') {
            return bbrKoder.filter(k => k.kategori === 'varme_installation').map(k => ({ value: k.kode.toString(), label: `${k.kode} - ${k.tekst}` }));
        }
        if (betingelseKey === 'BBR Opvarmningsmiddel') {
            return bbrKoder.filter(k => k.kategori === 'opvarmningsmiddel').map(k => ({ value: k.kode.toString(), label: `${k.kode} - ${k.tekst}` }));
        }
        if (betingelseKey === 'BBR Supplerende Varme') {
            return bbrKoder.filter(k => k.kategori === 'supplerende_varme').map(k => ({ value: k.kode.toString(), label: `${k.kode} - ${k.tekst}` }));
        }

        return [];
    };

    const currentSelectedValuesForMulti = formData.betingelser?.[betingelseKey] || [];

    const inputClasses = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:ring-black focus:border-black sm:text-xs min-h-[30px]";
    const labelClasses = "block text-xs font-semibold text-gray-700 leading-tight mb-1";

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-start pt-10">
            <div className="relative bg-gray-300 rounded-lg shadow-xl w-full max-w-2xl border border-gray-400">
                <div className="flex justify-between items-center bg-gray-800 text-white px-3 py-1.5 rounded-t-lg">
                    <h3 className="text-xs font-semibold">{regel ? 'Rediger Workflow Regel' : 'Opret Workflow Regel'}</h3>
                    <button onClick={onCancel} className="text-gray-300 hover:text-white" disabled={isSaving || isLookupsLoading}>
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {isLookupsLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 z-20 flex flex-col items-center justify-center rounded-lg top-8">
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin mb-1" />
                        <span className="text-xs font-medium text-gray-700">Indlæser lister...</span>
                    </div>
                )}

                {error && (
                    <div className="mx-3 mt-3 p-1.5 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-3 space-y-3">
                    {/* TOP ROW: Navn + Knapper */}
                    <div className="flex justify-between items-end gap-4">
                        <div className="flex-1 max-w-[50%]">
                            <label className={labelClasses}>Navn på regel:</label>
                            <input
                                type="text"
                                value={formData.navn || ''}
                                onChange={(e) => setFormData(p => ({ ...p, navn: e.target.value }))}
                                className={inputClasses}
                                placeholder="f.eks. 'Start Energimærke'"
                                required
                            />
                        </div>
                        <div className="flex space-x-2 mb-0.5">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-2 py-1 border border-gray-400 shadow-sm text-xs font-medium rounded text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-black"
                                disabled={isSaving}
                            >
                                Annuller
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`inline-flex items-center justify-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-black ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-1.5 h-3 w-3" /> Gemmer...
                                    </>
                                ) : (
                                    <>
                                        <Save className="-ml-1 mr-1.5 h-3 w-3" /> Gem Regel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-400">
                        {/* VENSTRE SIDE: TRIGGER */}
                        <div className="bg-gray-100 p-2 rounded border border-gray-400">
                            <h4 className="font-semibold text-gray-900 border-b border-gray-400 pb-1 mb-2 text-xs flex items-center gap-1">
                                1. Trigger (Hvad udløser reglen?)
                                <div className="relative group inline-flex items-center ml-1">
                                    <span className="text-gray-500 cursor-help text-[10px]">ⓘ</span>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[120%] mb-1 w-56 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-tight">
                                        En trigger er den hændelse, der starter reglen. Hvis du lader den stå på 'Ingen', udføres reglen automatisk i det sekund en ny sag oprettes.
                                        <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                                    </div>
                                </div>
                            </h4>
                            <p className="text-[9px] text-gray-600 mb-2 font-medium">Hvis blank, køres reglen kun når sagen oprettes.</p>

                            <div className="space-y-2">
                                <div>
                                    <SearchableSelect
                                        label="Trigger Aktivitet:"
                                        options={aktivitetOptions}
                                        value={formData.trigger_aktivitet || null}
                                        onChange={(val) => setFormData(p => ({ ...p, trigger_aktivitet: val }))}
                                        placeholder="Ingen (Initialisering)"
                                    />
                                </div>

                                {formData.trigger_aktivitet && (
                                    <div>
                                        <label className={labelClasses}>Trigger Status:</label>
                                        <select
                                            value={formData.trigger_status || ''}
                                            onChange={(e) => setFormData(p => ({ ...p, trigger_status: e.target.value ? Number(e.target.value) : null }))}
                                            className={inputClasses}
                                            required={!!formData.trigger_aktivitet}
                                        >
                                            <option value="">-- Vælg status --</option>
                                            {aktStatusser.map(s => (
                                                <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HØJRE SIDE: MÅL OG HANDLING */}
                        <div className="bg-gray-100 p-2 rounded border border-gray-400">
                            <h4 className="font-semibold text-gray-900 border-b border-gray-400 pb-1 mb-2 text-xs flex items-center gap-1">
                                2. Handling (Hvad skal der ske?)
                                <div className="relative group inline-flex items-center ml-1">
                                    <span className="text-gray-500 cursor-help text-[10px]">ⓘ</span>
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[120%] mb-1 w-64 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-tight">
                                        Handlingen bestemmer hvad der skal ske. Du kan ikke vælge både aktivitet og dokument på én gang.
                                        <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                                    </div>
                                </div>
                            </h4>

                            <p className="text-[9px] text-gray-600 mb-2 font-medium">Vælg én mål-aktivitet ELLER ét mål-dokument.</p>

                            <div className="space-y-2">
                                <div>
                                    <label className={labelClasses}>Handling:</label>
                                    <select
                                        value={formData.handling || 'ACTIVATE'}
                                        onChange={(e) => setFormData(p => ({ ...p, handling: e.target.value as any }))}
                                        className={inputClasses}
                                    >
                                        <option value="ACTIVATE">Aktiver mål</option>
                                        <option value="DEACTIVATE">Deaktiver mål</option>
                                        <option value="SET_STATUS">Sæt status på mål</option>
                                    </select>
                                </div>

                                <div className="z-40">
                                    <SearchableSelect
                                        label="Mål Aktivitet:"
                                        options={aktivitetOptions}
                                        value={formData.maal_aktivitet || null}
                                        disabled={!!formData.maal_dokument}
                                        onChange={(val) => setFormData(p => ({ ...p, maal_aktivitet: val }))}
                                        placeholder={formData.maal_dokument ? "Ryd dokument først" : "-- Vælg aktivitet --"}
                                    />
                                </div>

                                <div className="z-30">
                                    <SearchableSelect
                                        label="Eller Mål Dokument:"
                                        options={dokumentOptions}
                                        value={formData.maal_dokument || null}
                                        disabled={!!formData.maal_aktivitet}
                                        onChange={(val) => setFormData(p => ({ ...p, maal_dokument: val }))}
                                        placeholder={formData.maal_aktivitet ? "Ryd aktivitet først" : "-- Vælg dokument --"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BUND: BETINGELSER */}
                    <div className="border border-gray-400 rounded p-2 bg-white">
                        <h4 className="font-semibold text-gray-900 mb-1 text-xs flex items-center gap-1">
                            3. Betingelser (Hvornår gælder reglen?)
                            <div className="relative group inline-flex items-center ml-1">
                                <span className="text-gray-500 cursor-help text-[10px]">ⓘ</span>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-[120%] mb-1 w-56 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center font-normal leading-tight">
                                    Opsæt filtre for boligtype, kommune osv. Tom liste = reglen gælder altid.
                                    <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
                                </div>
                            </div>
                        </h4>
                        <p className="text-[9px] text-gray-600 mb-2 font-medium">Tom liste = reglen gælder alle sager.</p>

                        <div className="flex items-center space-x-2 mb-2 bg-gray-50 p-1.5 rounded relative z-10 border border-gray-200">
                            <div className="w-1/3">
                                <select
                                    className={inputClasses}
                                    value={betingelseKey}
                                    onChange={(e) => setBetingelseKey(e.target.value)}
                                >
                                    <option value="Boligtype">Boligtype</option>
                                    <option value="Region">Region</option>
                                    <option value="Kommune">Kommune</option>
                                    <option value="Privat Vandværk">Privat Vandværk</option>
                                    <option value="Digelaug">Digelaug</option>
                                    <option value="Vejlaug">Vejlaug</option>
                                    <option value="BBR Varmeinstallation">BBR Varmeinstallation</option>
                                    <option value="BBR Opvarmningsmiddel">BBR Opvarmningsmiddel</option>
                                    <option value="BBR Supplerende Varme">BBR Supplerende Varme</option>
                                </select>
                            </div>
                            <div className="w-2/3">
                                <MultiSearchableSelect
                                    options={getCurrentMultiOptions()}
                                    selectedValues={currentSelectedValuesForMulti}
                                    onChange={(newValues) => updateBetingelserMulti(betingelseKey, newValues)}
                                    placeholder={`Vælg ${betingelseKey}...`}
                                    emptyMessage="Ingen muligheder"
                                    hideSelectedTags={true}
                                    direction="up"
                                />
                            </div>
                        </div>

                        {/* Vis eksisterende betingelser */}
                        {(!formData.betingelser || Object.keys(formData.betingelser).length === 0) ? (
                            <p className="text-[11px] text-gray-500 italic">Ingen betingelser tilføjet.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                {Object.entries(formData.betingelser).map(([nøgle, værdier]) => (
                                    <div key={nøgle} className="border border-blue-200 bg-blue-50 p-1.5 rounded">
                                        <div className="font-semibold text-[10px] text-blue-800 mb-1 uppercase tracking-wider">{nøgle}:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {værdier.map((v: string) => {
                                                let displayStr = v;
                                                if (nøgle === 'BBR Varmeinstallation') {
                                                    const match = bbrKoder.find(k => k.kategori === 'varme_installation' && k.kode.toString() === v);
                                                    if (match) displayStr = `${match.kode} - ${match.tekst}`;
                                                } else if (nøgle === 'BBR Opvarmningsmiddel') {
                                                    const match = bbrKoder.find(k => k.kategori === 'opvarmningsmiddel' && k.kode.toString() === v);
                                                    if (match) displayStr = `${match.kode} - ${match.tekst}`;
                                                } else if (nøgle === 'BBR Supplerende Varme') {
                                                    const match = bbrKoder.find(k => k.kategori === 'supplerende_varme' && k.kode.toString() === v);
                                                    if (match) displayStr = `${match.kode} - ${match.tekst}`;
                                                }
                                                return (
                                                    <span key={v} className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-white text-blue-800 border border-blue-300">
                                                        {displayStr}
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBetingelserMulti(nøgle, formData.betingelser![nøgle].filter((x: string) => x !== v))}
                                                            className="ml-1 text-blue-400 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                        </button>
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

            </div>

        </div>
    );
}

export default FlowRegelForm;
