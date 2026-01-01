import React, { useState } from 'react';
import { User, Team } from '../../types_kommunikation';
import { User as UserType } from '../../types';

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (team: Partial<Team>) => void;
    users: UserType[];
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSave, users }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            navn: name,
            beskrivelse: description,
            medlemmer: selectedMembers
        });
        onClose();
    };

    const toggleMember = (id: number) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Opret Nyt Team</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Team Navn</label>
                        <input
                            type="text"
                            id="team-name"
                            name="teamName"
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                            id="team-description"
                            name="teamDescription"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vælg Medlemmer</label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 bg-gray-50">
                            {users.map(user => (
                                <div key={user.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`user-${user.id}`}
                                        name="teamMembers"
                                        checked={selectedMembers.includes(user.id)}
                                        onChange={() => toggleMember(user.id)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`user-${user.id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                        {user.first_name} {user.last_name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                            Annuller
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium"
                        >
                            Opret Team
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;
