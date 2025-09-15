// --- Fil: src/config.ts ---
// Læser API URL'en fra environment variabler.
// Dette giver fleksibilitet til at have forskellige URL'er for udvikling og produktion.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';