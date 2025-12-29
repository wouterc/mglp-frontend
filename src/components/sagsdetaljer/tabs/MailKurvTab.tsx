import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../../api';
import { Sag, Aktivitet, SagsDokument, InformationsKilde, OutgoingEmail } from '../../../types';
import { useAppState } from '../../../StateContext';
import { Loader2, Copy, Trash2, Mail, FileText, CheckSquare, RefreshCw, GripVertical, ExternalLink, RotateCcw, CheckCircle } from 'lucide-react';
import Tooltip from '../../Tooltip';
import CopySuccessModal from '../../ui/CopySuccessModal';
import MailPreparationModal from '../../MailPreparationModal';
import ConfirmModal from '../../ui/ConfirmModal';

interface MailKurvTabProps {
    sag: Sag | null;
    onUpdate?: () => void;
}

interface GroupedBasket {
    kildeNavn: string;
    kildeId: number | null;
    aktiviteter: Aktivitet[];
    dokumenter: SagsDokument[];
}

export default function MailKurvTab({ sag, onUpdate }: MailKurvTabProps) {
    const { state, dispatch } = useAppState();

    const [loading, setLoading] = useState(false);
    const [aktiviteter, setAktiviteter] = useState<Aktivitet[]>([]);
    const [dokumenter, setDokumenter] = useState<SagsDokument[]>([]);
    const [informationsKilder, setInformationsKilder] = useState<InformationsKilde[]>([]);
    const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
    const [outgoingEmails, setOutgoingEmails] = useState<OutgoingEmail[]>([]);

    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copyModalTitle, setCopyModalTitle] = useState('');
    const [copyModalText, setCopyModalText] = useState('');

    // DnD State
    const [draggedItem, setDraggedItem] = useState<{ type: 'aktivitet' | 'dokument', id: number } | null>(null);
    const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

    // Preparation Modal State
    const [prepModalOpen, setPrepModalOpen] = useState(false);
    const [prepInitialSource, setPrepInitialSource] = useState<number | null>(null);
    const [prepOpgaveText, setPrepOpgaveText] = useState("");

    // Confirmation State
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        // Fetch source options
        api.get<InformationsKilde[]>('/kerne/informationskilder/')
            .then(setInformationsKilder)
            .catch(err => console.error("Could not fetch sources", err));
    }, []);

    const fetchData = async (force = false) => {
        if (!sag) return;

        // Use cache if available and not forcing refresh
        if (!force && state.mailBasketCache && state.mailBasketCache[sag.id]) {
            const cache = state.mailBasketCache[sag.id];
            setAktiviteter(cache.aktiviteter);
            setDokumenter(cache.dokumenter);
            return;
        }

        setLoading(true);
        try {
            // Fetch only items that are marked for mailing
            const aktData = await api.get<Aktivitet[]>(`/aktiviteter/all/?sag=${sag.id}&skal_mailes=true`);
            const dokData = await api.get<SagsDokument[]>(`/sager/sagsdokumenter/?sag_id=${sag.id}&skal_mailes=true`);

            setAktiviteter(aktData);
            setDokumenter(dokData);

            // Update Cache
            dispatch({
                type: 'SET_MAIL_BASKET_CACHE',
                payload: {
                    sagId: sag.id,
                    data: {
                        aktiviteter: aktData,
                        dokumenter: dokData,
                        timestamp: Date.now()
                    }
                }
            });
        } catch (error) {
            console.error("Fejl ved hentning af mailkurv:", error);
        } finally {
            setLoading(false);
        }

        // Fetch recent outgoing emails for this case
        fetchOutgoing();
    };

    const fetchOutgoing = async () => {
        if (!sag) return;
        try {
            const data = await api.get<OutgoingEmail[]>(`/emails/outgoing/?sag=${sag.id}&limit=5`);
            setOutgoingEmails(data);
        } catch (err) {
            console.error("Failed to fetch outgoing emails", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [sag?.id]);

    const handleReset = async () => {
        if (!sag) return;
        setShowResetConfirm(true);
    };

    const confirmReset = async () => {
        if (!sag) return;
        try {
            setLoading(true);
            await api.post(`/sager/${sag.id}/reset_mail_basket/`);
            await fetchData(true);
            if (onUpdate) onUpdate();
        } catch (error) {
            alert("Kunne ikke nulstille kurv.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (type: 'aktivitet' | 'dokument', id: number) => {
        const itemKey = `${type}-${id}`;
        setIsUpdating(prev => ({ ...prev, [itemKey]: true }));
        try {
            const endpoint = type === 'aktivitet'
                ? `/aktiviteter/${id}/`
                : `/sager/sagsdokumenter/${id}/`;

            await api.patch(endpoint, { skal_mailes: false });
            await fetchData(true);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to remove item", error);
            alert("Kunne ikke fjerne element.");
        } finally {
            setIsUpdating(prev => ({ ...prev, [itemKey]: false }));
        }
    };

    const handleCopyGroup = (group: GroupedBasket) => {
        let text = `Vedr. sag: ${sag?.sags_nr} - ${sag?.alias || ''}\n`;
        if (sag?.adresse_vej) {
            text += `${sag.adresse_vej} ${sag.adresse_husnr || ''}, ${sag.adresse_post_nr || ''} ${sag.adresse_by || ''}\n`;
        }
        text += '\n';

        text += `--- ${group.kildeNavn} ---\n`;

        if (group.aktiviteter.length > 0) {
            text += `Aktiviteter:\n`;
            group.aktiviteter.forEach(a => {
                // Priority: Local mail_titel -> Template mail_titel -> Activity Name
                const titleToUse = a.mail_titel || a.skabelon_mail_titel || '';
                const displayTitle = titleToUse ? ` - ${titleToUse}` : '';
                text += `- ${a.aktivitet}${displayTitle}\n`;
            });
        }

        if (group.dokumenter.length > 0) {
            if (group.aktiviteter.length > 0) text += '\n';
            text += `Dokumenter:\n`;
            group.dokumenter.forEach(d => {
                // Priority: Local mail_titel -> Template mail_titel -> Empty
                const titleToUse = d.mail_titel || d.skabelon_mail_titel || '';
                const displayTitle = titleToUse ? ` - ${titleToUse}` : '';
                const navn = d.titel || d.filnavn;
                text += `- ${navn}${displayTitle}\n`;
            });
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopyModalTitle(`Tekst for "${group.kildeNavn}" kopieret!`);
            setCopyModalText(text);
            setShowCopyModal(true);
        });
    };

    const getGroupOpgaveText = (group: GroupedBasket) => {
        let text = "";
        if (group.aktiviteter.length > 0) {
            text += `Aktiviteter:\n`;
            group.aktiviteter.forEach(a => {
                const titleToUse = a.mail_titel || a.skabelon_mail_titel || '';
                const displayTitle = titleToUse ? ` - ${titleToUse}` : '';
                text += `- ${a.aktivitet}${displayTitle}\n`;
            });
        }
        if (group.dokumenter.length > 0) {
            if (group.aktiviteter.length > 0) text += '\n';
            text += `Dokumenter:\n`;
            group.dokumenter.forEach(d => {
                const titleToUse = d.mail_titel || d.skabelon_mail_titel || '';
                const displayTitle = titleToUse ? ` - ${titleToUse}` : '';
                const navn = d.titel || d.filnavn;
                text += `- ${navn}${displayTitle}\n`;
            });
        }
        return text;
    };

    const handleOpenPrepModal = (group: GroupedBasket) => {
        setPrepInitialSource(group.kildeId);
        setPrepOpgaveText(getGroupOpgaveText(group));
        setPrepModalOpen(true);
    };

    const handleRetryEmail = async (id: number) => {
        try {
            await api.post(`/emails/outgoing/${id}/retry/`);
            fetchOutgoing();
        } catch (err) {
            alert("Kunne ikke prøve igen.");
        }
    };

    const handleCompleteEmail = async (id: number) => {
        try {
            await api.post(`/emails/outgoing/${id}/mark_completed/`);
            fetchOutgoing();
            fetchData(true); // Full refresh of the basket
        } catch (err) {
            alert("Kunne ikke færdiggøre.");
        }
    };

    const handleDeleteEmail = (id: number) => {
        setConfirmDeleteId(id);
    };

    const confirmDeleteEmail = async () => {
        if (confirmDeleteId === null) return;
        try {
            await api.delete(`/emails/outgoing/${confirmDeleteId}/`);
            fetchOutgoing();
            setConfirmDeleteId(null);
        } catch (err) {
            alert("Kunne ikke slette.");
        }
    };

    const handleUpdateSource = async (type: 'aktivitet' | 'dokument', id: number, sourceId: number | null) => {
        const itemKey = `${type}-${id}`;
        setIsUpdating(prev => ({ ...prev, [itemKey]: true }));

        try {
            const endpoint = type === 'aktivitet'
                ? `/aktiviteter/${id}/`
                : `/sager/sagsdokumenter/${id}/`;

            // Use informations_kilde_id for validation/write
            await api.patch(endpoint, { informations_kilde_id: sourceId });

            // Refresh list
            await fetchData(true);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update source", error);
            alert("Fejl ved opdatering af kilde.");
        } finally {
            setIsUpdating(prev => ({ ...prev, [itemKey]: false }));
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, type: 'aktivitet' | 'dokument', id: number) => {
        setDraggedItem({ type, id });
        e.dataTransfer.effectAllowed = "move";
        // Ghost image customization if needed, but default is usually fine
    };

    const handleDragOver = (e: React.DragEvent, groupId: string) => {
        e.preventDefault(); // Necessary to allow dropping
        if (dragOverGroup !== groupId) {
            setDragOverGroup(groupId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if we are genuinely leaving the container, this can be tricky with child elements.
        // For simplicity, we might clear logic in handleDrop or rely on visual cues being subtle.
        // setDragOverGroup(null); 
    };

    const handleDrop = async (e: React.DragEvent, targetKildeId: number | null) => {
        e.preventDefault();
        setDragOverGroup(null);

        if (!draggedItem) return;

        // Perform move
        await handleUpdateSource(draggedItem.type, draggedItem.id, targetKildeId);
        setDraggedItem(null);
    };

    const groupedItems = useMemo(() => {
        const groups: Record<string, GroupedBasket> = {};
        const getGroupKey = (kildeId: number | null, kildeNavn: string | undefined) => {
            return kildeId ? `k-${kildeId}` : 'unknown';
        };

        // Group Aktiviteter
        aktiviteter.forEach(a => {
            const kildeId = a.informations_kilde?.id || null;
            const kildeNavn = a.informations_kilde?.navn || 'Uden kilde';
            const key = getGroupKey(kildeId, kildeNavn);

            if (!groups[key]) {
                groups[key] = { kildeNavn, kildeId, aktiviteter: [], dokumenter: [] };
            }
            groups[key].aktiviteter.push(a);
        });

        // Group Dokumenter
        dokumenter.forEach(d => {
            const kildeId = d.informations_kilde?.id || null;
            const kildeNavn = d.informations_kilde?.navn || 'Uden kilde';
            const key = getGroupKey(kildeId, kildeNavn);

            if (!groups[key]) {
                groups[key] = { kildeNavn, kildeId, aktiviteter: [], dokumenter: [] };
            }
            groups[key].dokumenter.push(d);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.kildeNavn === 'Uden kilde') return 1;
            if (b.kildeNavn === 'Uden kilde') return -1;
            return a.kildeNavn.localeCompare(b.kildeNavn);
        });
    }, [aktiviteter, dokumenter]);

    if (!sag) return <div>Ingen sag valgt</div>;

    const totalCount = aktiviteter.length + dokumenter.length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header / Actions */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Mail className="text-blue-600" />
                        Mail Kurv
                    </h2>
                    <p className="text-sm text-gray-500">
                        {totalCount} elementer markeret til mail på sag {sag.sags_nr} - {sag.alias}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchData(true)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Opdater liste"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={totalCount === 0 || loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Tøm kurv
                    </button>
                </div>
            </div>

            {/* List */}
            {loading && totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p>Henter kurv...</p>
                </div>
            ) : totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-gray-400 bg-white rounded-lg border border-gray-200 border-dashed">
                    <Mail className="mb-2 opacity-20" size={48} />
                    <p>Din mail-kurv er tom for denne sag.</p>
                    <p className="text-sm mt-1">Vælg aktiviteter eller dokumenter via afkrydsningsfeltet i listerne.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedItems.map((group) => {
                        const groupKey = group.kildeId ? `k-${group.kildeId}` : 'unknown';
                        const isDragOver = dragOverGroup === groupKey;

                        return (
                            <div
                                key={group.kildeId || 'unknown'}
                                className={`bg-white rounded-lg shadow-sm border transition-colors overflow-hidden ${isDragOver ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200'}`}
                                onDragOver={(e) => handleDragOver(e, groupKey)}
                                onDrop={(e) => handleDrop(e, group.kildeId)}
                            >
                                {/* Group Header */}
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                        {group.kildeNavn}
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenPrepModal(group)}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                                            title="Generer mail fra denne gruppe"
                                        >
                                            <Mail size={12} /> Mailskabelon
                                        </button>
                                        <button
                                            onClick={() => handleCopyGroup(group)}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-gray-700 transition-colors"
                                            title="Kopier tekst for denne gruppe"
                                        >
                                            <Copy size={12} /> Kopier
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Aktiviteter */}
                                    {group.aktiviteter.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <CheckSquare size={12} /> Aktiviteter
                                            </h5>
                                            <div className="grid gap-2">
                                                {group.aktiviteter.map(akt => (
                                                    <div
                                                        key={akt.id}
                                                        className="text-sm bg-blue-50/30 rounded-md border border-blue-100 flex items-stretch overflow-hidden group"
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, 'aktivitet', akt.id)}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div className="w-8 bg-gray-100 border-r border-gray-200 flex items-center justify-center cursor-move hover:bg-gray-200 transition-colors">
                                                            <GripVertical size={16} className="text-gray-400 group-hover:text-gray-600" />
                                                        </div>

                                                        <div className="flex-1 min-w-0 p-3 flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-900">{akt.aktivitet}</span>
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${akt.status?.status_kategori === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                        {akt.status?.beskrivelse || '-'}
                                                                    </span>
                                                                </div>
                                                                {akt.note && <p className="text-gray-500 text-xs mt-1 bg-white/50 p-1 rounded italic">{akt.note}</p>}
                                                            </div>

                                                            {/* Source Selector */}
                                                            <div className="flex-shrink-0 w-32">
                                                                <select
                                                                    className="w-full text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1 pl-1 pr-6 bg-white"
                                                                    value={akt.informations_kilde?.id || ""}
                                                                    onChange={(e) => handleUpdateSource('aktivitet', akt.id, e.target.value ? Number(e.target.value) : null)}
                                                                    disabled={isUpdating[`aktivitet-${akt.id}`]}
                                                                >
                                                                    <option value="">Uden kilde</option>
                                                                    {informationsKilder.map(k => (
                                                                        <option key={k.id} value={k.id}>{k.navn}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveItem('aktivitet', akt.id)}
                                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                                title="Fjern fra kurv"
                                                                disabled={isUpdating[`aktivitet-${akt.id}`]}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dokumenter */}
                                    {group.dokumenter.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <FileText size={12} /> Dokumenter
                                            </h5>
                                            <div className="grid gap-2">
                                                {group.dokumenter.map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className="text-sm bg-gray-50/50 rounded-md border border-gray-200 flex items-stretch overflow-hidden group"
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, 'dokument', doc.id)}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div className="w-8 bg-gray-100 border-r border-gray-200 flex items-center justify-center cursor-move hover:bg-gray-200 transition-colors">
                                                            <GripVertical size={16} className="text-gray-400 group-hover:text-gray-600" />
                                                        </div>

                                                        <div className="flex-1 min-w-0 p-3 flex justify-between items-center gap-3">
                                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                <span className="font-mono text-gray-400 text-xs">
                                                                    {Math.round((doc.gruppe_nr || 0))}.{doc.dokument_nr}
                                                                </span>
                                                                <span className="font-medium text-gray-900 truncate" title={doc.titel || doc.filnavn || ''}>
                                                                    {doc.titel || doc.filnavn}
                                                                </span>
                                                            </div>

                                                            {/* Source Selector */}
                                                            <div className="flex-shrink-0 w-32">
                                                                <select
                                                                    className="w-full text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1 pl-1 pr-6 bg-white"
                                                                    value={doc.informations_kilde?.id || ""}
                                                                    onChange={(e) => handleUpdateSource('dokument', doc.id, e.target.value ? Number(e.target.value) : null)}
                                                                    disabled={isUpdating[`dokument-${doc.id}`]}
                                                                >
                                                                    <option value="">Uden kilde</option>
                                                                    {informationsKilder.map(k => (
                                                                        <option key={k.id} value={k.id}>{k.navn}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveItem('dokument', doc.id)}
                                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                                title="Fjern fra kurv"
                                                                disabled={isUpdating[`dokument-${doc.id}`]}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent Outgoing Emails Section */}
            {outgoingEmails.length > 0 && (
                <div className="mt-12 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <ExternalLink size={16} /> Status på klargøring til Outlook
                    </h3>
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">Kilde</th>
                                    <th className="px-4 py-3 text-left">Modtager / Emne</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {outgoingEmails.map(mail => (
                                    <tr key={mail.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase border border-blue-100">
                                                {mail.informations_kilde_navn || (mail as any).informations_kilde?.navn || 'Diverse'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{mail.recipient || '(Ingen modtager)'}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs">{mail.subject}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {mail.status === 'Draft' && (
                                                <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                                                    <Loader2 size={14} className="animate-spin" /> Venter på Bridge...
                                                </span>
                                            )}
                                            {(mail.status === 'InOutlook' || (mail.status as string) === 'Sent') && (
                                                <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                                                    <ExternalLink size={14} /> Åbnet i Outlook
                                                </span>
                                            )}
                                            {mail.status === 'Completed' && (
                                                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                                                    <CheckCircle size={14} /> Færdig
                                                </span>
                                            )}
                                            {mail.status === 'Error' && (
                                                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                                                    Fejl: {mail.error_message}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {(mail.status === 'InOutlook' || (mail.status as string) === 'Sent') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRetryEmail(mail.id)}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded bg-white border border-amber-200 flex items-center gap-1 text-xs whitespace-nowrap"
                                                            title="Prøv igen (Genåbn i Outlook)"
                                                        >
                                                            <RotateCcw size={14} /> Prøv igen
                                                        </button>
                                                        <button
                                                            onClick={() => handleCompleteEmail(mail.id)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-white border border-green-200 flex items-center gap-1 text-xs whitespace-nowrap"
                                                            title="Markér som færdig"
                                                        >
                                                            <CheckCircle size={14} /> Færdig
                                                        </button>
                                                    </>
                                                )}
                                                {mail.status === 'Error' && (
                                                    <button
                                                        onClick={() => handleRetryEmail(mail.id)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded bg-white border border-blue-200 flex items-center gap-1 text-xs whitespace-nowrap"
                                                    >
                                                        <RotateCcw size={14} /> Prøv igen
                                                    </button>
                                                )}

                                                <div className="w-px h-4 bg-gray-200 mx-1" />

                                                <button
                                                    onClick={() => handleDeleteEmail(mail.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center shrink-0"
                                                    title="Annuller / Slet log"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CopySuccessModal
                isOpen={showCopyModal}
                onClose={() => setShowCopyModal(false)}
                title={copyModalTitle}
                text={copyModalText}
            />

            {sag && (
                <MailPreparationModal
                    isOpen={prepModalOpen}
                    onClose={() => setPrepModalOpen(false)}
                    sag={sag}
                    initialSourceId={prepInitialSource}
                    opgavelisteText={prepOpgaveText}
                />
            )}

            {/* Confirmations */}
            <ConfirmModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={confirmReset}
                title="Tøm mail-kurv"
                message="Er du sikker på, at du vil fjerne alt indhold fra mail-kurven på denne sag?"
                confirmText="Tøm kurv"
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={confirmDeleteEmail}
                title="Annuller klargøring"
                message="Dette fjerner loggen fra oversigten. Hvis mailen er åbnet i Outlook, vil den stadig være åben der."
                confirmText="Fjern fra liste"
                isDestructive={true}
            />
        </div>
    );
}
