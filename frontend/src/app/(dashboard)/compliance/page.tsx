'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export default function CompliancePage() {
    const [coverage, setCoverage] = useState(0);
    const [exposure, setExposure] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [modelsAtRisk, setModelsAtRisk] = useState(0);
    const [totalViolations, setTotalViolations] = useState(0);
    const [violations, setViolations] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${API_BASE}/metrics/compliance`)
            .then(res => res.json())
            .then(data => {
                setCoverage(data.complianceCoverageScore);
                setExposure(data.regulatoryExposure);
                setModelsAtRisk(data.modelsAtRisk);
                setTotalViolations(data.totalViolations);
                setViolations(data.violationsBySeverity);
            });
    }, []);

    const exposureColor =
        exposure === 'HIGH' ? '#dc2626' :
            exposure === 'MEDIUM' ? '#f59e0b' :
                '#10b981';

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Compliance</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, margin: '32px 0' }}>
                <Metric title="Compliance Coverage Score" value={`${coverage}%`} color="#10b981" />
                <Metric title="Regulatory Exposure" value={exposure} color={exposureColor} />
                <Metric title="Models At Risk" value={modelsAtRisk} color="#dc2626" />
            </div>

            <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
                <h3>Compliance Violations</h3>

                <div style={{ fontSize: 48, fontWeight: 700, color: '#dc2626', textAlign: 'center' }}>
                    {totalViolations}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 24 }}>
                    {violations.map(v => (
                        <div key={v.severity} style={{ border: '2px solid #e5e7eb', padding: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 12 }}>{v.severity}</div>
                            <div style={{ fontSize: 32, fontWeight: 700 }}>{v.count}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Metric({ title, value, color }: any) {
    return (
        <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{title}</div>
            <div style={{ fontSize: 42, fontWeight: 700, color }}>{value}</div>
        </div>
    );
}
