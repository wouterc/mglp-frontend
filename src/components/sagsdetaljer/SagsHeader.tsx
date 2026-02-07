import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List, Info, ListTodo, Files, Mail, Inbox } from 'lucide-react';
import { Sag } from '../../types';
import HelpButton from '../ui/HelpButton';

interface SagsHeaderProps {
    sag: Sag;
    activePage: 'oversigt' | 'detaljer' | 'aktiviteter' | 'dokumenter' | 'sagsmail' | 'mailkurv';
    rightContent?: ReactNode;
    bottomContent?: ReactNode;
    onBack?: () => void; // Optional custom back handler
    helpPointCode?: string;
}

export default function SagsHeader({ sag, activePage, rightContent, bottomContent, onBack, helpPointCode }: SagsHeaderProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    const navItems = [
        { id: 'oversigt', label: 'Oversigt', icon: List, path: '/sagsoversigt' },
        { id: 'detaljer', label: 'Detaljer', icon: Info, path: `/sagsdetaljer?sag_id=${sag.id}` },
        { id: 'aktiviteter', label: 'Aktiviteter', icon: ListTodo, path: `/aktiviteter?sag_id=${sag.id}` },
        { id: 'dokumenter', label: 'Dokumenter', icon: Files, path: `/dokumenter?sag_id=${sag.id}` },
        { id: 'sagsmail', label: 'Sagsmail', icon: Mail, path: `/sagsmail?sag_id=${sag.id}` },
        { id: 'mailkurv', label: 'Mailkurv', icon: Inbox, path: `/mailkurv?sag_id=${sag.id}` },
    ];


    return (
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 flex flex-col">
            <div className="flex justify-between items-center px-6 py-3 gap-4">

                {/* Venstre side: Tilbage + Titel */}
                <div className="flex items-center space-x-4 flex-1">
                    <button
                        onClick={handleBack}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        title="Gå tilbage"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xl font-bold text-gray-800 truncate flex items-center gap-2">
                            Sag {sag.sags_nr}: {sag.alias}
                        </h1>
                        <div className="text-sm text-gray-500 flex items-center space-x-2 truncate">
                            <span className="truncate">{sag.adresse_vej} {sag.adresse_husnr}</span>
                            <span className="text-gray-300">|</span>
                            <span className={`font-medium ${sag.status?.status_kategori === 9 ? 'text-red-600' : 'text-green-600'}`}>
                                {sag.status?.beskrivelse || 'Ukendt status'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center space-x-1 mx-4">
                    {navItems.map((item) => {
                        const isActive = activePage === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-colors ${isActive
                                    ? 'text-blue-700 bg-blue-50'
                                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                title={item.label}
                            >
                                <Icon size={20} />
                                <span className="text-[10px] uppercase font-semibold mt-0.5">{item.label}</span>
                            </button>
                        );
                    })}

                    <div className="pl-2 border-l border-gray-200 ml-2">
                        <HelpButton helpPointCode={helpPointCode || 'SAGSDETALJER_HELP'} />
                    </div>
                </div>

                {/* Højre side: Custom Content (Search, Actions, etc.) */}
                <div className="flex-1 flex justify-end items-center gap-2">
                    {rightContent}
                </div>
            </div>

            {/* Bottom Content / Secondary Row */}
            {bottomContent && (
                <div className="px-6 pb-3 pt-0 flex items-center">
                    <div className="ml-[52px]">
                        {bottomContent}
                    </div>
                </div>
            )}
        </div>
    );
}
