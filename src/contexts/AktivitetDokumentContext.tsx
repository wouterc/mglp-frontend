import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import {
    Aktivitet, SagsDokument, AktivitetGruppeSummary, AktiviteterFilterState,
    SkabAktivitet, AktivitetsskabelonerFilterState,
    SkabDokument, DokumentskabelonerFilterState
} from '../types';

interface AktivitetDokumentState {
    // Aktiviteter
    aktivitetsGrupper: { [sagId: number]: AktivitetGruppeSummary[] };
    hentedeAktiviteter: { [gruppeId: number]: Aktivitet[] };
    gruppeLoadingStatus: { [gruppeId: number]: boolean };
    aktiviteterIsLoading: boolean;
    aktiviteterError: string | null;
    aktiviteterFilters: AktiviteterFilterState;
    aktiviteterUdvidedeGrupper: { [key: number]: { [key: string]: boolean } };
    cachedAktiviteter: { [sagId: number]: Aktivitet[] };

    // Dokumenter
    cachedDokumenter: { [sagId: number]: SagsDokument[] };
    mailBasketCache: { [sagId: number]: { aktiviteter: Aktivitet[], dokumenter: SagsDokument[], timestamp: number } };

    // Skabeloner
    aktivitetsskabeloner: SkabAktivitet[];
    aktivitetsskabelonerFilters: AktivitetsskabelonerFilterState;
    aktivitetsskabelonerVisUdgaaede: boolean;
    aktivitetsskabelonerIsLoading: boolean;
    aktivitetsskabelonerError: string | null;
    aktivitetsskabelonerNextPageUrl: string | null;
    erAktivitetsskabelonerHentet: boolean;

    dokumentskabeloner: SkabDokument[];
    dokumentskabelonerFilters: DokumentskabelonerFilterState;
    dokumentskabelonerVisUdgaaede: boolean;
    dokumentskabelonerIsLoading: boolean;
    dokumentskabelonerError: string | null;
    erDokumentskabelonerHentet: boolean;
}

type AktivitetDokumentAction =
    | { type: 'SET_AKTIVITETER_STATE'; payload: Partial<AktivitetDokumentState> }
    | { type: 'SET_ENKELT_GRUPPE_AKTIVITETER'; payload: { gruppeId: number; aktiviteter: Aktivitet[] } }
    | { type: 'SET_SAG_GRUPPE_SUMMARIES'; payload: { sagId: number; summaries: AktivitetGruppeSummary[] } }
    | { type: 'NULSTIL_HENTEDE_AKTIVITETER' }
    | { type: 'SET_GRUPPE_LOADING'; payload: { gruppeId: number; isLoading: boolean } }
    | { type: 'SET_DOKUMENTSSKABELONER_STATE'; payload: Partial<AktivitetDokumentState> }
    | { type: 'SET_AKTIVITETSSKABELONER_STATE'; payload: Partial<AktivitetDokumentState> }
    | { type: 'SET_CACHED_AKTIVITETER'; payload: { sagId: number; aktiviteter: Aktivitet[] } }
    | { type: 'SET_CACHED_DOKUMENTER'; payload: { sagId: number; dokumenter: SagsDokument[] } }
    | { type: 'UPDATE_CACHED_DOKUMENT'; payload: { sagId: number; docId: number; updates: Partial<SagsDokument> } }
    | { type: 'SET_MAIL_BASKET_CACHE'; payload: { sagId: number; data: { aktiviteter: Aktivitet[], dokumenter: SagsDokument[], timestamp: number } } };

const getSavedState = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

