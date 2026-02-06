import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { api } from '../api';
import { LookupService } from '../services/LookupService';
import { User, Status, InformationsKilde, StandardMappe, Blokinfo } from '../types';
import { useAuth } from './AuthContext';

interface LookupState {
    users: User[];
    aktivitetStatusser: Status[];
    sagsStatusser: Status[];
    statusser: Status[];
    dokumentStatusser: Status[];
    informationsKilder: InformationsKilde[];
    standardMapper: StandardMappe[];
    blokinfoSkabeloner: Blokinfo[];
    isLoading: boolean;
}

type LookupAction =
    | { type: 'SET_LOOKUPS'; payload: Partial<LookupState> }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_STATUSSER'; payload: Status[] }
    | { type: 'SET_STANDARD_MAPPER'; payload: StandardMappe[] };

const initialState: LookupState = {
    users: [],
    aktivitetStatusser: [],
    sagsStatusser: [],
    statusser: [],
    dokumentStatusser: [],
    informationsKilder: [],
    standardMapper: [],
    blokinfoSkabeloner: [],
    isLoading: false,
};

const lookupReducer = (state: LookupState, action: LookupAction): LookupState => {
    switch (action.type) {
        case 'SET_LOOKUPS':
            return { ...state, ...action.payload, isLoading: false };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_STATUSSER':
            return { ...state, sagsStatusser: action.payload, statusser: action.payload };
        case 'SET_STANDARD_MAPPER':
            return { ...state, standardMapper: action.payload };
        default:
            return state;
    }
};

interface LookupContextType {
    state: LookupState;
    dispatch: React.Dispatch<LookupAction>;
    refreshLookups: () => Promise<void>;
}

const LookupContext = createContext<LookupContextType | undefined>(undefined);

export const LookupProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(lookupReducer, initialState);
    const { state: authState } = useAuth();

    const isFetching = React.useRef(false);

    const fetchLookups = React.useCallback(async () => {
        if (!authState.currentUser || isFetching.current) return;

        isFetching.current = true;
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const [users, actStatuses, sagStatuses, docStatuses, sources, groups, mappers] = await Promise.all([
                LookupService.getUsers(),
                LookupService.getStatusser(2),
                LookupService.getStatusser(1),
                LookupService.getStatusser(3),
                LookupService.getInformationsKilder(),
                LookupService.getBlokinfoSkabeloner(),
                LookupService.getStandardMapper()
            ]);

            dispatch({
                type: 'SET_LOOKUPS',
                payload: {
                    users: users.filter((u: User) => u.is_active),
                    aktivitetStatusser: actStatuses,
                    sagsStatusser: sagStatuses,
                    statusser: sagStatuses,
                    dokumentStatusser: docStatuses,
                    informationsKilder: sources,
                    blokinfoSkabeloner: groups,
                    standardMapper: mappers || []
                }
            });
        } catch (e) {
            console.error("Fejl ved hentning af globale lookups:", e);
            dispatch({ type: 'SET_LOADING', payload: false });
        } finally {
            isFetching.current = false;
        }
    }, [authState.currentUser, dispatch]);

    useEffect(() => {
        if (authState.currentUser && state.users.length === 0) {
            fetchLookups();
        }
    }, [authState.currentUser, state.users.length, fetchLookups]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch,
        refreshLookups: fetchLookups
    }), [state, dispatch, fetchLookups]);

    return (
        <LookupContext.Provider value={contextValue}>
            {children}
        </LookupContext.Provider>
    );
};

export const useLookups = () => {
    const context = useContext(LookupContext);
    if (context === undefined) {
        throw new Error('useLookups must be used within a LookupProvider');
    }
    return context;
};
