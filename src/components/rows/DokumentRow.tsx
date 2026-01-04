
import React, { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, FileText, UploadCloud, CheckCircle2, Trash2, Info, MessageSquare, Pencil, Upload, ExternalLink, Link as LinkIcon } from 'lucide-react';
import Tooltip from '../Tooltip';
import SmartDateInput from '../SmartDateInput';
import { SagsDokument, Sag, User, InformationsKilde } from '../../types';

interface DokumentRowProps {
    doc: SagsDokument;
    sag: Sag;
    colleagues: User[];
    onUpload: (docId: number, file: File) => Promise<void>;
    onDelete: (docId: number) => Promise<void>;
    onEditComment: (doc: SagsDokument) => void;
    onRename: (doc: SagsDokument) => void;
    onInlineSave: (docId: number, field: string, value: any) => Promise<void>;
    onSaveToTemplate: (doc: SagsDokument) => void;
    statusser: any[];
    onStatusToggle: (doc: SagsDokument) => void;
    onLinkClick?: (doc: SagsDokument) => void; // @# New Prop
    informationsKilder: InformationsKilde[];
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
    statusser,
    onStatusToggle,
    onLinkClick, // @# New Prop
    informationsKilder,
    isActive,
    onFocus,
    onBlur
}: DokumentRowProps) {
    const isDone = doc.status?.status_nummer === 80;

    const getDateColorClass = (dateStr: string | null) => {
        if (!dateStr || isDone) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
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
        <tr
            {...getRootProps()}
            className={`group transition-colors relative ${isDragActive ? 'bg-blue-50 ring-2 ring-blue-400 z-10' : ''} ${isActive ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}
            style={isActive ? { boxShadow: 'inset 0 -2px 0 0 #ef4444' } : {}}
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
                        id={`d-${doc.id}-f3`}
                        value={doc.status?.id || ''}
                        onChange={(e) => onInlineSave(doc.id, 'status_id', e.target.value === '' ? null : parseInt(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f4`)}
                        className={`flex-grow h-7 py-0 px-1 border rounded text-[12px] bg-transparent focus:border-black focus:ring-0 ${doc.status?.status_nummer === 80 ? 'border-green-200 text-green-800 font-medium' : 'border-slate-400'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Vælg...</option>
                        {statusser.map((s: any) => <option key={s.id} value={s.id}>{s.status_nummer} - {s.beskrivelse}</option>)}
                    </select>
                </div>
            </td>
            <td className="px-2 py-1.5 w-auto relative align-middle overflow-hidden">
                {/* Fil Column */}
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
                                className="flex items-center gap-2 text-gray-500 text-[12px] cursor-pointer w-full"
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
            <td className="px-0 py-1.5 align-middle text-center w-8">
                <input
                    id={`d-${doc.id}-f4`}
                    type="checkbox"
                    checked={!!doc.skal_mailes}
                    onChange={(e) => onInlineSave(doc.id, 'skal_mailes', e.target.checked)}
                    onKeyDown={(e) => handleKeyDown(e, `d-${doc.id}-f5`)}
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
            <td className="px-2 py-1.5 w-24 align-middle overflow-hidden">
                <select
                    id={`d-${doc.id}-f6`}
                    value={doc.ansvarlig || ''}
                    onChange={(e) => onInlineSave(doc.id, 'ansvarlig', e.target.value === '' ? null : parseInt(e.target.value))}
                    className="w-full py-0.5 px-1 border border-slate-400 rounded-md text-[12px] bg-white focus:border-black focus:ring-0"
                >
                    <option value="">Alle</option>
                    {colleagues.map(user => (
                        <option key={user.id} value={user.id}>{user.first_name || user.username}</option>
                    ))}
                </select>
            </td>
            <td className="px-2 py-3 text-right w-8">
            </td>
        </tr>
    );
});

export default DokumentRow;
