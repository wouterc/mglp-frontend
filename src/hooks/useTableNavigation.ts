// --- Fil: src/hooks/useTableNavigation.ts ---
// @# 2025-09-15 16:40 - Oprettet en genbrugelig hook til tabel-navigation med piletaster.
// @# 2025-09-15 17:15 - Rettet type-definition til at acceptere en 'ref', der kan være null.
import { useEffect, RefObject } from 'react';

export function useTableNavigation(tableRef: RefObject<HTMLTableElement | null>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        return;
      }

      const target = event.target as HTMLElement;
      // Vi reagerer kun, hvis vi er inde i et input, select, eller en knap
      if (!target || !['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) {
        return;
      }

      event.preventDefault();

      const currentCell = target.closest('td');
      const currentRow = target.closest('tr');
      if (!currentCell || !currentRow) return;

      const cellsInRow = Array.from(currentRow.querySelectorAll('td'));
      const currentCellIndex = cellsInRow.indexOf(currentCell);

      let nextElement: HTMLElement | null = null;

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        let nextRow = (event.key === 'ArrowUp' ? currentRow.previousElementSibling : currentRow.nextElementSibling) as HTMLTableRowElement | null;
        
        // Hop over gruppe-headere
        while (nextRow && nextRow.querySelectorAll('td').length <= 1) {
            nextRow = (event.key === 'ArrowUp' ? nextRow.previousElementSibling : nextRow.nextElementSibling) as HTMLTableRowElement | null;
        }

        if (nextRow) {
          const nextCell = nextRow.querySelectorAll('td')[currentCellIndex];
          if (nextCell) {
            nextElement = nextCell.querySelector('input, select, button');
          }
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const nextCell = (event.key === 'ArrowLeft' ? currentCell.previousElementSibling : currentCell.nextElementSibling) as HTMLTableCellElement | null;
          if (nextCell) {
              nextElement = nextCell.querySelector('input, select, button');
          }
      }

      if (nextElement) {
        nextElement.focus();
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [tableRef]);
}