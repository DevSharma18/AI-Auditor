'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiGetBlob } from '@/lib/api-client';

/* =========================
   TYPES
========================= */

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

/* =========================
   HELPERS
========================= */

type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'RUNNING';
type RiskPosture = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

function parseAuditResult(raw: string): { execution: ExecutionStatus; risk: RiskPosture } {
  const r = String(raw || '').toUpperCase().trim();

  if (r === 'RUNNING') return { execution: 'RUNNING', risk: '—' };
  if (r === 'FAILED') return { execution: 'FAILED', risk: '—' };

  if (r === 'AUDIT_PASS') return { execution: 'SUCCESS', risk: 'LOW' };
  if (r === 'AUDIT_WARN') return { execution: 'SUCCESS', risk: 'MEDIUM' };
  if (r === 'AUDIT_FAIL') return { execution: 'SUCCESS', risk: 'HIGH' };

  return { execution: 'SUCCESS', risk: '—' };
}

function badgeStyle(type: 'execution' | 'risk', value: string) {
  const v = String(value || '').toUpperCase();

  let bg = '#f3f4f6';
  let color = '#374151';

  if (type === 'execution') {
    if (v === 'SUCCESS') {
      bg = '#dcfce7';
      color = '#166534';
    } else if (v === 'RUNNING') {
      bg = '#dbeafe';
      color = '#1d4ed8';
    } else if (v === 'FAILED') {
      bg = '#fee2e2';
      color = '#991b1b';
    }
  }

  if (type === 'risk') {
    if (v === 'LOW') {
      bg = '#dcfce7';
      color = '#166534';
    } else if (v === 'MEDIUM') {
      bg = '#ffedd5';
      color = '#9a3412';
    } else if (v === 'HIGH') {
      bg = '#fee2e2';
      color = '#991b1b';
    }
  }

  return {
    display: 'inline-block',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 800,
    background: bg,
    color,
    borderRadius: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  } as const;
}

/* =========================
   PAGE
========================= */

