import React, { useState, useEffect } from 'react';
import Modal from '../Modal';

interface RenameFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newName: string) => void;
    title: string;
    prefix?: string;
    initialName: string; // The base name without prefix (and potentially without extension)
    extension?: string;  // e.g. ".pdf"
    isLoading?: boolean;
}

const RenameFileModal: React.FC<RenameFileModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    prefix = '',
    initialName,
    extension = '',
    isLoading = false
}) => {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
        }
    }, [isOpen, initialName]);

    const handleConfirm = () => {
        if (!name.trim()) return;

        // Append extension if provided and not already there
        let finalName = name.trim();
        if (extension && !finalName.toLowerCase().endsWith(extension.toLowerCase())) {
            finalName += extension;
        }

        onConfirm(finalName);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        Annuller
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !name.trim()}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isLoading ? 'Gemmer...' : 'Gem'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nyt filnavn
                        {extension && <span className="text-gray-400 font-normal ml-1">(filtypen {extension} bevares)</span>}
                    </label>
                    <div className="flex items-center gap-0">
                        {prefix && (
                            <div className="text-gray-500 font-mono text-sm select-none bg-gray-50 px-3 py-2 rounded-l-md border border-gray-300 border-r-0 h-[38px] flex items-center">
                                {prefix}
                            </div>
                        )}
                        <input
                            autoFocus
                            type="text"
                            className={`flex-1 border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all ${prefix ? 'rounded-r-md' : 'rounded-md'}`}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                            placeholder="Indtast navn..."
                        />
                    </div>
                </div>
                {prefix && (
                    <p className="text-[11px] text-gray-400">
                        Filnavnet vil automatisk starte med sagsnummeret ({prefix}).
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default RenameFileModal;
