import { api } from '../api';
import { FileItem } from '../types';

export const FilService = {
    /**
     * Henter filliste for en given sti.
     */
    async getFiler(sagId: number, path: string): Promise<FileItem[]> {
        return await api.get<FileItem[]>(`/sager/filer/?sag_id=${sagId}&path=${encodeURIComponent(path)}`);
    },

    /**
     * Downloader flere filer som zip.
     * Returnerer Response objektet for raw stream handling.
     */
    async downloadMultiple(sagId: number, paths: string[]): Promise<Response> {
        return await api.post<Response>(`/sager/filer/download_multiple/`, {
            sag_id: sagId,
            paths: paths
        }, { rawResponse: true } as any);
    },

    /**
     * Downloader en enkelt fil.
     * Returnerer Response objektet.
     */
    async downloadFil(sagId: number, path: string, view: boolean = false): Promise<Response> {
        const url = `/sager/filer/download/?sag_id=${sagId}&path=${encodeURIComponent(path)}${view ? '&view=1' : ''}`;
        return await api.get<Response>(url, { rawResponse: true } as any);
    },

    /**
     * Uploader filer via FormData.
     */
    async uploadFiler(formData: FormData): Promise<void> {
        await api.post('/sager/filer/upload/', formData);
    },

    /**
     * Opretter en ny mappe.
     */
    async createFolder(sagId: number, path: string, name: string): Promise<void> {
        await api.post('/sager/filer/create_folder/', {
            sag_id: sagId,
            path: path,
            name: name
        });
    },

    /**
     * Sletter en fil eller mappe.
     */
    async deleteEntry(sagId: number, path: string): Promise<void> {
        await api.post('/sager/filer/delete_entry/', {
            sag_id: sagId,
            path: path
        });
    },

    /**
     * Omdøber en fil eller mappe.
     */
    async renameEntry(sagId: number, path: string, newName: string): Promise<void> {
        await api.post('/sager/filer/rename_entry/', {
            sag_id: sagId,
            path: path,
            new_name: newName
        });
    },

    /**
     * Flytter en fil eller mappe.
     */
    async moveEntry(sagId: number, sourcePath: string, targetPath: string): Promise<void> {
        await api.post('/sager/filer/move_entry/', {
            sag_id: sagId,
            source_path: sourcePath,
            target_path: targetPath
        });
    }
};
