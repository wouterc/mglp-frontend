import React, { ReactElement, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../StateContext';
import { User, Shield, Mail, Key, Loader2, UserCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import RedigerProfilModal from '../components/RedigerProfilModal';
import SkiftAdgangskodeModal from '../components/SkiftAdgangskodeModal';

function MinKontoPage(): ReactElement {
    const { state } = useAppState();
    const { currentUser, isAuthChecking } = state;
    const [visRedigerModal, setVisRedigerModal] = useState(false);
    const [visSkiftKodeModal, setVisSkiftKodeModal] = useState(false);

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Min Konto</h1>

            <div className="space-y-6">

                {/* Profil Kort */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                            <UserCircle size={24} className="mr-2 text-blue-600" />
                            Personlige Oplysninger
                        </h2>
                        <Button onClick={() => setVisRedigerModal(true)} variant="secondary" className="text-xs">
                            Rediger
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fornavn</label>
                            <div className="text-gray-900 text-lg">{currentUser.first_name || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Efternavn</label>
                            <div className="text-gray-900 text-lg">{currentUser.last_name || "-"}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <div className="flex items-center text-gray-900">
                                <Mail size={16} className="mr-2 text-gray-400" />
                                {currentUser.email}
                            </div>
                        </div>

                        {/* Extended Profile Fields */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Arbejdstelefon</label>
                            <div className="text-gray-900">{currentUser.work_phone || "-"}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Privat telefon</label>
                            <div className="text-gray-900">{currentUser.private_phone || "-"}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Privat adresse</label>
                            <div className="text-gray-900 whitespace-pre-wrap">{currentUser.private_address || "-"}</div>
                        </div>
                    </div>
                </div>

                {/* Sikkerhed Kort */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-700 flex items-center mb-4">
                        <Shield size={24} className="mr-2 text-green-600" />
                        Adgang og Sikkerhed
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brugernavn</label>
                            <div className="text-gray-900">{currentUser.username}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rolle i systemet</label>
                            <div className="flex items-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentUser.is_superuser ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {rolleTekst}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Adgangskode</h3>
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md border border-gray-200">
                            <div className="flex items-center">
                                <Key size={20} className="text-gray-400 mr-3" />
                                <span className="text-gray-600 text-sm">********</span>
                            </div>
                            <Button onClick={() => setVisSkiftKodeModal(true)} variant="secondary" className="text-xs">
                                Skift kode
                            </Button>
                        </div>
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
        </div>
    );
}

export default MinKontoPage;