'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

type Model = {
    id: number;
    model_id: string;
    name: string;
    version?: string;
};

type Audit = {
    audit_id: string;
    audit_result: string;
    executed_at: string;
};

type Finding = {
    finding_id: string;
    category: string;
    severity: string;
    metric_name: string;
    description: string;
    explain?: {
        title?: string;
        simple_definition?: string;
        why_it_matters?: string;
        business_impact?: string[];
    };
    remediation?: {
        priority?: string;
        recommended_owner?: string;
        fix_steps?: string[];
    };
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function ExecutiveReportsPage() {
    const router = useRouter();

    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [audits, setAudits] = useState<Audit[]>([]);
    const [selectedAuditId, setSelectedAuditId] = useState<string>('');

    const [findings, setFindings] = useState<Finding[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);
    const [loadingAudits, setLoadingAudits] = useState(false);
    const [loadingFindings, setLoadingFindings] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchModels() {
        try {
            setLoadingModels(true);
            setError(null);

            const res = await fetch(`${API_BASE}/models`);
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            setModels(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setModels([]);
            setError(e?.message || 'Failed to load models');
        } finally {
            setLoadingModels(false);
        }
    }

    async function fetchAudits(modelId: string) {
        if (!modelId) {
            setAudits([]);
            setSelectedAuditId('');
            return;
        }

        try {
            setLoadingAudits(true);
            setError(null);

            const res = await fetch(`${API_BASE}/audits/model/${modelId}/recent`);
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setAudits(list);

            // Default select the latest audit if available
            if (list.length > 0) {
                setSelectedAuditId(list[0].audit_id);
            } else {
                setSelectedAuditId('');
            }
        } catch (e: any) {
            setAudits([]);
            setSelectedAuditId('');
            setError(e?.message || 'Failed to load audits');
        } finally {
            setLoadingAudits(false);
        }
    }

    async function fetchFindings(auditId: string) {
        if (!auditId) {
            setFindings([]);
            return;
        }

        try {
            setLoadingFindings(true);
            setError(null);

            const res = await fetch(`${API_BASE}/audits/${auditId}/findings`);
            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            setFindings(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setFindings([]);
            setError(e?.message || 'Failed to load findings');
        } finally {
            setLoadingFindings(false);
        }
    }

    useEffect(() => {
        fetchModels();
    }, []);

    useEffect(() => {
        if (selectedModel) fetchAudits(selectedModel);
    }, [selectedModel]);

    useEffect(() => {
        if (selectedAuditId) fetchFindings(selectedAuditId);
    }, [selectedAuditId]);

    const countsBySeverity = useMemo(() => {
        const map: Record<string, number> = {};
        for (const s of SEVERITY_ORDER) map[s] = 0;

        for (const f of findings) {
            const sev = (f.severity || '').toUpperCase();
            map[sev] = (map[sev] || 0) + 1;
        }
        return map;
    }, [findings]);

    const countsByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        for (const f of findings) {
            const cat = (f.category || 'unknown').toUpperCase();
            map[cat] = (map[cat] || 0) + 1;
        }
        return map;
    }, [findings]);

    const executiveRiskSummary = useMemo(() => {
        // Simple executive scoring: weighted severity counts
        const score =
            countsBySeverity.CRITICAL * 10 +
            countsBySeverity.HIGH * 6 +
            countsBySeverity.MEDIUM * 3 +
            countsBySeverity.LOW * 1;

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (score >= 35) riskLevel = 'HIGH';
        else if (score >= 15) riskLevel = 'MEDIUM';

        return { score, riskLevel };
    }, [countsBySeverity]);

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', padding: 0 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                    Executive Reports
                </h1>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                    Business-ready AI risk reporting with impact, explanation, and clear remediation actions.
                </p>
            </div>

            {/* Controls */}
            <div style={panel}>
                <div style={panelTitle}>Report Controls</div>

                <div style={grid2}>
                    <div>
                        <label style={label}>Select Model</label>
                        <select
                            style={input}
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={loadingModels}
                        >
                            <option value="">{loadingModels ? 'Loading models...' : 'Choose a model'}</option>
                            {models.map((m) => (
                                <option key={m.id} value={m.model_id}>
                                    {m.name} ({m.model_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={label}>Select Audit</label>
                        <select
                            style={input}
                            value={selectedAuditId}
                            onChange={(e) => setSelectedAuditId(e.target.value)}
                            disabled={!selectedModel || loadingAudits}
                        >
                            <option value="">
                                {!selectedModel
                                    ? 'Select model first'
                                    : loadingAudits
                                        ? 'Loading audits...'
                                        : 'Choose an audit'}
                            </option>

                            {audits.map((a) => (
                                <option key={a.audit_id} value={a.audit_id}>
                                    {a.audit_id} — {new Date(a.executed_at).toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        style={btnOutline}
                        onClick={() => router.push('/reports')}
                    >
                        Go to Audits Page
                    </button>

                    <button
                        style={selectedAuditId ? btnOutline : btnDisabled}
                        disabled={!selectedAuditId}
                        onClick={() => window.open(`${API_BASE}/audits/${selectedAuditId}/download`, '_blank')}
                    >
                        Download JSON
                    </button>

                    <button
                        style={selectedAuditId ? btnPrimary : btnDisabledPrimary}
                        disabled={!selectedAuditId}
                        onClick={() => window.open(`${API_BASE}/audits/${selectedAuditId}/download-pdf`, '_blank')}
                    >
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && <div style={boxError}>{error}</div>}

            {/* Loading */}
            {loadingFindings ? (
                <div style={boxMuted}>Loading executive findings...</div>
            ) : !selectedAuditId ? (
                <div style={boxMuted}>Select a model and audit to view executive reporting.</div>
            ) : (
                <>
                    {/* Executive Summary */}
                    <div style={{ marginTop: 18 }}>
                        <div style={sectionHeader}>Executive Summary</div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            <div style={metricCard}>
                                <div style={metricLabel}>Risk Score</div>
                                <div style={metricValue}>{executiveRiskSummary.score}</div>
                            </div>

                            <div style={metricCard}>
                                <div style={metricLabel}>Risk Level</div>
                                <div style={{ ...metricValue, color: riskColor(executiveRiskSummary.riskLevel) }}>
                                    {executiveRiskSummary.riskLevel}
                                </div>
                            </div>

                            <div style={metricCard}>
                                <div style={metricLabel}>Total Findings</div>
                                <div style={metricValue}>{findings.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Severity Breakdown */}
                    <div style={{ marginTop: 18 }}>
                        <div style={sectionHeader}>Severity Breakdown</div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {SEVERITY_ORDER.map((s) => (
                                <div key={s} style={severityCard(s)}>
                                    <div style={metricLabel}>{s}</div>
                                    <div style={metricValue}>{countsBySeverity[s]}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div style={{ marginTop: 18 }}>
                        <div style={sectionHeader}>Risk Areas</div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                            {Object.entries(countsByCategory).map(([cat, count]) => (
                                <div key={cat} style={metricCard}>
                                    <div style={metricLabel}>{cat}</div>
                                    <div style={metricValue}>{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Findings */}
                    <div style={{ marginTop: 18 }}>
                        <div style={sectionHeader}>Findings With Explanation and Remediation</div>

                        {findings.length === 0 ? (
                            <div style={boxMuted}>No findings available for this audit.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 14 }}>
                                {findings.map((f) => (
                                    <div key={f.finding_id} style={findingCard}>
                                        <div style={findingTopRow}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={findingId}>{f.finding_id}</div>
                                                <div style={chipRow}>
                                                    <span style={chipNeutral}>{(f.category || '').toUpperCase()}</span>
                                                    <span style={chipSeverity(f.severity)}>
                                                        {(f.severity || '').toUpperCase()}
                                                    </span>
                                                    <span style={chipNeutral}>{f.metric_name}</span>
                                                </div>
                                            </div>

                                            <div style={rightMetaBox}>
                                                <div style={rightMetaItem}>
                                                    <div style={rightMetaLabel}>Owner</div>
                                                    <div style={rightMetaValue}>
                                                        {f.remediation?.recommended_owner || 'Engineering'}
                                                    </div>
                                                </div>
                                                <div style={rightMetaItem}>
                                                    <div style={rightMetaLabel}>Priority</div>
                                                    <div style={rightMetaValue}>{f.remediation?.priority || 'STANDARD'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={block}>
                                            <div style={blockTitle}>Issue</div>
                                            <div style={blockText}>{f.description}</div>
                                        </div>

                                        <div style={grid2Tight}>
                                            <div style={block}>
                                                <div style={blockTitle}>What it means</div>
                                                <div style={blockText}>
                                                    {f.explain?.simple_definition || 'Not available.'}
                                                </div>
                                            </div>

                                            <div style={block}>
                                                <div style={blockTitle}>Why it matters</div>
                                                <div style={blockText}>
                                                    {f.explain?.why_it_matters || 'Not available.'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={block}>
                                            <div style={blockTitle}>What to do next</div>

                                            {(f.remediation?.fix_steps || []).length === 0 ? (
                                                <div style={blockText}>No remediation steps available.</div>
                                            ) : (
                                                <ol style={stepsList}>
                                                    {f.remediation?.fix_steps?.slice(0, 10).map((s, i) => (
                                                        <li key={i} style={stepItem}>
                                                            {s}
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/* ============================
   Styles
============================ */

const panel = {
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    padding: 18,
} as const;

const panelTitle = {
    fontSize: 14,
    fontWeight: 800,
    color: '#111827',
    marginBottom: 14,
} as const;

const sectionHeader = {
    fontSize: 18,
    fontWeight: 800,
    color: '#111827',
    marginBottom: 12,
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: 10,
} as const;

const label = {
    fontSize: 12,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
    display: 'block',
} as const;

const input = {
    width: '100%',
    padding: 12,
    border: '2px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
} as const;

const grid2 = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
} as const;

const grid2Tight = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 12,
} as const;

const btnOutline = {
    border: '2px solid #e5e7eb',
    background: '#ffffff',
    color: '#111827',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
} as const;

const btnPrimary = {
    border: '2px solid #111827',
    background: '#111827',
    color: '#ffffff',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
} as const;

const btnDisabled = {
    border: '2px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'not-allowed',
} as const;

const btnDisabledPrimary = {
    border: '2px solid #e5e7eb',
    background: '#f3f4f6',
    color: '#9ca3af',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'not-allowed',
} as const;

const boxMuted = {
    border: '2px solid #e5e7eb',
    padding: 18,
    color: '#6b7280',
    fontSize: 14,
    marginTop: 14,
} as const;

const boxError = {
    border: '2px solid #fecaca',
    background: '#fef2f2',
    padding: 18,
    color: '#991b1b',
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: 'pre-wrap' as const,
    marginTop: 14,
} as const;

const metricCard = {
    border: '2px solid #e5e7eb',
    padding: 14,
} as const;

const metricLabel = {
    fontSize: 12,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 10,
} as const;

const metricValue = {
    fontSize: 28,
    fontWeight: 900,
    color: '#111827',
    lineHeight: 1,
} as const;

const severityCard = (sev: string) => {
    const s = sev.toUpperCase();
    let border = '#e5e7eb';
    let bg = '#ffffff';

    if (s === 'CRITICAL') {
        border = '#fecaca';
        bg = '#fef2f2';
    } else if (s === 'HIGH') {
        border = '#fed7aa';
        bg = '#fff7ed';
    } else if (s === 'MEDIUM') {
        border = '#fde68a';
        bg = '#fffbeb';
    } else if (s === 'LOW') {
        border = '#bbf7d0';
        bg = '#f0fdf4';
    }

    return {
        border: `2px solid ${border}`,
        background: bg,
        padding: 14,
    } as const;
};

function riskColor(level: 'LOW' | 'MEDIUM' | 'HIGH') {
    if (level === 'HIGH') return '#991b1b';
    if (level === 'MEDIUM') return '#92400e';
    return '#166534';
}

const findingCard = {
    border: '2px solid #e5e7eb',
    padding: 18,
    background: '#ffffff',
} as const;

const findingTopRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap' as const,
} as const;

const findingId = {
    fontSize: 14,
    fontWeight: 900,
    color: '#111827',
    wordBreak: 'break-word' as const,
    marginBottom: 8,
} as const;

const chipRow = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
} as const;

const chipNeutral = {
    display: 'inline-block',
    padding: '6px 10px',
    border: '2px solid #e5e7eb',
    background: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    color: '#111827',
} as const;

const chipSeverity = (sev: string) => {
    const s = (sev || '').toUpperCase();
    let bg = '#e5e7eb';
    let border = '#e5e7eb';
    let color = '#111827';

    if (s === 'CRITICAL') {
        bg = '#fee2e2';
        border = '#fecaca';
        color = '#991b1b';
    } else if (s === 'HIGH') {
        bg = '#ffedd5';
        border = '#fed7aa';
        color = '#9a3412';
    } else if (s === 'MEDIUM') {
        bg = '#fef3c7';
        border = '#fde68a';
        color = '#92400e';
    } else if (s === 'LOW') {
        bg = '#dcfce7';
        border = '#bbf7d0';
        color = '#166534';
    }

    return {
        display: 'inline-block',
        padding: '6px 10px',
        border: `2px solid ${border}`,
        background: bg,
        fontSize: 12,
        fontWeight: 900,
        color,
    } as const;
};

const rightMetaBox = {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end',
} as const;

const rightMetaItem = {
    border: '2px solid #e5e7eb',
    padding: '10px 12px',
    minWidth: 140,
    background: '#ffffff',
} as const;

const rightMetaLabel = {
    fontSize: 11,
    fontWeight: 800,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
} as const;

const rightMetaValue = {
    fontSize: 13,
    fontWeight: 900,
    color: '#111827',
} as const;

const block = {
    border: '2px solid #e5e7eb',
    padding: 14,
    background: '#ffffff',
    marginTop: 12,
} as const;

const blockTitle = {
    fontSize: 12,
    fontWeight: 900,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
} as const;

const blockText = {
    fontSize: 14,
    color: '#111827',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
} as const;

const stepsList = {
    margin: 0,
    paddingLeft: 18,
} as const;

const stepItem = {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#111827',
    marginBottom: 6,
} as const;
