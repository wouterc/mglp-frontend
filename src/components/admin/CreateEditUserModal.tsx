import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { api } from '../../api';
import type { DawaAdresse } from '../../types';
import AdresseSøgning from '../AdresseSøgning';

interface User {
    id?: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    work_phone?: string;
    private_phone?: string;
    private_address?: string;
    opgave_sortering?: number;
    er_sagsbehandler?: boolean;
    color?: string;
}

interface CreateEditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit?: User | null; // If null, we are creating a new user
    onUserSaved: () => void; // Callback to refresh list
}

export const CreateEditUserModal: React.FC<CreateEditUserModalProps> = ({ isOpen, onClose, userToEdit, onUserSaved }) => {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [workPhone, setWorkPhone] = useState('');
    const [privatePhone, setPrivatePhone] = useState('');
    const [privateAddress, setPrivateAddress] = useState('');
    const [opgaveSortering, setOgaveSortering] = useState(0);
    const [erSagsbehandler, setErSagsbehandler] = useState(true);
    const [color, setColor] = useState('#2563EB');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (userToEdit) {
                setUsername(userToEdit.username);
                setFirstName(userToEdit.first_name);
                setLastName(userToEdit.last_name);
                setEmail(userToEdit.email);
                setIsActive(userToEdit.is_active);
                setIsSuperuser(userToEdit.is_superuser);
                setWorkPhone(userToEdit.work_phone || '');
                setPrivatePhone(userToEdit.private_phone || '');
                setPrivateAddress(userToEdit.private_address || '');
                setOgaveSortering(userToEdit.opgave_sortering || 0);
                setErSagsbehandler(userToEdit.er_sagsbehandler ?? true);
                setColor(userToEdit.color || '#2563EB');
                setPassword(''); // Never show existing password
            } else {
                // Reset for create
                setUsername('');
                setFirstName('');
                setLastName('');
                setEmail('');
                setIsActive(true);
                setIsSuperuser(false);
                setWorkPhone('');
                setPrivatePhone('');
                setPrivateAddress('');
                setOgaveSortering(0);
                setErSagsbehandler(true);
                setColor('#2563EB');
                setPassword('');
            }
        }
    }, [isOpen, userToEdit]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = userToEdit
                ? `/kerne/users/${userToEdit.id}/`
                : `/kerne/users/`;

            const body: any = {
                username,
                first_name: firstName,
                last_name: lastName,
                email,
                is_active: isActive,
                is_superuser: isSuperuser,
                is_staff: isSuperuser, // Superusers are also staff usually
                work_phone: workPhone,
                private_phone: privatePhone,
                private_address: privateAddress,
                opgave_sortering: opgaveSortering,
                er_sagsbehandler: erSagsbehandler,
                color: color
            };

            // Only send password if it's set (required for create, optional for update)
            if (password) {
                body.password = password;
            } else if (!userToEdit) {
                throw new Error("Adgangskode er påkrævet ved oprettelse.");
            }

            if (userToEdit) {
                await api.patch(endpoint, body);
            } else {
                await api.post(endpoint, body);
            }

            onUserSaved();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Der skete en fejl.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <form onSubmit={handleSave} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {userToEdit ? 'Rediger Bruger' : 'Opret Ny Bruger'}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">Luk</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {error && <div className="bg-red-50 text-red-600 p-2 text-sm rounded mb-4 break-words">{error}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Column 1: Identity */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">Konto Oplysninger</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Brugernavn</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fornavn</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Efternavn</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <PasswordInput
                                    label={userToEdit ? "Ny Adgangskode (valgfri)" : "Adgangskode"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required={!userToEdit}
                                />
                            </div>



                            {/* Column 2: Contact */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">Kontakt Info</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Arbejdstelefon</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={workPhone}
                                        onChange={e => setWorkPhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Privat telefon</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={privatePhone}
                                        onChange={e => setPrivatePhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <AdresseSøgning onAdresseValgt={(adresse: DawaAdresse) => setPrivateAddress(adresse.adressebetegnelse)} />
                                    <label className="block text-sm font-medium text-gray-700 mt-2">Privat adresse</label>
                                    <textarea
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        rows={6}
                                        value={privateAddress}
                                        onChange={e => setPrivateAddress(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Column 3: Settings */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">Indstillinger</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Personlig Farve</label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <span className="text-sm text-gray-500">Vælg farve</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700" title="Bruges til sortering i opgavelister. 0 = Skjult, 1 = Øverst, 100 = Nederst.">
                                        Opgave Sortering (0-100)
                                    </label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={opgaveSortering}
                                        onChange={e => setOgaveSortering(Number(e.target.value))}
                                        min={0}
                                        max={100}
                                    />
                                </div>

                                <div className="pt-4 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-green-600 border-gray-300 rounded"
                                            checked={erSagsbehandler}
                                            onChange={e => setErSagsbehandler(e.target.checked)}
                                        />
                                        <span className="text-sm text-gray-900 font-medium">Er Sagsbehandler</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            checked={isActive}
                                            onChange={e => setIsActive(e.target.checked)}
                                        />
                                        <span className="text-sm text-gray-900">Aktiv</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                                            checked={isSuperuser}
                                            onChange={e => setIsSuperuser(e.target.checked)}
                                        />
                                        <span className="text-sm text-gray-900">Superbruger (Admin)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Annuller (ESC)
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading} className="min-w-[100px]">
                                {loading ? 'Gemmer...' : 'Gem'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
