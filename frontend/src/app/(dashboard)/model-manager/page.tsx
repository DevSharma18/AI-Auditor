'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// ---------------- Tooltip ----------------
function InfoButton({ tooltip }: { tooltip: string }) {
    return (
        <span title={tooltip} style={{ cursor: 'help', color: '#6b7280' }}>
            ⓘ
        </span>
    );
}

// ---------------- Page ----------------
export default function ModelManagerPage() {
    const [models, setModels] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [modelNickname, setModelNickname] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [description, setDescription] = useState('');
    const [temperature, setTemperature] = useState(0.7);

    // ---------------- Load models ----------------
    async function loadModels() {
        const res = await fetch(`${API_BASE}/models`);
        const data = await res.json();
        setModels(data);
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

        const res = await fetch(`${API_BASE}/models/register-with-connector`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: modelId,
                name: modelNickname,
                endpoint: apiUrl,
                api_key: apiKey,
                description,
                request_template: {
                    temperature,
                    messages: [],
                },
            }),
        });

        setLoading(false);

        if (!res.ok) {
            alert('Failed to register model');
            return;
        }

        setModalOpen(false);
        setModelNickname('');
        setApiUrl('');
        setApiKey('');
        setDescription('');
        setTemperature(0.7);
        loadModels();
    }

    // ---------------- Audit ----------------
    async function runAudit(modelId: string) {
        await fetch(`${API_BASE}/audits/active/${modelId}`, { method: 'POST' });
        loadModels();
    }

    return (
        <div style={{ padding: '32px', background: '#fafafa', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Model Manager</h1>
                <button
                    onClick={() => setModalOpen(true)}
                    style={{
                        background: '#4f46e5',
                        color: '#fff',
                        padding: '10px 18px',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    + Add Model
                </button>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Model</th>
                            <th>Status</th>
                            <th>Last Audit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map((m) => (
                            <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px' }}>
                                    <strong>{m.name}</strong>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{m.model_id}</div>
                                </td>
                                <td>{m.last_audit_status || 'NOT AUDITED'}</td>
                                <td>
                                    {m.last_audit_time
                                        ? new Date(m.last_audit_time).toLocaleString()
                                        : '—'}
                                </td>
                                <td>
                                    <button onClick={() => runAudit(m.model_id)}>Run Audit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div
                    onClick={() => setModalOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            padding: '28px',
                            width: '520px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        }}
                    >
                        <h2 style={{ marginBottom: '20px' }}>Add Custom Model</h2>

                        {/* Model Nickname */}
                        <label>Model Nickname * <InfoButton tooltip="Human-readable model name" /></label>
                        <input
                            placeholder="e.g. Customer Support GPT"
                            value={modelNickname}
                            onChange={(e) => setModelNickname(e.target.value)}
                            style={inputStyle}
                        />

                        {/* API URL */}
                        <label>API URL * <InfoButton tooltip="Inference endpoint URL" /></label>
                        <input
                            placeholder="https://api.openai.com/v1/chat/completions"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            style={inputStyle}
                        />

                        {/* API Key */}
                        <label>API Key</label>
                        <input
                            type="password"
                            placeholder="sk-****"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            style={inputStyle}
                        />

                        {/* Description */}
                        <label>Description</label>
                        <textarea
                            placeholder="Short description of what this model does"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ ...inputStyle, height: '80px' }}
                        />

                        {/* Temperature */}
                        <label>Temperature: {temperature}</label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />

                        {/* Buttons */}
                        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                            <button onClick={() => setModalOpen(false)} style={secondaryBtn}>
                                Cancel
                            </button>
                            <button onClick={addModel} disabled={loading} style={primaryBtn}>
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
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '14px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
};

const primaryBtn: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    background: '#fff',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
};
