// --- Fil: src/components/SearchableSelect.tsx ---
// @# 2025-11-22 11:05 - Oprettet genbrugelig søgbar dropdown.
import React, { useState, useEffect, useRef, ReactElement } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SearchableOption {
  id: number;
  label: string;
  subLabel?: string;
  isHighlight?: boolean; // Bruges til at fremhæve (f.eks. kommunematch)
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: number | null;
  onChange: (newValue: number | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Vælg...", 
  label, 
  disabled = false,
  emptyMessage = "Ingen resultater fundet"
}: SearchableSelectProps): ReactElement {
  
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Luk dropdown hvis man klikker udenfor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(''); // Nulstil søgning ved luk
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fokusér input når den åbnes
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (id: number) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      {/* Selve "knappen" der ligner et input-felt */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
        `}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-800'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <div className="flex items-center">
          {selectedOption && !disabled && (
            <button 
              onClick={handleClear} 
              className="p-1 mr-1 text-gray-400 hover:text-red-500 rounded-full"
              title="Ryd valg"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Dropdown listen */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 flex flex-col">
          {/* Søgefelt i toppen */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg..."
                className="w-full p-1 pl-7 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Resultatliste */}
          <ul className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 italic text-center">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map(opt => (
                <li
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`
                    px-3 py-2 text-sm cursor-pointer flex justify-between items-center
                    ${opt.id === value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
                    ${opt.isHighlight ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-gray-500">{opt.subLabel}</span>}
                  </div>
                  {opt.id === value && <Check size={14} />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;