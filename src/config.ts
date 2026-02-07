// --- Fil: src/config.ts ---
/**
 * API_BASE_URL styres nu udelukkende via .env filer.
 * Lokalt: .env (peger på localhost:8000)
 * Produktion: .env.production (peger på /api)
 */

// @ts-ignore - Vite håndterer import.meta.env, men TS kan drille under build
const envUrl = import.meta.env.VITE_API_BASE_URL;
let baseUrl = envUrl || '/api';

// Normalize: ensure it doesn't end with a slash
if (baseUrl.endsWith('/') && baseUrl.length > 1) {
    baseUrl = baseUrl.slice(0, -1);
}

export const API_BASE_URL: string = baseUrl;
