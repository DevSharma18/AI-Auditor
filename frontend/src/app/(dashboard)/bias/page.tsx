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
  alpha?: number;
  beta?: number;
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

function pct(v: any) {
  return `${Math.round(safeNumber(v, 0) * 1000) / 10}%`;
}

function safeDateLabel(executedAt: string | null | undefined, auditId?: string) {
  if (!executedAt) return String(auditId || '-');
  try {
    return new Date(executedAt).toLocaleDateString();
  } catch {
    return String(auditId || '-');
  }
}

export default function BiasPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  useEffect(() => {
    async function loadBias() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiGet<MetricApiResponse>('/metrics/bias');
        setPayload(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load bias metrics');
      } finally {
        setLoading(false);
      }
    }

    loadBias();
  }, []);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const trendPoints = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0) return [];

    // Always show last 10 trend points (backend says last 10 audits)
    return trend.slice(-10).map((x, idx) => ({
      name: safeDateLabel(x.executed_at, x.audit_id || `audit_${idx + 1}`),
      value: safeNumber(x.score_100, 0),
    }));
  }, [trend]);

  const trendBucketData = useMemo(() => {
    // Your BarChart component expects 1M/6M/1Y
    // We keep UI SAME but map last N points into buckets.
    const last10 = trendPoints.slice(-10);
    const last6 = trendPoints.slice(-6);
    const last3 = trendPoints.slice(-3);

    return {
      oneMonth: last3,
      sixMonths: last6,
      oneYear: last10,
    };
  }, [trendPoints]);

  const scoringBreakdown = useMemo(() => {
    if (!latest) return [];

    return [
      { name: 'Likelihood (L)', value: Math.round(safeNumber(latest.L, 0) * 100) },
      { name: 'Impact (I)', value: Math.round(safeNumber(latest.I, 0) * 100) },
      { name: 'Regulatory (R)', value: Math.round(safeNumber(latest.R, 0) * 100) },
    ];
  }, [latest]);

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
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>Loading bias scoring...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>
            Understand fairness risk, discrimination exposure, and compliance pressure.
          </p>
        </div>

        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
            Failed to load bias metrics
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
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>
            No bias scoring data yet. Run at least one audit to populate this page.
          </p>
        </div>
      </div>
    );
  }

  const band = String(latest.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
        <p style={safeSub}>
          Bias risk measures how likely the model is to generate discriminatory or unfair outputs,
          combined with business impact and regulatory pressure.
        </p>
      </div>

      {/* Enterprise Score Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '28px',
        }}
      >
        <MetricCard
          title="Bias Risk Score"
          value={`${Math.round(safeNumber(latest.score_100, 0))}/100`}
          color={bandClr}
          description="Overall severity of fairness risk, scaled to 0–100."
        />
        <MetricCard
          title="Risk Band"
          value={band}
          color={bandClr}
          description="Executive label (Low → Critical) used for decision-making."
        />
        <MetricCard
          title="Model (Latest Audit)"
          value={latest.model_name || latest.model_id || '-'}
          color="#3b82f6"
          description="The most recent audited model used for this score."
        />
      </div>

      {/* Explain L/I/R */}
      <div style={{ border: '2px solid #e5e7eb', padding: '18px', marginBottom: '28px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          What this score means (non-technical)
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          This score is calculated using three components:
          <br />
          <b>Likelihood (L)</b> = how often bias signals are observed during audits.
          <br />
          <b>Impact (I)</b> = how damaging bias can be (legal, reputational, discrimination risk).
          <br />
          <b>Regulatory weight (R)</b> = how strongly frameworks like GDPR / EU AI Act / OWASP cover this issue.
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div>
          <h2 style={sectionTitle}>Scoring Breakdown (L / I / R)</h2>
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
            <PieChart
              data={scoringBreakdown}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Bias Scoring Breakdown"
            />
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>Bias Risk Trend (Last 10 Audits)</h2>
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px', overflow: 'hidden' }}>
            <BarChart data={trendBucketData} color={bandClr} title="Bias Score Trend (0–100)" />
          </div>
        </div>
      </div>

      {/* Trend Table */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={sectionTitle}>Audit History (Bias Risk)</h2>

        <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Executed</th>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Band</th>
                <th style={thStyle}>Likelihood</th>
                <th style={thStyle}>Impact</th>
                <th style={thStyle}>Regulatory</th>
              </tr>
            </thead>
            <tbody>
              {trend.slice().reverse().map((row, idx) => {
                const bc = bandColor(String(row.band || 'LOW'));
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdMuted}>
                      {row.executed_at ? new Date(row.executed_at).toLocaleString() : '-'}
                    </td>
                    <td style={tdStrong}>{row.model_name || row.model_id || '-'}</td>
                    <td style={tdStrong}>{Math.round(safeNumber(row.score_100, 0))}</td>
                    <td style={tdMuted}>
                      <span
                        style={{
                          padding: '4px 10px',
                          border: `2px solid ${bc}`,
                          color: bc,
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {String(row.band || 'LOW')}
                      </span>
                    </td>
                    <td style={tdMuted}>{pct(row.L)}</td>
                    <td style={tdMuted}>{pct(row.I)}</td>
                    <td style={tdMuted}>{pct(row.R)}</td>
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

function MetricCard({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: any;
  color: string;
  description: string;
}) {
  return (
    <div style={{ border: '2px solid #e5e7eb', padding: '22px', overflow: 'hidden' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1.05, marginTop: 8 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 1.5 }}>
        {description}
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
  fontWeight: '800',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const tdStrong = {
  padding: '14px 16px',
  fontSize: '14px',
  fontWeight: '700',
  color: '#111827',
};

const tdMuted = {
  padding: '14px 16px',
  fontSize: '13px',
  color: '#6b7280',
};
