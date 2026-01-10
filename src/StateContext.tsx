// --- Fil: src/StateContext.tsx ---
// @# ... (Behold tidligere historik) ...
// @# 2025-11-23 20:00 - Tilføjet 'currentUser' til global state.
import React, { createContext, useReducer, Dispatch, ReactNode, useContext } from 'react';
import { api } from './api';
import type {
  Aktivitet, Sag, SagsoversigtFilterState, SagsoversigtSortConfig, Status,
  AktiviteterFilterState, Blokinfo, SkabAktivitet, BlokinfoSkabelonerFilterState,
  AktivitetsskabelonerFilterState, AktivitetGruppeSummary,
  SkabDokument, DokumentskabelonerFilterState,
  Virksomhed, Kontakt,
  VirksomhedFilterState, KontaktFilterState,
  SagsDokument,
  User,
  InformationsKilde
} from './types';

// --- 1. Definer formen på din globale state ---
interface AppState {
  valgtSag: Sag | null;
  erFilterMenuAaben: boolean;

  // @# Ny: Den indloggede bruger
  currentUser: User | null;

  // @# Ny: Ser om vi er ved at tjekke login
  isAuthChecking: boolean;

  // Globale lister
  statusser: Status[];

  // State for AktiviteterPage
  aktivitetsGrupper: { [sagId: number]: AktivitetGruppeSummary[] };
  hentedeAktiviteter: { [gruppeId: number]: Aktivitet[] };
  gruppeLoadingStatus: { [gruppeId: number]: boolean };
  aktiviteterIsLoading: boolean;
  aktiviteterError: string | null;
  aktiviteterFilters: AktiviteterFilterState;
  aktiviteterUdvidedeGrupper: { [key: number]: { [key: string]: boolean } };
  cachedAktiviteter: { [sagId: number]: Aktivitet[] };

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

  // State for DokumentskabelonerPage
  dokumentskabeloner: SkabDokument[];
  dokumentskabelonerFilters: DokumentskabelonerFilterState;
  dokumentskabelonerVisUdgaaede: boolean;
  dokumentskabelonerIsLoading: boolean;
  dokumentskabelonerError: string | null;
  erDokumentskabelonerHentet: boolean;
  // @# Ny: Dokument cache
  cachedDokumenter: { [sagId: number]: SagsDokument[] };
  mailBasketCache: { [sagId: number]: { aktiviteter: Aktivitet[], dokumenter: SagsDokument[], timestamp: number } };

  // Common Lookups
  users: User[];
  aktivitetStatusser: Status[];
  sagsStatusser: Status[]; // @# Tilføjet sags-statusser
  dokumentStatusser: Status[]; // @# Tilføjet dokument-statusser
  informationsKilder: InformationsKilde[];

  // Chat / Kommunikation
  chatTeams: any[];
  chatMessages: any[];
  chatActiveRecipient: any | undefined;
  chatActiveType: 'user' | 'team' | undefined;
  chatUnreadCounts: { [key: string]: number };
}

// --- 2. Definer de handlinger (actions) du kan udføre ---
type AppAction =
  | { type: 'SET_VALGT_SAG'; payload: Sag | null }
  | { type: 'SET_STATUSSER'; payload: Status[] }
  // @# Ny action til bruger
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_AUTH_CHECKING'; payload: boolean }
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
  | { type: 'SET_KONTAKTER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_DOKUMENTSSKABELONER_STATE'; payload: Partial<AppState> }
  | { type: 'SET_CACHED_AKTIVITETER'; payload: { sagId: number; aktiviteter: Aktivitet[] } }
  | { type: 'SET_CACHED_DOKUMENTER'; payload: { sagId: number; dokumenter: SagsDokument[] } }
  | { type: 'UPDATE_CACHED_DOKUMENT'; payload: { sagId: number; docId: number; updates: Partial<SagsDokument> } }
  | { type: 'SET_MAIL_BASKET_CACHE'; payload: { sagId: number; data: { aktiviteter: Aktivitet[], dokumenter: SagsDokument[], timestamp: number } } }
  | { type: 'SET_LOOKUPS'; payload: Partial<AppState> }
  | { type: 'SET_CHAT_STATE'; payload: Partial<AppState> };

const initialVirksomhedFilters: VirksomhedFilterState = {
  navn: '', afdeling: '', gruppe: '', telefon: '', email: ''
};
const initialKontaktFilters: KontaktFilterState = {
  navn: '', rolle: '', virksomhed: '', telefon: '', email: ''
};

