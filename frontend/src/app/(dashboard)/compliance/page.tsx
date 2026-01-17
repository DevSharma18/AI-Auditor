'use client';

import { useEffect, useMemo, useState } from 'react';

type ComplianceResponse = {
    complianceCoverageScore: number;
    regulatoryExposure: 'LOW' | 'MEDIUM' | 'HIGH';
    modelsAtRisk: number;
    totalViolations: number;
    violationsBySeverity: { severity: string; count: number }[];
};

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export default function CompliancePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [coverage, setCoverage] = useState(0);
    const [exposure, setExposure] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [modelsAtRisk, setModelsAtRisk] = useState(0);
    const [totalViolations, setTotalViolations] = useState(0);
    const [violations, setViolations] = useState<{ severity: string; count: number }[]>([]);

    useEffect(() => {
        async function loadCompliance() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE}/metrics/compliance`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || 'Failed to fetch compliance metrics');
                }

                const data = (await res.json()) as ComplianceResponse;

                setCoverage(Number(data?.complianceCoverageScore ?? 0));
                setExposure((data?.regulatoryExposure ?? 'LOW') as any);
                setModelsAtRisk(Number(data?.modelsAtRisk ?? 0));
                setTotalViolations(Number(data?.totalViolations ?? 0));
                setViolations(Array.isArray(data?.violationsBySeverity) ? data.violationsBySeverity : []);
            } catch (err: any) {
                setError(err?.message || 'Failed to load compliance metrics');
            } finally {
                setLoading(false);
            }
        }

        loadCompliance();
    }, []);

    const exposureColor = useMemo(() => {
        return exposure === 'HIGH'
            ? '#dc2626'
            : exposure === 'MEDIUM'
                ? '#f59e0b'
                : '#10b981';
    }, [exposure]);

    const safeTitle = {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: '8px',
        lineHeight: 1.2,
        wordBreak: 'break-word' as const,
    };

    const safeSub = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.5,
        wordBreak: 'break-word' as const,
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={safeTitle}>Compliance</h1>
                    <p style={safeSub}>Loading compliance metrics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={safeTitle}>Compliance</h1>
                    <p style={safeSub}>
                        Monitor compliance posture and regulatory exposure across audited models
                    </p>
                </div>

                <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
                        Failed to load compliance metrics
                    </div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', lineHeight: 1.5 }}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={safeTitle}>Compliance</h1>
                <p style={safeSub}>
                    Monitor compliance posture and regulatory exposure across audited models
                </p>
            </div>

            {/* Top Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, margin: '32px 0 48px' }}>
                <Metric title="Compliance Coverage Score" value={`${coverage}%`} color="#10b981" />
                <Metric title="Regulatory Exposure" value={exposure} color={exposureColor} />
                <Metric title="Models At Risk" value={modelsAtRisk} color="#dc2626" />
            </div>

            {/* Violations */}
            <div style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>
                    Compliance Violations
                </h3>

                <div style={{ fontSize: 48, fontWeight: 700, color: '#dc2626', textAlign: 'center', lineHeight: 1 }}>
                    {totalViolations}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 24 }}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                        const row = violations.find((v) => String(v.severity).toUpperCase() === sev);
                        const count = row ? row.count : 0;

                        return (
                            <div key={sev} style={{ border: '2px solid #e5e7eb', padding: 16, textAlign: 'center', overflow: 'hidden' }}>
                                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {sev}
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{count}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Metric({ title, value, color }: { title: string; value: any; color: string }) {
    return (
        <div style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', wordBreak: 'break-word' }}>
                {title}
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color, lineHeight: 1.1, wordBreak: 'break-word' }}>
                {value}
            </div>
        </div>
    );
}
