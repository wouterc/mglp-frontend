// --- Fil: src/StateContext.tsx ---
// @# 2025-11-22 17:00 - Tilføjet 'sagsIdListe' til at styre Næste/Forrige navigation.
// @# 2025-11-23 14:00 - Tilføjet 'statusser' til global state for at undgå at de forsvinder ved navigation.
import React, { createContext, useReducer, Dispatch, ReactNode, useContext } from 'react';
import type { 
  Aktivitet, Sag, SagsoversigtFilterState, SagsoversigtSortConfig, Status, 
  AktiviteterFilterState, Blokinfo, SkabAktivitet, BlokinfoSkabelonerFilterState, 
  AktivitetsskabelonerFilterState, AktivitetGruppeSummary,
  Virksomhed, Kontakt,
  VirksomhedFilterState, KontaktFilterState
} from './types';

// --- 1. Definer formen på din globale state ---
interface AppState {
  valgtSag: Sag | null;
  erFilterMenuAaben: boolean;

  // Globale lister
  statusser: Status[]; // @# Ny global liste

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
  sagsIdListe: number[]; 
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

  // State for VirksomhederPage
  virksomheder: Virksomhed[];
  virksomhederFilters: VirksomhedFilterState;
  virksomhederIsLoading: boolean;
  virksomhederError: string | null;
  erVirksomhederHentet: boolean;

  // State for KontakterPage
  kontakter: Kontakt[];
  kontakterFilters: KontaktFilterState;
  kontakterIsLoading: boolean;
  kontakterError: string | null;
  erKontakterHentet: boolean;
}

// --- 2. Definer de handlinger (actions) du kan udføre ---
type AppAction =
  | { type: 'SET_VALGT_SAG'; payload: Sag | null }
  | { type: 'SET_STATUSSER'; payload: Status[] } // @# Ny action
  | { type: 'SET_SAGER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_SAGS_ID_LISTE'; payload: number[] }
  | { type: 'SET_AKTIVITETER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_BLOKINFO_SKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_AKTIVITETSSKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_ENKELT_GRUPPE_AKTIVITETER'; payload: { gruppeId: number; aktiviteter: Aktivitet[] } }
  | { type: 'SET_SAG_GRUPPE_SUMMARIES'; payload: { sagId: number; summaries: AktivitetGruppeSummary[] } }
  | { type: 'NULSTIL_HENTEDE_AKTIVITETER' }
  | { type: 'SET_GRUPPE_LOADING'; payload: { gruppeId: number; isLoading: boolean } }
  | { type: 'TOGGLE_FILTER_MENU' }
  | { type: 'SET_VIRKSOMHEDER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_KONTAKTER_STATE'; payload: Partial<AppState> };

const initialVirksomhedFilters: VirksomhedFilterState = {
    navn: '', afdeling: '', gruppe: '', telefon: '', email: ''
};
const initialKontaktFilters: KontaktFilterState = {
    navn: '', rolle: '', virksomhed: '', telefon: '', email: ''
};

// --- 3. Initial state ---
const initialState: AppState = {
  valgtSag: null,
  erFilterMenuAaben: true,
  statusser: [], // @# Init

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
  sagsIdListe: [],
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

  // Virksomheder
  virksomheder: [],
  virksomhederFilters: initialVirksomhedFilters,
  virksomhederIsLoading: true,
  virksomhederError: null,
  erVirksomhederHentet: false,

  // Kontakter
  kontakter: [],
  kontakterFilters: initialKontaktFilters,
  kontakterIsLoading: true,
  kontakterError: null,
  erKontakterHentet: false,
};

// --- 4. Reducer-funktionen, der håndterer state-opdateringer ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VALGT_SAG':
      return { ...state, valgtSag: action.payload };
    case 'SET_STATUSSER': // @# Ny case
      return { ...state, statusser: action.payload };
    case 'SET_SAGER_STATE':
      return { ...state, ...action.payload };
    case 'SET_SAGS_ID_LISTE':
      return { ...state, sagsIdListe: action.payload };
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
    case 'SET_GRUPPE_LOADING':
        return {
            ...state,
            gruppeLoadingStatus: {
                ...state.gruppeLoadingStatus,
                [action.payload.gruppeId]: action.payload.isLoading,
            }
        };
    case 'TOGGLE_FILTER_MENU':
        return {
            ...state,
            erFilterMenuAaben: !state.erFilterMenuAaben,
        };
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
  initialVirksomhedFilters: VirksomhedFilterState;
  initialKontaktFilters: KontaktFilterState;
}

export const StateContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
  initialVirksomhedFilters: initialVirksomhedFilters,
  initialKontaktFilters: initialKontaktFilters,
});

// --- 6. Provider-komponenten, der "pakker" din app ---
interface StateProviderProps {
  children: ReactNode;
}

export const StateProvider = ({ children }: StateProviderProps) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <StateContext.Provider value={{ 
        state, 
        dispatch,
        initialVirksomhedFilters,
        initialKontaktFilters
    }}>
      {children}
    </StateContext.Provider>
  );
};

// --- 7. Custom hook for nem adgang til state ---
export const useAppState = () => useContext(StateContext);