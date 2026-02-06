import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Virksomhed, Kontakt, VirksomhedFilterState, KontaktFilterState } from '../types';

interface PartnerState {
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
}

type PartnerAction =
    | { type: 'SET_VIRKSOMHEDER_STATE'; payload: Partial<PartnerState> }
    | { type: 'SET_KONTAKTER_STATE'; payload: Partial<PartnerState> };

const initialState: PartnerState = {
    virksomheder: [],
    virksomhederFilters: { navn: '', afdeling: '', gruppe: '', telefon: '', email: '' },
    virksomhederIsLoading: true,
    virksomhederError: null,
    erVirksomhederHentet: false,

    kontakter: [],
    kontakterFilters: { navn: '', rolle: '', virksomhed: '', telefon: '', email: '' },
    kontakterIsLoading: true,
    kontakterError: null,
    erKontakterHentet: false,
};

const partnerReducer = (state: PartnerState, action: PartnerAction): PartnerState => {
    switch (action.type) {
        case 'SET_VIRKSOMHEDER_STATE':
        case 'SET_KONTAKTER_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

interface PartnerContextType {
    state: PartnerState;
    dispatch: React.Dispatch<PartnerAction>;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

export const PartnerProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(partnerReducer, initialState);
    return (
        <PartnerContext.Provider value={{ state, dispatch }}>
            {children}
        </PartnerContext.Provider>
    );
};

export const usePartners = () => {
    const context = useContext(PartnerContext);
    if (context === undefined) {
        throw new Error('usePartners must be used within a PartnerProvider');
    }
    return context;
};
