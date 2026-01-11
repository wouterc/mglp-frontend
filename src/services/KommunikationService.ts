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
    updateTeam: async (id: number, data: Partial<Team>): Promise<Team> => {
        const response = await api.patch<Team>(`/kommunikation/teams/${id}/`, data);
        return response;
    },

    // Beskeder
    getBeskeder: async (
        sinceId?: number,
        search?: string,
        recipientId?: number,
        recipientType?: 'user' | 'team',
        limit?: number,
        beforeId?: number
    ): Promise<Besked[]> => {
        const params = new URLSearchParams();
        if (sinceId) params.append('since_id', sinceId.toString());
        if (search) params.append('search', search);
        if (recipientId) params.append('recipient_id', recipientId.toString());
        if (recipientType) params.append('recipient_type', recipientType);
        if (limit) params.append('limit', limit.toString());
        if (beforeId) params.append('before_id', beforeId.toString());

        const url = `/kommunikation/beskeder/${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get<Besked[]>(url);
        return response;
    },
    getBesked: async (id: number): Promise<Besked> => {
        const response = await api.get<Besked>(`/kommunikation/beskeder/${id}/`);
        return response;
    },
    sendBesked: async (data: Partial<Besked>): Promise<Besked> => {
        const response = await api.post<Besked>('/kommunikation/beskeder/', data);
        return response;
    },
    markAsRead: async (id: number): Promise<void> => {
        await api.post(`/kommunikation/beskeder/${id}/mark_somet_read/`);
    },
    markChatAsRead: async (recipientId: number, recipientType: 'user' | 'team'): Promise<void> => {
        await api.post('/kommunikation/beskeder/mark_chat_as_read/', {
            recipient_id: recipientId,
            recipient_type: recipientType
        });
    },
    getUnreadCount: async (): Promise<{ unread_count: number }> => {
        const response = await api.get<{ unread_count: number }>('/kommunikation/beskeder/unread_count/');
        return response;
    },
    getUnreadCountsDetailed: async (): Promise<{ [key: string]: number }> => {
        const response = await api.get<{ [key: string]: number }>('/kommunikation/beskeder/unread_counts_detailed/');
        return response;
    },
    deleteBesked: async (id: number): Promise<void> => {
        await api.delete(`/kommunikation/beskeder/${id}/`);
    },
    updateBesked: async (id: number, data: Partial<Besked>): Promise<Besked> => {
        const response = await api.patch<Besked>(`/kommunikation/beskeder/${id}/`, data);
        return response;
    },
    // New method for sync
    getModifiedBeskeder: async (modifiedAfter: string): Promise<Besked[]> => {
        const params = new URLSearchParams();
        params.append('modified_after', modifiedAfter);
        const response = await api.get<Besked[]>(`/kommunikation/beskeder/?${params.toString()}`);
        return response;
    }
};
