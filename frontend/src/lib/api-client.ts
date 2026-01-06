'use client';

const API_BASE = 'http://127.0.0.1:8000/api';

/**
 * Handle API responses
 */
async function handleResponse(res: Response) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'API error');
    }
    return res.json();
}

/**
 * GET helper
 */
export async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        credentials: 'include',
    });
    return handleResponse(res);
}

/**
 * POST helper
 */
export async function apiPost<T = any>(
    path: string,
    body?: unknown
): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
    });
    return handleResponse(res);
}
