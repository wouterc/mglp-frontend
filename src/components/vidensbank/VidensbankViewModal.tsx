import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Modal from '../Modal';
import { Viden } from '../../types';
import { X, ExternalLink, FileText, Calendar, User, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';

interface VidensbankViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    viden?: Viden;
}

const VidensbankViewModal: React.FC<VidensbankViewModalProps> = ({ isOpen, onClose, viden }) => {
    if (!viden) return null;

    const headerBtn = (
        <div className="flex gap-2 mr-2">
            <button
                onClick={() => {
                    const features = 'width=900,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
                    window.open(`/vidensbank-popup?id=${viden.id}`, 'Vejledning', features);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all shadow-md text-sm flex items-center gap-2"
                title="Åbn i nyt vindue"
            >
                <ExternalLink size={16} />
                Nyt vindue
            </button>
            <button
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-bold transition-all shadow-md text-sm"
            >
                Luk visning
            </button>
        </div>
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
                <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-inner overflow-hidden vidensbank-view-read-only">
                    <ReactQuill
                        value={viden.indhold}
                        readOnly={true}
                        theme="bubble"
                        modules={{ toolbar: false }}
                        className="text-gray-900"
                    />
                </div>

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
