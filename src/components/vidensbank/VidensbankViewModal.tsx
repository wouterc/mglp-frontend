import React from 'react';
import Modal from '../Modal';
import { Viden } from '../../types';
import { X, ExternalLink, FileText, Calendar, User, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';

interface VidensbankViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    viden?: Viden;
}

const VidensbankViewModal: React.FC<VidensbankViewModalProps> = ({ isOpen, onClose, viden }) => {
    if (!viden) return null;

    const headerBtn = (
        <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-bold transition-all shadow-md text-sm mr-2"
        >
            Luk visning
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={viden.titel} wide headerActions={headerBtn}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Meta Header */}
                <div className="flex flex-wrap gap-4 items-center text-xs text-gray-500 border-b border-gray-100 pb-4">
                    <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md font-bold uppercase tracking-wider"
                        style={{
                            backgroundColor: (viden.kategori_details?.farve || '#2563eb') + '15',
                            color: viden.kategori_details?.farve || '#2563eb'
                        }}
                    >
                        <Tag size={14} />
                        {viden.kategori_details?.navn || 'Ukendt kategori'}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <User size={14} />
                        Oprettet af {viden.oprettet_af_details?.first_name || 'System'}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(viden.oprettet).toLocaleDateString()}
                    </div>
                </div>

                {/* Content Area */}
                <div
                    className="prose prose-blue max-w-none text-gray-800 vidensbank-content ql-editor !p-0"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viden.indhold) }}
                />

                {/* Attachments & Links Footer */}
                {(viden.link || viden.fil) && (
                    <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-4">
                        {viden.link && (
                            <a
                                href={viden.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-sm border border-blue-100"
                            >
                                <ExternalLink size={18} />
                                Åbn Eksternt Link
                            </a>
                        )}
                        {viden.fil && (
                            <a
                                href={viden.fil}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-semibold text-sm border border-green-100"
                            >
                                <FileText size={18} />
                                Se Vedhæftet Dokument
                            </a>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default VidensbankViewModal;
