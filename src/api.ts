// --- Fil: src/api.ts ---
import { API_BASE_URL } from './config';
import { getCookie } from './utils';

/**
 * En wrapper omkring fetch, der automatisk håndterer:
 * 1. credentials: 'include' (for session cookies)
 * 2. X-CSRFToken header (for mutations: POST, PUT, PATCH, DELETE)
 * 3. JSON-parsing og fejlhåndtering
 */

interface RequestOptions extends RequestInit {
    body?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, ...rest } = options;

    const config: RequestInit = {
        method,
        credentials: 'include',
        headers: {
            ...headers,
        },
        ...rest,
    };

    // Tilføj Content-Type hvis vi sender en body
    if (body && !(body instanceof FormData)) {
        (config.headers as any)['Content-Type'] = 'application/json';
        config.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
        config.body = body;
    }

    // Tilføj CSRF-token for muterende metoder
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken) {
            (config.headers as any)['X-CSRFToken'] = csrfToken;
        }
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, config);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: response.statusText };
        }
        const error = new Error(errorData.detail || errorData.error || JSON.stringify(errorData) || 'API kald fejlede');
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
    }

    // Support raw response if requested (e.g. for Blobs)
    if ((options as any).rawResponse) {
        return response as any;
    }

    // Nogle endpoints returnerer ingen body (204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body?: any, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'POST', body }),
    put: <T>(endpoint: string, body?: any, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PUT', body }),
    patch: <T>(endpoint: string, body?: any, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PATCH', body }),
    delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
