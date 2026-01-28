'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet, safeNumber } from '@/lib/api-client';

/* =========================
   TYPES
========================= */

type ModelRow = {
  id: number;
  model_id: string;
  name: string;
};

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

/* =========================
   HELPERS
========================= */

function bandColor(band: string) {
  const b = String(band || '').toUpperCase();
  if (b === 'CRITICAL') return '#dc2626';
  if (b === 'SEVERE') return '#f97316';
  if (b === 'HIGH') return '#f59e0b';
  if (b === 'MODERATE') return '#3b82f6';
  return '#10b981';
}

function pct01(v: any) {
  // backend sends L/I/R in 0..1
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

function safeNumberInt(v: any, fallback = 0) {
  return Math.round(safeNumber(v, fallback));
}

/* =========================
   PAGE
========================= */

export default function BiasPage() {
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(''); // empty = global view
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  async function loadModels() {
    try {
      setModelsLoading(true);
      const data = await apiGet<ModelRow[]>('/models');
      setModels(Array.isArray(data) ? data : []);
    } catch {
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }

  async function loadBias(modelId?: string) {
    try {
      setLoading(true);
      setError(null);

      // ✅ Model filter support (ONLY if backend supports it)
      // If backend doesn't support ?model_id, it will just error and we show message.
      const qp = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
      const data = await apiGet<MetricApiResponse>(`/metrics/bias${qp}`);

      setPayload(data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setPayload(null);
      setError(err?.message || 'Failed to load bias metrics');
    } finally {
      setLoading(false);
    }
  }

  // load models once
  useEffect(() => {
    loadModels();
  }, []);

  // load bias whenever model changes
  useEffect(() => {
    loadBias(selectedModelId || undefined);
  }, [selectedModelId]);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  const signals = (latest?.signals || {}) as Record<string, any>;
  const frameworks = (latest?.frameworks || {}) as Record<string, any>;

  const findingCount = safeNumberInt(signals.finding_count, 0);
  const interactionCount = safeNumberInt(signals.interactions, 0);
  const freqRatio = safeNumber(signals.frequency_ratio, 0);

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

  const scoringBreakdown = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Likelihood (L)', value: Math.round(safeNumber(latest.L, 0) * 100) },
      { name: 'Impact (I)', value: Math.round(safeNumber(latest.I, 0) * 100) },
      { name: 'Regulatory (R)', value: Math.round(safeNumber(latest.R, 0) * 100) },
    ];
  }, [latest]);

  const frameworkBreakdownChart = useMemo(() => {
    // backend often sends frameworks like { GDPR: 0.70, EUAI: 1.00, OWASP_AI: 0.60 }
    const gdpr = safeNumber(frameworks.GDPR, 0);
    const euai = safeNumber(frameworks.EUAI, 0);
    const owasp = safeNumber(frameworks.OWASP_AI, 0);

    // show as %
    return [
      { name: 'GDPR', value: Math.round(gdpr * 100) },
      { name: 'EU AI Act', value: Math.round(euai * 100) },
      { name: 'OWASP AI', value: Math.round(owasp * 100) },
    ];
  }, [frameworks]);

  const trendDirection = useMemo(() => {
    if (!trendPoints || trendPoints.length < 2) return 'STABLE';
    const a = safeNumber(trendPoints[trendPoints.length - 2]?.value, 0);
    const b = safeNumber(trendPoints[trendPoints.length - 1]?.value, 0);
    const diff = b - a;

    if (diff > 3) return 'WORSENING';
    if (diff < -3) return 'IMPROVING';
    return 'STABLE';
  }, [trendPoints]);

  const trendBadgeColor = useMemo(() => {
    if (trendDirection === 'WORSENING') return '#dc2626';
    if (trendDirection === 'IMPROVING') return '#10b981';
    return '#6b7280';
  }, [trendDirection]);

  const controlsBox = {
    border: '2px solid #e5e7eb',
    padding: '14px 16px',
    marginBottom: '24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
  };

  const leftControls = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  };

  const rightControls = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  };

  const selectStyle = {
    border: '2px solid #e5e7eb',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#111827',
    background: '#ffffff',
    outline: 'none',
    minWidth: 260,
  } as const;

  const btn = {
    border: '2px solid #e5e7eb',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 900,
    color: '#111827',
    background: '#ffffff',
    cursor: 'pointer',
  } as const;

  const statusBadge = (text: string, color: string) => ({
    border: `2px solid ${color}`,
    color,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'inline-block',
  });

  const safeTitle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word',
  };

  const safeSub: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  };

  /* =========================
     STATES
  ========================= */

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>Loading enterprise bias posture…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>
            Monitor fairness risk, discrimination exposure, and compliance pressure across audited models.
          </p>
        </div>

        {/* Controls */}
        <div style={controlsBox}>
          <div style={leftControls}>
            <select
              style={selectStyle}
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={modelsLoading}
            >
              <option value="">
                {modelsLoading ? 'Loading models…' : 'All Models (Global View)'}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.model_id}>
                  {m.name} ({m.model_id})
                </option>
              ))}
            </select>

            <span style={statusBadge('ERROR', '#dc2626')}>ERROR</span>
          </div>

          <div style={rightControls}>
            <button style={btn} onClick={() => loadBias(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>
            Failed to load bias metrics
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 6, lineHeight: 1.5 }}>
            {error}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#7f1d1d' }}>
            Tip: If you enabled model filter but backend doesn’t support it yet, remove the model selector query param.
          </div>
        </div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
          <p style={safeSub}>No bias data found yet. Run at least one audit to populate this page.</p>
        </div>

        <div style={controlsBox}>
          <div style={leftControls}>
            <select
              style={selectStyle}
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={modelsLoading}
            >
              <option value="">
                {modelsLoading ? 'Loading models…' : 'All Models (Global View)'}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.model_id}>
                  {m.name} ({m.model_id})
                </option>
              ))}
            </select>

            <span style={statusBadge('NO DATA', '#6b7280')}>NO DATA</span>
          </div>

          <div style={rightControls}>
            <button style={btn} onClick={() => loadBias(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={safeTitle}>Bias Detection & Fairness Risk</h1>
        <p style={safeSub}>
          Bias risk reflects how likely the model is to generate discriminatory or unfair outputs, weighted by business
          impact and regulatory pressure.
        </p>
      </div>

      {/* Enterprise Controls */}
      <div style={controlsBox}>
        <div style={leftControls}>
          <select
            style={selectStyle}
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            disabled={modelsLoading}
          >
            <option value="">
              {modelsLoading ? 'Loading models…' : 'All Models (Global View)'}
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.model_id}>
                {m.name} ({m.model_id})
              </option>
            ))}
          </select>

          <span style={statusBadge('OK', '#10b981')}>OK</span>

          {lastUpdatedAt && (
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
              Last updated: {new Date(lastUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div style={rightControls}>
          <span style={statusBadge(trendDirection, trendBadgeColor)}>{trendDirection}</span>

          <button style={btn} onClick={() => loadBias(selectedModelId || undefined)}>
            Refresh
          </button>
        </div>
      </div>

      {/* Score Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
          marginBottom: 28,
        }}
      >
        <MetricCard
          title="Bias Risk Score"
          value={`${Math.round(safeNumber(latest.score_100, 0))}/100`}
          color={bandClr}
          description="Executive risk score (0–100). Higher score means higher fairness risk."
        />

        <MetricCard
          title="Risk Band"
          value={band}
          color={bandClr}
          description="Board-level severity label used in governance and audit reporting."
        />

        <MetricCard
          title="Signals Observed"
          value={findingCount}
          color="#111827"
          description="Total bias-related findings detected in the latest audit window."
        />

        <MetricCard
          title="Coverage"
          value={`${interactionCount} checks`}
          color="#3b82f6"
          description="Number of prompt/response interactions reviewed for this score."
        />
      </div>

      {/* Executive Context */}
      <div style={{ border: '2px solid #e5e7eb', padding: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 8 }}>
          What this means
        </div>

        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          This page highlights whether the model may generate outputs that create discrimination exposure, reputational
          risk, or governance issues.
          <br />
          <b>Likelihood (L)</b> shows how often bias signals appear.
          <br />
          <b>Impact (I)</b> captures real-world consequences if bias reaches users.
          <br />
          <b>Regulatory weight (R)</b> reflects legal and compliance pressure.
          <br />
          <span style={{ display: 'inline-block', marginTop: 8 }}>
            Frequency ratio (latest): <b>{Math.round(freqRatio * 10000) / 100}%</b>
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div>
          <h2 style={sectionTitle}>Scoring Breakdown (L / I / R)</h2>
          <div style={chartBox}>
            <PieChart
              data={scoringBreakdown}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Bias Scoring Breakdown"
            />
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>Bias Risk Trend (Last 10 Audits)</h2>
          <div style={chartBox}>
            <BarChart data={trendBucketData} color={bandClr} title="Bias Score Trend (0–100)" />
          </div>
        </div>
      </div>

      {/* Framework Breakdown + Quick Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
        <div>
          <h2 style={sectionTitle}>Framework Pressure (Regulatory Coverage)</h2>
          <div style={chartBox}>
            <PieChart
              data={frameworkBreakdownChart}
              colors={['#111827', '#3b82f6', '#10b981']}
              title="Governance Coverage (Relative)"
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            These values indicate how strongly governance frameworks apply to bias risk, not legal compliance by itself.
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>Recommended Actions (Non-technical)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 18 }}>
            <ActionItem
              title="Reduce harmful generalizations"
              text="Add safe completion rules for protected-group statements. Encourage neutral, factual framing."
            />
            <ActionItem
              title="Use refusal + reframe where needed"
              text="If prompts request discriminatory reasoning, the model should refuse and provide a fair alternative explanation."
            />
            <ActionItem
              title="Audit high-risk use-cases"
              text="Prioritize hiring, lending, education, and healthcare workflows, where bias risk has highest business impact."
            />
            <ActionItem
              title="Re-run audits after mitigation"
              text="After prompt / policy changes, re-run audits to validate that fairness posture is improving."
            />
          </div>
        </div>
      </div>

      {/* Audit history table */}
      <div style={{ marginBottom: 48 }}>
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
              {trend
                .slice()
                .reverse()
                .map((row, idx) => {
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
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {String(row.band || 'LOW')}
                        </span>
                      </td>
                      <td style={tdMuted}>{pct01(row.L)}</td>
                      <td style={tdMuted}>{pct01(row.I)}</td>
                      <td style={tdMuted}>{pct01(row.R)}</td>
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

/* =========================
   SMALL COMPONENTS
========================= */

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
    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 22, overflow: 'hidden' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
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

function ActionItem({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const chartBox = {
  background: '#ffffff',
  border: '2px solid #e5e7eb',
  padding: 24,
  overflow: 'hidden' as const,
};

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
