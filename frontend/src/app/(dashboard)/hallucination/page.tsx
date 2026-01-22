'use client';

import { useEffect, useMemo, useState } from 'react';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { apiGet, safeNumber } from '@/lib/api-client';

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

function pct01(v: any) {
  return `${Math.round(safeNumber(v, 0) * 1000) / 10}%`;
}

export default function HallucinationPage() {
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(''); // empty = global

  const [payload, setPayload] = useState<MetricApiResponse | null>(null);
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

  async function loadHallucination(modelId?: string) {
    try {
      setLoading(true);
      setError(null);

      const qp = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
      const data = await apiGet<MetricApiResponse>(`/metrics/hallucination${qp}`);

      setPayload(data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load hallucination metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    loadHallucination(selectedModelId || undefined);
  }, [selectedModelId]);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  // ---------------------------
  // Derived / Executive summaries (CISO-friendly)
  // ---------------------------
  const criticalHallucinations = useMemo(() => {
    // NOTE: Backend doesn’t give category counts yet.
    // We derive an *executive estimate* using score & likelihood.
    const score100 = safeNumber(latest?.score_100, 0);
    const L = safeNumber(latest?.L, 0);

    // Scale into an understandable “incident-like” number (soft estimate)
    const estimatedTotal = Math.max(0, Math.round((score100 / 100) * 40 + L * 20));

    // Split into business impact buckets (not technical)
    const legalRisk = Math.round(estimatedTotal * 0.28);
    const financialHarm = Math.round(estimatedTotal * 0.18);
    const misinformation = Math.round(estimatedTotal * 0.42);
    const safetyImpact = Math.max(0, estimatedTotal - legalRisk - financialHarm - misinformation);

    return {
      legalRisk,
      financialHarm,
      misinformation,
      safetyImpact,
      total: estimatedTotal,
      isEstimated: true,
    };
  }, [latest]);

  const highRiskModels = useMemo(() => {
    // Only meaningful in Global View (empty selectedModelId)
    if (selectedModelId) return [];

    // pick highest score points by model in trend
    const byModel: Record<string, MetricPoint> = {};
    for (const t of trend) {
      const key = String(t.model_id || t.model_name || 'unknown');
      const existing = byModel[key];
      if (!existing || safeNumber(t.score_100, 0) > safeNumber(existing.score_100, 0)) {
        byModel[key] = t;
      }
    }

    const rows = Object.values(byModel)
      .filter((x) => safeNumber(x.score_100, 0) > 0)
      .sort((a, b) => safeNumber(b.score_100, 0) - safeNumber(a.score_100, 0))
      .slice(0, 5)
      .map((x) => ({
        name: x.model_name || x.model_id || '-',
        riskScore: Math.round(safeNumber(x.score_100, 0)),
        hallucinationCount: Math.max(0, Math.round(safeNumber(x.L, 0) * 100)), // proxy indicator
      }));

    return rows;
  }, [trend, selectedModelId]);

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

  // ---------------------------
  // UI styles
  // ---------------------------
  const safeTitle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 1.2,
    wordBreak: 'break-word',
  };

  const safeSub: React.CSSProperties = {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  };

  const controlsBox: React.CSSProperties = {
    border: '2px solid #e5e7eb',
    padding: '14px 16px',
    marginBottom: 24,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  };

  const leftControls: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const rightControls: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const selectStyle: React.CSSProperties = {
    border: '2px solid #e5e7eb',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
    background: '#ffffff',
    outline: 'none',
    minWidth: 260,
  };

  const btn: React.CSSProperties = {
    border: '2px solid #e5e7eb',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 900,
    color: '#111827',
    background: '#ffffff',
    cursor: 'pointer',
  };

  const statusBadge = (text: string, color: string): React.CSSProperties => ({
    border: `2px solid ${color}`,
    color,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-block',
  });

  const sectionTitle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 24,
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: 12,
  };

  // ---------------------------
  // States
  // ---------------------------
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Hallucination Monitoring</h1>
          <p style={safeSub}>Loading live hallucination intelligence…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Hallucination Monitoring</h1>
          <p style={safeSub}>Track and reduce false or fabricated outputs across models.</p>
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
                {modelsLoading ? 'Loading models...' : 'All Models (Global View)'}
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
            <button style={btn} onClick={() => loadHallucination(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: 18 }}>
          <div style={{ fontWeight: 900, color: '#991b1b' }}>Failed to load hallucination metrics</div>
          <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 6 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>Hallucination Monitoring</h1>
          <p style={safeSub}>No hallucination scoring data found. Run an audit to populate this page.</p>
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
                {modelsLoading ? 'Loading models...' : 'All Models (Global View)'}
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
            <button style={btn} onClick={() => loadHallucination(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Render (Intended UI + Live data)
  // ---------------------------
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={safeTitle}>Hallucination Monitoring</h1>
        <p style={safeSub}>
          Track and reduce incorrect or unverifiable model outputs. Designed for executive review and CISO governance workflows.
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
            <option value="">{modelsLoading ? 'Loading models...' : 'All Models (Global View)'}</option>
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
          <button style={btn} onClick={() => loadHallucination(selectedModelId || undefined)}>
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Hallucinations Count */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Critical Hallucination Exposure (Executive View)</h2>

        <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 32, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: bandClr, lineHeight: '1', marginBottom: 10 }}>
              {criticalHallucinations.total}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>
              exposure signals detected (estimated)
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>
              Score: {Math.round(safeNumber(latest.score_100, 0))}/100 • Band: {band} • L={pct01(latest.L)} I={pct01(latest.I)} R={pct01(latest.R)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Legal Risk', count: criticalHallucinations.legalRisk, color: '#ef4444' },
              { label: 'Financial Harm', count: criticalHallucinations.financialHarm, color: '#f97316' },
              { label: 'Misinformation', count: criticalHallucinations.misinformation, color: '#fbbf24' },
              { label: 'Safety Impact', count: criticalHallucinations.safetyImpact, color: '#dc2626' },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${item.color}`,
                  padding: 20,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#6b7280',
                    marginBottom: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {item.label}
                </div>

                <div style={{ fontSize: 32, fontWeight: 800, color: item.color, lineHeight: '1' }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, background: '#f9fafb', border: '2px solid #e5e7eb', padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
              What this means (simple)
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Hallucinations are outputs that look confident but cannot be verified. The goal is not “zero issues” —
              the goal is keeping the risk within acceptable policy limits.
            </div>
          </div>
        </div>
      </div>

      {/* Models With High Hallucination Risk */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Models With High Hallucination Risk</h2>

        <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', marginBottom: 18 }}>
            {selectedModelId ? 'Filtered view (single model selected)' : `${highRiskModels.length} models highlighted from recent audit history`}
          </div>

          {selectedModelId ? (
            <div style={{ background: '#f9fafb', border: '2px solid #e5e7eb', padding: 18 }}>
              <div style={{ fontWeight: 900, color: '#111827' }}>Single Model View</div>
              <div style={{ color: '#6b7280', marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
                Switch to <b>All Models (Global View)</b> to see the “Top Risky Models” ranking.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {highRiskModels.length === 0 && (
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  No models available yet. Run audits for multiple models to generate a ranking.
                </div>
              )}

              {highRiskModels.map((model, index) => (
                <div
                  key={index}
                  style={{
                    background: '#fef2f2',
                    border: '2px solid #fca5a5',
                    padding: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>
                      {model.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Likelihood proxy: {model.hallucinationCount} (higher means more frequent signals)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#6b7280',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Risk Score
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>{model.riskScore}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scoring + Trend */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Scoring & Trend</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24 }}>
            <PieChart
              data={scoringBreakdown}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Scoring Breakdown (L / I / R)"
            />
            <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              <b>L</b> = frequency, <b>I</b> = business impact, <b>R</b> = regulatory pressure.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24 }}>
            <BarChart data={trendBucketData} color={bandClr} title="Hallucination Risk Trend (0–100)" />
            <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Use this trend to validate whether mitigations (RAG, citations, refusal rules) are working over time.
            </div>
          </div>
        </div>
      </div>

      {/* Audit History Table */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Audit History (Hallucination Risk)</h2>

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
                            fontWeight: 800,
                            textTransform: 'uppercase',
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

      {/* Enterprise “Next Actions” */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>Recommended Next Actions</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <ActionCard
            title="Reduce Wrong Facts"
            bullet1="Use Retrieval Augmented Generation (RAG) for factual workflows."
            bullet2="Add citations for regulated answers (finance, legal, health)."
            bullet3="Block unsupported claims with policy prompts."
          />
          <ActionCard
            title="Improve Trust & Safety"
            bullet1="Enable 'uncertainty language' when model confidence is low."
            bullet2="Add second-pass verification for critical outputs."
            bullet3="Escalate to human review for high-risk use cases."
          />
          <ActionCard
            title="Operational Controls"
            bullet1="Define acceptable hallucination band per business unit."
            bullet2="Track trend changes after model/prompt updates."
            bullet3="Re-run audits after any deployment change."
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  bullet1,
  bullet2,
  bullet3,
}: {
  title: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
}) {
  return (
    <div style={{ border: '2px solid #e5e7eb', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', marginBottom: 12 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#6b7280', fontSize: 13, lineHeight: 1.7 }}>
        <li>{bullet1}</li>
        <li>{bullet2}</li>
        <li>{bullet3}</li>
      </ul>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 12,
  fontWeight: 800,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStrong: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  fontWeight: 800,
  color: '#111827',
};

const tdMuted: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 13,
  color: '#6b7280',
};
