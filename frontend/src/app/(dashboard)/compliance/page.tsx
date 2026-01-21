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
  frameworks?: Record<string, any>;
  signals?: Record<string, any>;
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

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  useEffect(() => {
    async function loadCompliance() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<MetricApiResponse>('/metrics/compliance');
        setPayload(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load compliance metrics');
      } finally {
        setLoading(false);
      }
    }

    loadCompliance();
  }, []);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const breakdownData = useMemo(() => {
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
        <div style={{ marginBottom: '32px' }}>
          <h1 style={safeTitle}>Compliance Risk</h1>
          <p style={safeSub}>Loading compliance scoring...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={safeTitle}>Compliance Risk</h1>
          <p style={safeSub}>
            Understand policy violations, audit execution risk, and regulatory exposure.
          </p>
        </div>

        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
            Failed to load compliance metrics
          </div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', lineHeight: 1.5 }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={safeTitle}>Compliance Risk</h1>
          <p style={safeSub}>No compliance scoring data yet. Run an audit to populate this page.</p>
        </div>
      </div>
    );
  }

  const band = String(latest.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={safeTitle}>Compliance Risk</h1>
        <p style={safeSub}>
          Compliance risk reflects how likely the system is to violate safety, governance,
          or security expectations — weighted by impact and regulatory coverage.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, margin: '22px 0 28px' }}>
        <Metric title="Compliance Risk Score" value={`${Math.round(safeNumber(latest.score_100, 0))}/100`} color={bandClr} />
        <Metric title="Risk Band" value={band} color={bandClr} />
        <Metric title="Latest Model" value={latest.model_name || latest.model_id || '-'} color="#3b82f6" />
      </div>

      <div style={{ border: '2px solid #e5e7eb', padding: '18px', marginBottom: '28px' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 8 }}>
          What Compliance Risk means
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>
          <b>Compliance Risk</b> includes issues like execution failures, unsafe behaviors,
          missing safeguards, policy violations, or weak governance signals.
          <br />
          It is calculated as: <b>S = (L^α × I^β) × R</b>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div>
          <h2 style={sectionTitle}>Scoring Breakdown (L / I / R)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <PieChart
              data={breakdownData}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Compliance Scoring Breakdown"
            />
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>Compliance Trend (Last 10 Audits)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <BarChart data={trendBucketData} color={bandClr} title="Compliance Trend (0–100)" />
          </div>
        </div>
      </div>

      {/* Keep your table section EXACT style */}
      <div>
        <h2 style={sectionTitle}>Recent Compliance Trend (Table)</h2>
        <div style={{ border: '2px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Executed</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Band</th>
                <th style={thStyle}>Model</th>
              </tr>
            </thead>
            <tbody>
              {trend.slice().reverse().map((r, i) => {
                const c = bandColor(String(r.band || 'LOW'));
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdMuted}>
                      {r.executed_at ? new Date(r.executed_at).toLocaleString() : '-'}
                    </td>
                    <td style={tdStrong}>{Math.round(safeNumber(r.score_100, 0))}</td>
                    <td style={tdMuted}>
                      <span
                        style={{
                          padding: '4px 10px',
                          border: `2px solid ${c}`,
                          color: c,
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                        }}
                      >
                        {String(r.band || 'LOW')}
                      </span>
                    </td>
                    <td style={tdMuted}>{r.model_name || r.model_id || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, color }: { title: string; value: any; color: string }) {
  return (
    <div style={{ border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
      <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

const sectionTitle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1a1a1a',
  marginBottom: '16px',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '10px',
  lineHeight: 1.2,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: '900',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const tdStrong = {
  padding: '14px 16px',
  fontSize: '14px',
  fontWeight: '800',
  color: '#111827',
};

const tdMuted = {
  padding: '14px 16px',
  fontSize: '13px',
  color: '#6b7280',
};
