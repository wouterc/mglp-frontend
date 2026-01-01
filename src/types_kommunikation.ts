import { User } from './types';

export { User };
export type UserConfig = User;

// Kommunikation
export interface Team {
    id: number;
    navn: string;
    beskrivelse?: string;
    medlemmer: number[];
    medlemmer_details?: UserConfig[];
    oprettet: string;
}

export type MessageType = 'NORMAL' | 'VIGTIG' | 'INFO' | 'HANDLING';

function getMessageTypeLabel(type: MessageType): string {
    switch (type) {
        case 'NORMAL': return 'Normal';
        case 'VIGTIG': return 'Vigtig';
        case 'INFO': return 'Info';
        case 'HANDLING': return 'Handling';
        default: return type;
    }
}

export interface Besked {
    id: number;
    afsender: number;
    afsender_details: UserConfig;
    modtager_person?: number;
    modtager_person_details?: UserConfig;
    modtager_team?: number;
    modtager_team_details?: Team;
    indhold: string;
    type: MessageType;
    parent?: number;
    replies?: Besked[];
    link_url?: string;
    link_titel?: string;
    oprettet: string;
    opdateret: string;
    laest_af_mig: boolean;
    laest_af_count: number;
}
