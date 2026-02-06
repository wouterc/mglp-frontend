import React, { createContext, useReducer, Dispatch, ReactNode, useContext, useMemo, useCallback } from 'react';
import type {
  Aktivitet, Sag, SagsoversigtFilterState, SagsoversigtSortConfig, Status,
  AktiviteterFilterState, Blokinfo, SkabAktivitet, BlokinfoSkabelonerFilterState,
  AktivitetsskabelonerFilterState, AktivitetGruppeSummary,
  SkabDokument, DokumentskabelonerFilterState,
  Virksomhed, Kontakt,
  VirksomhedFilterState, KontaktFilterState,
  SagsDokument,
  User,
  InformationsKilde,
  StandardMappe
} from './types';

import { useAuth } from './contexts/AuthContext';
import { useLookups } from './contexts/LookupContext';
import { useSager } from './contexts/SagContext';
import { useChat } from './contexts/ChatContext';
import { useAktivitetDokument } from './contexts/AktivitetDokumentContext';
import { usePartners } from './contexts/PartnerContext';
import { useTemplates } from './contexts/TemplateContext';

// --- 1. AppState interface (Beholdes for bagudkompatibilitet) ---
export interface AppState {
  valgtSag: Sag | null;
  erFilterMenuAaben: boolean;
  currentUser: User | null;
  isAuthChecking: boolean;
  lookupsIsLoading: boolean;
  statusser: Status[];
  aktivitetsGrupper: { [sagId: number]: AktivitetGruppeSummary[] };
  hentedeAktiviteter: { [gruppeId: number]: Aktivitet[] };
  gruppeLoadingStatus: { [gruppeId: number]: boolean };
  aktiviteterIsLoading: boolean;
  aktiviteterError: string | null;
  aktiviteterFilters: AktiviteterFilterState;
  aktiviteterUdvidedeGrupper: { [key: number]: { [key: string]: boolean } };
  cachedAktiviteter: { [sagId: number]: Aktivitet[] };
  sager: Sag[];
  sagsIdListe: number[];
  sagsoversigtFilters: SagsoversigtFilterState;
  sagsoversigtSortConfig: SagsoversigtSortConfig;
  sagsoversigtVisLukkede: boolean;
  sagsoversigtVisAnnullerede: boolean;
  sagsoversigtIsLoading: boolean;
  sagsoversigtError: string | null;
  erSagerHentet: boolean;
  blokinfoSkabeloner: Blokinfo[];
  blokinfoSkabelonerFilters: BlokinfoSkabelonerFilterState;
  blokinfoSkabelonerIsLoading: boolean;
  blokinfoSkabelonerError: string | null;
  erBlokinfoSkabelonerHentet: boolean;
  aktivitetsskabeloner: SkabAktivitet[];
  aktivitetsskabelonerFilters: AktivitetsskabelonerFilterState;
  aktivitetsskabelonerVisUdgaaede: boolean;
  aktivitetsskabelonerIsLoading: boolean;
  aktivitetsskabelonerError: string | null;
  aktivitetsskabelonerNextPageUrl: string | null;
  erAktivitetsskabelonerHentet: boolean;
  virksomheder: Virksomhed[];
  virksomhederFilters: VirksomhedFilterState;
  virksomhederIsLoading: boolean;
  virksomhederError: string | null;
  erVirksomhederHentet: boolean;
  kontakter: Kontakt[];
  kontakterFilters: KontaktFilterState;
  kontakterIsLoading: boolean;
  kontakterError: string | null;
  erKontakterHentet: boolean;
  dokumentskabeloner: SkabDokument[];
  dokumentskabelonerFilters: DokumentskabelonerFilterState;
  dokumentskabelonerVisUdgaaede: boolean;
  dokumentskabelonerIsLoading: boolean;
  dokumentskabelonerError: string | null;
  erDokumentskabelonerHentet: boolean;
  cachedDokumenter: { [sagId: number]: SagsDokument[] };
  mailBasketCache: { [sagId: number]: { aktiviteter: Aktivitet[], dokumenter: SagsDokument[], timestamp: number } };
  users: User[];
  aktivitetStatusser: Status[];
  sagsStatusser: Status[];
  dokumentStatusser: Status[];
  informationsKilder: InformationsKilde[];
  standardMapper: StandardMappe[];
  chatTeams: any[];
  chatMessages: any[];
  chatActiveRecipient: any | undefined;
  chatActiveType: 'user' | 'team' | undefined;
  chatUnreadCounts: { [key: string]: number };
}

