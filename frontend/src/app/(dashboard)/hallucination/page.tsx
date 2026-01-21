'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet, safeNumber } from '@/lib/api-client';

type MetricPoint = {
  audit_id?: string;
  executed_at?: string | null;
  model_id?: string;
  model_name?: string;
  score_100?: number;
  band?: string;
  L?: number;
  I?: number;
  R?: number;
};

type MetricScoring = {
  metric?: string;
  status?: 'OK' | 'NO_DATA';
  latest?: MetricPoint | null;
  trend?: MetricPoint[];
};

type MetricApiResponse = {
  scoring?: MetricScoring;
};

function bandColor(band: string) {
  const b = String(band || '').toUpperCase();
  if (b === 'CRITICAL') return '#dc2626';
  if (b === 'SEVERE') return '#f97316';
  if (b === 'HIGH') return '#f59e0b';
  if (b === 'MODERATE') return '#3b82f6';
  return '#10b981';
}

function safeDateLabel(executedAt: string | null | undefined, auditId?: string) {
  if (!executedAt) return String(auditId || '-');
  try {
    return new Date(executedAt).toLocaleDateString();
  } catch {
    return String(auditId || '-');
  }
}

export default function HallucinationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<MetricApiResponse>('/metrics/hallucination');
        setPayload(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load hallucination scoring');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const breakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Likelihood (L)', value: Math.round(safeNumber(latest.L, 0) * 100) },
      { name: 'Impact (I)', value: Math.round(safeNumber(latest.I, 0) * 100) },
      { name: 'Regulatory (R)', value: Math.round(safeNumber(latest.R, 0) * 100) },
    ];
  }, [latest]);

  const trendPoints = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0) return [];
    return trend.slice(-10).map((x, idx) => ({
      name: safeDateLabel(x.executed_at, x.audit_id || `audit_${idx + 1}`),
      value: safeNumber(x.score_100, 0),
    }));
  }, [trend]);

  const trendBucketData = useMemo(() => {
    const last10 = trendPoints.slice(-10);
    const last6 = trendPoints.slice(-6);
    const last3 = trendPoints.slice(-3);

    return {
      oneMonth: last3,
      sixMonths: last6,
      oneYear: last10,
    };
  }, [trendPoints]);

  const safeTitle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word' as const,
  };

  const safeSub = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <h1 style={safeTitle}>Hallucination Risk</h1>
        <p style={safeSub}>Loading hallucination scoring...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <h1 style={safeTitle}>Hallucination Risk</h1>
        <p style={safeSub}>Could not load hallucination scoring.</p>
        <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13 }}>{error}</div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <h1 style={safeTitle}>Hallucination Risk</h1>
        <p style={safeSub}>No hallucination scoring data yet. Run an audit first.</p>
      </div>
    );
  }

  const band = String(latest.band || 'LOW').toUpperCase();
  const clr = bandColor(band);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={safeTitle}>Hallucination Risk</h1>
        <p style={safeSub}>
          Hallucination risk measures whether a model produces incorrect, misleading,
          or fabricated information — combined with potential impact and compliance exposure.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginBottom: 28 }}>
        <Card title="Hallucination Score" value={`${Math.round(safeNumber(latest.score_100, 0))}/100`} color={clr} />
        <Card title="Risk Band" value={band} color={clr} />
        <Card title="Latest Model" value={latest.model_name || latest.model_id || '-'} color="#3b82f6" />
      </div>

      <div style={{ border: '2px solid #e5e7eb', padding: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Simple explanation</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>
          If hallucination score is high, your AI may confidently provide wrong answers.
          This creates business risk (bad decisions), user harm, and trust loss.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
          <PieChart
            data={breakdown}
            colors={['#3b82f6', '#f59e0b', '#dc2626']}
            title="Scoring Breakdown (L / I / R)"
          />
        </div>

        <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
          <BarChart data={trendBucketData} color={clr} title="Hallucination Trend (0–100)" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: any; color: string }) {
  return (
    <div style={{ border: '2px solid #e5e7eb', padding: 22 }}>
      <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1.05, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}
