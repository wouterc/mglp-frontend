import React, { useState, useEffect } from 'react';
import { Opgave } from '../../types';
import { opgaveService } from '../../services/opgaveService';
import { X, Search, RotateCcw, ExternalLink } from 'lucide-react';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: () => void;
    onTaskClick: (opgave: Opgave) => void;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, onRestore, onTaskClick }) => {
    const [tasks, setTasks] = useState<Opgave[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchArchived = async () => {
        setIsLoading(true);
        try {
            const data = await opgaveService.getArchived();
            setTasks(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArchived();
    }, []);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleRestore = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await opgaveService.restore(id);
            onRestore(); // Refresh main board
            fetchArchived(); // Refresh archive list
        } catch (err) {
            console.error(err);
        }
    };

    const filteredTasks = tasks.filter(t =>
        t.titel.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Arkiverede Opgaver</h2>
                        <p className="text-xs text-gray-500">Se og gendan afsluttede eller arkiverede opgaver</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Søg i arkivet..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-2 border-transparent focus:bg-white focus:border-blue-500 transition-all outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[300px]">
                    {isLoading ? (
                        <div className="py-20 text-center text-gray-400 italic">Henter arkiv...</div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="space-y-1">
                            {filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl cursor-pointer group transition-all border border-transparent hover:border-blue-100"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="font-bold text-gray-800 truncate">{task.titel}</div>
                                        <div className="text-[10px] text-gray-400 flex gap-2">
                                            <span>#{task.id}</span>
                                            <span>•</span>
                                            <span>{new Date(task.opdateret).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleRestore(task.id, e)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition"
                                        >
                                            <RotateCcw size={14} />
                                            Gendan
                                        </button>
                                        <div className="p-1.5 text-gray-300">
                                            <ExternalLink size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-gray-400 italic">Ingen arkiverede opgaver fundet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchiveModal;
