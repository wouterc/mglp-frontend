// --- Fil: src/pages/AktiviteterPage.tsx ---
// @# 2025-09-15 21:45 - Endelig version der sikrer, at filtre altid sendes korrekt ved alle API-kald.
// @# 2025-11-03 21:10 - Tilføjet useEffect til at gen-hente åbne grupper ved filter-ændring.
// @# 2025-11-03 21:20 - Flyttet 'hentGruppeAktiviteter' op før dens anvendelse for at rette 'used before declaration'-fejl.
// @# 2025-11-03 21:30 - Rettet uendelig loop ved at fjerne 'gruppeLoadingStatus' fra dependencies i 'hentGruppeAktiviteter'
// @# 2025-11-03 22:15 - Ændret dispatch til at bruge ny 'SET_GRUPPE_LOADING' action.
import React, { useState, useEffect, useCallback, Fragment, ReactElement, ChangeEvent, KeyboardEvent, useRef, useMemo } from 'react';
import { api } from '../api';
import { Edit, Maximize2, Search, ChevronDown, ChevronUp, MessageSquare, Info, ChevronsDown, ChevronsUp, RefreshCw, PlusCircle, UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';
// @# 2025-11-03 21:45 - Fjernet useDebounce
// import useDebounce from '../hooks/useDebounce'; 
import { useAppState } from '../StateContext';
import type { Status, Aktivitet, Sag, AktivitetGruppeSummary, AktiviteterFilterState, User } from '../types';
import SagsAktivitetForm from '../components/SagsAktivitetForm';
import Tooltip from '../components/Tooltip';
import SmartDateInput from '../components/SmartDateInput';
import { useTableNavigation } from '../hooks/useTableNavigation';
import ConfirmModal from '../components/ui/ConfirmModal';

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

const InlineTextEditor = ({ value, onSave, type = "text", id, onExpand }: InlineEditorProps & { onExpand?: () => void }): ReactElement => {
    const [text, setText] = useState(value);
    useEffect(() => { setText(value); }, [value]);
    const handleBlur = () => { if (text !== value) { onSave(text || ''); } };

    return (
        <div className="relative group/editor">
            <input
                id={id}
                type={type}
                value={text || ''}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                className="w-full py-0.5 px-1 pr-7 border border-gray-300 rounded-md text-sm bg-white focus:border-black focus:ring-0 truncate"
                title={text || ''}
            />
            {onExpand && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover/editor:opacity-100 transition-opacity"
                    title="Udvid (Modal)"
                >
                    <Maximize2 size={12} />
                </button>
            )}
        </div>
    );
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
    const [redigeringsMode, setRedigeringsMode] = useState<'kommentar' | 'resultat'>('kommentar');
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({});
    const [isSavingNy, setIsSavingNy] = useState<Record<number, boolean>>({});

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
        if (filters.vigtige) params.append('vigtige', 'true');
        return params.toString();
    }, []);

    const hentGruppeSummering = useCallback(async (currentSag: Sag, filters: AktiviteterFilterState) => {
        dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true, aktiviteterError: null } });
        const queryString = buildQueryString(filters, currentSag.id);

        try {
            const data = await api.get<AktivitetGruppeSummary[]>(`/aktiviteter/?${queryString}`);
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
    // --- Local State for DATA ---
    const { cachedAktiviteter } = state;
    const [allActivities, setAllActivities] = useState<Aktivitet[]>([]);
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const [nyeAktiviteterFindes, setNyeAktiviteterFindes] = useState(false);
    const [colleagues, setColleagues] = useState<User[]>([]);

    useEffect(() => {
        api.get<User[]>('/kerne/users/').then(data => {
            setColleagues(data.filter(u => u.is_active));
        });
    }, []);

    // Dialog-state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const showAlert = (title: string, message: string) => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => { },
        });
    };

    // --- Hent ALT data ved sags-skift ---
    useEffect(() => {
        if (!valgtSag) {
            setAllActivities([]);
            return;
        }

        // 1. Sæt data fra cache med det samme hvis det findes
        if (cachedAktiviteter[valgtSag.id]) {
            setAllActivities(cachedAktiviteter[valgtSag.id]);
        } else {
            setAllActivities([]); // Ryd hvis ingen cache
        }

        const fetchAll = async () => {
            // Kun vis loading-spinner hvis vi ikke har data i cachen
            const hasCachedData = !!cachedAktiviteter[valgtSag.id];

            setIsFetchingAll(true);
            if (!hasCachedData) {
                dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true, aktiviteterError: null } });
            }

            try {
                const data = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${valgtSag.id}`);
                setAllActivities(data);
                // Opdater cachen i global state
                dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: valgtSag.id, aktiviteter: data } });

                // Tjek også global synk-status
                const syncRes = await api.get<any>('/skabeloner/aktiviteter/sync_check/');
                setNyeAktiviteterFindes(syncRes.nye_aktiviteter_findes || false);
            } catch (e: any) {
                dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterError: e.message } });
            } finally {
                setIsFetchingAll(false);
                dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: false } });
            }
        };

        fetchAll();
    }, [valgtSag, dispatch]); // Fjern cachedAktiviteter som dependency for at undgå loop, da vi opdaterer den indeni.

    const handleQuickAdd = async (gruppeId: number, procesId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const navn = quickAddValues[gruppeId]?.trim();
        if (!navn || !valgtSag) return;

        setIsSavingNy(prev => ({ ...prev, [gruppeId]: true }));
        try {
            await api.post('/aktiviteter/', {
                sag_id: valgtSag.id,
                gruppe_id: gruppeId,
                proces_id: procesId,
                aktivitet: navn,
                aktiv: true
            });
            setQuickAddValues(prev => ({ ...prev, [gruppeId]: '' }));
            // Genhent data
            const data = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${valgtSag.id}`);
            setAllActivities(data);
            dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: valgtSag.id, aktiviteter: data } });
        } catch (e: any) {
            showAlert('Systemet siger', "Fejl ved hurtig-tilføj: " + (e.message || "Ukendt fejl"));
        } finally {
            setIsSavingNy(prev => ({ ...prev, [gruppeId]: false }));
        }
    };

    const handleGemTilSkabelon = async (aktivitet: Aktivitet) => {
        const gruppeInfo = `${aktivitet.proces?.nr}.${aktivitet.gruppe?.nr} ${aktivitet.proces?.titel_kort} / ${aktivitet.gruppe?.titel_kort}`;
        setConfirmDialog({
            isOpen: true,
            title: 'Gem som skabelon',
            message: `Vil du gemme "${aktivitet.aktivitet}" som en permanent skabelon i ${gruppeInfo}?`,
            confirmText: 'Gem nu',
            cancelText: 'Annuller',
            onConfirm: async () => {
                try {
                    await api.post(`/aktiviteter/${aktivitet.id}/gem_til_skabelon/`);
                    showAlert('Systemet siger', "Aktiviteten er nu gemt som skabelon og markeres som synkroniseret.");
                    // Opdater lokal state
                    const updated = allActivities.map(a => a.id === aktivitet.id ? { ...a, er_ny: false } : a);
                    setAllActivities(updated);
                    dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: valgtSag!.id, aktiviteter: updated } });
                    setNyeAktiviteterFindes(true);
                } catch (e: any) {
                    showAlert('Systemet siger', "Fejl ved gem til skabelon: " + (e.message || "Ukendt fejl"));
                }
            }
        });
    };

    // --- LOKAL FILTRERING OG GRUPPERING ---
    const { filteredGroups, groupedActivities } = useMemo(() => {
        if (!allActivities.length) return { filteredGroups: [], groupedActivities: {} };

        const filters = aktiviteterFilters;
        const lowerAkt = filters.aktivitet.toLowerCase();
        const lowerAns = filters.ansvarlig.toLowerCase();
        const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local time

        // 1. Filtrer aktiviteter
        const filtered = allActivities.filter(a => {
            // Tekst søgning
            if (lowerAkt && !a.aktivitet?.toLowerCase().includes(lowerAkt)) return false;
            // Ansvarlig søgning (bemærk ansvarlig kan være null)
            if (lowerAns && !a.ansvarlig?.toLowerCase().includes(lowerAns)) return false;

            // Status
            if (filters.status) {
                if (filters.status === 'ikke-faerdigmeldt') {
                    if (a.status?.status_kategori === 1) return false; // 1 = Færdig
                } else {
                    if (a.status?.id.toString() !== filters.status.toString()) return false;
                }
            }

            // Aktiv / Alle / Udgået sjekkes typisk via 'aktiv' flaget?
            // "kun_aktive" betyder a.aktiv === true
            // "alle" betyder status quo (tager både aktiv true/false?)
            // I backend 'aktiv_filter' var implementationen: hvis 'kun_aktive' -> filter(aktiv=True).
            if (filters.aktiv_filter === 'kun_aktive' && !a.aktiv) return false;

            // Datoer
            // Bemærk: dato_intern_efter betyder dato >= filter
            if (filters.dato_intern_efter && (!a.dato_intern || new Date(a.dato_intern) < new Date(filters.dato_intern_efter))) return false;
            if (filters.dato_intern_foer && (!a.dato_intern || new Date(a.dato_intern) > new Date(filters.dato_intern_foer))) return false;

            // Overskredet logik
            // Overskredet Filter
            if (filters.overskredet) {
                // Done check: Hvis aktiviteten er færdigmeldt, er den ikke overskredet
                const isDone = a.status?.status_kategori === 1;
                if (isDone) return false;

                // Dato check: Sammenlign datoer korrekt
                const internPast = a.dato_intern && new Date(a.dato_intern) < new Date(today);
                const eksternPast = a.dato_ekstern && new Date(a.dato_ekstern) < new Date(today);

                // Hvis ingen af datoerne er i fortiden, er den ikke overskredet
                if (!internPast && !eksternPast) return false;
            }

            // Vigtige (Important comments) Filter
            if (filters.vigtige && !a.kommentar_vigtig) {
                return false;
            }

            return true;
        });

        // 2. Gruppér og beregn counts
        // Vi skal bruge TOTAL counts per gruppe (uanset filter) for headeren "4/41"
        // Og FILTERED counts for headeren "Viser: 2"

        // Map: "procesId-gruppeId" -> { proces, gruppe, filtered: [], totalCount: 0, totalDone: 0 }
        const groupsMap: Record<string, any> = {};

        // Først, kør igennem ALLE aktiviteter for at få total counts
        allActivities.forEach(a => {
            if (!a.gruppe || !a.proces) return;
            const key = `${a.proces.id}-${a.gruppe.id}`;
            if (!groupsMap[key]) {
                groupsMap[key] = {
                    proces: a.proces,
                    gruppe: a.gruppe,
                    filteredAktiviteter: [],
                    total_aktiv_count: 0,
                    total_faerdig_count: 0,
                    filtered_aktiv_count: 0,
                    filtered_faerdig_count: 0
                };
            }
            // Tæl totaler (husk 'aktiv' flag logic fra backend: total_summary filtered on aktiv=True usually.
            // Hvis vi følger backend logikken: "total" i headeren plejer at være "aktive aktiviteter".
            if (a.aktiv) {
                groupsMap[key].total_aktiv_count++;
                if (a.status?.status_kategori === 1) {
                    groupsMap[key].total_faerdig_count++;
                }
            }
        });

        // Nu tilføj de filtrerede til listerne
        filtered.forEach(a => {
            if (!a.gruppe || !a.proces) return;
            const key = `${a.proces.id}-${a.gruppe.id}`;
            if (groupsMap[key]) {
                groupsMap[key].filteredAktiviteter.push(a);
                // Opdater filtered counts (kun hvis den tæller med i statistikken? Typisk tæller vi bare rækkerne der vises)
                groupsMap[key].filtered_aktiv_count++;
                if (a.status?.status_kategori === 1) {
                    groupsMap[key].filtered_faerdig_count++;
                }
            }
        });

        // Konverter map til array og sorter
        const processedGroups = Object.values(groupsMap).filter((g: any) =>
            // Vis kun grupper der enten har filtrerede aktiviteter ELLER (hvis ingen filter matcher) måske skjule?
            // Backend viste "Ingen aktiviteter matcher" hvis listen var tom.
            // Her viser vi typisk gruppen hvis den har resultater.
            g.filteredAktiviteter.length > 0
        ).sort((a: any, b: any) => {
            if (a.proces.nr !== b.proces.nr) return a.proces.nr - b.proces.nr;
            return a.gruppe.nr - b.gruppe.nr;
        });

        // Lav lookup map for aktiviteter
        const actMap: Record<string, Aktivitet[]> = {};
        processedGroups.forEach((g: any) => {
            // Sorter aktiviteter internt i gruppen
            g.filteredAktiviteter.sort((a: Aktivitet, b: Aktivitet) => (a.aktivitet_nr || 0) - (b.aktivitet_nr || 0));
            const key = `${g.proces.id}-${g.gruppe.id}`;
            actMap[key] = g.filteredAktiviteter;
        });

        return { filteredGroups: processedGroups, groupedActivities: actMap };

    }, [allActivities, aktiviteterFilters]);

    // Dummy funktioner for kompabilitet med existing JSX (vi bruger nu local vars)
    // Men vi skal overskrive 'nuvaerendeGruppeSummering' variablen i render scope


    useEffect(() => {
        const fetchAktivitetStatusser = async () => {
            try {
                const data = await api.get<any>('/kerne/status/?formaal=2');
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
                const data = await api.get<SøgeResultat[]>(`/sager/search/?q=${trimmedSearch}`);
                setSøgeResultater(data);
                setActiveIndex(-1);
            } catch (error) { console.error("Fejl ved søgning af sager:", error); }
        };
        searchSager();
    }, [debouncedSøgning]);

    const handleSelectSag = async (sagSøgning: SøgeResultat) => {
        try {
            const fuldSag = await api.get<Sag>(`/sager/${sagSøgning.id}/`);
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
        if (!filteredGroups.length || !valgtSag) return;
        const alleGruppeKeys = filteredGroups.reduce((acc: any, gruppe: any) => {
            const gruppeKey = `${gruppe.proces.id}-${gruppe.gruppe.id}`;
            acc[gruppeKey] = vis;
            return acc;
        }, {} as { [key: string]: boolean });
        dispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterUdvidedeGrupper: { ...aktiviteterUdvidedeGrupper, [valgtSag.id]: alleGruppeKeys } },
        });
    };

    const handleToggleGruppe = async (gruppe: any) => { // Type 'any' pga vores local filteredGroups struct
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
    };

    const handleInlineSave = async (aktivitet: Aktivitet, field: string, value: string | boolean | null) => {
        const feltNavn = field === 'status' ? 'status_id' : field;
        const payload = { [feltNavn]: value };
        try {
            const opdateretAktivitet = await api.patch<Aktivitet>(`/aktiviteter/${aktivitet.id}/`, payload);

            // Opdater lokal state direkte
            setAllActivities(prev => prev.map(a =>
                a.id === opdateretAktivitet.id ? opdateretAktivitet : a
            ));

        } catch (e) {
            console.error("Fejl ved inline save:", e);
        }
    };

    const handleStatusToggle = async (aktivitet: Aktivitet) => {
        const isDone = aktivitet.status?.status_nummer === 80;
        const targetStatusNr = isDone ? 10 : 80;
        const targetStatus = aktivitetStatusser.find(s => s.status_nummer === targetStatusNr);

        if (targetStatus) {
            await handleInlineSave(aktivitet, 'status', targetStatus.id.toString());
        }
    };

    const handleSynkroniser = async () => {
        if (!valgtSag) return;
        setIsFetchingAll(true);
        try {
            const res = await api.post<any>(`/sager/${valgtSag.id}/synkroniser_aktiviteter/`);
            // Genhent alt data
            const data = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${valgtSag.id}`);
            setAllActivities(data);
            dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: valgtSag.id, aktiviteter: data } });
            setNyeAktiviteterFindes(false);

            if (res.detaljer) {
                showAlert('Systemet siger', res.detaljer);
            } else if (res.tilfoejede && res.tilfoejede.length > 0) {
                showAlert('Systemet siger', `Synkronisering fuldført! ${res.tilfoejede.length} nye aktiviteter tilføjet:\n\n- ${res.tilfoejede.join('\n- ')}`);
            } else {
                showAlert('Systemet siger', "Sagen er allerede fuldt synkroniseret.");
            }
        } catch (e: any) {
            showAlert('Systemet siger', `Fejl ved synkronisering: ${e.message}`);
        } finally {
            setIsFetchingAll(false);
        }
    };

    const handleFormSave = () => {
        setAktivitetTilRedigering(null);
        if (valgtSag) {
            // Genhent alt data for at være sikker ved store opdateringer
            // (Vi kalder fetchAll via en simpel trigger - eller vi kopierer fetchAll logikken her, 
            // men da fetchAll er i useEffect afhængig af sag, kan vi potentielt tvinge en reload ved at toggle sag,
            // men bedre: kald fetchAll logik explict. Da fetchAll er inde i useEffect, kan vi ikke kalde den udefra.
            // Løsning: Vi flytter fetch logic ud eller genindlæser manuelt:
            // Simpel hack: tøm allActivities og lad useEffect køre igen? Nej, useEffect kører på valgtSag.
            // Vi duplerer bare fetch logikken her for enkelhedens skyld, da det er en 'reload'.
            const reload = async () => {
                dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true } });
                try {
                    const data = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${valgtSag.id}`);
                    setAllActivities(data);
                } finally {
                    dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: false } });
                }
            };
            reload();
        }
    };

    const visteAktiviteterForGruppe = (gruppeId: number) => {
        return hentedeAktiviteter[gruppeId] || [];
    };

    const samletTaeling = useMemo(() => {
        return filteredGroups.reduce((acc: any, gruppe: any) => {
            acc.total += gruppe.total_aktiv_count;
            acc.faerdige += gruppe.total_faerdig_count;
            return acc;
        }, { total: 0, faerdige: 0 });
    }, [filteredGroups]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {aktivitetTilRedigering && (
                <SagsAktivitetForm
                    aktivitet={aktivitetTilRedigering}
                    sagId={valgtSag?.id || null}
                    mode={redigeringsMode}
                    onSave={handleFormSave}
                    onCancel={() => setAktivitetTilRedigering(null)}
                />
            )}

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex justify-between items-start gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            Aktiviteter for Sag {valgtSag ? `${valgtSag.sags_nr} - ${valgtSag.alias}` : 'Vælg en sag'}
                            {valgtSag && (
                                <span className="text-lg font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {samletTaeling.faerdige} / {samletTaeling.total}
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-1">
                            <Tooltip content="Fold alle grupper ud">
                                <button onClick={() => handleToggleAlleGrupper(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                    <ChevronsDown size={20} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Fold alle grupper sammen">
                                <button onClick={() => handleToggleAlleGrupper(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                    <ChevronsUp size={20} />
                                </button>
                            </Tooltip>
                            <div className="h-4 w-px bg-gray-300 mx-1"></div>
                            {valgtSag && (nyeAktiviteterFindes || isFetchingAll) && (
                                <Tooltip content="Nye aktiviteter fundet - Klik for at rulle ud til alle sager">
                                    <button
                                        onClick={handleSynkroniser}
                                        disabled={isFetchingAll}
                                        className={`
                                            p-1.5 rounded-full transition-all border
                                            ${isFetchingAll ? 'animate-spin opacity-50 text-blue-600 border-transparent' : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 animate-pulse'}
                                        `}
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                    {valgtSag?.fuld_adresse && (
                        <div className="text-gray-500 flex items-center gap-1 text-sm">
                            <span className="font-medium">{valgtSag.fuld_adresse}</span>
                        </div>
                    )}
                </div>

                <div className="relative min-w-72">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-4 w-4 text-gray-400" /></div>
                    <input id="sag-soeg" type="text" value={søgning} onChange={(e) => setSøgning(e.target.value)} onKeyDown={handleKeyDown} placeholder="Skift sag..." className="w-full pl-9 pr-4 py-2 border border-slate-400 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" autoComplete="off" />
                    {søgeResultater.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-auto shadow-xl py-1">
                            {søgeResultater.map((sag, index) => (
                                <li key={sag.id} onClick={() => handleSelectSag(sag)} onMouseEnter={() => setActiveIndex(index)} className={`px-4 py-2 text-sm cursor-pointer border-b last:border-0 border-gray-50 ${index === activeIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <span className="font-bold">{sag.sags_nr}</span>
                                    <span className="mx-2 opacity-50">|</span>
                                    <span>{sag.alias}</span>
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
                            <th className="py-1 px-2 w-[4%]">Aktiv</th>
                            <th className="py-1 px-2 w-[28%] text-left">GRUPPE / AKTIVITET</th>
                            <th className="py-1 px-2 w-[8%] text-center">Dato Intern</th>
                            <th className="py-1 px-2 w-[8%] text-center">Dato Ekstern</th>
                            <th className="py-1 px-2 w-[4%] text-center">Info</th>
                            <th className="py-1 px-2 w-[14%] text-left">Status</th>
                            <th className="py-1 px-2 w-[25%] text-left">Resultat</th>
                            <th className="py-1 px-2 w-[9%] text-left">Ansvarlig</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aktiviteterIsLoading || isFetchingAll ? (
                            <tr><td colSpan={8} className="text-center p-4">Henter aktiviteter...</td></tr>
                        ) : state.aktiviteterError ? (
                            <tr><td colSpan={8} className="text-center p-4 text-red-600 font-bold">Fejl ved hentning: {state.aktiviteterError}</td></tr>
                        ) : !valgtSag ? (
                            <tr><td colSpan={8} className="text-center p-4">Vælg venligst en sag for at se aktiviteter.</td></tr>
                        ) : filteredGroups.length === 0 ? (
                            <tr><td colSpan={8} className="text-center p-4">Ingen aktiviteter matcher de valgte filtre.</td></tr>
                        ) : filteredGroups.map((gruppeSummary: any) => {
                            const gruppeKey = `${gruppeSummary.proces.id}-${gruppeSummary.gruppe.id}`;
                            const erUdvidet = !!aktiviteterUdvidedeGrupper[valgtSag!.id]?.[gruppeKey];
                            const aktiviteter = groupedActivities[gruppeKey] || [];

                            const harAktivtFilter = gruppeSummary.filtered_aktiv_count !== gruppeSummary.total_aktiv_count; // Simplificeret check for visuel indikator

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
                                    {erUdvidet && aktiviteter.map((aktivitet: Aktivitet) => (
                                        <tr key={aktivitet.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="py-0.5 px-2 text-center">
                                                <input id={`cell-${aktivitet.id}-0`} type="checkbox" checked={!!aktivitet.aktiv} onChange={(e) => handleInlineSave(aktivitet, 'aktiv', e.target.checked)} />
                                            </td>
                                            <td className="py-0.5 px-2 pl-8 break-words text-xs">{aktivitet.aktivitet_nr} - {aktivitet.aktivitet}</td>
                                            <td className="py-0.5 px-2">
                                                <SmartDateInput value={aktivitet.dato_intern} onSave={(val) => handleInlineSave(aktivitet, 'dato_intern', val)} className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!aktivitet.dato_intern ? 'text-transparent hover:text-gray-400' : ''}`} />
                                            </td>
                                            <td className="py-0.5 px-2">
                                                <SmartDateInput value={aktivitet.dato_ekstern} onSave={(val) => handleInlineSave(aktivitet, 'dato_ekstern', val)} className={`w-full py-0.5 px-1 border border-gray-300 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!aktivitet.dato_ekstern ? 'text-transparent hover:text-gray-400' : ''}`} />
                                            </td>
                                            <td className="py-0.5 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1.5 h-full">
                                                    {/* Slot 1: Skabelon Info / Note */}
                                                    <div className="w-4 flex justify-center">
                                                        {(aktivitet.skabelon_note || aktivitet.note) && (
                                                            <Tooltip content={aktivitet.skabelon_note || aktivitet.note}>
                                                                <Info size={14} className="text-amber-500 cursor-help" />
                                                            </Tooltip>
                                                        )}
                                                    </div>

                                                    {/* Slot 2: Bruger Kommentar */}
                                                    <div className="w-5 flex justify-center">
                                                        <Tooltip content={aktivitet.kommentar || "Tilføj kommentar"}>
                                                            <button
                                                                id={`cell-${aktivitet.id}-3`}
                                                                onClick={() => { setRedigeringsMode('kommentar'); setAktivitetTilRedigering(aktivitet); }}
                                                                className={`p-0.5 rounded transition-colors ${aktivitet.kommentar_vigtig
                                                                    ? 'text-red-600 hover:bg-red-50'
                                                                    : aktivitet.kommentar
                                                                        ? 'text-blue-600 hover:bg-blue-50'
                                                                        : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                                                    }`}
                                                            >
                                                                <MessageSquare size={16} fill={aktivitet.kommentar ? "currentColor" : "none"} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Slot 3: Ny (Skabelon Upload) */}
                                                    <div className="w-5 flex justify-center">
                                                        {aktivitet.er_ny && (
                                                            <Tooltip content="Denne aktivitet er kun på denne sag. Klik for at gemme den som en global skabelon.">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleGemTilSkabelon(aktivitet); }}
                                                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                                >
                                                                    <UploadCloud size={16} />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`py-0.5 px-2 transition-colors ${aktivitet.status?.status_nummer === 80 ? 'bg-green-50' : ''}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleStatusToggle(aktivitet)}
                                                        className={`flex-shrink-0 transition-colors ${aktivitet.status?.status_nummer === 80
                                                            ? 'text-green-600 hover:text-green-700'
                                                            : 'text-gray-300 hover:text-gray-500'
                                                            }`}
                                                        title={aktivitet.status?.status_nummer === 80 ? "Sæt til 'Oprettet'" : "Sæt til 'Udført'"}
                                                    >
                                                        <CheckCircle2 size={16} fill={aktivitet.status?.status_nummer === 80 ? "currentColor" : "none"} />
                                                    </button>
                                                    <select
                                                        id={`cell-${aktivitet.id}-2`}
                                                        value={aktivitet.status?.id || ''}
                                                        onChange={(e) => handleInlineSave(aktivitet, 'status', e.target.value)}
                                                        className={`flex-grow py-0.5 px-1 border rounded-md text-xs bg-transparent focus:border-black focus:ring-0 ${aktivitet.status?.status_nummer === 80 ? 'border-green-200 text-green-800 font-medium' : 'border-gray-300'
                                                            }`}
                                                    >
                                                        <option value="">Vælg...</option>
                                                        {aktivitetStatusser.map(s => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="py-0.5 px-2">
                                                <InlineTextEditor
                                                    id={`cell-${aktivitet.id}-7`}
                                                    value={aktivitet.resultat}
                                                    onSave={(val) => handleInlineSave(aktivitet, 'resultat', val)}
                                                    onExpand={() => { setRedigeringsMode('resultat'); setAktivitetTilRedigering(aktivitet); }}
                                                />
                                            </td>
                                            <td className="py-0.5 px-2">
                                                <select
                                                    id={`cell-${aktivitet.id}-4`}
                                                    value={aktivitet.ansvarlig || ''}
                                                    onChange={(e) => handleInlineSave(aktivitet, 'ansvarlig', e.target.value)}
                                                    className="w-full py-0.5 px-1 border border-gray-300 rounded-md text-xs bg-white focus:border-black focus:ring-0"
                                                >
                                                    <option value="">Ingen</option>
                                                    {colleagues.map(u => (
                                                        <option key={u.id} value={u.username}>{u.username}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Hurtig-tilføj række i bunden af gruppen */}
                                    {erUdvidet && (
                                        <tr className="bg-blue-50/20 border-b border-blue-100">
                                            <td className="py-1 px-2 text-center text-blue-300">
                                                <PlusCircle size={14} className="mx-auto" />
                                            </td>
                                            {/* Input: Spans Aktivitet, Datoer og Info (5 cols) */}
                                            <td className="py-1 px-2" colSpan={5}>
                                                <form onSubmit={(e) => handleQuickAdd(gruppeSummary.gruppe.id, gruppeSummary.proces.id, e)}>
                                                    <input
                                                        type="text"
                                                        placeholder="Nyt aktivitet navn... (Enter for at gemme)"
                                                        value={quickAddValues[gruppeSummary.gruppe.id] || ''}
                                                        onChange={(e) => setQuickAddValues(prev => ({ ...prev, [gruppeSummary.gruppe.id]: e.target.value }))}
                                                        className="w-full px-2 py-0.5 text-sm border border-blue-100 rounded focus:ring-1 focus:ring-blue-400 outline-none bg-white/50"
                                                    />
                                                </form>
                                            </td>
                                            {/* Button: Spans Status, Resultat, Ansvarlig (3 cols) */}
                                            <td className="py-1 px-2" colSpan={3}>
                                                <button
                                                    onClick={() => handleQuickAdd(gruppeSummary.gruppe.id, gruppeSummary.proces.id)}
                                                    disabled={isSavingNy[gruppeSummary.gruppe.id] || !quickAddValues[gruppeSummary.gruppe.id]?.trim()}
                                                    className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors flex items-center gap-1"
                                                >
                                                    {isSavingNy[gruppeSummary.gruppe.id] ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                                                    Hurtig-tilføj
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {confirmDialog.isOpen && (
                <ConfirmModal
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText={confirmDialog.confirmText}
                    cancelText={confirmDialog.cancelText}
                    onConfirm={confirmDialog.onConfirm}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                />
            )}
        </div>
    );
}

export default AktiviteterPage;