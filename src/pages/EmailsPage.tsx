// --- Fil: src/pages/EmailsPage.tsx ---
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { Mail, User, Calendar, RefreshCw, LogIn, Loader2, AlertCircle, Save, X } from 'lucide-react';
import Button from '../components/ui/Button';

interface EmailAddress {
    name: string;
    address: string;
}

interface EmailMessage {
    id: string; // Vigtigt: Vi skal bruge ID for at gemme den
    subject: string;
    bodyPreview: string;
    receivedDateTime: string;
    from: {
        emailAddress: EmailAddress;
    };
}

export default function EmailsPage() {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsLogin, setNeedsLogin] = useState(false);

    // State til "Gem på sag" dialog
    const [savingEmail, setSavingEmail] = useState<EmailMessage | null>(null);
    const [sagsNrInput, setSagsNrInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchEmails = async () => {
        setIsLoading(true);
        setError(null);
        setNeedsLogin(false);

        try {
            const res = await fetch(`${API_BASE_URL}/emails/list/`);

            if (res.status === 404) {
                // 404 betyder her: "Ingen token fundet i DB" -> Vi skal logge ind
                setNeedsLogin(true);
                setIsLoading(false);
                return;
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Kunne ikke hente emails');
            }

            const data = await res.json();
            // Håndter både rå liste (som du ser nu) og { value: [] } formatet fra Graph
            const emailList = Array.isArray(data) ? data : (data.value || []);
            setEmails(emailList);

        } catch (e: any) {
            console.error(e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const handleLogin = () => {
        // Sender brugeren til vores backend login-endpoint
        window.location.href = `${API_BASE_URL}/emails/login/`;
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('da-DK', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    const openSaveDialog = (email: EmailMessage) => {
        setSavingEmail(email);
        setSagsNrInput('');
        setSaveMessage(null);
    };

    const performSave = async () => {
        if (!savingEmail || !sagsNrInput) return;

        setIsSaving(true);
        setSaveMessage(null);

        try {
            const res = await fetch(`${API_BASE_URL}/emails/save/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email_id: savingEmail.id,
                    sags_nr: sagsNrInput
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Kunne ikke gemme email');
            }

            setSaveMessage({ type: 'success', text: `Email gemt på sag ${sagsNrInput}!` });
            // Luk dialog efter kort tid eller lad brugeren lukke den? 
            // Vi lader den stå så man kan se beskeden, men rydder input
            setSagsNrInput('');

        } catch (e: any) {
            setSaveMessage({ type: 'error', text: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Mail className="mr-3" /> Indbakke (Test)
                </h1>
                {!needsLogin && (
                    <Button onClick={fetchEmails} variant="secondary">
                        <RefreshCw size={18} /> Opdater
                    </Button>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center">
                    <AlertCircle className="mr-2" /> {error}
                </div>
            )}

            {needsLogin ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Forbind din Outlook</h2>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        For at kunne se og journalisere emails, skal du først give systemet adgang til din Microsoft konto.
                    </p>
                    <Button onClick={handleLogin} variant="primary" className="mx-auto">
                        <LogIn size={18} /> Log ind med Microsoft
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {emails.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Ingen emails fundet i de seneste 5 beskeder.</div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {emails.map((email, index) => (
                                <li key={index} className="p-4 hover:bg-gray-50 transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-gray-900 text-lg truncate pr-4">
                                            {email.subject || '(Intet emne)'}
                                        </h3>
                                        <span className="flex items-center text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                                            <Calendar size={12} className="mr-1" />
                                            {formatDate(email.receivedDateTime)}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-sm text-gray-600 mb-2">
                                        <User size={14} className="mr-1" />
                                        <span className="font-medium mr-1">{email.from?.emailAddress?.name}</span>
                                        <span className="text-gray-400 text-xs">&lt;{email.from?.emailAddress?.address}&gt;</span>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2">
                                        {email.bodyPreview}
                                    </p>

                                    <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openSaveDialog(email)}
                                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                        >
                                            <Save size={14} className="mr-1.5" />
                                            Gem på sag
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Modal / Dialog til at gemme sag */}
            {savingEmail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Gem email på sag</h3>
                            <button onClick={() => setSavingEmail(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-100">
                            <span className="font-medium block text-gray-900 mb-1">{savingEmail.subject}</span>
                            Fra: {savingEmail.from?.emailAddress?.name}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Indtast Sagsnummer</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Fx 1000"
                                value={sagsNrInput}
                                onChange={(e) => setSagsNrInput(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {saveMessage && (
                            <div className={`mb-4 p-3 rounded text-sm ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {saveMessage.text}
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <Button variant="secondary" onClick={() => setSavingEmail(null)}>Annuller</Button>
                            <Button variant="primary" onClick={performSave} disabled={isSaving || !sagsNrInput}>
                                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                {isSaving ? 'Gemmer...' : 'Gem'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}