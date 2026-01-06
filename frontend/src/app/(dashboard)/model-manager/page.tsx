'use client';

import { useState } from 'react';

const systemModels = [
    { id: '1', name: 'Grok 4 Fast', icon: 'X' },
    { id: '2', name: 'GPT-5', icon: 'GPT' },
    { id: '3', name: 'GPT-5 Mini', icon: 'GPT' },
    { id: '4', name: 'GPT-5 Nano', icon: 'GPT' },
    { id: '5', name: 'Grok 4 (0709)', icon: 'X' },
    { id: '6', name: 'Grok 3 Mini Fast', icon: 'X' },
    { id: '7', name: 'Gemini 2.5 Flash', icon: 'G' },
    { id: '8', name: 'Gemini 2.5 Flash Lite', icon: 'G' },
    { id: '9', name: 'Gemini 2.5 Pro', icon: 'G' },
    { id: '10', name: 'Grok 3 Fast', icon: 'X' },
    { id: '11', name: 'Claude Opus 4', icon: 'C' },
    { id: '12', name: 'Claude Sonnet 4', icon: 'C' },
    { id: '13', name: 'Gemini 2.5 Flash Preview 04-17', icon: 'G' },
    { id: '14', name: 'o4 mini', icon: 'O' },
    { id: '15', name: 'GPT-4.1', icon: 'GPT' },
    { id: '16', name: 'GPT-4.1 Mini', icon: 'GPT' },
    { id: '17', name: 'o3', icon: 'O' },
    { id: '18', name: 'O3 Mini', icon: 'O' },
    { id: '19', name: 'O1', icon: 'O' },
    { id: '20', name: 'O1 Mini', icon: 'O' },
    { id: '21', name: 'o1Pro', icon: 'O' },
    { id: '22', name: 'Claude Sonnet 3.7', icon: 'C' },
    { id: '23', name: 'Grok 3', icon: 'X' },
    { id: '24', name: 'Grok 3 Mini', icon: 'X' },
    { id: '25', name: 'Mistral Small 2503', icon: 'M' },
    { id: '26', name: 'Mistral Small 2501', icon: 'M' },
    { id: '27', name: 'Codestral 2501', icon: 'M' },
    { id: '28', name: 'Gemini 2.0 Flash 001', icon: 'G' },
    { id: '29', name: 'Llama 3.3 70B', icon: 'L' },
    { id: '30', name: 'Llama 3.3 8B', icon: 'L' },
    { id: '31', name: 'Gemini 2.0 Flash', icon: 'G' },
    { id: '32', name: 'Gemini 2.0 Flash-Lite', icon: 'G' },
];

// Info Button Component with Tooltip
function InfoButton({ tooltip }: { tooltip: string }) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </button>
            {showTooltip && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        background: '#4a5568',
                        color: '#ffffff',
                        padding: '10px 14px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        whiteSpace: 'normal',
                        zIndex: 1000,
                        pointerEvents: 'none',
                        maxWidth: '280px',
                        minWidth: '200px',
                        wordWrap: 'break-word',
                    }}
                >
                    {tooltip}
                    {/* Arrow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #4a5568',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default function ModelManagerPage() {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

    // Form state
    const [modelNickname, setModelNickname] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [modelProvider, setModelProvider] = useState('');
    const [description, setDescription] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState('');
    const [topP, setTopP] = useState(1.0);
    const [seed, setSeed] = useState('');

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #e5e7eb',
                }}
            >
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em' }}>
                    Model Manager
                </h1>
            </div>

            {/* Custom Models Section */}
            <div style={{ marginBottom: '40px' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                            Custom Models
                        </h2>
                        <InfoButton tooltip="Manage your custom AI models with personalized configurations" />
                    </div>
                </div>

                {/* Add custom model button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: '#ffffff',
                        border: '1px dashed #d1d5db',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#666666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#4f46e5';
                        e.currentTarget.style.color = '#4f46e5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.color = '#666666';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add custom model
                </button>
            </div>

            {/* Add Custom Model Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            width: '90%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '32px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                                    Add custom model
                                </h2>
                                <button
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Model Nickname */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                                        Model Nickname<span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <InfoButton tooltip="A friendly name to identify this custom model" />
                                </div>
                                <input
                                    type="text"
                                    value={modelNickname}
                                    onChange={(e) => setModelNickname(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                />
                            </div>

                            {/* API url */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                                        API url<span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <InfoButton tooltip="The endpoint URL for your custom model API" />
                                </div>
                                <input
                                    type="text"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                />
                            </div>

                            {/* API Key */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>API Key</label>
                                    <InfoButton tooltip="Authentication key for accessing the model API" />
                                </div>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                />
                            </div>

                            {/* Model Provider */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                                        Model Provider<span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <InfoButton tooltip="Select the AI provider for this custom model" />
                                </div>
                                <select
                                    value={modelProvider}
                                    onChange={(e) => setModelProvider(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        background: '#ffffff',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                >
                                    <option value="">Select provider</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="google">Google</option>
                                    <option value="mistral">Mistral</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical',
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                />
                            </div>

                            {/* Hide/Show Additional Details */}
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#1a1a1a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '0',
                                    }}
                                >
                                    {showAdditionalDetails ? 'Hide' : 'Show'} additional details
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{
                                            transform: showAdditionalDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                        }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            </div>

                            {/* Additional Details Section */}
                            {showAdditionalDetails && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Temperature */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>Temperature</label>
                                            <span style={{ fontSize: '14px', color: '#666666' }}>{temperature}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="0.1"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            style={{ width: '100%', accentColor: '#4f46e5' }}
                                        />
                                    </div>

                                    {/* Max tokens */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                            Max tokens
                                        </label>
                                        <input
                                            type="number"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                border: '1px solid #d1d5db',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                        />
                                    </div>

                                    {/* Top P */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>Top P</label>
                                            <span style={{ fontSize: '14px', color: '#666666' }}>{topP.toFixed(1)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={topP}
                                            onChange={(e) => setTopP(parseFloat(e.target.value))}
                                            style={{ width: '100%', accentColor: '#4f46e5' }}
                                        />
                                    </div>

                                    {/* Seed */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '8px' }}>
                                            Seed
                                        </label>
                                        <input
                                            type="number"
                                            value={seed}
                                            onChange={(e) => setSeed(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                border: '1px solid #d1d5db',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
                                            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 24px',
                                        background: '#ffffff',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#666666',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f5f5f5';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#ffffff';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={{
                                        flex: 1,
                                        padding: '12px 24px',
                                        background: '#4f46e5',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#4338ca';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#4f46e5';
                                    }}
                                >
                                    Add Model
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
