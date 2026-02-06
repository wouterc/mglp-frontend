import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AuthState {
    currentUser: User | null;
    isAuthChecking: boolean;
}

type AuthAction =
    | { type: 'SET_CURRENT_USER'; payload: User | null }
    | { type: 'SET_AUTH_CHECKING'; payload: boolean };

const initialState: AuthState = {
    currentUser: null,
    isAuthChecking: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'SET_CURRENT_USER':
            return { ...state, currentUser: action.payload };
        case 'SET_AUTH_CHECKING':
            return { ...state, isAuthChecking: action.payload };
        default:
            return state;
    }
};

interface AuthContextType {
    state: AuthState;
    dispatch: React.Dispatch<AuthAction>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const user = await api.get<any>('/kerne/me/');
                dispatch({ type: 'SET_CURRENT_USER', payload: user });
            } catch (e: any) {
                if (e.status !== 403) {
                    console.error("Kunne ikke hente brugerinfo:", e);
                }
            } finally {
                dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
            }
        };
        fetchMe();
    }, []);

    const logout = React.useCallback(async () => {
        try {
            await api.post('/kerne/logout/');
        } catch (e) {
            console.error("Logout fejl:", e);
        }
        dispatch({ type: 'SET_CURRENT_USER', payload: null });
        window.location.href = '/login';
    }, [dispatch]);

    const contextValue = React.useMemo(() => ({
        state,
        dispatch,
        logout
    }), [state, dispatch, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
