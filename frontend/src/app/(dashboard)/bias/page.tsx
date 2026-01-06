'use client';

import PieChart from '@/components/charts/PieChart';

export default function BiasPage() {
    // High-Risk Models
    const highRiskModels = [
        {
            name: 'loan-llm',
            biasScore: 8.7,
            biasType: 'Gender Bias',
            issuesDetected: 23,
            affectedGroups: ['Female applicants'],
            severity: 'CRITICAL'
        },
        {
            name: 'claims-v3',
            biasScore: 7.9,
            biasType: 'Age Bias',
            issuesDetected: 17,
            affectedGroups: ['Age 55+'],
            severity: 'HIGH'
        },
        {
            name: 'hiring-bot-v2',
            biasScore: 8.3,
            biasType: 'Gender & Race Bias',
            issuesDetected: 31,
            affectedGroups: ['Women', 'Minority candidates'],
            severity: 'CRITICAL'
        }
    ];

    // Bias Distribution
    const biasDistributionData = [
        { name: 'Gender Bias', value: 145 },
        { name: 'Age Bias', value: 98 },
        { name: 'Race/Ethnicity Bias', value: 112 },
        { name: 'Geographic Bias', value: 67 },
        { name: 'Socioeconomic Bias', value: 43 }
    ];

    // Bias Severity
    const biasSeverityData = [
        { name: 'Critical', value: 87 },
        { name: 'High', value: 134 },
        { name: 'Medium', value: 92 },
        { name: 'Low', value: 52 }
    ];

    // Total Metrics
    const totalModelsAnalyzed = 47;
    const modelsWithBias = 15;
    const totalBiasIssues = 365;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return '#dc2626';
            case 'HIGH': return '#f97316';
            case 'MEDIUM': return '#fbbf24';
            case 'LOW': return '#84cc16';
            default: return '#6b7280';
        }
    };

    const biasColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'];
    const severityColors = ['#dc2626', '#f97316', '#fbbf24', '#84cc16'];

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                    Bias Detection & Analysis
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Monitor and analyze bias patterns across AI models to ensure fairness and compliance
                </p>
            </div>

            {/* Top Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Models Analyzed
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#3b82f6', lineHeight: '1' }}>
                        {totalModelsAnalyzed}
                    </div>
                </div>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Models With Bias
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', lineHeight: '1' }}>
                        {modelsWithBias}
                    </div>
                </div>

                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Bias Issues
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#f59e0b', lineHeight: '1' }}>
                        {totalBiasIssues}
                    </div>
                </div>
            </div>

            {/* High-Risk Model List */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    High-Risk Model List
                </h2>
                <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '32px' }}>⚠️</div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b' }}>
                                {highRiskModels.length} models show high bias
                            </div>
                            <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                                Immediate attention required to address fairness concerns
                            </div>
                        </div>
                    </div>
                </div>

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
                                alignItems: 'center'
                            }}
                        >
                            {/* Model Info */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>
                                        {model.name}
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: getSeverityColor(model.severity),
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {model.severity}
                                    </span>
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                    <strong>Bias Type:</strong> {model.biasType}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                    <strong>Affected Groups:</strong> {model.affectedGroups.join(', ')}
                                </div>
                            </div>

                            {/* Issues Detected */}
                            <div style={{ textAlign: 'center', borderLeft: '2px solid #e5e7eb', borderRight: '2px solid #e5e7eb', padding: '0 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Issues Detected
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: '700', color: getSeverityColor(model.severity) }}>
                                    {model.issuesDetected}
                                </div>
                            </div>

                            {/* Bias Score */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Bias Score
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: '700', color: getSeverityColor(model.severity) }}>
                                    {model.biasScore.toFixed(1)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    / 10.0
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bias Analysis Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                {/* Bias Distribution by Type */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Bias Distribution by Type
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <PieChart
                            data={biasDistributionData}
                            colors={biasColors}
                            title="Bias Issues by Category"
                        />
                    </div>
                </div>

                {/* Bias Severity Breakdown */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Bias Severity Breakdown
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <PieChart
                            data={biasSeverityData}
                            colors={severityColors}
                            title="Issues by Severity Level"
                        />
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
                                border: `2px solid ${biasColors[index]}`,
                                padding: '20px',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {bias.name}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: biasColors[index], lineHeight: '1' }}>
                                {bias.value}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                                detected issues
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
