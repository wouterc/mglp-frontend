
// --- Fil: src/pages/AktiviteterPage.tsx ---
// @# 2025-09-15 21:45 - Endelig version der sikrer, at filtre altid sendes korrekt ved alle API-kald.
// @# 2025-11-03 21:10 - Tilføjet useEffect til at gen-hente åbne grupper ved filter-ændring.
// @# 2025-12-25 20:30 - Refactoring: Added internal FilterSidebar, CaseSelector, and AktivitetRow.
import React, { useState, useEffect, useCallback, Fragment, ReactElement, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { SagService } from '../services/SagService';
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, RefreshCw, PlusCircle, Mail, MoreVertical, Copy, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { useSager } from '../contexts/SagContext';
import { useLookups } from '../contexts/LookupContext';
import { useAktivitetDokument } from '../contexts/AktivitetDokumentContext';
import { useAuth } from '../contexts/AuthContext';
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
import { AktivitetService } from '../services/AktivitetService';
import { DokumentService } from '../services/DokumentService';
import { Link as LinkIcon } from 'lucide-react'; // @# New Import
import LinkOpenPreferenceModal from '../components/modals/LinkOpenPreferenceModal';
import HelpButton from '../components/ui/HelpButton';
import Modal from '../components/Modal';


interface AktiviteterPageProps {
    sagId: number | null;
}

// --- Hovedkomponent ---
function AktiviteterPage({ sagId }: AktiviteterPageProps): ReactElement {
    const { state: adState, dispatch: adDispatch } = useAktivitetDokument();
    const { state: lookupState } = useLookups();
    const { state: sagState, dispatch: sagDispatch } = useSager();
    const { dispatch: authDispatch } = useAuth();
    const location = useLocation();

    // --- SMART SHIMS for legacy compatibility & extreme performance ---
    const dispatch = adDispatch;
    const state = useMemo(() => ({
        ...adState,
        ...lookupState,
        valgtSag: sagState.valgtSag,
        isAuthChecking: false
    }), [adState, lookupState, sagState.valgtSag]) as any;

    const {
        hentedeAktiviteter,
        gruppeLoadingStatus,
        aktiviteterIsLoading,
        aktiviteterFilters,
        aktiviteterUdvidedeGrupper,
        cachedAktiviteter
    } = adState;

    const {
        users: colleagues,
        aktivitetStatusser,
        informationsKilder
    } = lookupState;

    const { valgtSag } = sagState;

    // UI State
    const [aktivitetTilRedigering, setAktivitetTilRedigering] = useState<Aktivitet | null>(null);
    const [redigeringsMode, setRedigeringsMode] = useState<'kommentar' | 'resultat'>('kommentar');
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({});
    const [isSavingNy, setIsSavingNy] = useState<Record<number, boolean>>({});
    const [activeRow, setActiveRow] = useState<number | null>(null);

    // Modal states
    const [confirmTemplateActivity, setConfirmTemplateActivity] = useState<Aktivitet | null>(null);
    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'info' | 'success' | 'error' } | null>(null);
    const [copyNotify, setCopyNotify] = useState<{ message: string } | null>(null);

    // Line Actions State
    const [renamingAktivitet, setRenamingAktivitet] = useState<Aktivitet | null>(null);
    const [deleteConfirmAktivitet, setDeleteConfirmAktivitet] = useState<Aktivitet | null>(null);
    const [editAktivitetNavn, setEditAktivitetNavn] = useState('');
    const [isRenamingAktivitet, setIsRenamingAktivitet] = useState(false);


    // State for Link Preference Modal
    const [showLinkPreferenceModal, setShowLinkPreferenceModal] = useState<{ aktivitet: Aktivitet } | null>(null);

    // State for Link/Document Modal
    const [linkModalAktivitet, setLinkModalAktivitet] = useState<Aktivitet | null>(null);
    const [sagsDokumenter, setSagsDokumenter] = useState<SagsDokument[]>([]);
    const [isFetchingDocs, setIsFetchingDocs] = useState(false);

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

    const handleLinkAppClick = async (aktivitet: Aktivitet) => {
        if (!valgtSag) return;

        // If NO documents are linked, open the Linker Modal instead of trying to open them
        if (!aktivitet.dokumenter || aktivitet.dokumenter.length === 0) {
            setLinkModalAktivitet(aktivitet);

            // Fetch documents for the case if not already fetching/fetched
            if (sagsDokumenter.length === 0 && !isFetchingDocs) {
                setIsFetchingDocs(true);
                try {
                    const docs = await DokumentService.getDokumenter(valgtSag.id);
                    setSagsDokumenter(docs);
                } catch (e) {
                    console.error("Fejl ved hentning af dokumenter til linking:", e);
                } finally {
                    setIsFetchingDocs(false);
                }
            }
            return;
        }

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
                authDispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
            })
            .catch(e => {
                console.error("Kunne ikke gemme præference", e);
            });
    };


    const tableRef = useRef<HTMLTableElement>(null);
    useTableNavigation(tableRef);

    // --- Local State for DATA ---
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

    // --- Hent oversigter ved sags-skift ---
    useEffect(() => {
        if (!valgtSag) return;
        fetchAktiviteterData(valgtSag.id);
    }, [valgtSag?.id, adDispatch]);

    const fetchAktiviteterData = async (sagId: number) => {
        const hasData = !!state.aktivitetsGrupper[sagId] && !!state.cachedAktiviteter[sagId];

        if (!hasData) {
            adDispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: true, aktiviteterError: null } });
        }
        setIsFetchingAll(true);

        try {
            // 1. Hent oversigter (summaries) - for rækkefølge og gruppe-info
            const summaries = await AktivitetService.getSummaries(sagId);
            adDispatch({ type: 'SET_SAG_GRUPPE_SUMMARIES', payload: { sagId, summaries } });

            // 2. Hent ALLE aktiviteter på én gang (Optimeret backend-kald)
            const allAktiviteter = await AktivitetService.getAllAktiviteter(sagId);

            // Gem i cache
            adDispatch({ type: 'SET_CACHED_AKTIVITETER', payload: { sagId, aktiviteter: allAktiviteter } });

            // 3. Tjek for nye skabeloner
            const syncRes = await AktivitetService.checkSyncStatus();
            setNyeAktiviteterFindes(syncRes.nye_aktiviteter_findes || false);
        } catch (e: any) {
            if (!hasData) {
                adDispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterError: e.message } });
            }
        } finally {
            setIsFetchingAll(false);
            adDispatch({ type: 'SET_AKTIVITETER_STATE', payload: { aktiviteterIsLoading: false } });
        }
    };

    const handleSelectSag = async (sagId: number) => {
        try {
            const fuldSag = await SagService.getSag(sagId);
            adDispatch({ type: 'NULSTIL_HENTEDE_AKTIVITETER' });
            sagDispatch({ type: 'SET_VALGT_SAG', payload: fuldSag });
        } catch (e: any) { console.error(e.message); }
    };

    const handleQuickAdd = async (gruppeId: number, procesId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const navn = quickAddValues[gruppeId]?.trim();
        if (!navn || !valgtSag) return;

        // Calculate next number (100+ strategy)
        const allCached = valgtSag ? state.cachedAktiviteter[valgtSag.id] || [] : [];
        const groupActivities = allCached.filter((a: Aktivitet) => a.gruppe?.id === gruppeId);
        const maxNr = groupActivities.length > 0 ? Math.max(...groupActivities.map((a: Aktivitet) => a.aktivitet_nr || 0)) : 0;
        const nextNr = maxNr < 100 ? 101 : maxNr + 1;

        setIsSavingNy(prev => ({ ...prev, [gruppeId]: true }));
        try {
            await AktivitetService.createAktivitet({
                sag_id: valgtSag.id,
                gruppe_id: gruppeId,
                proces_id: procesId,
                aktivitet_nr: nextNr,
                aktivitet: navn,
                aktiv: true
            });
            setQuickAddValues(prev => ({ ...prev, [gruppeId]: '' }));

            // Opdater data
            fetchAktiviteterData(valgtSag.id);

        } catch (e: any) {
            showAlert('Systemet siger', "Fejl ved hurtig-tilføj: " + (e.message || "Ukendt fejl"));
        } finally {
            setIsSavingNy(prev => ({ ...prev, [gruppeId]: false }));
        }
    };

    const handleGemTilSkabelon = (aktivitet: Aktivitet) => {
        setConfirmTemplateActivity(aktivitet);
    };

    const handleCopyAktivitet = async (sourceAktivitet: Aktivitet) => {
        if (!valgtSag) return;

        const gruppeId = sourceAktivitet.gruppe?.id;
        if (!gruppeId) return;

        const allCached = valgtSag ? state.cachedAktiviteter[valgtSag.id] || [] : [];
        const groupActivities = allCached.filter((a: Aktivitet) => a.gruppe?.id === gruppeId);

        // 1. Navne logik: Find base navn og tilføj nummer
        const currentNavn = sourceAktivitet.aktivitet || "Ny aktivitet";
        const baseNavn = currentNavn.replace(/ - \d+$/, '');

        const relatedNames = groupActivities
            .map((a: Aktivitet) => a.aktivitet)
            .filter((t: string | undefined): t is string => !!t && (t === baseNavn || t.startsWith(baseNavn + " - ")));

        let maxSuffix = 1;
        relatedNames.forEach((t: string) => {
            const m = t.match(/ - (\d+)$/);
            if (m) {
                const s = parseInt(m[1]);
                if (s > maxSuffix) maxSuffix = s;
            }
        });

        const nextSuffix = maxSuffix + 1;
        const newNavn = `${baseNavn} - ${nextSuffix}`;

        // 2. Nummer logik: 100+ strategien
        const maxNr = Math.max(0, ...groupActivities.map((a: Aktivitet) => a.aktivitet_nr || 0));
        const nextNr = maxNr < 100 ? 101 : maxNr + 1;

        // 3. Gem via API
        try {
            await AktivitetService.createAktivitet({
                sag_id: valgtSag.id,
                gruppe_id: gruppeId,
                proces_id: sourceAktivitet.proces?.id || sourceAktivitet.gruppe?.proces_id,
                aktivitet_nr: nextNr,
                aktivitet: newNavn,
                aktiv: true,
                informations_kilde_id: sourceAktivitet.informations_kilde?.id
            });

            setCopyNotify({ message: `Linjen er kopieret til ${newNavn} - nr. ${nextNr}` });
            setTimeout(() => setCopyNotify(null), 3000);

            fetchAktiviteterData(valgtSag.id);

        } catch (e: any) {
            console.error("Fejl ved kopiering:", e);
            showAlert('Systemet siger', "Kunne ikke kopiere aktivitet.");
        }
    };

    const handleDeleteAktivitet = (act: Aktivitet) => {
        setDeleteConfirmAktivitet(act);
    };

    const performDeleteAktivitet = async () => {
        if (!deleteConfirmAktivitet || !valgtSag) return;
        const id = deleteConfirmAktivitet.id;
        const gruppeId = deleteConfirmAktivitet.gruppe?.id;
        try {
            await AktivitetService.deleteAktivitet(id);
            if (gruppeId) {
                fetchAktiviteterData(valgtSag.id);
            }
            setCopyNotify({ message: "Aktiviteten er slettet." });
            setTimeout(() => setCopyNotify(null), 3000);
            setDeleteConfirmAktivitet(null);
        } catch (e: any) {
            console.error("Fejl ved sletning:", e);
            showAlert('Systemet siger', "Kunne ikke slette aktivitet.");
        }
    };

    const handleLinkChanges = async (aktivitetId: number, documentIds: number[]) => {
        if (!valgtSag) return;
        try {
            const updatedAktivitet = await AktivitetService.updateAktivitet(aktivitetId, { dokumenter: documentIds });

            const gId = updatedAktivitet.gruppe?.id;
            if (gId) {
                fetchAktiviteterData(valgtSag.id);
            }

            // Update the modal's active aktivitet if it's the one we just saved
            if (linkModalAktivitet?.id === aktivitetId) {
                setLinkModalAktivitet(updatedAktivitet);
            }
        } catch (e) {
            console.error("Fejl ved lagring af dokument-links:", e);
            alert("Kunne ikke gemme dokument-links.");
        }
    };

    const handleSaveAktivitetRename = async () => {
        if (!renamingAktivitet || !valgtSag) return;
        setIsRenamingAktivitet(true);
        try {
            const updatedDoc = await AktivitetService.updateAktivitet(renamingAktivitet.id, { aktivitet: editAktivitetNavn });
            const gId = updatedDoc.gruppe?.id;
            if (gId) {
                fetchAktiviteterData(valgtSag.id);
            }
            setRenamingAktivitet(null);
        } catch (e) {
            console.error("Fejl ved omdøbning:", e);
            alert("Kunne ikke omdøbe aktiviteten.");
        } finally {
            setIsRenamingAktivitet(false);
        }
    };

    const openRenameAktivitetModal = (act: Aktivitet) => {
        setRenamingAktivitet(act);
        setEditAktivitetNavn(act.aktivitet || '');
    };

    const performGemTilSkabelon = async () => {
        if (!confirmTemplateActivity || !valgtSag) return;

        try {
            const response = await AktivitetService.gemSomSkabelon(confirmTemplateActivity.id);
            const gruppeId = confirmTemplateActivity.gruppe?.id;

            if (gruppeId) {
                fetchAktiviteterData(valgtSag.id);
            }

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
        const summaries = valgtSag ? state.aktivitetsGrupper[valgtSag.id] || [] : [];
        if (!summaries.length) return { filteredGroups: [], groupedActivities: {}, samletTaeling: { total: 0, faerdige: 0 } };

        const filters = aktiviteterFilters;
        const lowerAkt = filters.aktivitet.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const groupsMap: Record<string, any> = {};
        const actMap: Record<string, Aktivitet[]> = {};
        let samletTotal = 0;
        let samletFaerdige = 0;

        const allCached = valgtSag ? state.cachedAktiviteter[valgtSag.id] || [] : [];
        for (const summary of summaries) {
            const procesId = summary.proces.id;

            const key = `${procesId}-${summary.gruppe.id}`;
            const groupActivities = allCached.filter((a: Aktivitet) => a.gruppe?.id === summary.gruppe.id && a.proces?.id === procesId);

            const g = {
                proces: summary.proces,
                gruppe: summary.gruppe,
                filteredAktiviteter: [] as Aktivitet[],
                total_aktiv_count: summary.total_aktiv_count,
                total_faerdig_count: summary.total_faerdig_count,
                filtered_aktiv_count: 0,
                filtered_faerdig_count: 0
            };

            samletTotal += summary.total_aktiv_count;
            samletFaerdige += summary.total_faerdig_count;

            for (const a of groupActivities) {
                // Apply Filters
                if (lowerAkt && !a.aktivitet?.toLowerCase().includes(lowerAkt)) continue;
                if (filters.status) {
                    if (filters.status === 'ikke-faerdigmeldt') {
                        if (a.status?.status_kategori === 1) continue;
                    } else {
                        if (a.status?.id.toString() !== filters.status.toString()) continue;
                    }
                }

                if (filters.aktiv_filter === 'kun_aktive' && !a.aktiv) continue;

                if (filters.overskredet) {
                    if (a.status?.status_kategori === 1) continue;
                    const d = a.dato_intern ? new Date(a.dato_intern) : null;
                    if (!d || d >= today) continue;
                }

                if (filters.vigtige && !a.kommentar_vigtig) continue;

                g.filteredAktiviteter.push(a);
                g.filtered_aktiv_count++;
                if (a.status?.status_kategori === 1) {
                    g.filtered_faerdig_count++;
                }
            }
            g.filteredAktiviteter.sort((a, b) => (a.aktivitet_nr || 0) - (b.aktivitet_nr || 0));
            actMap[key] = g.filteredAktiviteter;
            groupsMap[key] = g;
        }

        const sortedGroups = Object.values(groupsMap)
            .filter((g: any) => !lowerAkt || g.filtered_aktiv_count > 0)
            .sort((a: any, b: any) => {
                if (a.proces.nr !== b.proces.nr) return a.proces.nr - b.proces.nr;
                return a.gruppe.nr - b.gruppe.nr;
            });

        return {
            filteredGroups: sortedGroups,
            groupedActivities: actMap,
            samletTaeling: { total: samletTotal, faerdige: samletFaerdige }
        };
    }, [valgtSag, state.aktivitetsGrupper, state.cachedAktiviteter, aktiviteterFilters, location.search]);


    const handleToggleAlleGrupper = (vis: boolean) => {
        if (!filteredGroups.length || !valgtSag) return;
        const alleGruppeKeys = filteredGroups.reduce((acc: any, gruppe: any) => {
            const gruppeKey = `${gruppe.proces.id}-${gruppe.gruppe.id}`;
            acc[gruppeKey] = vis;
            return acc;
        }, {} as { [key: string]: boolean });

        adDispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterUdvidedeGrupper: { ...aktiviteterUdvidedeGrupper, [valgtSag.id]: alleGruppeKeys } },
        });
    };

    const handleToggleGruppe = async (gruppe: any) => {
        if (!valgtSag) return;
        const gruppeId = gruppe.gruppe.id;
        const gruppeKey = `${gruppe.proces.id}-${gruppeId}`;
        const erUdvidet = !!aktiviteterUdvidedeGrupper[valgtSag.id]?.[gruppeKey];

        const nyUdvidetState = {
            ...(aktiviteterUdvidedeGrupper[valgtSag.id] || {}),
            [gruppeKey]: !erUdvidet,
        };

        adDispatch({
            type: 'SET_AKTIVITETER_STATE',
            payload: { aktiviteterUdvidedeGrupper: { ...aktiviteterUdvidedeGrupper, [valgtSag.id]: nyUdvidetState } },
        });

        // Data is already loaded in one-shot
        if (!erUdvidet) {
            // No need to fetch anything here
        }
    };

    const handleInlineSave = useCallback(async (aktivitet: Aktivitet, field: string, value: string | boolean | null) => {
        if (!valgtSag) return;
        const feltNavn = field === 'status' ? 'status_id' : field;
        const payload = { [feltNavn]: value };
        try {
            const opdateretAktivitet = await AktivitetService.updateAktivitet(aktivitet.id, payload);
            const gruppeId = opdateretAktivitet.gruppe?.id;
            if (gruppeId) {
                fetchAktiviteterData(valgtSag.id);
            }
        } catch (e) {
            console.error("Fejl ved inline save:", e);
        }
    }, [valgtSag]);

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
            await AktivitetService.synkroniser(valgtSag.id);

            // Genhent data
            await fetchAktiviteterData(valgtSag.id);

            setNyeAktiviteterFindes(false);

            setFeedbackModal({
                isOpen: true,
                title: 'Systemet siger',
                message: 'Aktiviteter er synkroniseret og opdateret.',
                type: 'success'
            });
        } catch (e: any) {
            console.error("Fejl ved synkronisering:", e);
            setFeedbackModal({
                isOpen: true,
                title: 'Systemet siger',
                message: `Fejl ved synkronisering: ${e.message}`,
                type: 'error'
            });
        } finally {
            setIsFetchingAll(false);
        }
    };

    const handleFormSave = () => {
        setAktivitetTilRedigering(null);
        if (valgtSag) {
            fetchAktiviteterData(valgtSag.id);
        }
    };

    return (
        <div className="flex gap-4">
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
                                <HelpButton helpPointCode="AKTIVITETER_HELP" />
                                {copyNotify && (
                                    <div className="ml-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg transition-opacity duration-500 animate-in fade-in flex items-center gap-2">
                                        <CheckCircle2 size={14} />
                                        {copyNotify.message}
                                    </div>
                                )}
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
                                <th className="py-2 px-2 w-8 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {aktiviteterIsLoading && (!valgtSag || !state.aktivitetsGrupper[valgtSag.id]?.length) ? (
                                <tr><td colSpan={10} className="text-center p-4">Henter aktiviteter...</td></tr>
                            ) : state.aktiviteterError && (!valgtSag || !state.aktivitetsGrupper[valgtSag.id]?.length) ? (
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
                                        {erUdvidet && aktiviteter.map((aktivitet: Aktivitet, idx: number) => (
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
                                                onCopy={handleCopyAktivitet}
                                                onRenameLine={openRenameAktivitetModal}
                                                onDeleteLine={handleDeleteAktivitet}
                                                isLast={idx >= aktiviteter.length - 2}
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
                                                            id={`quick-add-activity-${gruppeKey}`}
                                                            name={`quick-add-activity-${gruppeKey}`}
                                                            type="text"
                                                            placeholder="Nyt aktivitet navn... (Enter for at gemme)"
                                                            value={quickAddValues[gruppeSummary.gruppe.id] || ''}
                                                            onChange={(e) => setQuickAddValues({ ...quickAddValues, [gruppeSummary.gruppe.id]: e.target.value })}
                                                            className="w-full px-2 py-1 text-[11px] border-0 border-b border-blue-200 focus:border-blue-500 focus:ring-0 bg-transparent placeholder-gray-400"
                                                            aria-label="Nyt aktivitet navn"
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

            {/* Rename Title Modal */}
            <Modal
                isOpen={!!renamingAktivitet}
                onClose={() => setRenamingAktivitet(null)}
                title="Omdøb aktivitet"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setRenamingAktivitet(null)}
                            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Annuller
                        </button>
                        <button
                            onClick={handleSaveAktivitetRename}
                            disabled={isRenamingAktivitet}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isRenamingAktivitet ? 'Gemmer...' : 'Gem'}
                        </button>
                    </div>
                }
            >
                <div className="p-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nyt navn på aktivitet
                    </label>
                    <input
                        autoFocus
                        type="text"
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={editAktivitetNavn}
                        onChange={(e) => setEditAktivitetNavn(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveAktivitetRename();
                        }}
                    />
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteConfirmAktivitet}
                onClose={() => setDeleteConfirmAktivitet(null)}
                onConfirm={performDeleteAktivitet}
                title="Slet aktivitet?"
                message={`Er du sikker på, at du vil slette "${deleteConfirmAktivitet?.aktivitet}"?`}
                confirmText="Slet"
                isDestructive={true}
            />

            {/* Link Preference Modal */}
            {showLinkPreferenceModal && (
                <LinkOpenPreferenceModal
                    isOpen={!!showLinkPreferenceModal}
                    onSave={handleSaveLinkPreference}
                    onClose={() => setShowLinkPreferenceModal(null)}
                />
            )}

            {/* Manual Activity-Document Linker Modal */}
            <ActivityDocumentLinkerModal
                isOpen={!!linkModalAktivitet}
                onClose={() => setLinkModalAktivitet(null)}
                sagId={valgtSag?.id || 0}
                initialAktivitetId={linkModalAktivitet?.id}
                aktiviteter={valgtSag ? state.cachedAktiviteter[valgtSag.id] || [] : []}
                dokumenter={sagsDokumenter}
                onLinkChanges={handleLinkChanges}
            />



        </div>
    );
}

export default AktiviteterPage;