export default function ReportsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'model' | 'log'>('model');

  const [models, setModels] = useState<Model[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);

  const [downloadingAuditId, setDownloadingAuditId] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [auditsError, setAuditsError] = useState<string | null>(null);

  async function fetchModels() {
    try {
      setModelsError(null);
      setLoadingModels(true);

      const data = await apiGet<Model[]>('/models');
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setModels([]);
      setModelsError(err?.message || 'Failed to load models');
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    fetchModels();
  }, []);

  async function loadAudits(modelId: string) {
    if (!modelId) {
      setAudits([]);
      return;
    }

    try {
      setAuditsError(null);
      setLoadingAudits(true);

      const data = await apiGet<Audit[]>(`/audits/model/${modelId}/recent`);
      setAudits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setAudits([]);
      setAuditsError(err?.message || 'Failed to load audits');
    } finally {
      setLoadingAudits(false);
    }
  }

  useEffect(() => {
    if (selectedModel) loadAudits(selectedModel);
  }, [selectedModel]);

  async function runAudit() {
    if (!selectedModel) {
      alert('Please select a model');
      return;
    }

    try {
      setRunningAudit(true);
      await apiPost(`/audits/model/${selectedModel}/run`);

      await loadAudits(selectedModel);
      await fetchModels();
    } catch (err: any) {
      alert(`Audit failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRunningAudit(false);
    }
  }

  async function downloadAuditJson(auditId: string) {
    try {
      setDownloadingAuditId(auditId);

      const blob = await apiGetBlob(`/audits/${auditId}/download`);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${auditId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloadingAuditId(null);
    }
  }

  async function downloadAuditPdf(auditId: string) {
    try {
      setDownloadingAuditId(auditId);

      const blob = await apiGetBlob(`/audits/${auditId}/download-pdf`);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF download failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloadingAuditId(null);
    }
  }

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      <div style={header}>
        <h1 style={title}>Audits</h1>
        <p style={subtitle}>Run and review model audits (evidence stored in database)</p>
      </div>

      <div style={tabs}>
        <button style={tab(activeTab === 'model')} onClick={() => setActiveTab('model')}>
          Model Auditing
        </button>
        <button style={tab(activeTab === 'log')} onClick={() => setActiveTab('log')}>
          Log Auditing
        </button>
      </div>

      {activeTab === 'model' && (
        <>
          <div style={card}>
            <h2 style={sectionTitle}>Configure Model Audit</h2>

            <label style={label}>
              Select Model <span style={{ color: '#ef4444' }}>*</span>
            </label>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={input}
              disabled={loadingModels}
            >
              <option value="">{loadingModels ? 'Loading models…' : 'Choose a model'}</option>
              {models.map((m) => (
                <option key={m.id} value={m.model_id}>
                  {m.name} ({m.model_id})
                </option>
              ))}
            </select>

            {modelsError && (
              <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>{modelsError}</div>
            )}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button
                onClick={runAudit}
                disabled={!selectedModel || runningAudit}
                style={{
                  ...primaryBtn,
                  opacity: !selectedModel || runningAudit ? 0.6 : 1,
                  cursor: !selectedModel || runningAudit ? 'not-allowed' : 'pointer',
                }}
              >
                {runningAudit ? 'Running Audit…' : 'Start Model Audit'}
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Model Audits</h3>

          {!selectedModel ? (
            <div style={emptyBox}>Select a model to view audit history.</div>
          ) : loadingAudits ? (
            <div style={emptyBox}>Loading audits…</div>
          ) : auditsError ? (
            <div style={emptyBox}>
              <div style={{ color: '#b91c1c', fontWeight: 900, marginBottom: 6 }}>Failed to load audits</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{auditsError}</div>
            </div>
          ) : audits.length === 0 ? (
            <div style={emptyBox}>
              No audits found for this model yet.
              <br />
              Run an audit to generate evidence.
            </div>
          ) : (
            <div style={card}>
              <div style={auditHeaderRow}>
                <div style={{ fontWeight: 900 }}>Audit ID</div>
                <div style={{ fontWeight: 900, textAlign: 'center' }}>Result</div>
                <div style={{ fontWeight: 900, textAlign: 'center' }}>Risk</div>
                <div style={{ fontWeight: 900, textAlign: 'right' }}>Executed</div>
                <div style={{ fontWeight: 900, textAlign: 'right' }}>Actions</div>
              </div>

              {audits.map((a) => {
                const parsed = parseAuditResult(a.audit_result);

                return (
                  <div
                    key={a.audit_id}
                    style={auditRow}
                    onClick={() => router.push(`/reports/${a.audit_id}`)}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{a.audit_id}</div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={badgeStyle('execution', parsed.execution)}>{parsed.execution}</span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={badgeStyle('risk', parsed.risk)}>{parsed.risk}</span>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                      {a.executed_at ? new Date(a.executed_at).toLocaleString() : '—'}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        style={{
                          ...smallBtn,
                          opacity: downloadingAuditId === a.audit_id ? 0.6 : 1,
                          cursor: downloadingAuditId === a.audit_id ? 'not-allowed' : 'pointer',
                        }}
                        disabled={downloadingAuditId === a.audit_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAuditJson(a.audit_id);
                        }}
                      >
                        JSON
                      </button>

                      <button
                        style={{
                          ...smallBtn,
                          opacity: downloadingAuditId === a.audit_id ? 0.6 : 1,
                          cursor: downloadingAuditId === a.audit_id ? 'not-allowed' : 'pointer',
                        }}
                        disabled={downloadingAuditId === a.audit_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAuditPdf(a.audit_id);
                        }}
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'log' && (
        <div style={card}>
          <h2 style={sectionTitle}>Log Auditing</h2>
          <p style={{ fontSize: 14, color: '#666' }}>Log auditing will be enabled in Phase 2.</p>
        </div>
      )}
    </div>
  );
}

/* =========================
   STYLES
========================= */

const header = {
  marginBottom: 32,
  paddingBottom: 16,
  borderBottom: '2px solid #e5e7eb',
};

const title = {
  fontSize: 28,
  fontWeight: 800,
};

const subtitle = {
  fontSize: 14,
  color: '#666',
  marginTop: 8,
};

const tabs = {
  display: 'flex',
  gap: 8,
  marginBottom: 32,
  borderBottom: '2px solid #e5e7eb',
};

const tab = (active: boolean) => ({
  padding: '12px 24px',
  background: active ? '#1a1a1a' : 'transparent',
  color: active ? '#ffffff' : '#666666',
  border: 'none',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  borderBottom: active ? '2px solid #1a1a1a' : '2px solid transparent',
  marginBottom: -2,
});

const card = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  padding: 32,
  marginBottom: 24,
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 24,
};

const label = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
  display: 'block',
};

const input = {
  width: '100%',
  padding: 12,
  border: '1px solid #d1d5db',
  fontSize: 14,
};

const primaryBtn = {
  padding: '14px 32px',
  background: '#1a1a1a',
  color: '#ffffff',
  border: 'none',
  fontSize: 14,
  fontWeight: 800,
};

const smallBtn = {
  padding: '8px 12px',
  background: '#111827',
  color: '#ffffff',
  border: 'none',
  fontSize: 12,
  fontWeight: 800,
  borderRadius: 6,
};

const emptyBox = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  padding: 40,
  textAlign: 'center' as const,
  color: '#666666',
};

const auditHeaderRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 140px 140px 220px 180px',
  gap: 12,
  paddingBottom: 12,
  borderBottom: '2px solid #e5e7eb',
  marginBottom: 8,
  fontSize: 13,
  color: '#111827',
};

const auditRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 140px 140px 220px 180px',
  gap: 12,
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
  cursor: 'pointer',
};
