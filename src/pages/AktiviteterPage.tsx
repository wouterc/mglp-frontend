// --- Fil: src/pages/AktiviteterPage.tsx ---
// @# 2025-09-15 21:45 - Endelig version der sikrer, at filtre altid sendes korrekt ved alle API-kald.
// @# 2025-11-03 21:10 - Tilføjet useEffect til at gen-hente åbne grupper ved filter-ændring.
// @# 2025-11-03 21:20 - Flyttet 'hentGruppeAktiviteter' op før dens anvendelse for at rette 'used before declaration'-fejl.
// @# 2025-11-03 21:30 - Rettet uendelig loop ved at fjerne 'gruppeLoadingStatus' fra dependencies i 'hentGruppeAktiviteter'
// @# 2025-11-03 22:15 - Ændret dispatch til at bruge ny 'SET_GRUPPE_LOADING' action.
import React, { useState, useEffect, useCallback, Fragment, ReactElement, ChangeEvent, KeyboardEvent, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { Edit, Search, ChevronDown, ChevronUp, MessageSquare, ChevronsDown, ChevronsUp } from 'lucide-react';
// @# 2025-11-03 21:45 - Fjernet useDebounce
// import useDebounce from '../hooks/useDebounce'; 
import { useAppState } from '../StateContext';
import type { Status, Aktivitet, Sag, AktivitetGruppeSummary, AktiviteterFilterState } from '../types';
import SagsAktivitetForm from '../components/SagsAktivitetForm';
import Tooltip from '../components/Tooltip';
import SmartDateInput from '../components/SmartDateInput';
import { useTableNavigation } from '../hooks/useTableNavigation';

// --- Type-definitioner og sub-komponenter ---
interface AktiviteterPageProps {
    sagId: number | null;
}
interface SøgeResultat {
    id: number;
    sags_nr: string;
    alias: string;
}
interface InlineEditorProps {
    value: string | null;
    onSave: (value: string) => void;
    type?: string;
    id?: string;
}

const InlineTextEditor = ({ value, onSave, type = "text", id }: InlineEditorProps): ReactElement => {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);
    const handleBlur = () => { if (text !== value) { onSave(text || ''); } };
    return <input id={id} type={type} value={text || ''} onChange={(e) => setText(e.target.value)} onBlur={handleBlur} className="w-full p-1 border rounded-md text-sm bg-white" />;
};


