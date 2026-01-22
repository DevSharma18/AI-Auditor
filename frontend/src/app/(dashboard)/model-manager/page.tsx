'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api-client';

// ---------------- Tooltip ----------------
function InfoButton({ tooltip }: { tooltip: string }) {
  return (
    <span
      title={tooltip}
      style={{ cursor: 'help', color: '#6b7280', marginLeft: 4 }}
    >
      ⓘ
    </span>
  );
}

type ModelRow = {
  id: number;
  model_id: string;
  name: string;
  version?: string;
  model_type?: string;
  connection_type?: string;
  created_at?: string;

  /**
   * backend currently returns ONE field that can be:
   * RUNNING | FAILED | AUDIT_PASS | AUDIT_WARN | AUDIT_FAIL | null
   */
  last_audit_status?: string | null;
  last_audit_time?: string | null;
};

type ExecutionStatus = 'NOT RUN' | 'RUNNING' | 'SUCCESS' | 'FAILED';
type RiskPosture = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

function parseStatus(raw?: string | null): { execution: ExecutionStatus; risk: RiskPosture } {
  const s = String(raw || '').toUpperCase().trim();

  if (!s) return { execution: 'NOT RUN', risk: '—' };

  // execution states
  if (s === 'RUNNING') return { execution: 'RUNNING', risk: '—' };
  if (s === 'FAILED') return { execution: 'FAILED', risk: '—' };

  // outcome states (audit completed successfully)
  if (s === 'AUDIT_PASS') return { execution: 'SUCCESS', risk: 'LOW' };
  if (s === 'AUDIT_WARN') return { execution: 'SUCCESS', risk: 'MEDIUM' };
  if (s === 'AUDIT_FAIL') return { execution: 'SUCCESS', risk: 'HIGH' };

  // unknown fallback
  return { execution: 'SUCCESS', risk: '—' };
}

function badgeStyle(type: 'execution' | 'risk', value: string) {
  const v = String(value || '').toUpperCase();

  // defaults
  let bg = '#f3f4f6';
  let color = '#374151';
  let border = '#e5e7eb';

  if (type === 'execution') {
    if (v === 'SUCCESS') {
      bg = '#dcfce7';
      color = '#166534';
      border = '#86efac';
    } else if (v === 'RUNNING') {
      bg = '#dbeafe';
      color = '#1d4ed8';
      border = '#93c5fd';
    } else if (v === 'FAILED') {
      bg = '#fee2e2';
      color = '#991b1b';
      border = '#fca5a5';
    } else {
      bg = '#f3f4f6';
      color = '#374151';
      border = '#e5e7eb';
    }
  }

  if (type === 'risk') {
    if (v === 'LOW') {
      bg = '#dcfce7';
      color = '#166534';
      border = '#86efac';
    } else if (v === 'MEDIUM') {
      bg = '#ffedd5';
      color = '#9a3412';
      border = '#fdba74';
    } else if (v === 'HIGH') {
      bg = '#fee2e2';
      color = '#991b1b';
      border = '#fca5a5';
    } else {
      bg = '#f3f4f6';
      color = '#374151';
      border = '#e5e7eb';
    }
  }

  return {
    display: 'inline-block',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 6,
    border: `2px solid ${border}`,
    background: bg,
    color,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    lineHeight: 1,
  } as const;
}

