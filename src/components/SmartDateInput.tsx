import React, { useState, useEffect, FocusEvent, MouseEvent } from 'react';
import Tooltip from './Tooltip';

interface SmartDateInputProps {
  value: string | null; // Forventer altid YYYY-MM-DD format
  onSave: (value: string | null) => void;
  className?: string;
}

// Hjælpefunktion til at formatere dato til DD-MM-YY for pænere visning
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
    const input = e.target.value.trim().toLowerCase();

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
    today.setHours(0, 0, 0, 0);
    let newDate: Date | null = null;

    // Tjek for relative genveje (+2, -1 osv)
    const relativeMatch = input.match(/^([+-])(\d+)$/);

    // Tjek for ugedag (ma, ti, on, to, fr, lø, sø)
    const weekdaysDk = ['sø', 'ma', 'ti', 'on', 'to', 'fr', 'lø'];
    const weekdayIdx = weekdaysDk.indexOf(input);

    // Tjek for format "d/M" eller "d-M"
    const dayMonthMatch = input.match(/^(\d{1,2})[./-](\d{1,2})$/);

    // Tjek for fuldt format "d-M-yyyy", "d/M/yyyy" eller "d.M.yyyy"
    const fullDateMatch = input.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

    if (relativeMatch) {
      const sign = relativeMatch[1] === '+' ? 1 : -1;
      const days = parseInt(relativeMatch[2], 10);
      newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (sign * days));
    }
    else if (weekdayIdx !== -1) {
      const currentDay = today.getDay(); // 0 = søndag
      let diff = weekdayIdx - currentDay;
      if (diff <= 0) diff += 7; // Altid næste forekomst
      newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    }
    else if (input === 'i dag' || input === 'idag' || input === 'id') {
      newDate = today;
    }
    else if (input === 'imorgen' || input === 'i morgen' || input === 'im') {
      newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }
    else if (fullDateMatch) {
      const day = parseInt(fullDateMatch[1], 10);
      const month = parseInt(fullDateMatch[2], 10) - 1;
      let year = parseInt(fullDateMatch[3], 10);
      if (year < 100) year += 2000;
      newDate = new Date(year, month, day);
    }
    else if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1], 10);
      const month = parseInt(dayMonthMatch[2], 10) - 1;
      let tempDate = new Date(today.getFullYear(), month, day);
      if (tempDate < today) {
        tempDate = new Date(today.getFullYear() + 1, month, day);
      }
      newDate = tempDate;
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
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        newDate = parsed;
      }
    }

    if (newDate && !isNaN(newDate.getTime())) {
      const year = newDate.getFullYear();
      const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
      const day = newDate.getDate().toString().padStart(2, '0');
      const formattedToSave = `${year}-${month}-${day}`;

      if (formattedToSave !== value) {
        onSave(formattedToSave);
      }
      setDisplayValue(formatDateForDisplay(formattedToSave));
    } else {
      setDisplayValue(formatDateForDisplay(value));
    }
  };

  const showPicker = (e: MouseEvent<HTMLInputElement>) => {
    try {
      (e.target as HTMLInputElement).showPicker();
    } catch (error) {
      console.error("showPicker() is not supported by this browser.");
    }
  }

  const tooltipHtml = (
    <div className="text-[11px] leading-relaxed">
      <div className="font-bold border-b border-gray-600 mb-1 pb-1">Smarte genveje:</div>
      <ul className="space-y-0.5">
        <li><span className="text-blue-300 font-mono">+n / -n:</span> n dage fra i dag (f.eks. +2)</li>
        <li><span className="text-blue-300 font-mono">nn:</span> Næste d. nn (f.eks. 21)</li>
        <li><span className="text-blue-300 font-mono">dd/mm:</span> Næste dd. mm. (f.eks. 21/12)</li>
        <li><span className="text-blue-300 font-mono">ma, ti...:</span> Næste ugedag</li>
        <li><span className="text-blue-300 font-mono">id / im:</span> I dag / I morgen</li>
      </ul>
    </div>
  );

  return (
    <Tooltip content={tooltipHtml}>
      <input
        type="text"
        value={displayValue}
        placeholder="dd-mm-åå"
        onChange={(e) => setDisplayValue(e.target.value)}
        onBlur={handleBlur}
        onClick={showPicker}
        className={className}
      />
    </Tooltip>
  );
}

export default SmartDateInput;