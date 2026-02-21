import React, { ReactElement, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../StateContext';
import { api } from '../api';
import { User, Shield, Mail, Key, Loader2, UserCircle, Monitor, Settings, AppWindow, ExternalLink, CircleHelp, ArrowDown01, ArrowDownAZ } from 'lucide-react';
import Button from '../components/ui/Button';
import HelpButton from '../components/ui/HelpButton';
import Tooltip from '../components/Tooltip';
import RedigerProfilModal from '../components/RedigerProfilModal';
import SkiftAdgangskodeModal from '../components/SkiftAdgangskodeModal';

function MinKontoPage(): ReactElement {
    const { state, dispatch } = useAppState();
    const { currentUser, isAuthChecking } = state;
    const [visRedigerModal, setVisRedigerModal] = useState(false);
    const [visSkiftKodeModal, setVisSkiftKodeModal] = useState(false);
    const [updatingPref, setUpdatingPref] = useState(false);

    const handleUpdateLinkPreference = async (updates: any) => {
        if (!currentUser || updatingPref) return;
        setUpdatingPref(true);
        try {
            const updatedUser = await api.patch<any>('/kerne/me/', updates);
            dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
        } catch (e) {
            console.error("Fejl ved opdatering af præference:", e);
        } finally {
            setUpdatingPref(false);
        }
    };

    if (isAuthChecking) {
        return (
            <div className="p-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-500">Henter brugeroplysninger...</span>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="p-8 flex flex-col justify-center items-center text-center">
                <Shield className="h-12 w-12 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Du er ikke logget ind</h2>
                <p className="text-gray-600 mb-6">For at se din konto, skal du være logget ind i systemet.</p>
                <Link
                    to="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Gå til Login
                </Link>
            </div>
        );
    }

    // Bestem rolle-tekst
    let rolleTekst = "Sagsbehandler";
    if (currentUser.is_superuser) rolleTekst = "Systemadministrator";
    else if (currentUser.is_staff) rolleTekst = "Personale";

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                Min Konto
                <HelpButton helpPointCode="MINKONTO_HELP" />
            </h1>

            <div className="space-y-4">

                {/* Profil Kort */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
                    <div className="flex justify-between items-start mb-3">
                        <h2 className="text-base font-semibold text-gray-700 flex items-center">
                            <UserCircle size={20} className="mr-2 text-blue-600" />
                            Personlige Oplysninger
                        </h2>
                        <Button onClick={() => setVisRedigerModal(true)} variant="secondary" className="text-xs py-1 h-7">
                            Rediger
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Fornavn</label>
                            <div className="text-gray-900 font-medium">{currentUser.first_name || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Efternavn</label>
                            <div className="text-gray-900 font-medium">{currentUser.last_name || "-"}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Email</label>
                            <div className="flex items-center text-gray-900">
                                <Mail size={14} className="mr-2 text-gray-400" />
                                {currentUser.email}
                            </div>
                        </div>

                        {/* Extended Profile Fields */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Arbejdstelefon</label>
                            <div className="text-gray-900">{currentUser.work_phone || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Privat telefon</label>
                            <div className="text-gray-900">{currentUser.private_phone || "-"}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Privat adresse</label>
                            <div className="text-gray-900 whitespace-pre-wrap">{currentUser.private_address || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Personlig Farve</label>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                    style={{ backgroundColor: currentUser.color || '#2563EB' }}
                                ></div>
                                <span className="text-gray-900 text-sm font-medium">{currentUser.color || '#2563EB'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Indstillinger Kort */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
                    <h2 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                        <Settings size={20} className="mr-2 text-gray-600" />
                        Indstillinger
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <div className="flex items-center mb-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mr-2">
                                    Hvordan vil du åbne linkede dokumenter?
                                </label>
                                <Tooltip content={
                                    <div className="text-xs">
                                        <p className="mb-2 italic border-b border-gray-600 pb-1">Gælder, når du åbner dokumenter linket til en aktivitet fra aktivitetslisten.</p>
                                        <p className="font-bold mb-1">Nyt Vindue:</p>
                                        <p className="mb-2">Åbner dokumentet i et 'popup' vindue uden browserens værktøjslinjer. Godt hvis du har flere skærme.</p>
                                        <p className="font-bold mb-1">Ny Fane:</p>
                                        <p>Åbner dokumentet i en helt ny fane i din browser. Standard adfærd for de fleste hjemmesider.</p>
                                    </div>
                                }>
                                    <CircleHelp size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                                </Tooltip>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => handleUpdateLinkPreference({ preferred_link_open_mode: 'window' })}
                                    className={`flex-1 flex items-center p-3 border rounded-md transition-all ${currentUser.preferred_link_open_mode === 'window'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <AppWindow size={18} className={`mr-3 ${currentUser.preferred_link_open_mode === 'window' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <div className="text-left">
                                        <div className="text-sm font-semibold">Nyt Vindue</div>
                                        <div className="text-[10px] text-gray-500">Åbner som en popup</div>
                                    </div>
                                    {currentUser.preferred_link_open_mode === 'window' && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600"></div>}
                                </button>

                                <button
                                    onClick={() => handleUpdateLinkPreference({ preferred_link_open_mode: 'tab' })}
                                    className={`flex-1 flex items-center p-3 border rounded-md transition-all ${currentUser.preferred_link_open_mode === 'tab'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <ExternalLink size={18} className={`mr-3 ${currentUser.preferred_link_open_mode === 'tab' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <div className="text-left">
                                        <div className="text-sm font-semibold">Ny Fane</div>
                                        <div className="text-[10px] text-gray-500">Åbner i en ny browserfane</div>
                                    </div>
                                    {currentUser.preferred_link_open_mode === 'tab' && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600"></div>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 border-t pt-4">
                        <div className="flex items-center mb-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mr-2">
                                Aktivitet Sortering
                            </label>
                            <Tooltip content="Vælg om aktivitetslister skal sorteres efter nummer (standard) eller alfabetisk efter navn.">
                                <CircleHelp size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                            </Tooltip>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => handleUpdateLinkPreference({ aktivitet_sortering: 'nummer' })}
                                className={`flex-1 flex items-center p-3 border rounded-md transition-all ${(!currentUser.aktivitet_sortering || currentUser.aktivitet_sortering === 'nummer')
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <ArrowDown01 size={18} className={`mr-3 ${(!currentUser.aktivitet_sortering || currentUser.aktivitet_sortering === 'nummer') ? 'text-blue-600' : 'text-gray-400'}`} />
                                <div className="text-left">
                                    <div className="text-sm font-semibold">Nummerorden</div>
                                    <div className="text-[10px] text-gray-500">1, 2, 3...</div>
                                </div>
                                {(!currentUser.aktivitet_sortering || currentUser.aktivitet_sortering === 'nummer') && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600"></div>}
                            </button>

                            <button
                                onClick={() => handleUpdateLinkPreference({ aktivitet_sortering: 'alfabetisk' })}
                                className={`flex-1 flex items-center p-3 border rounded-md transition-all ${currentUser.aktivitet_sortering === 'alfabetisk'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <ArrowDownAZ size={18} className={`mr-3 ${currentUser.aktivitet_sortering === 'alfabetisk' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <div className="text-left">
                                    <div className="text-sm font-semibold">Alfabetisk</div>
                                    <div className="text-[10px] text-gray-500">A - Å</div>
                                </div>
                                {currentUser.aktivitet_sortering === 'alfabetisk' && <div className="ml-auto w-2 h-2 rounded-full bg-blue-600"></div>}
                            </button>
                        </div>
                    </div>
                </div>


                {/* Sikkerhed Kort */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
                    <h2 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                        <Shield size={20} className="mr-2 text-green-600" />
                        Adgang og Sikkerhed
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4 mb-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Brugernavn</label>
                            <div className="text-gray-900">{currentUser.username}</div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Rolle i systemet</label>
                            <div className="flex items-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${currentUser.is_superuser ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {rolleTekst}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-900 mb-2">Adgangskode</h3>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                            <div className="flex items-center">
                                <Key size={16} className="text-gray-400 mr-3" />
                                <span className="text-gray-600 text-sm">********</span>
                            </div>
                            <Button onClick={() => setVisSkiftKodeModal(true)} variant="secondary" className="text-xs py-1 h-7">
                                Skift kode
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Support Kort */}
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300">
                    <h2 className="text-base font-semibold text-gray-700 flex items-center mb-3">
                        <Monitor size={20} className="mr-2 text-orange-600" />
                        Support & Hjælp
                    </h2>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-orange-50 p-3 rounded-md border border-orange-200 gap-3">
                        <div className="flex flex-col">
                            <span className="text-gray-800 text-sm font-bold">Teknisk Support</span>
                            <span className="text-gray-600 text-xs mt-0.5">
                                Hvis supporten beder om adgang til din skærm, kan du bruge dette link.
                            </span>
                        </div>
                        <a
                            href="https://remotedesktop.google.com/support/?pli=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shrink-0"
                        >
                            Fjernstyring support
                        </a>
                    </div>
                </div>

            </div>



            <RedigerProfilModal
                isOpen={visRedigerModal}
                onClose={() => setVisRedigerModal(false)}
            />

            <SkiftAdgangskodeModal
                isOpen={visSkiftKodeModal}
                onClose={() => setVisSkiftKodeModal(false)}
            />
        </div >
    );
}

export default MinKontoPage;