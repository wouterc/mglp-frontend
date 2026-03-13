import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Blokinfo, BlokinfoSkabelonerFilterState, Vareliste, Varetype, FlowRegel } from '../types';

interface TemplateState {
    blokinfoSkabeloner: Blokinfo[];
    blokinfoSkabelonerFilters: BlokinfoSkabelonerFilterState;
    blokinfoSkabelonerIsLoading: boolean;
    blokinfoSkabelonerError: string | null;
    erBlokinfoSkabelonerHentet: boolean;

    // Vareliste
    vareliste: Vareliste[];
    varetyper: Varetype[];
    varelisteIsLoading: boolean;
    erVarelisteHentet: boolean;

    // Flowregler
    flowRegler: FlowRegel[];
    flowReglerIsLoading: boolean;
    erFlowReglerHentet: boolean;
}

type TemplateAction =
    | { type: 'SET_BLOKINFO_SKABELONER_STATE'; payload: Partial<TemplateState> }
    | { type: 'SET_VARELISTE_STATE'; payload: Partial<TemplateState> }
    | { type: 'SET_FLOWREGLER_STATE'; payload: Partial<TemplateState> };

const initialState: TemplateState = {
    blokinfoSkabeloner: [],
    blokinfoSkabelonerFilters: { formaal: '', nr: '', titel_kort: '', beskrivelse: '' },
    blokinfoSkabelonerIsLoading: true,
    blokinfoSkabelonerError: null,
    erBlokinfoSkabelonerHentet: false,

    vareliste: [],
    varetyper: [],
    varelisteIsLoading: true,
    erVarelisteHentet: false,

    flowRegler: [],
    flowReglerIsLoading: true,
    erFlowReglerHentet: false,
};

const templateReducer = (state: TemplateState, action: TemplateAction): TemplateState => {
    switch (action.type) {
        case 'SET_BLOKINFO_SKABELONER_STATE':
        case 'SET_VARELISTE_STATE':
        case 'SET_FLOWREGLER_STATE':
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
