import { api } from '../api';
import { Sag, FakturaLine } from '../types';

export const SagService = {
    /**
     * Henter alle sager.
     */
    async getSager(): Promise<Sag[]> {
        const resp = await api.get<any>('/sager/');
        return Array.isArray(resp.results) ? resp.results : Array.isArray(resp) ? resp : [];
    },

    /**
     * Henter en enkelt sag baseret på ID.
     */
    async getSag(id: number): Promise<Sag> {
        return await api.get<Sag>(`/sager/${id}/`);
    },

    /**
     * Søger i sager.
     * Returtypen er any[], da API'et returnerer en simplificeret liste.
     */
    async searchSager(query: string): Promise<any[]> {
        return await api.get<any[]>(`/sager/search/?q=${query}`);
    },

    /**
     * Opdaterer en sag (stamdata, status osv.)
     */
    async updateSag(id: number, data: Partial<any>): Promise<Sag> {
        return await api.patch<Sag>(`/sager/${id}/`, data);
    },

    /**
     * Opretter en ny sag.
     */
    async createSag(data: Partial<any>): Promise<Sag> {
        return await api.post<Sag>('/sager/', data);
    },

    /**
     * Sletter en sag.
     */
    async deleteSag(id: number): Promise<void> {
        await api.delete(`/sager/${id}/`);
    },

    /**
     * Trigger oprettelse af aktiviteter fra skabelon på sagen.
     */
    async opretAktiviteter(id: number): Promise<any> {
        return await api.post(`/sager/${id}/opret_aktiviteter/`, {});
    },

    /**
     * Trigger synkronisering af dokumentstruktur.
     */
    async synkroniserDokumenter(id: number): Promise<any> {
        return await api.post(`/sager/${id}/synkroniser_dokumenter/`, {});
    },

    /**
     * Henter rådgivertilknytninger for en sag.
     */
    async getRaadgiverTilknytninger(id: number): Promise<any[]> {
        return await api.get<any[]>(`/sager/raadgivere/?sag_id=${id}`);
    },

    /**
     * Henter fakturalinjer for en sag.
     */
    async getFakturaLines(id: number): Promise<FakturaLine[]> {
        const resp = await api.get<any>(`/sager/sagsfaktura/?sag_id=${id}`);
        return Array.isArray(resp.results) ? resp.results : Array.isArray(resp) ? resp : [];
    },

    /**
     * Henter ALLE fakturalinjer på tværs af alle sager.
     */
    async getAllFakturaLines(params?: {
        page?: number;
        search?: string;
        status?: string;
        ordering?: string;
        page_size?: number;
    }): Promise<{ count: number; next: string | null; previous: string | null; results: FakturaLine[] }> {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', params.page.toString());
        if (params?.search) query.append('search', params.search);
        if (params?.status && params.status !== 'all') query.append('status', params.status);
        if (params?.ordering) query.append('ordering', params.ordering);
        if (params?.page_size) query.append('page_size', params.page_size.toString());

        const queryString = query.toString();
        return await api.get(`/sager/sagsfaktura/${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Opretter en fakturalinje.
     */
    async createFakturaLine(data: any): Promise<any> {
        return await api.post<any>('/sager/sagsfaktura/', data);
    },

    /**
     * Opdaterer en fakturalinje.
     */
    async updateFakturaLine(id: number, data: any): Promise<any> {
        return await api.patch<any>(`/sager/sagsfaktura/${id}/`, data);
    },

    /**
     * Sletter en fakturalinje.
     */
    async deleteFakturaLine(id: number): Promise<void> {
        await api.delete(`/sager/sagsfaktura/${id}/`);
    }
};
