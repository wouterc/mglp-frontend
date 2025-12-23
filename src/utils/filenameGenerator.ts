import dayjs from 'dayjs';

export interface FilenameResult {
    filename: string;
    needsInput: boolean;
}

/**
 * Genererer et filnavn baseret på sagsnummer, skabelonens navneformat og eventuelt brugerinput.
 * Håndterer tags som <dato>, <årstal> og <input>.
 */
export const generateDocFilename = (
    sagsNr: string | number,
    templateFilename: string | null,
    originalFilename: string,
    userInput?: string
): FilenameResult => {
    // 1. Hvis ingen skabelon er defineret, brug standard format: [SagsNr]_[OriginalFilnavn]
    if (!templateFilename || !templateFilename.trim()) {
        return {
            filename: `${sagsNr}_${originalFilename}`,
            needsInput: false
        };
    }

    let newFilename = templateFilename;

    // 2. Erstat dato-baserede tags
    const now = dayjs();
    // <dato> -> DD.MM.YYYY eller lignende? Bruger sagde "dd". Men i eksempel '22-12-2025'. 
    // Lad os bruge DD-MM-YYYY for at være safes, medmindre 'dd' betyder dag-nummer. 
    // Brugeren sagde: "<dato> skiftes ud med dd." -> Det kunne betyde DAGEN (f.eks. '22').
    // Men i kontekst af "Attest af <dato>" menes nok datoen.
    // Jeg vælger DD-MM-YYYY indtil videre.
    newFilename = newFilename.replace(/<dato>/gi, now.format('DD-MM-YYYY'));
    newFilename = newFilename.replace(/<årstal>/gi, now.format('YYYY'));

    // 3. Tjek for <input> tag
    if (newFilename.toLowerCase().includes('<input>')) {
        if (userInput !== undefined && userInput !== null) {
            // Replace all occurrences case-insensitive
            newFilename = newFilename.replace(/<input>/gi, userInput);
        } else {
            // Hvis vi støder på <input> men ikke har fået noget input, så stop og bed om det.
            return { filename: '', needsInput: true };
        }
    }

    // 4. Håndter fil-extension
    // Tag extension fra den uploadede fil (originalFilename)
    const parts = originalFilename.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';

    if (ext) {
        // Hvis det genererede navn ikke allerede ender på den korrekte extension
        if (!newFilename.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
            newFilename = `${newFilename}.${ext}`;
        }
    }

    // 5. Præfix med sagsnummer
    const finalFilename = `${sagsNr}_${newFilename}`;

    return { filename: finalFilename, needsInput: false };
};
