'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiGetBlob } from '@/lib/api-client';

type Interaction = {
    prompt_id: string;
    prompt: string;
    response: string;
    latency: number;
    created_at?: string | null;
};

export default function AuditDetailPage({
    params,
}: {
    params: { auditId: string };
}) {
    const auditId = params.auditId;

    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    async function loadInteractions(isRefresh = false) {
        try {
            setError(null);

            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const data = await apiGet<Interaction[]>(`/audits/${auditId}/interactions`);
            setInteractions(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setInteractions([]);
            setError(err?.message || 'Failed to load audit interactions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadInteractions(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auditId]);

    async function downloadReport() {
        try {
            setDownloading(true);

            const blob = await apiGetBlob(`/audits/${auditId}/download`);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${auditId}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(`Download failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh', padding: 32 }}>
            {/* Header */}
            <div style={header}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>
                        Audit Details{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {auditId}
                        </span>
                    </h1>

                    <p style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
                        Prompt/response evidence for this audit run (stored in DB).
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => loadInteractions(true)}
                        disabled={loading || refreshing}
                        style={{
                            ...secondaryBtn,
                            opacity: loading || refreshing ? 0.6 : 1,
                            cursor: loading || refreshing ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>

                    <button
                        onClick={downloadReport}
                        disabled={downloading}
                        style={{
                            ...primaryBtn,
                            opacity: downloading ? 0.6 : 1,
                            cursor: downloading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {downloading ? 'Downloading…' : 'Download JSON Report'}
                    </button>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div style={emptyBox}>Loading audit evidence…</div>
            ) : error ? (
                <div style={emptyBox}>
                    <div style={{ fontWeight: 800, color: '#b91c1c', marginBottom: 8 }}>
                        Failed to load interactions
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{error}</div>
                </div>
            ) : interactions.length === 0 ? (
                <div style={emptyBox}>No interactions found for this audit.</div>
            ) : (
                <div style={{ marginTop: 18 }}>
                    <div style={{ marginBottom: 14, fontSize: 14, color: '#374151' }}>
                        Showing <strong>{interactions.length}</strong> stored interactions
                    </div>

                    {interactions.map((item, index) => (
                        <div key={index} style={interactionCard}>
                            {/* Meta */}
                            <div style={metaRow}>
                                <div>
                                    Prompt ID:{' '}
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                        {item.prompt_id}
                                    </span>
                                </div>

                                <div style={{ color: '#6b7280' }}>
                                    Latency:{' '}
                                    <span style={{ fontWeight: 700, color: '#111827' }}>
                                        {item.latency} ms
                                    </span>
                                </div>
                            </div>

                            {/* Prompt */}
                            <div style={{ marginTop: 14 }}>
                                <div style={blockTitle}>Prompt</div>
                                <pre style={boxStyle}>{item.prompt}</pre>
                            </div>

                            {/* Response */}
                            <div style={{ marginTop: 14 }}>
                                <div style={blockTitle}>Response</div>
                                <pre style={boxStyle}>{item.response}</pre>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* =========================
   STYLES
========================= */

const header = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingBottom: 18,
    borderBottom: '2px solid #e5e7eb',
};

const primaryBtn = {
    padding: '12px 16px',
    background: '#111827',
    color: '#ffffff',
    border: 'none',
    fontSize: 14,
    fontWeight: 800,
    borderRadius: 8,
};

const secondaryBtn = {
    padding: '12px 16px',
    background: '#ffffff',
    color: '#111827',
    border: '1px solid #e5e7eb',
    fontSize: 14,
    fontWeight: 800,
    borderRadius: 8,
};

const emptyBox = {
    marginTop: 20,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: 40,
    textAlign: 'center' as const,
    color: '#666666',
    borderRadius: 10,
};

const interactionCard = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
};

const metaRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#111827',
};

const blockTitle = {
    fontSize: 13,
    fontWeight: 800,
    color: '#111827',
    marginBottom: 8,
};

const boxStyle = {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    padding: 12,
    borderRadius: 8,
    whiteSpace: 'pre-wrap' as const,
    fontSize: 13,
    lineHeight: 1.5,
};
