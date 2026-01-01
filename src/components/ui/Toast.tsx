import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', isVisible, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-green-500" />;
            case 'error': return <AlertCircle size={20} className="text-red-500" />;
            default: return <Info size={20} className="text-blue-500" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-white border-green-500';
            case 'error': return 'bg-white border-red-500';
            default: return 'bg-white border-blue-500';
        }
    };

    return (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${getColors()}`}>
            {getIcon()}
            <p className="text-gray-800 font-medium text-sm">{message}</p>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
