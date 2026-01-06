'use client';

import { useState } from 'react';

export default function SettingsPage() {
    // Model Integration state
    const [modelEndpoint, setModelEndpoint] = useState('https://model.endpoint.com/');
    const [apiKey, setApiKey] = useState('sk_test_1234567890abcdef');

    // Rule Configuration state
    const [driftThreshold, setDriftThreshold] = useState(0.5);
    const [biasThreshold, setBiasThreshold] = useState(0.3);
    const [driftRateRule, setDriftRateRule] = useState(true);
    const [biasThresholdRules, setBiasThresholdRules] = useState(false);
    const [biasNotationRules, setBiasNotationRules] = useState(true);
    const [formateConfigRule, setFormateConfigRule] = useState(true);
    const [burorRules, setBurorRules] = useState(true);

    // Notification Settings state
    const [email, setEmail] = useState('');
    const [webhook, setWebhook] = useState('');
    const [severityFilter, setSeverityFilter] = useState(true);
    const [highFilter, setHighFilter] = useState(false);
    const [mediumFilter, setMediumFilter] = useState(false);
    const [lowFilter, setLowFilter] = useState(false);

    const handleConnectionTest = () => {
        alert('Testing connection...');
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
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
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
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>

                        {/* Connection Test Button */}
                        <button
                            onClick={handleConnectionTest}
                            className="transition-all duration-200"
                            style={{
                                background: '#2563eb',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#1d4ed8';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#2563eb';
                            }}
                        >
                            Connection Test
                        </button>
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
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
