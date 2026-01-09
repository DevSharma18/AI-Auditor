'use client';

import { useEffect, useState } from 'react';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://127.0.0.1:8000/api';

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

export default function ModelManagerPage() {
    const [models, setModels] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);
    const [runningAudit, setRunningAudit] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // ---------------- Form state ----------------
    const [modelNickname, setModelNickname] = useState('');
    const [modelName, setModelName] = useState(''); // ✅ NEW
    const [apiUrl, setApiUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [description, setDescription] = useState('');
    const [temperature, setTemperature] = useState(0.7);

    // ---------------- Load models ----------------
    async function loadModels() {
        try {
            setLoadingModels(true);
            const res = await fetch(`${API_BASE}/models`);
            const data = await res.json();
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
            // 🔑 BUILD PROVIDER-AGNOSTIC REQUEST TEMPLATE
            const request_template: any = {
                temperature,
            };

            if (modelName) {
                // OpenAI / Anthropic / Azure style
                request_template.model = modelName;
                request_template.messages = [
                    { role: 'user', content: '{{PROMPT}}' },
                ];
            } else {
                // Local / Custom API style
                request_template.input = '{{PROMPT}}';
            }

            const res = await fetch(`${API_BASE}/models/register-with-connector`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: modelId,
                    name: modelNickname,
                    endpoint: apiUrl,
                    headers: apiKey
                        ? {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        }
                        : { 'Content-Type': 'application/json' },
                    request_template,
                    response_path: modelName
                        ? 'choices[0].message.content'
                        : 'output',
                    description,
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt);
            }

            setModalOpen(false);
            setModelNickname('');
            setModelName('');
            setApiUrl('');
            setApiKey('');
            setDescription('');
            setTemperature(0.7);
            loadModels();
        } catch (err: any) {
            alert(`Failed to register model:\n${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    // ---------------- Run audit ----------------
    async function runAudit(modelId: string) {
        try {
            setRunningAudit(modelId);

            const res = await fetch(
                `${API_BASE}/audits/model/${modelId}/run`,
                { method: 'POST' }
            );

            if (!res.ok) throw new Error();

            await loadModels();
        } catch {
            alert('Failed to run audit');
        } finally {
            setRunningAudit(null);
        }
    }

    return (
        <div style={{ padding: 32, background: '#fafafa', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700 }}>Model Manager</h1>
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
                            <th>Status</th>
                            <th>Last Audit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.length === 0 && !loadingModels && (
                            <tr>
                                <td colSpan={4} style={{ padding: 16, color: '#6b7280' }}>
                                    No models registered yet
                                </td>
                            </tr>
                        )}

                        {models.map((m) => (
                            <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: 12 }}>
                                    <strong>{m.name}</strong>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {m.model_id}
                                    </div>
                                </td>
                                <td>{m.last_audit_status || 'NOT AUDITED'}</td>
                                <td>
                                    {m.last_audit_time
                                        ? new Date(m.last_audit_time).toLocaleString()
                                        : '—'}
                                </td>
                                <td>
                                    <button
                                        style={auditBtn}
                                        disabled={runningAudit === m.model_id}
                                        onClick={() => runAudit(m.model_id)}
                                    >
                                        {runningAudit === m.model_id ? 'Running…' : 'Run Audit'}
                                    </button>
                                </td>
                            </tr>
                        ))}
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
                        <input style={inputStyle} value={modelNickname} onChange={(e) => setModelNickname(e.target.value)} />

                        <label>
                            Model / Deployment Name <InfoButton tooltip="e.g. gpt-4o-mini, claude-3-opus" />
                        </label>
                        <input style={inputStyle} value={modelName} onChange={(e) => setModelName(e.target.value)} />

                        <label>
                            API URL * <InfoButton tooltip="Inference endpoint" />
                        </label>
                        <input style={inputStyle} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />

                        <label>API Key</label>
                        <input type="password" style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />

                        <label>Description</label>
                        <textarea style={{ ...inputStyle, height: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />

                        <label>Temperature: {temperature}</label>
                        <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />

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
};

const secondaryBtn = {
    flex: 1,
    padding: 12,
    background: '#fff',
    border: '1px solid #d1d5db',
};

const auditBtn = {
    padding: '8px 14px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
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
