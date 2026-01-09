'use client';

import { useEffect, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet } from '@/lib/api-client';

export default function DashboardPage() {
    const [overview, setOverview] = useState<any>(null);

    useEffect(() => {
        apiGet('/dashboard/overview')
            .then((data) => {
                setOverview(data);
            })
            .catch(() => {
                // ✅ FALLBACK — prevents blank page
                setOverview({
                    status: 'OK',
                    metrics: {
                        total_models: 0,
                        total_audits: 0,
                        overall_risk_score: 0,
                        failed_audits: 0,
                        total_findings: 0,
                        critical_findings_count: 0,
                        high_findings_count: 0,
                    },
                });
            });
    }, []);

    if (!overview) {
        return <div style={{ padding: '40px' }}>Loading dashboard…</div>;
    }

    const metrics = overview.metrics;

    /* =========================
       TOP METRICS
    ========================= */

    const topMetrics = {
        totalModels: metrics.total_models,
        totalAudits: metrics.total_audits,
        overallRiskScore: metrics.overall_risk_score,
        complianceScore: Math.max(0, 100 - metrics.failed_audits * 10),
    };

    /* =========================
       PIE DATA
    ========================= */

    const piiLeaksData = [
        {
            name: 'Critical + High',
            value:
                metrics.critical_findings_count +
                metrics.high_findings_count,
        },
        {
            name: 'Other',
            value: Math.max(
                0,
                metrics.total_findings -
                (metrics.critical_findings_count +
                    metrics.high_findings_count)
            ),
        },
    ];

    const severityData = [
        { name: 'Critical', value: metrics.critical_findings_count },
        { name: 'High', value: metrics.high_findings_count },
        { name: 'Medium', value: 0 },
        { name: 'Low', value: 0 },
    ];

    const simpleTrend = {
        oneMonth: [],
        sixMonths: [],
        oneYear: [],
    };

    const colors = {
        pii: ['#ef4444', '#10b981'],
        drift: ['#8b5cf6', '#ec4899'],
        bias: ['#f59e0b', '#ef4444'],
        hallucination: ['#06b6d4', '#14b8a6'],
        severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
    };

    /* =========================
       DASHBOARD UI (UNCHANGED)
    ========================= */

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff' }}>
            {/* HEADER */}
            <div style={{ marginBottom: '32px' }}>
                <h1
                    style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#1a1a1a',
                    }}
                >
                    AI Governance Dashboard
                </h1>
                <p style={{ color: '#6b7280' }}>
                    Real-time monitoring & risk assessment
                </p>
            </div>

            {/* TOP METRICS */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '24px',
                    marginBottom: '48px',
                }}
            >
                {[
                    {
                        label: 'Models Monitored',
                        value: topMetrics.totalModels,
                        color: '#3b82f6',
                    },
                    {
                        label: 'Audits Executed',
                        value: topMetrics.totalAudits,
                        color: '#10b981',
                    },
                    {
                        label: 'Overall Risk Score',
                        value: topMetrics.overallRiskScore,
                        suffix: '/100',
                        color: '#f59e0b',
                    },
                    {
                        label: 'Compliance Score',
                        value: topMetrics.complianceScore,
                        suffix: '%',
                        color: '#8b5cf6',
                    },
                ].map((m, i) => (
                    <div
                        key={i}
                        style={{
                            border: '2px solid #e5e7eb',
                            padding: '24px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                            }}
                        >
                            {m.label}
                        </div>
                        <div
                            style={{
                                fontSize: '36px',
                                fontWeight: '700',
                                color: m.color,
                            }}
                        >
                            {m.value}
                            {m.suffix || ''}
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTIONS */}
            <Section title="PII Monitoring">
                <PieChart
                    data={piiLeaksData}
                    colors={colors.pii}
                    title="PII Exposure"
                />
                <BarChart
                    data={simpleTrend}
                    color="#ef4444"
                    title="PII Trend"
                />
                <PieChart
                    data={severityData}
                    colors={colors.severity}
                    title="PII Severity"
                />
            </Section>

            <Section title="Model Drift">
                <PieChart
                    data={[
                        { name: 'Drift Detected', value: metrics.failed_audits },
                        {
                            name: 'Stable',
                            value:
                                metrics.total_audits -
                                metrics.failed_audits,
                        },
                    ]}
                    colors={colors.drift}
                    title="Drift Status"
                />
                <BarChart
                    data={simpleTrend}
                    color="#8b5cf6"
                    title="Drift Trend"
                />
                <PieChart
                    data={severityData}
                    colors={colors.severity}
                    title="Drift Severity"
                />
            </Section>

            <Section title="Bias & Hallucinations">
                <PieChart
                    data={[
                        { name: 'Issues Found', value: metrics.failed_audits },
                        {
                            name: 'Clean',
                            value:
                                metrics.total_audits -
                                metrics.failed_audits,
                        },
                    ]}
                    colors={colors.bias}
                    title="Bias / Hallucination"
                />
                <BarChart
                    data={simpleTrend}
                    color="#f59e0b"
                    title="Trend"
                />
                <PieChart
                    data={severityData}
                    colors={colors.severity}
                    title="Severity"
                />
            </Section>
        </div>
    );
}

/* =========================
   SECTION COMPONENT
========================= */

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode[];
}) {
    return (
        <div style={{ marginBottom: '48px' }}>
            <h2
                style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    marginBottom: '24px',
                    borderBottom: '2px solid #e5e7eb',
                    paddingBottom: '12px',
                }}
            >
                {title}
            </h2>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px',
                }}
            >
                {children}
            </div>
        </div>
    );
}
