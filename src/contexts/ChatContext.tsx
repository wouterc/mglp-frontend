import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface ChatState {
    chatTeams: any[];
    chatMessages: any[];
    chatActiveRecipient: any | undefined;
    chatActiveType: 'user' | 'team' | undefined;
    chatUnreadCounts: { [key: string]: number };
}

type ChatAction =
    | { type: 'SET_CHAT_STATE'; payload: Partial<ChatState> };

const initialState: ChatState = {
    chatTeams: [],
    chatMessages: [],
    chatActiveRecipient: undefined,
    chatActiveType: undefined,
    chatUnreadCounts: {},
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
        case 'SET_CHAT_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
};

interface ChatContextType {
    state: ChatState;
    dispatch: React.Dispatch<ChatAction>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(chatReducer, initialState);

    return (
        <ChatContext.Provider value={{ state, dispatch }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
