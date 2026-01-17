'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';

type BiasMetricsResponse = {
    totalModelsAnalyzed: number;
    modelsWithBias: number;
    totalBiasIssues: number;
    biasDistribution: { label: string; value: number }[];
    severityData: { label: string; value: number }[];
};

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export default function BiasPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [totalModelsAnalyzed, setTotalModelsAnalyzed] = useState(0);
    const [modelsWithBias, setModelsWithBias] = useState(0);
    const [totalBiasIssues, setTotalBiasIssues] = useState(0);

    const [biasDistributionData, setBiasDistributionData] = useState<any[]>([]);
    const [biasSeverityData, setBiasSeverityData] = useState<any[]>([]);

    useEffect(() => {
        async function loadBias() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE}/metrics/bias`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || 'Failed to fetch bias metrics');
                }

                const data = (await res.json()) as BiasMetricsResponse;

                setTotalModelsAnalyzed(Number(data?.totalModelsAnalyzed ?? 0));
                setModelsWithBias(Number(data?.modelsWithBias ?? 0));
                setTotalBiasIssues(Number(data?.totalBiasIssues ?? 0));

                // Dev UI shows "Bias Distribution by Type", but backend currently provides severity buckets
                // Keep UI identical, map severity -> category
                const dist = Array.isArray(data?.biasDistribution) ? data.biasDistribution : [];
                setBiasDistributionData(
                    dist.map((d) => ({
                        name: String(d.label || 'UNKNOWN'),
                        value: Number(d.value ?? 0),
                    }))
                );

                const sev = Array.isArray(data?.severityData) ? data.severityData : [];
                setBiasSeverityData(
                    sev.map((d) => ({
                        name: String(d.label || 'UNKNOWN'),
                        value: Number(d.value ?? 0),
                    }))
                );
            } catch (err: any) {
                setError(err?.message || 'Failed to load bias metrics');
            } finally {
                setLoading(false);
            }
        }

        loadBias();
    }, []);

    // DevSharma had a "High-Risk Model List" mock.
    // Backend does not return per-model breakdown yet.
    // Keep UI identical but show an empty list + counts.
    const highRiskModels = useMemo(() => {
        return [] as {
            name: string;
            biasScore: number;
            biasType: string;
            issuesDetected: number;
            affectedGroups: string[];
            severity: string;
        }[];
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

    const biasColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'];
    const severityColors = ['#dc2626', '#f97316', '#fbbf24', '#84cc16'];

    // Prevent overlap styles
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
                    <h1 style={safeTitle}>Bias Detection & Analysis</h1>
                    <p style={safeSub}>Loading bias metrics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={safeTitle}>Bias Detection & Analysis</h1>
                    <p style={safeSub}>
                        Monitor and analyze bias patterns across AI models to ensure fairness and compliance
                    </p>
                </div>

                <div
                    style={{
                        background: '#fef2f2',
                        border: '2px solid #fca5a5',
                        padding: '20px',
                        marginBottom: '24px',
                    }}
                >
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
                        Failed to load bias metrics
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
                <h1 style={safeTitle}>Bias Detection & Analysis</h1>
                <p style={safeSub}>
                    Monitor and analyze bias patterns across AI models to ensure fairness and compliance
                </p>
            </div>

            {/* Top Metrics */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px',
                    marginBottom: '48px',
                }}
            >
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            wordBreak: 'break-word',
                        }}
                    >
                        Total Models Analyzed
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#3b82f6', lineHeight: '1' }}>
                        {totalModelsAnalyzed}
                    </div>
                </div>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            wordBreak: 'break-word',
                        }}
                    >
                        Models With Bias
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', lineHeight: '1' }}>
                        {modelsWithBias}
                    </div>
                </div>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                    <div
                        style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            wordBreak: 'break-word',
                        }}
                    >
                        Total Bias Issues
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#f59e0b', lineHeight: '1' }}>
                        {totalBiasIssues}
                    </div>
                </div>
            </div>

            {/* High-Risk Model List */}
            <div style={{ marginBottom: '48px' }}>
                <h2
                    style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#1a1a1a',
                        marginBottom: '24px',
                        borderBottom: '2px solid #e5e7eb',
                        paddingBottom: '12px',
                        lineHeight: 1.2,
                    }}
                >
                    High-Risk Model List
                </h2>

                <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', lineHeight: 1.2, wordBreak: 'break-word' }}>
                            {highRiskModels.length} models show high bias
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>
                        Immediate attention may be required to address fairness concerns.
                    </div>
                </div>

                {highRiskModels.length === 0 ? (
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', color: '#6b7280', lineHeight: 1.5 }}>
                        No high-risk model breakdown available yet. This will be enabled when backend provides per-model bias scoring.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {highRiskModels.map((model, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: `2px solid ${getSeverityColor(model.severity)}`,
                                    padding: '24px',
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr',
                                    gap: '24px',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', wordBreak: 'break-word' }}>
                                            {model.name}
                                        </div>
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                background: getSeverityColor(model.severity),
                                                color: '#ffffff',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            {model.severity}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.5 }}>
                                        <strong>Bias Type:</strong> {model.biasType}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
                                        <strong>Affected Groups:</strong> {model.affectedGroups.join(', ')}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', borderLeft: '2px solid #e5e7eb', borderRight: '2px solid #e5e7eb', padding: '0 16px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Issues Detected
                                    </div>
                                    <div style={{ fontSize: '36px', fontWeight: '700', color: getSeverityColor(model.severity) }}>
                                        {model.issuesDetected}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Bias Score
                                    </div>
                                    <div style={{ fontSize: '36px', fontWeight: '700', color: getSeverityColor(model.severity) }}>
                                        {model.biasScore.toFixed(1)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>/ 10.0</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bias Analysis Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Bias Distribution by Type
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart data={biasDistributionData} colors={biasColors} title="Bias Issues by Category" />
                    </div>
                </div>

                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Bias Severity Breakdown
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart data={biasSeverityData} colors={severityColors} title="Issues by Severity Level" />
                    </div>
                </div>
            </div>

            {/* Detailed Bias Metrics */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Detailed Bias Metrics
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {biasDistributionData.map((bias, index) => (
                        <div
                            key={index}
                            style={{
                                background: '#ffffff',
                                border: `2px solid ${biasColors[index % biasColors.length]}`,
                                padding: '20px',
                                textAlign: 'center',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', wordBreak: 'break-word' }}>
                                {bias.name}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: biasColors[index % biasColors.length], lineHeight: '1' }}>
                                {bias.value}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>detected issues</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
