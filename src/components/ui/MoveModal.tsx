import React, { useState, useEffect } from 'react';
import { X, Folder, Search } from 'lucide-react';
import Modal from '../Modal';
import Button from './Button';
import { api } from '../../api';

interface FolderItem {
    name: string;
    path: string;
}

interface MoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (targetPath: string) => void;
    itemName: string;
    sagId: number;
}

const MoveModal: React.FC<MoveModalProps> = ({ isOpen, onClose, onMove, itemName, sagId }) => {
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchFolders();
            setSelectedPath(null);
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const data = await api.get<FolderItem[]>(`/sager/filer/list_all_folders/?sag_id=${sagId}`);
            setFolders(data);
        } catch (err) {
            console.error("Kunne ikke hente mapper", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.path.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Flyt "${itemName}"`}
            footer={
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose}>Annuller</Button>
                    <Button
                        variant="primary"
                        onClick={() => selectedPath !== null && onMove(selectedPath)}
                        disabled={selectedPath === null}
                    >
                        Flyt hertil
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Søg efter mappe..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="border border-gray-100 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Henter mapper...</div>
                    ) : filteredFolders.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">Ingen mapper fundet</div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredFolders.map((f) => (
                                <button
                                    key={f.path}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selectedPath === f.path ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                    onClick={() => setSelectedPath(f.path)}
                                >
                                    <Folder size={18} className={selectedPath === f.path ? 'text-blue-600' : 'text-gray-400'} />
                                    <div>
                                        <div className="font-medium text-sm">{f.name}</div>
                                        {f.path && <div className="text-[10px] opacity-60">{f.path}</div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MoveModal;
