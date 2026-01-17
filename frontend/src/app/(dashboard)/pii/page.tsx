'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';

type PiiMetricsResponse = {
    totalLeaks: number;
    criticalLeaks: number;
    bySeverity: Record<string, number>;
};

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export default function PIIPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // backend data
    const [totalLeaks, setTotalLeaks] = useState(0);
    const [bySeverity, setBySeverity] = useState<Record<string, number>>({
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
    });

    useEffect(() => {
        async function loadPII() {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE}/metrics/pii`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || 'Failed to fetch PII metrics');
                }

                const data = (await res.json()) as PiiMetricsResponse;

                const incoming = data?.bySeverity || {};

                setTotalLeaks(Number(data?.totalLeaks ?? 0));
                setBySeverity({
                    CRITICAL: Number(incoming.CRITICAL ?? 0),
                    HIGH: Number(incoming.HIGH ?? 0),
                    MEDIUM: Number(incoming.MEDIUM ?? 0),
                    LOW: Number(incoming.LOW ?? 0),
                });
            } catch (err: any) {
                setError(err?.message || 'Failed to load PII metrics');
            } finally {
                setLoading(false);
            }
        }

        loadPII();
    }, []);

    // Total PII Leaks vs Addressed
    // Backend does not provide addressed leaks yet => safe placeholder = 0
    const piiLeaksData = useMemo(() => {
        return [
            { name: 'Total PII Leaks', value: totalLeaks },
            { name: 'Addressed Leaks', value: 0 },
        ];
    }, [totalLeaks]);

    const piiSeverityData = useMemo(() => {
        return [
            { name: 'Critical', value: bySeverity.CRITICAL ?? 0 },
            { name: 'High', value: bySeverity.HIGH ?? 0 },
            { name: 'Medium', value: bySeverity.MEDIUM ?? 0 },
            { name: 'Low', value: bySeverity.LOW ?? 0 },
        ];
    }, [bySeverity]);

    // Trend and category breakdown are not provided by backend yet
    // Keep structure identical but prevent misleading results
    const piiTrendData = useMemo(() => {
        return {
            oneMonth: [
                { name: 'Week 1', value: 0 },
                { name: 'Week 2', value: 0 },
                { name: 'Week 3', value: 0 },
                { name: 'Week 4', value: totalLeaks },
            ],
            sixMonths: [
                { name: 'Jan', value: 0 },
                { name: 'Feb', value: 0 },
                { name: 'Mar', value: 0 },
                { name: 'Apr', value: 0 },
                { name: 'May', value: 0 },
                { name: 'Jun', value: totalLeaks },
            ],
            oneYear: [
                { name: 'Q1', value: 0 },
                { name: 'Q2', value: 0 },
                { name: 'Q3', value: 0 },
                { name: 'Q4', value: totalLeaks },
            ],
        };
    }, [totalLeaks]);

    const categoryBreakdownData = useMemo(() => {
        return {
            oneMonth: [
                { name: 'Contact Info', value: 0 },
                { name: 'Financial Data', value: 0 },
                { name: 'Identity Docs', value: 0 },
                { name: 'Health Data', value: 0 },
                { name: 'Personal Attrs', value: 0 },
            ],
            sixMonths: [
                { name: 'Contact Info', value: 0 },
                { name: 'Financial Data', value: 0 },
                { name: 'Identity Docs', value: 0 },
                { name: 'Health Data', value: 0 },
                { name: 'Personal Attrs', value: 0 },
            ],
            oneYear: [
                { name: 'Contact Info', value: 0 },
                { name: 'Financial Data', value: 0 },
                { name: 'Identity Docs', value: 0 },
                { name: 'Health Data', value: 0 },
                { name: 'Personal Attrs', value: 0 },
            ],
        };
    }, []);

    const sourceAttributionData = useMemo(() => {
        return [
            { name: 'User-Provided PII', value: 0 },
            { name: 'Model-Generated PII', value: totalLeaks },
            { name: 'Model-Echoed PII', value: 0 },
        ];
    }, [totalLeaks]);

    // Exposure Path (backend does not provide breakdown yet)
    const exposureMetrics = useMemo(() => {
        return {
            inputLeakage: 0,
            outputLeakage: totalLeaks,
            logLeakage: 0,
        };
    }, [totalLeaks]);

    const chartColors = {
        pii: ['#3b82f6', '#10b981'],
        severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
        source: ['#8b5cf6', '#ec4899', '#f59e0b'],
    };

    // ---------- UI SAFE STYLES (prevents overlap) ----------
    const safeH1 = {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: '8px',
        lineHeight: 1.2,
        wordBreak: 'break-word' as const,
    };

    const safeP = {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: 1.5,
        wordBreak: 'break-word' as const,
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={safeH1}>PII Monitoring</h1>
                    <p style={safeP}>Loading PII metrics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={safeH1}>PII Monitoring</h1>
                    <p style={safeP}>
                        Track and analyze Personally Identifiable Information leaks across your AI models
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
                        Failed to load PII metrics
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
                <h1 style={safeH1}>PII Monitoring</h1>
                <p style={safeP}>
                    Track and analyze Personally Identifiable Information leaks across your AI models
                </p>
            </div>

            {/* Top Row - PII Leaks Overview */}
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
                        wordBreak: 'break-word',
                    }}
                >
                    PII Leakage Overview
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    {/* Total vs Addressed */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart
                            data={piiLeaksData}
                            colors={chartColors.pii}
                            title="Total PII Leaks vs Addressed"
                        />
                    </div>

                    {/* Trend of Leakage */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <BarChart data={piiTrendData} color="#3b82f6" title="Trend of PII Leakage" />
                    </div>

                    {/* Severity Distribution */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart
                            data={piiSeverityData}
                            colors={chartColors.severity}
                            title="PII Leaks by Severity"
                        />
                    </div>
                </div>
            </div>

            {/* PII Category Breakdown */}
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
                        wordBreak: 'break-word',
                    }}
                >
                    PII Category Breakdown
                </h2>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <BarChart data={categoryBreakdownData} color="#8b5cf6" title="PII Leaks by Category" />

                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Contact Info', color: '#3b82f6' },
                            { label: 'Financial Data', color: '#10b981' },
                            { label: 'Identity Docs', color: '#f59e0b' },
                            { label: 'Health Data', color: '#ef4444' },
                            { label: 'Personal Attrs', color: '#8b5cf6' },
                        ].map((category, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: `2px solid ${category.color}`,
                                    padding: '16px',
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: category.color,
                                        lineHeight: 1.4,
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {category.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                {/* PII Source Attribution */}
                <div>
                    <h2
                        style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1a1a1a',
                            marginBottom: '24px',
                            borderBottom: '2px solid #e5e7eb',
                            paddingBottom: '12px',
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                        }}
                    >
                        PII Source Attribution
                    </h2>

                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
                        <PieChart
                            data={sourceAttributionData}
                            colors={chartColors.source}
                            title="Source of PII Leaks"
                        />

                        <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
                            {[
                                { label: 'User-Provided PII', description: 'PII entered by users', color: '#8b5cf6' },
                                { label: 'Model-Generated PII', description: 'Generated / detected from outputs', color: '#ec4899' },
                                { label: 'Model-Echoed PII', description: 'Repeated from training data', color: '#f59e0b' },
                            ].map((source, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${source.color}`,
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ width: '12px', height: '12px', background: source.color, flexShrink: 0 }} />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: '#1a1a1a',
                                                marginBottom: '2px',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {source.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#6b7280',
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {source.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Exposure Path */}
                <div>
                    <h2
                        style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1a1a1a',
                            marginBottom: '24px',
                            borderBottom: '2px solid #e5e7eb',
                            paddingBottom: '12px',
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                        }}
                    >
                        Exposure Path
                    </h2>

                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <div style={{ marginBottom: '24px', textAlign: 'center', overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
                                Total Exposure Incidents
                            </div>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', lineHeight: '1' }}>
                                {exposureMetrics.inputLeakage + exposureMetrics.outputLeakage + exposureMetrics.logLeakage}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            {[
                                {
                                    label: 'Input Leakage',
                                    value: exposureMetrics.inputLeakage,
                                    color: '#ef4444',
                                    description: 'PII leaked through input processing',
                                },
                                {
                                    label: 'Output Leakage',
                                    value: exposureMetrics.outputLeakage,
                                    color: '#f97316',
                                    description: 'PII exposed in model outputs',
                                },
                                {
                                    label: 'Log Leakage',
                                    value: exposureMetrics.logLeakage,
                                    color: '#fbbf24',
                                    description: 'PII found in system logs',
                                },
                            ].map((metric, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${metric.color}`,
                                        padding: '20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                color: '#1a1a1a',
                                                marginBottom: '4px',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {metric.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: '#6b7280',
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {metric.description}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '32px', fontWeight: '700', color: metric.color, flexShrink: 0 }}>
                                        {metric.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
