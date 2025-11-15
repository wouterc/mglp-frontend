// --- Fil: src/StateContext.tsx ---
// @# 2025-09-15 17:46 - Tilføjet state management for den nye filter-sidebar.
// @# 2025-11-03 22:15 - Tilføjet 'SET_GRUPPE_LOADING' action for at forhindre loops.
// @# 2025-11-06 18:25 - Tilføjet state for Virksomheder og Kontakter.
import React, { createContext, useReducer, Dispatch, ReactNode, useContext } from 'react';
import type { 
  Aktivitet, Sag, SagsoversigtFilterState, SagsoversigtSortConfig, Status, 
  AktiviteterFilterState, Blokinfo, SkabAktivitet, BlokinfoSkabelonerFilterState, 
  AktivitetsskabelonerFilterState, AktivitetGruppeSummary,
  // @# 2025-11-06 18:25 - Importer de nye typer
  Virksomhed, Kontakt 
} from './types';

// --- 1. Definer formen på din globale state ---
interface AppState {
  valgtSag: Sag | null;
  // @# 2025-09-15 17:46 - Tilføjet state for filtermenuens synlighed.
  erFilterMenuAaben: boolean;

  // State for AktiviteterPage
  aktivitetsGrupper: { [sagId: number]: AktivitetGruppeSummary[] };
  hentedeAktiviteter: { [gruppeId: number]: Aktivitet[] };
  gruppeLoadingStatus: { [gruppeId: number]: boolean };
  aktiviteterIsLoading: boolean;
  aktiviteterError: string | null;
  aktiviteterFilters: AktiviteterFilterState;
  aktiviteterUdvidedeGrupper: { [key: number]: { [key: string]: boolean } };
  
  // State for SagsoversigtPage
  sager: Sag[];
  sagsoversigtFilters: SagsoversigtFilterState;
  sagsoversigtSortConfig: SagsoversigtSortConfig;
  sagsoversigtVisLukkede: boolean;
  sagsoversigtVisAnnullerede: boolean;
  sagsoversigtIsLoading: boolean;
  sagsoversigtError: string | null;
  erSagerHentet: boolean;

  // State for BlokInfoSkabelonerPage
  blokinfoSkabeloner: Blokinfo[];
  blokinfoSkabelonerFilters: BlokinfoSkabelonerFilterState;
  blokinfoSkabelonerIsLoading: boolean;
  blokinfoSkabelonerError: string | null;
  erBlokinfoSkabelonerHentet: boolean;

  // State for AktivitetsskabelonerPage
  aktivitetsskabeloner: SkabAktivitet[];
  aktivitetsskabelonerFilters: AktivitetsskabelonerFilterState;
  aktivitetsskabelonerVisUdgaaede: boolean;
  aktivitetsskabelonerIsLoading: boolean;
  aktivitetsskabelonerError: string | null;
  aktivitetsskabelonerNextPageUrl: string | null;
  erAktivitetsskabelonerHentet: boolean;

  // @# 2025-11-06 18:25 - State for VirksomhederPage
  virksomheder: Virksomhed[];
  virksomhederIsLoading: boolean;
  virksomhederError: string | null;
  erVirksomhederHentet: boolean;

  // @# 2025-11-06 18:25 - State for KontakterPage
  kontakter: Kontakt[];
  kontakterIsLoading: boolean;
  kontakterError: string | null;
  erKontakterHentet: boolean;
}

// --- 2. Definer de handlinger (actions) du kan udføre ---
type AppAction =
  | { type: 'SET_VALGT_SAG'; payload: Sag | null }
  | { type: 'SET_SAGER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_AKTIVITETER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_BLOKINFO_SKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_AKTIVITETSSKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_ENKELT_GRUPPE_AKTIVITETER'; payload: { gruppeId: number; aktiviteter: Aktivitet[] } }
  | { type: 'SET_SAG_GRUPPE_SUMMARIES'; payload: { sagId: number; summaries: AktivitetGruppeSummary[] } }
  | { type: 'NULSTIL_HENTEDE_AKTIVITETER' }
  // @# 2025-11-03 22:15 - Ny action til at opdatere loading status for en enkelt gruppe.
  | { type: 'SET_GRUPPE_LOADING'; payload: { gruppeId: number; isLoading: boolean } }
  // @# 2025-09-15 17:46 - Ny action til at åbne/lukke filtermenuen.
  | { type: 'TOGGLE_FILTER_MENU' }
  // @# 2025-11-06 18:25 - Nye actions for Virksomheder og Kontakter
  | { type: 'SET_VIRKSOMHEDER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_KONTAKTER_STATE'; payload: Partial<AppState> };

