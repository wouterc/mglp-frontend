
import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { Mail, Search, Paperclip, Calendar, User, FileText, ChevronRight, X, Loader2, Inbox, Sparkles, Check, MessageSquare, Save, ChevronDown, ChevronUp, File } from 'lucide-react';
import { SagsDokument, IncomingEmail, IncomingEmailDetail, Attachment } from '../types';
import { DokumentService } from '../services/DokumentService';
import { MailService } from '../services/MailService';
import { SagService } from '../services/SagService';


import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import { useAppState } from '../StateContext';
import CaseSelector from '../components/ui/CaseSelector';
import HelpButton from '../components/ui/HelpButton';



interface SagsMailPageProps {
    sagId: number | null;
}

export default function SagsMailPage({ sagId }: SagsMailPageProps) {
    const { state, dispatch } = useAppState();
    const { valgtSag } = state;

    const [emails, setEmails] = useState<IncomingEmail[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<IncomingEmailDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [showOnlyUnhandled, setShowOnlyUnhandled] = useState(false);
    const [showOnlyImportantComments, setShowOnlyImportantComments] = useState(false);

    // Comment Modal State
    const [editingEmail, setEditingEmail] = useState<IncomingEmail | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [editCommentImportant, setEditCommentImportant] = useState(false);
    const [isSavingComment, setIsSavingComment] = useState(false);


    // Fetch emails linked to this case
    useEffect(() => {
        const fetchEmails = async () => {
            if (!sagId) {
                setEmails([]);
                setSelectedEmail(null);
                setSagsDokumenter([]);
                return;
            }

            setIsLoading(true);
            try {
                const emails = await MailService.getEmailsForSag(sagId);
                setEmails(emails);
                setSelectedEmail(null);
            } catch (e) {
                console.error("Failed to load case emails", e);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchDocs = async () => {
            if (!sagId) return;
            setLoadingDocs(true);
            try {
                const data = await DokumentService.getDokumenter(sagId);
                setSagsDokumenter(data);
            } catch (e) {
                console.error("Failed to fetch docs", e);
            } finally {
                setLoadingDocs(false);
            }
        };

        fetchEmails();
        fetchDocs();
    }, [sagId]);

    const refreshDocs = async () => {
        if (!sagId) return;
        try {
            const data = await DokumentService.getDokumenter(sagId);
            setSagsDokumenter(data);
        } catch (e) { console.error(e); }
    };

    // Document Logic
    const [showDocPanel, setShowDocPanel] = useState(false);
    const [sagsDokumenter, setSagsDokumenter] = useState<SagsDokument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docSearch, setDocSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Drag/Drop visual states
    const [dragOverDocId, setDragOverDocId] = useState<number | null>(null);
    const [processingDocId, setProcessingDocId] = useState<number | null>(null);

    // Helper to find linked document info
    const getLinkedDocInfo = (docId: number) => {
        const doc = sagsDokumenter.find(d => d.id === docId);
        if (doc) {
            return `${doc.gruppe_navn || 'Dokument'} - ${doc.titel || doc.filnavn}`;
        }
        return "Tilknyttet dokument";
    };

    const groupedDocs = useMemo(() => {
        const groups: Record<string, { nr: number, docs: SagsDokument[] }> = {};
        let filtered = sagsDokumenter;

        if (docSearch) {
            const low = docSearch.toLowerCase();
            filtered = filtered.filter(d =>
                (d.titel && d.titel.toLowerCase().includes(low)) ||
                (d.filnavn && d.filnavn.toLowerCase().includes(low))
            );
        }

        filtered.forEach(d => {
            const gName = d.gruppe_navn || 'Andre';
            if (!groups[gName]) {
                groups[gName] = { nr: d.gruppe_nr || 9999, docs: [] };
            }
            groups[gName].docs.push(d);
        });

        // Sort groups and docs
        const result = Object.entries(groups).map(([name, data]) => ({
            name,
            nr: data.nr,
            docs: data.docs.sort((a, b) => (a.dokument_nr || 0) - (b.dokument_nr || 0))
        })).sort((a, b) => a.nr - b.nr);

        return result;
    }, [sagsDokumenter, docSearch]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, att: Attachment) => {
        e.dataTransfer.setData('attachmentId', att.id.toString());
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOverDoc = (e: React.DragEvent, docId: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (dragOverDocId !== docId) {
            setDragOverDocId(docId);
        }
    };

    const handleDragLeaveTable = () => {
        setDragOverDocId(null);
    };

    const handleDropOnDoc = async (e: React.DragEvent, doc: SagsDokument) => {
        e.preventDefault();
        setDragOverDocId(null);

        const attIdStr = e.dataTransfer.getData('attachmentId');
        if (!attIdStr) return;

        const attId = parseInt(attIdStr);
        if (isNaN(attId)) return;

        setProcessingDocId(doc.id);
        setProcessingDocId(doc.id);
        try {
            await MailService.attachEmailFileToDoc(doc.id, attId);
            // Refresh
            await refreshDocs();
            // Also refresh email detail to update 'saved_document_id' on attachments
            if (selectedEmail) {
                const detail = await MailService.getEmailDetail(selectedEmail.id);
                setSelectedEmail(detail);
            }
        } catch (error) {
            console.error("Failed to attach file", error);
            alert("Fejl ved tildeling af fil.");
        } finally {
            setProcessingDocId(null);
        }
    };

    const handleEmailClick = async (email: IncomingEmail) => {
        setIsLoadingDetail(true);
        try {
            const detail = await MailService.getEmailDetail(email.id);
            setSelectedEmail(detail);
        } catch (e) {
            console.error("Failed to fetch detail", e);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return d.toLocaleString('da-DK', isToday ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('da-DK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleSelectSag = async (id: number) => {
        try {
            const fuldSag = await SagService.getSag(id);
            dispatch({ type: 'SET_VALGT_SAG', payload: fuldSag });
        } catch (e) { console.error(e); }
    };

    const handleToggleHandled = async (e: React.MouseEvent, emailId: number) => {
        e.stopPropagation();
        try {
            await MailService.toggleHandled(emailId);
            // Update local state
            setEmails(prev => prev.map(em => em.id === emailId ? { ...em, is_handled: !em.is_handled } : em));
        } catch (err) {
            console.error("Failed to toggle handled", err);
        }
    };

    const openCommentModal = (e: React.MouseEvent, email: IncomingEmail) => {
        e.stopPropagation();
        setEditingEmail(email);
        setEditCommentText(email.kommentar || '');
        setEditCommentImportant(email.kommentar_vigtig || false);
    };

    const handleSaveCommentFromModal = async () => {
        if (!editingEmail) return;
        setIsSavingComment(true);
        try {
            const res = await MailService.addComment(editingEmail.id, editCommentText, editCommentImportant);
            // Update local state
            const updatedComment = res.kommentar;
            const updatedImportant = res.kommentar_vigtig;

            setEmails(prev => prev.map(em => em.id === editingEmail.id ? { ...em, kommentar: updatedComment, kommentar_vigtig: updatedImportant } : em));

            if (selectedEmail?.id === editingEmail.id) {
                setSelectedEmail(prev => prev ? { ...prev, kommentar: updatedComment, kommentar_vigtig: updatedImportant } : null);
            }
            setEditingEmail(null);
        } catch (e) {
            console.error("Fejl ved gemning af kommentar", e);
            alert("Kunne ikke gemme kommentar.");
        } finally {
            setIsSavingComment(false);
        }
    };

    const filteredEmails = useMemo(() => {
        let result = emails;

        if (showOnlyUnhandled) {
            result = result.filter(e => !e.is_handled);
        }
        if (showOnlyImportantComments) {
            result = result.filter(e => e.kommentar_vigtig);
        }

        if (searchText) {
            const lowSearch = searchText.toLowerCase();
            result = result.filter(e =>
                e.subject.toLowerCase().includes(lowSearch) ||
                e.sender.toLowerCase().includes(lowSearch) ||
                e.body_preview.toLowerCase().includes(lowSearch)
            );
        }
        return result;
    }, [emails, searchText, showOnlyUnhandled, showOnlyImportantComments]);

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* List Column */}
            <div className="w-[350px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden">
                {/* Header with Search and Case Info */}
                <div className="p-4 border-b border-gray-200 space-y-3 shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center">
                            <Inbox size={18} className="mr-2 text-blue-600" />
                            Sags Mail
                            <HelpButton helpPointCode="SAGSMAIL_HELP" className="ml-2" />
                        </h2>
                    </div>

                    <CaseSelector
                        value={sagId}
                        onChange={handleSelectSag}
                        label={valgtSag && valgtSag.id === sagId ? `${valgtSag.sags_nr}${valgtSag.alias ? ' - ' + valgtSag.alias : ''}` : undefined}
                    />

                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                id="sagsmail-search-input"
                                name="sagsmail-search-input"
                                type="text"
                                placeholder="Søg i mail..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                aria-label="Søg i mail"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowOnlyUnhandled(!showOnlyUnhandled)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${showOnlyUnhandled ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                title="Vis kun ubehandlede mails"
                            >
                                <div className={`w-2 h-2 rounded-full ${showOnlyUnhandled ? 'bg-red-500' : 'bg-red-500'}`} />
                                Ubehandlet
                            </button>

                            <button
                                onClick={() => setShowOnlyImportantComments(!showOnlyImportantComments)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${showOnlyImportantComments ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                title="Vis kun mails med vigtige kommentarer"
                            >
                                <MessageSquare size={10} className={showOnlyImportantComments ? "text-red-500 fill-current" : "text-gray-400"} />
                                Vigtig info
                            </button>
                        </div>
                    </div>
                </div>

                {/* Email List Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center">
                            <Loader2 size={24} className="animate-spin mb-2 text-blue-500" />
                            Henter e-mails...
                        </div>
                    ) : !sagId ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                            Vælg en sag for at se tilknyttede e-mails.
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                            Ingen e-mails fundet for denne sag.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredEmails.map(email => (
                                <div
                                    key={email.id}
                                    onClick={() => handleEmailClick(email)}
                                    className={`cursor-pointer px-4 py-3 hover:bg-white transition-colors border-l-4 ${selectedEmail?.id === email.id ? 'bg-white border-blue-500 shadow-sm z-10' : 'border-transparent'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center flex-1 min-w-0 mr-2">
                                            <div
                                                onClick={(e) => handleToggleHandled(e, email.id)}
                                                className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 border cursor-pointer hover:scale-110 transition-transform ${!email.is_handled ? 'bg-red-500 border-red-500 hover:bg-red-600' : 'bg-transparent border-gray-300 hover:border-gray-400'}`}
                                                title={!email.is_handled ? "Marker som behandlet" : "Marker som ubehandlet"}
                                            />
                                            <h3 className={`text-xs truncate ${!email.is_handled ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}`}>
                                                {email.sender}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Tooltip content={email.kommentar || "Tilføj kommentar"}>
                                                <button
                                                    onClick={(e) => openCommentModal(e, email)}
                                                    className={`p-0.5 rounded transition-colors ${email.kommentar_vigtig ? 'text-red-500' : email.kommentar ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                                                >
                                                    <MessageSquare size={12} fill={email.kommentar ? "currentColor" : "none"} />
                                                </button>
                                            </Tooltip>
                                            {email.has_attachments && <Paperclip size={12} className="text-gray-400" />}
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-1">{formatDate(email.received_at)}</span>
                                        </div>
                                    </div>
                                    <h4 className="text-xs mb-1 truncate text-blue-800 font-medium">
                                        {email.subject}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                        {email.body_preview}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white flex flex-col overflow-hidden h-full">
                {selectedEmail ? (
                    <div className="flex h-full overflow-hidden">
                        {/* 1. Email Detail Panel */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-200 min-w-[400px]">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-gray-100 shrink-0 bg-white shadow-sm z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedEmail.subject}</h2>
                                    <Tooltip content={selectedEmail.kommentar || "Tilføj kommentar"}>
                                        <button
                                            onClick={(e) => openCommentModal(e, selectedEmail)}
                                            className={`p-1 rounded transition-colors ${selectedEmail.kommentar_vigtig ? 'text-red-500' : selectedEmail.kommentar ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
                                        >
                                            <MessageSquare size={16} fill={selectedEmail.kommentar ? "currentColor" : "none"} />
                                        </button>
                                    </Tooltip>

                                    <div className="ml-auto">
                                        <button
                                            onClick={() => setShowDocPanel(!showDocPanel)}
                                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${showDocPanel
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                                }`}
                                        >
                                            <FileText size={14} />
                                            {showDocPanel ? 'Skjul dokumenter' : 'Link bilag'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-4 flex-shrink-0 uppercase">
                                        {selectedEmail.sender ? selectedEmail.sender.charAt(0) : '?'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-900 truncate">{selectedEmail.sender}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{formatFullDate(selectedEmail.received_at)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Bar */}
                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-2 items-center">
                                    {selectedEmail.attachments.filter(a => !a.is_inline || !/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(a.filename)).length > 0 ? (
                                        selectedEmail.attachments.filter(a => !a.is_inline || !/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(a.filename)).map(att => {
                                            const linkedInfo = att.saved_document_id ? getLinkedDocInfo(att.saved_document_id) : null;
                                            return (
                                                <div
                                                    key={att.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        MailService.downloadAttachment(att.id);
                                                    }}
                                                    draggable={true}
                                                    onDragStart={(e) => handleDragStart(e, att)}
                                                    className={`group flex items-center border rounded px-3 py-1.5 text-xs transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${att.saved_document_id ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'}`}
                                                    title={linkedInfo ? `Gemt som: ${linkedInfo}` : `Træk denne fil til højre for at journalisere, eller klik for at åbne`}
                                                >
                                                    {att.saved_document_id ? <Check size={14} className="mr-2 text-green-600" /> : <Paperclip size={14} className="mr-2 text-gray-400 group-hover:text-blue-500" />}
                                                    <div className="flex flex-col max-w-[200px]">
                                                        <span className="truncate font-medium">{att.filename}</span>
                                                        {linkedInfo && <span className="text-[9px] opacity-75 truncate">{linkedInfo}</span>}
                                                    </div>
                                                    <span className="opacity-60 ml-1.5 group-hover:opacity-100 flex-shrink-0">({Math.round(att.file_size / 1024)} KB)</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Ingen downloadbare filer (kun inline billeder)</span>
                                    )}

                                    {selectedEmail.attachments.some(a => a.is_inline && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(a.filename)) && (
                                        <div className="text-[10px] text-gray-400 flex items-center px-2 py-1 ml-auto">
                                            (+ {selectedEmail.attachments.filter(a => a.is_inline && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(a.filename)).length} indlejrede billeder skjult)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Email Content Container */}
                            <div className="flex-1 overflow-y-auto p-8 bg-white selection:bg-blue-100">
                                {isLoadingDetail ? (
                                    <div className="flex justify-center items-center py-12">
                                        <Loader2 size={32} className="animate-spin text-blue-500 opacity-50" />
                                    </div>
                                ) : (
                                    <div className="max-w-3xl mx-auto text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                                        {selectedEmail.body_text}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Documents Panel (Right/Bottom) */}
                        {showDocPanel && (
                            <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden border-l border-gray-200 min-w-[300px] animate-in slide-in-from-right-10 duration-200">
                                {/* Doc Header */}
                                <div className="p-3 border-b border-gray-200 bg-gray-100 flex justify-between items-center shrink-0">
                                    <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                        <FileText size={16} /> Documents
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-40">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                            <input
                                                id="sagsmail-doc-search-input"
                                                name="sagsmail-doc-search-input"
                                                type="text"
                                                placeholder="Søg dok..."
                                                value={docSearch}
                                                onChange={e => setDocSearch(e.target.value)}
                                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                aria-label="Søg efter dokument"
                                            />
                                        </div>
                                        <button onClick={() => setShowDocPanel(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                                    </div>
                                </div>

                                {/* Doc List */}
                                <div className="flex-1 overflow-y-auto bg-white">
                                    {loadingDocs ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : (
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-800 text-white font-semibold sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-2 py-2 w-8">Akt</th>
                                                    <th className="px-1 py-2 w-10">Nr</th>
                                                    <th className="px-2 py-2">Dokument</th>
                                                    <th className="px-2 py-2 w-8">Fil</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {groupedDocs.map(group => (
                                                    <React.Fragment key={group.name}>
                                                        <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={() => toggleGroup(group.name)}>
                                                            <td colSpan={4} className="px-2 py-1.5 font-bold text-gray-700 flex items-center gap-1">
                                                                {expandedGroups[group.name] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                {group.nr} - {group.name}
                                                                <span className="text-gray-400 font-normal ml-1">({group.docs.length})</span>
                                                            </td>
                                                        </tr>
                                                        {!expandedGroups[group.name] && group.docs.map(doc => (
                                                            <tr
                                                                key={doc.id}
                                                                className={`transition-colors border-b border-gray-100 ${dragOverDocId === doc.id
                                                                    ? 'bg-blue-100 ring-2 ring-inset ring-blue-500 z-10'
                                                                    : doc.fil
                                                                        ? 'bg-white hover:bg-gray-50'
                                                                        : 'bg-gray-50/50 hover:bg-gray-100'
                                                                    }`}
                                                                onDragOver={(e) => handleDragOverDoc(e, doc.id)}
                                                                onDrop={(e) => handleDropOnDoc(e, doc)}
                                                            >
                                                                <td className="px-2 py-1.5 align-middle">
                                                                    {processingDocId === doc.id ? (
                                                                        <Loader2 size={14} className="animate-spin text-blue-600" />
                                                                    ) : (
                                                                        <input type="checkbox" checked={doc.aktiv} readOnly className="rounded text-blue-600 focus:ring-blue-500" />
                                                                    )}
                                                                </td>
                                                                <td className="px-1 py-1.5 text-gray-500 font-mono align-middle">
                                                                    {doc.gruppe_nr}.{doc.dokument_nr}
                                                                </td>
                                                                <td className="px-2 py-1.5 align-middle">
                                                                    <div className="truncate max-w-[150px] font-medium text-gray-800" title={doc.titel || ''}>
                                                                        {doc.titel || 'Uden titel'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1.5 align-middle">
                                                                    {doc.fil ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                DokumentService.openDokument(doc.id);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                            title={doc.filnavn || 'Fil'}
                                                                        >
                                                                            <FileText size={14} />
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-4 h-4 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300" title="Træk fil her">
                                                                            <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-gray-200 bg-gray-50">
                        <div className="p-8 rounded-full bg-white shadow-sm border border-gray-100 mb-4">
                            <Mail size={48} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Vælg en e-mail for at se indholdet</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!editingEmail}
                onClose={() => setEditingEmail(null)}
                title="Rediger kommentar"
                maxWidth="max-w-lg"
                headerActions={
                    <button
                        onClick={handleSaveCommentFromModal}
                        disabled={isSavingComment}
                        className={`p-2 rounded-full text-white transition-all shadow-md active:scale-95 disabled:opacity-30 bg-blue-600 hover:bg-blue-700`}
                        title="Gem"
                    >
                        {isSavingComment ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    </button>
                }
            >
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Kommentar til email "{editingEmail?.subject}"
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                            <input
                                id="edit-mail-comment-important"
                                name="edit-mail-comment-important"
                                type="checkbox"
                                checked={editCommentImportant}
                                onChange={(e) => setEditCommentImportant(e.target.checked)}
                                className="rounded text-red-600 focus:ring-red-500"
                                aria-label="Marker som vigtig"
                            />
                            <span className={editCommentImportant ? "font-bold text-red-600" : ""}>Vigtig / Obs</span>
                        </label>
                    </div>
                    <textarea
                        id="edit-mail-comment-textarea"
                        name="edit-mail-comment-textarea"
                        autoFocus
                        rows={6}
                        className={`w-full border rounded-md shadow-sm p-2 text-sm placeholder-gray-400 outline-none transition-all ${editCommentImportant ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        placeholder="Skriv din kommentar her..."
                        aria-label="Kommentar tekst"
                    />
                </div>
            </Modal>
        </div>
    );
}

