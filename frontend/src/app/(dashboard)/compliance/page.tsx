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

  frameworks?: any;
  signals?: any;
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

type ModelComplianceRow = {
  model_id: string;
  model_name: string;
  score_100: number;
  band: string;
  executed_at?: string | null;
};

function bandColor(band: string) {
  const b = String(band || '').toUpperCase();
  if (b === 'CRITICAL') return '#dc2626';
  if (b === 'SEVERE') return '#f97316';
  if (b === 'HIGH') return '#f59e0b';
  if (b === 'MODERATE') return '#3b82f6';
  return '#10b981';
}

function exposureFromScore(score100: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score100 >= 75) return 'HIGH';
  if (score100 >= 45) return 'MEDIUM';
  return 'LOW';
}

function exposureColor(exposure: string) {
  const e = String(exposure || '').toUpperCase();
  if (e === 'LOW') return '#10b981';
  if (e === 'MEDIUM') return '#f59e0b';
  if (e === 'HIGH') return '#ef4444';
  return '#6b7280';
}

function safeDateLabel(executedAt: string | null | undefined, fallback: string) {
  if (!executedAt) return fallback;
  try {
    return new Date(executedAt).toLocaleDateString();
  } catch {
    return fallback;
  }
}

function normalizeFrameworkList(frameworks: any): string[] {
  if (!frameworks) return [];
  if (Array.isArray(frameworks)) return frameworks.map(String);
  if (typeof frameworks === 'object') return Object.keys(frameworks).map(String);
  return [String(frameworks)];
}

