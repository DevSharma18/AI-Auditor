'use client';

import { useEffect, useRef, useState } from 'react';
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
  audit_result: string; // RUNNING | FAILED | AUDIT_PASS | AUDIT_WARN | AUDIT_FAIL | CANCELLED
  execution_status?: string; // PENDING | RUNNING | SUCCESS | FAILED | CANCELLED
  executed_at: string;
};

/* =========================
   HELPERS
========================= */

type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING' | 'CANCELLED';
type RiskPosture = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

function parseAuditResult(rawResult: string, rawStatus?: string): { execution: ExecutionStatus; risk: RiskPosture } {
  // If backend provides explicit execution_status, prioritize that for lifecycle states
  const status = String(rawStatus || rawResult || '').toUpperCase().trim();
  const result = String(rawResult || '').toUpperCase().trim();

  if (status === 'RUNNING') return { execution: 'RUNNING', risk: '—' };
  if (status === 'PENDING') return { execution: 'PENDING', risk: '—' };
  if (status === 'CANCELLED' || result === 'CANCELLED') return { execution: 'CANCELLED', risk: '—' };
  if (status === 'FAILED') return { execution: 'FAILED', risk: '—' };

  // If completed successfully, check result for risk level
  if (result === 'AUDIT_PASS') return { execution: 'SUCCESS', risk: 'LOW' };
  if (result === 'AUDIT_WARN') return { execution: 'SUCCESS', risk: 'MEDIUM' };
  if (result === 'AUDIT_FAIL') return { execution: 'SUCCESS', risk: 'HIGH' };

  // Fallback
  return { execution: 'SUCCESS', risk: '—' };
}

function badgeStyle(type: 'execution' | 'risk', value: string) {
  const v = String(value || '').toUpperCase();

  let bg = '#f3f4f6';
  let color = '#374151';
  let border = '#e5e7eb';

  if (type === 'execution') {
    if (v === 'SUCCESS') {
      bg = '#dcfce7'; color = '#166534'; border = '#86efac';
    } else if (v === 'RUNNING') {
      bg = '#dbeafe'; color = '#1d4ed8'; border = '#93c5fd';
    } else if (v === 'PENDING') {
      bg = '#fef9c3'; color = '#854d0e'; border = '#fde047';
    } else if (v === 'FAILED') {
      bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5';
    } else if (v === 'CANCELLED') {
      bg = '#f1f5f9'; color = '#475569'; border = '#cbd5e1';
    }
  }

  if (type === 'risk') {
    if (v === 'LOW') {
      bg = '#dcfce7'; color = '#166534'; border = '#86efac';
    } else if (v === 'MEDIUM') {
      bg = '#ffedd5'; color = '#9a3412'; border = '#fdba74';
    } else if (v === 'HIGH') {
      bg = '#fee2e2'; color = '#991b1b'; border = '#fca5a5';
    }
  }

  return {
    display: 'inline-block',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 800,
    background: bg,
    color,
    border: `2px solid ${border}`, // Added border for enterprise look
    borderRadius: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    lineHeight: 1,
  } as const;
}

/* =========================
   PAGE
========================= */

