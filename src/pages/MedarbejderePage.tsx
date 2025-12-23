import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAppState } from '../StateContext';
import { Mail, Phone, User, Users } from 'lucide-react';

interface Employee {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    work_phone?: string;
    is_online: boolean; // Computed by backend
}

const MedarbejderePage: React.FC = () => {
    const { state } = useAppState();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const data = await api.get<any[]>('/kerne/users/');
                const active = data.filter((u: any) => u.is_active);
                setEmployees(active);
            } catch (err: any) {
                console.error(err);
                setError("Kunne ikke hente medarbejderliste. (Manglende rettigheder?)");
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    // Helper to format name
    const getName = (u: Employee) => {
        if (u.first_name || u.last_name) return `${u.first_name} ${u.last_name}`.trim();
        return u.username;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="text-blue-600" /> Medarbejdere
                </h1>
                <p className="text-gray-500">Oversigt over dine kollegaer.</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            {loading ? (
                <div className="text-center py-10">Henter liste...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col relative">
                            {/* Online Indicator */}
                            <div className={`absolute top-4 right-4 flex items-center gap-1 text-xs font-medium ${emp.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-3 h-3 rounded-full ${emp.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                {emp.is_online ? 'Online' : 'Offline'}
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {getName(emp).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{getName(emp)}</h3>
                                    <p className="text-sm text-gray-500">{emp.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mt-auto">
                                {emp.work_phone && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Phone size={16} className="mr-2 text-gray-400" />
                                        {emp.work_phone}
                                    </div>
                                )}
                                <div className="flex items-center text-sm text-gray-600">
                                    <Mail size={16} className="mr-2 text-gray-400" />
                                    <a href={`mailto:${emp.email}`} className="hover:text-blue-600">{emp.email}</a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MedarbejderePage;
