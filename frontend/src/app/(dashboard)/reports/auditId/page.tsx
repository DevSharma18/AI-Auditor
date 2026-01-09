'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function AuditDetailPage({ params }: { params: { auditId: string } }) {
    const [interactions, setInteractions] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${API_BASE}/audits/${params.auditId}/interactions`)
            .then(res => res.json())
            .then(setInteractions);
    }, [params.auditId]);

    const downloadReport = () => {
        window.open(`${API_BASE}/audits/${params.auditId}/download`, '_blank');
    };

    return (
        <div style={{ padding: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>
                Audit Report: {params.auditId}
            </h1>

            <button
                onClick={downloadReport}
                style={{
                    margin: '16px 0',
                    padding: '10px 24px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                }}
            >
                Download JSON Report
            </button>

            {interactions.map((item, index) => (
                <div
                    key={index}
                    style={{
                        border: '2px solid #e5e7eb',
                        padding: 20,
                        marginBottom: 20,
                    }}
                >
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                        Prompt ID: {item.prompt_id} | Latency: {item.latency}s
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <strong>Prompt</strong>
                        <pre style={boxStyle}>{item.prompt}</pre>
                    </div>

                    <div>
                        <strong>Response</strong>
                        <pre style={boxStyle}>{item.response}</pre>
                    </div>
                </div>
            ))}
        </div>
    );
}

const boxStyle = {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    padding: 12,
    whiteSpace: 'pre-wrap' as const,
};
