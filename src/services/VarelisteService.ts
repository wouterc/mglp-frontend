import { api } from '../api';
import { Vareliste, Varetype } from '../types';

export const VarelisteService = {
    async getAll(): Promise<Vareliste[]> {
        const resp = await api.get<any>('/skabeloner/vareliste/');
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async getVaretyper(): Promise<Varetype[]> {
        const resp = await api.get<any>('/skabeloner/varetyper/');
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async create(data: Partial<Vareliste>): Promise<Vareliste> {
        return await api.post<Vareliste>('/skabeloner/vareliste/', data);
    },

    async update(id: number, data: Partial<Vareliste>): Promise<Vareliste> {
        return await api.patch<Vareliste>(`/skabeloner/vareliste/${id}/`, data);
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/skabeloner/vareliste/${id}/`);
    },

    async createVaretype(data: Partial<Varetype>): Promise<Varetype> {
        return await api.post<Varetype>('/skabeloner/varetyper/', data);
    },

    // Excel functions
    async exportExcel(): Promise<Blob> {
        const response = await api.get<Response>('/skabeloner/vareliste/export_excel/', {
            rawResponse: true
        } as any);
        return await response.blob();
    },

    async importExcel(file: File): Promise<{ created: number, updated: number }> {
        const formData = new FormData();
        formData.append('file', file);
        return await api.post('/skabeloner/vareliste/import_excel/', formData);
    }
};
