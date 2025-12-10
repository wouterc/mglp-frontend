import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAppState } from '../StateContext';
import { Lock, User } from 'lucide-react';
import Button from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';

const LoginPage: React.FC = () => {
    const { dispatch } = useAppState();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/kerne/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                const user = await res.json();
                dispatch({ type: 'SET_CURRENT_USER', payload: user });
                // Redirect sker automatisk via App.tsx logic eller vi navigerer manuelt her hvis nødvendigt
                // Men da currentUser opdateres, vil App.tsx (hvis den lytter) reagere. 
                // Bedre er at navigere til forsiden:
                window.location.href = '/';
            } else {
                const data = await res.json();
                console.log("Login error response:", data); // @# Debugging
                // Check common DRF error fields
                const errorMessage = data.error || data.detail || JSON.stringify(data);
                setError(errorMessage || 'Login fejlede');
            }
        } catch (err) {
            console.error(err);
            setError('Der skete en netværksfejl');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Lock className="text-blue-600 h-8 w-8" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Log ind</h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brugernavn</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Indtast brugernavn"
                                required
                            />
                        </div>
                    </div>

                    <PasswordInput
                        label="Adgangskode"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Indtast adgangskode"
                        required
                    />

                    <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
                        {loading ? 'Logger ind...' : 'Log ind'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Har du glemt din adgangskode?</p>
                    <Link to="/glemt-adgangskode" className="text-blue-600 hover:underline">
                        Nulstil den her
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
