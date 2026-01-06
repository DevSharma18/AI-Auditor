'use client';

import { useState } from 'react';
import { SearchX } from 'lucide-react';

// Sample incident data
const sampleIncidents = [
    {
        id: '1',
        severity: 'Critical',
        incidentType: 'Incident Rooks Incident',
        model: 'Condon',
        date: '04/11/2023 08:17:25',
        ruleViolated: 'Rule Violated: Stilmare or Marnand',
    },
    {
        id: '2',
        severity: 'Critical',
        incidentType: 'Incident Committon Systems',
        model: 'Angen 213',
        date: '04/11/2023 08:17:28',
        ruleViolated: 'Rule Violated: Determinative Accessfoilit...',
    },
    {
        id: '3',
        severity: 'High',
        incidentType: 'Incident Rooks Incident',
        model: 'KentikeitA',
        date: '04/11/2023 09:17:23',
        ruleViolated: 'Rule Violated: Determinative Accessfoilit...',
    },
    {
        id: '4',
        severity: 'Critical',
        incidentType: 'Incident Rooks Incident',
        model: 'PonferB',
        date: '04/11/2023 09:12:06',
        ruleViolated: 'Rule Violated: Refinam Examplees',
    },
    {
        id: '5',
        severity: 'High',
        incidentType: 'Incident Committon Systems',
        model: 'Angen 2E3',
        date: '04/11/2023 09:17:24',
        ruleViolated: 'Rule Violated: Determinative Accessfoilit...',
    },
    {
        id: '6',
        severity: 'High',
        incidentType: 'Incident Rooks Incident',
        model: 'KectoeNM',
        date: '04/11/2023 09:12:24',
        ruleViolated: 'Rule Violated: Refinam Examplees',
    },
    {
        id: '7',
        severity: 'High',
        incidentType: 'Incident Committon Systems',
        model: 'Bentai AY',
        date: '04/11/2023 09:12:06',
        ruleViolated: 'Rule Violated: Recomminative Accessfinlit...',
    },
    {
        id: '8',
        severity: 'High',
        incidentType: 'Incident Rooks Incident',
        model: 'BonferM',
        date: '04/11/2023 19:35:05',
        ruleViolated: 'Rule Violated: Refinam Examplees',
    },
    {
        id: '9',
        severity: 'High',
        incidentType: 'Incident Committon Systems',
        model: 'Aagen 611',
        date: '04/11/2023 19:35:06',
        ruleViolated: 'Rule Violated: Renasmahive Accessoilit...',
    },
    {
        id: '10',
        severity: 'High',
        incidentType: 'Incident Rooks Incident',
        model: 'KontcvdX',
        date: '04/11/2023 19:33:04',
        ruleViolated: 'Rule Violated: Refinam Examplees',
    },
    {
        id: '11',
        severity: 'High',
        incidentType: 'Incident Committon Systems',
        model: 'Modal SS',
        date: '04/11/2023 19:33:08',
        ruleViolated: 'Rule Violated: Renasmahive Accessoilit...',
    },
    {
        id: '12',
        severity: 'High',
        incidentType: 'Incident Rooks Incident',
        model: 'Bamol 5f3',
        date: '04/11/2023 19:33:03',
        ruleViolated: 'Rule Violated: Refinam Examplees',
    },
];

export default function IncidentsPage() {
    const [severityFilter, setSeverityFilter] = useState<string>('All');
    const [modelFilter, setModelFilter] = useState<string>('All');

    // Get unique models for filter dropdown
    const uniqueModels = ['All', ...Array.from(new Set(sampleIncidents.map(i => i.model)))];

    // Filter incidents
    const filteredIncidents = sampleIncidents.filter(incident => {
        const matchesSeverity = severityFilter === 'All' || incident.severity === severityFilter;
        const matchesModel = modelFilter === 'All' || incident.model === modelFilter;
        return matchesSeverity && matchesModel;
    });

    return (
        <div style={{ background: '#fafafa', minHeight: '100vh' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Incidents Page</h1>
            </div>

            {/* Filter Bar */}
            <div
                className="mb-6"
                style={{
                    background: '#ffffff',
                    padding: '20px 24px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}
            >
                {/* Severity Filter */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Severity</span>
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        style={{
                            padding: '8px 32px 8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#ffffff',
                            cursor: 'pointer',
                            minWidth: '140px',
                        }}
                    >
                        <option value="All">All</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>

                {/* Model Filter */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Model</span>
                    <select
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                        style={{
                            padding: '8px 32px 8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#ffffff',
                            cursor: 'pointer',
                            minWidth: '140px',
                        }}
                    >
                        {uniqueModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Filter Button */}
                <button
                    style={{
                        padding: '8px 20px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#374151',
                        fontWeight: '500',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="4" y1="21" x2="4" y2="14" />
                        <line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" />
                        <line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" />
                        <line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                    Filter
                </button>
            </div>

            {/* Incidents Table */}
            <div
                style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                }}
            >
                {/* Table Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 140px 180px 1.5fr',
                        gap: '16px',
                        padding: '16px 24px',
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                    }}
                >
                    <div className="text-sm font-semibold text-gray-700">Severity</div>
                    <div className="text-sm font-semibold text-gray-700">Incident Type</div>
                    <div className="text-sm font-semibold text-gray-700">Model</div>
                    <div className="text-sm font-semibold text-gray-700">Date</div>
                    <div className="text-sm font-semibold text-gray-700">Rule Violated</div>
                </div>

                {/* Table Body */}
                <div>
                    {filteredIncidents.length === 0 ? (
                        <div
                            style={{
                                padding: '60px 24px',
                                textAlign: 'center',
                                color: '#9ca3af',
                            }}
                        >
                            <div className="flex justify-center mb-3">
                                <SearchX size={48} className="text-gray-400" />
                            </div>
                            <div className="text-lg font-medium text-gray-600">No incidents found</div>
                            <div className="text-sm text-gray-500 mt-2">
                                Try adjusting your filters
                            </div>
                        </div>
                    ) : (
                        filteredIncidents.map((incident, index) => (
                            <div
                                key={incident.id}
                                className="transition-all duration-150"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '120px 1fr 140px 180px 1.5fr',
                                    gap: '16px',
                                    padding: '16px 24px',
                                    borderBottom: index < filteredIncidents.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                {/* Severity Badge */}
                                <div>
                                    <span
                                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                                        style={{
                                            background: incident.severity === 'Critical' ? '#dc2626' : '#f97316',
                                            color: 'white',
                                        }}
                                    >
                                        {incident.severity}
                                    </span>
                                </div>

                                {/* Incident Type */}
                                <div className="text-sm text-gray-900">
                                    {incident.incidentType}
                                </div>

                                {/* Model */}
                                <div className="text-sm text-gray-700">
                                    {incident.model}
                                </div>

                                {/* Date */}
                                <div className="text-sm text-gray-700">
                                    {incident.date}
                                </div>

                                {/* Rule Violated */}
                                <div className="text-sm text-gray-700">
                                    {incident.ruleViolated}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Results Summary */}
            {filteredIncidents.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredIncidents.length} of {sampleIncidents.length} incidents
                </div>
            )}
        </div>
    );
}
