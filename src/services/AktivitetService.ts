import { api } from '../api';
import { Aktivitet, AktivitetGruppeSummary } from '../types';

export const AktivitetService = {
    /**
     * Henter oversigter (summaries) for aktivitetsgrupper på en sag.
     */
    async getSummaries(sagId: number): Promise<AktivitetGruppeSummary[]> {
        return await api.get<AktivitetGruppeSummary[]>(`/aktiviteter/?sag=${sagId}`);
    },

    /**
     * Henter alle aktiviteter for en sag.
     */
    async getAllAktiviteter(sagId: number): Promise<Aktivitet[]> {
        const resp = await api.get<any>(`/aktiviteter/all/?sag=${sagId}`);
        return resp.results || resp;
    },

    /**
     * Tjekker om der er nye skabeloner tilgængelige (sync check).
     */
    async checkSyncStatus(): Promise<{ nye_aktiviteter_findes: boolean }> {
        return await api.get<any>('/skabeloner/aktiviteter/sync_check/');
    },

    /**
     * Opretter en ny aktivitet.
     */
    async createAktivitet(data: Partial<any>): Promise<Aktivitet> {
        return await api.post<Aktivitet>('/aktiviteter/', data);
    },

    /**
     * Opdaterer en eksisterende aktivitet.
     */
    async updateAktivitet(id: number, data: Partial<any>): Promise<Aktivitet> {
        return await api.patch<Aktivitet>(`/aktiviteter/${id}/`, data);
    },

    /**
     * Sletter en aktivitet.
     */
    async deleteAktivitet(id: number): Promise<void> {
        await api.delete(`/aktiviteter/${id}/`);
    },

    /**
     * Gemmer en aktivitet som skabelon.
     */
    async gemSomSkabelon(id: number): Promise<{ ny_aktivitet_nr: number }> {
        return await api.post<{ ny_aktivitet_nr: number }>(`/aktiviteter/${id}/gem_til_skabelon/`);
    },

    /**
     * Synkroniserer aktiviteter for en sag (opretter fra skabeloner).
     */
    async synkroniser(sagId: number): Promise<void> {
        await api.post(`/sager/${sagId}/synkroniser_aktiviteter/`);
    },

    /**
     * Henter aktiviteter markeret til mailkurv (skal_mailes=true).
     */
    async getMailBasket(sagId: number): Promise<Aktivitet[]> {
        const resp = await api.get<any>(`/aktiviteter/all/?sag=${sagId}&skal_mailes=true`);
        return resp.results || resp;
    },

    /**
     * Fjerner en aktivitet fra mailkurven (sætter skal_mailes=false).
     */
    async removeFromBasket(id: number): Promise<Aktivitet> {
        return await api.patch<Aktivitet>(`/aktiviteter/${id}/`, { skal_mailes: false });
    }
};
