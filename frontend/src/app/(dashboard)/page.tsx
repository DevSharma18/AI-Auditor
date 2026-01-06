'use client';

import { useEffect, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet } from '@/lib/api-client';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<any>(null);

    useEffect(() => {
        apiGet('/dashboard/overview')
            .then((data) => {
                setOverview(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Dashboard load failed', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div style={{ padding: '40px' }}>Loading dashboard...</div>;
    }

    if (!overview || overview.status !== 'OK' || !overview.metrics) {
        return (
            <div style={{ padding: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
                    No audit data available
                </h2>
                <p style={{ color: '#6b7280' }}>
                    Register a model and run an audit to see live metrics.
                </p>
            </div>
        );
    }

    const metrics = overview.metrics;

    /* =========================
       TOP METRICS
    ========================= */

    const topMetrics = {
        totalModelsMonitored: metrics.total_models,
        modelsUnderMonitoring: metrics.total_models,
        overallAIRiskScore: metrics.overall_risk_score ?? 0,
        complianceReadinessScore: Math.max(
            0,
            100 - (metrics.failed_audits * 10)
        ),
    };

    /* =========================
       PII
    ========================= */

    const piiLeaksData = [
        {
            name: 'Total PII Leaks',
            value:
                metrics.critical_findings_count +
                metrics.high_findings_count,
        },
        {
            name: 'Addressed Leaks',
            value: Math.max(
                0,
                metrics.total_findings -
                (metrics.critical_findings_count +
                    metrics.high_findings_count)
            ),
        },
    ];

    const piiSeverityData = [
        { name: 'Critical', value: metrics.critical_findings_count },
        { name: 'High', value: metrics.high_findings_count },
        { name: 'Medium', value: 0 },
        { name: 'Low', value: 0 },
    ];

    /* =========================
       DRIFT / BIAS / HALLUCINATION
       (Derived from audits for now)
    ========================= */

    const driftAnalysisData = [
        { name: 'Models Analyzed', value: metrics.total_models },
        { name: 'Models With Drift', value: metrics.failed_audits },
    ];

    const driftSeverityData = piiSeverityData;

    const biasAnalysisData = [
        { name: 'Models Analyzed', value: metrics.total_models },
        { name: 'Models With Bias', value: metrics.failed_audits },
    ];

    const biasSeverityData = piiSeverityData;

    const hallucinationAnalysisData = [
        { name: 'Models Analyzed', value: metrics.total_models },
        { name: 'Models Hallucinating', value: metrics.failed_audits },
    ];

    const hallucinationSeverityData = piiSeverityData;

    /* =========================
       TEMP TREND PLACEHOLDERS
       (Will become real-time later)
    ========================= */

    const emptyTrend = {
        oneMonth: [],
        sixMonths: [],
        oneYear: [],
    };

    const piiTrendData = emptyTrend;
    const driftTrendData = emptyTrend;
    const biasTrendData = emptyTrend;
    const hallucinationTrendData = emptyTrend;

    const chartColors = {
        pii: ['#3b82f6', '#10b981'],
        drift: ['#8b5cf6', '#ec4899'],
        bias: ['#f59e0b', '#ef4444'],
        hallucination: ['#06b6d4', '#14b8a6'],
        severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1
                    style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#1a1a1a',
                        marginBottom: '8px',
                    }}
                >
                    Dashboard
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Real-time AI Model Monitoring & Governance
                </p>
            </div>

            {/* Top Metrics */}
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
                        label: 'Total Models Monitored',
                        value: topMetrics.totalModelsMonitored,
                        color: '#3b82f6',
                    },
                    {
                        label: 'Models Under Monitoring',
                        value: topMetrics.modelsUnderMonitoring,
                        color: '#10b981',
                    },
                    {
                        label: 'Overall AI Risk Score',
                        value: topMetrics.overallAIRiskScore,
                        suffix: '/100',
                        color: '#f59e0b',
                    },
                    {
                        label: 'Compliance Readiness Score',
                        value: topMetrics.complianceReadinessScore,
                        suffix: '%',
                        color: '#8b5cf6',
                    },
                ].map((metric, idx) => (
                    <div
                        key={idx}
                        style={{
                            background: '#ffffff',
                            border: '2px solid #e5e7eb',
                            padding: '24px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                            }}
                        >
                            {metric.label}
                        </div>
                        <div
                            style={{
                                fontSize: '36px',
                                fontWeight: '700',
                                color: metric.color,
                            }}
                        >
                            {metric.value}
                            {metric.suffix || ''}
                        </div>
                    </div>
                ))}
            </div>

            {/* PII */}
            <Section title="PII Monitoring">
                <PieChart
                    data={piiLeaksData}
                    colors={chartColors.pii}
                    title="PII Leaks"
                />
                <BarChart
                    data={piiTrendData}
                    color="#3b82f6"
                    title="PII Trend"
                />
                <PieChart
                    data={piiSeverityData}
                    colors={chartColors.severity}
                    title="PII Severity"
                />
            </Section>

            {/* Drift */}
            <Section title="Drift Analysis">
                <PieChart
                    data={driftAnalysisData}
                    colors={chartColors.drift}
                    title="Drift Detected"
                />
                <BarChart
                    data={driftTrendData}
                    color="#8b5cf6"
                    title="Drift Trend"
                />
                <PieChart
                    data={driftSeverityData}
                    colors={chartColors.severity}
                    title="Drift Severity"
                />
            </Section>

            {/* Bias */}
            <Section title="Bias Detection">
                <PieChart
                    data={biasAnalysisData}
                    colors={chartColors.bias}
                    title="Bias Detected"
                />
                <BarChart
                    data={biasTrendData}
                    color="#f59e0b"
                    title="Bias Trend"
                />
                <PieChart
                    data={biasSeverityData}
                    colors={chartColors.severity}
                    title="Bias Severity"
                />
            </Section>

            {/* Hallucination */}
            <Section title="Hallucination Monitoring">
                <PieChart
                    data={hallucinationAnalysisData}
                    colors={chartColors.hallucination}
                    title="Hallucination Detected"
                />
                <BarChart
                    data={hallucinationTrendData}
                    color="#06b6d4"
                    title="Hallucination Trend"
                />
                <PieChart
                    data={hallucinationSeverityData}
                    colors={chartColors.severity}
                    title="Hallucination Severity"
                />
            </Section>
        </div>
    );
}

/* =========================
   REUSABLE SECTION
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
                    color: '#1a1a1a',
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
