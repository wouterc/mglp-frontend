import { api } from '../api';
import { Opgave, OpgaveKommentar } from '../types';

export const opgaveService = {
    getAll: async () => {
        return await api.get<Opgave[]>('/opgaver/opgaver/');
    },

    get: async (id: number) => {
        return await api.get<Opgave>(`/opgaver/opgaver/${id}/`);
    },

    create: async (data: Partial<Opgave>) => {
        return await api.post<Opgave>('/opgaver/opgaver/', data);
    },

    update: async (id: number, data: Partial<Opgave>) => {
        return await api.patch<Opgave>(`/opgaver/opgaver/${id}/`, data);
    },

    delete: async (id: number) => {
        return await api.delete(`/opgaver/opgaver/${id}/`);
    },

    updateStatus: async (id: number, status: string, index?: number) => {
        return await api.post<Opgave>(`/opgaver/opgaver/${id}/update_status/`, { status, index });
    },

    addComment: async (opgaveId: number, tekst: string) => {
        return await api.post<OpgaveKommentar>('/opgaver/opgave-kommentarer/', { opgave: opgaveId, tekst });
    },

    updateComment: async (commentId: number, tekst: string) => {
        return await api.patch<OpgaveKommentar>(`/opgaver/opgave-kommentarer/${commentId}/`, { tekst });
    },

    deleteComment: async (commentId: number) => {
        return await api.delete(`/opgaver/opgave-kommentarer/${commentId}/`);
    }
};
