'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiGetBlob, apiPost } from '@/lib/api-client';

type Interaction = {
    prompt_id: string;
    prompt: string;
    response: string;
    latency: number;
    created_at?: string | null;
};

export default function AuditDetailPage({ params }: { params: { auditId: string } }) {
    const auditId = params.auditId;
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('');
    const [downloading, setDownloading] = useState(false);
    const pollRef = useRef<any>(null);

    async function loadData() {
        try {
            const data = await apiGet<Interaction[]>(`/audits/${auditId}/interactions`);
            setInteractions(Array.isArray(data) ? data : []);
            
            // Check status for live updates
            const auditRes = await apiGet<any>(`/audits/${auditId}/findings-grouped`);
            const currentStatus = auditRes?.audit?.execution_status || '';
            setStatus(currentStatus);

            if (currentStatus === 'RUNNING' || currentStatus === 'PENDING') {
                if (!pollRef.current) {
                    pollRef.current = setInterval(loadData, 3000);
                }
            } else {
                if (pollRef.current) clearInterval(pollRef.current);
            }
        } catch {
            if (pollRef.current) clearInterval(pollRef.current);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [auditId]);

    async function stopAudit() {
        try {
            await apiPost(`/audits/${auditId}/stop`);
            loadData();
        } catch { alert('Failed to stop'); }
    }

    async function downloadReport() {
        try {
            setDownloading(true);
            const blob = await apiGetBlob(`/audits/${auditId}/download`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${auditId}.json`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (err: any) { alert(`Download failed: ${err?.message}`); } 
        finally { setDownloading(false); }
    }

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh', padding: 32 }}>
            <div style={header}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>
                        Audit Details <span style={{ fontFamily: 'monospace' }}>{auditId}</span>
                    </h1>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, color: '#6b7280' }}>Status: <strong>{status}</strong></span>
                        {(status === 'RUNNING' || status === 'PENDING') && (
                            <button onClick={stopAudit} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                Stop Audit
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={downloadReport} disabled={downloading || status === 'RUNNING'} style={{ ...primaryBtn, opacity: (downloading || status === 'RUNNING') ? 0.6 : 1 }}>
                        {downloading ? 'Downloading…' : 'Download JSON Report'}
                    </button>
                </div>
            </div>

            {loading ? <div style={emptyBox}>Loading evidence…</div> : (
                <div style={{ marginTop: 18 }}>
                    {interactions.map((item, index) => (
                        <div key={index} style={interactionCard}>
                            <div style={metaRow}>
                                <div>Prompt ID: <span style={{ fontWeight: 700 }}>{item.prompt_id}</span></div>
                                <div>Latency: <strong>{item.latency} ms</strong></div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <div style={blockTitle}>Prompt</div>
                                <pre style={boxStyle}>{item.prompt}</pre>
                            </div>
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

const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottom: '2px solid #e5e7eb' };
const primaryBtn = { padding: '12px 16px', background: '#111827', color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, borderRadius: 8, cursor: 'pointer' };
const emptyBox = { marginTop: 20, background: '#fff', border: '1px solid #e5e7eb', padding: 40, textAlign: 'center' as const, borderRadius: 10 };
const interactionCard = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 16 };
const metaRow = { display: 'flex', justifyContent: 'space-between', fontSize: 12 };
const blockTitle = { fontSize: 13, fontWeight: 800, marginBottom: 8 };
const boxStyle = { background: '#f9fafb', border: '1px solid #e5e7eb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' as const, fontSize: 13, lineHeight: 1.5 };