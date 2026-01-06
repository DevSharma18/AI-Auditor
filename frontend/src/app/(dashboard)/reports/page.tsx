'use client';

import { useState } from 'react';

// Sample custom models (would come from Model Manager API in real app)
const customModels = [
    { id: '1', nickname: 'GPT-4 Production', provider: 'OpenAI' },
    { id: '2', nickname: 'Claude Enterprise', provider: 'Anthropic' },
    { id: '3', nickname: 'Custom LLM v2', provider: 'Custom' },
];

const auditCategories = ['Bias', 'Hallucination', 'PII', 'Compliance', 'Drift'];

export default function AuditsPage() {
    const [activeTab, setActiveTab] = useState<'model' | 'log'>('model');

    // Active Auditing State
    const [selectedModel, setSelectedModel] = useState('');
    const [testPrompts, setTestPrompts] = useState('');
    const [iterations, setIterations] = useState('10');
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Bias', 'Hallucination']);

    // Passive Auditing State
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [samplingRate, setSamplingRate] = useState('100');
    const [selectedPassiveCategories, setSelectedPassiveCategories] = useState<string[]>(['Compliance', 'PII']);

    const toggleCategory = (category: string, isActive: boolean) => {
        if (isActive) {
            setSelectedCategories(prev =>
                prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
            );
        } else {
            setSelectedPassiveCategories(prev =>
                prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
            );
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh' }}>
            {/* Page Header */}
            <div
                style={{
                    marginBottom: '32px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #e5e7eb',
                }}
            >
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' }}>
                    Audits
                </h1>
                <p style={{ fontSize: '14px', color: '#666666', marginTop: '8px' }}>
                    Perform model auditing on custom models or log auditing on ingested logs
                </p>
            </div>

            {/* Tab Navigation */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '32px',
                    borderBottom: '2px solid #e5e7eb',
                }}
            >
                <button
                    onClick={() => setActiveTab('model')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'model' ? '#1a1a1a' : 'transparent',
                        color: activeTab === 'model' ? '#ffffff' : '#666666',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        borderBottom: activeTab === 'model' ? '2px solid #1a1a1a' : '2px solid transparent',
                        marginBottom: '-2px',
                    }}
                >
                    Model Auditing
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    style={{
                        padding: '12px 24px',
                        background: activeTab === 'log' ? '#1a1a1a' : 'transparent',
                        color: activeTab === 'log' ? '#ffffff' : '#666666',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        borderBottom: activeTab === 'log' ? '2px solid #1a1a1a' : '2px solid transparent',
                        marginBottom: '-2px',
                    }}
                >
                    Log Auditing
                </button>
            </div>

            {/* Model Auditing Content */}
            {activeTab === 'model' && (
                <div>
                    <div
                        style={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            padding: '32px',
                            marginBottom: '24px',
                        }}
                    >
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '24px' }}>
                            Configure Model Audit
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Left Column */}
                            <div>
                                {/* Model Selection */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Select Model <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                            background: '#ffffff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="">Choose a custom model</option>
                                        {customModels.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.nickname} ({model.provider})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Test Iterations */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Number of Test Iterations
                                    </label>
                                    <input
                                        type="number"
                                        value={iterations}
                                        onChange={(e) => setIterations(e.target.value)}
                                        min="1"
                                        max="1000"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                        }}
                                    />
                                </div>

                                {/* Audit Categories */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Audit Categories
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {auditCategories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => toggleCategory(category, true)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: selectedCategories.includes(category) ? '#1a1a1a' : '#ffffff',
                                                    color: selectedCategories.includes(category) ? '#ffffff' : '#666666',
                                                    border: `1px solid ${selectedCategories.includes(category) ? '#1a1a1a' : '#d1d5db'}`,
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Test Prompts */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                    Test Prompts <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={testPrompts}
                                    onChange={(e) => setTestPrompts(e.target.value)}
                                    placeholder="Enter test prompts, one per line..."
                                    style={{
                                        width: '100%',
                                        height: '280px',
                                        padding: '12px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: '#666666', marginTop: '8px' }}>
                                    Enter one prompt per line. The model will be tested with each prompt.
                                </p>
                            </div>
                        </div>

                        {/* Start Audit Button */}
                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                style={{
                                    padding: '14px 32px',
                                    background: '#1a1a1a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#333333';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#1a1a1a';
                                }}
                            >
                                Start Model Audit
                            </button>
                        </div>
                    </div>

                    {/* Model Audits Results Section */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>
                            Recent Model Audits
                        </h3>
                        <div
                            style={{
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                padding: '40px',
                                textAlign: 'center',
                                color: '#666666',
                            }}
                        >
                            <p>No model audits yet. Start your first audit above.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Auditing Content */}
            {activeTab === 'log' && (
                <div>
                    <div
                        style={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            padding: '32px',
                            marginBottom: '24px',
                        }}
                    >
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '24px' }}>
                            Configure Log Audit
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Left Column */}
                            <div>
                                {/* File Upload */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Upload Log File <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div
                                        style={{
                                            border: '2px dashed #d1d5db',
                                            padding: '32px',
                                            textAlign: 'center',
                                            background: '#fafafa',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept=".csv,.json,.txt"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                            id="file-upload"
                                        />
                                        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                                            <div style={{ fontSize: '14px', color: '#666666' }}>
                                                {uploadedFile ? (
                                                    <div>
                                                        <p style={{ fontWeight: '600', color: '#1a1a1a' }}>{uploadedFile.name}</p>
                                                        <p style={{ fontSize: '12px', marginTop: '4px' }}>
                                                            {(uploadedFile.size / 1024).toFixed(2)} KB
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p style={{ fontWeight: '600', color: '#1a1a1a' }}>Click to browse or drag and drop</p>
                                                        <p style={{ fontSize: '12px', marginTop: '4px' }}>
                                                            Supported formats: CSV, JSON, TXT
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Date Range (Optional)
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            style={{
                                                padding: '12px',
                                                border: '1px solid #d1d5db',
                                                fontSize: '14px',
                                            }}
                                        />
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            style={{
                                                padding: '12px',
                                                border: '1px solid #d1d5db',
                                                fontSize: '14px',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Sampling Rate */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Sampling Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={samplingRate}
                                        onChange={(e) => setSamplingRate(e.target.value)}
                                        min="1"
                                        max="100"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                        }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#666666', marginTop: '4px' }}>
                                        100% analyzes all logs, lower values sample randomly
                                    </p>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                {/* Audit Categories */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                        Audit Categories
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {auditCategories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => toggleCategory(category, false)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: selectedPassiveCategories.includes(category) ? '#1a1a1a' : '#ffffff',
                                                    color: selectedPassiveCategories.includes(category) ? '#ffffff' : '#666666',
                                                    border: `1px solid ${selectedPassiveCategories.includes(category) ? '#1a1a1a' : '#d1d5db'}`,
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div
                                    style={{
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        padding: '16px',
                                        marginTop: '24px',
                                    }}
                                >
                                    <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                                        About Log Auditing
                                    </h4>
                                    <p style={{ fontSize: '12px', color: '#075985', lineHeight: '1.5' }}>
                                        Log auditing analyzes historical logs to identify patterns, compliance issues, and potential risks.
                                        Upload logs in CSV, JSON, or TXT format containing model interactions or responses.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Process Logs Button */}
                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                style={{
                                    padding: '14px 32px',
                                    background: '#1a1a1a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#333333';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#1a1a1a';
                                }}
                            >
                                Process Logs
                            </button>
                        </div>
                    </div>

                    {/* Log Audits Results Section */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>
                            Recent Log Audits
                        </h3>
                        <div
                            style={{
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                padding: '40px',
                                textAlign: 'center',
                                color: '#666666',
                            }}
                        >
                            <p>No log audits yet. Upload and process logs above.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
