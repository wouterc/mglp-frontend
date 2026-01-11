import React, { useEffect, useState } from 'react';
import { X, Clock, MapPin } from 'lucide-react';
import { api } from '../../api';

interface LogEntry {
    id: number;
    login_timestamp: string;
    logout_timestamp: string | null;
    last_active_timestamp: string;
    ip_address: string;
    device_info: string;
}

interface UserActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: number;
        username: string;
    } | null;
}

export const UserActivityModal: React.FC<UserActivityModalProps> = ({ isOpen, onClose, user }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            const fetchLogs = async () => {
                setLoading(true);
                try {
                    const data = await api.get<LogEntry[]>(`/kerne/users/${user.id}/activity_logs/`);
                    setLogs(data);
                } catch (error) {
                    console.error('Error fetching activity logs:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchLogs();
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4 border-bottom pb-2">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                <Clock className="text-blue-600" size={20} /> Sidste 10 login registrationer: {user?.username}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X size={24} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Henter logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">Ingen logs fundet.</div>
                        ) : (
                            <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enhed</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sidst aktiv</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logout</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {formatDate(log.login_timestamp)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {log.device_info}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                                    {formatDate(log.last_active_timestamp)}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                    <span className={log.logout_timestamp ? "text-gray-600" : "text-green-600 font-medium"}>
                                                        {log.logout_timestamp ? formatDate(log.logout_timestamp) : "Aktiv nu"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                                                    {log.ip_address}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Luk
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
