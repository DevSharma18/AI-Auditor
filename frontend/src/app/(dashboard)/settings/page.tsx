'use client';

import { useMemo, useState } from 'react';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export default function SettingsPage() {
    // -----------------------------
    // Model Integration state
    // -----------------------------
    const [modelEndpoint, setModelEndpoint] = useState('http://127.0.0.1:11434/api/generate');
    const [apiKey, setApiKey] = useState('');

    const [httpMethod, setHttpMethod] = useState<'POST' | 'GET'>('POST');
    const [headersJson, setHeadersJson] = useState<string>(
        JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
    );

    const [requestTemplateJson, setRequestTemplateJson] = useState<string>(
        JSON.stringify(
            {
                model: 'llama3',
                prompt: '{{PROMPT}}',
                stream: false,
            },
            null,
            2
        )
    );

    const [responsePath, setResponsePath] = useState('response');

    const [testPrompt, setTestPrompt] = useState('Say hello in one line.');

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        ok: boolean;
        message: string;
        latency_ms?: number;
        extracted_response?: string;
        raw_preview?: string;
    } | null>(null);

    // -----------------------------
    // Rule Configuration state
    // -----------------------------
    const [driftThreshold, setDriftThreshold] = useState(0.5);
    const [biasThreshold, setBiasThreshold] = useState(0.3);
    const [driftRateRule, setDriftRateRule] = useState(true);
    const [biasThresholdRules, setBiasThresholdRules] = useState(false);
    const [biasNotationRules, setBiasNotationRules] = useState(true);
    const [formateConfigRule, setFormateConfigRule] = useState(true);
    const [burorRules, setBurorRules] = useState(true);

    // -----------------------------
    // Notification Settings state
    // -----------------------------
    const [email, setEmail] = useState('');
    const [webhook, setWebhook] = useState('');
    const [severityFilter, setSeverityFilter] = useState(true);
    const [highFilter, setHighFilter] = useState(false);
    const [mediumFilter, setMediumFilter] = useState(false);
    const [lowFilter, setLowFilter] = useState(false);

    // -----------------------------
    // Helpers
    // -----------------------------
    const parsedHeaders = useMemo(() => {
        try {
            const parsed = JSON.parse(headersJson || '{}');
            if (typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed;
        } catch {
            return null;
        }
    }, [headersJson]);

    const parsedTemplate = useMemo(() => {
        try {
            const parsed = JSON.parse(requestTemplateJson || '{}');
            if (typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed;
        } catch {
            return null;
        }
    }, [requestTemplateJson]);

    const handleConnectionTest = async () => {
        setTestResult(null);

        // Validate JSON before calling API
        if (!parsedHeaders) {
            setTestResult({
                ok: false,
                message: 'Headers JSON is invalid. Please fix it.',
            });
            return;
        }

        if (!parsedTemplate) {
            setTestResult({
                ok: false,
                message: 'Request Template JSON is invalid. Please fix it.',
            });
            return;
        }

        if (!requestTemplateJson.includes('{{PROMPT}}')) {
            setTestResult({
                ok: false,
                message: 'Request template must contain {{PROMPT}} placeholder.',
            });
            return;
        }

        try {
            setTesting(true);

            const res = await fetch(`${API_BASE}/connectors/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    endpoint: modelEndpoint,
                    method: httpMethod,
                    headers: {
                        ...(parsedHeaders || {}),
                        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                    },
                    request_template: parsedTemplate,
                    response_path: responsePath,
                    test_prompt: testPrompt,
                    timeout_seconds: 20,
                }),
            });

            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : await res.text();

            if (!res.ok) {
                setTestResult({
                    ok: false,
                    message: typeof data === 'string' ? data : data?.detail || 'Connection test failed',
                });
                return;
            }

            setTestResult({
                ok: true,
                message: data?.message || 'Connection successful',
                latency_ms: data?.latency_ms,
                extracted_response: data?.extracted_response,
                raw_preview: data?.raw_preview,
            });
        } catch (err: any) {
            setTestResult({
                ok: false,
                message: err?.message || 'Connection test failed',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings Page</h1>
            </div>

            {/* Settings Grid - 3 Columns */}
            <div className="grid grid-cols-3 gap-6">
                {/* Section 1: Model Integrations */}
                <SettingsCard title="Model Integrations">
                    <div className="space-y-5">
                        {/* Model Endpoint URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Model Endpoint URL
                            </label>
                            <input
                                type="text"
                                value={modelEndpoint}
                                onChange={(e) => setModelEndpoint(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                            />
                        </div>

                        {/* HTTP Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                HTTP Method
                            </label>
                            <select
                                value={httpMethod}
                                onChange={(e) => setHttpMethod(e.target.value as any)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: '#fff',
                                }}
                            >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                            </select>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                            />
                            <div style={{ fontSize: 12, marginTop: 6, color: '#6b7280', lineHeight: 1.4 }}>
                                Optional. If you provide one, it will be sent as <code>Authorization: Bearer ...</code>
                            </div>
                        </div>

                        {/* Headers JSON */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Headers (JSON)
                            </label>
                            <textarea
                                value={headersJson}
                                onChange={(e) => setHeadersJson(e.target.value)}
                                className="w-full"
                                rows={5}
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                }}
                            />
                        </div>

                        {/* Request Template JSON */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Request Template (JSON)
                            </label>
                            <textarea
                                value={requestTemplateJson}
                                onChange={(e) => setRequestTemplateJson(e.target.value)}
                                className="w-full"
                                rows={7}
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                }}
                            />
                            <div style={{ fontSize: 12, marginTop: 6, color: '#6b7280', lineHeight: 1.4 }}>
                                Must contain: <code>{'{{PROMPT}}'}</code>
                            </div>
                        </div>

                        {/* Response Path */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Response Path (Dot Notation)
                            </label>
                            <input
                                type="text"
                                value={responsePath}
                                onChange={(e) => setResponsePath(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                            <div style={{ fontSize: 12, marginTop: 6, color: '#6b7280', lineHeight: 1.4 }}>
                                Example: <code>choices.0.message.content</code> (OpenAI) or <code>response</code> (Ollama)
                            </div>
                        </div>

                        {/* Test Prompt */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Test Prompt
                            </label>
                            <input
                                type="text"
                                value={testPrompt}
                                onChange={(e) => setTestPrompt(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Connection Test Button */}
                        <button
                            onClick={handleConnectionTest}
                            disabled={testing}
                            className="transition-all duration-200"
                            style={{
                                background: testing ? '#93c5fd' : '#2563eb',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: testing ? 'not-allowed' : 'pointer',
                                width: '100%',
                                opacity: testing ? 0.85 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!testing) e.currentTarget.style.background = '#1d4ed8';
                            }}
                            onMouseLeave={(e) => {
                                if (!testing) e.currentTarget.style.background = '#2563eb';
                            }}
                        >
                            {testing ? 'Testing...' : 'Connection Test'}
                        </button>

                        {/* Connection Test Result */}
                        {testResult ? (
                            <div
                                style={{
                                    border: `1px solid ${testResult.ok ? '#86efac' : '#fca5a5'}`,
                                    background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                                    borderRadius: 10,
                                    padding: 14,
                                    marginTop: 6,
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color: testResult.ok ? '#166534' : '#991b1b',
                                        marginBottom: 6,
                                    }}
                                >
                                    {testResult.ok ? '✅ Connector Test Successful' : '❌ Connector Test Failed'}
                                </div>

                                <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4 }}>
                                    {testResult.message}
                                </div>

                                {typeof testResult.latency_ms === 'number' ? (
                                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                                        Latency: <b>{testResult.latency_ms} ms</b>
                                    </div>
                                ) : null}

                                {testResult.extracted_response ? (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>
                                            Extracted Response
                                        </div>
                                        <div
                                            style={{
                                                background: '#ffffff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 8,
                                                padding: 10,
                                                fontSize: 12,
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {testResult.extracted_response}
                                        </div>
                                    </div>
                                ) : null}

                                {testResult.raw_preview ? (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>
                                            Raw Response Preview
                                        </div>
                                        <div
                                            style={{
                                                background: '#ffffff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 8,
                                                padding: 10,
                                                fontSize: 12,
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                maxHeight: 140,
                                                overflow: 'auto',
                                            }}
                                        >
                                            {testResult.raw_preview}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </SettingsCard>

                {/* Section 2: Rule Configuration */}
                <SettingsCard title="Rule Configuration">
                    <div className="space-y-5">
                        {/* Drift Threshold Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Drift Threshold
                                </label>
                                <span className="text-sm font-semibold text-gray-900">
                                    {Math.round(driftThreshold * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={driftThreshold}
                                onChange={(e) => setDriftThreshold(parseFloat(e.target.value))}
                                className="w-full"
                                style={{
                                    accentColor: '#3b82f6',
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0</span>
                                <span>0.5</span>
                                <span>1.0</span>
                            </div>
                        </div>

                        {/* Bias Threshold Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Bias Threshold
                                </label>
                                <span className="text-sm font-semibold text-gray-900">
                                    {Math.round(biasThreshold * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={biasThreshold}
                                onChange={(e) => setBiasThreshold(parseFloat(e.target.value))}
                                className="w-full"
                                style={{
                                    accentColor: '#3b82f6',
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0</span>
                                <span>0.3</span>
                                <span>0.6</span>
                                <span>1.0</span>
                            </div>
                        </div>

                        {/* Rule Toggles */}
                        <div className="space-y-3 pt-2">
                            <ToggleSwitch
                                label="Drift Threshold Rate Rule"
                                checked={driftRateRule}
                                onChange={setDriftRateRule}
                            />
                            <ToggleSwitch
                                label="Bias Threshold Rules"
                                checked={biasThresholdRules}
                                onChange={setBiasThresholdRules}
                            />
                            <ToggleSwitch
                                label="Bias Threshold Notation Rules"
                                checked={biasNotationRules}
                                onChange={setBiasNotationRules}
                            />
                            <ToggleSwitch
                                label="Formate Configuration Rule"
                                checked={formateConfigRule}
                                onChange={setFormateConfigRule}
                            />
                            <ToggleSwitch
                                label="Buror Avamoration Rules"
                                checked={burorRules}
                                onChange={setBurorRules}
                            />
                        </div>
                    </div>
                </SettingsCard>

                {/* Section 3: Notification Settings */}
                <SettingsCard title="Notification Settings">
                    <div className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                            />
                        </div>

                        {/* Slack/Teams Webhook */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Slack/Teams Webhook
                            </label>
                            <input
                                type="text"
                                value={webhook}
                                onChange={(e) => setWebhook(e.target.value)}
                                className="w-full"
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                            />
                        </div>

                        {/* Severity Filter */}
                        <div className="pt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                Severity Filter
                            </label>
                            <div className="space-y-3">
                                <SeverityToggle
                                    label="Severity"
                                    color="#8b5cf6"
                                    checked={severityFilter}
                                    onChange={setSeverityFilter}
                                />
                                <SeverityToggle
                                    label="High"
                                    color="#10b981"
                                    checked={highFilter}
                                    onChange={setHighFilter}
                                />
                                <SeverityToggle
                                    label="Medium"
                                    color="#f59e0b"
                                    checked={mediumFilter}
                                    onChange={setMediumFilter}
                                />
                                <SeverityToggle
                                    label="Low"
                                    color="#ef4444"
                                    checked={lowFilter}
                                    onChange={setLowFilter}
                                />
                            </div>
                        </div>
                    </div>
                </SettingsCard>
            </div>
        </div>
    );
}

// Settings Card Component
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '28px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
        >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{title}</h2>
            {children}
        </div>
    );
}

// Toggle Switch Component
function ToggleSwitch({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className="transition-all duration-200"
                style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: checked ? '#3b82f6' : '#d1d5db',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                <div
                    className="transition-all duration-200"
                    style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: checked ? '26px' : '2px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                />
            </button>
        </div>
    );
}

// Severity Toggle Component with Color Indicator
function SeverityToggle({
    label,
    color,
    checked,
    onChange,
}: {
    label: string;
    color: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: color,
                    }}
                />
                <span className="text-sm text-gray-700">{label}</span>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className="transition-all duration-200"
                style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: checked ? '#3b82f6' : '#d1d5db',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                <div
                    className="transition-all duration-200"
                    style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: checked ? '26px' : '2px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                />
            </button>
        </div>
    );
}
