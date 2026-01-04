
// --- Fil: src/pages/AktiviteterPage.tsx ---
// @# 2025-09-15 21:45 - Endelig version der sikrer, at filtre altid sendes korrekt ved alle API-kald.
// @# 2025-11-03 21:10 - Tilføjet useEffect til at gen-hente åbne grupper ved filter-ændring.
// @# 2025-12-25 20:30 - Refactoring: Added internal FilterSidebar, CaseSelector, and AktivitetRow.
import React, { useState, useEffect, useCallback, Fragment, ReactElement, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, RefreshCw, PlusCircle, Mail } from 'lucide-react';
import { useAppState } from '../StateContext';
import type { Status, Aktivitet, Sag, AktivitetGruppeSummary, AktiviteterFilterState, User, InformationsKilde } from '../types';
import SagsAktivitetForm from '../components/SagsAktivitetForm';
import Tooltip from '../components/Tooltip';
import { useTableNavigation } from '../hooks/useTableNavigation';
import AktiviteterFilter from '../components/AktiviteterFilter';
import AktivitetRow from '../components/rows/AktivitetRow';
import CaseSelector from '../components/ui/CaseSelector';
import ConfirmModal from '../components/ui/ConfirmModal';
import ActivityDocumentLinkerModal from '../components/modals/ActivityDocumentLinkerModal'; // @# New Import
import { SagsDokument } from '../types'; // @# New Import
import { Link as LinkIcon } from 'lucide-react'; // @# New Import
import LinkOpenPreferenceModal from '../components/modals/LinkOpenPreferenceModal';


interface AktiviteterPageProps {
    sagId: number | null;
}

