// --- Fil: src/pages/AktiviteterPage.tsx ---
// @# 2025-09-14 21:58 - Rettet den sidste typefejl ved at hente fuld sag før dispatch
import React, { useState, useEffect, useCallback, useMemo, Fragment, ReactElement, KeyboardEvent } from 'react';
import { API_BASE_URL } from '../config';
import { PlusCircle, Edit, Search, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import { useAppState } from '../StateContext';
import type { Status, Aktivitet, Sag } from '../types';

// --- Type-definitioner (kun side-specifikke) ---
interface AktiviteterPageProps {
    sagId: number | null;
}

interface InlineEditorProps {
    value: string | null;
    onSave: (value: string) => void;
    type?: string;
}

interface SøgeResultat {
    id: number;
    sags_nr: string;
    alias: string;
}

// --- Sub-komponenter ---
const InlineTextEditor = ({ value, onSave, type = "text" }: InlineEditorProps): ReactElement => {
    const [text, setText] = useState(value);
    const handleBlur = () => {
        if (text !== value) {
            onSave(text || '');
        }
    };
    return <input type={type} value={text || ''} onChange={(e) => setText(e.target.value)} onBlur={handleBlur} className="w-full p-1 border rounded-md text-sm bg-white" />;
};

// --- Hovedkomponent ---
function AktiviteterPage({ sagId }: AktiviteterPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const { aktiviteter: gemteAktiviteter, valgtSag, isLoadingAktiviteter } = state;

    // Lokal state kun til sidens UI
    const [aktivitetStatusser, setAktivitetStatusser] = useState<Status[]>([]);
    const [søgning, setSøgning] = useState<string>('');
    const [søgeResultater, setSøgeResultater] = useState<SøgeResultat[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [udvidedeGrupper, setUdvidedeGrupper] = useState<{ [key: string]: boolean }>({});
    const debouncedSøgning = useDebounce(søgning, 300);

    const nuvaerendeAktiviteter = valgtSag ? gemteAktiviteter[valgtSag.id] || [] : [];

    const hentAktiviteter = useCallback(async (currentSag: Sag) => {
        if (gemteAktiviteter[currentSag.id]) return;

        dispatch({ type: 'SET_LOADING_AKTIVITETER', payload: true });
        try {
            const res = await fetch(`${API_BASE_URL}/aktiviteter/?sag=${currentSag.id}`);
            if (!res.ok) throw new Error('Kunne ikke hente aktiviteter.');
            const data = await res.json();
     
            const aktivitetsliste: Aktivitet[] = data.results || data;

            dispatch({
                type: 'SET_AKTIVITETER',
                payload: { sagId: currentSag.id, aktiviteter: aktivitetsliste },
            });
        } catch (e: any) {
            console.error("Fejl ved hentning af aktiviteter:", e.message);
        } finally {
            dispatch({ type: 'SET_LOADING_AKTIVITETER', payload: false });
        }
    }, [dispatch, gemteAktiviteter]);

    useEffect(() => {
        const fetchInitialSag = async () => {
            if (sagId && (!valgtSag || valgtSag.id !== sagId)) {
                try {
                    const sagRes = await fetch(`${API_BASE_URL}/sager/${sagId}/`);
                    if (!sagRes.ok) throw new Error('Kunne ikke hente den valgte sag.');
                    const sagData: Sag = await sagRes.json();
                    dispatch({ type: 'SET_VALGT_SAG', payload: sagData });
                } catch (e: any) {
                   console.error(e.message);
                }
            }
        };
        fetchInitialSag();
    }, [sagId, valgtSag, dispatch]);

    useEffect(() => {
        if (valgtSag) {
            hentAktiviteter(valgtSag);
        }
    }, [valgtSag, hentAktiviteter]);

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
            } catch (error) {
                console.error("Fejl ved søgning af sager:", error);
            }
        };
        searchSager();
    }, [debouncedSøgning]);

    useEffect(() => {
        const fetchAktivitetStatusser = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/kerne/status/?formaal=2`);
                const data = await response.json();
                setAktivitetStatusser(data.results || data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchAktivitetStatusser();
    }, []);

// @# 2025-09-14 21:58 - Henter det fulde Sag-objekt, før det sendes til state, for at løse type-fejl.
    const handleSelectSag = async (sagSøgning: SøgeResultat) => {
        try {
            const sagRes = await fetch(`${API_BASE_URL}/sager/${sagSøgning.id}/`);
            if (!sagRes.ok) throw new Error('Kunne ikke hente den valgte sag.');
            const fuldSag: Sag = await sagRes.json();
            dispatch({ type: 'SET_VALGT_SAG', payload: fuldSag });
        } catch(e: any) {
            console.error(e.message);
        }
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

    const handleToggleGruppe = (gruppeHeader: string) => {
        setUdvidedeGrupper(prev => ({ ...prev, [gruppeHeader]: !prev[gruppeHeader] }));
    };

    const toggleAlleGrupper = (udvid: boolean) => {
        const nyStatus: { [key: string]: boolean } = {};
        Object.keys(gruppeCounts).forEach(key => { nyStatus[key] = udvid; });
        setUdvidedeGrupper(nyStatus);
    };

    const handleInlineSave = async (aktivitetId: number, field: string, value: string | boolean) => {
        const fieldName = field === 'status' ? 'status_id' : field;
        const finalValue = (field === 'dato_intern' || field === 'dato_ekstern') && value === '' ? null : value;
        try {
            const response = await fetch(`${API_BASE_URL}/aktiviteter/${aktivitetId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [fieldName]: finalValue }),
            });
            if (!response.ok) throw new Error('Kunne ikke gemme ændring.');
            
            const opdateretAktivitet: Aktivitet = await response.json();
            if(valgtSag) {
                const opdateredeAktiviteter = nuvaerendeAktiviteter.map(a => 
                    a.id === aktivitetId ? opdateretAktivitet : a
                );
                dispatch({ type: 'SET_AKTIVITETER', payload: { sagId: valgtSag.id, aktiviteter: opdateredeAktiviteter } });
            }

        } catch (e) {
            console.error("Fejl ved inline save:", e);
            alert("Kunne ikke gemme ændringen.");
            if (valgtSag) hentAktiviteter(valgtSag);
        }
    };

    const totalCounts = useMemo(() => {
        const aktive = nuvaerendeAktiviteter.filter(a => a.aktiv).length;
        const faerdige = nuvaerendeAktiviteter.filter(a => a.aktiv && a.status?.status_kategori === 1).length;
        return { aktive, faerdige };
    }, [nuvaerendeAktiviteter]);

    const gruppeCounts = useMemo(() => {
        const counts: { [key: string]: { aktive: number; faerdige: number } } = {};
        nuvaerendeAktiviteter.forEach(a => {
            const header = `${a.proces?.nr || ''}.${a.gruppe?.nr || ''} - ${a.proces?.titel_kort || ''} / ${a.gruppe?.titel_kort || ''}`;
            if (!counts[header]) {
                counts[header] = { aktive: 0, faerdige: 0 };
            }
            if (a.aktiv) {
                counts[header].aktive++;
                if (a.status?.status_kategori === 1) {
                    counts[header].faerdige++;
                }
            }
        });
        return counts;
    }, [nuvaerendeAktiviteter]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-gray-800">
                    Aktiviteter {valgtSag ? `for Sag #${valgtSag.sags_nr} (${valgtSag.alias})` : ''}
                    {valgtSag && <span className="text-lg font-normal ml-2 text-gray-500">({totalCounts.faerdige}/{totalCounts.aktive})</span>}
                </h2>
                <div className="flex items-center space-x-2">
                    <button onClick={() => toggleAlleGrupper(true)} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Udvid alle"><ChevronsDown size={18} /></button>
                    <button onClick={() => toggleAlleGrupper(false)} className="p-2 text-gray-600 rounded-full hover:bg-gray-200" title="Fold alle sammen"><ChevronsUp size={18} /></button>
                    <button onClick={() => alert("Åbner form for ny aktivitet...")} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" title="Tilføj Ny Aktivitet" disabled={!valgtSag} >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>
            <div className="mb-4 relative">
                <label htmlFor="sag-soeg" className="block text-sm font-medium text-gray-700">Skift til en anden sag (sagsnr eller alias)</label>
                <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-gray-400" /></div>
                    <input id="sag-soeg" type="text" value={søgning} onChange={(e) => setSøgning(e.target.value)} onKeyDown={handleKeyDown} placeholder="Start med at skrive..." className="w-full p-2 pl-10 border rounded-md" autoComplete="off" />
                </div>
                {søgeResultater.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                        {søgeResultater.map((sag, index) => (
                            <li key={sag.id} onClick={() => handleSelectSag(sag)} onMouseEnter={() => setActiveIndex(index)} className={`p-2 cursor-pointer ${index === activeIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                {sag.sags_nr} - {sag.alias}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
             <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full bg-white table-fixed">
                    <thead className="bg-gray-800 text-white text-sm">
                        <tr>
                            <th className="py-1 px-2 w-[5%]">Aktiv</th>
                            <th className="py-1 px-2 w-[5%]">Aktiv. Nr.</th>
                            <th className="py-1 px-2 w-[30%]">Aktivitet</th>
                            <th className="py-1 px-2 w-[10%]">Status</th>
                            <th className="py-1 px-2 w-[10%]">Ansvarlig</th>
                            <th className="py-1 px-2 w-[10%]">Dato Intern</th>
                            <th className="py-1 px-2 w-[10%]">Dato Ekstern</th>
                            <th className="py-1 px-2 w-[15%]">Resultat</th>
                            <th className="py-1 px-2 w-[5%]"></th>
                         </tr>
                    </thead>
                    <tbody>
                        {isLoadingAktiviteter ? (
                            <tr><td colSpan={9} className="text-center p-4">Henter aktiviteter...</td></tr>
                        ) : nuvaerendeAktiviteter.length === 0 ? (
                            <tr><td colSpan={9} className="text-center p-4">{valgtSag ? 'Ingen aktiviteter fundet for denne sag.' : 'Vælg en sag for at se aktiviteter.'}</td></tr>
                        ) : (
                            Object.keys(gruppeCounts).sort().map(header => (
                                <Fragment key={header}>
                                    <tr className="bg-gray-200 sticky top-0 hover:bg-gray-300 cursor-pointer border-t-2 border-white" onClick={() => handleToggleGruppe(header)}>
                                        <td colSpan={9} className="py-1 px-2 font-bold text-gray-700">
                                            {udvidedeGrupper[header] ? <ChevronUp size={16} className="inline-block mr-2" /> : <ChevronDown size={16} className="inline-block mr-2" />}
                                            {header}
                                            <span className="font-normal ml-2 text-gray-500">({gruppeCounts[header].faerdige}/{gruppeCounts[header].aktive})</span>
                                        </td>
                                    </tr>
                                    {udvidedeGrupper[header] && (
                                        nuvaerendeAktiviteter.filter(a => `${a.proces?.nr || ''}.${a.gruppe?.nr || ''} - ${a.proces?.titel_kort || ''} / ${a.gruppe?.titel_kort || ''}` === header)
                                        .map(a => (
                                            <tr key={a.id} className="border-b border-gray-200 hover:bg-gray-100">
                                                <td className="py-1 px-2 text-center"><input type="checkbox" checked={!!a.aktiv} onChange={(e) => handleInlineSave(a.id, 'aktiv', e.target.checked)} /></td>
                                                <td className="py-1 px-2">{a.aktivitet_nr}</td>
                                                <td className="py-1 px-2 break-words">{a.aktivitet}</td>
                                                <td className="py-1 px-2">
                                                    <select
                                                        value={a.status?.id || ''}
                                                        onChange={(e) => handleInlineSave(a.id, 'status', e.target.value)}
                                                        className="w-full p-1 border rounded-md text-sm bg-white"
                                                    >
                                                        <option value="">Vælg...</option>
                                                        {aktivitetStatusser.map(s => (
                                                            <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="py-1 px-2"><InlineTextEditor value={a.ansvarlig} onSave={(val) => handleInlineSave(a.id, 'ansvarlig', val)} /></td>
                                                <td className="py-1 px-2"><input type="date" value={a.dato_intern || ''} onChange={(e) => handleInlineSave(a.id, 'dato_intern', e.target.value)} className={`w-full p-1 border rounded-md text-sm bg-white focus:text-gray-700 ${!a.dato_intern ? 'text-transparent' : ''}`} /></td>
                                                <td className="py-1 px-2"><input type="date" value={a.dato_ekstern || ''} onChange={(e) => handleInlineSave(a.id, 'dato_ekstern', e.target.value)} className={`w-full p-1 border rounded-md text-sm bg-white focus:text-gray-700 ${!a.dato_ekstern ? 'text-transparent' : ''}`} /></td>
                                                <td className="py-1 px-2"><InlineTextEditor value={a.resultat} onSave={(val) => handleInlineSave(a.id, 'resultat', val)} /></td>
                                                <td className="py-1 px-2 text-center"><button onClick={() => alert(`Redigerer kommentar for: ${a.aktivitet}`)} title="Rediger aktivitet/kommentar"><Edit size={16} className="text-blue-600" /></button></td>
                                            </tr>
                                        ))
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AktiviteterPage;