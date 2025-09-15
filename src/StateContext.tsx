// --- Fil: src/StateContext.tsx ---
import React, { createContext, useReducer, Dispatch, ReactNode, useContext } from 'react';
// @# 2025-09-15 08:15 - Importeret nye typer til skabelonsider
import type { Aktivitet, Sag, SagsoversigtFilterState, SagsoversigtSortConfig, Status, AktiviteterFilterState, Blokinfo, SkabAktivitet, BlokinfoSkabelonerFilterState, AktivitetsskabelonerFilterState } from './types';

// --- 1. Definer formen på din globale state ---
interface AppState {
  aktiviteter: { [key: number]: Aktivitet[] };
  valgtSag: Sag | null;
  isLoadingAktiviteter: boolean;

// @# 2025-09-14 22:15 - Tilføjet state for SagsoversigtPage
  sager: Sag[];
  sagsoversigtFilters: SagsoversigtFilterState;
  sagsoversigtSortConfig: SagsoversigtSortConfig;
  sagsoversigtVisLukkede: boolean;
  sagsoversigtVisAnnullerede: boolean;
  sagsoversigtIsLoading: boolean;
  sagsoversigtError: string | null;
  erSagerHentet: boolean;

  aktiviteterFilters: AktiviteterFilterState;
  aktiviteterUdvidedeGrupper: { [key: number]: { [key: string]: boolean } };

  // @# 2025-09-15 08:15 - Tilføjet state for BlokInfoSkabelonerPage
  blokinfoSkabeloner: Blokinfo[];
  blokinfoSkabelonerFilters: BlokinfoSkabelonerFilterState;
  blokinfoSkabelonerIsLoading: boolean;
  blokinfoSkabelonerError: string | null;
  erBlokinfoSkabelonerHentet: boolean;

  // @# 2025-09-15 08:15 - Tilføjet state for AktivitetsskabelonerPage
  aktivitetsskabeloner: SkabAktivitet[];
  aktivitetsskabelonerFilters: AktivitetsskabelonerFilterState;
  aktivitetsskabelonerVisUdgaaede: boolean;
  aktivitetsskabelonerIsLoading: boolean;
  aktivitetsskabelonerError: string | null;
  aktivitetsskabelonerNextPageUrl: string | null;
  erAktivitetsskabelonerHentet: boolean;
}

// --- 2. Definer de handlinger (actions) du kan udføre ---
type AppAction =
  | { type: 'SET_VALGT_SAG';
payload: Sag | null }
  | { type: 'SET_AKTIVITETER'; payload: { sagId: number; aktiviteter: Aktivitet[] } }
  |
{ type: 'SET_LOADING_AKTIVITETER'; payload: boolean }
// @# 2025-09-14 22:15 - Tilføjet action for Sags-relateret state
  | { type: 'SET_SAGER_STATE';
payload: Partial<AppState> }
  | { type: 'SET_AKTIVITETER_STATE'; payload: Partial<AppState> }
  // @# 2025-09-15 08:15 - Tilføjet actions for skabelon-sider
  | { type: 'SET_BLOKINFO_SKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_AKTIVITETSSKABELONER_STATE'; payload: Partial<AppState> };

// --- 3. Initial state ---
const initialState: AppState = {
  aktiviteter: {},
  valgtSag: null,
  isLoadingAktiviteter: false,
// @# 2025-09-14 22:15 - Initial state for Sagsoversigt
  sager: [],
  sagsoversigtFilters: { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' },
  sagsoversigtSortConfig: { key: 'sags_nr', direction: 'ascending' },
  sagsoversigtVisLukkede: false,
  sagsoversigtVisAnnullerede: false,
  sagsoversigtIsLoading: true,
  sagsoversigtError: null,
  erSagerHentet: false,

  aktiviteterFilters: { aktivitet: '', status: '', ansvarlig: '' },
  aktiviteterUdvidedeGrupper: {},

  // @# 2025-09-15 08:15 - Initial state for BlokInfoSkabelonerPage
  blokinfoSkabeloner: [],
  blokinfoSkabelonerFilters: { formaal: '', nr: '', titel_kort: '', beskrivelse: '' },
  blokinfoSkabelonerIsLoading: true,
  blokinfoSkabelonerError: null,
  erBlokinfoSkabelonerHentet: false,

  // @# 2025-09-15 08:15 - Initial state for AktivitetsskabelonerPage
  aktivitetsskabeloner: [],
  aktivitetsskabelonerFilters: { proces_nr: '', gruppe_nr: '', aktivitet_nr: '', aktivitet: '' },
  aktivitetsskabelonerVisUdgaaede: false,
  aktivitetsskabelonerIsLoading: true,
  aktivitetsskabelonerError: null,
  aktivitetsskabelonerNextPageUrl: null,
  erAktivitetsskabelonerHentet: false,
};

// --- 4. Reducer-funktionen, der håndterer state-opdateringer ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VALGT_SAG':
      return { ...state, valgtSag: action.payload };
    case 'SET_LOADING_AKTIVITETER':
      return { ...state, isLoadingAktiviteter: action.payload };
    case 'SET_AKTIVITETER':
      return {
        ...state,
        aktiviteter: {
          ...state.aktiviteter,
          [action.payload.sagId]: action.payload.aktiviteter,
        },
      };
    // @# 2025-09-14 22:15 - Reducer case for Sags-relateret state
    case 'SET_SAGER_STATE':
      return { ...state, ...action.payload };
    case 'SET_AKTIVITETER_STATE':
      return { ...state, ...action.payload };
    // @# 2025-09-15 08:15 - Tilføjet reducer cases for skabelon-sider
    case 'SET_BLOKINFO_SKABELONER_STATE':
      return { ...state, ...action.payload };
    case 'SET_AKTIVITETSSKABELONER_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// --- 5. Opret Context ---
interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export const StateContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
});

// --- 6. Provider-komponenten, der "pakker" din app ---
interface StateProviderProps {
  children: ReactNode;
}

export const StateProvider = ({ children }: StateProviderProps) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};

// --- 7. Custom hook for nem adgang til state ---
export const useAppState = () => useContext(StateContext);