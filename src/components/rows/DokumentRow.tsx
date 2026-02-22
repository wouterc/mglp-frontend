
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, FileText, UploadCloud, CheckCircle2, Trash2, Info, MessageSquare, Pencil, Upload, ExternalLink, Link as LinkIcon, Copy, MoreVertical, Edit3 } from 'lucide-react';
import Tooltip from '../Tooltip';
import SmartDateInput from '../SmartDateInput';
import ConfirmModal from '../ui/ConfirmModal';
import { SagsDokument, Sag, User, InformationsKilde, StandardMappe } from '../../types';
import { API_BASE_URL } from '../../config';

interface DokumentRowProps {
    doc: SagsDokument;
    sag: Sag;
    colleagues: User[];
    onUpload: (docId: number, file: File, undermappeId?: number) => Promise<void>;
    onDelete: (docId: number) => Promise<void>;
    onEditComment: (doc: SagsDokument) => void;
    onRename: (doc: SagsDokument) => void;
    onInlineSave: (docId: number, field: string, value: any) => Promise<void>;
    onSaveToTemplate: (doc: SagsDokument) => void;
    onCopy: (doc: SagsDokument) => void;
    onRenameLine?: (doc: SagsDokument) => void;
    onDeleteLine?: (docId: number) => void;
    isLast?: boolean;
    statusser: any[];
    onStatusToggle: (doc: SagsDokument) => void;
    onLinkClick?: (doc: SagsDokument) => void;
    onLinkFile: (docId: number, path: string) => Promise<void>;

    informationsKilder: InformationsKilde[];
    standardMapper: StandardMappe[];
    isActive?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

const DokumentRow = React.memo(function DokumentRow({
    doc,
    sag,
    colleagues,
    onUpload,
    onDelete,
    onEditComment,
    onRename,
    onInlineSave,
    onSaveToTemplate,
    onCopy,
    onRenameLine,
    onDeleteLine,
    isLast,
    statusser,
    onStatusToggle,
    onLinkClick,
    onLinkFile,

    informationsKilder,
    standardMapper,
    isActive,
    onFocus,
    onBlur
}: DokumentRowProps) {
    const isDone = doc.status?.status_nummer === 80 || doc.status?.status_kategori === 1 || !!(doc.fil || doc.link);
    const dropHandledRef = useRef(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getDateColorClass = (dateStr: string | null) => {
        if (!dateStr || isDone) return '';

        // Parsing YYYY-MM-DD manually for robustness against timezone shifts
        const parts = dateStr.split('-');
        if (parts.length !== 3) return '';

        const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return '!bg-red-500 !text-white';

        let maxOrangeDiff = 1;
        const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
        if (dayOfWeek === 5) maxOrangeDiff = 3;
        else if (dayOfWeek === 6) maxOrangeDiff = 2;

        if (diffDays <= maxOrangeDiff) return '!bg-orange-400 !text-white';
        return '';
    };

    const handleKeyDown = (e: React.KeyboardEvent, nextFieldId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextEl = document.getElementById(nextFieldId);
            if (nextEl) {
                nextEl.focus();
                if (nextEl instanceof HTMLInputElement && nextEl.type === 'text') {
                    nextEl.select();
                }
            }
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dynamic link processing: Replace #BFE# with the actual BFE number if available
    const processedLink = useMemo(() => {
        if (!doc.link) return null;
        const bfe = sag.bolig_bfe || '';
        return doc.link.replace('#BFE#', bfe);
    }, [doc.link, sag.bolig_bfe]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (dropHandledRef.current) {
            dropHandledRef.current = false;
            return;
        }
        if (acceptedFiles.length > 0) {
            setIsUploading(true);
            // Brug eksisterende undermappe hvis tildelt
            const currentMappeId = doc.undermappe?.id;
            onUpload(doc.id, acceptedFiles[0], currentMappeId).finally(() => setIsUploading(false));
        }
    }, [doc.id, doc.undermappe?.id, onUpload]);

    const [isInternalDragOver, setIsInternalDragOver] = useState(false);

    // Funktion til upload til specifik mappe fra overlay

    const handleNativeDragOver = (e: React.DragEvent) => {
        // We allow both files (handled by dropzone if it wanted to) 
        // and our internal types.
        const types = e.dataTransfer.types;
        if (types.includes('application/json') || types.includes('text/plain') || types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setIsInternalDragOver(true);
        }
    };

    const handleNativeDrop = (e: React.DragEvent) => {
        setIsInternalDragOver(false);

        let rawData = e.dataTransfer.getData('application/json');

        // Fallback to text/plain if application/json is empty (cross-window issue)
        if (!rawData) {
            const textData = e.dataTransfer.getData('text/plain');
            if (textData && textData.startsWith('MGLP_FILE:')) {
                rawData = textData.substring('MGLP_FILE:'.length);
            }
        }

        if (rawData) {
            e.preventDefault();
            try {
                const data = JSON.parse(rawData);
                if (data.type === 'mglp-file' && data.path) {
                    if (data.sag_id !== sag.id) {
                        alert(`Du kan kun trække filer indenfor den samme sag.\nFilen tilhører sag ${data.sag_id}, men dette er sag ${sag.id}.`);
                        return;
                    }
                    setIsUploading(true);
                    onLinkFile(doc.id, data.path).finally(() => setIsUploading(false));
                }
            } catch (err) {
                console.error("Fejl ved parsing af drop data:", err);
            }
        }
    };



    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: false
    });

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(doc.id);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRenameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRename(doc);
    };