const initialState: AktivitetDokumentState = {
    aktivitetsGrupper: {},
    hentedeAktiviteter: {},
    gruppeLoadingStatus: {},
    aktiviteterIsLoading: false,
    aktiviteterError: null,
    aktiviteterFilters: getSavedState('mglp_aktiviteterFilters', { aktivitet: '', status: '', informations_kilde: '', aktiv_filter: 'kun_aktive', dato_intern_efter: '', dato_intern_foer: '', dato_ekstern_efter: '', dato_ekstern_foer: '', overskredet: false, vigtige: false }),
    aktiviteterUdvidedeGrupper: getSavedState('mglp_udvidedeGrupper', {}),
    cachedAktiviteter: {},
    cachedDokumenter: {},
    mailBasketCache: {},

    aktivitetsskabeloner: [],
    aktivitetsskabelonerFilters: { proces_nr: '', gruppe_nr: '', aktivitet_nr: '', aktivitet: '' },
    aktivitetsskabelonerVisUdgaaede: false,
    aktivitetsskabelonerIsLoading: true,
    aktivitetsskabelonerError: null,
    aktivitetsskabelonerNextPageUrl: null,
    erAktivitetsskabelonerHentet: false,

    dokumentskabeloner: [],
    dokumentskabelonerFilters: { gruppe_nr: '', dokument_nr: '', dokument: '' },
    dokumentskabelonerVisUdgaaede: false,
    dokumentskabelonerIsLoading: true,
    dokumentskabelonerError: null,
    erDokumentskabelonerHentet: false,
};

const aktivitetDokumentReducer = (state: AktivitetDokumentState, action: AktivitetDokumentAction): AktivitetDokumentState => {
    switch (action.type) {
        case 'SET_AKTIVITETER_STATE':
        case 'SET_DOKUMENTSSKABELONER_STATE':
        case 'SET_AKTIVITETSSKABELONER_STATE':
            return { ...state, ...action.payload };
        case 'SET_ENKELT_GRUPPE_AKTIVITETER':
            return {
                ...state,
                hentedeAktiviteter: { ...state.hentedeAktiviteter, [action.payload.gruppeId]: action.payload.aktiviteter }
            };
        case 'SET_SAG_GRUPPE_SUMMARIES':
            return {
                ...state,
                aktivitetsGrupper: { ...state.aktivitetsGrupper, [action.payload.sagId]: action.payload.summaries }
            };
        case 'NULSTIL_HENTEDE_AKTIVITETER':
            return { ...state, hentedeAktiviteter: {}, gruppeLoadingStatus: {}, aktiviteterUdvidedeGrupper: {} };
        case 'SET_GRUPPE_LOADING':
            return {
                ...state,
                gruppeLoadingStatus: { ...state.gruppeLoadingStatus, [action.payload.gruppeId]: action.payload.isLoading }
            };
        case 'SET_CACHED_AKTIVITETER':
            return {
                ...state,
                cachedAktiviteter: { ...state.cachedAktiviteter, [action.payload.sagId]: action.payload.aktiviteter }
            };
        case 'SET_CACHED_DOKUMENTER':
            return {
                ...state,
                cachedDokumenter: { ...state.cachedDokumenter, [action.payload.sagId]: action.payload.dokumenter }
            };
        case 'UPDATE_CACHED_DOKUMENT': {
            const { sagId, docId, updates } = action.payload;
            const currentDocs = state.cachedDokumenter[sagId] || [];
            const newDocs = currentDocs.map(doc => doc.id === docId ? { ...doc, ...updates } : doc);
            return { ...state, cachedDokumenter: { ...state.cachedDokumenter, [sagId]: newDocs } };
        }
        case 'SET_MAIL_BASKET_CACHE':
            return {
                ...state,
                mailBasketCache: { ...state.mailBasketCache, [action.payload.sagId]: action.payload.data }
            };
        default:
            return state;
    }
};

interface AktivitetDokumentContextType {
    state: AktivitetDokumentState;
    dispatch: React.Dispatch<AktivitetDokumentAction>;
}

const AktivitetDokumentContext = createContext<AktivitetDokumentContextType | undefined>(undefined);

export const AktivitetDokumentProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(aktivitetDokumentReducer, initialState);

    useEffect(() => {
        localStorage.setItem('mglp_udvidedeGrupper', JSON.stringify(state.aktiviteterUdvidedeGrupper));
    }, [state.aktiviteterUdvidedeGrupper]);

    useEffect(() => {
        localStorage.setItem('mglp_aktiviteterFilters', JSON.stringify(state.aktiviteterFilters));
    }, [state.aktiviteterFilters]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch
    }), [state, dispatch]);

    return (
        <AktivitetDokumentContext.Provider value={contextValue}>
            {children}
        </AktivitetDokumentContext.Provider>
    );
};

export const useAktivitetDokument = () => {
    const context = useContext(AktivitetDokumentContext);
    if (context === undefined) {
        throw new Error('useAktivitetDokument must be used within an AktivitetDokumentProvider');
    }
    return context;
};
