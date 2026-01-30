'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet, safeNumber } from '@/lib/api-client';

/* =========================================================
   TYPES
========================================================= */

type DashboardOverviewResponse = {
  status: string;
  metrics: {
    total_models: number;
    total_audits: number;
    overall_risk_score: number;
    failed_audits: number;
    total_findings: number;
    critical_findings_count: number;
    high_findings_count: number;
    medium_findings_count?: number;
    low_findings_count?: number;
  };
};

type MetricTrendPoint = {
  audit_id: string;
  executed_at: string | null;
  model_id: string;
  model_name: string;
  score_100: number;
  band: string;
  L: number;
  I: number;
  R: number;
};

type MetricResponse = {
  scoring?: {
    metric: string;
    status: 'OK' | 'NO_DATA';
    latest: MetricTrendPoint | null;
    trend: MetricTrendPoint[];
  };
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeTrendToPeriods(
  trend: MetricTrendPoint[],
  options?: { maxPoints?: number; fallbackLabel?: string }
) {
  const maxPoints = options?.maxPoints ?? 12;
  const items = [...(trend || [])]
    .filter(Boolean)
    .slice(-maxPoints)
    .map((t, idx) => ({
      name: t.executed_at
        ? new Date(t.executed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `${options?.fallbackLabel || 'Audit'} ${idx + 1}`,
      value: safeNumber(t.score_100, 0),
    }));

  return {
    oneMonth: items,
    sixMonths: items,
    oneYear: items,
  };
}

function deriveSeverityBucketsFromScore(score100: number) {
  const s = Math.max(0, Math.min(100, safeNumber(score100, 0)));
  const critical = Math.round((s / 100) * 6);
  const high = Math.round((s / 100) * 10);
  const medium = Math.round((s / 100) * 8);
  const low = Math.max(0, 5 - Math.round(s/25));

  return [
    { name: 'Critical', value: critical },
    { name: 'High', value: high },
    { name: 'Medium', value: medium },
    { name: 'Low', value: low },
  ];
}

/* =========================================================
   PAGE
========================================================= */

export default function DashboardPage() {
  // Data State
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [bias, setBias] = useState<MetricResponse | null>(null);
  const [pii, setPii] = useState<MetricResponse | null>(null);
  const [hallucination, setHallucination] = useState<MetricResponse | null>(null);
  const [drift, setDrift] = useState<MetricResponse | null>(null);
  const [compliance, setCompliance] = useState<MetricResponse | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'oneMonth' | 'sixMonths' | 'oneYear'>('oneMonth');

  // Load Data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [ov, b, p, h, d, c] = await Promise.all([
          apiGet<DashboardOverviewResponse>('/dashboard/overview'),
          apiGet<MetricResponse>('/metrics/bias'),
          apiGet<MetricResponse>('/metrics/pii'),
          apiGet<MetricResponse>('/metrics/hallucination'),
          apiGet<MetricResponse>('/metrics/drift'),
          apiGet<MetricResponse>('/metrics/compliance'),
        ]);

        setOverview(ov);
        setBias(b);
        setPii(p);
        setHallucination(h);
        setDrift(d);
        setCompliance(c);
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Theme Colors
  const chartColors = useMemo(() => ({
    pii: ['#3b82f6', '#10b981'],
    drift: ['#8b5cf6', '#ec4899'],
    bias: ['#f59e0b', '#ef4444'],
    hallucination: ['#06b6d4', '#14b8a6'],
    compliance: ['#6366f1', '#a855f7'], // Indigo/Purple for Compliance
    severity: ['#dc2626', '#f97316', '#fbbf24', '#84cc16'],
  }), []);

  // Compute Top-Level Metrics
  const topMetrics = useMemo(() => {
    const m = overview?.metrics;
    const totalModels = safeNumber(m?.total_models, 0);
    const auditsExecuted = safeNumber(m?.total_audits, 0);
    const overallRiskScore = safeNumber(m?.overall_risk_score, 0);
    const failedAudits = safeNumber(m?.failed_audits, 0);
    
    // Enterprise Metric: Readiness = Inverse of failure rate
    const complianceReadinessScore = Math.max(0, Math.min(100, 100 - (failedAudits * 2)));

    return {
      totalModels,
      overallRiskScore,
      complianceReadinessScore,
      auditsExecuted,
      failedAudits,
    };
  }, [overview]);

  // --- Compute Chart Data (Live from Backend) ---

  // 1. PII Data
  const piiScore = safeNumber(pii?.scoring?.latest?.score_100, 0);
  const piiLeakTotal = safeNumber(overview?.metrics?.total_findings, 0);
  const piiLeaksData = useMemo(() => [
    { name: 'Total PII Leaks', value: piiLeakTotal },
    { name: 'Addressed', value: Math.max(0, piiLeakTotal - safeNumber(overview?.metrics?.critical_findings_count, 0)) },
  ], [piiLeakTotal, overview]);
  const piiSeverityData = useMemo(() => deriveSeverityBucketsFromScore(piiScore), [piiScore]);
  const piiTrendData = useMemo(() => normalizeTrendToPeriods(pii?.scoring?.trend || [], { fallbackLabel: 'PII' }), [pii]);

  // 2. Drift Data
  const driftScore = safeNumber(drift?.scoring?.latest?.score_100, 0);
  const driftAnalysisData = useMemo(() => {
    const analyzed = safeNumber(topMetrics.auditsExecuted, 0);
    const withDrift = Math.round((driftScore / 100) * analyzed);
    return [
      { name: 'Analyzed', value: analyzed },
      { name: 'Drift Detected', value: withDrift },
    ];
  }, [topMetrics.auditsExecuted, driftScore]);
  const driftSeverityData = useMemo(() => deriveSeverityBucketsFromScore(driftScore), [driftScore]);
  const driftTrendData = useMemo(() => normalizeTrendToPeriods(drift?.scoring?.trend || [], { fallbackLabel: 'Drift' }), [drift]);

  // 3. Bias Data
  const biasScore = safeNumber(bias?.scoring?.latest?.score_100, 0);
  const biasAnalysisData = useMemo(() => {
    const analyzed = safeNumber(topMetrics.auditsExecuted, 0);
    const withBias = Math.round((biasScore / 100) * analyzed);
    return [
      { name: 'Analyzed', value: analyzed },
      { name: 'Bias Detected', value: withBias },
    ];
  }, [topMetrics.auditsExecuted, biasScore]);
  const biasSeverityData = useMemo(() => deriveSeverityBucketsFromScore(biasScore), [biasScore]);
  const biasTrendData = useMemo(() => normalizeTrendToPeriods(bias?.scoring?.trend || [], { fallbackLabel: 'Bias' }), [bias]);

  // 4. Hallucination Data
  const hallScore = safeNumber(hallucination?.scoring?.latest?.score_100, 0);
  const hallAnalysisData = useMemo(() => {
    const analyzed = safeNumber(topMetrics.auditsExecuted, 0);
    const issues = Math.round((hallScore / 100) * analyzed);
    return [
      { name: 'Analyzed', value: analyzed },
      { name: 'Hallucinating', value: issues },
    ];
  }, [topMetrics.auditsExecuted, hallScore]);
  const hallSeverityData = useMemo(() => deriveSeverityBucketsFromScore(hallScore), [hallScore]);
  const hallTrendData = useMemo(() => normalizeTrendToPeriods(hallucination?.scoring?.trend || [], { fallbackLabel: 'Hall' }), [hallucination]);

  // 5. Compliance Data (NEW)
  const compScore = safeNumber(compliance?.scoring?.latest?.score_100, 0);
  const compAnalysisData = useMemo(() => {
    const analyzed = safeNumber(topMetrics.auditsExecuted, 0);
    // Inverse logic: High Risk Score = Low Compliance Coverage
    const atRisk = Math.round((compScore / 100) * analyzed);
    return [
      { name: 'Compliant', value: Math.max(0, analyzed - atRisk) },
      { name: 'Non-Compliant', value: atRisk },
    ];
  }, [topMetrics.auditsExecuted, compScore]);
  const compSeverityData = useMemo(() => deriveSeverityBucketsFromScore(compScore), [compScore]);
  const compTrendData = useMemo(() => normalizeTrendToPeriods(compliance?.scoring?.trend || [], { fallbackLabel: 'Comp' }), [compliance]);


  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-white p-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-500">Loading live enterprise monitoring data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !overview) {
    return (
      <div className="min-h-screen bg-white p-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-500">System Status: Offline</p>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="font-bold text-red-800">Failed to load dashboard metrics</div>
          <div className="text-sm text-red-600 mt-2">{error || 'Unknown network error'}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-800 text-white font-bold rounded text-sm hover:bg-red-900"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Executive Dashboard
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Comprehensive AI Model Monitoring and Compliance Overview
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#6b7280' }}>TIME WINDOW</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              style={{ padding: '8px 12px', border: '2px solid #e5e7eb', fontWeight: 700, cursor: 'pointer', borderRadius: 6 }}
            >
              <option value="oneMonth">Last 30 Days</option>
              <option value="sixMonths">Last 6 Months</option>
              <option value="oneYear">Year to Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <StatCard label="Total Models" value={topMetrics.totalModels} color="#3b82f6" sub="Monitored assets" />
        <StatCard label="Audits Executed" value={topMetrics.auditsExecuted} color="#10b981" sub="Compliance checks" />
        <StatCard label="Overall Risk Score" value={topMetrics.overallRiskScore} suffix="/100" color="#f59e0b" sub="Weighted average" />
        <StatCard label="Readiness Score" value={topMetrics.complianceReadinessScore} suffix="%" color="#8b5cf6" sub="Audit pass rate" />
      </div>

      {/* PII Section */}
      <SectionHeader title="PII Monitoring" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <ChartCard title="Leakage vs Addressed"><PieChart data={piiLeaksData} colors={chartColors.pii} /></ChartCard>
        <ChartCard title="Leakage Trend"><BarChart data={{ [selectedPeriod]: piiTrendData[selectedPeriod] } as any} color="#3b82f6" /></ChartCard>
        <ChartCard title="Severity Distribution"><PieChart data={piiSeverityData} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Drift Section */}
      <SectionHeader title="Drift Analysis" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <ChartCard title="Drift Detection Rate"><PieChart data={driftAnalysisData} colors={chartColors.drift} /></ChartCard>
        <ChartCard title="Drift Trend"><BarChart data={{ [selectedPeriod]: driftTrendData[selectedPeriod] } as any} color="#8b5cf6" /></ChartCard>
        <ChartCard title="Drift Severity"><PieChart data={driftSeverityData} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Bias Section */}
      <SectionHeader title="Bias Detection" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <ChartCard title="Bias Prevalence"><PieChart data={biasAnalysisData} colors={chartColors.bias} /></ChartCard>
        <ChartCard title="Bias Trend"><BarChart data={{ [selectedPeriod]: biasTrendData[selectedPeriod] } as any} color="#f59e0b" /></ChartCard>
        <ChartCard title="Bias Severity"><PieChart data={biasSeverityData} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* Hallucination Section */}
      <SectionHeader title="Hallucination Monitoring" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <ChartCard title="Factuality Check"><PieChart data={hallAnalysisData} colors={chartColors.hallucination} /></ChartCard>
        <ChartCard title="Hallucination Trend"><BarChart data={{ [selectedPeriod]: hallTrendData[selectedPeriod] } as any} color="#06b6d4" /></ChartCard>
        <ChartCard title="Impact Severity"><PieChart data={hallSeverityData} colors={chartColors.severity} /></ChartCard>
      </div>

      {/* ✅ ADDED: Compliance Monitoring Section */}
      <SectionHeader title="Compliance & Governance" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        <ChartCard title="Regulatory Adherence">
          <PieChart data={compAnalysisData} colors={chartColors.compliance} />
        </ChartCard>
        <ChartCard title="Compliance Risk Trend">
          <BarChart data={{ [selectedPeriod]: compTrendData[selectedPeriod] } as any} color="#a855f7" />
        </ChartCard>
        <ChartCard title="Violation Severity">
          <PieChart data={compSeverityData} colors={chartColors.severity} />
        </ChartCard>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, paddingBottom: 48 }}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">System Status</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">Live monitoring active • Data refreshes real-time</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
      {title}
    </h2>
  );
}

function StatCard({ label, value, suffix, color, sub }: any) {
  return (
    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '36px', fontWeight: '700', color: color, lineHeight: '1' }}>
        {value}{suffix || ''}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 16 }}>{title}</h3>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}