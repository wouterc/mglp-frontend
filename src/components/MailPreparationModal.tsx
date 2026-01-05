
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MailSkabelon, OutlookAccount, Sag } from '../types';
import { Loader2, Send, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

interface MailPreparationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sag: Sag;
    initialSourceId: number | null;
    opgavelisteText: string;
}

export default function MailPreparationModal({ isOpen, onClose, sag, initialSourceId, opgavelisteText }: MailPreparationModalProps) {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<MailSkabelon[]>([]);
    const [accounts, setAccounts] = useState<OutlookAccount[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
    const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");

    const [preview, setPreview] = useState<{ subject: string, body: string } | null>(null);
    const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setSuccess(false);
            setError(null);
            setPreview(null);
            setSelectedTemplateId("");
            setRecipientEmail("");
            setRecipientName("");
        }
    }, [isOpen, sag.id]); // Re-run if case changes

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch templates filtered by source if possible, or fetch all and filter client-side
            const [tplData, accData] = await Promise.all([
                api.get<MailSkabelon[]>('/skabeloner/mail/'),
                api.get<OutlookAccount[]>('/emails/accounts/')
            ]);

            // Filter templates by source
            const filteredTemplates = initialSourceId
                ? tplData.filter(t => t.informations_kilde?.id === initialSourceId)
                : tplData;

            setTemplates(filteredTemplates);

            // Filter active accounts
            const activeAccounts = accData.filter(a => a.is_active);
            setAccounts(activeAccounts);

            // Helper til at finde den mest relevante konto
            const findStandardAccount = () => {
                const sId = sag.standard_outlook_account_id || sag.standard_outlook_account_details?.id;
                const sEmail = sag.standard_outlook_account_details?.email_address;

                // 1. Tjek via ID
                if (sId) {
                    const match = activeAccounts.find(a => Number(a.id) === Number(sId));
                    if (match) return match.id;
                }
                // 2. Tjek via Email (fallback)
                if (sEmail) {
                    const match = activeAccounts.find(a => a.email_address.toLowerCase() === sEmail.toLowerCase());
                    if (match) return match.id;
                }
                return null;
            };

            const autoSelectedId = findStandardAccount();
            if (autoSelectedId) {
                setSelectedAccountId(autoSelectedId);
            } else if (activeAccounts.length > 0) {
                setSelectedAccountId(activeAccounts[0].id);
            }

            // Try to find a recipient (e.g. primary seller or solicitor if mægler)
            // For now, leave empty or use a default if we can find one on the Sag
            setRecipientName("");
            setRecipientEmail("");

        } catch (err) {
            console.error("Failed to fetch preparation data", err);
            setError("Kunne ikke hente skabeloner eller konti.");
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        if (!selectedTemplateId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.post<{ subject: string, body: string, informations_kilde_id: number, inferred_email?: string }>('/emails/render-template/', {
                template_id: selectedTemplateId,
                sag_id: sag.id,
                extra_context: {
                    opgaveliste: opgavelisteText,
                    name: recipientName,
                    email: recipientEmail
                }
            });
            setPreview(data);
            setSelectedSourceId(data.informations_kilde_id);

            // Auto-fill recipient if empty and inferred
            if (!recipientEmail && data.inferred_email) {
                setRecipientEmail(data.inferred_email);
            }
        } catch (err: any) {
            setError(err.message || "Kunne ikke generere preview.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!preview || !selectedAccountId) return;
        setLoading(true);
        setError(null);
        try {
            await api.post('/emails/outgoing/', {
                recipient: recipientEmail,
                subject: preview.subject,
                body_html: preview.body,
                outlook_account: selectedAccountId,
                sag: sag.id,
                informations_kilde: selectedSourceId,
                status: 'Draft'
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Kunne ikke gemme mail til udbakken.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Send size={20} className="text-blue-600" />
                        Klargør mail i Outlook
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900">Mail er klar!</h4>
                            <p className="text-gray-600 mt-2">Den vil åbne i Outlook om et øjeblik via Mail Bridge.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Template Select */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Mailskabelon</label>
                                    <select
                                        id="mail-prep-template-id"
                                        name="mail-prep-template-id"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedTemplateId}
                                        onChange={(e) => {
                                            setSelectedTemplateId(e.target.value ? Number(e.target.value) : "");
                                            setPreview(null);
                                        }}
                                        disabled={loading}
                                        aria-label="Vælg mailskabelon"
                                    >
                                        <option value="">Vælg skabelon...</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.navn}</option>
                                        ))}
                                    </select>
                                    {templates.length === 0 && !loading && (
                                        <p className="text-xs text-amber-600">Ingen skabeloner fundet for denne kilde.</p>
                                    )}
                                </div>

                                {/* Account Select */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Afsender (Outlook-konto)</label>
                                    <select
                                        id="mail-prep-account-id"
                                        name="mail-prep-account-id"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedAccountId}
                                        onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : "")}
                                        disabled={loading}
                                        aria-label="Afsender Outlook-konto"
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.account_name} ({a.email_address})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Recipient Input */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Modtager Mail (Outlook 'Til')</label>
                                    <input
                                        id="mail-prep-recipient-email"
                                        name="mail-prep-recipient-email"
                                        type="email"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="f.eks. kunde@eksempel.dk"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        disabled={loading}
                                        aria-label="Modtager Email"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Modtager Navn (for {'{{name}}'})</label>
                                    <input
                                        id="mail-prep-recipient-name"
                                        name="mail-prep-recipient-name"
                                        type="text"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="f.eks. Jensen"
                                        value={recipientName}
                                        onChange={(e) => {
                                            setRecipientName(e.target.value);
                                            setPreview(null);
                                        }}
                                        disabled={loading}
                                        aria-label="Modtager Navn"
                                    />
                                </div>
                            </div>

                            {/* Preview Button */}
                            {selectedTemplateId && !preview && (
                                <button
                                    onClick={handlePreview}
                                    disabled={loading}
                                    className="w-full py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                    Generer preview
                                </button>
                            )}

                            {/* Preview Display */}
                            {preview && (
                                <div className="space-y-4 border rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase">Preview</h4>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex gap-2 text-sm">
                                                <span className="font-bold text-gray-500 w-16">EMNE:</span>
                                                <span className="font-medium text-gray-900">{preview.subject}</span>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <span className="font-bold text-gray-500 w-16">TIL:</span>
                                                <span className="text-blue-600 font-medium">{recipientEmail || '(Ingen email valgt)'}</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t">
                                            <div
                                                className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap font-sans bg-white p-6 border rounded shadow-inner min-h-[200px]"
                                                dangerouslySetInnerHTML={{ __html: preview.body }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {!success && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Annuller
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading || !preview || !selectedAccountId}
                            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            Gør klar i Outlook
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
