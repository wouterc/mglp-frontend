import React, { useEffect, useState } from 'react';
import { useAppState } from '../../StateContext';
import { api } from '../../api';
import Button from '../../components/ui/Button';
import { Plus, Edit, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

import { CreateEditUserModal } from '../../components/admin/CreateEditUserModal';
import { UserActivityModal } from '../../components/admin/UserActivityModal';

interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean; // Admin access
    is_superuser: boolean; // Superadmin
    is_active: boolean;
    last_login: string | null;
    is_online: boolean; // Added
    opgave_sortering?: number;
    er_sagsbehandler?: boolean;
}

const UserListPage: React.FC = () => {
    const { state } = useAppState();
    const { currentUser } = state;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get<User[]>('/kerne/users/');
            setUsers(data);
        } catch (e: any) {
            console.error(e);
            setError("Kunne ikke hente brugerliste. Du har muligvis ikke adgang.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleShowActivity = (user: User) => {
        setSelectedUser(user);
        setIsActivityModalOpen(true);
    };

    const handleUserSaved = () => {
        fetchUsers();
    };

    if (!currentUser?.is_superuser) {
        return <div className="p-8 text-center text-red-600">Du har ikke adgang til denne side.</div>;
    }

    return (
        <div className="flex-1 h-full overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldAlert className="text-blue-600" /> Administration
                    </h1>
                    <p className="text-gray-500">Administrer brugere og rettigheder.</p>
                </div>
                <Button variant="primary" onClick={handleCreate} ikon={Plus}>
                    Opret Bruger
                </Button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

            {loading ? (
                <div className="text-center py-10">Indlæser brugere...</div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bruger</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Navn</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Opgave Sortering">Sort</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Er Sagsbehandler">SB</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.first_name} {user.last_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.is_superuser ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Superadmin
                                            </span>
                                        ) : user.is_staff ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Personale
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Bruger
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleShowActivity(user)}
                                            title="Klik for at se login historik"
                                            className="focus:outline-none transition-transform hover:scale-110 relative inline-block"
                                        >
                                            <div
                                                className={`h-6 w-6 rounded-full mx-auto shadow-sm flex items-center justify-center text-[10px] text-white font-bold ${(user as any).color ? '' : (user.is_online ? 'bg-green-500' : 'bg-gray-300')}`}
                                                style={{ backgroundColor: (user as any).color || undefined }}
                                            >
                                                {(user as any).color ? (user.username.substring(0, 1).toUpperCase()) : ''}
                                                {user.is_online && (
                                                    <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-400" />
                                                )}
                                            </div>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {user.is_active ? (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle size={16} className="mr-1" /> Aktiv
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-red-600">
                                                <XCircle size={16} className="mr-1" /> Inaktiv
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                        {user.opgave_sortering || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        {user.er_sagsbehandler ? (
                                            <CheckCircle size={16} className="text-green-500 mx-auto" />
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                                            onClick={() => handleEdit(user)}
                                        >
                                            <Edit size={16} className="mr-1" /> Rediger
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateEditUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userToEdit={selectedUser}
                onUserSaved={handleUserSaved}
            />

            <UserActivityModal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                user={selectedUser}
            />
        </div>
    );
};

export default UserListPage;
