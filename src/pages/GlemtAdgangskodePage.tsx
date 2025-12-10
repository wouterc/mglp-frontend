import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';

const GlemtAdgangskodePage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/kerne/password_reset/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                // Vi viser ikke specifikke fejl for at undgå email enumeration
                // Men hvis det er en 400 'Ugyldig email', kan vi sige "Tjek venligst emailen".
                // Backend sender altid 200 hvis form er valid, men 400 hvis email mangler.
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                throw new Error("Kunne ikke sende anmodning.");
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
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Tjek din indbakke</h2>
                    <p className="text-gray-600 mb-6">
                        Hvis der findes en bruger med emailen <strong>{email}</strong>, har vi sendt et link til at nulstille din adgangskode.
                    </p>
                    <p className="text-sm text-gray-500 mb-8">
                        Det kan tage et par minutter. Husk at tjekke spam-mappen.
                    </p>
                    <Link to="/login">
                        <Button variant="primary" className="w-full justify-center">
                            Tilbage til Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
                <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                    <ArrowLeft size={16} className="mr-1" />
                    Tilbage ti login
                </Link>

                <div className="flex justify-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Mail className="text-blue-600 h-8 w-8" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Glemt adgangskode?</h1>
                <p className="text-center text-gray-600 mb-6 text-sm">
                    Indtast din email-adresse, så sender vi dig et link til at nulstille din din adgangskode.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="f.eks. navn@mglp.dk"
                            required
                        />
                    </div>

                    <Button type="submit" variant="primary" className="w-full justify-center" disabled={isSubmitting}>
                        {isSubmitting ? 'Sender...' : 'Send link'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default GlemtAdgangskodePage;
