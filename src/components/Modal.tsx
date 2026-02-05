// --- Fil: src/components/Modal.tsx ---
// @# 2025-09-15 14:20 - Oprettet en ny, genbrugelig Modal-komponent til beskeder og dialoger.
import React, { useEffect, ReactNode } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isMaximized, setIsMaximized] = React.useState(false);
  const resolvedMaxWidth = isMaximized ? 'w-full h-full max-w-none m-0 rounded-none' : (wide ? 'max-w-4xl' : maxWidth);
  // Reset maximized when closed
  useEffect(() => {
    if (!isOpen) setIsMaximized(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const classes = isMaximized
    ? "bg-white shadow-xl w-full h-full m-0 flex flex-col fixed inset-0 z-50 rounded-none"
    : `bg-white rounded-lg shadow-xl w-full ${resolvedMaxWidth} m-4 max-h-[95vh] flex flex-col transition-all duration-200`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className={classes}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-200"
              title={isMaximized ? "Gendan størrelse" : "Maksimer"}
            >
              {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200" title="Luk (Esc)">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 custom-scrollbar flex-1">
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