// --- Fil: src/hooks/useDebounce.ts ---
import { useState, useEffect } from 'react';

// Denne custom hook tager en værdi og en forsinkelse.
// Den returnerer kun den nye værdi, når der ikke er tastet i 'delay' millisekunder.
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Ryd op i timeren, hvis 'value' eller 'delay' ændres
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;