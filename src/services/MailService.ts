import { api } from '../api';
import { IncomingEmail, OutgoingEmail, IncomingEmailDetail } from '../types';

export const MailService = {
    // --- Incoming Emails ---
    async getEmailsForSag(sagId: number): Promise<IncomingEmail[]> {
        const resp = await api.get<{ emails: IncomingEmail[] }>(`/emails/case/${sagId}/`);
        return resp.emails;
    },

    async getEmailDetail(emailId: number): Promise<IncomingEmailDetail> {
        return await api.get<IncomingEmailDetail>(`/emails/message/${emailId}/`);
    },

    async toggleHandled(emailId: number): Promise<void> {
        await api.post('/emails/toggle-handled/', { email_id: emailId });
    },

    async addComment(emailId: number, kommentar: string, kommentarVigtig: boolean): Promise<{ kommentar: string; kommentar_vigtig: boolean }> {
        return await api.post<any>('/emails/comment/', {
            email_id: emailId,
            kommentar: kommentar,
            kommentar_vigtig: kommentarVigtig
        });
    },

    async attachEmailFileToDoc(docId: number, attachmentId: number): Promise<void> {
        await api.post(`/sager/sagsdokumenter/${docId}/attach_email_file/`, { attachment_id: attachmentId });
    },


    // --- Outgoing Emails (MailKurv) ---
    async getOutgoingEmails(sagId: number, limit = 5): Promise<OutgoingEmail[]> {
        return await api.get<OutgoingEmail[]>(`/emails/outgoing/?sag=${sagId}&limit=${limit}`);
    },

    async retryOutgoing(id: number): Promise<void> {
        await api.post(`/emails/outgoing/${id}/retry/`);
    },

    async completeOutgoing(id: number): Promise<void> {
        await api.post(`/emails/outgoing/${id}/mark_completed/`);
    },

    async deleteOutgoing(id: number): Promise<void> {
        await api.delete(`/emails/outgoing/${id}/`);
    },

    async resetBasket(sagId: number): Promise<void> {
        await api.post(`/sager/${sagId}/reset_mail_basket/`);
    },

    async downloadAttachment(attachmentId: number): Promise<void> {
        try {
            const { API_BASE_URL } = await import('../config');
            const res = await fetch(`${API_BASE_URL}/emails/attachment/${attachmentId}/`, { credentials: 'include' });
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
            let filename = 'vedhæftning';
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
