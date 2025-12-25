import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Sag, SagsDokument, Blokinfo } from '../../../types';
import { api } from '../../../api';
import { Loader2, FileText, RefreshCw, UploadCloud, CheckCircle, Upload, Trash2, Info, MessageSquare, Pencil, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Search, SlidersHorizontal, FunnelX, ExternalLink, PlusCircle, Save, CheckCircle2 } from 'lucide-react';
import { useAppState } from '../../../StateContext';
import Modal from '../../Modal';
import ConfirmModal from '../../ui/ConfirmModal';
import FilterSidebar from '../../FilterSidebar';
import Tooltip from '../../Tooltip';
import SmartDateInput from '../../SmartDateInput';
import { User as UserType } from '../../../types';

interface DokumenterTabProps {
    sag: Sag;
    onUpdate?: () => void;
}

interface SøgeResultat {
    id: number;
    sags_nr: string;
    alias: string;
}

interface DokumentFilterState {
    tekst: string;
    ansvarlig: string;
    status: string; // "alle", "mangler_fil", "har_fil"
    aktiv_filter: string; // "kun_aktive", "alle"
    overskredet: boolean;
}

const DokumentRow = ({
    doc,
    sag,
    colleagues,
    onUpload,
    onDelete,
    onEditComment,
    onRename,
    onInlineSave,
    onSaveToTemplate,
    statusser,
    onStatusToggle
}: {
    doc: SagsDokument;
    sag: Sag;
    colleagues: UserType[];
    onUpload: (docId: number, file: File) => Promise<void>;
    onDelete: (docId: number) => Promise<void>;
    onEditComment: (doc: SagsDokument) => void;
    onRename: (doc: SagsDokument) => void;
    onInlineSave: (docId: number, field: string, value: any) => Promise<void>;
    onSaveToTemplate: (doc: SagsDokument) => void;
    statusser: any[];
    onStatusToggle: (doc: SagsDokument) => void;
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dynamic link processing: Replace #BFE# with the actual BFE number if available
    const processedLink = useMemo(() => {
        if (!doc.link) return null;
        const bfe = sag.bolig_bfe || '';
        return doc.link.replace('#BFE#', bfe);
    }, [doc.link, sag.bolig_bfe]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setIsUploading(true);
            onUpload(doc.id, acceptedFiles[0]).finally(() => setIsUploading(false));
        }
    }, [doc.id, onUpload]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: false
    });

    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Er du sikker på, at du vil slette denne fil?')) {
            setIsDeleting(true);
            try {
                await onDelete(doc.id);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleRenameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRename(doc);
    };

    return (
        <tr {...getRootProps()} className={`hover:bg-gray-50 group transition-colors relative ${isDragActive ? 'bg-blue-50 ring-2 ring-blue-400 z-10' : ''}`}>
            <td className="px-0 py-3 text-right w-8 pr-1">
                <input {...getInputProps()} />
                <input
                    type="checkbox"
                    checked={doc.aktiv}
                    readOnly
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
            </td>
            {/* Nr Column: Left aligned to be close to checkbox */}
            <td className="px-0 py-1.5 font-mono text-gray-500 text-[10px] text-left pl-1 w-10 whitespace-nowrap align-middle">
                {doc.gruppe_nr}.{doc.dokument_nr}
            </td>
            <td className="px-2 py-1.5 w-52 align-middle overflow-hidden">
                <div className="font-medium text-gray-800 truncate" title={doc.titel || doc.filnavn || ''}>
                    {doc.titel || doc.filnavn || 'Uden navn'}
                </div>
            </td>
            <td className="px-2 py-1.5 w-20 relative align-middle overflow-hidden">
                <SmartDateInput
                    value={doc.dato_intern}
                    onSave={(val) => onInlineSave(doc.id, 'dato_intern', val)}
                    className={`w-full py-0.5 px-1 border border-slate-400 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!doc.dato_intern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="px-2 py-1.5 w-20 relative align-middle overflow-hidden">
                <SmartDateInput
                    value={doc.dato_ekstern}
                    onSave={(val) => onInlineSave(doc.id, 'dato_ekstern', val)}
                    className={`w-full py-0.5 px-1 border border-slate-400 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${!doc.dato_ekstern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="px-0 py-1.5 w-20 relative align-middle overflow-hidden">
                {/* Combined Meta Column: Info, Link, Comment, Template */}
                <div className="flex items-center justify-center gap-1.5 h-full">
                    {/* Slot 1: Skabelon Info */}
                    <div className="w-4 flex justify-center">
                        {doc.skabelon_kommentar ? (
                            <div className="relative group/info inline-block">
                                <Info size={14} className="text-amber-500 cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible z-50 transition-all pointer-events-none text-left">
                                    {doc.skabelon_kommentar}
                                </div>
                            </div>
                        ) : <div className="w-4 h-4" />}
                    </div>

                    {/* Slot 2: Link */}
                    <div className="w-4 flex justify-center">
                        {processedLink ? (
                            <div className="relative group/extlink inline-block">
                                <a href={processedLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        ) : <div className="w-4 h-4" />}
                    </div>

                    {/* Slot 3: User Comment */}
                    <div className="w-5 flex justify-center">
                        <Tooltip content={doc.kommentar || "Tilføj kommentar"}>
                            <button
                                onClick={() => onEditComment(doc)}
                                className={`p-0.5 rounded transition-colors ${doc.kommentar_vigtig
                                    ? 'text-red-600 hover:bg-red-50'
                                    : doc.kommentar
                                        ? 'text-blue-600 hover:bg-blue-50'
                                        : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <MessageSquare size={14} fill={doc.kommentar ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Slot 4: Template Upload */}
                    {!doc.skabelon && (
                        <div className="w-5 flex justify-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSaveToTemplate(doc); }}
                                className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            >
                                <UploadCloud size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </td>
            <td className={`px-2 py-1.5 w-40 relative transition-colors align-middle overflow-hidden ${doc.status?.status_nummer === 80 ? 'bg-green-50' : ''}`}>
                <div className="flex items-center gap-1.5 h-7">
                    <button
                        onClick={(e) => { e.stopPropagation(); onStatusToggle(doc); }}
                        className={`w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors ${doc.status?.status_nummer === 80 ? 'text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                        title={doc.status?.status_nummer === 80 ? "Sæt til 'Oprettet'" : "Sæt til 'Udført'"}
                    >
                        <CheckCircle2 size={16} fill={doc.status?.status_nummer === 80 ? "currentColor" : "none"} strokeWidth={2.5} />
                    </button>
                    <select
                        value={doc.status?.id || ''}
                        onChange={(e) => onInlineSave(doc.id, 'status_id', e.target.value === '' ? null : parseInt(e.target.value))}
                        className={`flex-grow h-7 py-0 px-1 border border-slate-400 rounded text-[11px] bg-white focus:border-black focus:ring-0 ${doc.status?.status_nummer === 80 ? 'bg-green-50' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Vælg...</option>
                        {statusser.map((s: any) => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                    </select>
                </div>
            </td>
            <td className="px-2 py-1.5 w-auto relative align-middle overflow-hidden">
                {/* Fil Column */}
                {/* 
                    Requirement: "Make the border around equal, also for those where no document is connected to."
                    We use a consistent container style for both states.
                */}
                <div className={`flex items-center gap-2 border rounded px-1 py-1 transition-all shadow-sm min-h-[32px] bg-white overflow-hidden
                    ${isDragActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-400 hover:border-blue-400'}
                `}>
                    <div className="flex-1 flex items-center min-w-0">
                        {isUploading ? (
                            <span className="flex items-center gap-2 text-blue-600 text-xs">
                                <Loader2 size={14} className="animate-spin" /> Uploader...
                            </span>
                        ) : doc.fil ? (
                            <div className="flex items-center justify-between w-full gap-1">
                                <a
                                    href={doc.fil}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:underline truncate group/link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FileText size={14} className="flex-shrink-0" />
                                    <span className="truncate text-xs font-medium">{doc.filnavn || 'Hent fil'}</span>
                                </a>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                        onClick={handleRenameClick}
                                        className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                        title="Omdøb fil"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={handleDeleteClick}
                                        disabled={isDeleting}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Slet fil"
                                    >
                                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={open}
                                className="flex items-center gap-2 text-gray-500 text-xs cursor-pointer w-full"
                            >
                                <Upload size={14} />
                                <span className="truncate">{isDragActive ? 'Slip filen' : 'Klik / træk fil her'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Drag Overlay */}
                {isDragActive && (
                    <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center text-blue-700 font-semibold border-2 border-blue-500 rounded z-20">
                        <UploadCloud className="mr-2" size={16} /> Uploader til "{doc.titel}"
                    </div>
                )}
            </td>
            <td className="px-2 py-1.5 w-24 align-middle overflow-hidden">
                <select
                    value={doc.ansvarlig || ''}
                    onChange={(e) => onInlineSave(doc.id, 'ansvarlig', e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full py-0.5 px-1 border border-slate-400 rounded-md text-xs bg-white focus:border-black focus:ring-0"
                >
                    <option value="">Ingen</option>
                    {colleagues.map(u => (
                        <option key={u.id} value={u.id}>
                            {u.username}
                        </option>
                    ))}
                </select>
            </td>
            <td className="px-2 py-3 text-right w-8">
            </td>
        </tr>
    );
};

export default function DokumenterTab({ sag, onUpdate }: DokumenterTabProps) {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();

    // Sag Search State
    const [sagSearchTerm, setSagSearchTerm] = useState('');
    const [sagSearchResults, setSagSearchResults] = useState<SøgeResultat[]>([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
    const [colleagues, setColleagues] = useState<UserType[]>([]);
    const [statusser, setStatusser] = useState<any[]>([]);

    // Fetch colleagues and statuses
    useEffect(() => {
        api.get<UserType[]>('/kerne/users/').then(data => {
            setColleagues(data.filter(u => u.is_active));
        });
        api.get<any[]>('/kerne/status/?formaal=3').then(data => {
            // StatusViewSet supports pagination if using DefaultRouter, but here it might return .results
            const statuses = (data as any).results || data;
            setStatusser(statuses);
        });
    }, []);

    // Master Groups State (to ensure we have IDs for Quick Add even if docs are missing it)
    const [masterGroups, setMasterGroups] = useState<Blokinfo[]>([]);

    useEffect(() => {
        api.get<Blokinfo[]>('/skabeloner/blokinfo/').then(data => {
            // Filter for Document Groups (formaal = 3 usually, or just use all and match by name)
            // BlokInfoSkabelonerPage uses formaal 3 for Documents.
            const relevant = data.filter(g => g.formaal === 3);
            setMasterGroups(relevant);
        });
    }, []);
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (sagSearchTerm.length < 2) {
                setSagSearchResults([]);
                return;
            }
            try {
                const data = await api.get<SøgeResultat[]>(`/sager/search/?q=${sagSearchTerm}`);
                setSagSearchResults(data);
                setActiveSearchIndex(-1);
            } catch (e) {
                console.error("Søgefejl:", e);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [sagSearchTerm]);

    const handleSelectSag = (id: number) => {
        navigate(`/dokumenter/${id}`);
        setSagSearchTerm('');
        setSagSearchResults([]);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (sagSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSearchIndex(prev => (prev < sagSearchResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const idx = activeSearchIndex >= 0 ? activeSearchIndex : 0;
            if (sagSearchResults[idx]) handleSelectSag(sagSearchResults[idx].id);
        } else if (e.key === 'Escape') {
            setSagSearchResults([]);
        }
    };
    const cachedDocs = state.cachedDokumenter[sag.id];

    const [loading, setLoading] = useState(!cachedDocs);
    const [syncing, setSyncing] = useState(false);
    const [nyeDokumenterFindes, setNyeDokumenterFindes] = useState(false);

    // Sync Check Logic
    useEffect(() => {
        const checkSync = async () => {
            try {
                const res = await api.get<any>('/skabeloner/dokumenter/sync_check/');
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
        ansvarlig: '',
        status: 'alle',
        aktiv_filter: 'kun_aktive',
        overskredet: false
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
            ansvarlig: '',
            status: 'alle',
            aktiv_filter: 'kun_aktive',
            overskredet: false
        });
    };

    // State for Comment Modal
    const [editingDoc, setEditingDoc] = useState<SagsDokument | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
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

    // State for Save to Template Modal
    const [confirmTemplateDoc, setConfirmTemplateDoc] = useState<SagsDokument | null>(null);
    const [feedbackModal, setFeedbackModal] = useState<{ title: string, message: string, type: 'success' | 'error' } | null>(null);

    const fetchDokumenter = useCallback(async (force = false) => {
        if (!force && state.cachedDokumenter[sag.id]) {
            setLoading(false);
            return;
        }

        try {
            const data = await api.get<SagsDokument[]>(`/sager/sagsdokumenter/?sag_id=${sag.id}`);
            dispatch({
                type: 'SET_CACHED_DOKUMENTER',
                payload: { sagId: sag.id, dokumenter: data }
            });
        } catch (error) {
            console.error("Fejl ved hentning af dokumenter:", error);
        } finally {
            setLoading(false);
        }
    }, [sag.id, dispatch, state.cachedDokumenter]);

    useEffect(() => {
        fetchDokumenter();
    }, [fetchDokumenter]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post(`/sager/${sag.id}/synkroniser_dokumenter/`);
            await fetchDokumenter(true);
            setNyeDokumenterFindes(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Fejl ved synkronisering:", error);
        } finally {
            setSyncing(false);
        }
    };

    const handleUploadFile = async (docId: number, file: File) => {
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
            const formData = new FormData();
            formData.append('fil', fileToUpload);

            // Auto-set status to 80 (Udført) when file is uploaded
            const status80 = statusser.find(s => s.status_nummer === 80);
            if (status80) {
                formData.append('status_id', status80.id.toString());
            }

            await api.patch(`/sager/sagsdokumenter/${docId}/`, formData);
            await fetchDokumenter(true);
        } catch (e) {
            console.error("Upload fejl:", e);
            alert("Kunne ikke uploade filen.");
            throw e;
        }
    };

    const handleDeleteFile = async (docId: number) => {
        try {
            await api.patch(`/sager/sagsdokumenter/${docId}/`, { fil: null });
            await fetchDokumenter(true);
        } catch (e) {
            console.error("Slet fejl:", e);
            alert("Kunne ikke slette filen.");
        }
    };

    // --- Comment Logic ---
    const openEditModal = (doc: SagsDokument) => {
        setEditingDoc(doc);
        setEditCommentText(doc.kommentar || '');
        setEditCommentImportant(doc.kommentar_vigtig || false);
    };

    const handleSaveCommentFromModal = async () => {
        if (!editingDoc) return;
        setIsSavingComment(true);
        try {
            await api.patch(`/sager/sagsdokumenter/${editingDoc.id}/`, {
                kommentar: editCommentText,
                kommentar_vigtig: editCommentImportant
            });
            dispatch({
                type: 'UPDATE_CACHED_DOKUMENT',
                payload: {
                    sagId: sag.id, docId: editingDoc.id, updates: {
                        kommentar: editCommentText,
                        kommentar_vigtig: editCommentImportant
                    }
                }
            });
            setEditingDoc(null);
        } catch (e) {
            console.error("Fejl ved gemning af kommentar", e);
            alert("Kunne ikke gemme kommentar.");
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
        // Strip the prefix if it exists - potentially multiple times if it was double-prefixed before
        if (prefix) {
            while (currentName.startsWith(prefix)) {
                currentName = currentName.substring(prefix.length);
            }
        }
        setRenameFilename(currentName);
    };

    const handleSaveRename = async () => {
        if (!renamingDoc) return;

        const fullNewName = `${renameFilePrefix}${renameFilename}`;

        setIsRenaming(true);
        try {
            await api.patch(`/sager/sagsdokumenter/${renamingDoc.id}/`, { filnavn: fullNewName });
            await fetchDokumenter(true);
            setRenamingDoc(null);
        } catch (e) {
            console.error("Fejl ved omdøbning", e);
            alert("Kunne ikke omdøbe fil.");
        } finally {
            setIsRenaming(false);
        }
    };

    const handleInlineSave = async (docId: number, field: string, value: any) => {
        try {
            const response = await api.patch<any>(`/sager/sagsdokumenter/${docId}/`, { [field]: value });
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
        try {
            await api.post('/sager/sagsdokumenter/', {
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
            // Helper to try and show API error data if available
            const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : (e.message || "Ukendt fejl");
            alert("Fejl ved hurtig-tilføj: " + errorMsg);
        } finally {
            setIsSavingNy((prev: any) => ({ ...prev, [gruppeId]: false }));
        }
    };

    const handleGemTilSkabelon = (doc: SagsDokument) => {
        setConfirmTemplateDoc(doc);
    };

    const performGemTilSkabelon = async () => {
        if (!confirmTemplateDoc) return;

        try {
            await api.post(`/sager/sagsdokumenter/${confirmTemplateDoc.id}/gem_til_skabelon/`);
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
        const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local time

        // 1. Calculate Global stats (Total / Completed for ALL relevant docs)
        // Usually "Total" visually refers to "Active" docs, but logic depends on requirements.
        // We'll count ALL Active docs for the global counter "4/166" style
        const allActiveDocs = docs.filter(d => d.aktiv);
        const globalStats = {
            total: allActiveDocs.length,
            completed: allActiveDocs.filter(d => !!d.fil).length
        };

        // 2. Filter Documents
        const filtered = docs.filter(doc => {
            // Aktiv Filter
            if (filters.aktiv_filter === 'kun_aktive' && !doc.aktiv) return false;

            // Tekst Søgning (Title, Filename, GroupName, Number)
            const query = filters.tekst.toLowerCase();
            const fullNumber = `${doc.gruppe_nr || ''}.${doc.dokument_nr || ''}`;
            const matchesText = !query || (
                (doc.titel && doc.titel.toLowerCase().includes(query)) ||
                (doc.filnavn && doc.filnavn.toLowerCase().includes(query)) ||
                (doc.gruppe_navn && doc.gruppe_navn.toLowerCase().includes(query)) ||
                (fullNumber.includes(query))
            );
            if (!matchesText) return false;

            // Ansvarlig Filter
            if (filters.ansvarlig) {
                if (doc.ansvarlig_username !== filters.ansvarlig) return false;
            }

            // Status Filter
            if (filters.status === 'mangler_fil' && doc.fil) return false;
            if (filters.status === 'har_fil' && !doc.fil) return false;

            // Overskredet Filter
            if (filters.overskredet) {
                // Done check: Hvis der er en fil eller et link, er opgaven ikke overskredet (den er udført)
                const isDone = !!(doc.fil || doc.link);
                if (isDone) return false;

                // Dato check: Sammenlign datoer korrekt
                const internPast = doc.dato_intern && new Date(doc.dato_intern) < new Date(today);
                const eksternPast = doc.dato_ekstern && new Date(doc.dato_ekstern) < new Date(today);

                // Hvis ingen af datoerne er i fortiden, er den ikke overskredet
                if (!internPast && !eksternPast) return false;
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

        // Initialize groups based on ALL docs (to show empty groups matching filter, or just filtered? 
        // Providing totals usually requires iterating all docs to account for the "Total" in header, even if some hidden)
        // Let's iterate all docs to build group skeletons and counts first
        docs.forEach(doc => {
            // Only count if it matches the "Aktiv" filter logic generally used for "Total" view, 
            // usually we show (Completed / Total Active).
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
                // Update group ID if we found one and didn't have one before
                groups[name].id = groupId;
            }

            groups[name].totalInGroup++;
            if (doc.fil) groups[name].completedInGroup++;
        });

        // Add filtered docs to groups
        filtered.forEach(doc => {
            const name = doc.gruppe_navn || 'Andre dokumenter';
            const groupId = doc.gruppe?.id || null;
            // Ensure group exists (might be missing if we skipped it above due to some logic, but shouldn't happen if consistency exists)
            if (!groups[name]) {
                groups[name] = {
                    docs: [],
                    nr: doc.gruppe_nr || 9999,
                    totalInGroup: 0, // These would be 0 if we strictly followed above, but let's be safe
                    completedInGroup: 0,
                    id: groupId
                };
            } else if (!groups[name].id && groupId) {
                // Update group ID if we found one
                groups[name].id = groupId;
            }
            groups[name].docs.push(doc);
        });

        // 4. Convert to array and Sort groups by number
        const result = Object.entries(groups)
            .map(([name, data]) => {
                // Sort documents within the group by dokument_nr
                const sortedDocs = [...data.docs].sort((a, b) => (a.dokument_nr || 0) - (b.dokument_nr || 0));
                return { name, ...data, docs: sortedDocs };
            })
            .filter(g => g.docs.length > 0) // Only show groups that have matching documents after filter
            .sort((a, b) => a.nr - b.nr);

        return { processedGroups: result, globalStats };
    }, [cachedDocs, filters, masterGroups]);

    const handleExpandAll = () => {
        const allKeys: Record<string, boolean> = {};
        processedGroups.forEach(g => allKeys[g.name] = true);
        setExpandedGroups(allKeys);
    };

    const handleCollapseAll = () => {
        const allCollapsed: Record<string, boolean> = {};
        processedGroups.forEach(g => allCollapsed[g.name] = false);
        setExpandedGroups(allCollapsed);
    };

    if (loading && cachedDocs?.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* Header Section */}
                <div className="flex justify-between items-start bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                Dokumenter for Sag {sag.sags_nr}
                                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {globalStats.completed} / {globalStats.total}
                                </span>
                            </h2>
                            <div className="flex items-center gap-1">
                                <Tooltip content="Fold alle grupper ud">
                                    <button onClick={handleExpandAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                        <ChevronsDown size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Fold alle grupper sammen">
                                    <button onClick={handleCollapseAll} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                        <ChevronsUp size={18} />
                                    </button>
                                </Tooltip>
                                <div className="h-4 w-px bg-gray-300 mx-1"></div>
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
                        </div>
                        {sag.fuld_adresse && (
                            <div className="text-gray-500 flex items-center gap-1 text-sm">
                                <span className="font-medium">{sag.fuld_adresse}</span>
                            </div>
                        )}
                    </div>

                    {/* Sag Search Box (Skift sag) */}
                    <div className="relative min-w-72">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Skift sag..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-400 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={sagSearchTerm}
                            onChange={(e) => setSagSearchTerm(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                        {sagSearchResults.length > 0 && (
                            <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-auto shadow-xl py-1">
                                {sagSearchResults.map((res, index) => (
                                    <li
                                        key={res.id}
                                        onClick={() => handleSelectSag(res.id)}
                                        onMouseEnter={() => setActiveSearchIndex(index)}
                                        className={`px-4 py-2 text-sm cursor-pointer border-b last:border-0 border-gray-50 ${index === activeSearchIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <span className="font-bold">{res.sags_nr}</span>
                                        <span className="mx-2 opacity-50">|</span>
                                        <span>{res.alias}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Dokument Liste */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-gray-800 text-white font-medium">
                            <tr>
                                <th className="px-0 py-3 w-8 text-right pr-1 border-b border-gray-700">Akt</th>
                                <th className="px-0 py-3 w-10 text-left pl-1 border-b border-gray-700">Nr</th>
                                <th className="px-2 py-3 w-52 border-b border-gray-700">Dokument</th>
                                <th className="px-2 py-3 w-20 border-b border-gray-700 text-center">Dato Int.</th>
                                <th className="px-2 py-3 w-20 border-b border-gray-700 text-center">Dato Ekst.</th>
                                <th className="px-1 py-3 w-20 border-b border-gray-700 text-center">Info</th>
                                <th className="px-2 py-3 w-40 border-b border-gray-700">Status</th>
                                <th className="px-2 py-3 w-auto border-b border-gray-700">Fil</th>
                                <th className="px-2 py-3 w-24 text-left border-b border-gray-700">Ansvarlig</th>
                                <th className="px-2 py-3 text-right w-8 border-b border-gray-700"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText size={32} className="text-gray-300 mb-2" />
                                            <p>Ingen dokumenter fundet.</p>
                                            <p className="text-xs mt-1">
                                                {dokumenter.length === 0
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
                                        {isGroupExpanded(group.name) && group.docs.map(doc => (
                                            <DokumentRow
                                                key={doc.id}
                                                doc={doc}
                                                sag={sag}
                                                colleagues={colleagues}
                                                statusser={statusser}
                                                onStatusToggle={handleStatusToggle}
                                                onUpload={handleUploadFile}
                                                onDelete={handleDeleteFile}
                                                onEditComment={openEditModal}
                                                onRename={openRenameModal}
                                                onInlineSave={handleInlineSave}
                                                onSaveToTemplate={handleGemTilSkabelon}
                                            />
                                        ))}

                                        {/* Quick Add Row */}
                                        {isGroupExpanded(group.name) && group.id && (
                                            <tr className="bg-blue-50/20 border-b border-blue-100">
                                                <td className="px-0 py-1 text-center text-blue-300">
                                                    <PlusCircle size={14} className="mx-auto" />
                                                </td>
                                                {/* Input: Spans Nr, Dok, Datoer (5 cols total with icon) */}
                                                <td colSpan={5} className="px-1 py-1">
                                                    <form onSubmit={(e) => handleQuickAdd(group.id!, e)}>
                                                        <input
                                                            type="text"
                                                            placeholder="Nyt dokument navn... (Enter for at gemme)"
                                                            value={quickAddValues[group.id!] || ''}
                                                            onChange={(e) => setQuickAddValues((prev: any) => ({ ...prev, [group.id!]: e.target.value }))}
                                                            className="w-full px-2 py-0.5 text-sm border border-blue-100 rounded focus:ring-1 focus:ring-blue-400 outline-none bg-white/50"
                                                        />
                                                    </form>
                                                </td>
                                                {/* Button: Spans Info, Status, Fil, Ansvarlig + Empty (5 cols) */}
                                                <td colSpan={4} className="px-2 py-1">
                                                    <button
                                                        onClick={() => handleQuickAdd(group.id!)}
                                                        disabled={isSavingNy[group.id!] || !quickAddValues[group.id!]?.trim()}
                                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {isSavingNy[group.id!] ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                                                        Hurtig-tilføj
                                                    </button>
                                                </td>
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
                    <input
                        type="text"
                        name="tekst"
                        placeholder="Søg i dokumenter..."
                        value={filters.tekst}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        name="ansvarlig"
                        value={filters.ansvarlig}
                        onChange={handleFilterChange}
                        className="p-2 w-full border border-slate-400 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Alle ansvarlige</option>
                        {colleagues.map(u => (
                            <option key={u.id} value={u.username}>{u.username}</option>
                        ))}
                    </select>

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
                            <span>Vis kun overskredne</span>
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
                        disabled={isSavingComment}
                        className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
                                type="checkbox"
                                checked={editCommentImportant}
                                onChange={(e) => setEditCommentImportant(e.target.checked)}
                                className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span className={editCommentImportant ? "font-bold text-red-600" : ""}>Vigtig / Obs</span>
                        </label>
                    </div>
                    <textarea
                        autoFocus
                        rows={6}
                        className={`w-full border rounded-md shadow-sm p-2 text-sm outline-none transition-all ${editCommentImportant ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        placeholder="Skriv din kommentar her..."
                    />
                </div>
            </Modal>

            <Modal
                isOpen={!!renamingDoc}
                onClose={() => setRenamingDoc(null)}
                title="Omdøb fil"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setRenamingDoc(null)}
                            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Annuller
                        </button>
                        <button
                            onClick={handleSaveRename}
                            disabled={isRenaming}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isRenaming ? 'Gemmer...' : 'Gem'}
                        </button>
                    </div>
                }
            >
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nyt filnavn
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="text-gray-500 font-mono text-sm select-none bg-gray-100 px-2 py-2 rounded border border-gray-300">
                            {renameFilePrefix}
                        </div>
                        <input
                            autoFocus
                            type="text"
                            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={renameFilename}
                            onChange={(e) => setRenameFilename(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename();
                            }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Filnavnet vil automatisk starte med sagsnummeret.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
