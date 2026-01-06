'use client';

import { useState } from 'react';
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
    data: {
        oneMonth: { name: string; value: number }[];
        sixMonths: { name: string; value: number }[];
        oneYear: { name: string; value: number }[];
    };
    color: string;
    title?: string;
}

export default function BarChart({ data, color, title }: BarChartProps) {
    const [timePeriod, setTimePeriod] = useState<'oneMonth' | 'sixMonths' | 'oneYear'>('oneMonth');

    const currentData = data[timePeriod];

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                {title && (
                    <h4
                        style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333333',
                            margin: 0
                        }}
                    >
                        {title}
                    </h4>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { key: 'oneMonth', label: '1M' },
                        { key: 'sixMonths', label: '6M' },
                        { key: 'oneYear', label: '1Y' }
                    ].map((period) => (
                        <button
                            key={period.key}
                            onClick={() => setTimePeriod(period.key as typeof timePeriod)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0px',
                                background: timePeriod === period.key ? '#333333' : '#ffffff',
                                color: timePeriod === period.key ? '#ffffff' : '#666666',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (timePeriod !== period.key) {
                                    e.currentTarget.style.background = '#f5f5f5';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (timePeriod !== period.key) {
                                    e.currentTarget.style.background = '#ffffff';
                                }
                            }}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
                <RechartsBar data={currentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: '#666666', fontSize: 12 }}
                        stroke="#e0e0e0"
                    />
                    <YAxis
                        tick={{ fill: '#666666', fontSize: 12 }}
                        stroke="#e0e0e0"
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0px'
                        }}
                    />
                    <Bar dataKey="value" fill={color} />
                </RechartsBar>
            </ResponsiveContainer>
        </div>
    );
}