    const rootProps = getRootProps();

    return (
        <tr
            {...rootProps}
            onDragOver={(e) => {
                if (e.dataTransfer.types.length > 0) {
                    const types = e.dataTransfer.types;
                    if (types.includes('application/json') || types.includes('text/plain') || types.includes('Files')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        if (!isInternalDragOver) setIsInternalDragOver(true);
                    }
                }
                if (rootProps.onDragOver) rootProps.onDragOver(e);
            }}
            onDragLeave={(e) => {
                setIsInternalDragOver(false);
                if (rootProps.onDragLeave) rootProps.onDragLeave(e);
            }}
            onDrop={(e) => {
                setIsInternalDragOver(false);
                handleNativeDrop(e);
                if (rootProps.onDrop) rootProps.onDrop(e);
            }}
            className={`group transition-colors relative ${isDragActive || isInternalDragOver ? 'bg-white ring-2 ring-blue-400 z-10' : ''} ${isActive ? 'bg-red-50/30 active-row-highlight' : 'hover:bg-gray-50'}`}
            onClick={onFocus}
            onFocus={onFocus}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    onBlur?.();
                }
            }}
        >
            <td className="px-0 py-3 text-right w-8 pr-1">
                <input {...getInputProps()} />
                <input
                    id={`d-${doc.id}-f0`}
                    type="checkbox"
                    checked={doc.aktiv}
                    readOnly
                    onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f1`)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                />
            </td>
            {/* Nr Column: Left aligned to be close to checkbox */}
            <td className="px-0 py-1.5 font-mono text-gray-500 text-[10px] text-left pl-1 w-10 whitespace-nowrap align-middle">
                {doc.gruppe_nr}.{doc.dokument_nr}
            </td>
            <td className="px-2 py-1.5 w-52 align-middle overflow-hidden">
                <div className="font-medium text-gray-800 truncate text-[12px]" title={doc.titel || doc.filnavn || ''}>
                    {doc.titel || doc.filnavn || 'Uden navn'}
                </div>
            </td>
            <td className="px-2 py-1.5 w-20 relative align-middle">
                <SmartDateInput
                    id={`d-${doc.id}-f1`}
                    value={doc.dato_intern}
                    onSave={(val) => onInlineSave(doc.id, 'dato_intern', val)}
                    onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f2`)}
                    className={`w-full py-0.5 px-1 border border-slate-400 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${getDateColorClass(doc.dato_intern)} ${!doc.dato_intern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="px-2 py-1.5 w-20 relative align-middle">
                <SmartDateInput
                    id={`d-${doc.id}-f2`}
                    value={doc.dato_ekstern}
                    onSave={(val) => onInlineSave(doc.id, 'dato_ekstern', val)}
                    onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f3`)}
                    className={`w-full py-0.5 px-1 border border-slate-400 rounded-md text-[11px] bg-white focus:text-gray-700 focus:border-black focus:ring-0 ${getDateColorClass(doc.dato_ekstern)} ${!doc.dato_ekstern ? 'text-transparent hover:text-gray-400' : ''}`}
                />
            </td>
            <td className="px-0 py-1.5 w-20 relative align-middle">
                {/* Combined Meta Column: Info, Link, Comment, Template */}
                <div className="flex items-center justify-center gap-0.5 h-full">
                    {/* Slot 1: Skabelon Info */}
                    <div className="flex justify-center">
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
                    <div className="flex justify-center">
                        {doc.har_links && (
                            <Tooltip content="Vis linkede aktiviteter">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onLinkClick?.(doc); }}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    <LinkIcon size={14} />
                                </button>
                            </Tooltip>
                        )}
                        {!doc.har_links && processedLink ? (
                            <div className="relative group/extlink inline-block">
                                <a href={processedLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        ) : !doc.har_links && <div className="w-4 h-4" />}
                    </div>

                    {/* Slot 3: User Comment */}
                    <div className="flex justify-center">
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
                        <div className="flex justify-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSaveToTemplate(doc); }}
                                className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            >
                                <UploadCloud size={14} />
                            </button>
                        </div>
                    )}

                    {/* Slot 5: Action Menu Dropdown */}
                    <div className={`relative flex-shrink-0 ${isMenuOpen ? 'z-[60]' : 'z-10'}`} ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`p-1 rounded-md shadow-sm border transition-all ${isMenuOpen ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-white border-gray-200 hover:border-gray-300'}`}
                            title="Flere handlinger"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                            <div
                                className={`absolute right-0 ${isLast ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-amber-100 border-2 border-amber-400 rounded-lg shadow-2xl z-50 overflow-hidden`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        onCopy(doc);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-amber-950 hover:bg-amber-200 transition-colors group border-b border-amber-200"
                                >
                                    <Copy size={15} className="text-amber-700 group-hover:text-amber-900" />
                                    <span className="font-bold">Kopier linje</span>
                                </button>

                                {!doc.skabelon && (
                                    <>
                                        <button
                                            onClick={() => {
                                                onRenameLine?.(doc);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-amber-950 hover:bg-amber-200 transition-colors group border-b border-amber-200"
                                        >
                                            <Edit3 size={15} className="text-amber-700 group-hover:text-amber-900" />
                                            <span className="font-bold">Omdøb linje</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                onDeleteLine?.(doc.id);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-700 hover:bg-red-100 transition-colors group"
                                        >
                                            <Trash2 size={15} className="text-red-500 group-hover:text-red-700" />
                                            <span className="font-bold">Slet linje</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
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
                        id={`d-${doc.id}-f3`}
                        value={doc.status?.id || ''}
                        onChange={(e) => onInlineSave(doc.id, 'status_id', e.target.value === '' ? null : parseInt(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f4`)}
                        className={`flex-grow py-0.5 px-1 border rounded text-[12px] bg-transparent focus:border-black focus:ring-0 ${doc.status?.status_nummer === 80 ? 'border-green-200 text-green-800 font-medium' : 'border-slate-400'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Vælg...</option>
                        {statusser.filter((s: any) => s.aktiv || s.id === doc.status?.id).map((s: any) => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                    </select>
                </div>
            </td>
            <td className="px-2 py-1.5 w-auto relative align-middle overflow-hidden">
                {/* Fil Column */}
                <div className={`flex items-center gap-2 border rounded px-1 py-0.5 transition-all shadow-sm overflow-hidden
                    ${isDragActive ? 'border-blue-600 ring-2 ring-green-200 bg-green-100' : 'border-slate-400 hover:border-blue-400 bg-white'}
                `}>
                    <div className="flex-1 flex items-center min-w-0">
                        {isUploading ? (
                            <span className="flex items-center gap-2 text-blue-600 text-xs">
                                <Loader2 size={14} className="animate-spin" /> Uploader...
                            </span>
                        ) : doc.fil ? (
                            <div className="flex items-center justify-between w-full gap-1">
                                <button
                                    className="flex items-center gap-2 text-blue-600 hover:underline truncate group/link text-left"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            const res = await fetch(`${API_BASE_URL}/sager/sagsdokumenter/${doc.id}/open_file/`, { credentials: 'include' });
                                            if (!res.ok) {
                                                const text = await res.text().catch(() => '');
                                                alert(text || 'Filen kunne ikke åbnes. Prøv igen eller kontakt administrator.');
                                                return;
                                            }
                                            const blob = await res.blob();
                                            const contentType = res.headers.get('content-type') || 'application/octet-stream';
                                            const typedBlob = new Blob([blob], { type: contentType });
                                            const url = URL.createObjectURL(typedBlob);

                                            // Extract filename from Content-Disposition header
                                            const disposition = res.headers.get('content-disposition') || '';
                                            let filename = (doc.filnavn || 'dokument').trim();
                                            const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
                                            if (filenameMatch) {
                                                filename = decodeURIComponent(filenameMatch[1]);
                                            }

                                            // For browser-viewable types (PDF, images), open inline
                                            const inlineTypes = ['application/pdf', 'image/', 'text/'];
                                            const canInline = inlineTypes.some(t => contentType.startsWith(t));

                                            if (canInline) {
                                                window.open(url, '_blank');
                                            } else {
                                                // For non-viewable types, trigger a download with the correct filename
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = filename;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }

                                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                                        } catch {
                                            alert('Filen kunne ikke findes på serveren. Kontakt administrator.');
                                        }
                                    }}
                                >
                                    <FileText size={14} className="flex-shrink-0" />
                                    <span className="truncate text-xs font-medium">{doc.filnavn || 'Hent fil'}</span>
                                </button>
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
                                className="flex items-center gap-2 text-gray-500 text-[12px] cursor-pointer w-full"
                            >
                                <Upload size={14} />
                                <span className="truncate">{isDragActive ? 'Slip filen' : 'Klik / træk fil her'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Drag Overlay - Simple and Green */}
                {(isDragActive || isInternalDragOver) && (
                    <div
                        className="absolute inset-0 bg-green-200/95 flex items-center justify-center border-2 border-green-600 rounded z-20 p-2 overflow-hidden pointer-events-none"
                    >
                        <div className="flex items-center gap-2 text-green-900 font-bold text-[11px] text-center px-2">
                            <UploadCloud size={14} className="flex-shrink-0" />
                            <span>Slip filen for at tildele fra Stifinder til "{doc.titel || 'dokumentet'}"</span>
                        </div>
                    </div>
                )}

            </td>
            <td className="px-2 py-1.5 w-24 align-middle overflow-hidden">
                <select
                    value={doc.undermappe?.id || ''}
                    onChange={(e) => onInlineSave(doc.id, 'undermappe_id', e.target.value === '' ? null : parseInt(e.target.value))}
                    className={`w-full py-0.5 px-1 border rounded-md text-[10px] focus:border-black focus:ring-0 transition-colors ${doc.undermappe ? 'border-green-500 bg-green-50 text-green-800 font-medium' : 'border-slate-400 bg-white'}`}
                    title="Undermappe"
                >
                    <option value="">(Ingen)</option>
                    {standardMapper.filter(m => m.formaal === 'DOK').map(m => (
                        <option key={m.id} value={m.id}>
                            {m.navn}
                        </option>
                    ))}
                </select>
            </td>
            <td className="px-0 py-1.5 align-middle text-center w-8">
                <input
                    id={`d-${doc.id}-f4`}
                    type="checkbox"
                    checked={!!doc.skal_mailes}
                    onChange={(e) => onInlineSave(doc.id, 'skal_mailes', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 mt-1"
                    title="Vælg til næste mail"
                />
            </td>
            <td className="px-2 py-1.5 w-20 align-middle overflow-hidden">
                <select
                    id={`d-${doc.id}-f5`}
                    value={doc.informations_kilde?.id || ''}
                    onChange={(e) => onInlineSave(doc.id, 'informations_kilde_id', e.target.value === '' ? null : parseInt(e.target.value))}
                    onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f6`)}
                    className="w-full py-0.5 px-1 border border-slate-400 rounded-md text-[12px] bg-white focus:border-black focus:ring-0"
                >
                    <option value="">Ingen</option>
                    {informationsKilder.map(k => (
                        <option key={k.id} value={k.id}>
                            {k.navn}
                        </option>
                    ))}
                </select>
            </td>
            <td className="px-2 py-3 text-right w-8">
                {showDeleteConfirm && (
                    <ConfirmModal
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={confirmDelete}
                        title="Slet fil"
                        message={`Er du sikker på, at du vil slette filen "${doc.filnavn}"?`}
                        confirmText="Slet fil"
                        cancelText="Annuller"
                        isDestructive={true}
                    />
                )}
            </td>
        </tr>
    );
});

export default DokumentRow;
