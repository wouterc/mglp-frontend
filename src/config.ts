// --- Fil: src/config.ts ---
/**
 * API_BASE_URL styres nu udelukkende via .env filer.
 * Lokalt: .env (peger på localhost:8000)
 * Produktion: .env.production (peger på /api)
 */

// @ts-ignore - Vite håndterer import.meta.env, men TS kan drille under build
const envUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL: string = envUrl || '/api';