export default function ModelManagerPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // ✅ show running state until backend finishes
  const [runningAudit, setRunningAudit] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---------------- Form state ----------------
  const [modelNickname, setModelNickname] = useState('');
  const [modelName, setModelName] = useState(''); // provider model/deployment name
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const pollTimerRef = useRef<any>(null);

  // ---------------- Load models ----------------
  async function loadModels() {
    try {
      setLoadingModels(true);
      const data = await apiGet<ModelRow[]>('/models');
      setModels(Array.isArray(data) ? data : []);
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  // ✅ helper: detect if model is still running
  function isModelRunning(modelId: string, list: ModelRow[]) {
    const m = list.find((x) => x.model_id === modelId);
    if (!m) return false;
    return parseStatus(m.last_audit_status).execution === 'RUNNING';
  }

  // ✅ polling while audit is running
  async function startPollingForAudit(modelId: string) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const data = await apiGet<ModelRow[]>('/models');
        const list = Array.isArray(data) ? data : [];
        setModels(list);

        const stillRunning = isModelRunning(modelId, list);
        if (!stillRunning) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setRunningAudit(null);
        }
      } catch {
        // keep polling even if one request fails
      }
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // ---------------- Add model ----------------
  async function addModel() {
    if (!modelNickname || !apiUrl) {
      alert('Model nickname and API URL are required');
      return;
    }

    const modelId = modelNickname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    setLoading(true);

    try {
      // 🔑 Provider-agnostic request template
      const request_template: any = {
        temperature,
      };

      if (modelName) {
        request_template.model = modelName;
        request_template.messages = [{ role: 'user', content: '{{PROMPT}}' }];
      } else {
        request_template.input = '{{PROMPT}}';
      }

      await apiPost('/models/register-with-connector', {
        model_id: modelId,
        name: modelNickname,
        endpoint: apiUrl,
        method: 'POST',
        headers: apiKey
          ? {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            }
          : { 'Content-Type': 'application/json' },
        request_template,
        response_path: modelName ? 'choices[0].message.content' : 'output',
        description,
      });

      setModalOpen(false);
      setModelNickname('');
      setModelName('');
      setApiUrl('');
      setApiKey('');
      setDescription('');
      setTemperature(0.7);

      await loadModels();
    } catch (err: any) {
      alert(`Failed to register model:\n${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Run audit ----------------
  async function runAudit(modelId: string) {
    try {
      setRunningAudit(modelId);

      await apiPost(`/audits/model/${modelId}/run`);
      await loadModels();

      await startPollingForAudit(modelId);
    } catch {
      alert('Failed to run audit');
      setRunningAudit(null);
    }
  }

  return (
    <div style={{ padding: 32, background: '#fafafa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Model Manager</h1>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            <b>Result</b> shows if the audit executed successfully. <b>Risk</b> shows the security/governance posture (LOW/MEDIUM/HIGH).
          </div>
        </div>

        <button style={primaryBtn} onClick={() => setModalOpen(true)}>
          + Add Model
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>Model</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Result</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Risk</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Last Audit</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {models.length === 0 && !loadingModels && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: '#6b7280' }}>
                  No models registered yet
                </td>
              </tr>
            )}

            {models.map((m) => {
              const parsed = parseStatus(m.last_audit_status);

              const isRunning = parsed.execution === 'RUNNING' || runningAudit === m.model_id;
              const execToShow: ExecutionStatus = isRunning ? 'RUNNING' : parsed.execution;

              return (
                <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{m.model_id}</div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <span style={badgeStyle('execution', execToShow)}>{execToShow}</span>
                  </td>

                  <td style={{ padding: 12 }}>
                    <span style={badgeStyle('risk', parsed.risk)}>{parsed.risk}</span>
                  </td>

                  <td style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>
                    {m.last_audit_time ? new Date(m.last_audit_time).toLocaleString() : '—'}
                  </td>

                  <td style={{ padding: 12 }}>
                    <button
                      style={{
                        ...auditBtn,
                        opacity: isRunning ? 0.7 : 1,
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                      }}
                      disabled={isRunning}
                      onClick={() => runAudit(m.model_id)}
                    >
                      {isRunning ? 'Running…' : 'Run Audit'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>Add Custom Model</h2>

            <label>
              Model Nickname * <InfoButton tooltip="Human-readable name" />
            </label>
            <input
              style={inputStyle}
              value={modelNickname}
              onChange={(e) => setModelNickname(e.target.value)}
            />

            <label>
              Model / Deployment Name{' '}
              <InfoButton tooltip="e.g. gpt-4o-mini, claude-3-opus" />
            </label>
            <input
              style={inputStyle}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />

            <label>
              API URL * <InfoButton tooltip="Inference endpoint" />
            </label>
            <input
              style={inputStyle}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />

            <label>API Key</label>
            <input
              type="password"
              style={inputStyle}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <label>Description</label>
            <textarea
              style={{ ...inputStyle, height: 80 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label>Temperature: {temperature}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={secondaryBtn} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button style={primaryBtn} onClick={addModel} disabled={loading}>
                {loading ? 'Adding…' : 'Add Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Styles ----------------
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: 14,
  border: '1px solid #d1d5db',
  fontSize: 14,
};

const primaryBtn = {
  background: '#4f46e5',
  color: '#fff',
  padding: '10px 18px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
};

const secondaryBtn = {
  flex: 1,
  padding: 12,
  background: '#fff',
  border: '1px solid #d1d5db',
  cursor: 'pointer',
  fontWeight: 700,
};

const auditBtn = {
  padding: '8px 14px',
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 800,
};

const modalOverlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalBox = {
  background: '#fff',
  padding: 28,
  width: 520,
};
