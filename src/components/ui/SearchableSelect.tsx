import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    id?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
    error?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    id,
    label,
    value,
    onChange,
    options,
    placeholder = 'Vælg...',
    required = false,
    className = '',
    disabled = false,
    error = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Find selected option label
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        // Luk dropdown hvis man klikker udenfor
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

    // Filtrer optioner
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
            }
        }
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label htmlFor={id} className={`block text-xs font-medium text-gray-500 mb-0.5 ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
                    {label}
                </label>
            )}

            <div
                className={`bg-white border text-sm rounded cursor-pointer flex items-center justify-between px-2 py-1 h-[30px] shadow-sm 
                    ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500'} 
                    ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : (error ? 'border-red-300 bg-red-50' : 'border-gray-300')}
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex-1 truncate">
                    {selectedOption ? (
                        <span className="text-gray-900">{selectedOption.label}</span>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center ml-1 space-x-1">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            title="Ryd valg"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-hidden flex flex-col">
                    <div className="p-1 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <Search size={12} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Søg..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${opt.value === value ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'}`}
                                    onClick={() => handleSelect(opt.value)}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-xs text-center text-gray-500">
                                Ingen resultater
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
