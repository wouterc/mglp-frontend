// --- Fil: src/components/Modal.tsx ---
// @# 2025-09-15 14:20 - Oprettet en ny, genbrugelig Modal-komponent til beskeder og dialoger.
import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  maxWidth?: string; // New prop
}

function Modal({ isOpen, onClose, title, children, footer, headerActions, maxWidth = 'max-w-md' }: ModalProps): React.ReactElement | null {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={onClose} // Luk ved klik på baggrunden
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} m-4`}
        onClick={(e) => e.stopPropagation()} // Forhindrer at klik inde i modalen lukker den
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200" title="Annuller (Esc)">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;