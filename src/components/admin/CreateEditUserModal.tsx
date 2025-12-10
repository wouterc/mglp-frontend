import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { API_BASE_URL } from '../../config';

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
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                setPassword('');
            }
        }
    }, [isOpen, userToEdit]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = userToEdit
                ? `${API_BASE_URL}/kerne/users/${userToEdit.id}/`
                : `${API_BASE_URL}/kerne/users/`;

            const method = userToEdit ? 'PATCH' : 'POST';

            const body: any = {
                username,
                first_name: firstName,
                last_name: lastName,
                email,
                is_active: isActive,
                is_superuser: isSuperuser,
                is_staff: isSuperuser, // Superusers are also staff usually
                profile: {
                    work_phone: workPhone,
                    private_phone: privatePhone,
                    private_address: privateAddress
                }
            };

            // Only send password if it's set (required for create, optional for update)
            if (password) {
                body.password = password;
            } else if (!userToEdit) {
                // Creating user without password? backend might reject or set unusable
                // Let's require it for create
                throw new Error("Adgangskode er påkrævet ved oprettelse.");
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });

            if (res.ok) {
                onUserSaved();
                onClose();
            } else {
                const data = await res.json();
                setError(JSON.stringify(data));
            }

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
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <form onSubmit={handleSave} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            {userToEdit ? 'Rediger Bruger' : 'Opret Ny Bruger'}
                        </h3>

                        {error && <div className="bg-red-50 text-red-600 p-2 text-sm rounded mb-4 break-words">{error}</div>}

                        <div className="grid grid-cols-1 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
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

                            {/* Profile Fields */}
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Privat adresse</label>
                                <textarea
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows={2}
                                    value={privateAddress}
                                    onChange={e => setPrivateAddress(e.target.value)}
                                />
                            </div>

                            <PasswordInput
                                label={userToEdit ? "Ny Adgangskode (valgfri)" : "Adgangskode"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required={!userToEdit}
                            />

                            <div className="flex items-center space-x-4 mt-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                    />
                                    <span className="ml-2 text-sm text-gray-900">Aktiv</span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                                        checked={isSuperuser}
                                        onChange={e => setIsSuperuser(e.target.checked)}
                                    />
                                    <span className="ml-2 text-sm text-gray-900">Superbruger (Admin)</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                            <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center">
                                {loading ? 'Gemmer...' : 'Gem'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={onClose} className="mt-3 w-full justify-center sm:mt-0">
                                Annuller
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
