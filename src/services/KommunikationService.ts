import { api } from '../api';
import { Besked, Team } from '../types_kommunikation';

export const KommunikationService = {
    // Teams
    getTeams: async (): Promise<Team[]> => {
        // api helper handles base URL, json parsing and status check
        const response = await api.get<Team[]>('/kommunikation/teams/');
        return response;
    },
    createTeam: async (data: Partial<Team>): Promise<Team> => {
        const response = await api.post<Team>('/kommunikation/teams/', data);
        return response;
    },

    // Beskeder
    getBeskeder: async (sinceId?: number, search?: string): Promise<Besked[]> => {
        const params = new URLSearchParams();
        if (sinceId) params.append('since_id', sinceId.toString());
        if (search) params.append('search', search);

        const url = `/kommunikation/beskeder/${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get<Besked[]>(url);
        return response;
    },
    sendBesked: async (data: Partial<Besked>): Promise<Besked> => {
        const response = await api.post<Besked>('/kommunikation/beskeder/', data);
        return response;
    },
    markAsRead: async (id: number): Promise<void> => {
        await api.post(`/kommunikation/beskeder/${id}/mark_somet_read/`);
    },
    getUnreadCount: async (): Promise<{ unread_count: number }> => {
        const response = await api.get<{ unread_count: number }>('/kommunikation/beskeder/unread_count/');
        return response;
    },
    deleteBesked: async (id: number): Promise<void> => {
        await api.delete(`/kommunikation/beskeder/${id}/`);
    }
};
