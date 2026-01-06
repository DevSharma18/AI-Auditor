'use client';

import PieChart from '@/components/charts/PieChart';

export default function DriftPage() {
    // Drift Score Metrics
    const driftScore = {
        baseline: 0.12,
        current: 0.45,
        change: '+275%',
        status: 'CRITICAL'
    };

    // Accuracy Deviation
    const accuracyDeviation = {
        baseline: 94.5,
        current: 87.2,
        deviation: -7.3
    };

    // Output Distribution Shift
    const distributionShift = {
        psi: 0.32, // Population Stability Index
        ks: 0.28,  // Kolmogorov-Smirnov
        wasserstein: 0.41
    };

    // Sudden Behavior Change Alerts
    const behaviorAlerts = [
        { modelName: 'fraud-detector', changeType: 'Prediction Distribution', severity: 'HIGH', detectedAt: '2024-01-20', impact: 'Critical' },
        { modelName: 'credit-scoring', changeType: 'Feature Importance Shift', severity: 'MEDIUM', detectedAt: '2024-01-18', impact: 'Moderate' },
        { modelName: 'loan-approval', changeType: 'Decision Boundary Drift', severity: 'CRITICAL', detectedAt: '2024-01-22', impact: 'Severe' }
    ];

    // Outcome Fairness by Group
    const fairnessData = [
        { name: 'False Positives', value: 87 },
        { name: 'False Negatives', value: 65 },
        { name: 'Favorable Outcomes', value: 248 }
    ];

    // Recurring Bias Patterns
    const biasPatterns = [
        { type: 'Gender Bias in Loans', count: 23, impact: 'High', affectedModels: 3 },
        { type: 'Age Bias in Hiring', count: 17, impact: 'Medium', affectedModels: 2 },
        { type: 'Region Bias in Insurance', count: 31, impact: 'Critical', affectedModels: 4 }
    ];

    // Bias Severity Hotspots
    const severityHotspots = [
        { model: 'loan-approval-v3', severity: 'CRITICAL', volume: 145, complianceRisk: 'HIGH', severityScore: 9.2 },
        { model: 'hiring-assistant-v2', severity: 'HIGH', volume: 98, complianceRisk: 'MEDIUM', severityScore: 7.8 },
        { model: 'insurance-underwriter', severity: 'CRITICAL', volume: 167, complianceRisk: 'CRITICAL', severityScore: 9.5 },
        { model: 'credit-scorer-v1', severity: 'MEDIUM', volume: 72, complianceRisk: 'MEDIUM', severityScore: 6.1 },
        { model: 'fraud-detector-v4', severity: 'HIGH', volume: 112, complianceRisk: 'HIGH', severityScore: 8.3 }
    ];

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return '#dc2626';
            case 'HIGH': return '#f97316';
            case 'MEDIUM': return '#fbbf24';
            case 'LOW': return '#84cc16';
            default: return '#6b7280';
        }
    };

    const fairnessColors = ['#ef4444', '#f97316', '#10b981'];

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                    Drift & Bias Monitoring
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Monitor model drift, accuracy deviation, and bias patterns across your AI systems
                </p>
            </div>

            {/* Top Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
                {/* Drift Score */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Drift Score
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Baseline</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                                {driftScore.baseline.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ fontSize: '24px', color: '#6b7280' }}>→</div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                                {driftScore.current.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '8px 12px',
                        background: '#fef2f2',
                        border: `2px solid ${getSeverityColor(driftScore.status)}`,
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>
                            {driftScore.change} Change • {driftScore.status}
                        </span>
                    </div>
                </div>

                {/* Accuracy Deviation */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Accuracy Deviation
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Baseline</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                                {accuracyDeviation.baseline}%
                            </div>
                        </div>
                        <div style={{ fontSize: '24px', color: '#6b7280' }}>→</div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f97316' }}>
                                {accuracyDeviation.current}%
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '8px 12px',
                        background: '#fff7ed',
                        border: '2px solid #f97316',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#f97316' }}>
                            {accuracyDeviation.deviation}% Deviation
                        </span>
                    </div>
                </div>

                {/* Output Distribution Shift */}
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Output Distribution Shift
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {[
                            { label: 'PSI', value: distributionShift.psi, color: '#8b5cf6' },
                            { label: 'KS', value: distributionShift.ks, color: '#ec4899' },
                            { label: 'Wasserstein', value: distributionShift.wasserstein, color: '#f59e0b' }
                        ].map((metric, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>{metric.label}</span>
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
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Sudden Behavior Change Alerts
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Model Name
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Change Type
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Severity
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Impact
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Detected
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {behaviorAlerts.map((alert, index) => (
                                <tr key={index} style={{ borderBottom: index < behaviorAlerts.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                                        {alert.modelName}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                                        {alert.changeType}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            background: getSeverityColor(alert.severity),
                                            color: '#ffffff',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                                        {alert.impact}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                                        {new Date(alert.detectedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Two Column Layout: Fairness and Bias Patterns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                {/* Outcome Fairness by Group */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Outcome Fairness by Group
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <PieChart
                            data={fairnessData}
                            colors={fairnessColors}
                            title="Model Outcome Distribution"
                        />
                    </div>
                </div>

                {/* Recurring Bias Patterns */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                        Recurring Bias Patterns
                    </h2>
                    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {biasPatterns.map((pattern, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: '#ffffff',
                                        border: `2px solid ${pattern.impact === 'Critical' ? '#dc2626' : pattern.impact === 'High' ? '#f97316' : '#fbbf24'}`,
                                        padding: '16px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                                            {pattern.type}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: '700', color: pattern.impact === 'Critical' ? '#dc2626' : pattern.impact === 'High' ? '#f97316' : '#fbbf24' }}>
                                            {pattern.count}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                                        <span>Impact: {pattern.impact}</span>
                                        <span>{pattern.affectedModels} models affected</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bias Severity Hotspots */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Bias Severity Hotspots
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                        Models ranked by severity score, volume, and compliance risk
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Rank
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Model Name
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Severity
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Volume
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Compliance Risk
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Score
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {severityHotspots
                                .sort((a, b) => b.severityScore - a.severityScore)
                                .map((hotspot, index) => (
                                    <tr key={index} style={{ borderBottom: index < severityHotspots.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                        <td style={{ padding: '16px', fontSize: '18px', fontWeight: '700', color: '#6b7280' }}>
                                            #{index + 1}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                                            {hotspot.model}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: getSeverityColor(hotspot.severity),
                                                color: '#ffffff',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {hotspot.severity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>
                                            {hotspot.volume}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: hotspot.complianceRisk === 'CRITICAL' ? '#dc2626' : hotspot.complianceRisk === 'HIGH' ? '#f97316' : '#fbbf24',
                                                color: '#ffffff',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {hotspot.complianceRisk}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '20px', fontWeight: '700', color: getSeverityColor(hotspot.severity) }}>
                                            {hotspot.severityScore.toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
