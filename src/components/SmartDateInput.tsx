// --- Fil: src/components/SmartDateInput.tsx ---
// @# 2025-09-15 16:22 - Oprettet ny komponent til smart håndtering af dato-input.
// @# 2025-09-15 16:35 - Ændret til <input type="text"> for at give fuld kontrol over smart-logik.
import React, { useState, useEffect, FocusEvent, MouseEvent } from 'react';

interface SmartDateInputProps {
  value: string | null; // Forventer altid YYYY-MM-DD format
  onSave: (value: string | null) => void;
  className?: string;
}

// Hjælpefunktion til at formatere dato til DD-MM-YYYY for pænere visning
const formatDateForDisplay = (isoDate: string | null): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  // Get last 2 digits of year
  const shortYear = parts[0].length === 4 ? parts[0].substring(2) : parts[0];
  return `${parts[2]}-${parts[1]}-${shortYear}`;
};

function SmartDateInput({ value, onSave, className }: SmartDateInputProps): React.ReactElement {
  const [displayValue, setDisplayValue] = useState(formatDateForDisplay(value));

  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const input = e.target.value.trim();

    // Hvis input er tomt, gem null
    if (input === '') {
      if (value !== null) onSave(null);
      return;
    }

    // Hvis brugeren ikke ændrede noget meningsfuldt
    if (formatDateForDisplay(value) === input) {
      return;
    }

    const today = new Date();
    let newDate: Date | null = null;

    // Tjek for format "d/M" eller "d-M"
    const dayMonthMatch = input.match(/^(\d{1,2})[./-](\d{1,2})$/);

    // Tjek for fuldt format "d-M-yyyy", "d/M/yyyy" eller "d.M.yyyy"
    const fullDateMatch = input.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

    if (fullDateMatch) {
      const day = parseInt(fullDateMatch[1], 10);
      const month = parseInt(fullDateMatch[2], 10) - 1;
      let year = parseInt(fullDateMatch[3], 10);
      // Håndter 2-cifret årstal (antag 20xx)
      if (year < 100) year += 2000;
      newDate = new Date(year, month, day);
    }
    else if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1], 10);
      const month = parseInt(dayMonthMatch[2], 10) - 1; // JS months are 0-indexed
      newDate = new Date(today.getFullYear(), month, day);
    }
    // Tjek for kun dag "d"
    else if (/^\d{1,2}$/.test(input)) {
      const day = parseInt(input, 10);
      if (day >= today.getDate()) {
        newDate = new Date(today.getFullYear(), today.getMonth(), day);
      } else {
        newDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
      }
    } else {
      // Forsøg at parse input som en almindelig dato (hvis brugeren selv skriver)
      // Bemærk: new Date("dd-mm-yyyy") virker ofte ikke, derfor er regex ovenfor vigtig
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        newDate = parsed;
      }
    }

    if (newDate && !isNaN(newDate.getTime())) {
      // Formatér til YYYY-MM-DD for at gemme
      const year = newDate.getFullYear();
      const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
      const day = newDate.getDate().toString().padStart(2, '0');
      const formattedToSave = `${year}-${month}-${day}`;

      // Opdater kun hvis den nye dato er anderledes end den gamle
      if (formattedToSave !== value) {
        onSave(formattedToSave);
      }
      setDisplayValue(formatDateForDisplay(formattedToSave));

    } else {
      // Hvis input ikke genkendes, nulstil til den oprindelige værdi
      setDisplayValue(formatDateForDisplay(value));
    }
  };

  // Viser browserens datovælger, når man klikker på tekstfeltet
  const showPicker = (e: MouseEvent<HTMLInputElement>) => {
    try {
      (e.target as HTMLInputElement).showPicker();
    } catch (error) {
      // Nogle browsere understøtter ikke showPicker()
      console.error("showPicker() is not supported by this browser.");
    }
  }

  return (
    <input
      type="text" // Ændret til text for fuld kontrol
      value={displayValue}
      placeholder="dd-mm-åå"
      onChange={(e) => setDisplayValue(e.target.value)}
      onBlur={handleBlur}
      onClick={showPicker}
      className={className}
    />
  );
}

export default SmartDateInput;