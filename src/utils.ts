// --- Fil: src/utils.ts ---

/**
 * Henter værdien af en navngiven cookie.
 * Bruges primært til at hente 'csrftoken' til Django API kald.
 */
export function getCookie(name: string): string | null {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Check om denne cookie starter med det navn vi leder efter
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
