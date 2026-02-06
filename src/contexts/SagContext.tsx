import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Sag, SagsoversigtFilterState, SagsoversigtSortConfig } from '../types';

interface SagState {
    valgtSag: Sag | null;
    sager: Sag[];
    sagsIdListe: number[];
    sagsoversigtFilters: SagsoversigtFilterState;
    sagsoversigtSortConfig: SagsoversigtSortConfig;
    sagsoversigtVisLukkede: boolean;
    sagsoversigtVisAnnullerede: boolean;
    sagsoversigtIsLoading: boolean;
    sagsoversigtError: string | null;
    erSagerHentet: boolean;
}

type SagAction =
    | { type: 'SET_VALGT_SAG'; payload: Sag | null }
    | { type: 'SET_SAGER_STATE'; payload: Partial<SagState> }
    | { type: 'SET_SAGS_ID_LISTE'; payload: number[] };

const getSavedState = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

const initialSagerCache = getSavedState<Sag[]>('mglp_sager_cache', []);

const initialState: SagState = {
    valgtSag: getSavedState('mglp_valgtSag', null),
    sager: initialSagerCache,
    sagsIdListe: getSavedState('mglp_sagsIdListe_cache', []),
    sagsoversigtFilters: getSavedState('mglp_sagsoversigtFilters', { sags_nr: '', alias: '', hovedansvarlige: '', adresse: '', status: '' }),
    sagsoversigtSortConfig: { key: 'sags_nr', direction: 'ascending' },
    sagsoversigtVisLukkede: false,
    sagsoversigtVisAnnullerede: false,
    sagsoversigtIsLoading: initialSagerCache.length === 0, // Kun loading hvis vi ikke har cache
    sagsoversigtError: null,
    erSagerHentet: false,
};

const sagReducer = (state: SagState, action: SagAction): SagState => {
    switch (action.type) {
        case 'SET_VALGT_SAG':
            if (state.valgtSag?.id === action.payload?.id) return state;
            return { ...state, valgtSag: action.payload };
        case 'SET_SAGER_STATE':
            return { ...state, ...action.payload };
        case 'SET_SAGS_ID_LISTE':
            // Undgå re-render hvis listen er den samme
            if (JSON.stringify(state.sagsIdListe) === JSON.stringify(action.payload)) return state;
            return { ...state, sagsIdListe: action.payload };
        default:
            return state;
    }
};

interface SagContextType {
    state: SagState;
    dispatch: React.Dispatch<SagAction>;
}

const SagContext = createContext<SagContextType | undefined>(undefined);

export const SagProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(sagReducer, initialState);

    useEffect(() => {
        localStorage.setItem('mglp_valgtSag', JSON.stringify(state.valgtSag));
    }, [state.valgtSag]);

    useEffect(() => {
        localStorage.setItem('mglp_sagsoversigtFilters', JSON.stringify(state.sagsoversigtFilters));
    }, [state.sagsoversigtFilters]);

    useEffect(() => {
        localStorage.setItem('mglp_sager_cache', JSON.stringify(state.sager));
    }, [state.sager]);

    useEffect(() => {
        localStorage.setItem('mglp_sagsIdListe_cache', JSON.stringify(state.sagsIdListe));
    }, [state.sagsIdListe]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch
    }), [state, dispatch]);

    return (
        <SagContext.Provider value={contextValue}>
            {children}
        </SagContext.Provider>
    );
};

export const useSager = () => {
    const context = useContext(SagContext);
    if (context === undefined) {
        throw new Error('useSager must be used within a SagProvider');
    }
    return context;
};