export default function ReportsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'model' | 'log'>('model');

  // live data
  const [models, setModels] = useState<Model[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  // state
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [downloadingAuditId, setDownloadingAuditId] = useState<string | null>(null);

  const [modelsError, setModelsError] = useState<string | null>(null);
  const [auditsError, setAuditsError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  /* =========================
       LOAD MODELS
    ========================= */
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

  /* =========================
       LOAD AUDITS & POLLING
    ========================= */
  async function loadAudits(modelId: string) {
    if (!modelId) {
      setAudits([]);
      return;
    }

    try {
      setAuditsError(null);
      if (!pollTimerRef.current) setLoadingAudits(true);

      const data = await apiGet<Audit[]>(`/audits/model/${modelId}/recent`);
      const list = Array.isArray(data) ? data : [];
      setAudits(list);

      // Check if any audit is active (RUNNING or PENDING)
      const anyActive = list.some(a => {
        const s = (a.execution_status || a.audit_result || '').toUpperCase();
        return s === 'RUNNING' || s === 'PENDING';
      });

      if (anyActive) {
        if (!pollTimerRef.current) {
          pollTimerRef.current = setInterval(() => loadAudits(modelId), 3000);
        }
      } else {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }

    } catch (err: any) {
      setAudits([]);
      setAuditsError(err?.message || 'Failed to load audits');
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    } finally {
      setLoadingAudits(false);
    }
  }

  useEffect(() => {
    if (selectedModel) {
      loadAudits(selectedModel);
    } else {
      setAudits([]);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  /* =========================
       RUN AUDIT
    ========================= */
  async function runAudit() {
    if (!selectedModel) {
      alert('Please select a model');
      return;
    }

    try {
      setRunningAudit(true);
      await apiPost(`/audits/model/${selectedModel}/run`);
      await loadAudits(selectedModel); // Trigger reload & poll
    } catch (err: any) {
      alert(`Audit failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRunningAudit(false);
    }
  }

  /* =========================
       STOP AUDIT
    ========================= */
  async function stopAudit(auditId: string) {
    try {
      await apiPost(`/audits/${auditId}/stop`);
      // Force immediate refresh to show CANCELLED status
      if (selectedModel) await loadAudits(selectedModel);
    } catch (err: any) {
      alert(`Failed to stop audit: ${err?.message || 'Unknown error'}`);
    }
  }

  /* =========================
       DOWNLOAD REPORT
    ========================= */
  async function downloadAuditReport(auditId: string) {
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

  /* =========================
       UI
    ========================= */

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: 32 }}>
      {/* Header */}
      <div style={header}>
        <h1 style={title}>Audits</h1>
        <p style={subtitle}>
          Run and review model audits (prompt/response evidence stored in database)
        </p>
      </div>

      {/* Tabs */}
      <div style={tabs}>
        <button style={tab(activeTab === 'model')} onClick={() => setActiveTab('model')}>
          Model Auditing
        </button>
        <button style={tab(activeTab === 'log')} onClick={() => setActiveTab('log')}>
          Log Auditing
        </button>
      </div>

      {/* =========================
         MODEL AUDITING
      ========================= */}
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
              <option value="">
                {loadingModels ? 'Loading models…' : 'Choose a model'}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.model_id}>
                  {m.name} ({m.model_id})
                </option>
              ))}
            </select>

            {modelsError && (
              <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 13 }}>
                {modelsError}
              </div>
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
                {runningAudit ? 'Initiating…' : 'Start Model Audit'}
              </button>
            </div>
          </div>

          {/* =========================
             RECENT AUDITS (REAL DB)
          ========================= */}
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Recent Model Audits
          </h3>

          {!selectedModel ? (
            <div style={emptyBox}>Select a model to view audit history.</div>
          ) : loadingAudits ? (
            <div style={emptyBox}>Loading audits…</div>
          ) : auditsError ? (
            <div style={emptyBox}>
              <div style={{ color: '#b91c1c', fontWeight: 900, marginBottom: 6 }}>
                Failed to load audits
              </div>
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
                const parsed = parseAuditResult(a.audit_result, a.execution_status);
                const isActive = parsed.execution === 'RUNNING' || parsed.execution === 'PENDING';

                return (
                  <div
                    key={a.audit_id}
                    style={auditRow}
                    onClick={() => router.push(`/reports/auditId/${a.audit_id}`)} // Fixed route path mismatch
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: 13, alignSelf: 'center' }}>
                      {a.audit_id}
                    </div>

                    <div style={{ textAlign: 'center', alignSelf: 'center' }}>
                      <span style={badgeStyle('execution', parsed.execution)}>{parsed.execution}</span>
                    </div>

                    <div style={{ textAlign: 'center', alignSelf: 'center' }}>
                      <span style={badgeStyle('risk', parsed.risk)}>{parsed.risk}</span>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
                      {a.executed_at ? new Date(a.executed_at).toLocaleString() : '—'}
                    </div>

                    <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                      {isActive ? (
                        <button
                          style={{
                            ...smallBtn,
                            background: '#dc2626', // Red for stop
                            opacity: 1,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            stopAudit(a.audit_id);
                          }}
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          style={{
                            ...smallBtn,
                            opacity: downloadingAuditId === a.audit_id ? 0.6 : 1,
                            cursor: downloadingAuditId === a.audit_id ? 'not-allowed' : 'pointer',
                          }}
                          disabled={downloadingAuditId === a.audit_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAuditReport(a.audit_id);
                          }}
                        >
                          {downloadingAuditId === a.audit_id ? 'Wait…' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================
         LOG AUDITING (PLACEHOLDER)
      ========================= */}
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
  color: '#111827',
};

const subtitle = {
  fontSize: 14,
  color: '#6b7280',
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
  background: active ? '#111827' : 'transparent',
  color: active ? '#ffffff' : '#6b7280',
  border: 'none',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  borderRadius: '6px 6px 0 0',
  marginBottom: -2,
});

const card = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  padding: 32,
  marginBottom: 24,
  borderRadius: 8, // Softens the look
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 24,
  color: '#111827',
};

const label = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
  display: 'block',
  color: '#374151',
};

const input = {
  width: '100%',
  padding: 12,
  border: '1px solid #d1d5db',
  fontSize: 14,
  borderRadius: 6,
  outline: 'none',
};

const primaryBtn = {
  padding: '12px 24px',
  background: '#111827',
  color: '#ffffff',
  border: 'none',
  fontSize: 14,
  fontWeight: 800,
  borderRadius: 6,
  cursor: 'pointer',
};

const smallBtn = {
  padding: '6px 12px',
  background: '#111827',
  color: '#ffffff',
  border: 'none',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 6,
  cursor: 'pointer',
};

const emptyBox = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  padding: 40,
  textAlign: 'center' as const,
  color: '#6b7280',
  borderRadius: 8,
};

const auditHeaderRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 140px 140px 220px 140px',
  gap: 12,
  paddingBottom: 12,
  borderBottom: '2px solid #e5e7eb',
  marginBottom: 8,
  fontSize: 13,
  color: '#111827',
};

const auditRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 140px 140px 220px 140px',
  gap: 12,
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
  cursor: 'pointer',
  transition: 'background 0.2s',
};