// --- 3. Initial state ---
const getSavedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const initialState: AppState = {
  valgtSag: getSavedState('mglp_valgtSag', null),
  erFilterMenuAaben: true,
  currentUser: null,
  isAuthChecking: true,
  statusser: [],

  // Aktiviteter
  aktivitetsGrupper: {},
  hentedeAktiviteter: {},
  gruppeLoadingStatus: {},
  aktiviteterIsLoading: false,
  aktiviteterError: null,
  aktiviteterFilters: getSavedState('mglp_aktiviteterFilters', { aktivitet: '', ansvarlig: '', status: '', informations_kilde: '', aktiv_filter: 'kun_aktive', dato_intern_efter: '', dato_intern_foer: '', dato_ekstern_efter: '', dato_ekstern_foer: '', overskredet: false, vigtige: false }),
  aktiviteterUdvidedeGrupper: getSavedState('mglp_udvidedeGrupper', {}),
  cachedAktiviteter: {},
  cachedDokumenter: {},
  mailBasketCache: {},
  users: [],
  aktivitetStatusser: [],
  sagsStatusser: [],
  dokumentStatusser: [],
  informationsKilder: [],
  chatTeams: [],
  chatMessages: [],
  chatActiveRecipient: undefined,
  chatActiveType: undefined,
  chatUnreadCounts: {},

  // Sagsoversigt
  sager: [],
  sagsIdListe: [],
  sagsoversigtFilters: getSavedState('mglp_sagsoversigtFilters', { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' }),
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

  // Dokumentskabeloner
  dokumentskabeloner: [],
  dokumentskabelonerFilters: { gruppe_nr: '', dokument_nr: '', dokument: '' },
  dokumentskabelonerVisUdgaaede: false,
  dokumentskabelonerIsLoading: true,
  dokumentskabelonerError: null,
  erDokumentskabelonerHentet: false,
};

// --- 4. Reducer-funktionen, der håndterer state-opdateringer ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VALGT_SAG':
      return { ...state, valgtSag: action.payload };
    case 'SET_STATUSSER':
      return { ...state, statusser: action.payload };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_AUTH_CHECKING':
      return { ...state, isAuthChecking: action.payload };
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
    case 'SET_DOKUMENTSSKABELONER_STATE':
      return { ...state, ...action.payload };
    case 'SET_CACHED_AKTIVITETER':
      return {
        ...state,
        cachedAktiviteter: {
          ...state.cachedAktiviteter,
          [action.payload.sagId]: action.payload.aktiviteter
        }
      };
    case 'SET_CACHED_DOKUMENTER':
      return {
        ...state,
        cachedDokumenter: {
          ...state.cachedDokumenter,
          [action.payload.sagId]: action.payload.dokumenter
        }
      };
    case 'UPDATE_CACHED_DOKUMENT': {
      const { sagId, docId, updates } = action.payload;
      const currentDocs = state.cachedDokumenter[sagId] || [];
      const newDocs = currentDocs.map(doc =>
        doc.id === docId ? { ...doc, ...updates } : doc
      );
      return {
        ...state,
        cachedDokumenter: {
          ...state.cachedDokumenter,
          [sagId]: newDocs
        }
      };
    }
    case 'SET_MAIL_BASKET_CACHE':
      return {
        ...state,
        mailBasketCache: {
          ...state.mailBasketCache,
          [action.payload.sagId]: action.payload.data
        }
      };
    case 'SET_LOOKUPS':
    case 'SET_CHAT_STATE':
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

  // Persistence effects
  React.useEffect(() => {
    if (!state.currentUser) return;

    const fetchLookups = async () => {
      try {
        const [users, actStatuses, sagStatuses, docStatuses, sources, groups] = await Promise.all([
          api.get<User[]>('/kerne/users/'),
          api.get<any>('/kerne/status/?formaal=2'),
          api.get<any>('/kerne/status/?formaal=1'),
          api.get<any>('/kerne/status/?formaal=3'),
          api.get<InformationsKilde[]>('/kerne/informationskilder/'),
          api.get<Blokinfo[]>('/skabeloner/blokinfo/')
        ]);
        dispatch({
          type: 'SET_LOOKUPS',
          payload: {
            users: users.filter((u: User) => u.is_active),
            aktivitetStatusser: actStatuses.results || actStatuses,
            sagsStatusser: sagStatuses.results || sagStatuses,
            dokumentStatusser: docStatuses.results || docStatuses,
            informationsKilder: sources,
            blokinfoSkabeloner: groups
          }
        });
      } catch (e) {
        console.error("Fejl ved hentning af globale lookups:", e);
      }
    };
    fetchLookups();
  }, [dispatch, state.currentUser]);

  React.useEffect(() => {
    localStorage.setItem('mglp_valgtSag', JSON.stringify(state.valgtSag));
  }, [state.valgtSag]);

  React.useEffect(() => {
    localStorage.setItem('mglp_udvidedeGrupper', JSON.stringify(state.aktiviteterUdvidedeGrupper));
  }, [state.aktiviteterUdvidedeGrupper]);

  React.useEffect(() => {
    localStorage.setItem('mglp_aktiviteterFilters', JSON.stringify(state.aktiviteterFilters));
  }, [state.aktiviteterFilters]);

  React.useEffect(() => {
    localStorage.setItem('mglp_sagsoversigtFilters', JSON.stringify(state.sagsoversigtFilters));
  }, [state.sagsoversigtFilters]);

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