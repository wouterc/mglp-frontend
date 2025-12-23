import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateContext';
import { api } from '../api';
import Modal from './Modal';
import Button from './ui/Button';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const RedigerProfilModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useAppState();
    const { currentUser } = state;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [workPhone, setWorkPhone] = useState('');
    const [privatePhone, setPrivatePhone] = useState('');
    const [privateAddress, setPrivateAddress] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser && isOpen) {
            setFirstName(currentUser.first_name || '');
            setLastName(currentUser.last_name || '');
            setEmail(currentUser.email || '');
            setWorkPhone(currentUser.work_phone || '');
            setPrivatePhone(currentUser.private_phone || '');
            setPrivateAddress(currentUser.private_address || '');
            setError(null);
        }
    }, [currentUser, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const updatedUser = await api.patch<any>('/kerne/me/', {
                first_name: firstName,
                last_name: lastName,
                email: email,
                work_phone: workPhone,
                private_phone: privatePhone,
                private_address: privateAddress
            });

            // Opdater global state
            dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });

            onClose();
        } catch (err) {
            console.error(err);
            setError("Der skete en fejl. Prøv igen.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rediger Profil">
            <div className="space-y-4">
                {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Fornavn</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Efternavn</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Arbejdstelefon</label>
                    <input
                        type="text"
                        value={workPhone}
                        onChange={(e) => setWorkPhone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Privat telefon</label>
                    <input
                        type="text"
                        value={privatePhone}
                        onChange={(e) => setPrivatePhone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Privat adresse</label>
                    <textarea
                        rows={3}
                        value={privateAddress}
                        onChange={(e) => setPrivateAddress(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Annuller</Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Gemmer...' : 'Gem Ændringer'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RedigerProfilModal;
