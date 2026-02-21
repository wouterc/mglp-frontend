
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Sag, SagsDokument, Blokinfo, InformationsKilde, StandardMappe } from '../../../types';
import { DokumentService } from '../../../services/DokumentService';
import { api } from '../../../api';
import { ChevronDown, ChevronUp, RefreshCw, FileText, CheckCircle2, AlertCircle, PlusCircle, Mail, Loader2, ChevronsDown, ChevronsUp, ChevronRight, Save, ArrowDown01, ArrowDownAZ } from 'lucide-react';
import DokumentRow from '../../rows/DokumentRow';
import { useAppState } from '../../../StateContext';
import Modal from '../../Modal';
import ConfirmModal from '../../ui/ConfirmModal';
import FilterSidebar from '../../FilterSidebar';
import Tooltip from '../../Tooltip';
import SmartDateInput from '../../SmartDateInput';
import { User as UserType } from '../../../types';

import HelpButton from '../../ui/HelpButton';
import RenameFileModal from '../../ui/RenameFileModal';

interface DokumenterTabProps {
    sag: Sag;
    onUpdate?: () => void;
    onToolbarUpdate?: (content: React.ReactNode) => void;
}

interface DokumentFilterState {
    tekst: string;
    status: string; // "alle", "mangler_fil", "har_fil"
    informations_kilde: string;
    undermappe: string;
    aktiv_filter: string; // "kun_aktive", "alle"
    overskredet: boolean;
    vigtige: boolean;
}



