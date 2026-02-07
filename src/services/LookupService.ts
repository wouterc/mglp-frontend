import { api } from '../api';
import { User, Status, InformationsKilde, StandardMappe, Blokinfo, BbrAnvendelse } from '../types';

export const LookupService = {
    async getUsers(): Promise<User[]> {
        return await api.get<User[]>('/kerne/users/');
    },

    async getStatusser(formaal?: number): Promise<Status[]> {
        const url = formaal ? `/kerne/status/?formaal=${formaal}` : '/kerne/status/';
        const resp = await api.get<any>(url);
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async getInformationsKilder(): Promise<InformationsKilde[]> {
        return await api.get<InformationsKilde[]>('/kerne/informationskilder/');
    },

    async getBlokinfoSkabeloner(): Promise<Blokinfo[]> {
        const resp = await api.get<any>('/skabeloner/blokinfo/');
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async getStandardMapper(): Promise<StandardMappe[]> {
        return await api.get<StandardMappe[]>('/kerne/standardmapper/');
    },

    async getBbrAnvendelser(): Promise<BbrAnvendelse[]> {
        return await api.get<BbrAnvendelse[]>('/kerne/bbr-anvendelser/');
    },

    async getEmailAccounts(): Promise<any[]> {
        const resp = await api.get<any>('/emails/accounts/');
        const accounts = Array.isArray(resp) ? resp : resp.results || [];
        return accounts;
    },

    async getVirksomheder(params?: Record<string, any>): Promise<any[]> {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const resp = await api.get<any>(`/register/virksomheder/${query}`);
        return Array.isArray(resp) ? resp : resp.results || [];
    },

    async getKontakter(params?: Record<string, any>): Promise<any[]> {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const resp = await api.get<any>(`/register/kontakter/${query}`);
        return Array.isArray(resp) ? resp : resp.results || [];
    }
};
