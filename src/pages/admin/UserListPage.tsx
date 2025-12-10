import React, { useEffect, useState } from 'react';
import { useAppState } from '../../StateContext';
import { API_BASE_URL } from '../../config';
import Button from '../../components/ui/Button';
import { Plus, Edit, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

import { CreateEditUserModal } from '../../components/admin/CreateEditUserModal';

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
}

const UserListPage: React.FC = () => {
    const { state } = useAppState();
    const { currentUser } = state;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/kerne/users/`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setError("Kunne ikke hente brugerliste. Du har muligvis ikke adgang.");
            }
        } catch (e) {
            console.error(e);
            setError("Netværksfejl.");
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

    const handleUserSaved = () => {
        fetchUsers();
    };

    if (!currentUser?.is_superuser) {
        return <div className="p-8 text-center text-red-600">Du har ikke adgang til denne side.</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldAlert className="text-blue-600" /> Administration
                    </h1>
                    <p className="text-gray-500">Administrer brugere og rettigheder.</p>
                </div>
                <Button variant="primary" onClick={handleCreate} className="flex items-center whitespace-nowrap">
                    <Plus size={18} className="mr-2" /> Opret Bruger
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
        </div>
    );
};

export default UserListPage;
