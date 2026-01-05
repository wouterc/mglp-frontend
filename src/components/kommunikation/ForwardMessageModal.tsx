import React, { useState } from 'react';
import { User, Team } from '../../types_kommunikation';
import { User as UserType } from '../../types';
import { X } from 'lucide-react';

interface ForwardMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onForward: (recipientId: number, recipientType: 'user' | 'team') => void;
    users: UserType[];
    teams: Team[];
    currentUser: UserType;
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({ isOpen, onClose, onForward, users, teams, currentUser }) => {
    const [selectedType, setSelectedType] = useState<'user' | 'team'>('user');
    const [selectedRecipientId, setSelectedRecipientId] = useState<number | undefined>(undefined);

    if (!isOpen) return null;

    const handleForward = () => {
        if (!selectedRecipientId) return;
        onForward(selectedRecipientId, selectedType);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Videresend Besked</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    id="forward-type-user"
                                    type="radio"
                                    name="forwardType"
                                    value="user"
                                    checked={selectedType === 'user'}
                                    onChange={() => { setSelectedType('user'); setSelectedRecipientId(undefined); }}
                                    className="mr-2"
                                    aria-label="Videresend til Person"
                                />
                                Person
                            </label>
                            <label className="flex items-center">
                                <input
                                    id="forward-type-team"
                                    type="radio"
                                    name="forwardType"
                                    value="team"
                                    checked={selectedType === 'team'}
                                    onChange={() => { setSelectedType('team'); setSelectedRecipientId(undefined); }}
                                    className="mr-2"
                                    aria-label="Videresend til Team"
                                />
                                Team
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Modtager
                        </label>
                        <select
                            id="forward-recipient-select"
                            name="forwardRecipient"
                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedRecipientId || ''}
                            onChange={(e) => setSelectedRecipientId(Number(e.target.value))}
                            aria-label="Vælg modtager"
                        >
                            <option value="">Vælg modtager...</option>
                            {selectedType === 'user' ? (
                                users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.first_name} {user.last_name}
                                    </option>
                                ))
                            ) : (
                                teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.navn}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Annuller
                    </button>
                    <button
                        onClick={handleForward}
                        disabled={!selectedRecipientId}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Videresend
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardMessageModal;
