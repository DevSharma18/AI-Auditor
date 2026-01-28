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

  // L / I / R in 0..1
  L?: number;
  I?: number;
  R?: number;

  // Your backend often includes these (optional)
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

function safeDateLabel(executedAt: string | null | undefined, auditId?: string) {
  if (!executedAt) return String(auditId || '-');
  try {
    return new Date(executedAt).toLocaleDateString();
  } catch {
    return String(auditId || '-');
  }
}

function pct01(v: any) {
  // backend sends L/I/R in 0..1
  return `${Math.round(safeNumber(v, 0) * 1000) / 10}%`;
}

function safeNumberInt(v: any, fallback = 0) {
  return Math.round(safeNumber(v, fallback));
}

/* =========================
   PAGE
========================= */

export default function PIIPage() {
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

  async function loadPII(modelId?: string) {
    try {
      setLoading(true);
      setError(null);

      // ✅ If backend supports model filter, it will work.
      // If not, it will throw error and we show it cleanly.
      const qp = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
      const data = await apiGet<MetricApiResponse>(`/metrics/pii${qp}`);

      setPayload(data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setPayload(null);
      setError(err?.message || 'Failed to load PII scoring');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    loadPII(selectedModelId || undefined);
  }, [selectedModelId]);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const band = String(latest?.band || 'LOW').toUpperCase();
  const clr = bandColor(band);

  const signals = (latest?.signals || {}) as Record<string, any>;
  const frameworks = (latest?.frameworks || {}) as Record<string, any>;

  const findingCount = safeNumberInt(signals.finding_count, 0);
  const interactionCount = safeNumberInt(signals.interactions, 0);
  const freqRatio = safeNumber(signals.frequency_ratio, 0);

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

  const frameworkBreakdownChart = useMemo(() => {
    const gdpr = safeNumber(frameworks.GDPR, 0);
    const euai = safeNumber(frameworks.EUAI, 0);
    const owasp = safeNumber(frameworks.OWASP_AI, 0);

    return [
      { name: 'GDPR', value: Math.round(gdpr * 100) },
      { name: 'EU AI Act', value: Math.round(euai * 100) },
      { name: 'OWASP AI', value: Math.round(owasp * 100) },
    ];
  }, [frameworks]);

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

  /* =========================
     STATES
  ========================= */

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>PII Monitoring</h1>
          <p style={safeSub}>Loading PII governance posture…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>PII Monitoring</h1>
          <p style={safeSub}>Track and reduce exposure of personally identifiable information in AI outputs.</p>
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
            <button style={btn} onClick={() => loadPII(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>Failed to load PII scoring</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{error}</div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#7f1d1d' }}>
            Tip: If model filtering is not supported in backend yet, selecting a model may error. You can keep global view
            until backend supports <b>?model_id=</b>.
          </div>
        </div>
      </div>
    );
  }

  if (!scoring || scoring.status === 'NO_DATA' || !latest) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>PII Monitoring</h1>
          <p style={safeSub}>No PII scoring available yet. Run at least one audit to populate this page.</p>
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
            <button style={btn} onClick={() => loadPII(selectedModelId || undefined)}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     MAIN UI
  ========================= */

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={safeTitle}>PII Monitoring</h1>
        <p style={safeSub}>
          PII risk measures whether an AI system might expose personal data (emails, phone numbers, IDs). This can create
          direct legal exposure under privacy regulations and data protection standards.
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

          <span style={statusBadge('OK', '#10b981')}>OK</span>

          {lastUpdatedAt && (
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
              Last updated: {new Date(lastUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div style={rightControls}>
          <button style={btn} onClick={() => loadPII(selectedModelId || undefined)}>
            Refresh
          </button>
        </div>
      </div>

      {/* TOP METRICS */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>PII Leakage Overview</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div style={cardBox}>
            <MetricCard
              title="PII Risk Score"
              value={`${Math.round(safeNumber(latest.score_100, 0))}/100`}
              color={clr}
              description="Enterprise risk score (0–100). Higher means higher likelihood of PII exposure."
            />
          </div>

          <div style={cardBox}>
            <MetricCard
              title="Risk Band"
              value={band}
              color={clr}
              description="Executive label used for governance decisions and reporting."
            />
          </div>

          <div style={cardBox}>
            <MetricCard
              title="Coverage (Latest Audit)"
              value={`${interactionCount} checks`}
              color="#3b82f6"
              description="How many prompt/response interactions contributed to this PII score."
            />
          </div>
        </div>

        {/* Signals Row */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div style={cardBox}>
            <MiniMetric title="Signals Observed" value={findingCount} hint="PII-related findings detected" />
          </div>
          <div style={cardBox}>
            <MiniMetric title="Frequency Ratio" value={`${Math.round(freqRatio * 10000) / 100}%`} hint="Density of PII findings" />
          </div>
          <div style={cardBox}>
            <MiniMetric
              title="Latest Model"
              value={latest.model_name || latest.model_id || '-'}
              hint="Model used for the most recent score"
            />
          </div>
        </div>
      </div>

      {/* What counts as PII */}
      <div style={{ border: '2px solid #e5e7eb', padding: 18, marginBottom: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8, color: '#111827' }}>
          What counts as PII (simple)
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>
          PII includes information that can identify a person directly or indirectly:
          <br />
          <b>Email</b>, <b>phone numbers</b>, <b>addresses</b>, <b>government ID numbers</b>, <b>bank details</b>,
          <b>health identifiers</b>, or any unique user-linked identifiers.
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={sectionTitle}>PII Trend & Scoring Drivers</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {/* L/I/R */}
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
            <PieChart
              data={scoringBreakdown}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Scoring Breakdown (L / I / R)"
            />
          </div>

          {/* Trend */}
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
            <BarChart data={trendBucketData} color={clr} title="Trend of PII Leakage (0–100)" />
          </div>

          {/* Framework pressure */}
          <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: 24, overflow: 'hidden' }}>
            <PieChart
              data={frameworkBreakdownChart}
              colors={['#111827', '#3b82f6', '#10b981']}
              title="Framework Pressure (Relative)"
            />
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Indicates governance and regulatory relevance, not legal compliance status.
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        <div>
          <h2 style={sectionTitle}>Most Common Exposure Path (Guidance)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 18 }}>
            <ActionItem
              title="Output leakage (most likely)"
              text="Block sensitive outputs by adding redaction rules. Use a PII filter before returning responses to users."
            />
            <ActionItem
              title="Input leakage"
              text="Mask user-provided identifiers before sending prompts to any model. Store only hashed or tokenized versions."
            />
            <ActionItem
              title="Logs / observability"
              text="Ensure system logs never store raw prompts or model outputs containing personal data. Add retention policies."
            />
            <ActionItem
              title="Re-audit after fixes"
              text="After changing prompts, guardrails, or pipelines, re-run audits to confirm PII risk is reduced."
            />
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>PII Categories (Coming Soon)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 18 }}>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
              Your current backend scoring provides <b>overall PII risk</b> and scoring drivers.
              <br />
              To enable category breakdown like:
              <br />• Contact info (email/phone)
              <br />• Financial (card/bank)
              <br />• Identity docs (passport/ID)
              <br />• Health data
              <br />
              we will add <b>PII type classification per finding</b> in backend and expose it via API.
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: '#111827', fontWeight: 900 }}>
              Next backend enhancement: classify PII type + source attribution per finding
            </div>
          </div>
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

      <div style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1.05, marginTop: 8 }}>{value}</div>

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

function MiniMetric({ title, value, hint }: { title: string; value: any; hint: string }) {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: '#111827', marginTop: 8, lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, lineHeight: 1.5 }}>{hint}</div>
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

const sectionTitle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#1a1a1a',
  marginBottom: '24px',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '12px',
  lineHeight: 1.2,
};

const cardBox = {
  background: '#ffffff',
  border: '2px solid #e5e7eb',
  padding: 0,
};