export default function DokumenterTab({ sag, onUpdate, onToolbarUpdate }: DokumenterTabProps) {
    const { state, dispatch } = useAppState();
    const { users: colleagues, dokumentStatusser: statusser, informationsKilder, blokinfoSkabeloner, standardMapper, currentUser } = state;
    const navigate = useNavigate();
    const location = useLocation();

    const handleLinkClick = (doc: SagsDokument) => {
        if (!doc.aktiviteter || doc.aktiviteter.length === 0) return;
        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const ids = doc.aktiviteter.join(',');
        window.open(
            `/sager/${sag.id}/aktiviteter?ids=${ids}`,
            `LinkedActivities_Window`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    };

    // Master Groups from global state
    const masterGroups = useMemo(() => {
        return blokinfoSkabeloner.filter(g => g.formaal === 3);
    }, [blokinfoSkabeloner]);


    const cachedDocs = state.cachedDokumenter[sag.id];

    const [loading, setLoading] = useState(!cachedDocs);
    const [syncing, setSyncing] = useState(false);
    const [nyeDokumenterFindes, setNyeDokumenterFindes] = useState(false);

    // Sync Check Logic
    useEffect(() => {
        const checkSync = async () => {
            try {
                const res = await DokumentService.checkSyncStatus();
                setNyeDokumenterFindes(res.nye_dokumenter_findes || false);
            } catch (e) {
                console.error("Sync check fejl:", e);
            }
        };
        checkSync();
    }, []);

    // Filters
    const [filters, setFilters] = useState<DokumentFilterState>({
        tekst: '',
        status: 'alle',
        informations_kilde: '',
        undermappe: '',
        aktiv_filter: 'kun_aktive',
        overskredet: false,
        vigtige: false
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFilters(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetFilters = () => {
        setFilters({
            tekst: '',
            status: 'alle',
            informations_kilde: '',
            undermappe: '',
            aktiv_filter: 'kun_aktive',
            overskredet: false,
            vigtige: false
        });
    };

    // State for Comment Modal
    const [editingDoc, setEditingDoc] = useState<SagsDokument | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [editMailTitle, setEditMailTitle] = useState('');
    const [editCommentImportant, setEditCommentImportant] = useState(false);
    const [isSavingComment, setIsSavingComment] = useState(false);

    // State for Rename Modal
    const [renamingDoc, setRenamingDoc] = useState<SagsDokument | null>(null);
    const [renameFilename, setRenameFilename] = useState(''); // Stores the BODY of the filename (no prefix)
    const [renameFilePrefix, setRenameFilePrefix] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Quick Add State
    const [quickAddValues, setQuickAddValues] = useState<Record<number, string>>({});
    const [isSavingNy, setIsSavingNy] = useState<Record<number, boolean>>({});
    const [activeRow, setActiveRow] = useState<number | null>(null);

    // State for Save to Template Modal
    const [confirmTemplateDoc, setConfirmTemplateDoc] = useState<SagsDokument | null>(null);
    const [feedbackModal, setFeedbackModal] = useState<{ title: string, message: string, type: 'success' | 'error' } | null>(null);
    const [copyNotify, setCopyNotify] = useState<{ message: string } | null>(null);

    // Line Actions State
    const [renamingTitleDoc, setRenamingTitleDoc] = useState<SagsDokument | null>(null);
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<SagsDokument | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [isRenamingTitle, setIsRenamingTitle] = useState(false);


    const fetchDokumenter = useCallback(async (arg?: boolean | number) => {
        const force = typeof arg === 'boolean' ? arg : false;
        const sagId = sag.id; // Capture ID to avoid dependency loop on 'sag' object if it changes

        // Hvis vi har cache og ikke forcer, så er vi færdige med "initial load"
        if (!force && state.cachedDokumenter[sagId]) {
            setLoading(false);
            // Vi henter stadig i baggrunden for at sikre frisk data,
            // men uden at blokere UI.
        } else if (!state.cachedDokumenter[sagId]) {
            setLoading(true);
        }

        try {
            const data = await DokumentService.getDokumenter(sagId);
            dispatch({
                type: 'SET_CACHED_DOKUMENTER',
                payload: { sagId: sagId, dokumenter: data }
            });
        } catch (error) {
            console.error("Fejl ved hentning af dokumenter:", error);
        } finally {
            setLoading(false);
        }
    }, [sag.id, dispatch, state.cachedDokumenter[sag.id] !== undefined]); // @# Check existence instead of full object

    useEffect(() => {
        fetchDokumenter();
    }, [fetchDokumenter]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await DokumentService.synkroniser(sag.id);
            await fetchDokumenter(true);
            setNyeDokumenterFindes(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Fejl ved synkronisering:", error);
        } finally {
            setSyncing(false);
        }
    };

    const handleUploadFile = async (docId: number, file: File, undermappeId?: number) => {
        const doc = cachedDocs?.find(d => d.id === docId);
        let fileToUpload = file;

        // Auto-rename logic: "name is created by Sagsnr + '_' + name of the group"
        // Only if template doesn't give a filename (or doc currently has no filename)
        if (doc && !doc.filnavn && sag.sags_nr) {
            const extension = file.name.split('.').pop();
            // The backend handles prefixing with sags_nr, so we just provide the clean descriptive name
            const baseName = (doc.titel || 'Dokument').trim();
            const newName = `${baseName}.${extension}`;
            fileToUpload = new File([file], newName, { type: file.type });
        }

        try {

            // Auto-set status to 80 (Udført) when file is uploaded
            const status80 = statusser.find(s => s.status_nummer === 80);
            const statusId = status80 ? status80.id : undefined;

            await DokumentService.uploadFil(docId, fileToUpload, statusId, undermappeId);
            await fetchDokumenter(true);
        } catch (e) {
            console.error("Upload fejl:", e);
            setFeedbackModal({
                title: "Fejl ved upload",
                message: "Kunne ikke uploade filen. Prøv venligst igen.",
                type: 'error'
            });
            throw e;
        }
    };

    const handleDeleteFile = async (docId: number) => {
        try {
            await DokumentService.deleteFil(docId);
            await fetchDokumenter(true);
        } catch (e) {
            console.error("Slet fejl:", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke slette filen.",
                type: 'error'
            });
        }
    };

    const handleLinkFile = async (docId: number, path: string) => {
        try {
            await DokumentService.linkFil(docId, path);
            await fetchDokumenter(true);
        } catch (e: any) {
            console.error("Link fejl:", e);
            setFeedbackModal({
                title: "Fejl ved linkning",
                message: "Kunne ikke linke filen: " + (e.response?.data?.message || e.message),
                type: 'error'
            });
        }
    };


    // --- Comment Logic ---
    const openEditModal = (doc: SagsDokument) => {
        setEditingDoc(doc);
        setEditCommentText(doc.kommentar || '');
        setEditMailTitle(doc.mail_titel || '');
        setEditCommentImportant(doc.kommentar_vigtig || false);
    };

    const handleSaveCommentFromModal = async () => {
        if (!editingDoc) return;
        setIsSavingComment(true);
        try {
            await DokumentService.updateDokument(editingDoc.id, {
                kommentar: editCommentText,
                mail_titel: editMailTitle,
                kommentar_vigtig: editCommentImportant
            });
            dispatch({
                type: 'UPDATE_CACHED_DOKUMENT',
                payload: {
                    sagId: sag.id, docId: editingDoc.id, updates: {
                        kommentar: editCommentText,
                        mail_titel: editMailTitle,
                        kommentar_vigtig: editCommentImportant
                    }
                }
            });
            setEditingDoc(null);
        } catch (e) {
            console.error("Fejl ved gemning af kommentar", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke gemme kommentar.",
                type: 'error'
            });
        } finally {
            setIsSavingComment(false);
        }
    };

    // --- Rename Logic ---
    const openRenameModal = (doc: SagsDokument) => {
        setRenamingDoc(doc);
        const prefix = sag.sags_nr ? `${sag.sags_nr}_` : '';
        setRenameFilePrefix(prefix);

        let currentName = doc.filnavn || '';

        // Strip prefix
        if (prefix) {
            while (currentName.startsWith(prefix)) {
                currentName = currentName.substring(prefix.length);
            }
        }

        // Strip extension
        const lastDotIndex = currentName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            currentName = currentName.substring(0, lastDotIndex);
        }

        setRenameFilename(currentName);
    };

    const handleSaveRename = async (finalName: string) => {
        if (!renamingDoc) return;

        // Enforce sagsnummer_ prefix
        const prefix = sag.sags_nr ? `${sag.sags_nr}_` : '';
        let prefName = finalName;
        if (prefix && !prefName.startsWith(prefix)) {
            prefName = prefix + prefName;
        }

        setIsRenaming(true);
        try {
            await DokumentService.updateDokument(renamingDoc.id, { filnavn: prefName });
            await fetchDokumenter(true);
            setRenamingDoc(null);
        } catch (e) {
            console.error("Fejl ved omdøbning", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke omdøbe fil.",
                type: 'error'
            });
        } finally {
            setIsRenaming(false);
        }
    };

    const handleInlineSave = async (docId: number, field: string, value: any) => {
        try {
            const response = await DokumentService.updateDokument(docId, { [field]: value });
            // Manual update in cache to avoid full reload
            dispatch({
                type: 'UPDATE_CACHED_DOKUMENT',
                payload: { sagId: sag.id, docId, updates: response }
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(`Fejl ved gem af ${field}:`, error);
        }
    };

    const handleStatusToggle = async (doc: SagsDokument) => {
        const isDone = doc.status?.status_nummer === 80;
        const targetStatusNr = isDone ? 10 : 80;
        const targetStatus = statusser.find((s: any) => s.status_nummer === targetStatusNr);

        if (targetStatus) {
            await handleInlineSave(doc.id, 'status_id', targetStatus.id);
        }
    };

    const handleQuickAdd = async (gruppeId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const navn = quickAddValues[gruppeId]?.trim();
        if (!navn) return;

        // Calculate next number (100+ strategy)
        const groupDocs = cachedDocs?.filter(d => d.gruppe?.id === gruppeId) || [];
        const maxNr = Math.max(0, ...groupDocs.map(d => d.dokument_nr || 0));
        const nextNr = maxNr < 100 ? 101 : maxNr + 1;

        setIsSavingNy(prev => ({ ...prev, [gruppeId]: true }));
        setIsSavingNy(prev => ({ ...prev, [gruppeId]: true }));
        try {
            await DokumentService.createDokumentRow({
                sag: sag.id,
                gruppe: gruppeId,
                titel: navn,
                dokument_nr: nextNr,
                aktiv: true,
                status_id: statusser.find((s: any) => s.status_nummer === 10)?.id || null
            });
            setQuickAddValues((prev: any) => ({ ...prev, [gruppeId]: '' }));
            await fetchDokumenter(true);
        } catch (e: any) {
            console.error("Fejl ved hurtig-tilføj:", e);
            const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : (e.message || "Ukendt fejl");
            setFeedbackModal({
                title: "Fejl ved tilføjelse",
                message: "Kunne ikke oprette dokumentrækken: " + errorMsg,
                type: 'error'
            });
        } finally {
            setIsSavingNy((prev: any) => ({ ...prev, [gruppeId]: false }));
        }
    };

    const handleGemTilSkabelon = (doc: SagsDokument) => {
        setConfirmTemplateDoc(doc);
    };

    const handleCopyDokument = async (sourceDoc: SagsDokument) => {
        // Find the group ID (it might be an object or a number depending on the serializer state)
        const gruppeId = typeof sourceDoc.gruppe === 'object' ? sourceDoc.gruppe?.id : sourceDoc.gruppe;

        if (!gruppeId) {
            console.error("Dokumentet mangler en gruppe og kan ikke kopieres i sin nuværende form.");
            return;
        }

        const groupDocs = (cachedDocs || []).filter(d => {
            const dGroupId = typeof d.gruppe === 'object' ? d.gruppe?.id : d.gruppe;
            return dGroupId === gruppeId;
        });

        // 1. Titel logik: Navn - 2, Navn - 3 osv.
        const currentTitle = sourceDoc.titel || sourceDoc.filnavn || "Uden navn";
        const suffixRegex = /(.*) - (\d+)$/;
        const match = currentTitle.match(suffixRegex);

        let baseTitle = currentTitle;
        if (match) {
            baseTitle = match[1];
        }

        // Find alle eksisterende titler der starter med baseTitle og har eventuelt suffix
        const relatedTitles = groupDocs
            .map(d => d.titel || d.filnavn || "")
            .filter(t => t === baseTitle || t.startsWith(baseTitle + " - "));

        let maxSuffix = 1; // 1 betyder selve basetitlen uden suffix
        relatedTitles.forEach(t => {
            const m = t.match(/ - (\d+)$/);
            if (m) {
                const s = parseInt(m[1]);
                if (s > maxSuffix) maxSuffix = s;
            } else if (t === baseTitle) {
                // maxSuffix forbliver 1 hvis vi finder basetitlen
            }
        });

        const nextSuffix = maxSuffix + 1;
        const newTitle = `${baseTitle} - ${nextSuffix}`;

        // 2. Nummer logik: 100+ strategien
        const maxNr = Math.max(0, ...groupDocs.map(d => d.dokument_nr || 0));
        const nextNr = maxNr < 100 ? 101 : maxNr + 1;

        // 3. Gem via API
        // 3. Gem via API
        try {
            const response = await DokumentService.createDokumentRow({
                sag: sag.id,
                gruppe: gruppeId, // Brug 'gruppe' som i handleQuickAdd
                titel: newTitle,
                dokument_nr: nextNr,
                aktiv: true,
                status_id: statusser.find((s: any) => s.status_nummer === 10)?.id || null,
                informations_kilde_id: sourceDoc.informations_kilde?.id,
                undermappe_id: sourceDoc.undermappe?.id
            });

            // Vis besked
            setCopyNotify({ message: `Linjen er kopieret til ${newTitle} - nr. ${nextNr}` });
            setTimeout(() => setCopyNotify(null), 3000);

            // Opdater listen med det samme i cachen
            dispatch({
                type: 'SET_CACHED_DOKUMENTER',
                payload: {
                    sagId: sag.id,
                    dokumenter: [...(cachedDocs || []), response]
                }
            });

            // Hent data i baggrunden for at sikre fuldstændighed (fx hvis backend beregnede ting)
            fetchDokumenter(true);
        } catch (e) {
            console.error("Fejl ved kopiering af dokument:", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke kopiere dokumentet.",
                type: 'error'
            });
        }
    };

    const handleDeleteLine = (docId: number) => {
        const doc = cachedDocs?.find(d => d.id === docId);
        if (doc) setDeleteConfirmDoc(doc);
    };

    const performDeleteLine = async () => {
        if (!deleteConfirmDoc) return;
        const docId = deleteConfirmDoc.id;
        try {
            await DokumentService.deleteDokumentRow(docId);
            dispatch({
                type: 'SET_CACHED_DOKUMENTER',
                payload: {
                    sagId: sag.id,
                    dokumenter: (cachedDocs || []).filter(d => d.id !== docId)
                }
            });
            setCopyNotify({ message: "Dokumentrækken er slettet." });
            setTimeout(() => setCopyNotify(null), 3000);
            setDeleteConfirmDoc(null);
        } catch (e) {
            console.error("Fejl ved sletning af dokumentrække:", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke slette dokumentrækken.",
                type: 'error'
            });
        }
    };

    const handleSaveTitleRename = async () => {
        if (!renamingTitleDoc) return;
        setIsRenamingTitle(true);
        try {
            await DokumentService.updateDokument(renamingTitleDoc.id, { titel: editTitle });
            dispatch({
                type: 'UPDATE_CACHED_DOKUMENT',
                payload: {
                    sagId: sag.id,
                    docId: renamingTitleDoc.id,
                    updates: { titel: editTitle }
                }
            });
            setRenamingTitleDoc(null);
        } catch (e) {
            console.error("Fejl ved omdøbning af titel:", e);
            setFeedbackModal({
                title: "Fejl",
                message: "Kunne ikke omdøbe dokumentet.",
                type: 'error'
            });
        } finally {
            setIsRenamingTitle(false);
        }
    };

    const openRenameTitleModal = (doc: SagsDokument) => {
        setRenamingTitleDoc(doc);
        setEditTitle(doc.titel || doc.filnavn || '');
    };

    const performGemTilSkabelon = async () => {
        if (!confirmTemplateDoc) return;

        try {
            await DokumentService.gemSomSkabelon(confirmTemplateDoc.id);
            // Update cache/fetch
            await fetchDokumenter(true);
            setNyeDokumenterFindes(true);
            setFeedbackModal({
                title: "Succes",
                message: "Dokumentet er nu gemt som skabelon.",
                type: 'success'
            });
        } catch (e: any) {
            setFeedbackModal({
                title: "Fejl",
                message: "Fejl ved gem til skabelon: " + (e.message || "Ukendt fejl"),
                type: 'error'
            });
        } finally {
            setConfirmTemplateDoc(null);
        }
    };

    const dokumenter = cachedDocs || [];

    // --- Grouping & Filtering Logic ---
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: prev[groupName] !== false ? false : true
        }));
    };

    const isGroupExpanded = (groupName: string) => expandedGroups[groupName] !== false;

    // Derived State: Processed Data with Grouping and Formatting
    const { processedGroups, globalStats } = useMemo(() => {
        const docs = cachedDocs || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        let maxOrangeDiff = 1;
        if (dayOfWeek === 5) maxOrangeDiff = 3;
        else if (dayOfWeek === 6) maxOrangeDiff = 2;

        // 1. Calculate Global stats (Total / Completed for ALL relevant docs)
        // Usually "Total" visually refers to "Active" docs, but logic depends on requirements.
        // We'll count ALL Active docs for the global counter "4/166" style
        const allActiveDocs = docs.filter(d => d.aktiv);
        const globalStats = {
            total: allActiveDocs.length,
            completed: allActiveDocs.filter(d => !!d.fil).length
        };

        // 2. Filter Documents
        const valgteProcesIds = sag.valgte_processer?.map(p => p.id) || [];

        const filtered = docs.filter(doc => {
            // Proces Filter: Skal matche sagens valgte processer
            const docProcesId = doc.gruppe_proces_id || (doc.gruppe as any)?.proces_id;
            if (docProcesId && !valgteProcesIds.includes(docProcesId)) {
                return false;
            }

            // Aktiv Filter
            if (filters.aktiv_filter === 'kun_aktive' && !doc.aktiv) return false;


            // Tekst Søgning (Title, Filename, GroupName, Number)
            const query = filters.tekst.toLowerCase();
            const fullNumber = `${doc.gruppe_nr || ''}.${doc.dokument_nr || ''}`;

            // @# Linked Data ID Filter
            const searchParams = new URLSearchParams(location.search);
            const idsParam = searchParams.get('ids');
            if (idsParam) {
                const ids = idsParam.split(',').map(Number);
                if (!ids.includes(doc.id)) return false;
            }

            const matchesText = !query || (
                (doc.titel && doc.titel.toLowerCase().includes(query)) ||
                (doc.filnavn && doc.filnavn.toLowerCase().includes(query)) ||
                (doc.gruppe_navn && doc.gruppe_navn.toLowerCase().includes(query)) ||
                (doc.gruppe_nr && doc.gruppe_nr.toString().includes(query)) ||
                (doc.gruppe_proces_id && doc.gruppe_proces_id.toString().includes(query)) ||
                (fullNumber.includes(query))
            );
            if (!matchesText) return false;

            // Mappe Filter
            if (filters.undermappe) {
                if (doc.undermappe?.id?.toString() !== filters.undermappe) return false;
            }

            // Status Filter
            if (filters.status === 'mangler_fil' && doc.fil) return false;
            if (filters.status === 'har_fil' && !doc.fil) return false;

            // Overskredet Filter
            if (filters.overskredet) {
                // Done check: Hvis der er en fil eller et link, er opgaven ikke overskredet (den er udført)
                const isDone = !!(doc.fil || doc.link);
                if (isDone) return false;

                const isNearOrPast = (dateStr: string | null) => {
                    if (!dateStr) return false;
                    const d = new Date(dateStr);
                    d.setHours(0, 0, 0, 0);
                    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff <= maxOrangeDiff;
                };

                // Hvis ingen af datoerne er i nærheden eller fortiden, er den ikke overskredet
                if (!isNearOrPast(doc.dato_intern) && !isNearOrPast(doc.dato_ekstern)) return false;
            }

            // Vigtige (Important comments) Filter
            if (filters.vigtige && !doc.kommentar_vigtig) {
                return false;
            }

            // Informations Kilde Filter
            if (filters.informations_kilde && doc.informations_kilde?.id.toString() !== filters.informations_kilde) {
                return false;
            }

            return true;
        });

        // 3. Group filtered docs
        const groups: { [key: string]: { docs: SagsDokument[], nr: number, totalInGroup: number, completedInGroup: number, id: number | null } } = {};

        // Initialize from Master Groups first (Populate IDs)
        masterGroups.forEach(g => {
            const name = g.titel_kort || '';
            if (name) {
                groups[name] = {
                    docs: [],
                    nr: g.nr,
                    totalInGroup: 0,
                    completedInGroup: 0, // Will be incremented below
                    id: g.id
                };
            }
        });

        // Initialize groups based on ALL docs
        docs.forEach(doc => {
            if (!doc.aktiv && filters.aktiv_filter === 'kun_aktive') return;

            const name = doc.gruppe_navn || 'Andre dokumenter';
            const groupId = doc.gruppe?.id || null;
            if (!groups[name]) {
                groups[name] = {
                    docs: [],
                    nr: doc.gruppe_nr || 9999,
                    totalInGroup: 0,
                    completedInGroup: 0,
                    id: groupId
                };
            } else if (!groups[name].id && groupId) {
                groups[name].id = groupId;
            }

            groups[name].totalInGroup++;
            if (doc.fil) groups[name].completedInGroup++;
        });

        // Add filtered docs to groups
        filtered.forEach(doc => {
            const name = doc.gruppe_navn || 'Andre dokumenter';
            const groupId = doc.gruppe?.id || null;
            if (!groups[name]) {
                groups[name] = {
                    docs: [],
                    nr: doc.gruppe_nr || 9999,
                    totalInGroup: 0,
                    completedInGroup: 0,
                    id: groupId
                };
            } else if (!groups[name].id && groupId) {
                groups[name].id = groupId;
            }
            groups[name].docs.push(doc);
        });

        // 4. Convert to array and Sort groups by number
        const result = Object.entries(groups)
            .map(([name, data]) => {
                // Sort documents within the group
                const sortOrder = currentUser?.aktivitet_sortering || 'nummer';
                const sortedDocs = [...data.docs].sort((a, b) => {
                    if (sortOrder === 'alfabetisk') {
                        const nameA = a.titel || a.filnavn || 'Uden navn';
                        const nameB = b.titel || b.filnavn || 'Uden navn';
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                    }
                    return (a.dokument_nr || 0) - (b.dokument_nr || 0);
                });
                return { name, ...data, docs: sortedDocs };
            })
            .filter(g => g.docs.length > 0) // Only show groups that have matching documents after filter
            .sort((a, b) => a.nr - b.nr);

        return { processedGroups: result, globalStats };
    }, [cachedDocs, filters, masterGroups, sag, location.search, currentUser]);

    const handleExpandAll = useCallback(() => {
        const allKeys: Record<string, boolean> = {};
        processedGroups.forEach(g => allKeys[g.name] = true);
        setExpandedGroups(allKeys);
    }, [processedGroups]);

    const handleCollapseAll = useCallback(() => {
        const allCollapsed: Record<string, boolean> = {};
        processedGroups.forEach(g => allCollapsed[g.name] = false);
        setExpandedGroups(allCollapsed);
    }, [processedGroups]);

    if (loading && cachedDocs?.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-blue-600" />
            </div>
        );
    }

    const hasIdFilter = !!new URLSearchParams(location.search).get('ids');

    // Lift toolbar content up to parent via callback
    useEffect(() => {
        if (!onToolbarUpdate) return;

        const content = (
            <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full mr-2">
                    Fremgang: {globalStats.completed} / {globalStats.total}
                </span>
                <Tooltip content="Fold alle grupper ud">
                    <button onClick={handleExpandAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-gray-200">
                        <ChevronsDown size={14} />
                        Fold ud
                    </button>
                </Tooltip>
                <Tooltip content="Fold alle grupper sammen">
                    <button onClick={handleCollapseAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-gray-200">
                        <ChevronsUp size={14} />
                        Fold ind
                    </button>
                </Tooltip>
                <div className="h-4 w-px bg-gray-300 mx-1"></div>
                {copyNotify && (
                    <div className="ml-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg transition-opacity duration-500 animate-in fade-in flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        {copyNotify.message}
                    </div>
                )}
                {sag && (nyeDokumenterFindes || syncing) && (
                    <Tooltip content="Nye dokumenter fundet - Klik for at synkronisere">
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`
                                p-1.5 rounded-full transition-all border
                                ${syncing ? 'animate-spin opacity-50 text-blue-600 border-transparent' : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 animate-pulse'}
                            `}
                        >
                            <RefreshCw size={16} />
                        </button>
                    </Tooltip>
                )}
            </div>
        );

        onToolbarUpdate(content);
    }, [globalStats, copyNotify, nyeDokumenterFindes, syncing, onToolbarUpdate, handleExpandAll, handleCollapseAll]);

    const toggleSort = () => {
        if (!currentUser) return;
        const current = currentUser.aktivitet_sortering || 'nummer';
        const next = current === 'nummer' ? 'alfabetisk' : 'nummer';
        // Optimistic update
        dispatch({ type: 'SET_CURRENT_USER', payload: { ...currentUser, aktivitet_sortering: next } });
        // API call
        api.patch('/kerne/me/', { aktivitet_sortering: next }).catch(console.error);
    };

    return (
        <div className="flex h-full gap-2">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
                {hasIdFilter && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams(location.search);
                                    params.delete('ids');
                                    navigate(`${location.pathname}?${params.toString()}`);
                                }}
                                className="w-fit text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition-colors flex items-center gap-1.5"
                            >
                                <RefreshCw size={12} className="inline" />
                                Nulstil filter (Vis alle emner)
                            </button>
                        </div>
                    </div>
                )}


                {/* Mail Basket Reset Button */}


                {/* Dokument Liste */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1">
                    <table className="w-full text-[12px] text-left table-fixed">
                        <thead className="bg-gray-800 text-white font-medium text-[11px] uppercase">
                            <tr>
                                <th className="px-0 py-3 w-8 text-right pr-1 border-b border-gray-700">Akt</th>
                                <th className="px-0 py-3 w-10 text-left pl-1 border-b border-gray-700">Nr</th>
                                <th className="px-2 py-3 w-52 border-b border-gray-700">Dokument</th>
                                <th className="px-2 py-3 w-20 border-b border-gray-700 text-center">Dato Int.</th>
                                <th className="px-2 py-3 w-20 border-b border-gray-700 text-center">Dato Ekst.</th>
                                <th className="px-1 py-3 w-24 border-b border-gray-700 text-center">Info</th>
                                <th className="px-2 py-3 w-40 border-b border-gray-700">Status</th>
                                <th className="px-2 py-3 w-auto border-b border-gray-700">Fil</th>
                                <th className="px-2 py-3 w-24 text-left border-b border-gray-700">Mappe</th>
                                <th className="px-0 py-3 w-8 text-center border-b border-gray-700"><Mail className="inline h-4 w-4" /></th>
                                <th className="px-2 py-3 w-20 text-left border-b border-gray-700">Kilde</th>
                                <th className="px-2 py-3 text-right w-8 border-b border-gray-700"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText size={32} className={`text-gray-300 mb-2 ${loading ? 'animate-pulse' : ''}`} />
                                            <p>{loading ? 'Indlæser...' : 'Ingen dokumenter fundet.'}</p>
                                            <p className="text-xs mt-1">
                                                {loading
                                                    ? 'Henter dokumenter, vent venligst.'
                                                    : dokumenter.length === 0
                                                        ? 'Klik på "Synkroniser" for at hente skabeloner.'
                                                        : 'Prøv at justere dine filtre.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                processedGroups.map(group => (
                                    <React.Fragment key={group.name}>
                                        <tr
                                            className="bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors border-b border-gray-200"
                                            onClick={() => toggleGroup(group.name)}
                                        >
                                            <td colSpan={10} className="px-4 py-2 text-gray-800">
                                                <div className="flex items-center gap-2 select-none">
                                                    {isGroupExpanded(group.name) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    <span className="font-bold text-sm">{group.nr} - {group.name}</span>
                                                    <span className="text-gray-500 text-xs font-normal">
                                                        ({group.completedInGroup}/{group.totalInGroup})
                                                    </span>
                                                    {group.docs.length !== group.totalInGroup && (
                                                        <span className="ml-2 text-blue-600 font-semibold bg-blue-100 px-2 rounded-full text-xs">
                                                            Viser: {group.docs.filter(d => d.fil).length}/{group.docs.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isGroupExpanded(group.name) && group.docs.map((doc, idx) => (
                                            <DokumentRow
                                                key={doc.id}
                                                doc={doc}
                                                sag={sag}
                                                isLast={idx >= group.docs.length - 2}
                                                colleagues={colleagues}
                                                statusser={statusser}
                                                onStatusToggle={handleStatusToggle}
                                                onUpload={handleUploadFile}
                                                onDelete={handleDeleteFile}
                                                onEditComment={openEditModal}
                                                onRename={openRenameModal}
                                                onInlineSave={handleInlineSave}
                                                onLinkFile={handleLinkFile}
                                                onSaveToTemplate={handleGemTilSkabelon}

                                                onCopy={handleCopyDokument}
                                                onRenameLine={openRenameTitleModal}
                                                onDeleteLine={handleDeleteLine}
                                                onLinkClick={handleLinkClick}
                                                informationsKilder={informationsKilder}
                                                standardMapper={standardMapper}
                                                isActive={activeRow === doc.id}
                                                onFocus={() => setActiveRow(doc.id)}
                                                onBlur={() => setActiveRow(null)}
                                            />
                                        ))}

                                        {/* Quick Add Row */}
                                        {isGroupExpanded(group.name) && group.id && (
                                            <tr className="bg-blue-50/20 border-b border-blue-100">
                                                <td className="px-0 py-1 text-center">
                                                    <PlusCircle size={14} className="mx-auto text-blue-400" />
                                                </td>
                                                {/* Input: Spans Nr, Dok, Dato Int, Dato Ekst, Info (5 cols) */}
                                                <td colSpan={5} className="px-1 py-1">
                                                    <form onSubmit={(e) => handleQuickAdd(group.id!, e)}>
                                                        <input
                                                            id={`quick-add-doc-${group.id}`}
                                                            name={`quick-add-doc-${group.id}`}
                                                            type="text"
                                                            placeholder="Nyt dokument navn... (Enter for at gemme)"
                                                            value={quickAddValues[group.id!] || ''}
                                                            onChange={(e) => setQuickAddValues((prev: any) => ({ ...prev, [group.id!]: e.target.value }))}
                                                            className="w-full px-2 py-1 text-[11px] border-0 border-b border-blue-200 focus:border-blue-500 focus:ring-0 bg-transparent placeholder-gray-400 outline-none"
                                                            aria-label="Nyt dokument navn"
                                                        />
                                                    </form>
                                                </td>
                                                {/* Status: Button */}
                                                <td className="px-2 py-1 text-left">
                                                    <button
                                                        onClick={() => handleQuickAdd(group.id!)}
                                                        disabled={isSavingNy[group.id!] || !quickAddValues[group.id!]?.trim()}
                                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {isSavingNy[group.id!] ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                                                        TILFØJ
                                                    </button>
                                                </td>
                                                {/* Fil, Kilde, Ansvarlig, Action: Empty */}
                                                <td className="px-2 py-1"></td>
                                                <td className="px-2 py-1"></td>
                                                <td className="px-2 py-1"></td>
                                                <td className="px-2 py-1"></td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Filter Sidebar */}
            <FilterSidebar onNulstil={resetFilters}>
                <div className="space-y-4">
                    {/* Sortering Toggle */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Sortering</span>
                        <button
                            onClick={toggleSort}
                            className="p-1 px-2 text-xs border rounded bg-white hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            title={currentUser?.aktivitet_sortering === 'alfabetisk' ? 'Skift til nummerorden' : 'Skift til alfabetisk'}
                        >
                            {currentUser?.aktivitet_sortering === 'alfabetisk' ? (
                                <>
                                    <ArrowDownAZ size={14} className="text-blue-600" />
                                    <span className="font-medium">Alfabetisk</span>
                                </>
                            ) : (
                                <>
                                    <ArrowDown01 size={14} className="text-blue-600" />
                                    <span className="font-medium">Nummer</span>
                                </>
                            )}
                        </button>
                    </div>

                    <input
                        type="text"
                        name="tekst"
                        placeholder="Søg i dokumenter..."
                        value={filters.tekst}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="alle">Alle statusser</option>
                        <option value="mangler_fil">Mangler fil</option>
                        <option value="har_fil">Har fil</option>
                    </select>

                    <select
                        name="undermappe"
                        value={filters.undermappe}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Alle mapper</option>
                        {standardMapper.filter(m => m.formaal === 'DOK').map(m => (
                            <option key={m.id} value={m.id}>{m.navn}</option>
                        ))}
                    </select>

                    <select
                        name="informations_kilde"
                        value={filters.informations_kilde}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Alle informationskilder</option>
                        {informationsKilder.map(k => (
                            <option key={k.id} value={k.id}>{k.navn}</option>
                        ))}
                    </select>

                    <div className="pt-2">
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                                type="radio"
                                name="aktiv_filter"
                                value="kun_aktive"
                                checked={filters.aktiv_filter === 'kun_aktive'}
                                onChange={handleFilterChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>Kun aktive</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm cursor-pointer mt-1">
                            <input
                                type="radio"
                                name="aktiv_filter"
                                value="alle"
                                checked={filters.aktiv_filter === 'alle'}
                                onChange={handleFilterChange}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>Alle</span>
                        </label>
                    </div>

                    <div className="pt-2 border-t border-gray-200 mt-2">
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                name="overskredet"
                                checked={filters.overskredet}
                                onChange={handleFilterChange}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Overskredne & Snart</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                name="vigtige"
                                checked={filters.vigtige}
                                onChange={handleFilterChange}
                                className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span>Kun vigtige kommentarer</span>
                        </label>
                    </div>
                </div>
            </FilterSidebar>

            {/* Modals are placed outside the flex container but inside the component to prevent layout issues */}

            {/* Confirm Save to Template */}
            <ConfirmModal
                isOpen={!!confirmTemplateDoc}
                onClose={() => setConfirmTemplateDoc(null)}
                onConfirm={performGemTilSkabelon}
                title="Gem som skabelon"
                message={`Vil du gemme "${confirmTemplateDoc?.titel}" som en permanent skabelon?`}
                confirmText="Gem"
                cancelText="Annuller"
            />

            {/* Feedback Modal (Success/Error) */}
            <ConfirmModal
                isOpen={!!feedbackModal}
                onClose={() => setFeedbackModal(null)}
                onConfirm={() => setFeedbackModal(null)}
                title={feedbackModal?.title || ''}
                message={feedbackModal?.message || ''}
                confirmText="OK"
                cancelText=""
                isDestructive={feedbackModal?.type === 'error'}
            />

            <Modal
                isOpen={!!editingDoc}
                onClose={() => setEditingDoc(null)}
                title="Rediger kommentar"
                maxWidth="max-w-lg"
                headerActions={
                    <button
                        onClick={handleSaveCommentFromModal}
                        disabled={isSavingComment || (editCommentText === (editingDoc?.kommentar || '') && editMailTitle === (editingDoc?.mail_titel || '') && editCommentImportant === (editingDoc?.kommentar_vigtig || false))}
                        className={`p-2 rounded-full text-white transition-all shadow-md active:scale-95 disabled:opacity-30 ${editCommentText === (editingDoc?.kommentar || '') && editMailTitle === (editingDoc?.mail_titel || '') && editCommentImportant === (editingDoc?.kommentar_vigtig || false)
                            ? 'bg-gray-400'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        title="Gem"
                    >
                        {isSavingComment ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    </button>
                }
            >
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Kommentar til "{editingDoc?.titel || editingDoc?.filnavn || 'Dokument'}"
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                            <input
                                id="edit-comment-important"
                                name="edit-comment-important"
                                type="checkbox"
                                checked={editCommentImportant}
                                onChange={async (e) => {
                                    const val = e.target.checked;
                                    setEditCommentImportant(val);
                                    if (editingDoc) {
                                        try {
                                            // Auto-save immediately for the checkbox
                                            await DokumentService.updateDokument(editingDoc.id, {
                                                kommentar_vigtig: val
                                            });
                                            // Update local state and cache
                                            const updatedDoc = { ...editingDoc, kommentar_vigtig: val };
                                            setEditingDoc(updatedDoc);
                                            dispatch({
                                                type: 'UPDATE_CACHED_DOKUMENT',
                                                payload: {
                                                    sagId: sag.id, docId: editingDoc.id, updates: { kommentar_vigtig: val }
                                                }
                                            });
                                        } catch (err) {
                                            console.error("Auto-save error:", err);
                                        }
                                    }
                                }}
                                className="rounded text-red-600 focus:ring-red-500"
                                aria-label="Marker som vigtig"
                            />
                            <span className={editCommentImportant ? "font-bold text-red-600" : ""}>Vigtig / Obs</span>
                        </label>
                    </div>
                    <textarea
                        autoFocus
                        rows={6}
                        className={`w-full border rounded-md shadow-sm p-2 text-[11px] placeholder-gray-400 outline-none transition-all ${editCommentImportant ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        placeholder="Skriv din kommentar her..."
                    />

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mail Titel (til eksterne mails)
                        </label>
                        <input
                            id="edit-mail-titel"
                            name="edit-mail-titel"
                            type="text"
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm placeholder-gray-400 outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={editMailTitle}
                            onChange={(e) => setEditMailTitle(e.target.value)}
                            placeholder="F.eks. BBR-Meddelelse"
                            aria-label="Mail Titel"
                        />
                    </div>
                </div>
            </Modal>

            <RenameFileModal
                isOpen={!!renamingDoc}
                onClose={() => setRenamingDoc(null)}
                onConfirm={handleSaveRename}
                title="Omdøb fil"
                prefix={renameFilePrefix}
                initialName={renameFilename}
                extension={renamingDoc?.filnavn && renamingDoc.filnavn.lastIndexOf('.') > 0 ? renamingDoc.filnavn.substring(renamingDoc.filnavn.lastIndexOf('.')) : ''}
                isLoading={isRenaming}
            />



            {/* Rename Title Modal */}
            <Modal
                isOpen={!!renamingTitleDoc}
                onClose={() => setRenamingTitleDoc(null)}
                title="Omdøb dokumentrække"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setRenamingTitleDoc(null)}
                            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Annuller
                        </button>
                        <button
                            onClick={handleSaveTitleRename}
                            disabled={isRenamingTitle}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isRenamingTitle ? 'Gemmer...' : 'Gem'}
                        </button>
                    </div>
                }
            >
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nyt navn (titel)
                    </label>
                    <input
                        autoFocus
                        type="text"
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitleRename();
                        }}
                    />
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteConfirmDoc}
                onClose={() => setDeleteConfirmDoc(null)}
                onConfirm={performDeleteLine}
                title="Slet dokumentrække"
                message={`Er du sikker på, at du vil slette "${deleteConfirmDoc?.titel || deleteConfirmDoc?.filnavn || 'denne række'}"? Alle tilknyttede data og eventuelle filer vil gå tabt.`}
                confirmText="Slet"
                isDestructive={true}
            />

        </div >
    );
}