export type AppAction = any;

export const initialVirksomhedFilters: VirksomhedFilterState = {
  navn: '', afdeling: '', gruppe: '', telefon: '', email: ''
};
export const initialKontaktFilters: KontaktFilterState = {
  navn: '', rolle: '', virksomhed: '', telefon: '', email: ''
};

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<any>;
  initialVirksomhedFilters: VirksomhedFilterState;
  initialKontaktFilters: KontaktFilterState;
}

export const StateContext = createContext<AppContextType | undefined>(undefined);

export const StateProvider = ({ children }: { children: ReactNode }) => {
  const { state: auth, dispatch: authDispatch } = useAuth();
  const { state: lookups, dispatch: lookDispatch } = useLookups();
  const { state: sager, dispatch: sagDispatch } = useSager();
  const { state: chat, dispatch: chatDispatch } = useChat();
  const { state: aktdok, dispatch: adDispatch } = useAktivitetDokument();
  const { state: partners, dispatch: partDispatch } = usePartners();
  const { state: templates, dispatch: tempDispatch } = useTemplates();

  const [localState, localDispatch] = useReducer((s: any, a: any) => {
    if (a.type === 'TOGGLE_FILTER_MENU') return { ...s, erFilterMenuAaben: !s.erFilterMenuAaben };
    return s;
  }, { erFilterMenuAaben: true });

  // --- STABIL STATE ---
  const combinedState = useMemo((): AppState => ({
    // Auth
    currentUser: auth.currentUser,
    isAuthChecking: auth.isAuthChecking,

    // Lookups
    users: lookups.users,
    lookupsIsLoading: lookups.isLoading,
    statusser: lookups.statusser,
    aktivitetStatusser: lookups.aktivitetStatusser,
    sagsStatusser: lookups.sagsStatusser,
    dokumentStatusser: lookups.dokumentStatusser,
    informationsKilder: lookups.informationsKilder,
    standardMapper: lookups.standardMapper,

    // Sager
    valgtSag: sager.valgtSag,
    sager: sager.sager,
    sagsIdListe: sager.sagsIdListe,
    sagsoversigtFilters: sager.sagsoversigtFilters,
    sagsoversigtSortConfig: sager.sagsoversigtSortConfig,
    sagsoversigtVisLukkede: sager.sagsoversigtVisLukkede,
    sagsoversigtVisAnnullerede: sager.sagsoversigtVisAnnullerede,
    sagsoversigtIsLoading: sager.sagsoversigtIsLoading,
    sagsoversigtError: sager.sagsoversigtError,
    erSagerHentet: sager.erSagerHentet,

    // Aktiviteter & Dokumenter
    aktivitetsGrupper: aktdok.aktivitetsGrupper,
    hentedeAktiviteter: aktdok.hentedeAktiviteter,
    gruppeLoadingStatus: aktdok.gruppeLoadingStatus,
    aktiviteterIsLoading: aktdok.aktiviteterIsLoading,
    aktiviteterError: aktdok.aktiviteterError,
    aktiviteterFilters: aktdok.aktiviteterFilters,
    aktiviteterUdvidedeGrupper: aktdok.aktiviteterUdvidedeGrupper,
    cachedAktiviteter: aktdok.cachedAktiviteter,
    cachedDokumenter: aktdok.cachedDokumenter,
    mailBasketCache: aktdok.mailBasketCache,

    aktivitetsskabeloner: aktdok.aktivitetsskabeloner,
    aktivitetsskabelonerFilters: aktdok.aktivitetsskabelonerFilters,
    aktivitetsskabelonerVisUdgaaede: aktdok.aktivitetsskabelonerVisUdgaaede,
    aktivitetsskabelonerIsLoading: aktdok.aktivitetsskabelonerIsLoading,
    aktivitetsskabelonerError: aktdok.aktivitetsskabelonerError,
    aktivitetsskabelonerNextPageUrl: aktdok.aktivitetsskabelonerNextPageUrl,
    erAktivitetsskabelonerHentet: aktdok.erAktivitetsskabelonerHentet,

    dokumentskabeloner: aktdok.dokumentskabeloner,
    dokumentskabelonerFilters: aktdok.dokumentskabelonerFilters,
    dokumentskabelonerVisUdgaaede: aktdok.dokumentskabelonerVisUdgaaede,
    dokumentskabelonerIsLoading: aktdok.dokumentskabelonerIsLoading,
    dokumentskabelonerError: aktdok.dokumentskabelonerError,
    erDokumentskabelonerHentet: aktdok.erDokumentskabelonerHentet,

    // Partnere
    virksomheder: partners.virksomheder,
    virksomhederFilters: partners.virksomhederFilters,
    virksomhederIsLoading: partners.virksomhederIsLoading,
    virksomhederError: partners.virksomhederError,
    erVirksomhederHentet: partners.erVirksomhederHentet,
    kontakter: partners.kontakter,
    kontakterFilters: partners.kontakterFilters,
    kontakterIsLoading: partners.kontakterIsLoading,
    kontakterError: partners.kontakterError,
    erKontakterHentet: partners.erKontakterHentet,

    // Skabeloner / Blokinfo
    blokinfoSkabeloner: templates.blokinfoSkabeloner?.length > 0 ? templates.blokinfoSkabeloner : lookups.blokinfoSkabeloner,
    blokinfoSkabelonerFilters: templates.blokinfoSkabelonerFilters,
    blokinfoSkabelonerIsLoading: templates.blokinfoSkabelonerIsLoading,
    blokinfoSkabelonerError: templates.blokinfoSkabelonerError,
    erBlokinfoSkabelonerHentet: templates.erBlokinfoSkabelonerHentet || lookups.blokinfoSkabeloner?.length > 0,

    // Chat
    chatTeams: chat.chatTeams,
    chatMessages: chat.chatMessages,
    chatActiveRecipient: chat.chatActiveRecipient,
    chatActiveType: chat.chatActiveType,
    chatUnreadCounts: chat.chatUnreadCounts,

    // Lokal
    erFilterMenuAaben: localState.erFilterMenuAaben,
  }), [auth, lookups, sager, chat, aktdok, partners, templates, localState.erFilterMenuAaben]);

  // --- STABIL DISPATCH ---
  const combinedDispatch = useCallback((action: any) => {
    const type = action.type;

    if (type === 'SET_CURRENT_USER' || type === 'SET_AUTH_CHECKING') {
      authDispatch(action);
    } else if (type === 'SET_LOOKUPS' || type === 'SET_STATUSSER' || type === 'SET_STANDARD_MAPPER') {
      lookDispatch(action);
    } else if (type === 'SET_SAGER_STATE' || type === 'SET_VALGT_SAG' || type === 'SET_SAGS_ID_LISTE') {
      sagDispatch(action);
    } else if (type === 'SET_VIRKSOMHEDER_STATE' || type === 'SET_KONTAKTER_STATE') {
      partDispatch(action);
    } else if (type === 'SET_BLOKINFO_SKABELONER_STATE') {
      tempDispatch(action);
    } else if (type === 'SET_CHAT_STATE') {
      chatDispatch(action);
    } else if (type === 'TOGGLE_FILTER_MENU') {
      localDispatch(action);
    } else {
      adDispatch(action);
    }
  }, [authDispatch, lookDispatch, sagDispatch, partDispatch, tempDispatch, chatDispatch, adDispatch]);

  return (
    <StateContext.Provider value={{
      state: combinedState,
      dispatch: combinedDispatch,
      initialVirksomhedFilters,
      initialKontaktFilters
    }}>
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};
