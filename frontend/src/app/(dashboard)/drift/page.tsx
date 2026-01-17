'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';

type DriftResponse = {
    status: string;
    score: number | null;
};

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export default function DriftPage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('NOT_IMPLEMENTED');

    useEffect(() => {
        async function loadDrift() {
            try {
                setLoading(true);

                const res = await fetch(`${API_BASE}/metrics/drift`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    setStatus('NOT_IMPLEMENTED');
                    return;
                }

                const data = (await res.json()) as DriftResponse;
                setStatus(String(data?.status ?? 'NOT_IMPLEMENTED'));
            } finally {
                setLoading(false);
            }
        }

        loadDrift();
    }, []);

    // Placeholders matching Dev UI (until backend supports drift)
    const driftScore = useMemo(() => {
        return {
            baseline: 0.0,
            current: 0.0,
            change: '0%',
            status: status === 'NOT_IMPLEMENTED' ? 'PENDING' : 'ACTIVE',
        };
    }, [status]);

    const accuracyDeviation = useMemo(() => {
        return { baseline: 0.0, current: 0.0, deviation: 0.0 };
    }, []);

    const distributionShift = useMemo(() => {
        return { psi: 0.0, ks: 0.0, wasserstein: 0.0 };
    }, []);

    const behaviorAlerts = useMemo(() => {
        return [] as { modelName: string; changeType: string; severity: string; detectedAt: string; impact: string }[];
    }, []);

    const fairnessData = useMemo(() => {
        return [
            { name: 'False Positives', value: 0 },
            { name: 'False Negatives', value: 0 },
            { name: 'Favorable Outcomes', value: 0 },
        ];
    }, []);

    const biasPatterns = useMemo(() => {
        return [] as { type: string; count: number; impact: string; affectedModels: number }[];
    }, []);

    const severityHotspots = useMemo(() => {
        return [] as { model: string; severity: string; volume: number; complianceRisk: string; severityScore: number }[];
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
                return '#dc2626';
            case 'HIGH':
                return '#f97316';
            case 'MEDIUM':
                return '#fbbf24';
            case 'LOW':
                return '#84cc16';
            default:
                return '#6b7280';
        }
    };

    const fairnessColors = ['#ef4444', '#f97316', '#10b981'];

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px', lineHeight: 1.2 }}>
                    Drift & Bias Monitoring
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                    Monitor model drift, accuracy deviation, and bias patterns across your AI systems
                </p>

                {loading ? (
                    <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
                        Loading drift metrics...
                    </div>
                ) : status === 'NOT_IMPLEMENTED' ? (
                    <div
                        style={{
                            marginTop: 16,
                            background: '#fff7ed',
                            border: '2px solid #f97316',
                            padding: '14px',
                            color: '#7c2d12',
                            fontSize: 13,
                            lineHeight: 1.5,
                        }}
                    >
                        Drift metrics are not implemented in backend yet. This dashboard will populate automatically once enabled.
                    </div>
                ) : null}
            </div>

            {/* Top Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
                {/* Drift Score */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div style={labelStyle}>Drift Score</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '16px', gap: 12 }}>
                        <div>
                            <div style={miniLabel}>Baseline</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                                {driftScore.baseline.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ fontSize: '24px', color: '#6b7280' }}>→</div>
                        <div>
                            <div style={miniLabel}>Current</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                                {driftScore.current.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', border: '2px solid #e5e7eb', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                            {driftScore.change} Change • {driftScore.status}
                        </span>
                    </div>
                </div>

                {/* Accuracy Deviation */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div style={labelStyle}>Accuracy Deviation</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '16px', gap: 12 }}>
                        <div>
                            <div style={miniLabel}>Baseline</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                                {accuracyDeviation.baseline.toFixed(1)}%
                            </div>
                        </div>
                        <div style={{ fontSize: '24px', color: '#6b7280' }}>→</div>
                        <div>
                            <div style={miniLabel}>Current</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f97316' }}>
                                {accuracyDeviation.current.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f9fafb', border: '2px solid #e5e7eb', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                            {accuracyDeviation.deviation.toFixed(1)}% Deviation
                        </span>
                    </div>
                </div>

                {/* Output Distribution Shift */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div style={labelStyle}>Output Distribution Shift</div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {[
                            { label: 'PSI', value: distributionShift.psi, color: '#8b5cf6' },
                            { label: 'KS', value: distributionShift.ks, color: '#ec4899' },
                            { label: 'Wasserstein', value: distributionShift.wasserstein, color: '#f59e0b' },
                        ].map((metric, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                                    {metric.label}
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: '700', color: metric.color }}>
                                    {metric.value.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sudden Behavior Change Alerts */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={sectionTitle}>Sudden Behavior Change Alerts</h2>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    {behaviorAlerts.length === 0 ? (
                        <div style={{ color: '#6b7280', lineHeight: 1.5 }}>
                            No behavior change alerts available yet.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={thStyle}>Model Name</th>
                                    <th style={thStyle}>Change Type</th>
                                    <th style={thStyle}>Severity</th>
                                    <th style={thStyle}>Impact</th>
                                    <th style={thStyle}>Detected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {behaviorAlerts.map((alert, index) => (
                                    <tr key={index} style={{ borderBottom: index < behaviorAlerts.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                        <td style={tdStrong}>{alert.modelName}</td>
                                        <td style={tdMuted}>{alert.changeType}</td>
                                        <td style={tdMuted}>
                                            <span style={{ padding: '4px 12px', background: getSeverityColor(alert.severity), color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td style={tdMuted}>{alert.impact}</td>
                                        <td style={tdMuted}>{new Date(alert.detectedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                {/* Outcome Fairness by Group */}
                <div>
                    <h2 style={sectionTitle}>Outcome Fairness by Group</h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart data={fairnessData} colors={fairnessColors} title="Model Outcome Distribution" />
                    </div>
                </div>

                {/* Recurring Bias Patterns */}
                <div>
                    <h2 style={sectionTitle}>Recurring Bias Patterns</h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        {biasPatterns.length === 0 ? (
                            <div style={{ color: '#6b7280', lineHeight: 1.5 }}>
                                No recurring bias patterns available yet.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {biasPatterns.map((pattern, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: '#ffffff',
                                            border: '2px solid #e5e7eb',
                                            padding: '16px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', gap: 12 }}>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', wordBreak: 'break-word' }}>
                                                {pattern.type}
                                            </div>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                                                {pattern.count}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', gap: 12 }}>
                                            <span>Impact: {pattern.impact}</span>
                                            <span>{pattern.affectedModels} models affected</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bias Severity Hotspots */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={sectionTitle}>Bias Severity Hotspots</h2>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    {severityHotspots.length === 0 ? (
                        <div style={{ color: '#6b7280', lineHeight: 1.5 }}>
                            No severity hotspots available yet.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={thStyle}>Rank</th>
                                    <th style={thStyle}>Model Name</th>
                                    <th style={thStyle}>Severity</th>
                                    <th style={thStyle}>Volume</th>
                                    <th style={thStyle}>Compliance Risk</th>
                                    <th style={thStyle}>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {severityHotspots
                                    .sort((a, b) => b.severityScore - a.severityScore)
                                    .map((hotspot, index) => (
                                        <tr key={index} style={{ borderBottom: index < severityHotspots.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                            <td style={tdStrong}>#{index + 1}</td>
                                            <td style={tdStrong}>{hotspot.model}</td>
                                            <td style={tdMuted}>{hotspot.severity}</td>
                                            <td style={tdStrong}>{hotspot.volume}</td>
                                            <td style={tdMuted}>{hotspot.complianceRisk}</td>
                                            <td style={tdStrong}>{hotspot.severityScore.toFixed(1)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    lineHeight: 1.4,
};

const miniLabel = {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
};

const sectionTitle = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '12px',
    lineHeight: 1.2,
};

const thStyle = {
    textAlign: 'left' as const,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    wordBreak: 'break-word' as const,
};

const tdStrong = {
    padding: '16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
    wordBreak: 'break-word' as const,
};

const tdMuted = {
    padding: '16px',
    fontSize: '14px',
    color: '#6b7280',
    wordBreak: 'break-word' as const,
};
