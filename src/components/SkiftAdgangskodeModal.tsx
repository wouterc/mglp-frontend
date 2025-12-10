import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import Button from './ui/Button';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

import { useAppState } from '../StateContext';

import { PasswordInput } from './ui/PasswordInput';

const SkiftAdgangskodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { state } = useAppState();
    const { currentUser } = state;

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    // @# Nulstil felter når modalen lukkes/åbnes
    React.useEffect(() => {
        if (!isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setRepeatPassword('');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen]);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setError(null);
        setSuccess(false);

        if (!currentPassword || !newPassword || !repeatPassword) {
            setError("Alle felter skal udfyldes.");
            return;
        }

        if (newPassword !== repeatPassword) {
            setError("De nye adgangskoder er ikke ens.");
            return;
        }

        setIsSaving(true);

        try {
            const res = await fetch(API_BASE_URL + '/kerne/users/set_password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                // Håndter specifikke fejl fra backend
                if (data.current_password) {
                    throw new Error(data.current_password[0]);
                }
                // Check if there is a general error message
                if (data.error) {
                    throw new Error(data.error);
                }
                if (data.detail) {
                    throw new Error(data.detail);
                }

                throw new Error("Kunne ikke skifte adgangskode.");
            }

            setSuccess(true);

            // Nulstil felter efter kort tid eller lad brugeren lukke manuelt
            setTimeout(() => {
                onClose();
                // Nulstil state til næste gang
                setCurrentPassword('');
                setNewPassword('');
                setRepeatPassword('');
                setSuccess(false);
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Der skete en fejl.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Skift Adgangskode">
            <form onSubmit={handleSave} className="space-y-4">
                {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">{error}</div>}
                {success && <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">Adgangskoden er ændret korrekt! Lukker...</div>}

                {/* Hidden input to help browser identify user */}
                <input
                    type="hidden"
                    name="username"
                    value={currentUser?.username || ''}
                    autoComplete="username"
                />

                <PasswordInput
                    label="Nuværende adgangskode"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                />

                <PasswordInput
                    label="Ny adgangskode"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                />

                <PasswordInput
                    label="Gentag ny adgangskode"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    autoComplete="new-password"
                />

                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving || success} type="button">Annuller</Button>
                    <Button variant="primary" type="submit" disabled={isSaving || success}>
                        {isSaving ? 'Gemmer...' : 'Skift Kode'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SkiftAdgangskodeModal;
