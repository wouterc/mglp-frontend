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
  wide?: boolean;
}

function Modal({ isOpen, onClose, title, children, footer, headerActions, maxWidth = 'max-w-md', wide }: ModalProps): React.ReactElement | null {
  const resolvedMaxWidth = wide ? 'max-w-4xl' : maxWidth;
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
        className={`bg-white rounded-lg shadow-xl w-full ${resolvedMaxWidth} m-4 max-h-[95vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Forhindrer at klik inde i modalen lukker den
      >
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200" title="Annuller (Esc)">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;