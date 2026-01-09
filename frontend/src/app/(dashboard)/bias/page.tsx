'use client';

import { useEffect, useState } from 'react';
import PieChart from '@/components/charts/PieChart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export default function BiasPage() {
    const [totalModelsAnalyzed, setTotalModelsAnalyzed] = useState(0);
    const [modelsWithBias, setModelsWithBias] = useState(0);
    const [totalBiasIssues, setTotalBiasIssues] = useState(0);
    const [biasDistributionData, setBiasDistributionData] = useState<any[]>([]);
    const [biasSeverityData, setBiasSeverityData] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${API_BASE}/metrics/bias`)
            .then(res => res.json())
            .then(data => {
                setTotalModelsAnalyzed(data.totalModelsAnalyzed);
                setModelsWithBias(data.modelsWithBias);
                setTotalBiasIssues(data.totalBiasIssues);

                setBiasDistributionData(
                    data.biasDistribution.map((d: any) => ({
                        name: d.label,
                        value: d.value,
                    }))
                );

                setBiasSeverityData(
                    data.severityData.map((d: any) => ({
                        name: d.label,
                        value: d.value,
                    }))
                );
            });
    }, []);

    const colors = ['#dc2626', '#f97316', '#fbbf24', '#84cc16'];

    return (
        <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Bias Detection & Analysis</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, margin: '32px 0' }}>
                <MetricCard title="Total Models Analyzed" value={totalModelsAnalyzed} />
                <MetricCard title="Models With Bias" value={modelsWithBias} />
                <MetricCard title="Total Bias Issues" value={totalBiasIssues} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <ChartCard title="Bias Distribution">
                    <PieChart data={biasDistributionData} colors={colors} />
                </ChartCard>
                <ChartCard title="Bias Severity">
                    <PieChart data={biasSeverityData} colors={colors} />
                </ChartCard>
            </div>
        </div>
    );
}

function MetricCard({ title, value }: any) {
    return (
        <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{title}</div>
            <div style={{ fontSize: 42, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

function ChartCard({ title, children }: any) {
    return (
        <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
            {children}
        </div>
    );
}
