'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet, safeNumber } from '@/lib/api-client';

type DashboardOverviewResponse = {
    status: string;
    metrics: {
        total_models: number;
        total_audits: number;
        overall_risk_score: number;
        failed_audits: number;
        total_findings: number;
        critical_findings_count: number;
        high_findings_count: number;
        medium_findings_count?: number;
        low_findings_count?: number;
    };
};

type MetricTrendPoint = {
    audit_id: string;
    executed_at: string | null;
    model_id: string;
    model_name: string;
    score_100: number;
    band: string;
    L: number;
    I: number;
    R: number;
};

type MetricResponse = {
    scoring?: {
        metric: string;
        status: 'OK' | 'NO_DATA';
        latest: MetricTrendPoint | null;
        trend: MetricTrendPoint[];
    };
};

function toBarChartPeriods(trend: MetricTrendPoint[]) {
    const oneMonth = (trend || []).map((t) => ({
        name: t.executed_at
            ? new Date(t.executed_at).toLocaleDateString()
            : t.audit_id,
        value: safeNumber(t.score_100, 0),
    }));

    return {
        oneMonth,
        sixMonths: [],
        oneYear: [],
    };
}

export default function DashboardPage() {
    const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [bias, setBias] = useState<MetricResponse | null>(null);
    const [pii, setPii] = useState<MetricResponse | null>(null);
    const [hallucination, setHallucination] = useState<MetricResponse | null>(null);
    const [compliance, setCompliance] = useState<MetricResponse | null>(null);
    const [drift, setDrift] = useState<MetricResponse | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError(null);

                const [ov, b, p, h, c, d] = await Promise.all([
                    apiGet<DashboardOverviewResponse>('/dashboard/overview'),
                    apiGet<MetricResponse>('/metrics/bias'),
                    apiGet<MetricResponse>('/metrics/pii'),
                    apiGet<MetricResponse>('/metrics/hallucination'),
                    apiGet<MetricResponse>('/metrics/compliance'),
                    apiGet<MetricResponse>('/metrics/drift'),
                ]);

                setOverview(ov);
                setBias(b);
                setPii(p);
                setHallucination(h);
                setCompliance(c);
                setDrift(d);
            } catch (e: any) {
                setError(e?.message || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    const metrics = overview?.metrics;

    const topMetrics = useMemo(() => {
        return {
            totalModels: safeNumber(metrics?.total_models, 0),
            totalAudits: safeNumber(metrics?.total_audits, 0),
            overallRiskScore: safeNumber(metrics?.overall_risk_score, 0),
            complianceScore: Math.max(0, 100 - safeNumber(metrics?.failed_audits, 0) * 10),
        };
    }, [metrics]);

    const colors = {
        pii: ['#ef4444', '#10b981'],
        drift: ['#8b5cf6', '#ec4899'],
        bias: ['#f59e0b', '#ef4444'],
        hallucination: ['#06b6d4', '#14b8a6'],
        severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
    };

    const severityData = useMemo(() => {
        return [
            { name: 'Critical', value: safeNumber(metrics?.critical_findings_count, 0) },
            { name: 'High', value: safeNumber(metrics?.high_findings_count, 0) },
            { name: 'Medium', value: safeNumber(metrics?.medium_findings_count, 0) },
            { name: 'Low', value: safeNumber(metrics?.low_findings_count, 0) },
        ];
    }, [metrics]);

    const piiLeaksData = useMemo(() => {
        const critical = safeNumber(metrics?.critical_findings_count, 0);
        const high = safeNumber(metrics?.high_findings_count, 0);
        const total = safeNumber(metrics?.total_findings, 0);
        const criticalHigh = critical + high;

        return [
            { name: 'Critical + High', value: criticalHigh },
            { name: 'Other', value: Math.max(0, total - criticalHigh) },
        ];
    }, [metrics]);

    const piiTrend = useMemo(() => toBarChartPeriods(pii?.scoring?.trend || []), [pii]);
    const driftTrend = useMemo(() => toBarChartPeriods(drift?.scoring?.trend || []), [drift]);
    const biasTrend = useMemo(() => toBarChartPeriods(bias?.scoring?.trend || []), [bias]);
    const hallucinationTrend = useMemo(
        () => toBarChartPeriods(hallucination?.scoring?.trend || []),
        [hallucination]
    );
    const complianceTrend = useMemo(
        () => toBarChartPeriods(compliance?.scoring?.trend || []),
        [compliance]
    );

    const safeTitle: React.CSSProperties = {
        fontSize: 28,
        fontWeight: 700,
        color: '#1a1a1a',
        marginBottom: 8,
        lineHeight: 1.2,
        wordBreak: 'break-word',
    };

    const safeSub: React.CSSProperties = {
        color: '#6b7280',
        lineHeight: 1.5,
        wordBreak: 'break-word',
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff' }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={safeTitle}>AI Governance Dashboard</h1>
                    <p style={safeSub}>Loading live enterprise telemetry…</p>
                </div>
            </div>
        );
    }

    if (error || !overview) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff' }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={safeTitle}>AI Governance Dashboard</h1>
                    <p style={safeSub}>Real-time monitoring & risk assessment</p>
                </div>

                <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: 18 }}>
                    <div style={{ fontWeight: 800, color: '#991b1b' }}>Failed to load dashboard</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: '#7f1d1d', lineHeight: 1.5 }}>
                        {error || 'Unknown error'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff' }}>
            {/* HEADER */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={safeTitle}>AI Governance Dashboard</h1>
                <p style={safeSub}>Real-time monitoring & risk assessment</p>
            </div>

            {/* TOP METRICS */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 24,
                    marginBottom: 48,
                }}
            >
                {[
                    { label: 'Models Monitored', value: topMetrics.totalModels, color: '#3b82f6' },
                    { label: 'Audits Executed', value: topMetrics.totalAudits, color: '#10b981' },
                    { label: 'Overall Risk Score', value: topMetrics.overallRiskScore, suffix: '/100', color: '#f59e0b' },
                    { label: 'Compliance Score', value: topMetrics.complianceScore, suffix: '%', color: '#8b5cf6' },
                ].map((m, i) => (
                    <div key={i} style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#6b7280',
                                marginBottom: 12,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                wordBreak: 'break-word',
                            }}
                        >
                            {m.label}
                        </div>

                        <div style={{ fontSize: 36, fontWeight: 800, color: m.color, lineHeight: 1.1 }}>
                            {m.value}
                            {m.suffix || ''}
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTIONS */}
            <Section title="PII Monitoring">
                <PieChart data={piiLeaksData} colors={colors.pii} title="PII Exposure" />
                <BarChart data={piiTrend} color="#ef4444" title="PII Trend (Score / 100)" />
                <PieChart data={severityData} colors={colors.severity} title="Overall Severity" />
            </Section>

            <Section title="Model Drift">
                <PieChart
                    data={[
                        { name: 'Drift Risk', value: safeNumber(drift?.scoring?.latest?.score_100, 0) },
                        { name: 'Stable', value: Math.max(0, 100 - safeNumber(drift?.scoring?.latest?.score_100, 0)) },
                    ]}
                    colors={colors.drift}
                    title="Drift Posture"
                />
                <BarChart data={driftTrend} color="#8b5cf6" title="Drift Trend (Score / 100)" />
                <PieChart data={severityData} colors={colors.severity} title="Overall Severity" />
            </Section>

            <Section title="Bias & Hallucinations">
                <PieChart
                    data={[
                        { name: 'Bias Risk', value: safeNumber(bias?.scoring?.latest?.score_100, 0) },
                        { name: 'Hallucination Risk', value: safeNumber(hallucination?.scoring?.latest?.score_100, 0) },
                    ]}
                    colors={colors.bias}
                    title="Bias / Hallucination Risk"
                />
                <BarChart data={biasTrend} color="#f59e0b" title="Bias Trend (Score / 100)" />
                <BarChart data={hallucinationTrend} color="#06b6d4" title="Hallucination Trend (Score / 100)" />
            </Section>

            <Section title="Compliance">
                <PieChart
                    data={[
                        { name: 'Compliance Risk', value: safeNumber(compliance?.scoring?.latest?.score_100, 0) },
                        { name: 'Safe', value: Math.max(0, 100 - safeNumber(compliance?.scoring?.latest?.score_100, 0)) },
                    ]}
                    colors={colors.severity}
                    title="Compliance Posture"
                />
                <BarChart data={complianceTrend} color="#10b981" title="Compliance Trend (Score / 100)" />
                <PieChart data={severityData} colors={colors.severity} title="Overall Severity" />
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode[] }) {
    return (
        <div style={{ marginBottom: 48 }}>
            <h2
                style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 24,
                    borderBottom: '2px solid #e5e7eb',
                    paddingBottom: 12,
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                }}
            >
                {title}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {children}
            </div>
        </div>
    );
}
