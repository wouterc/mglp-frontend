
import React from 'react';
import Modal from '../Modal';
import Button from '../ui/Button';
import { ExternalLink, AppWindow } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onSave: (mode: 'window' | 'tab') => void;
    onClose: () => void; // Allow closing (though we might want to force a choice or treat close as cancel)
}

const LinkOpenPreferenceModal: React.FC<Props> = ({ isOpen, onSave, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Hvordan vil du åbne dokumenter?">
            <div className="space-y-6 p-2">
                <p className="text-gray-600 text-sm">
                    Du åbner nu en side med linkede dokumenter. Hvordan foretrækker du at denne side åbner?
                    <br />
                    <span className="text-xs text-gray-500 italic">Du kan altid ændre dette senere under "Min Konto".</span>
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onSave('window')}
                        className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                        <AppWindow size={48} className="text-gray-400 group-hover:text-blue-600 mb-3" />
                        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Nyt Vindue</span>
                        <span className="text-xs text-gray-400 mt-1 text-center">Som et selvstændigt popup-vindue</span>
                    </button>

                    <button
                        onClick={() => onSave('tab')}
                        className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                        <ExternalLink size={48} className="text-gray-400 group-hover:text-blue-600 mb-3" />
                        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Ny Fane</span>
                        <span className="text-xs text-gray-400 mt-1 text-center">Som en ny fane i din browser</span>
                    </button>
                </div>

                <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={onClose} className="text-xs text-gray-400">
                        Annuller
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default LinkOpenPreferenceModal;
