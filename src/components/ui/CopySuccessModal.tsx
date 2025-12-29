
import React from 'react';
import { X, CheckCircle, Copy } from 'lucide-react';

interface CopySuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    text: string;
}

export default function CopySuccessModal({ isOpen, onClose, title, text }: CopySuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
                    <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle size={18} />
                        {title}
                    </h3>
                    <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-2 text-sm font-medium">Følgende tekst er kopieret til udklipsholderen:</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto shadow-inner">
                        {text}
                    </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
