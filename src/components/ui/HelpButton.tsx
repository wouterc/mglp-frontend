import React, { useState } from 'react';
import { HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { Viden } from '../../types';
import VidensbankViewModal from '../vidensbank/VidensbankViewModal';

interface HelpButtonProps {
    helpPointCode?: string;
    label?: string;
    className?: string;
}

const HelpButton: React.FC<HelpButtonProps> = ({ helpPointCode, label, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [articles, setArticles] = useState<Viden[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<Viden | undefined>(undefined);

    const fetchData = async () => {
        if (!helpPointCode) return [];
        if (articles.length > 0) return articles;
        setLoading(true);
        try {
            const res = await api.get<any>(`/vidensbank/punkter/?kode_navn=${helpPointCode}`);
            const list = Array.isArray(res.results) ? res.results : res;
            const fetched = list[0]?.artikler_details || [];

            setArticles(fetched);
            return fetched;
        } catch (error) {
            console.error("Fejl ved hentning af hjælp:", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleClick = async () => {
        const data = await fetchData();
        if (data.length === 1) {
            setSelectedArticle(data[0]);
            setIsOpen(true);
        } else if (data.length > 1) {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    const handleSelectArticle = (v: Viden) => {
        setSelectedArticle(v);
        setIsOpen(true);
        setIsMenuOpen(false);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={handleClick}
                className={`flex items-center justify-center gap-1.5 rounded-lg transition-all font-bold border shadow-sm group ${label
                    ? 'px-3 py-1.5 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 text-sm'
                    : 'w-8 h-8 bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500 hover:text-black'
                    }`}
                title={label || "Få hjælp"}
            >
                {loading ? (
                    <Loader2 size={label ? 16 : 18} className="animate-spin" />
                ) : (
                    <HelpCircle size={label ? 16 : 18} className="group-hover:scale-110 transition-transform" />
                )}
                {label && <span>{label}</span>}
            </button>

            {isMenuOpen && articles.length > 1 && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border-2 border-amber-400 overflow-hidden z-[1000] animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-3 bg-amber-400 text-amber-950">
                        <span className="text-[10px] font-black uppercase tracking-widest">Vælg vejledning</span>
                    </div>
                    <div className="py-1 bg-amber-50 max-h-96 overflow-y-auto custom-scrollbar">
                        {articles.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => handleSelectArticle(v)}
                                className="w-full text-left px-4 py-3 text-sm text-amber-900 hover:bg-white hover:text-amber-600 transition-all flex items-center justify-between group border-b border-amber-100 last:border-0"
                            >
                                <span className="font-bold truncate mr-2">{v.titel}</span>
                                <ChevronRight size={16} className="text-amber-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedArticle && (
                <VidensbankViewModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    viden={selectedArticle}
                />
            )}

            {/* Overlay to close menu when clicking outside */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-[900]"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default HelpButton;
