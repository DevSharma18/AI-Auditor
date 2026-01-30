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

  // ✅ Live Data Containers
  frameworks?: Record<string, number>;
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

function safeNumberInt(v: any, fallback = 0) {
  return Math.round(safeNumber(v, fallback));
}

// ✅ UTILITY: Converts backend keys like "pii_aadhaar_detected" -> "Aadhaar"
function humanizeSignal(key: string) {
  return key
    .replace(/^pii_/, '')
    .replace(/_detected$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/* =========================
   PAGE COMPONENT
========================= */

export default function PIIPage() {
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetricApiResponse | null>(null);

  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

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

  const trendBucketData = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0) return { oneMonth: [], sixMonths: [], oneYear: [] };
    const points = trend.slice(-10).map((x, idx) => ({
      name: safeDateLabel(x.executed_at, x.audit_id || `audit_${idx + 1}`),
      value: safeNumber(x.score_100, 0),
    }));
    return {
      oneMonth: points.slice(-3),
      sixMonths: points.slice(-6),
      oneYear: points,
    };
  }, [trend]);

  const frameworkBreakdownChart = useMemo(() => {
    // Backend sends these as raw scores (0.0 - 1.0)
    const gdpr = safeNumber(frameworks.GDPR, 0);
    const euai = safeNumber(frameworks.EUAI, 0);
    const dpdp = safeNumber(frameworks.DPDP, 0); // ✅ Live Key

    return [
      { name: 'GDPR Risk', value: Math.round(gdpr * 100) },
      { name: 'EU AI Risk', value: Math.round(euai * 100) },
      { name: 'DPDP Risk', value: Math.round(dpdp * 100) },
    ];
  }, [frameworks]);

  // ✅ LIVE DATA: Dynamic Category List
  // Extracts specific keys like "pii_email_detected" from the signals map
  const categoryList = Object.entries(signals)
    .filter(([k]) => k !== 'finding_count' && k !== 'interactions' && k !== 'frequency_ratio')
    .map(([k, v]) => ({
      label: humanizeSignal(k),
      count: Number(v),
    }))
    .sort((a, b) => b.count - a.count);

  /* =========================
     UI RENDER
  ========================= */

  // State: Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={safeTitle}>PII Monitoring</h1>
          <p style={safeSub}>Loading governance posture...</p>
        </div>
      </div>
    );
  }

  // State: Error
  if (error) {
    return (
      <div style={{ padding: 40, background: '#fef2f2', border: '1px solid #fca5a5' }}>
        <h3 style={{ color: '#991b1b', fontWeight: 900 }}>Failed to load PII metrics</h3>
        <p style={{ color: '#7f1d1d' }}>{error}</p>
        <button style={btn} onClick={() => loadPII(selectedModelId || undefined)}>Retry</button>
      </div>
    );
  }

  // State: No Data
  if (!latest) {
    return (
      <div style={{ padding: 40, border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontWeight: 900 }}>No PII data found.</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>Run a new audit to generate PII signals.</p>
        <button style={btn} onClick={() => loadPII(selectedModelId || undefined)}>Refresh</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
      
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={safeTitle}>PII Monitoring</h1>
        <p style={safeSub}>
          PII risk measures whether an AI system might expose personal data (emails, phone numbers, IDs). 
          High scores indicate potential regulatory violations (GDPR, DPDP).
        </p>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
          Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : '-'}
        </div>
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
              description="Enterprise risk score (0–100). Higher = More PII detected."
            />
          </div>

          <div style={cardBox}>
            <MetricCard
              title="Risk Band"
              value={band}
              color={clr}
              description="Executive label used for governance decisions."
            />
          </div>

          <div style={cardBox}>
            <MetricCard
              title="Coverage (Latest Audit)"
              value={`${interactionCount} prompts`}
              color="#3b82f6"
              description="Number of interactions audited for PII."
            />
          </div>
        </div>

        {/* Signals Row */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div style={cardBox}>
            <MiniMetric title="Signals Observed" value={findingCount} hint="PII findings detected" />
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

      {/* ✅ LIVE DETECTED CATEGORIES */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Categories Table */}
          <div>
            <h2 style={sectionTitle}>Detected PII Categories (Live)</h2>
            <div style={{ border: '2px solid #e5e7eb', background: '#fff' }}>
              {categoryList.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Clean Run ✅</div>
                  <div style={{ fontSize: 13 }}>No PII categories were detected in the latest audit.</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: 12, fontSize: 12 }}>PII Type</th>
                      <th style={{ textAlign: 'right', padding: 12, fontSize: 12 }}>Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryList.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: 12, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                          {row.label}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 900, color: '#ef4444' }}>
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          <div>
            <h2 style={sectionTitle}>Historical PII Risk</h2>
            <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
              <BarChart data={trendBucketData} color={clr} title="PII Risk Trend" />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown & Frameworks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        <div>
          <h2 style={sectionTitle}>Scoring Drivers (L / I / R)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <PieChart
              data={scoringBreakdown}
              colors={['#3b82f6', '#f59e0b', '#dc2626']}
              title="Scoring Breakdown"
            />
          </div>
        </div>

        <div>
          <h2 style={sectionTitle}>Framework Pressure (Risk)</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 24 }}>
            <PieChart
              data={frameworkBreakdownChart}
              colors={['#111827', '#3b82f6', '#10b981']}
              title="Framework Risk Distribution"
            />
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              Shows which regulations (GDPR, EUAI, DPDP) are most at risk based on findings.
            </div>
          </div>
        </div>
      </div>

      {/* Guidance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        <div>
          <h2 style={sectionTitle}>Mitigation Actions</h2>
          <div style={{ border: '2px solid #e5e7eb', padding: 18 }}>
            <ActionItem
              title="Output Redaction"
              text="Implement regex-based redaction filters for Email, Phone, and Aadhaar patterns before returning responses."
            />
            <ActionItem
              title="Input Masking"
              text="Ensure user prompts are scanned for PII (Input Guardrails) before reaching the LLM."
            />
            <ActionItem
              title="Audit Logs"
              text="Verify that your audit logs do not persist unmasked PII. Apply retention policies."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   COMPONENTS
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