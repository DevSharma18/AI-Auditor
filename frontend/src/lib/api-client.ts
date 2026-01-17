'use client';

/**
 * Base API URL
 * MUST end at /api
 * NEVER include a specific endpoint
 */
const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:8000/api';

async function handleResponse(res: Response) {
    if (!res.ok) {
        let message = 'API error';
        try {
            const data = await res.json();
            message = data?.detail || data?.message || message;
        } catch {
            try {
                message = await res.text();
            } catch {
                message = message;
            }
        }
        throw new Error(message);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    return res.text();
}

function normalizePath(path: string) {
    return path.startsWith('/') ? path : `/${path}`;
}

export async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${normalizePath(path)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
    });
    return handleResponse(res) as Promise<T>;
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${normalizePath(path)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res) as Promise<T>;
}

/**
 * Download file/blob (used for audit JSON report)
 */
export async function apiGetBlob(path: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}${normalizePath(path)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        let message = 'Download failed';
        try {
            const data = await res.json();
            message = data?.detail || data?.message || message;
        } catch {
            message = await res.text();
        }
        throw new Error(message);
    }

    return await res.blob();
}
