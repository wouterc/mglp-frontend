

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { RefreshCw, Loader2, Calendar, User, Mail, Monitor, Laptop, Wifi, WifiOff } from 'lucide-react';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';

export interface OutlookAccount {
    id: number;
    account_name: string;
    email_address: string;
    is_active: boolean;
    sidst_opdateret: string;
    last_synced?: string;
    machine_name?: string;
    os_user?: string;
}

export interface BridgeClient {
    id: number;
    machine_name: string;
    os_user: string;
    last_seen: string;
    is_online: boolean;
}

export default function OutlookAccountSettings() {
    const [accounts, setAccounts] = useState<OutlookAccount[]>([]);
    const [clients, setClients] = useState<BridgeClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [activeTab, setActiveTab] = useState<'accounts' | 'clients'>('accounts');

    const fetchData = async (forceUpdate = false) => {
        setIsLoading(true);
        setError(null);
        try {
            // Hent Konti
            const url = forceUpdate ? '/emails/accounts/?sync=true' : '/emails/accounts/';
            const accData: any = await api.get(url);

            if (accData && accData.message && Array.isArray(accData.accounts)) {
                setAccounts(accData.accounts);
                setModalMessage(accData.message);
                setModalOpen(true);
            } else if (Array.isArray(accData)) {
                setAccounts(accData);
            }

            // Hent Klienter
            const clientData = await api.get<BridgeClient[]>('/emails/clients/');
            setClients(clientData);

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Kunne ikke hente data");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleActive = async (id: number, currentState: boolean) => {
        try {
            setAccounts(prev => prev.map(acc =>
                acc.id === id ? { ...acc, is_active: !currentState } : acc
            ));

            await api.post('/emails/accounts/', {
                id: id,
                is_active: !currentState
            });
        } catch (e) {
            console.error("Fejl ved opdatering af status:", e);
            setAccounts(prev => prev.map(acc =>
                acc.id === id ? { ...acc, is_active: currentState } : acc
            ));
            alert("Kunne ikke opdatere status.");
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('da-DK', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <div className="flex space-x-4">
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'accounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Konti Indstillinger
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeTab === 'clients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Aktive Klienter
                    </button>
                </div>

                <Button onClick={() => fetchData(true)} variant="secondary" className="text-xs h-7 px-4">
                    <span className="flex items-center gap-2">
                        <RefreshCw size={12} />
                        <span>Opdater</span>
                    </span>
                </Button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex-1 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : (
                <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-sm">
                    {activeTab === 'accounts' ? (
                        <>
                            {accounts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    Ingen konti fundet. Sørg for at starte bridge-klienten på mail-serveren.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Konto</th>
                                            <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Adresse</th>
                                            <th scope="col" className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Opdateret</th>
                                            <th scope="col" className="px-3 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Aktiv</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {accounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 border-l-[3px] border-transparent">
                                                    {acc.account_name}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                                    {acc.email_address}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span>{formatDate(acc.last_synced || acc.sidst_opdateret)}</span>
                                                        {acc.machine_name && (
                                                            <span className="text-[10px] text-gray-300 mt-0.5" title={`Bruger: ${acc.os_user}`}>
                                                                via {acc.machine_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => toggleActive(acc.id, acc.is_active)}
                                                        className={`relative inline-flex flex-shrink-0 h-4 w-7 border-[1px] border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${acc.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                                                    >
                                                        <span className="sr-only">Toggle aktiv</span>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${acc.is_active ? 'translate-x-3' : 'translate-x-0'} mt-[1px] ml-[1px]`}
                                                        />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="mt-4 p-3 bg-blue-50 rounded text-[11px] text-blue-800 border border-blue-100 flex items-start mx-3 mb-3">
                                <Mail className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                                <p>Marker konti som "Aktiv" for at systemet automatisk henter emails fra dem.</p>
                            </div>
                        </>
                    ) : (
                        // CLIENTS TAB
                        <>
                            {clients.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    Ingen aktive bro-klienter registreret endnu.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Maskine</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Bruger</th>
                                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">Sidst Set</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {clients.map((client) => (
                                            <tr key={client.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {client.is_online ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 border border-green-200">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                                                            Online
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div>
                                                            Offline
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 flex items-center gap-2">
                                                    <Monitor size={14} className="text-gray-400" />
                                                    {client.machine_name}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {client.os_user}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                                    {formatDate(client.last_seen)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="mt-4 p-3 bg-gray-50 rounded text-[11px] text-gray-600 border border-gray-200 flex items-start mx-3 mb-3">
                                <Monitor className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                                <p>Klienter sender et "heartbeat" hvert 5. minut. Hvis en klient ikke er set i 7 minutter, markeres den som Offline.</p>
                            </div>
                        </>
                    )}

                </div>
            )}

            <ConfirmModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={() => setModalOpen(false)}
                title="Outlook Synkronisering"
                message={modalMessage}
                confirmText="OK"
                cancelText=""
            />
        </div>
    );
}

