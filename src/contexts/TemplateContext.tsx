import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Blokinfo, BlokinfoSkabelonerFilterState } from '../types';

interface TemplateState {
    blokinfoSkabeloner: Blokinfo[];
    blokinfoSkabelonerFilters: BlokinfoSkabelonerFilterState;
    blokinfoSkabelonerIsLoading: boolean;
    blokinfoSkabelonerError: string | null;
    erBlokinfoSkabelonerHentet: boolean;
}

type TemplateAction =
    | { type: 'SET_BLOKINFO_SKABELONER_STATE'; payload: Partial<TemplateState> };

const initialState: TemplateState = {
    blokinfoSkabeloner: [],
    blokinfoSkabelonerFilters: { formaal: '', nr: '', titel_kort: '', beskrivelse: '' },
    blokinfoSkabelonerIsLoading: true,
    blokinfoSkabelonerError: null,
    erBlokinfoSkabelonerHentet: false,
};

const templateReducer = (state: TemplateState, action: TemplateAction): TemplateState => {
    switch (action.type) {
        case 'SET_BLOKINFO_SKABELONER_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

interface TemplateContextType {
    state: TemplateState;
    dispatch: React.Dispatch<TemplateAction>;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(templateReducer, initialState);
    return (
        <TemplateContext.Provider value={{ state, dispatch }}>
            {children}
        </TemplateContext.Provider>
    );
};

export const useTemplates = () => {
    const context = useContext(TemplateContext);
    if (context === undefined) {
        throw new Error('useTemplates must be used within a TemplateProvider');
    }
    return context;
};
