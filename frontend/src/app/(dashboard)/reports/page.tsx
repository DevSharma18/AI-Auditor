'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api';

type Model = {
    id: number;
    model_id: string;
    name: string;
    version: string;
};

type Audit = {
    audit_id: string;
    audit_result: string;
    executed_at: string;
};

const auditCategories = ['Bias', 'Hallucination', 'PII', 'Compliance', 'Drift'];

export default function AuditsPage() {
    const [activeTab, setActiveTab] = useState<'model' | 'log'>('model');

    // Live data
    const [models, setModels] = useState<Model[]>([]);
    const [audits, setAudits] = useState<Audit[]>([]);

    // State
    const [selectedModel, setSelectedModel] = useState('');
    const [iterations, setIterations] = useState('10');
    const [loading, setLoading] = useState(false);

    // Passive audit state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [samplingRate, setSamplingRate] = useState('100');

    /* =========================
       LOAD MODELS
    ========================= */

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        const res = await fetch(`${API_BASE}/models`);
        const data = await res.json();
        setModels(data);
    };

    /* =========================
       LOAD AUDITS
    ========================= */

    const fetchAudits = async (modelId: string) => {
        const res = await fetch(`${API_BASE}/audits/model/${modelId}/recent`);
        if (res.ok) {
            const data = await res.json();
            setAudits(data);
        }
    };

    /* =========================
       START MODEL AUDIT
    ========================= */

    const startModelAudit = async () => {
        if (!selectedModel) {
            alert('Please select a model');
            return;
        }

        setLoading(true);

        const res = await fetch(
            `${API_BASE}/audits/model/${selectedModel}?iterations=${iterations}`,
            { method: 'POST' }
        );

        if (!res.ok) {
            alert('Audit failed');
            setLoading(false);
            return;
        }

        await fetchAudits(selectedModel);
        setLoading(false);
    };

    /* =========================
       FILE UPLOAD (LOG AUDIT)
    ========================= */

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Audits</h1>
                <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                    Perform model auditing on custom models or log auditing on ingested logs
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32, borderBottom: '2px solid #e5e7eb' }}>
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
                <div>
                    <div style={card}>
                        <h2 style={sectionTitle}>Configure Model Audit</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* Left */}
                            <div>
                                <label style={label}>
                                    Select Model <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={e => {
                                        setSelectedModel(e.target.value);
                                        fetchAudits(e.target.value);
                                    }}
                                    style={input}
                                >
                                    <option value="">Choose a custom model</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.model_id}>
                                            {m.name} ({m.version})
                                        </option>
                                    ))}
                                </select>

                                <div style={{ marginTop: 24 }}>
                                    <label style={label}>Number of Test Iterations</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={iterations}
                                        onChange={e => setIterations(e.target.value)}
                                        style={input}
                                    />
                                </div>

                                <div style={{ marginTop: 24 }}>
                                    <label style={label}>Audit Categories</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {auditCategories.map(cat => (
                                            <div key={cat} style={categoryTag}>
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right */}
                            <div>
                                <label style={label}>Autonomous Audit</label>
                                <div style={infoBox}>
                                    This audit runs <b>platform-controlled prompts (700+)</b> across
                                    hallucination, bias, PII, compliance, and drift.
                                    <br /><br />
                                    Prompts are not user-provided to preserve audit integrity.
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={startModelAudit}
                                disabled={loading}
                                style={primaryBtn}
                            >
                                {loading ? 'Running Audit…' : 'Start Model Audit'}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                            Recent Model Audits
                        </h3>

                        {audits.length === 0 ? (
                            <div style={emptyBox}>
                                <p>No model audits yet.</p>
                            </div>
                        ) : (
                            <div style={card}>
                                {audits.map(a => (
                                    <div
                                        key={a.audit_id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px 0',
                                            borderBottom: '1px solid #e5e7eb',
                                        }}
                                    >
                                        <span>{a.audit_id}</span>
                                        <span>{a.audit_result}</span>
                                        <span>{new Date(a.executed_at).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================
               LOG AUDITING
            ========================= */}

            {activeTab === 'log' && (
                <div>
                    <div style={card}>
                        <h2 style={sectionTitle}>Configure Log Audit</h2>

                        <label style={label}>
                            Upload Log File <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input type="file" onChange={handleFileUpload} />

                        <div style={{ marginTop: 24 }}>
                            <label style={label}>Sampling Rate (%)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={samplingRate}
                                onChange={e => setSamplingRate(e.target.value)}
                                style={input}
                            />
                        </div>

                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                            <button style={primaryBtn}>Process Logs</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================
   STYLES
========================= */

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: 32,
    marginBottom: 24,
};

const sectionTitle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 24,
};

const label = {
    fontSize: 14,
    fontWeight: 500,
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
    fontWeight: 600,
    cursor: 'pointer',
};

const tab = (active: boolean) => ({
    padding: '12px 24px',
    background: active ? '#1a1a1a' : 'transparent',
    color: active ? '#ffffff' : '#666666',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: active ? '2px solid #1a1a1a' : '2px solid transparent',
    marginBottom: -2,
});

const infoBox = {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    padding: 16,
    fontSize: 13,
    color: '#075985',
};

const emptyBox = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: 40,
    textAlign: 'center' as const,
    color: '#666666',
};

const categoryTag = {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    fontSize: 13,
    color: '#666666',
};
