

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { RefreshCw, Loader2, Calendar, User, Mail } from 'lucide-react';
import Button from '../components/ui/Button';

export interface OutlookAccount {
    id: number;
    account_name: string;
    email_address: string;
    is_active: boolean;
    sidst_opdateret: string;
    last_synced?: string;
}

export default function OutlookAccountSettings() {
    const [accounts, setAccounts] = useState<OutlookAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.get<OutlookAccount[]>('/emails/accounts/');
            setAccounts(data);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Kunne ikke hente konti");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleActive = async (id: number, currentState: boolean) => {
        try {
            // Optimistic update
            setAccounts(prev => prev.map(acc =>
                acc.id === id ? { ...acc, is_active: !currentState } : acc
            ));

            await api.post('/emails/accounts/', {
                id: id,
                is_active: !currentState
            });
        } catch (e) {
            console.error("Fejl ved opdatering af status:", e);
            // Revert on error
            setAccounts(prev => prev.map(acc =>
                acc.id === id ? { ...acc, is_active: currentState } : acc
            ));
            alert("Kunne ikke opdatere status.");
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('da-DK', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center">
                    Konto Indstillinger
                </h2>
                <Button onClick={fetchAccounts} variant="secondary" className="text-xs h-7 px-2">
                    <RefreshCw size={12} className="mr-1.5" /> Opdater
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
                    {accounts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">
                            Ingen konti fundet. Sørg for at køre <code>mail_bridge_accounts.py</code> på serveren.
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
                                            {formatDate(acc.sidst_opdateret)}
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
                </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded text-[11px] text-blue-800 border border-blue-100 flex items-start">
                <Mail className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                <p>Marker konti som "Aktiv" for at systemet automatisk henter emails fra dem. Nye emails vil derefter dukke op under kontoens indbakke her i systemet.</p>
            </div>
        </div>
    );
}

