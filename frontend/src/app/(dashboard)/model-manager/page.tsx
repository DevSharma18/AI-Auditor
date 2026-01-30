'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api-client';

// ---------------- Types & Helpers ----------------

type ModelRow = {
  id: number;
  model_id: string;
  name: string;
  version?: string;
  model_type?: string;
  connection_type?: string;
  created_at?: string;
  last_audit_status?: string | null;
  last_audit_time?: string | null;
};

type ExecutionStatus = 'NOT RUN' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
type RiskPosture = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

function parseStatus(raw?: string | null): { execution: ExecutionStatus; risk: RiskPosture } {
  const s = String(raw || '').toUpperCase().trim();

  if (!s || s === 'NULL') return { execution: 'NOT RUN', risk: '—' };

  if (s === 'PENDING') return { execution: 'PENDING', risk: '—' };
  if (s === 'RUNNING') return { execution: 'RUNNING', risk: '—' };
  if (s === 'FAILED') return { execution: 'FAILED', risk: '—' };
  if (s === 'CANCELLED') return { execution: 'CANCELLED', risk: '—' };

  if (s === 'AUDIT_PASS') return { execution: 'SUCCESS', risk: 'LOW' };
  if (s === 'AUDIT_WARN') return { execution: 'SUCCESS', risk: 'MEDIUM' };
  if (s === 'AUDIT_FAIL') return { execution: 'SUCCESS', risk: 'HIGH' };

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
    display: 'inline-block', padding: '6px 10px', fontSize: 12, fontWeight: 800,
    borderRadius: 6, border: `2px solid ${border}`, background: bg, color,
    textTransform: 'uppercase' as const, letterSpacing: '0.4px', lineHeight: 1,
  } as const;
}

export default function ModelManagerPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [modelNickname, setModelNickname] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const pollTimerRef = useRef<any>(null);

  async function loadModels() {
    try {
      const data = await apiGet<ModelRow[]>('/models');
      const list = Array.isArray(data) ? data : [];
      setModels(list);
      
      const anyRunning = list.some(m => {
        const p = parseStatus(m.last_audit_status);
        return p.execution === 'RUNNING' || p.execution === 'PENDING';
      });

      if (anyRunning && !pollTimerRef.current) {
        startPolling();
      }
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    loadModels();
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  function startPolling() {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      const data = await apiGet<ModelRow[]>('/models');
      const list = Array.isArray(data) ? data : [];
      setModels(list);
      const stillRunning = list.some(m => {
        const p = parseStatus(m.last_audit_status);
        return p.execution === 'RUNNING' || p.execution === 'PENDING';
      });
      if (!stillRunning) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }, 3000);
  }

  async function addModel() {
    if (!modelNickname || !apiUrl) return alert('Nickname and URL required');
    const modelId = modelNickname.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setLoading(true);
    try {
      const request_template: any = { temperature };
      if (modelName) {
        request_template.model = modelName;
        request_template.messages = [{ role: 'user', content: '{{PROMPT}}' }];
      } else {
        request_template.input = '{{PROMPT}}';
      }
      await apiPost('/models/register-with-connector', {
        model_id: modelId, name: modelNickname, endpoint: apiUrl, method: 'POST',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
        request_template, response_path: modelName ? 'choices[0].message.content' : 'output', description,
      });
      setModalOpen(false); setModelNickname(''); setModelName(''); setApiUrl(''); setApiKey(''); setTemperature(0.7);
      await loadModels();
    } catch (err: any) {
      alert(`Error: ${err?.message}`);
    } finally { setLoading(false); }
  }

  // ✅ New Delete Function
  async function deleteModel(modelId: string) {
    if (!confirm(`Are you sure you want to remove ${modelId}? All audit history for this model will be permanently deleted.`)) return;
    
    try {
      // Using direct fetch for DELETE since api-client might only have Get/Post
      const API_BASE = 'http://127.0.0.1:8000/api';
      const res = await fetch(`${API_BASE}/models/${modelId}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Delete failed');
      }
      
      await loadModels();
    } catch (err: any) {
      alert(err.message || 'Failed to delete model');
    }
  }

  async function runAudit(modelId: string) {
    try {
      await apiPost(`/audits/model/${modelId}/run`);
      await loadModels();
      startPolling();
    } catch (err: any) {
      alert(err?.message || 'Failed to run audit');
    }
  }

  async function stopAudit(modelId: string) {
    try {
      // Find latest running audit ID for this model (backend logic usually handles this, or we fetch recent)
      const recent = await apiGet<any[]>(`/audits/model/${modelId}/recent`);
      if (recent && recent.length > 0 && recent[0].audit_result === 'RUNNING') {
        await apiPost(`/audits/${recent[0].audit_id}/stop`);
        await loadModels();
      }
    } catch {
      alert('Failed to stop audit');
    }
  }

  return (
    <div style={{ padding: 32, background: '#fafafa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Model Manager</h1>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            <b>Result</b> shows audit execution status. <b>Risk</b> shows security posture.
          </div>
        </div>
        <button style={primaryBtn} onClick={() => setModalOpen(true)}>+ Add Model</button>
      </div>

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
            {models.map((m) => {
              const parsed = parseStatus(m.last_audit_status);
              const isProcessing = parsed.execution === 'RUNNING' || parsed.execution === 'PENDING';

              return (
                <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}>
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{m.model_id}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={badgeStyle('execution', parsed.execution)}>{parsed.execution}</span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={badgeStyle('risk', parsed.risk)}>{parsed.risk}</span>
                  </td>
                  <td style={{ padding: 12, color: '#6b7280', fontSize: 13 }}>
                    {m.last_audit_time ? new Date(m.last_audit_time).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {/* Run / Stop Button */}
                      {isProcessing ? (
                        <button 
                          style={{ ...auditBtn, background: '#dc2626' }} 
                          onClick={() => stopAudit(m.model_id)}
                        >
                          Stop
                        </button>
                      ) : (
                        <button style={auditBtn} onClick={() => runAudit(m.model_id)}>
                          Run Audit
                        </button>
                      )}

                      {/* ✅ Delete Button */}
                      <button 
                        style={deleteBtn} 
                        onClick={() => deleteModel(m.model_id)}
                        title="Remove Model"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>Add Custom Model</h2>
            <label>Model Nickname *</label>
            <input style={inputStyle} value={modelNickname} onChange={(e) => setModelNickname(e.target.value)} />
            <label>Model / Deployment Name</label>
            <input style={inputStyle} value={modelName} onChange={(e) => setModelName(e.target.value)} />
            <label>API URL *</label>
            <input style={inputStyle} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
            <label>API Key</label>
            <input type="password" style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <label>Description</label>
            <textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={(e) => setDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={secondaryBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={primaryBtn} onClick={addModel} disabled={loading}>{loading ? 'Adding…' : 'Add Model'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Styles ----------------
const inputStyle = { width: '100%', padding: '10px 12px', marginBottom: 14, border: '1px solid #d1d5db', fontSize: 14 };
const primaryBtn = { background: '#4f46e5', color: '#fff', padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 800 };
const secondaryBtn = { flex: 1, padding: 12, background: '#fff', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 700 };
const auditBtn = { padding: '8px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 800, fontSize: 13 };
const deleteBtn = { padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer', fontWeight: 800, fontSize: 13 };
const modalOverlay = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', padding: 28, width: 520 };