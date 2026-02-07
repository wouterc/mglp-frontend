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
    }
};
