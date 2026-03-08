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
  id?: string;
  name?: string;
  direction?: 'up' | 'down';
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Vælg...",
  label,
  disabled = false,
  emptyMessage = "Ingen resultater fundet",
  id = "searchable_select_input",
  name = "searchable_select_input",
  direction = 'down'
}: SearchableSelectProps): ReactElement {

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  // Fokusér input når den åbnes og nulstil markeret element
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) inputRef.current.focus();
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  // Nulstil pil-navigation når søgningen ændres
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

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
      handleSelect(filteredOptions[highlightedIndex].id);
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
      {label && <label className="block text-[11px] font-semibold text-gray-700 mb-0.5 leading-tight">{label}</label>}

      {/* Selve "knappen" der ligner et input-felt */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full py-1 px-2 border rounded-md bg-white flex justify-between items-center cursor-pointer min-h-[30px]
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-400'}
          ${isOpen ? 'ring-1 ring-black border-black' : 'border-gray-300'}
        `}
      >
        <span className={`truncate text-xs ${!selectedOption ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
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
        <div className={`absolute z-50 w-full ${direction === 'up' ? 'bottom-full mb-1' : 'mt-1'} bg-white border border-gray-300 rounded-md shadow-lg max-h-60 flex flex-col`}>
          {/* Søgefelt i toppen */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
            <div className="relative">
              <label htmlFor={id} className="sr-only">Søg i listen</label>
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id={id}
                name={name}
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Søg..."
                className="w-full p-1 pl-7 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-blue-400"
                aria-label="Søg i listen"
              />
            </div>
          </div>

          {/* Resultatliste */}
          <ul className="overflow-y-auto flex-1 py-1" ref={listRef}>
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 italic text-center">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    px-3 py-2 text-sm cursor-pointer flex justify-between items-center
                    ${index === highlightedIndex ? 'bg-blue-100 text-blue-900' : opt.id === value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
                    ${opt.isHighlight ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-gray-500">{opt.subLabel}</span>}
                  </div>
                  {opt.id === value && <Check size={14} className="text-blue-600" />}
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