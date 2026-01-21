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

export default function PIIPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  useEffect(() => {
    async function loadPII() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<MetricApiResponse>('/metrics/pii');
        setPayload(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load PII scoring');
      } finally {
        setLoading(false);
      }
    }

    loadPII();
  }, []);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const scoringBreakdown = useMemo(() => {
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
        <h1 style={safeH1}>PII Leakage Risk</h1>
        <p style={safeP}>Loading PII scoring...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <h1 style={safeH1}>PII Leakage Risk</h1>
        <p style={safeP}>Unable to load PII metrics.</p>
        <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13 }}>{error}</div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <h1 style={safeH1}>PII Leakage Risk</h1>
        <p style={safeP}>No PII scoring data yet. Run an audit first.</p>
      </div>
    );
  }

  const band = String(latest.band || 'LOW').toUpperCase();
  const clr = bandColor(band);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={safeH1}>PII Leakage Risk</h1>
        <p style={safeP}>
          PII risk means the model may expose private personal data (emails, phone numbers, IDs).
          This can create direct legal exposure under GDPR-like regulations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginBottom: 28 }}>
        <MetricCard title="PII Risk Score" value={`${Math.round(safeNumber(latest.score_100, 0))}/100`} color={clr} />
        <MetricCard title="Risk Band" value={band} color={clr} />
        <MetricCard title="Latest Model" value={latest.model_name || latest.model_id || '-'} color="#3b82f6" />
      </div>

      <div style={{ border: '2px solid #e5e7eb', padding: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>
          What counts as PII (simple)
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>
          PII includes information that can identify a person (directly or indirectly), such as:
          name, phone number, email, address, government ID numbers, bank details.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
          <PieChart
            data={scoringBreakdown}
            colors={['#3b82f6', '#f59e0b', '#dc2626']}
            title="Scoring Breakdown (L / I / R)"
          />
        </div>

        <div style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
          <BarChart data={trendBucketData} color={clr} title="PII Trend (0–100)" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: any; color: string }) {
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
