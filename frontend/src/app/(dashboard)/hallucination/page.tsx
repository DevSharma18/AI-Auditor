'use client';

export default function HallucinationPage() {
    // Critical Hallucinations Data
    const criticalHallucinations = {
        legalRisk: 8,
        financialHarm: 5,
        misinformation: 12,
        safetyImpact: 3,
        total: 28
    };

    // High Risk Models
    const highRiskModels = [
        { name: 'customer-chatbot', riskScore: 87, hallucinationCount: 15 },
        { name: 'medical-support-llm', riskScore: 92, hallucinationCount: 23 }
    ];

    // Root Cause Categories
    const rootCauseBreakdown = [
        { category: 'Factual Hallucinations', count: 45, percentage: 35, color: '#ef4444' },
        { category: 'Numerical Hallucinations', count: 28, percentage: 22, color: '#f97316' },
        { category: 'Entity Hallucinations', count: 32, percentage: 25, color: '#fbbf24' },
        { category: 'Harmful Hallucinations', count: 15, percentage: 12, color: '#dc2626' },
        { category: 'Policy-Breaking Hallucinations', count: 8, percentage: 6, color: '#7c3aed' }
    ];

    // Drift-Induced Hallucination Alerts
    const driftInducedAlerts = [
        { modelName: 'fraud-detector', driftLevel: 'High', hallucinationsTriggered: 7, timestamp: '2024-01-15' },
        { modelName: 'recommendation-engine', driftLevel: 'Medium', hallucinationsTriggered: 4, timestamp: '2024-01-18' },
        { modelName: 'content-moderator', driftLevel: 'Critical', hallucinationsTriggered: 11, timestamp: '2024-01-20' }
    ];

    // Jailbreak Data
    const jailbreakData = {
        totalAttempts: 14,
        successfulTriggers: 5,
        successRate: 36
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                    Hallucination Monitoring
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Track and analyze AI model hallucinations, root causes, and security risks
                </p>
            </div>

            {/* Critical Hallucinations Count */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Critical Hallucinations Count
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '32px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '64px', fontWeight: '700', color: '#dc2626', lineHeight: '1', marginBottom: '12px' }}>
                            {criticalHallucinations.total}
                        </div>
                        <div style={{ fontSize: '16px', color: '#6b7280', fontWeight: '500' }}>
                            critical hallucinations detected
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Legal Risk', count: criticalHallucinations.legalRisk, color: '#ef4444' },
                            { label: 'Financial Harm', count: criticalHallucinations.financialHarm, color: '#f97316' },
                            { label: 'Misinformation', count: criticalHallucinations.misinformation, color: '#fbbf24' },
                            { label: 'Safety Impact', count: criticalHallucinations.safetyImpact, color: '#dc2626' }
                        ].map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: `2px solid ${item.color}`,
                                    padding: '20px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: item.color, lineHeight: '1' }}>
                                    {item.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Models With High Hallucination Risk */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Models With High Hallucination Risk
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginBottom: '24px' }}>
                        {highRiskModels.length} models above threshold
                    </div>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {highRiskModels.map((model, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#fef2f2',
                                    border: '2px solid #fca5a5',
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                                        {model.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                        {model.hallucinationCount} hallucinations detected
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Risk Score
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>
                                        {model.riskScore}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Root Cause Category Breakdown */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Root Cause Category Breakdown
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {rootCauseBreakdown.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: '2px solid #e5e7eb',
                                    padding: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                                        {item.category}
                                    </div>
                                    <div style={{ width: '100%', background: '#f3f4f6', height: '24px', position: 'relative', border: '1px solid #e5e7eb' }}>
                                        <div
                                            style={{
                                                width: `${item.percentage}%`,
                                                background: item.color,
                                                height: '100%',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: item.color, marginBottom: '4px' }}>
                                        {item.count}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        {item.percentage}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drift-Induced Hallucination Alerts */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Drift-Induced Hallucination Alerts
                </h2>
                <div style={{ background: '#fffbeb', border: '2px solid #fbbf24', padding: '24px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                        ⚠️ Warning: Drift can escalate hallucination risk
                    </div>
                    <div style={{ fontSize: '13px', color: '#78350f' }}>
                        Models experiencing drift are more likely to generate hallucinations
                    </div>
                </div>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Model Name
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Drift Level
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Hallucinations Triggered
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Detected On
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {driftInducedAlerts.map((alert, index) => {
                                const driftColors = {
                                    'Critical': '#dc2626',
                                    'High': '#f97316',
                                    'Medium': '#fbbf24'
                                };
                                return (
                                    <tr key={index} style={{ borderBottom: index < driftInducedAlerts.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                                            {alert.modelName}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                background: driftColors[alert.driftLevel as keyof typeof driftColors],
                                                color: '#ffffff',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {alert.driftLevel}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>
                                            {alert.hallucinationsTriggered}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                                            {new Date(alert.timestamp).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detected Jailbreak-Induced Hallucinations */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Detected Jailbreak-Induced Hallucinations
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Jailbreak Attempts
                            </div>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#7c3aed', lineHeight: '1' }}>
                                {jailbreakData.totalAttempts}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Successful Triggers
                            </div>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#dc2626', lineHeight: '1' }}>
                                {jailbreakData.successfulTriggers}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Success Rate
                            </div>
                            <div style={{ fontSize: '48px', fontWeight: '700', color: '#f97316', lineHeight: '1' }}>
                                {jailbreakData.successRate}%
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                            🚨 Security Alert
                        </div>
                        <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                            {jailbreakData.successfulTriggers} out of {jailbreakData.totalAttempts} jailbreak attempts successfully triggered hallucinations.
                            Immediate review and model hardening recommended.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
