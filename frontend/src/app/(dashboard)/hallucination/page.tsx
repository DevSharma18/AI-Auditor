'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export default function HallucinationPage() {
    const [total, setTotal] = useState(0);
    const [severity, setSeverity] = useState<any>({});

    useEffect(() => {
        fetch(`${API_BASE}/metrics/hallucination`)
            .then(res => res.json())
            .then(data => {
                setTotal(data.total);
                setSeverity(data.by_severity || {});
            });
    }, []);

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Hallucination Monitoring</h1>

            <div style={{ border: '2px solid #e5e7eb', padding: 32, marginTop: 32 }}>
                <div style={{ fontSize: 64, fontWeight: 700, color: '#dc2626', textAlign: 'center' }}>
                    {total}
                </div>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    total hallucinations detected
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 32 }}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                        <div key={level} style={{ border: '2px solid #e5e7eb', padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 12 }}>{level}</div>
                            <div style={{ fontSize: 32, fontWeight: 700 }}>
                                {severity[level] || 0}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