// --- Hovedkomponent ---
function AktiviteterPage({ sagId }: AktiviteterPageProps): ReactElement {
    const { state, dispatch } = useAppState();
    const location = useLocation();
    const { valgtSag, hentedeAktiviteter, gruppeLoadingStatus, aktiviteterIsLoading, aktiviteterFilters, aktiviteterUdvidedeGrupper, cachedAktiviteter, users: colleagues, aktivitetStatusser, informationsKilder } = state;

    // UI State
    const [aktivitetTilRedigering, setAktivitetTilRedigering] = useState<Aktivitet | null>(null);
    const [redigeringsMode, setRedigeringsMode] = useState<'kommentar' | 'resultat'>('kommentar');
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({});
    const [isSavingNy, setIsSavingNy] = useState<Record<number, boolean>>({});
    const [activeRow, setActiveRow] = useState<number | null>(null);

    // Modal states
    const [confirmTemplateActivity, setConfirmTemplateActivity] = useState<Aktivitet | null>(null);
    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'info' | 'success' | 'error' } | null>(null);


    // State for Link Preference Modal
    const [showLinkPreferenceModal, setShowLinkPreferenceModal] = useState<{ aktivitet: Aktivitet } | null>(null);

    const openLinkApp = useCallback((aktivitet: Aktivitet, mode: 'window' | 'tab') => {
        if (!valgtSag) return;
        const ids = aktivitet.dokumenter?.join(',');
        const url = `/dokumenter?sag_id=${valgtSag.id}&ids=${ids}`;

        if (mode === 'window') {
            const width = 1200;
            const height = 800;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(url, `LinkedDocuments_Window`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        } else {
            window.open(url, '_blank');
        }
    }, [valgtSag]);

    const handleLinkAppClick = (aktivitet: Aktivitet) => {
        if (!aktivitet.dokumenter || aktivitet.dokumenter.length === 0 || !valgtSag) return;

        // 1. Check user preference from currentUser (global state)
        // Note: We need to access currentUser from state.currentUser (useAppState)
        const userPref = state.currentUser?.preferred_link_open_mode;

        if (userPref) {
            openLinkApp(aktivitet, userPref);
        } else {
            // 2. No preference -> Show Modal
            setShowLinkPreferenceModal({ aktivitet });
        }
    };

    const handleSaveLinkPreference = (mode: 'window' | 'tab') => {
        if (!showLinkPreferenceModal) return;

        // 1. Open immediately to avoid opup blocker (must be sync with user click)
        const { aktivitet } = showLinkPreferenceModal;
        openLinkApp(aktivitet, mode);

        setShowLinkPreferenceModal(null);

        // 2. Save to backend in background
        api.patch<User>('/kerne/me/', { preferred_link_open_mode: mode })
            .then(updatedUser => {
                // Update global state
                dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
            })
            .catch(e => {
                console.error("Kunne ikke gemme præference", e);
            });
    };


    const tableRef = useRef<HTMLTableElement>(null);
    useTableNavigation(tableRef);

    // --- Local State for DATA ---
    const [allActivities, setAllActivities] = useState<Aktivitet[]>([]);
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const [nyeAktiviteterFindes, setNyeAktiviteterFindes] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
    }>({
        isOpen: false, title: '', message: '', onConfirm: () => { },
    });

    // Helper to show alert (could be replaced by proper Modal usage)
    const showAlert = (title: string, message: string) => {
        setFeedbackModal({ isOpen: true, title, message, type: 'info' });
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

        // 2. Hent i baggrunden hvis vi har cache, ellers vis loader
        fetchAktiviteterPåSag(valgtSag.id);
    }, [valgtSag?.id, dispatch]); // @# Kun reager på sags-ID ændring

    const fetchAktiviteterPåSag = async (sagId: number) => {
        const hasCachedData = !!cachedAktiviteter[sagId];

        // Kun vis "Hoved-loading" hvis vi slet ikke har data
        if (!hasCachedData) {
            dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true, aktiviteterError: null } });
        }

        // isFetchingAll styrer den lille spinner i headeren
        setIsFetchingAll(true);

        try {
            const data = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${sagId}`);
            setAllActivities(data);
            dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: sagId, aktiviteter: data } });

            const syncRes = await api.get<any>('/skabeloner/aktiviteter/sync_check/');
            setNyeAktiviteterFindes(syncRes.nye_aktiviteter_findes || false);
        } catch (e: any) {
            if (!hasCachedData) {
                dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterError: e.message } });
            }
            console.error("Fejl ved hentning af aktiviteter:", e);
        } finally {
            setIsFetchingAll(false);
            dispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: false } });
        }
    };

    const handleSelectSag = async (sagId: number) => {
        try {
            const fuldSag = await api.get<Sag>(`/sager/${sagId}/`);
            dispatch({ type: 'NULSTIL_HENTEDE_AKTIVITETER' });
            dispatch({ type: 'SET_VALGT_SAG', payload: fuldSag });
        } catch (e: any) { console.error(e.message); }
    };

    const handleQuickAdd = async (gruppeId: number, procesId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const navn = quickAddValues[gruppeId]?.trim();
        if (!navn || !valgtSag) return;

        // Calculate next number (100+ strategy)
        const existingInGroup = allActivities.filter(a => a.gruppe?.id === gruppeId && a.proces?.id === procesId);
        const maxNr = existingInGroup.length > 0 ? Math.max(...existingInGroup.map(a => a.aktivitet_nr || 0)) : 0;
        const nextNr = maxNr < 100 ? 101 : maxNr + 1;

        setIsSavingNy(prev => ({ ...prev, [gruppeId]: true }));
        try {
            await api.post('/aktiviteter/', {
                sag_id: valgtSag.id,
                gruppe_id: gruppeId,
                proces_id: procesId,
                aktivitet_nr: nextNr,
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

    const handleGemTilSkabelon = useCallback((aktivitet: Aktivitet) => {
        setConfirmTemplateActivity(aktivitet);
    }, []);

    const performGemTilSkabelon = async () => {
        if (!confirmTemplateActivity) return;

        try {
            const response = await api.post<{ ny_aktivitet_nr: number }>(`/aktiviteter/${confirmTemplateActivity.id}/gem_til_skabelon/`);

            // Opdater lokal state med nyt nummer og fjern 'ny' status
            const updated = allActivities.map(a =>
                a.id === confirmTemplateActivity.id
                    ? { ...a, er_ny: false, aktivitet_nr: response.ny_aktivitet_nr }
                    : a
            );

            setAllActivities(updated);
            dispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId: valgtSag!.id, aktiviteter: updated } });
            setNyeAktiviteterFindes(true);

            setFeedbackModal({
                isOpen: true,
                title: 'Systemet siger',
                message: 'Aktiviteten er nu gemt som skabelon, opdateret med nyt nummer, og markeres som synkroniseret.',
                type: 'success'
            });
        } catch (e: any) {
            setFeedbackModal({
                isOpen: true,
                title: 'Systemet siger',
                message: "Fejl ved gem til skabelon: " + (e.message || "Ukendt fejl"),
                type: 'error'
            });
        } finally {
            setConfirmTemplateActivity(null);
        }
    };

    // --- LOKAL FILTRERING OG GRUPPERING ---
    const { filteredGroups, groupedActivities, samletTaeling } = useMemo(() => {
        if (!allActivities.length) return { filteredGroups: [], groupedActivities: {}, samletTaeling: { total: 0, faerdige: 0 } };

        const filters = aktiviteterFilters;
        const lowerAkt = filters.aktivitet.toLowerCase();
        const lowerAns = filters.ansvarlig.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        let maxOrangeDiff = 1;
        if (dayOfWeek === 5) maxOrangeDiff = 3;
        else if (dayOfWeek === 6) maxOrangeDiff = 2;

        const groupsMap: Record<string, any> = {};
        let samletTotal = 0;
        let samletFaerdige = 0;

        // One-pass filtering and grouping
        const valgteProcesIds = valgtSag?.valgte_processer?.map(p => p.id) || [];

        for (const a of allActivities) {
            if (!a.gruppe) continue;

            // Determine process ID.
            // Prefer a.proces.id if present, otherwise look at a.gruppe.proces_id
            const aProcesId = a.proces?.id || a.gruppe?.proces_id;

            if (!aProcesId || !valgteProcesIds.includes(aProcesId)) continue;

            const key = `${aProcesId}-${a.gruppe.id}`;
            if (!groupsMap[key]) {
                groupsMap[key] = {
                    proces: a.proces || { id: a.gruppe.proces_id, titel_kort: "Ukendt proces" }, // Fallback for UI
                    gruppe: a.gruppe,
                    filteredAktiviteter: [],
                    total_aktiv_count: 0,
                    total_faerdig_count: 0,
                    filtered_aktiv_count: 0,
                    filtered_faerdig_count: 0
                };
            }

            const g = groupsMap[key];

            // Counts for the summary (regardless of filters, but depends on 'aktiv' flag)
            if (a.aktiv) {
                g.total_aktiv_count++;
                samletTotal++;
                if (a.status?.status_kategori === 1) {
                    g.total_faerdig_count++;
                    samletFaerdige++;
                }
            }

            // Apply Filters
            if (lowerAkt && !a.aktivitet?.toLowerCase().includes(lowerAkt)) continue;
            if (lowerAns && !a.ansvarlig?.toLowerCase().includes(lowerAns)) continue;

            if (filters.status) {
                if (filters.status === 'ikke-faerdigmeldt') {
                    if (a.status?.status_kategori === 1) continue;
                } else {
                    if (a.status?.id.toString() !== filters.status.toString()) continue;
                }
            }

            if (filters.aktiv_filter === 'kun_aktive' && !a.aktiv) continue;

            if (filters.dato_intern_efter && (!a.dato_intern || new Date(a.dato_intern) < new Date(filters.dato_intern_efter))) continue;
            if (filters.dato_intern_foer && (!a.dato_intern || new Date(a.dato_intern) > new Date(filters.dato_intern_foer))) continue;

            if (filters.overskredet) {
                if (a.status?.status_kategori === 1) continue;

                const isNearOrPast = (dateStr: string | null) => {
                    if (!dateStr) return false;
                    const d = new Date(dateStr);
                    d.setHours(0, 0, 0, 0);
                    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff <= maxOrangeDiff;
                };

                if (!isNearOrPast(a.dato_intern) && !isNearOrPast(a.dato_ekstern)) continue;
            }

            if (filters.vigtige && !a.kommentar_vigtig) continue;

            if (filters.informations_kilde && a.informations_kilde?.id.toString() !== filters.informations_kilde.toString()) continue;

            // If we reached here, it's filtered IN
            // If we reached here, it's filtered IN
            // @# ID Filtering
            const searchParams = new URLSearchParams(location.search);
            const idsParam = searchParams.get('ids');
            if (idsParam) {
                const ids = idsParam.split(',').map(Number);
                if (!ids.includes(a.id)) continue;
            }

            g.filteredAktiviteter.push(a);
            g.filtered_aktiv_count++;
            if (a.status?.status_kategori === 1) {
                g.filtered_faerdig_count++;
            }
        }

        const processedGroups = Object.values(groupsMap).filter((g: any) =>
            g.filteredAktiviteter.length > 0
        ).sort((a: any, b: any) => {
            if (a.proces.nr !== b.proces.nr) return a.proces.nr - b.proces.nr;
            return a.gruppe.nr - b.gruppe.nr;
        });

        const actMap: Record<string, Aktivitet[]> = {};
        processedGroups.forEach((g: any) => {
            g.filteredAktiviteter.sort((a: Aktivitet, b: Aktivitet) => (a.aktivitet_nr || 0) - (b.aktivitet_nr || 0));
            actMap[`${g.proces.id}-${g.gruppe.id}`] = g.filteredAktiviteter;
        });

        return {
            filteredGroups: processedGroups,
            groupedActivities: actMap,
            samletTaeling: { total: samletTotal, faerdige: samletFaerdige }
        };

    }, [allActivities, aktiviteterFilters, valgtSag, location.search]);


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

    const handleToggleGruppe = async (gruppe: any) => {
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

    const handleInlineSave = useCallback(async (aktivitet: Aktivitet, field: string, value: string | boolean | null) => {
        const feltNavn = field === 'status' ? 'status_id' : field;
        const payload = { [feltNavn]: value };
        try {
            const opdateretAktivitet = await api.patch<Aktivitet>(`/aktiviteter/${aktivitet.id}/`, payload);
            setAllActivities(prev => prev.map(a =>
                a.id === opdateretAktivitet.id ? opdateretAktivitet : a
            ));
        } catch (e) {
            console.error("Fejl ved inline save:", e);
        }
    }, [setAllActivities]);

    const handleStatusToggle = useCallback(async (aktivitet: Aktivitet) => {
        const isDone = aktivitet.status?.status_nummer === 80;
        const targetStatusNr = isDone ? 10 : 80;
        const targetStatus = aktivitetStatusser.find(s => s.status_nummer === targetStatusNr);

        if (targetStatus) {
            await handleInlineSave(aktivitet, 'status', targetStatus.id.toString());
        }
    }, [handleInlineSave, aktivitetStatusser]);

    const handleEditComment = useCallback((a: Aktivitet) => {
        setRedigeringsMode('kommentar');
        setAktivitetTilRedigering(a);
    }, []);

    const handleEditResultat = useCallback((a: Aktivitet) => {
        setRedigeringsMode('resultat');
        setAktivitetTilRedigering(a);
    }, []);

    const handleSynkroniser = async () => {
        if (!valgtSag) return;
        setIsFetchingAll(true);
        try {
            const res = await api.post<any>(`/sager/${valgtSag.id}/synkroniser_aktiviteter/`);
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

    return (
        <div className="flex h-full gap-4">
            <div className="flex-1 min-w-0 flex flex-col gap-4 p-4">
                {aktivitetTilRedigering && (
                    <SagsAktivitetForm
                        aktivitet={aktivitetTilRedigering}
                        sagId={valgtSag?.id || null}
                        mode={redigeringsMode}
                        onSave={handleFormSave}
                        onCancel={() => setAktivitetTilRedigering(null)}
                    />
                )}

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-start gap-4">
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

                    </div>

                    <div className="min-w-72">
                        <CaseSelector
                            value={valgtSag?.id || null}
                            onChange={handleSelectSag}
                            label={valgtSag ? `${valgtSag.sags_nr}${valgtSag.alias ? ' - ' + valgtSag.alias : ''}` : undefined}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1">
                    <table className="w-full text-[12px] text-left table-fixed" ref={tableRef}>
                        <thead className="bg-gray-800 text-white font-medium uppercase text-[11px]">
                            <tr>
                                <th className="py-2 px-2 w-[4%] text-center">Aktiv</th>
                                <th className="py-2 px-2 w-[28%] text-left">GRUPPE / AKTIVITET</th>
                                <th className="py-2 px-2 w-[8%] text-center">Dato Int.</th>
                                <th className="py-2 px-2 w-[8%] text-center">Dato Ekstern</th>
                                <th className="py-2 px-2 w-[6%] text-center">Info</th>
                                <th className="py-2 px-2 w-[14%] text-left">Status</th>
                                <th className="py-2 px-2 w-[18%] text-left">Resultat</th>
                                <th className="py-2 px-0.5 w-[3%] text-center"><Mail className="inline h-4 w-4" /></th>
                                <th className="py-2 px-2 w-[7%] text-left">Kilde</th>
                                <th className="py-2 px-2 w-[9%] text-left">Ansvarlig</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aktiviteterIsLoading && allActivities.length === 0 ? (
                                <tr><td colSpan={10} className="text-center p-4">Henter aktiviteter...</td></tr>
                            ) : state.aktiviteterError && allActivities.length === 0 ? (
                                <tr><td colSpan={10} className="text-center p-4 text-red-600 font-bold">Fejl ved hentning: {state.aktiviteterError}</td></tr>
                            ) : !valgtSag ? (
                                <tr><td colSpan={10} className="text-center p-4">Vælg venligst en sag for at se aktiviteter.</td></tr>
                            ) : filteredGroups.length === 0 ? (
                                <tr><td colSpan={10} className="text-center p-4">Ingen aktiviteter matcher de valgte filtre.</td></tr>
                            ) : filteredGroups.map((gruppeSummary: any) => {
                                const gruppeKey = `${gruppeSummary.proces.id}-${gruppeSummary.gruppe.id}`;
                                const erUdvidet = !!aktiviteterUdvidedeGrupper[valgtSag!.id]?.[gruppeKey];
                                const aktiviteter = groupedActivities[gruppeKey] || [];
                                const harAktivtFilter = gruppeSummary.filtered_aktiv_count !== gruppeSummary.total_aktiv_count;

                                return (
                                    <Fragment key={gruppeKey}>
                                        <tr className="bg-gray-200 hover:bg-gray-300 cursor-pointer" onClick={() => handleToggleGruppe(gruppeSummary)}>
                                            <td className="py-2 px-4 text-center">
                                                {erUdvidet ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                            <td className="py-2 px-4 font-bold text-gray-700 break-words" colSpan={9}>
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
                                            <AktivitetRow
                                                key={aktivitet.id}
                                                aktivitet={aktivitet}
                                                statusser={aktivitetStatusser}
                                                colleagues={colleagues}
                                                onInlineSave={handleInlineSave}
                                                onStatusToggle={handleStatusToggle}
                                                onEditComment={handleEditComment}
                                                onEditResultat={handleEditResultat}
                                                onGemTilSkabelon={handleGemTilSkabelon}
                                                onLinkClick={handleLinkAppClick}
                                                informationsKilder={informationsKilder}
                                                isActive={activeRow === aktivitet.id}
                                                onFocus={() => setActiveRow(aktivitet.id)}
                                                onBlur={() => setActiveRow(null)}
                                            />
                                        ))}

                                        {erUdvidet && (
                                            <tr className="bg-blue-50/20 border-b border-blue-100">
                                                <td className="py-1 px-2 text-center">
                                                    <PlusCircle size={14} className="mx-auto text-blue-400" />
                                                </td>
                                                {/* Input: Spans Gruppe, Dato Int, Dato Ekstern (3 cols) */}
                                                <td className="py-1 px-2" colSpan={3}>
                                                    <form onSubmit={(e) => handleQuickAdd(gruppeSummary.gruppe.id, gruppeSummary.proces.id, e)} className="flex w-full items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Nyt aktivitet navn... (Enter for at gemme)"
                                                            value={quickAddValues[gruppeSummary.gruppe.id] || ''}
                                                            onChange={(e) => setQuickAddValues({ ...quickAddValues, [gruppeSummary.gruppe.id]: e.target.value })}
                                                            className="w-full px-2 py-1 text-[11px] border-0 border-b border-blue-200 focus:border-blue-500 focus:ring-0 bg-transparent placeholder-gray-400"
                                                        />
                                                    </form>
                                                </td>
                                                {/* Info: Empty */}
                                                <td className="py-1 px-2"></td>
                                                {/* Status: Button */}
                                                <td className="py-1 px-2 text-left">
                                                    <button
                                                        onClick={(e) => handleQuickAdd(gruppeSummary.gruppe.id, gruppeSummary.proces.id, e)}
                                                        disabled={isSavingNy[gruppeSummary.gruppe.id] || !quickAddValues[gruppeSummary.gruppe.id]?.trim()}
                                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {isSavingNy[gruppeSummary.gruppe.id] ? <RefreshCw size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                                                        TILFØJ
                                                    </button>
                                                </td>
                                                {/* Resultat, Mail, Kilde, Ansvarlig: Empty */}
                                                <td className="py-1 px-2"></td>
                                                <td className="py-1 px-2"></td>
                                                <td className="py-1 px-2"></td>
                                                <td className="py-1 px-2"></td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AktiviteterFilter />

            {/* Confirm Template Modal */}
            <ConfirmModal
                isOpen={!!confirmTemplateActivity}
                onClose={() => setConfirmTemplateActivity(null)}
                onConfirm={performGemTilSkabelon}
                title="Gem til skabelon"
                message={`Vil du gemme "${confirmTemplateActivity?.aktivitet}" som en permanent skabelon?`}
                confirmText="Gem"
            />

            {/* Feedback / Alert Modal */}
            <ConfirmModal
                isOpen={!!feedbackModal?.isOpen}
                onClose={() => setFeedbackModal(null)}
                onConfirm={() => setFeedbackModal(null)}
                title={feedbackModal?.title || ''}
                message={feedbackModal?.message || ''}
                confirmText="OK"
                cancelText={undefined} // Hide cancel button
                isDestructive={feedbackModal?.type === 'error'}
            />

            {/* Link Preference Modal */}
            {showLinkPreferenceModal && (
                <LinkOpenPreferenceModal
                    isOpen={!!showLinkPreferenceModal}
                    onSave={handleSaveLinkPreference}
                    onClose={() => setShowLinkPreferenceModal(null)}
                />
            )}



        </div>
    );
}

export default AktiviteterPage;