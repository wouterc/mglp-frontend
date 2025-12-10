import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

import { PasswordInput } from '../components/ui/PasswordInput';

const NulstilAdgangskodePage: React.FC = () => {
    const { uid, token } = useParams<{ uid: string; token: string }>();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (newPassword !== repeatPassword) {
            setError("Adgangskoderne er ikke ens.");
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/kerne/password_reset/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid,
                    token,
                    new_password: newPassword
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                throw new Error("Kunne ikke nulstille adgangskode. Linket kan være udløbet.");
            }

            setIsSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Der skete en fejl. Prøv igen senere.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200 text-center">
                    <div className="flex justify-center mb-6">
                        <CheckCircle className="text-green-500 h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Adgangskode Nulstillet!</h2>
                    <p className="text-gray-600 mb-8">
                        Din adgangskode er nu ændret. Du kan logge ind med den nye kode.
                    </p>
                    <Link to="/login">
                        <Button variant="primary" className="w-full justify-center">
                            Gå til Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!uid || !token) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200 text-center">
                    <div className="flex justify-center mb-6">
                        <AlertTriangle className="text-red-500 h-12 w-12" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Ugyldigt Link</h2>
                    <p className="text-gray-600 mb-6">
                        Linket mangler nødvendige oplysninger.
                    </p>
                    <Link to="/glemt-adgangskode" className="text-blue-600 hover:underline">
                        Prøv at anmode om et nyt link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Lock className="text-blue-600 h-8 w-8" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Vælg ny adgangskode</h1>
                <p className="text-center text-gray-600 mb-6 text-sm">
                    Indtast din nye adgangskode herunder.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Hidden username field for password manager hinting/updating */}
                    <input type="text" name="username" autoComplete="username" className="hidden" />

                    <PasswordInput
                        label="Ny adgangskode"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    <PasswordInput
                        label="Gentag adgangskode"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    <Button type="submit" variant="primary" className="w-full justify-center" disabled={isSubmitting}>
                        {isSubmitting ? 'Gemmer...' : 'Gem ny adgangskode'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default NulstilAdgangskodePage;
