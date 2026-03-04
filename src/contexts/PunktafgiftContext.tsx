import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { SagsPunktafgift, PunktafgiftFilterState, PunktafgiftSortConfig } from '../types';

interface PunktafgiftState {
    lines: SagsPunktafgift[];
    totalCount: number;
    page: number;
    filters: PunktafgiftFilterState;
    sortConfig: PunktafgiftSortConfig;
    erDataHentet: boolean;
}

type PunktafgiftAction =
    | { type: 'SET_PUNKTAFGIFT_STATE'; payload: Partial<PunktafgiftState> };

const getSavedState = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

const initialState: PunktafgiftState = {
    lines: [],
    totalCount: 0,
    page: getSavedState('mglp_punktafgift_page', 1),
    filters: getSavedState('mglp_punktafgift_filters', { search: '', afregnet: 'all' }),
    sortConfig: getSavedState('mglp_punktafgift_sort', { key: 'dato_opkraevet', direction: 'desc' }),
    erDataHentet: false,
};

const punktafgiftReducer = (state: PunktafgiftState, action: PunktafgiftAction): PunktafgiftState => {
    switch (action.type) {
        case 'SET_PUNKTAFGIFT_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

interface PunktafgiftContextType {
    state: PunktafgiftState;
    dispatch: React.Dispatch<PunktafgiftAction>;
}

const PunktafgiftContext = createContext<PunktafgiftContextType | undefined>(undefined);

export const PunktafgiftProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(punktafgiftReducer, initialState);

    useEffect(() => {
        localStorage.setItem('mglp_punktafgift_page', JSON.stringify(state.page));
    }, [state.page]);

    useEffect(() => {
        localStorage.setItem('mglp_punktafgift_filters', JSON.stringify(state.filters));
    }, [state.filters]);

    useEffect(() => {
        localStorage.setItem('mglp_punktafgift_sort', JSON.stringify(state.sortConfig));
    }, [state.sortConfig]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch
    }), [state, dispatch]);

    return (
        <PunktafgiftContext.Provider value={contextValue}>
            {children}
        </PunktafgiftContext.Provider>
    );
};

export const usePunktafgift = () => {
    const context = useContext(PunktafgiftContext);
    if (context === undefined) {
        throw new Error('usePunktafgift must be used within a PunktafgiftProvider');
    }
    return context;
};
