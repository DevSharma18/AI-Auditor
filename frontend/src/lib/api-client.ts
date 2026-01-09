'use client';

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
            message = await res.text();
        }
        throw new Error(message);
    }
    return res.json();
}

function normalizePath(path: string) {
    return path.startsWith('/') ? path : `/${path}`;
}

export async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${normalizePath(path)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
}

export async function apiPost<T = any>(
    path: string,
    body?: unknown
): Promise<T> {
    const res = await fetch(`${API_BASE}${normalizePath(path)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
}