// --- 3. Initial state ---
const initialState: AppState = {
  valgtSag: null,
  // @# 2025-09-15 17:46 - Sætter menuen til at være åben som standard.
  erFilterMenuAaben: true,

  // Aktiviteter
  aktivitetsGrupper: {},
  hentedeAktiviteter: {},
  gruppeLoadingStatus: {},
  aktiviteterIsLoading: false,
  aktiviteterError: null,
  aktiviteterFilters: { aktivitet: '', ansvarlig: '', status: '', aktiv_filter: 'kun_aktive', dato_intern_efter: '', dato_intern_foer: '', dato_ekstern_efter: '', dato_ekstern_foer: '', overskredet: false },
  aktiviteterUdvidedeGrupper: {},
  
  // Sagsoversigt
  sager: [],
  sagsoversigtFilters: { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' },
  sagsoversigtSortConfig: { key: 'sags_nr', direction: 'ascending' },
  sagsoversigtVisLukkede: false,
  sagsoversigtVisAnnullerede: false,
  sagsoversigtIsLoading: true,
  sagsoversigtError: null,
  erSagerHentet: false,

  // BlokInfoSkabeloner
  blokinfoSkabeloner: [],
  blokinfoSkabelonerFilters: { formaal: '', nr: '', titel_kort: '', beskrivelse: '' },
  blokinfoSkabelonerIsLoading: true,
  blokinfoSkabelonerError: null,
  erBlokinfoSkabelonerHentet: false,

  // Aktivitetsskabeloner
  aktivitetsskabeloner: [],
  aktivitetsskabelonerFilters: { proces_nr: '', gruppe_nr: '', aktivitet_nr: '', aktivitet: '' },
  aktivitetsskabelonerVisUdgaaede: false,
  aktivitetsskabelonerIsLoading: true,
  aktivitetsskabelonerError: null,
  aktivitetsskabelonerNextPageUrl: null,
  erAktivitetsskabelonerHentet: false,

  // @# 2025-11-06 18:25 - Initial state for Virksomheder
  virksomheder: [],
  virksomhederIsLoading: true,
  virksomhederError: null,
  erVirksomhederHentet: false,

  // @# 2025-11-06 18:25 - Initial state for Kontakter
  kontakter: [],
  kontakterIsLoading: true,
  kontakterError: null,
  erKontakterHentet: false,
};

// --- 4. Reducer-funktionen, der håndterer state-opdateringer ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VALGT_SAG':
      return { ...state, valgtSag: action.payload };
    case 'SET_SAGER_STATE':
      return { ...state, ...action.payload };
    case 'SET_AKTIVITETER_STATE':
      return { ...state, ...action.payload };
    case 'SET_BLOKINFO_SKABELONER_STATE':
      return { ...state, ...action.payload };
    case 'SET_AKTIVITETSSKABELONER_STATE':
      return { ...state, ...action.payload };
    case 'SET_ENKELT_GRUPPE_AKTIVITETER':
      return {
        ...state,
        hentedeAktiviteter: {
          ...state.hentedeAktiviteter,
          [action.payload.gruppeId]: action.payload.aktiviteter,
        },
      };
    case 'SET_SAG_GRUPPE_SUMMARIES':
        return {
            ...state,
            aktivitetsGrupper: {
                ...state.aktivitetsGrupper,
                [action.payload.sagId]: action.payload.summaries,
            }
        };
    case 'NULSTIL_HENTEDE_AKTIVITETER':
        return {
            ...state,
            hentedeAktiviteter: {},
            gruppeLoadingStatus: {},
            aktiviteterUdvidedeGrupper: {},
        };
    // @# 2025-11-03 22:15 - Ny reducer case, der specifikt opdaterer loading status.
    case 'SET_GRUPPE_LOADING':
        return {
            ...state,
            gruppeLoadingStatus: {
                ...state.gruppeLoadingStatus,
                [action.payload.gruppeId]: action.payload.isLoading,
            }
        };
    // @# 2025-09-15 17:46 - Ny reducer case, der håndterer åben/luk af filtermenu.
    case 'TOGGLE_FILTER_MENU':
        return {
            ...state,
            erFilterMenuAaben: !state.erFilterMenuAaben,
        };
    
    // @# 2025-11-06 18:25 - Nye reducers for Virksomheder og Kontakter
    case 'SET_VIRKSOMHEDER_STATE':
        return { ...state, ...action.payload };
    case 'SET_KONTAKTER_STATE':
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