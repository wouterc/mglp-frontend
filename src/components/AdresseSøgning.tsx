// --- Fil: src/components/AdresseSøgning.tsx ---

//@@ 2025-09-09 15:00 - Deaktiveret browser autocomplete for at tillade keyboard-navigation
import React, { useState, useEffect, ReactElement, KeyboardEvent } from 'react';
import useDebounce from '../hooks/useDebounce.js';

// --- Type-definitioner ---
interface DawaAdresse {
  id: string;
  adressebetegnelse: string;
  vejnavn: string;
  husnr: string;
  etage: string | null;
  dør: string | null;
  postnr: string;
  postnrnavn: string;
  href: string;
}

interface DawaAutocompleteResult {
  tekst: string;
  adresse: DawaAdresse;
}

interface AdresseSøgningProps {
  onAdresseValgt: (adresse: DawaAdresse) => void;
}

function AdresseSøgning({ onAdresseValgt }: AdresseSøgningProps): ReactElement {
  const [søgning, setSøgning] = useState<string>('');
  const [resultater, setResultater] = useState<DawaAutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const debouncedSøgning = useDebounce(søgning, 300);

  useEffect(() => {
    const fetchAdresser = async () => {
      if (typeof debouncedSøgning !== 'string' || debouncedSøgning.length < 3) {
        setResultater([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`https://api.dataforsyningen.dk/adresser/autocomplete?q=${debouncedSøgning}`);
        const data: DawaAutocompleteResult[] = await response.json();
        setResultater(Array.isArray(data) ? data : []);
        setActiveIndex(-1);
      } catch (error) {
        console.error("Fejl ved hentning af adresser fra DAWA:", error);
        setResultater([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdresser();
  }, [debouncedSøgning]);

  const handleSelectAdresse = (adresse: DawaAdresse) => {
    onAdresseValgt(adresse);
    setSøgning(adresse.adressebetegnelse || '');
    setResultater([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (resultater.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prevIndex => (prevIndex < resultater.length - 1 ? prevIndex + 1 : prevIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        handleSelectAdresse(resultater[activeIndex].adresse);
      }
    } else if (e.key === 'Escape') {
      setResultater([]);
    }
  };

  return (
    <div className="relative">
      <label htmlFor="adresse-soeg" className="block text-sm font-medium text-gray-700">Søg adresse</label>
      <input
        id="adresse-soeg"
        type="text"
        value={søgning}
        onChange={(e) => setSøgning(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        placeholder="Start med at skrive en adresse..."
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      {isLoading && <div className="p-2 text-sm text-gray-500">Søger...</div>}
      {resultater.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
          {resultater.map((res, index) => (
            <li
              key={res.adresse.id}
              onClick={() => handleSelectAdresse(res.adresse)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`p-2 cursor-pointer ${index === activeIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              {res.tekst}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdresseSøgning;