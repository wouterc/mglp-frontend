// --- Fil: src/components/sagsdetaljer/SagsdetaljerLayout.tsx ---
// @# 2025-11-22 17:30 - Oprettet layout til sagsdetaljer med venstre-menu og top-navigation.
// @# 2025-11-23 10:00 - Fjernet rediger-knap (flyttet til tab). Tilføjet global søgning i top-bar.
import React, { ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Building2, User, Landmark, LifeBuoy,
    Building, MapPin, Waves, ChevronLeft, ChevronRight,
    ArrowLeft, Search, Loader2, MailPlus
} from 'lucide-react';
import { Sag } from '../../types';
import { useAppState } from '../../StateContext';
import useDebounce from '../../hooks/useDebounce';
import { api } from '../../api';

export type TabType = 'overblik' | 'maegler' | 'saelgere' | 'koebere' | 'bank' | 'raadgivere' | 'forening' | 'kommune' | 'forsyning';

interface SagsdetaljerLayoutProps {
    children: ReactNode;
    sag: Sag;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onBack: () => void;
    onNavigateToSag: (id: number) => void;
}

const MENU_ITEMS: { id: TabType; label: string; icon: any }[] = [
    { id: 'overblik', label: 'Overblik', icon: LayoutDashboard },
    { id: 'maegler', label: 'Mægler', icon: Building2 },
    { id: 'saelgere', label: 'Sælgere', icon: User },
    { id: 'koebere', label: 'Købere', icon: User },
    { id: 'bank', label: 'Bank', icon: Landmark },
    { id: 'raadgivere', label: 'Rådgivere', icon: LifeBuoy },
    { id: 'forening', label: 'Forening', icon: Building },
    { id: 'kommune', label: 'Kommune', icon: MapPin },
    { id: 'forsyning', label: 'Forsyning', icon: Waves },
];

function SagsdetaljerLayout({
    children,
    sag,
    activeTab,
    onTabChange,
    onBack,
    onNavigateToSag,
}: SagsdetaljerLayoutProps) {

    const { state } = useAppState();
    const { sagsIdListe } = state;

    // --- SØGNING LOGIK ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number, sags_nr: string, alias: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 300);
    const searchRef = useRef<HTMLDivElement>(null);

    // Luk søgeresultater ved klik udenfor
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside as any);
        return () => document.removeEventListener('mousedown', handleClickOutside as any);
    }, []);

    // Udfør søgning
    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const data = await api.get<any>(`/sager/search/?q=${debouncedSearch}`);
                setSearchResults(data);
                setShowResults(true);
            } catch (error) {
                console.error("Søgefejl:", error);
            } finally {
                setIsSearching(false);
            }
        };
        performSearch();
    }, [debouncedSearch]);

    const handleSelectSearchResult = (id: number) => {
        onNavigateToSag(id);
        setShowResults(false);
        setSearchTerm('');
    };

    // --- NAVIGATION LOGIK ---
    const navState = useMemo(() => {
        if (!sagsIdListe || sagsIdListe.length === 0) return { prev: null, next: null, index: 0, total: 0 };
        const currentIndex = sagsIdListe.indexOf(sag.id);
        if (currentIndex === -1) return { prev: null, next: null, index: 0, total: 0 };
        const prevId = currentIndex > 0 ? sagsIdListe[currentIndex - 1] : null;
        const nextId = currentIndex < sagsIdListe.length - 1 ? sagsIdListe[currentIndex + 1] : null;
        return { prev: prevId, next: nextId, index: currentIndex + 1, total: sagsIdListe.length };
    }, [sagsIdListe, sag.id]);

    return (
        <div className="flex h-full flex-col bg-gray-100">

            {/* --- TOP BAR --- */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10 gap-4">

                {/* Venstre side: Tilbage + Titel */}
                <div className="flex items-center space-x-4 flex-1">
                    <button
                        onClick={onBack}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        title="Tilbage til oversigt"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xl font-bold text-gray-800 truncate">
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

                {/* Midte: Søgefelt */}
                <div className="flex-1 max-w-md relative" ref={searchRef}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Søg sag (nr, alias)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-md text-sm transition-all"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </div>
                    </div>

                    {/* Søgeresultater Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            {searchResults.map(res => (
                                <button
                                    key={res.id}
                                    onClick={() => handleSelectSearchResult(res.id)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                                >
                                    <span className="font-semibold">{res.sags_nr}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-700">{res.alias}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Højre side: Navigation */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {navState.total > 0 && (
                        <span className="text-xs text-gray-400 mr-2">
                            {navState.index} af {navState.total}
                        </span>
                    )}

                    <div className="flex bg-gray-100 rounded-md p-1">
                        <button
                            onClick={() => navState.prev && onNavigateToSag(navState.prev)}
                            disabled={!navState.prev}
                            className="p-2 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                            title="Forrige sag"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => navState.next && onNavigateToSag(navState.next)}
                            disabled={!navState.next}
                            className="p-2 rounded-md text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                            title="Næste sag"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA (Split View) --- */}
            <div className="flex flex-1 overflow-hidden">

                {/* Venstre Menu (Tabs) */}
                <nav className="w-64 bg-white border-r border-gray-200 overflow-y-auto py-4 flex-shrink-0">
                    <div className="space-y-1 px-2">
                        {MENU_ITEMS.map(item => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    className={`
                                        w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md transition-colors
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                                        }
                                    `}
                                >
                                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Højre Indhold (Aktiv Fane) */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
                    <div className="w-full">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}

export default SagsdetaljerLayout;
