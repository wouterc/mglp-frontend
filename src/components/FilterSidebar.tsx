// --- Fil: src/components/FilterSidebar.tsx ---
// @# 2025-09-15 17:50 - Oprettet en ny, genbrugelig FilterSidebar-komponent.
// @# 2025-09-15 18:55 - Flyttet ikoner tilbage til toppen og sikret højre-justering.
import React, { ReactNode } from 'react';
import { SlidersHorizontal, FunnelX } from 'lucide-react';
import { useAppState } from '../StateContext';

interface FilterSidebarProps {
  children: ReactNode;
  onNulstil: () => void;
}

function FilterSidebar({ children, onNulstil }: FilterSidebarProps): React.ReactElement {
  const { state, dispatch } = useAppState();
  const { erFilterMenuAaben } = state;

  return (
    <aside className={`bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${erFilterMenuAaben ? 'w-72' : 'w-16'}`}>
      {/* @# 2025-09-15 18:55 - Ikon-sektion flyttet til toppen. */}
      <div className="flex-shrink-0 p-2 flex flex-col items-center w-full">
        <button 
          onClick={() => dispatch({ type: 'TOGGLE_FILTER_MENU' })} 
          className={`p-2 rounded-md hover:bg-gray-200 text-gray-600 ${erFilterMenuAaben ? 'self-end' : ''}`}
          title={erFilterMenuAaben ? 'Skjul filtre' : 'Vis filtre'}
        >
          <SlidersHorizontal size={20} />
        </button>
        <button 
          onClick={onNulstil} 
          className={`mt-2 p-2 rounded-md hover:bg-gray-200 text-gray-600 ${erFilterMenuAaben ? 'self-end' : ''}`}
          title="Nulstil filtre"
        >
          <FunnelX size={20} />
        </button>
      </div>

      <div className={`flex-grow overflow-y-auto transition-opacity duration-300 ${erFilterMenuAaben ? 'opacity-100 px-4' : 'opacity-0'}`}>
        {erFilterMenuAaben && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 border-t pt-4">Filtre</h3>
            {children}
          </div>
        )}
      </div>
    </aside>
  );
}

export default FilterSidebar;