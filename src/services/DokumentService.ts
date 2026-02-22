import { api } from '../api';
import { SagsDokument, Status } from '../types';

export const DokumentService = {
    /**
     * Henter dokumenter for en given sag.
     */
    async getDokumenter(sagId: number): Promise<SagsDokument[]> {
        return await api.get<SagsDokument[]>(`/sager/sagsdokumenter/?sag_id=${sagId}`);
    },

    /**
     * Opretter en ny dokumentrække (uden fil).
     */
    async createDokumentRow(data: {
        sag: number;
        gruppe: number;
        titel: string;
        dokument_nr: number;
        aktiv: boolean;
        status_id: number | null;
        informations_kilde_id?: number;
        undermappe_id?: number | null;
    }): Promise<SagsDokument> {
        return await api.post<SagsDokument>('/sager/sagsdokumenter/', data);
    },

    /**
     * Uploader en fil til en eksisterende dokumentrække.
     */
    async uploadFil(docId: number, file: File, statusId?: number, undermappeId?: number | null): Promise<SagsDokument> {
        const formData = new FormData();
        formData.append('fil', file);
        formData.append('last_modified', file.lastModified.toString());

        if (statusId) {
            formData.append('status_id', statusId.toString());
        }

        if (undermappeId !== undefined) {
            // Sender tom streng hvis null/undefined for at fjerne mappetilknytning
            formData.append('undermappe_id', undermappeId ? undermappeId.toString() : '');
        }

        return await api.patch<SagsDokument>(`/sager/sagsdokumenter/${docId}/`, formData);
    },

    /**
     * Sletter en fil fra en dokumentrække (men beholder rækken).
     */
    async deleteFil(docId: number): Promise<SagsDokument> {
        return await api.patch<SagsDokument>(`/sager/sagsdokumenter/${docId}/`, { fil: null });
    },

    /**
     * Sletter hele dokumentrækken.
     */
    async deleteDokumentRow(docId: number): Promise<void> {
        await api.delete(`/sager/sagsdokumenter/${docId}/`);
    },

    /**
     * Opdaterer metadata på et dokument (kommentar, titel, status, etc.).
     */
    async updateDokument(docId: number, data: Partial<any>): Promise<SagsDokument> {
        return await api.patch<SagsDokument>(`/sager/sagsdokumenter/${docId}/`, data);
    },

    /**
     * Linker en fil fra filsystemet til en dokumentrække.
     */
    async linkFil(docId: number, path: string): Promise<SagsDokument> {
        return await api.post<SagsDokument>(`/sager/sagsdokumenter/${docId}/link_file/`, { path });
    },

    /**
     * Gemmer et dokument som skabelon.
     */
    async gemSomSkabelon(docId: number): Promise<void> {
        await api.post(`/sager/sagsdokumenter/${docId}/gem_til_skabelon/`);
    },

    /**
     * Synkroniserer dokumenter for en sag.
     */
    async synkroniser(sagId: number): Promise<void> {
        await api.post(`/sager/${sagId}/synkroniser_dokumenter/`);
    },

    /**
     * Tjekker om der er nye dokumenter på serveren (synchro check).
     */
    async checkSyncStatus(): Promise<{ nye_dokumenter_findes: boolean }> {
        return await api.get<any>('/skabeloner/dokumenter/sync_check/');
    },

    /**
     * Henter dokumenter markeret til mailkurv (skal_mailes=true).
     */
    async getMailBasket(sagId: number): Promise<SagsDokument[]> {
        return await api.get<SagsDokument[]>(`/sager/sagsdokumenter/?sag_id=${sagId}&skal_mailes=true`);
    },

    /**
     * Fjerner et dokument fra mailkurven (sætter skal_mailes=false).
     */
    async removeFromBasket(id: number): Promise<SagsDokument> {
        return await api.patch<SagsDokument>(`/sager/sagsdokumenter/${id}/`, { skal_mailes: false });
    },

    async openDokument(docId: number): Promise<void> {
        try {
            const { API_BASE_URL } = await import('../config');
            const res = await fetch(`${API_BASE_URL}/sager/sagsdokumenter/${docId}/open_file/`, { credentials: 'include' });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                alert(text || 'Filen kunne ikke åbnes. Prøv igen eller kontakt administrator.');
                return;
            }
            const blob = await res.blob();
            const contentType = res.headers.get('content-type') || 'application/octet-stream';
            const typedBlob = new Blob([blob], { type: contentType });
            const url = URL.createObjectURL(typedBlob);

            // Extract filename from Content-Disposition header
            const disposition = res.headers.get('content-disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
            let filename = 'dokument';
            if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1]);
            }

            // For browser-viewable types (PDF, images), open inline
            const inlineTypes = ['application/pdf', 'image/', 'text/'];
            const canInline = inlineTypes.some(t => contentType.startsWith(t));

            if (canInline) {
                window.open(url, '_blank');
            } else {
                // For non-viewable types, trigger a download with the correct filename
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            console.error(err);
            alert('Filen kunne ikke findes på serveren. Kontakt administrator.');
        }
    }
};
