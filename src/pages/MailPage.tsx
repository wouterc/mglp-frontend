import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, Settings, Inbox, Loader2, ChevronRight, User, Folder, Layout, RefreshCw, FileText } from 'lucide-react';
import OutlookAccountSettings, { OutlookAccount } from '../components/OutlookAccountSettings';
import EmailList from '../components/EmailList';
import CaseSelector from '../components/CaseSelector';
import ConfirmModal from '../components/ui/ConfirmModal';
import MailTemplatesSettings from '../components/MailTemplatesSettings';
import axios from 'axios';
import { Sag } from '../types';

export default function MailPage() {
    const [accounts, setAccounts] = useState<OutlookAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<OutlookAccount | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isJournalizing, setIsJournalizing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // New selection state
    const [selectedEmailIds, setSelectedEmailIds] = useState<number[]>([]);
    // Refresh key for forcing list reload
    const [refreshKey, setRefreshKey] = useState(0);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isAlert?: boolean }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isAlert: false
    });

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const data = await api.get<OutlookAccount[]>('/emails/accounts/');
            setAccounts(data);

            // Select first active account by default if none selected
            if (!selectedAccount && !showSettings && data.length > 0) {
                const firstActive = data.find(a => a.is_active);
                if (firstActive) setSelectedAccount(firstActive);
            }

        } catch (e: any) {
            console.error("Failed to fetch accounts", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Clear selection when changing account
    useEffect(() => {
        setSelectedEmailIds([]);
    }, [selectedAccount]);

    const handleAccountClick = (acc: OutlookAccount) => {
        setSelectedAccount(acc);
        setShowSettings(false);
        setShowTemplates(false);
    };

    const handleSettingsClick = () => {
        setSelectedAccount(null);
        setShowSettings(true);
        setShowTemplates(false);
    };

    const handleTemplatesClick = () => {
        setSelectedAccount(null);
        setShowSettings(false);
        setShowTemplates(true);
    };

    const activeAccounts = accounts.filter(a => a.is_active);

    const handleEmailSelection = (id: number, selected: boolean) => {
        if (selected) {
            setSelectedEmailIds(prev => [...prev, id]);
        } else {
            setSelectedEmailIds(prev => prev.filter(i => i !== id));
        }
    };



    // Calculate latest sync time
    const latestSync = accounts
        .filter(a => a.is_active && a.last_synced)
        .map(a => new Date(a.last_synced!).getTime())
        .sort((a, b) => b - a)[0];

    const latestSyncDate = latestSync ? new Date(latestSync) : null;

    // Single email journalization (Drag & Drop)
    const processJournalisering = async (sagId: number, emailId: number) => {
        try {
            await api.post<{ message: string, sags_nr: number }>('/emails/save/', {
                email_id: emailId,
                sag_id: sagId
            });

            // Close modal (success)
            setConfirmModal(prev => ({ ...prev, isOpen: false }));

            // Force reload of email list to update status
            setRefreshKey(prev => prev + 1);
        } catch (e) {
            console.error("Fejl ved journalisering", e);
            setConfirmModal({
                isOpen: true,
                title: 'Fejl',
                message: 'Der opstod en fejl under journaliseringen.',
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                isAlert: true
            });
        }
    };

    // Batch journalization (Checkbox Selection)
    const processBatchJournalisering = async (sagId: number, emailIds: number[]) => {
        try {
            // Process all selected
            // We use Promise.all to run them concurrently. 
            // In a production app, a dedicated batch endpoint would be better.
            await Promise.all(emailIds.map(id =>
                api.post('/emails/save/', {
                    email_id: id,
                    sag_id: sagId
                })
            ));

            // Close modal (success)
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            setSelectedEmailIds([]); // Clear selection

            // Force reload
            setRefreshKey(prev => prev + 1);
        } catch (e) {
            console.error("Fejl ved batch journalisering", e);
            setConfirmModal({
                isOpen: true,
                title: 'Fejl',
                message: 'Der opstod en fejl under batch-journaliseringen.',
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                isAlert: true
            });
        }
    };

    const handleEmailDrop = (sag: Sag, emailId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Bekræft journalisering',
            message: `Vil du journalisere denne email på sag ${sag.sags_nr}?\n${sag.alias}\n${sag.adresse_vej || ''} ${sag.adresse_husnr || ''}, ${sag.adresse_post_nr || ''} ${sag.adresse_by || ''}`,
            onConfirm: () => processJournalisering(sag.id, emailId)
        });
    };

    // Handle clicking a case in the selector
    const handleCaseClick = (sag: Sag) => {
        if (selectedEmailIds.length === 0) {
            // No selection -> Normal navigation or nothing
            console.log("Clicked case without selection:", sag.sags_nr);
            return;
        }

        // Has selection -> Confirm batch action
        setConfirmModal({
            isOpen: true,
            title: 'Journaliser valgte emails',
            message: `Vil du journalisere ${selectedEmailIds.length} valgte emails på sag ${sag.sags_nr}?\n${sag.alias}\n${sag.adresse_vej || ''} ${sag.adresse_husnr || ''}`,
            onConfirm: () => processBatchJournalisering(sag.id, selectedEmailIds)
        });
    };

    const handleUnlink = (emailId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Fjern tilknytning',
            message: 'Vil du fjerne tilknytningen til sagen?',
            onConfirm: async () => {
                try {
                    await api.post('/emails/unlink/', { email_id: emailId });
                    setRefreshKey(prev => prev + 1);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    console.error("Fejl ved unlink", e);
                    setConfirmModal({
                        isOpen: true,
                        title: 'Fejl',
                        message: 'Kunne ikke fjerne link.',
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                        isAlert: true
                    });
                }
            }
        });
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">

            {/* --- Left Sidebar (Accounts) --- */}
            {/* Conditional Width based on Journalizing Mode */}
            <div className={`${isJournalizing ? 'w-16' : 'w-64'} bg-[#f0f0f0] border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300`}>
                <div className={`p-4 border-b border-gray-200/50 flex justify-between items-center ${isJournalizing ? 'justify-center p-2' : ''}`}>
                    {!isJournalizing && (
                        <div className="flex items-center justify-between w-full">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Postkasser</h2>
                        </div>
                    )}
                    {/* Toggle Button for Journaliser Mode */}
                    <button
                        onClick={() => setIsJournalizing(!isJournalizing)}
                        title={isJournalizing ? "Luk Journalisering" : "Åbn Journalisering"}
                        className={`text-gray-500 hover:text-blue-600 ${isJournalizing ? '' : 'absolute right-2 top-2 hidden'}`}
                    >
                        <Folder size={18} className={isJournalizing ? 'text-blue-600' : ''} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {/* List Accounts */}
                    {!isLoading && activeAccounts.map(acc => (
                        <button
                            key={acc.id}
                            onClick={() => handleAccountClick(acc)}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center group transition-colors ${selectedAccount?.id === acc.id ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-gray-700 hover:bg-gray-200/50'} ${isJournalizing ? 'justify-center px-1' : ''}`}
                            title={acc.account_name}
                        >
                            <div className={`${!isJournalizing ? 'mr-3' : ''} relative`}>
                                <Mail size={18} className={selectedAccount?.id === acc.id ? 'text-blue-600' : 'text-gray-400'} />
                            </div>
                            {!isJournalizing && <span className="truncate">{acc.account_name}</span>}
                        </button>
                    ))}
                </div>

                {/* Settings Button */}
                <div className="p-2 border-t border-gray-200 bg-[#e8e8e8] space-y-1">
                    <button
                        onClick={handleTemplatesClick}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center rounded-md ${showTemplates ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:bg-white/50'} ${isJournalizing ? 'justify-center' : ''}`}
                    >
                        <FileText size={18} className={!isJournalizing ? "mr-2.5" : ""} />
                        {!isJournalizing && <span>Mailskabeloner</span>}
                    </button>
                    <button
                        onClick={handleSettingsClick}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center rounded-md ${showSettings ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:bg-white/50'} ${isJournalizing ? 'justify-center' : ''}`}
                    >
                        <Settings size={18} className={!isJournalizing ? "mr-2.5" : ""} />
                        {!isJournalizing && <span>Indstillinger</span>}
                    </button>
                    {!isJournalizing && latestSyncDate && (
                        <div className="text-[10px] text-gray-400 text-center mt-2">
                            Sidst checket: {latestSyncDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}

                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {/*  Toolbar for Journalizing Toggle if not in sidebar? */}
                {selectedAccount && !showSettings && !showTemplates && (
                    <div className="absolute right-4 top-3 z-10 flex space-x-2">
                        <button
                            onClick={() => setIsJournalizing(!isJournalizing)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold shadow-sm border transition-colors ${isJournalizing || selectedEmailIds.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <Folder size={14} />
                            <span>
                                {isJournalizing
                                    ? 'Afslut Journalisering'
                                    : selectedEmailIds.length > 0
                                        ? `Journaliser (${selectedEmailIds.length})`
                                        : 'Journaliser'}
                            </span>
                        </button>
                    </div>
                )}

                {showTemplates ? (
                    <div className="flex-1 overflow-hidden relative">
                        <MailTemplatesSettings />
                    </div>
                ) : showSettings ? (
                    <div className="flex-1 p-6 overflow-hidden">
                        <OutlookAccountSettings />
                    </div>
                ) : selectedAccount ? (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Mail List Area */}

                        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
                            <div className="h-12 border-b border-gray-200 flex items-center px-4 justify-between bg-white shrink-0">
                                <h1 className="text-sm font-semibold text-gray-800 flex items-center truncate">
                                    <span className="text-gray-500 font-normal mr-2 hidden sm:inline">Indbakke:</span>
                                    {selectedAccount.account_name}
                                </h1>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                <EmailList
                                    key={refreshKey}
                                    accountId={selectedAccount.id}
                                    hideReadingPane={isJournalizing}
                                    onUnlink={handleUnlink}
                                    // @ts-ignore
                                    selectedEmailIds={selectedEmailIds}
                                    onToggleSelection={handleEmailSelection}
                                    onAcceptSuggestion={(emailId, sagId) => processJournalisering(sagId, emailId)}
                                />
                            </div>
                        </div>

                        {/* Right Panel: Reading Pane OR Case Selector (Journaliser) */}
                        {isJournalizing && (
                            <div className="w-[400px] bg-white flex flex-col transition-all duration-300 shadow-inner z-10 border-l border-gray-200">
                                <CaseSelector
                                    // @ts-ignore
                                    onCaseSelected={handleCaseClick}
                                    onEmailDrop={handleEmailDrop}
                                />
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col bg-gray-50/30">
                        <Layout size={48} className="mb-4 opacity-20" />
                        <p className="text-xs">Vælg en konto til venstre for at se e-mails</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="OK"
                cancelText={confirmModal.isAlert ? undefined : "Annuller"}
            />
        </div >
    );
}
