import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { FakturaLine, FakturaoversigtFilterState, FakturaoversigtSortConfig } from '../types';

interface FakturaState {
    lines: FakturaLine[];
    totalCount: number;
    page: number;
    filters: FakturaoversigtFilterState;
    sortConfig: FakturaoversigtSortConfig;
    erDataHentet: boolean;
}

type FakturaAction =
    | { type: 'SET_FAKTURA_STATE'; payload: Partial<FakturaState> };

const getSavedState = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

const initialState: FakturaState = {
    lines: [],
    totalCount: 0,
    page: getSavedState('mglp_faktura_page', 1),
    filters: getSavedState('mglp_faktura_filters', { search: '', status: 'all' }),
    sortConfig: getSavedState('mglp_faktura_sort', { key: 'dato', direction: 'desc' }),
    erDataHentet: false,
};

const fakturaReducer = (state: FakturaState, action: FakturaAction): FakturaState => {
    switch (action.type) {
        case 'SET_FAKTURA_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

interface FakturaContextType {
    state: FakturaState;
    dispatch: React.Dispatch<FakturaAction>;
}

const FakturaContext = createContext<FakturaContextType | undefined>(undefined);

export const FakturaProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(fakturaReducer, initialState);

    useEffect(() => {
        localStorage.setItem('mglp_faktura_page', JSON.stringify(state.page));
    }, [state.page]);

    useEffect(() => {
        localStorage.setItem('mglp_faktura_filters', JSON.stringify(state.filters));
    }, [state.filters]);

    useEffect(() => {
        localStorage.setItem('mglp_faktura_sort', JSON.stringify(state.sortConfig));
    }, [state.sortConfig]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch
    }), [state, dispatch]);

    return (
        <FakturaContext.Provider value={contextValue}>
            {children}
        </FakturaContext.Provider>
    );
};

export const useFaktura = () => {
    const context = useContext(FakturaContext);
    if (context === undefined) {
        throw new Error('useFaktura must be used within a FakturaProvider');
    }
    return context;
};
