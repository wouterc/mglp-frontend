import React, { useState, useEffect, useRef, ReactElement } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface MultiSearchableOption {
    value: string;
    label: string;
}

interface MultiSearchableSelectProps {
    options: MultiSearchableOption[];
    selectedValues: string[];
    onChange: (newValues: string[]) => void;
    placeholder?: string;
    label?: string;
    emptyMessage?: string;
    hideSelectedTags?: boolean;
    direction?: 'up' | 'down';
}

export default function MultiSearchableSelect({
    options,
    selectedValues,
    onChange,
    placeholder = "Vælg flere...",
    label,
    emptyMessage = "Ingen resultater fundet",
    hideSelectedTags = false,
    direction = 'down'
}: MultiSearchableSelectProps): ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (inputRef.current) inputRef.current.focus();
            setHighlightedIndex(0);
        }
    }, [isOpen]);

    const unselectedOptions = options.filter(opt => !selectedValues.includes(opt.value));

    const filteredOptions = unselectedOptions.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        setHighlightedIndex(0);
    }, [search, selectedValues]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch('');
            e.preventDefault();
            return;
        }

        if (filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
            scrollToHighlighted(highlightedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
            scrollToHighlighted(highlightedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleToggle(filteredOptions[highlightedIndex].value);
        }
    };

    const scrollToHighlighted = (index: number) => {
        if (!listRef.current) return;
        const items = listRef.current.children;
        if (index >= 0 && index < items.length) {
            const item = items[index] as HTMLElement;
            item.scrollIntoView({ block: 'nearest' });
        }
    };

    const handleToggle = (val: string) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
            setSearch(''); // Nulstill søgning når der tilføjes, så næste er nem at finde
        }
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="w-full relative" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-[38px] p-1.5 border rounded-md bg-white flex justify-between items-center cursor-pointer hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
            >
                <div className="flex flex-wrap gap-1 items-center flex-1">
                    {(hideSelectedTags || selectedValues.length === 0) && <span className="text-gray-500 px-1 text-sm">{placeholder}</span>}
                    {!hideSelectedTags && selectedValues.map(val => {
                        const opt = options.find(o => o.value === val);
                        return (
                            <span key={val} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {opt ? opt.label : val}
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleToggle(val); }} className="ml-1 text-blue-500 hover:text-red-500">
                                    <X size={12} />
                                </button>
                            </span>
                        );
                    })}
                </div>
                <ChevronDown size={16} className="text-gray-400 ml-2 shrink-0 mr-1" />
            </div>

            {isOpen && (
                <div className={`absolute z-50 w-full ${direction === 'up' ? 'bottom-full mb-1' : 'mt-1'} bg-white border border-gray-300 rounded-md shadow-lg flex flex-col max-h-60`}>
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Søg for at tilføje..."
                                className="w-full p-1 pl-7 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>
                    <ul className="overflow-y-auto flex-1 py-1" ref={listRef}>
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500 italic text-center">{emptyMessage}</li>
                        ) : (
                            filteredOptions.map((opt, index) => (
                                <li
                                    key={opt.value}
                                    onClick={(e) => { e.stopPropagation(); handleToggle(opt.value); }}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center ${index === highlightedIndex ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100 text-gray-700'}`}
                                >
                                    <span className="font-medium">{opt.label}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