// --- Hovedkomponent ---
function AktiviteterPage({ sagId }: AktiviteterPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const { valgtSag, aktivitetsGrupper, hentedeAktiviteter, gruppeLoadingStatus, aktiviteterIsLoading, aktiviteterFilters, aktiviteterUdvidedeGrupper } = state;
    
    const [aktivitetStatusser, setAktivitetStatusser] = useState<Status[]>([]);
    const [søgning, setSøgning] = useState<string>('');
    const [søgeResultater, setSøgeResultater] = useState<SøgeResultat[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [aktivitetTilRedigering, setAktivitetTilRedigering] = useState<Aktivitet | null>(null);
    
    const [debouncedSøgning, setDebouncedSøgning] = useState(søgning); // Lokal debounce kun for sags-søgning
    const tableRef = useRef<HTMLTableElement>(null);
    useTableNavigation(tableRef);

    // @# 2025-11-03 21:45 - Lokal debounce kun for sags-søgning
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSøgning(søgning);
        }, 300);
        return () => clearTimeout(handler);
    }, [søgning]);


    const nuvaerendeGruppeSummering = valgtSag ? aktivitetsGrupper[valgtSag.id] || [] : [];

    const buildQueryString = useCallback((filters: AktiviteterFilterState, sagIdValue: number | null = null) => {
        const params = new URLSearchParams();
        if (sagIdValue) params.append('sag', sagIdValue.toString());
        if (filters.aktivitet) params.append('aktivitet', filters.aktivitet);
        if (filters.ansvarlig) params.append('ansvarlig', filters.ansvarlig);
        if (filters.status) params.append('status', filters.status);
        if (filters.aktiv_filter) params.append('aktiv_filter', filters.aktiv_filter);
        if (filters.dato_intern_efter) params.append('dato_intern_efter', filters.dato_intern_efter);
        if (filters.dato_intern_foer) params.append('dato_intern_foer', filters.dato_intern_foer);
        if (filters.overskredet) params.append('overskredet', 'true');
        return params.toString();
    }, []);

    const hentGruppeSummering = useCallback(async (currentSag: Sag, filters: AktiviteterFilterState) => {
        dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true, aktiviteterError: null } });
        const queryString = buildQueryString(filters, currentSag.id);

        try {
            const res = await fetch(`${API_BASE_URL}/aktiviteter/?${queryString}`);
            if (!res.ok) throw new Error('Kunne ikke hente gruppe-opsummering.');
            const data: AktivitetGruppeSummary[] = await res.json();
            dispatch({
                type: 'SET_SAG_GRUPPE_SUMMARIES',
                payload: { sagId: currentSag.id, summaries: data },
            });
        } catch (e: any) {
            dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterError: e.message } });
        } finally {
            dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: false } });
        }
    }, [dispatch, buildQueryString]);

    // @# 2025-11-03 21:45 - Stringify 'aktiviteterFilters' for at bruge som dependency
    const filterDependency = JSON.stringify(aktiviteterFilters);

    // @# 2025-11-03 21:20 - Flyttet 'hentGruppeAktiviteter' (fra bunden) hertil, før den bruges.
    // @# 2025-09-15 21:45 - Denne funktion sender nu altid de aktuelle filtre med.
    const hentGruppeAktiviteter = useCallback(async (gruppeId: number) => {
        if (!valgtSag) return;

        // @# 2025-11-03 22:15 - Brug den nye, specifikke action
        dispatch({ type: 'SET_GRUPPE_LOADING', payload: { gruppeId: gruppeId, isLoading: true } });
        
        // @# 2025-11-03 21:45 - Bruger 'aktiviteterFilters' direkte
        const queryString = buildQueryString(aktiviteterFilters, valgtSag.id);

        try {
            const res = await fetch(`${API_BASE_URL}/aktiviteter/by_gruppe/?gruppe=${gruppeId}&${queryString}`);
            const data: Aktivitet[] = await res.json();
            dispatch({ type: 'SET_ENKELT_GRUPPE_AKTIVITETER', payload: { gruppeId: gruppeId, aktiviteter: data } });
        } catch (e) {
            console.error("Fejl ved hentning af aktiviteter for gruppe", e);
        } finally {
            // @# 2025-11-03 22:15 - Brug den nye, specifikke action
            dispatch({ type: 'SET_GRUPPE_LOADING', payload: { gruppeId: gruppeId, isLoading: false } });
        }
    // @# 2025-11-03 22:15 - 'gruppeLoadingStatus' er fjernet, og 'aktiviteterFilters' er tilføjet.
    }, [valgtSag, dispatch, buildQueryString, aktiviteterFilters]);

    useEffect(() => {
        if (valgtSag) {
            // @# 2025-11-03 21:45 - Bruger 'aktiviteterFilters' direkte
            hentGruppeSummering(valgtSag, aktiviteterFilters);
        }
    // @# 2025-11-03 21:45 - Lytter på 'filterDependency'
    }, [valgtSag, filterDependency, hentGruppeSummering, aktiviteterFilters]); // aktiviteterFilters tilføjet for hentGruppeSummering

    // @# 2025-11-03 21:10 - NY useEffect til at gen-hente åbne grupper ved filter-ændring
    useEffect(() => {
        if (!valgtSag) {
            return;
        }

        const udvidedeGrupperForSag = aktiviteterUdvidedeGrupper[valgtSag.id] || {};
        
        // Gennemløb de AKTUELLE gruppesummeringer (som lige er blevet opdateret af det andet useEffect)
        nuvaerendeGruppeSummering.forEach(gruppeSummary => {
            const gruppeId = gruppeSummary.gruppe.id;
            const gruppeKey = `${gruppeSummary.proces.id}-${gruppeId}`;
            
            // Hvis denne gruppe er markeret som 'udvidet' (åben)
            if (udvidedeGrupperForSag[gruppeKey]) {
                // Gen-hent aktiviteterne for denne gruppe, da filteret har ændret sig
                hentGruppeAktiviteter(gruppeId);
            }
        });
        
    // @# 2025-11-03 21:45 - Lytter på 'filterDependency'
    }, [filterDependency, nuvaerendeGruppeSummering, aktiviteterUdvidedeGrupper, hentGruppeAktiviteter, valgtSag]);


    useEffect(() => {
        const fetchAktivitetStatusser = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/kerne/status/?formaal=2`);
                const data = await response.json();
                setAktivitetStatusser(data.results || data);
            } catch (error) { console.error(error); }
        };
        fetchAktivitetStatusser();
    }, []);

    useEffect(() => {
        const searchSager = async () => {
            const trimmedSearch = debouncedSøgning.trim();
            const erTal = !isNaN(trimmedSearch as any) && trimmedSearch !== '';
            
            if (!trimmedSearch || (!erTal && trimmedSearch.length < 2)) {
                setSøgeResultater([]);
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/sager/search/?q=${trimmedSearch}`);
                if (!res.ok) throw new Error('Søgefejl');
                const data: SøgeResultat[] = await res.json();
                setSøgeResultater(data);
                setActiveIndex(-1);
            } catch (error) { console.error("Fejl ved søgning af sager:", error); }
        };
        searchSager();
    }, [debouncedSøgning]);

    const handleSelectSag = async (sagSøgning: SøgeResultat) => {
        try {
            const sagRes = await fetch(`${API_BASE_URL}/sager/${sagSøgning.id}/`);
            if (!sagRes.ok) throw new Error('Kunne ikke hente den valgte sag.');
            const fuldSag: Sag = await sagRes.json();
            dispatch({ type: 'NULSTIL_HENTEDE_AKTIVITETER' });
            dispatch({ type: 'SET_VALGT_SAG', payload: fuldSag });
        } catch (e: any) { console.error(e.message); }
        setSøgning('');
        setSøgeResultater([]);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (søgeResultater.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prevIndex => (prevIndex < søgeResultater.length - 1 ? prevIndex + 1 : prevIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const indexToSelect = activeIndex >= 0 ? activeIndex : 0;
            if (søgeResultater[indexToSelect]) {
                handleSelectSag(søgeResultater[indexToSelect]);
            }
        } else if (e.key === 'Escape') {
            setSøgeResultater([]);
        }
    };

    const handleToggleAlleGrupper = (vis: boolean) => {
        if (!valgtSag) return;
        const alleGruppeKeys = nuvaerendeGruppeSummering.reduce((acc, gruppe) => {
            const gruppeKey = `${gruppe.proces.id}-${gruppe.gruppe.id}`;
            acc[gruppeKey] = vis;
            return acc;
        }, {} as { [key: string]: boolean });
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterUdvidedeGrupper: { ...aktiviteterUdvidedeGrupper, [valgtSag.id]: alleGruppeKeys } },
        });
        if (vis) {
            nuvaerendeGruppeSummering.forEach(gruppe => {
                if (!hentedeAktiviteter[gruppe.gruppe.id]) {
                    hentGruppeAktiviteter(gruppe.gruppe.id);
                }
            });
        }
    };

    const handleToggleGruppe = async (gruppe: AktivitetGruppeSummary) => {
        const gruppeId = gruppe.gruppe.id;
        const gruppeKey = `${gruppe.proces.id}-${gruppeId}`;
        const erUdvidet = !!aktiviteterUdvidedeGrupper[valgtSag!.id]?.[gruppeKey];
        const nyUdvidetState = {
            ...(aktiviteterUdvidedeGrupper[valgtSag!.id] || {}),
            [gruppeKey]: !erUdvidet,
        };
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterUdvidedeGrupper: { ...aktiviteterUdvidedeGrupper, [valgtSag!.id]: nyUdvidetState } },
        });
        if (!erUdvidet && !hentedeAktiviteter[gruppeId]) {
            hentGruppeAktiviteter(gruppeId);
        }
    };
    
    const handleInlineSave = async (aktivitet: Aktivitet, field: string, value: string | boolean | null) => {
        const feltNavn = field === 'status' ? 'status_id' : field;
        const payload = { [feltNavn]: value };
        try {
            const response = await fetch(`${API_BASE_URL}/aktiviteter/${aktivitet.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Kunne ikke gemme ændring.');
            
            const opdateretAktivitet: Aktivitet = await response.json();
            const gruppeId = aktivitet.gruppe?.id;
            if (gruppeId && hentedeAktiviteter[gruppeId]) {
                const opdateredeListe = hentedeAktiviteter[gruppeId].map(a =>
                    a.id === opdateretAktivitet.id ? opdateretAktivitet : a
                );
                dispatch({ type: 'SET_ENKELT_GRUPPE_AKTIVITETER', payload: { gruppeId, aktiviteter: opdateredeListe } });
            }
            if ((field === 'status' || field === 'aktiv') && valgtSag) {
                // @# 2025-11-03 21:45 - Bruger 'aktiviteterFilters' direkte
                hentGruppeSummering(valgtSag, aktiviteterFilters);
            }
        } catch (e) {
            console.error("Fejl ved inline save:", e);
        }
    };
    
    const handleFormSave = () => {
        if (aktivitetTilRedigering && aktivitetTilRedigering.gruppe) {
            hentGruppeAktiviteter(aktivitetTilRedigering.gruppe.id);
        }
        setAktivitetTilRedigering(null);
        if (valgtSag) {
            // @# 2025-11-03 21:45 - Bruger 'aktiviteterFilters' direkte
            hentGruppeSummering(valgtSag, aktiviteterFilters);
        }
    };
    
    const visteAktiviteterForGruppe = (gruppeId: number) => {
        return hentedeAktiviteter[gruppeId] || [];
    };

    const samletTaeling = useMemo(() => {
        return nuvaerendeGruppeSummering.reduce((acc, gruppe) => {
            acc.total += gruppe.total_aktiv_count;
            acc.faerdige += gruppe.total_faerdig_count;
            return acc;
        }, { total: 0, faerdige: 0 });
    }, [nuvaerendeGruppeSummering]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {aktivitetTilRedigering && (
                <SagsAktivitetForm
                    aktivitet={aktivitetTilRedigering}
                    sagId={valgtSag?.id || null}
                    onSave={handleFormSave}
                    onCancel={() => setAktivitetTilRedigering(null)}
                />
            )}
            
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Aktiviteter for Sag {valgtSag ? `${valgtSag.sags_nr} - ${valgtSag.alias}` : 'Vælg en sag'}
                    </h2>
                    <span className="text-lg font-medium text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                        {samletTaeling.faerdige} / {samletTaeling.total}
                    </span>
                    <div className="flex gap-1">
                        <Tooltip content="Fold alle grupper ud">
                            <button onClick={() => handleToggleAlleGrupper(true)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-md">
                                <ChevronsDown size={18} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Fold alle grupper sammen">
                             <button onClick={() => handleToggleAlleGrupper(false)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-md">
                                <ChevronsUp size={18} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                <div className="relative min-w-64">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-gray-400" /></div>
                    <input id="sag-soeg" type="text" value={søgning} onChange={(e) => setSøgning(e.target.value)} onKeyDown={handleKeyDown} placeholder="Skift sag..." className="w-full p-2 pl-10 border rounded-md" autoComplete="off" />
                    {søgeResultater.length > 0 && (
                        <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                            {søgeResultater.map((sag, index) => (
                                <li key={sag.id} onClick={() => handleSelectSag(sag)} onMouseEnter={() => setActiveIndex(index)} className={`p-2 cursor-pointer ${index === activeIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                    {sag.sags_nr} - {sag.alias}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full bg-white table-fixed" ref={tableRef}>
                    <thead className="bg-gray-800 text-white text-sm">
                        <tr>
                            <th className="py-1 px-2 w-[5%]">Aktiv</th>
                            <th className="py-1 px-2 w-[37%] text-left">GRUPPE / AKTIVITET</th>
                            <th className="py-1 px-2 w-[15%]">Status</th>
                            <th className="py-1 px-2 w-[5%]"><MessageSquare size={16} className="mx-auto" /></th>
                            <th className="py-1 px-2 w-[8%]">Ansvarlig</th>
                            <th className="py-1 px-2 w-[10%]">Dato Intern</th>
                            <th className="py-1 px-2 w-[10%]">Dato Ekstern</th>
                            <th className="py-1 px-2 w-[10%]">Resultat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aktiviteterIsLoading ? (
                            <tr><td colSpan={8} className="text-center p-4">Henter gruppeoversigt...</td></tr>
                        ) : !valgtSag ? (
                            <tr><td colSpan={8} className="text-center p-4">Vælg venligst en sag for at se aktiviteter.</td></tr>
                        ) : nuvaerendeGruppeSummering.length === 0 ? (
                            <tr><td colSpan={8} className="text-center p-4">Ingen aktivitetsgrupper matcher de valgte filtre.</td></tr>
                        ) : nuvaerendeGruppeSummering.map(gruppeSummary => {
                            const gruppeKey = `${gruppeSummary.proces.id}-${gruppeSummary.gruppe.id}`;
                            const erUdvidet = !!aktiviteterUdvidedeGrupper[valgtSag!.id]?.[gruppeKey];
                            const aktiviteter = visteAktiviteterForGruppe(gruppeSummary.gruppe.id);
                            const isGruppeLoading = gruppeLoadingStatus[gruppeSummary.gruppe.id];
                            const harAktivtFilter = gruppeSummary.filtered_aktiv_count !== gruppeSummary.total_aktiv_count || gruppeSummary.filtered_faerdig_count !== gruppeSummary.total_faerdig_count;

                            return (
                                <Fragment key={gruppeKey}>
                                    <tr className="bg-gray-200 hover:bg-gray-300 cursor-pointer" onClick={() => handleToggleGruppe(gruppeSummary)}>
                                        <td className="py-2 px-4 text-center">
                                            {erUdvidet ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                        <td className="py-2 px-4 font-bold text-gray-700 break-words" colSpan={7}>
                                            {gruppeSummary.proces.nr}.{gruppeSummary.gruppe.nr} - {gruppeSummary.proces.titel_kort} / {gruppeSummary.gruppe.titel_kort}
                                            <span className="font-normal ml-4 text-gray-600">
                                                ({gruppeSummary.total_faerdig_count}/{gruppeSummary.total_aktiv_count})
                                            </span>
                                            {harAktivtFilter && (
                                                <span className="ml-2 text-blue-600 font-semibold bg-blue-100 px-2 rounded-full text-xs">
                                                    Viser: {gruppeSummary.filtered_faerdig_count}/{gruppeSummary.filtered_aktiv_count}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {erUdvidet && (
                                        isGruppeLoading ? (
                                            <tr><td colSpan={8} className="text-center p-4 italic">Henter aktiviteter...</td></tr>
                                        ) : (
                                            aktiviteter.map(aktivitet => (
                                                <tr key={aktivitet.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="py-1 px-2 text-center">
                                                        <input id={`cell-${aktivitet.id}-0`} type="checkbox" checked={!!aktivitet.aktiv} onChange={(e) => handleInlineSave(aktivitet, 'aktiv', e.target.checked)} />
                                                    </td>
                                                    <td className="py-1 px-2 pl-8 break-words">{aktivitet.aktivitet_nr} - {aktivitet.aktivitet}</td>
                                                    <td className="py-1 px-2">
                                                        <select id={`cell-${aktivitet.id}-2`} value={aktivitet.status?.id || ''} onChange={(e) => handleInlineSave(aktivitet, 'status', e.target.value)} className="w-full p-1 border rounded-md text-sm bg-white">
                                                            <option value="">Vælg...</option>
                                                            {aktivitetStatusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="py-1 px-2 text-center">
                                                        <Tooltip content={aktivitet.kommentar}>
                                                            <button id={`cell-${aktivitet.id}-3`} onClick={() => setAktivitetTilRedigering(aktivitet)} className="p-1">
                                                                <Edit size={16} className={aktivitet.kommentar ? 'text-green-600' : 'text-blue-600'} />
                                                            </button>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="py-1 px-2"><InlineTextEditor id={`cell-${aktivitet.id}-4`} value={aktivitet.ansvarlig} onSave={(val) => handleInlineSave(aktivitet, 'ansvarlig', val)} /></td>
                                                    <td className="py-1 px-2">
                                                        <SmartDateInput value={aktivitet.dato_intern} onSave={(val) => handleInlineSave(aktivitet, 'dato_intern', val)} className={`w-full p-1 border rounded-md text-sm bg-white focus:text-gray-700 ${!aktivitet.dato_intern ? 'text-transparent' : ''}`} />
                                                    </td>
                                                    <td className="py-1 px-2">
                                                        <SmartDateInput value={aktivitet.dato_ekstern} onSave={(val) => handleInlineSave(aktivitet, 'dato_ekstern', val)} className={`w-full p-1 border rounded-md text-sm bg-white focus:text-gray-700 ${!aktivitet.dato_ekstern ? 'text-transparent' : ''}`} />
                                                    </td>
                                                    <td className="py-1 px-2"><InlineTextEditor id={`cell-${aktivitet.id}-7`} value={aktivitet.resultat} onSave={(val) => handleInlineSave(aktivitet, 'resultat', val)} /></td>
                                                </tr>
                                            ))
                                        )
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AktiviteterPage;