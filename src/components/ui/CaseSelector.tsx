
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { api } from '../../api';

export interface SearchResult {
    id: number;
    sags_nr: string;
    alias: string;
}

interface CaseSelectorProps {
    value: number | null;
    onChange: (id: number) => void;
    placeholder?: string;
    className?: string;
}

export default function CaseSelector({ value, onChange, placeholder = "Søg efter sag...", className = "" }: CaseSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCaseLabel, setSelectedCaseLabel] = useState<string>('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial fetch of alias if value is present (conditionally)
    useEffect(() => {
        if (value) {
            api.get<any>(`/sager/${value}/`).then(res => {
                setSelectedCaseLabel(`${res.sags_nr}${res.alias ? ' - ' + res.alias : ''}`);
            }).catch(() => {
                setSelectedCaseLabel(`Sag #${value}`);
            });
        } else {
            setSelectedCaseLabel('');
        }
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchTerm.length < 2) {
                setResults([]);
                setActiveIndex(-1);
                return;
            }
            setLoading(true);
            try {
                const data = await api.get<SearchResult[]>(`/sager/search/?q=${searchTerm}`);
                setResults(data);
                setIsOpen(true);
                setActiveIndex(data.length > 0 ? 0 : -1);
            } catch (e) {
                console.error("Fejl ved søgning:", e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (item: SearchResult) => {
        onChange(item.id);
        setSelectedCaseLabel(`${item.sags_nr}${item.alias ? ' - ' + item.alias : ''}`);
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (results.length > 0 ? (prev + 1) % results.length : -1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < results.length) {
                handleSelect(results[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className="flex items-center border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer hover:border-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Search size={16} className="text-gray-400 mr-2" />
                <span className={`flex-grow text-sm ${!selectedCaseLabel ? 'text-gray-400' : 'text-gray-700'}`}>
                    {selectedCaseLabel || placeholder}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            type="text"
                            placeholder="Indtast sagsnr eller navn..."
                            className="w-full text-sm p-1 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {loading && <div className="p-2 text-xs text-center text-gray-500">Søger...</div>}
                    {!loading && results.map((r, index) => (
                        <div
                            key={r.id}
                            className={`p-2 text-sm cursor-pointer flex justify-between items-center ${index === activeIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-gray-700'}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => handleSelect(r)}
                        >
                            <span><span className={`font-mono font-medium ${index === activeIndex ? 'text-white' : 'text-gray-900'}`}>{r.sags_nr}</span> {r.alias && `- ${r.alias}`}</span>
                            {value === r.id && <Check size={14} className={index === activeIndex ? 'text-white' : 'text-blue-600'} />}
                        </div>
                    ))}
                    {!loading && searchTerm.length >= 2 && results.length === 0 && (
                        <div className="p-2 text-xs text-center text-gray-500">Ingen resultater</div>
                    )}
                </div>
            )}
        </div>
    );
}
