import { api } from '../api';
import { Sag } from '../types';

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
    }
};
