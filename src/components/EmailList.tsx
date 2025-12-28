
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { API_BASE_URL } from '../config';
import { Mail, Search, Paperclip, Calendar, User, FileText, ChevronRight, X, Filter, ListFilter, Check, Sparkles } from 'lucide-react';

interface IncomingEmail {
    id: number;
    subject: string;
    sender: string;
    received_at: string;
    status: string;
    body_preview: string;
    linked_case?: {
        sags_nr: string | number;
        alias: string;
        adresse: string;
    } | null;
    suggested_case?: {
        id: number;
        sags_nr: string | number;
        alias: string;
        adresse: string;
    } | null;
}

interface Attachment {
    id: number;
    filename: string;
    file_size: number;
    is_inline: boolean;
    saved_document_id?: number;
}

interface IncomingEmailDetail extends IncomingEmail {
    body_text: string;
    sender_email: string;
    attachments: Attachment[];
}

interface EmailListProps {
    accountId: number;
    hideReadingPane?: boolean;
    onUnlink?: (emailId: number) => void;
    // New props for selection
    selectedEmailIds?: number[];
    onToggleSelection?: (id: number, selected: boolean) => void;
    onAcceptSuggestion?: (emailId: number, sagId: number) => void;
}

export default function EmailList({ accountId, hideReadingPane, onUnlink, selectedEmailIds = [], onToggleSelection, onAcceptSuggestion }: EmailListProps) {
    const [emails, setEmails] = useState<IncomingEmail[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<IncomingEmailDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'new' | 'suggested'>('all');

    useEffect(() => {
        const fetchEmails = async () => {
            setIsLoading(true);
            try {
                const data = await api.get<{ emails: IncomingEmail[] }>(`/emails/account/${accountId}/messages/`);
                setEmails(data.emails);
                setSelectedEmail(null);
            } catch (e) {
                console.error("Failed to load emails", e);
            } finally {
                setIsLoading(false);
            }
        };

        if (accountId) {
            fetchEmails();
        }
    }, [accountId]);

    const handleEmailClick = async (email: IncomingEmail) => {
        setIsLoadingDetail(true);
        // Optimistic UI for selection
        // We set basic info first, then fetch full detail
        try {
            const detail = await api.get<IncomingEmailDetail>(`/emails/message/${email.id}/`);
            setSelectedEmail(detail);
        } catch (e) {
            console.error("Failed to fetch detail", e);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!window.confirm("Vil du slette denne fil?")) return;
        try {
            await api.delete(`/emails/attachment/${attId}/delete/`);
            setSelectedEmail(prev => prev ? {
                ...prev,
                attachments: prev.attachments.filter(a => a.id !== attId)
            } : null);
        } catch (e) {
            console.error("Fejl ved sletning", e);
            alert("Kunne ikke slette filen.");
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

    const filteredEmails = emails.filter(e => {
        if (filterType === 'new') return !e.linked_case;
        if (filterType === 'suggested') return !e.linked_case && e.suggested_case;
        return true;
    });

    return (
        <div className="flex h-full border-t border-gray-200">
            {/* List Column */}
            <div className={`${hideReadingPane ? 'w-full' : 'w-[350px]'} flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col ${selectedEmail && !hideReadingPane ? 'hidden md:flex' : 'flex'}`}>
                {/* Filter Toolbar */}
                <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex bg-gray-200/60 rounded-md p-0.5 w-full space-x-0.5">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`flex-1 text-[10px] font-medium py-1 rounded-sm transition-all ${filterType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Alle
                        </button>
                        <button
                            onClick={() => setFilterType('new')}
                            className={`flex-1 text-[10px] font-medium py-1 rounded-sm transition-all ${filterType === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ny
                        </button>
                        <button
                            onClick={() => setFilterType('suggested')}
                            className={`flex-1 text-[10px] font-medium py-1 rounded-sm transition-all ${filterType === 'suggested' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Foreslået
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-4 text-center text-xs text-gray-400">Henter emails...</div>
                ) : filteredEmails.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                        {filterType === 'new' ? 'Alle mails er journaliseret.' : 'Ingen emails fundet for denne konto.'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredEmails.map(email => {
                            const isSelected = selectedEmailIds.includes(email.id);
                            return (
                                <div
                                    key={email.id}
                                    onClick={() => {
                                        if (hideReadingPane && onToggleSelection) {
                                            onToggleSelection(email.id, !isSelected);
                                        } else {
                                            handleEmailClick(email);
                                        }
                                    }}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("emailId", email.id.toString());
                                        e.dataTransfer.effectAllowed = "copy";
                                    }}
                                    className={`cursor-pointer px-3 py-2 hover:bg-blue-50 transition-colors border-l-4 ${selectedEmail?.id === email.id && !hideReadingPane ? 'bg-blue-50 border-blue-500' :
                                        isSelected ? 'bg-blue-100/50 border-blue-500' : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <div className="flex items-center min-w-0 flex-1">
                                            {/* Selection Checkbox */}
                                            {onToggleSelection && (
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); onToggleSelection(email.id, !isSelected); }}
                                                    className={`mr-2 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500 bg-white hover:border-blue-400'}`}
                                                >
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                                </div>
                                            )}
                                            <h3 className={`text-xs truncate mr-2 ${email.status === 'New' ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {email.sender}
                                            </h3>
                                        </div>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">{formatDate(email.received_at)}</span>
                                    </div>

                                    <div className={`${onToggleSelection ? 'pl-6' : ''}`}>
                                        <h4 className={`text-xs mb-0.5 truncate ${email.status === 'New' ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>
                                            {email.subject}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                                            {email.body_preview}
                                        </p>

                                        {email.linked_case && (
                                            <div className="mt-1 flex items-center">
                                                <div className="flex flex-1 items-center bg-blue-50 text-blue-800 border border-blue-100 rounded text-[10px] px-2 py-0.5 relative group/badge">
                                                    <FileText size={10} className="mr-1.5 flex-shrink-0 text-blue-600" />
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="flex items-baseline space-x-1">
                                                            <span className="font-semibold block truncate">Sag: {email.linked_case.sags_nr}</span>
                                                            {email.linked_case.alias && <span className="truncate opacity-80 text-[9px]">- {email.linked_case.alias}</span>}
                                                        </div>
                                                    </div>
                                                    {onUnlink && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onUnlink(email.id);
                                                            }}
                                                            className="ml-auto p-0.5 hover:bg-white hover:text-red-500 rounded-full transition-colors opacity-0 group-hover/badge:opacity-100 focus:opacity-100"
                                                            title="Fjern tilknytning"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggested Case Badge (Only if not linked AND has suggestion) */}
                                        {!email.linked_case && email.suggested_case && (
                                            <div className="mt-1 flex items-center">
                                                <div className="flex flex-1 items-center bg-amber-100 text-amber-900 border-2 border-amber-400 rounded text-[10px] px-2 py-1 relative group/badge animate-in fade-in slide-in-from-left-1 duration-300 shadow-sm">
                                                    <Sparkles size={10} className="mr-1.5 flex-shrink-0 text-amber-600" />
                                                    <div className="flex flex-col min-w-0 mr-2">
                                                        <div className="flex items-baseline space-x-1">
                                                            <span className="font-semibold block truncate">Forslag: Sag {email.suggested_case.sags_nr}</span>
                                                        </div>
                                                        <span className="truncate opacity-80 text-[9px]">{email.suggested_case.alias || email.suggested_case.adresse}</span>
                                                    </div>
                                                    {onAcceptSuggestion && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAcceptSuggestion(email.id, email.suggested_case!.id);
                                                            }}
                                                            className="ml-auto p-1 bg-white hover:bg-green-50 hover:text-green-600 hover:border-green-200 border border-transparent rounded-full transition-all shadow-sm cursor-pointer"
                                                            title="Godkend forslag"
                                                        >
                                                            <Check size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Reading Pane */}
            {!hideReadingPane && (
                <div className={`flex-1 bg-white flex flex-col ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
                    {selectedEmail ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 bg-white">
                                <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedEmail.subject}</h2>
                                <div className="flex items-center text-xs text-gray-600 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3 flex-shrink-0 uppercase">
                                        {selectedEmail.sender ? selectedEmail.sender.charAt(0) : '?'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">{selectedEmail.sender}</div>
                                        <div className="text-gray-400">{formatFullDate(selectedEmail.received_at)}</div>
                                    </div>
                                </div>
                            </div>



                            <div className="flex-1 overflow-y-auto">
                                {/* Attachments */}
                                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                    <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-2 sticky top-0 z-10">
                                        {selectedEmail.attachments.map(att => (
                                            !att.is_inline && (
                                                <div key={att.id} className="flex items-center bg-white border border-gray-200 rounded px-2 py-1 text-xs group hover:border-blue-300 transition-colors shadow-sm">
                                                    <Paperclip size={12} className="text-gray-400 mr-2" />
                                                    <a
                                                        href={`${API_BASE_URL}/emails/attachment/${att.id}/`}
                                                        target="_blank" rel="noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline mr-2 truncate max-w-[200px]"
                                                        title={att.filename}
                                                    >
                                                        {att.filename}
                                                    </a>
                                                    <span className="text-gray-400 mr-2 text-[10px]">
                                                        {Math.round(att.file_size / 1024)} KB
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100"
                                                        title="Slet vedhæftning"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}

                                {/* Body */}
                                <div className="p-6 bg-white text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                                    {selectedEmail.body_text}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-gray-300">
                            <Mail size={64} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Vælg en email for at læse den</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