export default function CompliancePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const [payload, setPayload] = useState<MetricApiResponse | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [modelRatings, setModelRatings] = useState<ModelComplianceRow[]>([]);
  const [modelRatingsError, setModelRatingsError] = useState<string | null>(null);

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

  async function loadCompliance(modelId?: string) {
    try {
      setLoading(true);
      setError(null);

      const qp = modelId ? `?model_id=${encodeURIComponent(modelId)}` : '';
      const data = await apiGet<MetricApiResponse>(`/metrics/compliance${qp}`);

      setPayload(data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance metrics');
    } finally {
      setLoading(false);
    }
  }

  async function loadComplianceLeaderboard(currentModels: ModelRow[]) {
    try {
      setLeaderboardLoading(true);
      setModelRatingsError(null);

      if (!Array.isArray(currentModels) || currentModels.length === 0) {
        setModelRatings([]);
        return;
      }

      const results = await Promise.all(
        currentModels.map(async (m) => {
          try {
            const qp = `?model_id=${encodeURIComponent(m.model_id)}`;
            const resp = await apiGet<MetricApiResponse>(`/metrics/compliance${qp}`);
            const latest = resp?.scoring?.latest;

            if (!resp?.scoring || resp.scoring.status === 'NO_DATA' || !latest) return null;

            const score = safeNumber(latest.score_100, 0);
            const band = String(latest.band || 'LOW').toUpperCase();

            return {
              model_id: m.model_id,
              model_name: m.name,
              score_100: score,
              band,
              executed_at: latest.executed_at || null,
            } satisfies ModelComplianceRow;
          } catch {
            return null;
          }
        })
      );

      const cleaned = results.filter(Boolean) as ModelComplianceRow[];
      cleaned.sort((a, b) => b.score_100 - a.score_100);

      setModelRatings(cleaned);
    } catch (err: any) {
      setModelRatings([]);
      setModelRatingsError(err?.message || 'Failed to build model compliance leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    loadModels();
  }, []);

  // Load compliance metric when model selection changes
  useEffect(() => {
    loadCompliance(selectedModelId || undefined);
  }, [selectedModelId]);

  // Build leaderboard AFTER models load
  useEffect(() => {
    if (!modelsLoading && models.length > 0) {
      loadComplianceLeaderboard(models);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoading]);

  const scoring = payload?.scoring;
  const latest = scoring?.latest || null;
  const trend = Array.isArray(scoring?.trend) ? scoring?.trend : [];

  const score100 = Math.round(safeNumber(latest?.score_100, 0));
  const band = String(latest?.band || 'LOW').toUpperCase();
  const bandClr = bandColor(band);

  const regulatoryExposure = exposureFromScore(score100);
  const regulatoryExposureClr = exposureColor(regulatoryExposure);

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

  const frameworksList = useMemo(() => normalizeFrameworkList(latest?.frameworks), [latest?.frameworks]);

  const regulationCoverage = useMemo(() => {
    const score = score100;

    const defaultRegs = [
      { regulation: 'EU AI Act', hint: 'AI governance + risk classification' },
      { regulation: 'GDPR', hint: 'Privacy and data processing obligations' },
      { regulation: 'DPDP (India)', hint: 'India data protection requirements' },
      { regulation: 'ISO/IEC 42001', hint: 'AI management system governance' },
      { regulation: 'SOC 2', hint: 'Security controls & audit readiness' },
      { regulation: 'HIPAA', hint: 'Healthcare privacy baseline' },
    ];

    const lower = frameworksList.map((x) => x.toLowerCase());

    const isCovered = (regName: string) => {
      const r = regName.toLowerCase();
      if (r.includes('eu ai act')) return lower.some((x) => x.includes('eu') || x.includes('ai act'));
      if (r.includes('gdpr')) return lower.some((x) => x.includes('gdpr'));
      if (r.includes('dpdp')) return lower.some((x) => x.includes('dpdp') || x.includes('india'));
      if (r.includes('42001')) return lower.some((x) => x.includes('42001') || x.includes('iso'));
      if (r.includes('soc 2')) return lower.some((x) => x.includes('soc'));
      if (r.includes('hipaa')) return lower.some((x) => x.includes('hipaa'));
      return false;
    };

    const derivedCoverage = (covered: boolean) => {
      if (!covered) return 0;
      const inverted = 100 - score; // higher risk => lower coverage (executive approximation)
      const c = Math.max(35, Math.min(95, inverted));
      return Math.round(c);
    };

    const coverageColor = (coverage: number) => {
      if (coverage >= 80) return '#10b981';
      if (coverage >= 60) return '#3b82f6';
      if (coverage >= 40) return '#f59e0b';
      return '#ef4444';
    };

    return defaultRegs.map((reg) => {
      const covered = isCovered(reg.regulation);
      const coverage = derivedCoverage(covered);
      return {
        regulation: reg.regulation,
        coverage,
        color: coverageColor(coverage),
        covered,
        hint: reg.hint,
      };
    });
  }, [frameworksList, score100]);

  const derivedViolationsEstimate = useMemo(() => {
    const r = safeNumber(latest?.R, 0);
    const base = Math.round((score100 / 100) * 18);
    const factor = Math.max(0.6, Math.min(1.6, 0.8 + r));
    return Math.max(0, Math.round(base * factor));
  }, [score100, latest?.R]);

  const violationsBySeverity = useMemo(() => {
    const total = derivedViolationsEstimate;
    const critical = Math.round(total * 0.15);
    const high = Math.round(total * 0.30);
    const medium = Math.round(total * 0.35);
    const low = Math.max(0, total - critical - high - medium);

    return [
      { severity: 'Critical', count: critical, color: '#dc2626' },
      { severity: 'High', count: high, color: '#f97316' },
      { severity: 'Medium', count: medium, color: '#fbbf24' },
      { severity: 'Low', count: low, color: '#84cc16' },
    ];
  }, [derivedViolationsEstimate]);

  const modelsAtRiskCount = useMemo(() => {
    return modelRatings.filter((x) => x.score_100 >= 60).length;
  }, [modelRatings]);

  // UI states (NO early returns → hook order always stable)
  const hasNoData = !scoring || scoring.status === 'NO_DATA' || !latest;
  const showError = Boolean(error);
  const showLoading = Boolean(loading);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={safeTitle}>Compliance</h1>
        <p style={safeSub}>Regulatory compliance monitoring and risk assessment</p>
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
              {modelsLoading ? 'Loading models...' : 'All Models (Global View)'}
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.model_id}>
                {m.name} ({m.model_id})
              </option>
            ))}
          </select>

          {showError ? (
            <span style={statusBadge('ERROR', '#dc2626')}>ERROR</span>
          ) : hasNoData ? (
            <span style={statusBadge('NO DATA', '#6b7280')}>NO DATA</span>
          ) : showLoading ? (
            <span style={statusBadge('LOADING', '#3b82f6')}>LOADING</span>
          ) : (
            <span style={statusBadge('OK', '#10b981')}>OK</span>
          )}

          {lastUpdatedAt && (
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
              Last updated: {new Date(lastUpdatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div style={rightControls}>
          <button style={btn} onClick={() => loadCompliance(selectedModelId || undefined)}>
            Refresh
          </button>

          <button style={btnPrimary} onClick={() => loadComplianceLeaderboard(models)}>
            {leaderboardLoading ? 'Refreshing...' : 'Refresh Model Ratings'}
          </button>
        </div>
      </div>

      {/* Error Panel */}
      {showError && (
        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
            Failed to load compliance metrics
          </div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', lineHeight: 1.5 }}>
            {error}
          </div>
        </div>
      )}

      {/* No Data Panel */}
      {!showError && hasNoData && (
        <div style={{ border: '2px solid #e5e7eb', padding: '18px', marginBottom: '24px' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
            No compliance scoring data yet
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>
            Run an audit to populate compliance risk scoring and model ratings.
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showError && !hasNoData && (
        <>
          {/* Top Metrics (Intended UI style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '38px' }}>
            <MetricCard
              title="Compliance Coverage Score"
              value={`${Math.round(Math.max(0, Math.min(100, 100 - score100)))}%`}
              color="#10b981"
              subtitle="“How compliant are we right now?” (derived from risk score)"
            />

            <MetricCard
              title="Regulatory Exposure Score"
              value={regulatoryExposure}
              color={regulatoryExposureClr}
              subtitle="“How much legal risk do we face?”"
            />

            <MetricCard
              title="Models at Compliance Risk"
              value={String(modelsAtRiskCount || 0)}
              color="#ef4444"
              subtitle="Models requiring immediate attention"
            />
          </div>

          {/* Executive Summary */}
          <div style={{ border: '2px solid #e5e7eb', padding: '18px', marginBottom: '38px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 8 }}>
              Executive Summary (CISO View)
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>
              This page tracks compliance posture across major global frameworks. The <b>risk score</b> reflects
              the likelihood of policy violations, business impact, and regulatory sensitivity.
              <br />
              Scoring basis: <b>S = (L^α × I^β) × R</b>.
              <br />
              <span style={{ display: 'inline-block', marginTop: 8 }}>
                <b>Latest Model:</b> {latest?.model_name || latest?.model_id || '-'} &nbsp;•&nbsp;{' '}
                <b>Band:</b>{' '}
                <span style={{ color: bandClr, fontWeight: 900 }}>{band}</span>
                &nbsp;•&nbsp; <b>Score:</b> {score100}/100
              </span>
            </div>
          </div>

          {/* Coverage by Regulation */}
          <div style={{ marginBottom: '42px' }}>
            <h2 style={sectionTitle}>Coverage by Regulation</h2>

            <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 14, lineHeight: 1.4 }}>
                Coverage is shown as an <b>executive approximation</b> until backend returns per-regulation scoring.
                <br />
                Backend frameworks seen:{' '}
                <b>{frameworksList.length > 0 ? frameworksList.join(', ') : 'Not available yet'}</b>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thStyle}>Regulation</th>
                    <th style={thStyle}>Coverage</th>
                    <th style={thStyle}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {regulationCoverage.map((item, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: index < regulationCoverage.length - 1 ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {item.regulation}
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginTop: 4 }}>
                          {item.hint}
                        </div>
                      </td>

                      <td style={{ padding: '16px', fontSize: '18px', fontWeight: '900', color: item.color }}>
                        {item.covered ? `${item.coverage}%` : 'Not available yet'}
                      </td>

                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            width: '100%',
                            background: '#f3f4f6',
                            height: '24px',
                            position: 'relative',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <div
                            style={{
                              width: `${item.coverage}%`,
                              background: item.covered ? item.color : '#e5e7eb',
                              height: '100%',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        {!item.covered && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, fontWeight: 700 }}>
                            Requires backend per-regulation mapping
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breakdown + Trend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '42px' }}>
            <div>
              <h2 style={sectionTitle}>Scoring Breakdown (L / I / R)</h2>
              <div style={{ border: '2px solid #e5e7eb', padding: '24px' }}>
                <PieChart
                  data={breakdownData}
                  colors={['#3b82f6', '#f59e0b', '#dc2626']}
                  title="Compliance Scoring Breakdown"
                />
              </div>
            </div>

            <div>
              <h2 style={sectionTitle}>Compliance Trend (Last 10 Audits)</h2>
              <div style={{ border: '2px solid #e5e7eb', padding: '24px' }}>
                <BarChart data={trendBucketData} color={bandClr} title="Compliance Trend (0–100)" />
              </div>
            </div>
          </div>

          {/* Model Ratings */}
          <div style={{ marginBottom: '42px' }}>
            <h2 style={sectionTitle}>Model Compliance Ratings (Across All Models)</h2>

            <div style={{ border: '2px solid #e5e7eb', padding: '18px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Higher score = higher compliance risk (executive posture indicator).<br />
                <span style={{ fontWeight: 900 }}>
                  {leaderboardLoading ? 'Refreshing ratings...' : `Models scored: ${modelRatings.length}`}
                </span>
              </div>

              {modelRatingsError && (
                <div style={{ marginTop: 10, background: '#fef2f2', border: '2px solid #fca5a5', padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#991b1b' }}>
                    Failed to load ratings
                  </div>
                  <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 6 }}>{modelRatingsError}</div>
                </div>
              )}
            </div>

            <div style={{ border: '2px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thStyle}>Rank</th>
                    <th style={thStyle}>Model</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Band</th>
                    <th style={thStyle}>Last Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRatings.length === 0 ? (
                    <tr>
                      <td style={tdMuted} colSpan={5}>
                        No model compliance data available yet. Run audits for each model.
                      </td>
                    </tr>
                  ) : (
                    modelRatings.map((r, idx) => {
                      const c = bandColor(r.band);
                      return (
                        <tr key={`${r.model_id}_${idx}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={tdStrong}>#{idx + 1}</td>
                          <td style={tdMuted}>
                            <div style={{ fontWeight: 900, color: '#111827' }}>{r.model_name}</div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{r.model_id}</div>
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
                                display: 'inline-block',
                              }}
                            >
                              {r.band}
                            </span>
                          </td>
                          <td style={tdMuted}>
                            {r.executed_at ? new Date(r.executed_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Violations (Derived) */}
          <div style={{ marginBottom: '42px' }}>
            <h2 style={sectionTitle}>Compliance Violations</h2>

            <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                <div style={{ fontSize: '64px', fontWeight: '900', color: '#ef4444', lineHeight: '1', marginBottom: '12px' }}>
                  {derivedViolationsEstimate}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '700' }}>
                  estimated violations (derived)
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
                  Exact violation counts require backend violation breakdown (Not available yet)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {violationsBySeverity.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#ffffff',
                      border: `2px solid ${item.color}`,
                      padding: '20px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <div style={{ width: '12px', height: '12px', background: item.color, marginRight: '8px' }} />
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '900',
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {item.severity}
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: item.color, lineHeight: '1' }}>
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div style={{ marginBottom: 48 }}>
            <h2 style={sectionTitle}>Audit History (Compliance)</h2>

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
                  {trend.length === 0 ? (
                    <tr>
                      <td style={tdMuted} colSpan={4}>
                        No audit history available yet.
                      </td>
                    </tr>
                  ) : (
                    trend
                      .slice()
                      .reverse()
                      .map((r, i) => {
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
                                  display: 'inline-block',
                                }}
                              >
                                {String(r.band || 'LOW')}
                              </span>
                            </td>
                            <td style={tdMuted}>{r.model_name || r.model_id || '-'}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommended Actions */}
          <div style={{ marginBottom: 48 }}>
            <h2 style={sectionTitle}>Recommended Actions</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <ActionCard
                title="Prioritize high-exposure models"
                text="Focus remediation on models with HIGH regulatory exposure and recurring high-risk trend."
              />
              <ActionCard
                title="Enable per-regulation compliance scoring"
                text="Extend backend scoring to compute coverage by EU AI Act, GDPR, DPDP, ISO 42001 for evidence-ready reporting."
              />
              <ActionCard
                title="Operationalize compliance gates"
                text="Add policy gates: block production deployment for HIGH/SEVERE/CRITICAL without leadership sign-off."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', padding: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: '900', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ fontSize: '48px', fontWeight: '900', color, lineHeight: '1', marginBottom: '8px' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ActionCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ border: '2px solid #e5e7eb', padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

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

const btnPrimary = {
  border: '2px solid #111827',
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 900,
  color: '#ffffff',
  background: '#111827',
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
  fontWeight: '900',
  color: '#111827',
};

const tdMuted = {
  padding: '14px 16px',
  fontSize: '13px',
  color: '#6b7280',
};
