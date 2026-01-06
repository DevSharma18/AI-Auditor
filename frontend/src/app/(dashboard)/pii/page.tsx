'use client';

import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';

export default function PIIPage() {
    // Total PII Leaks vs Addressed
    const piiLeaksData = [
        { name: 'Total PII Leaks', value: 23 },
        { name: 'Addressed Leaks', value: 15 }
    ];

    // Trend of Leakage
    const piiTrendData = {
        oneMonth: [
            { name: 'Week 1', value: 4 },
            { name: 'Week 2', value: 6 },
            { name: 'Week 3', value: 5 },
            { name: 'Week 4', value: 8 }
        ],
        sixMonths: [
            { name: 'Jan', value: 12 },
            { name: 'Feb', value: 15 },
            { name: 'Mar', value: 18 },
            { name: 'Apr', value: 14 },
            { name: 'May', value: 20 },
            { name: 'Jun', value: 23 }
        ],
        oneYear: [
            { name: 'Q1', value: 45 },
            { name: 'Q2', value: 57 },
            { name: 'Q3', value: 62 },
            { name: 'Q4', value: 71 }
        ]
    };

    // PII Leaks by Severity
    const piiSeverityData = [
        { name: 'Critical', value: 5 },
        { name: 'High', value: 8 },
        { name: 'Medium', value: 7 },
        { name: 'Low', value: 3 }
    ];

    // PII Category Breakdown
    const categoryBreakdownData = {
        oneMonth: [
            { name: 'Contact Info', value: 45 },
            { name: 'Financial Data', value: 32 },
            { name: 'Identity Docs', value: 28 },
            { name: 'Health Data', value: 18 },
            { name: 'Personal Attrs', value: 22 }
        ],
        sixMonths: [
            { name: 'Contact Info', value: 245 },
            { name: 'Financial Data', value: 185 },
            { name: 'Identity Docs', value: 158 },
            { name: 'Health Data', value: 95 },
            { name: 'Personal Attrs', value: 132 }
        ],
        oneYear: [
            { name: 'Contact Info', value: 512 },
            { name: 'Financial Data', value: 387 },
            { name: 'Identity Docs', value: 324 },
            { name: 'Health Data', value: 198 },
            { name: 'Personal Attrs', value: 275 }
        ]
    };

    // PII Source Attribution
    const sourceAttributionData = [
        { name: 'User-Provided PII', value: 145 },
        { name: 'Model-Generated PII', value: 67 },
        { name: 'Model-Echoed PII', value: 88 }
    ];

    // Exposure Path Metrics
    const exposureMetrics = {
        inputLeakage: 87,
        outputLeakage: 134,
        logLeakage: 79
    };

    const chartColors = {
        pii: ['#3b82f6', '#10b981'],
        severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
        source: ['#8b5cf6', '#ec4899', '#f59e0b']
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                    PII Monitoring
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Track and analyze Personally Identifiable Information leaks across your AI models
                </p>
            </div>

            {/* Top Row - PII Leaks Overview */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    PII Leakage Overview
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    {/* Total vs Addressed */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <PieChart
                            data={piiLeaksData}
                            colors={chartColors.pii}
                            title="Total PII Leaks vs Addressed"
                        />
                    </div>

                    {/* Trend of Leakage */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <BarChart
                            data={piiTrendData}
                            color="#3b82f6"
                            title="Trend of PII Leakage"
                        />
                    </div>

                    {/* Severity Distribution */}
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
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
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    PII Category Breakdown
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <BarChart
                        data={categoryBreakdownData}
                        color="#8b5cf6"
                        title="PII Leaks by Category"
                    />
                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Contact Info', icon: '📧', color: '#3b82f6' },
                            { label: 'Financial Data', icon: '💳', color: '#10b981' },
                            { label: 'Identity Docs', icon: '🆔', color: '#f59e0b' },
                            { label: 'Health Data', icon: '⚕️', color: '#ef4444' },
                            { label: 'Personal Attrs', icon: '👤', color: '#8b5cf6' }
                        ].map((category, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: `2px solid ${category.color}`,
                                    padding: '16px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                                    {category.icon}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: category.color }}>
                                    {category.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row - Source Attribution and Exposure Path */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                {/* PII Source Attribution */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        PII Source Attribution
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <PieChart
                            data={sourceAttributionData}
                            colors={chartColors.source}
                            title="Source of PII Leaks"
                        />
                        <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
                            {[
                                { label: 'User-Provided PII', description: 'PII entered by users', color: '#8b5cf6' },
                                { label: 'Model-Generated PII', description: 'Hallucinated by AI model', color: '#ec4899' },
                                { label: 'Model-Echoed PII', description: 'Repeated from training data', color: '#f59e0b' }
                            ].map((source, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${source.color}`,
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            background: source.color,
                                            flexShrink: 0
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>
                                            {source.label}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
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
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Exposure Path
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
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
                                    icon: '⬇️'
                                },
                                {
                                    label: 'Output Leakage',
                                    value: exposureMetrics.outputLeakage,
                                    color: '#f97316',
                                    description: 'PII exposed in model outputs',
                                    icon: '⬆️'
                                },
                                {
                                    label: 'Log Leakage',
                                    value: exposureMetrics.logLeakage,
                                    color: '#fbbf24',
                                    description: 'PII found in system logs',
                                    icon: '📝'
                                }
                            ].map((metric, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${metric.color}`,
                                        padding: '20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{ fontSize: '24px' }}>
                                            {metric.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>
                                                {metric.label}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                {metric.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: '700', color: metric.color }}>
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
