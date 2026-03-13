import { api } from '../api';
import { SkabAktivitet, SkabDokument, Blokinfo } from '../types';

interface PaginatedResponse<T> {
    results: T[];
    next: string | null;
}

export const SkabelonService = {
    // --- Aktiviteter ---
    async getAktivitetsskabeloner(queryString: string): Promise<PaginatedResponse<SkabAktivitet>> {
        return await api.get<PaginatedResponse<SkabAktivitet>>(`/skabeloner/aktiviteter/?${queryString}`);
    },

    async checkAktivitetSync(queryString: string): Promise<{ nye_aktiviteter_findes: boolean, mangler_per_skabelon: Record<number, boolean> }> {
        return await api.get<any>(`/skabeloner/aktiviteter/sync_check/?${queryString}`);
    },

    async updateAktivitet(id: number, data: Partial<SkabAktivitet>): Promise<SkabAktivitet> {
        return await api.patch<SkabAktivitet>(`/skabeloner/aktiviteter/${id}/`, data);
    },

    async createAktivitet(data: Partial<SkabAktivitet>): Promise<SkabAktivitet> {
        return await api.post<SkabAktivitet>('/skabeloner/aktiviteter/', data);
    },

    // --- Dokumenter ---
    async getDokumentskabeloner(queryString: string): Promise<PaginatedResponse<SkabDokument>> {
        return await api.get<PaginatedResponse<SkabDokument>>(`/skabeloner/dokumenter/?${queryString}`);
    },

    async checkDokumentSync(queryString: string): Promise<{ nye_dokumenter_findes: boolean, mangler_per_skabelon: Record<number, boolean> }> {
        return await api.get<any>(`/skabeloner/dokumenter/sync_check/?${queryString}`);
    },

    async updateDokument(id: number, data: Partial<SkabDokument>): Promise<SkabDokument> {
        return await api.patch<SkabDokument>(`/skabeloner/dokumenter/${id}/`, data);
    },

    async createDokument(data: Partial<SkabDokument>): Promise<SkabDokument> {
        return await api.post<SkabDokument>('/skabeloner/dokumenter/', data);
    },

    // --- Lookups ---
    async getGrupperForProces(procesId: number): Promise<Blokinfo[]> {
        return await api.get<Blokinfo[]>(`/skabeloner/blokinfo/${procesId}/grupper/`);
    },

    // --- Blokinfo (Generel) ---
    async getBlokinfo(): Promise<Blokinfo[]> {
        const resp = await api.get<any>('/skabeloner/blokinfo/');
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async updateBlokinfo(id: number, data: Partial<Blokinfo>): Promise<Blokinfo> {
        return await api.put<Blokinfo>(`/skabeloner/blokinfo/${id}/`, data);
    },

    async createBlokinfo(data: Partial<Blokinfo>): Promise<Blokinfo> {
        return await api.post<Blokinfo>('/skabeloner/blokinfo/', data);
    },

    // --- Flow Regler ---
    async getFlowRegler(): Promise<any[]> {
        const resp = await api.get<any>('/skabeloner/flow-regler/');
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async createFlowRegel(data: any): Promise<any> {
        return await api.post<any>('/skabeloner/flow-regler/', data);
    },

    async updateFlowRegel(id: number, data: any): Promise<any> {
        return await api.patch<any>(`/skabeloner/flow-regler/${id}/`, data);
    },

    async deleteFlowRegel(id: number): Promise<void> {
        await api.delete(`/skabeloner/flow-regler/${id}/`);
    },

    async exportFlowReglerJson(): Promise<any[]> {
        return await api.get<any[]>('/skabeloner/flow-regler/export_json/');
    },

    async importFlowReglerJson(data: any): Promise<any> {
        return await api.post<any>('/skabeloner/flow-regler/import_json/', data);
    },

    async exportFlowReglerExcel(): Promise<Blob> {
        const response = await api.get<Response>('/skabeloner/flow-regler/export_excel/', { rawResponse: true } as any);
        return await response.blob();
    },

    async importFlowReglerExcel(formData: FormData): Promise<any> {
        return await api.post<any>('/skabeloner/flow-regler/import_excel/', formData);
    }
};
