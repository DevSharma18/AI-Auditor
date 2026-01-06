'use client';

export default function CompliancePage() {
    // Metrics Data
    const complianceCoverageScore = 87;
    const regulatoryExposure = 'MEDIUM'; // LOW, MEDIUM, HIGH
    const modelsAtRisk = 8;
    const totalViolations = 14;

    // Coverage by Regulation
    const regulationCoverage = [
        { regulation: 'EU AI Act', coverage: 87, color: '#10b981' },
        { regulation: 'GDPR', coverage: 76, color: '#3b82f6' },
        { regulation: 'DPDP', coverage: 65, color: '#f59e0b' },
        { regulation: 'ISO 42001', coverage: 54, color: '#ef4444' }
    ];

    // Violations by Severity
    const violationsBySeverity = [
        { severity: 'Critical', count: 2, color: '#dc2626' },
        { severity: 'High', count: 4, color: '#f97316' },
        { severity: 'Medium', count: 5, color: '#fbbf24' },
        { severity: 'Low', count: 3, color: '#84cc16' }
    ];

    const getExposureColor = (exposure: string) => {
        switch (exposure) {
            case 'LOW': return '#10b981';
            case 'MEDIUM': return '#f59e0b';
            case 'HIGH': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                    Compliance
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Regulatory compliance monitoring and risk assessment
                </p>
            </div>

            {/* Top Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
                {/* Compliance Coverage Score */}
                <div
                    style={{
                        background: '#ffffff',
                        border: '2px solid #e5e7eb',
                        padding: '24px',
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Compliance Coverage Score
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#10b981', lineHeight: '1', marginBottom: '8px' }}>
                        {complianceCoverageScore}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                        "How compliant are we right now?"
                    </div>
                </div>

                {/* Regulatory Exposure Score */}
                <div
                    style={{
                        background: '#ffffff',
                        border: '2px solid #e5e7eb',
                        padding: '24px',
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Regulatory Exposure Score
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: getExposureColor(regulatoryExposure), lineHeight: '1', marginBottom: '8px' }}>
                        {regulatoryExposure}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                        "How much legal risk do we face?"
                    </div>
                </div>

                {/* Models at Compliance Risk */}
                <div
                    style={{
                        background: '#ffffff',
                        border: '2px solid #e5e7eb',
                        padding: '24px',
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Models at Compliance Risk
                    </div>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', lineHeight: '1', marginBottom: '8px' }}>
                        {modelsAtRisk}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                        Models requiring immediate attention
                    </div>
                </div>
            </div>

            {/* Coverage by Regulation Heatmap */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Coverage by Regulation
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Regulation
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Coverage
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Progress
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {regulationCoverage.map((item, index) => (
                                <tr key={index} style={{ borderBottom: index < regulationCoverage.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                                        {item.regulation}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '18px', fontWeight: '700', color: item.color }}>
                                        {item.coverage}%
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ width: '100%', background: '#f3f4f6', height: '24px', position: 'relative', border: '1px solid #e5e7eb' }}>
                                            <div
                                                style={{
                                                    width: `${item.coverage}%`,
                                                    background: item.color,
                                                    height: '100%',
                                                    transition: 'width 0.3s ease'
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Compliance Violations Count */}
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
                    Compliance Violations
                </h2>
                <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '32px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '64px', fontWeight: '700', color: '#ef4444', lineHeight: '1', marginBottom: '12px' }}>
                            {totalViolations}
                        </div>
                        <div style={{ fontSize: '16px', color: '#6b7280', fontWeight: '500' }}>
                            violations this quarter
                        </div>
                    </div>

                    {/* Severity Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {violationsBySeverity.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: '#ffffff',
                                    border: `2px solid ${item.color}`,
                                    padding: '20px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                    <div
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            background: item.color,
                                            marginRight: '8px'
                                        }}
                                    />
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {item.severity}
                                    </div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: item.color, lineHeight: '1' }}>
                                    {item.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
