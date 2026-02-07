import React from 'react';
import { Archive } from 'lucide-react';

interface ArchiveDropZoneProps {
    onClick: () => void;
    isOver?: boolean;
}

const ArchiveDropZone: React.FC<ArchiveDropZoneProps> = ({ onClick, isOver }) => {
    return (
        <div
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${isOver
                    ? 'bg-red-50 border-red-500 text-red-600 scale-105 shadow-xl z-[100]'
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:border-gray-300'
                }
            `}
        >
            <Archive size={18} className={isOver ? 'animate-bounce' : ''} />
            <span className="text-sm font-bold">Arkiv</span>
        </div>
    );
};

export default ArchiveDropZone;
