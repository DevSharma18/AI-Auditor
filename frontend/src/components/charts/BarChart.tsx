'use client';

import { useMemo, useState } from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

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

    const currentData = useMemo(() => {
        const arr = data?.[timePeriod];
        if (!Array.isArray(arr)) return [];
        return arr.map((x) => ({
            name: String(x?.name ?? ''),
            value: Number(x?.value ?? 0),
        }));
    }, [data, timePeriod]);

    const empty = currentData.length === 0;

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                {title ? (
                    <h4
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#333333',
                            margin: 0,
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                        }}
                    >
                        {title}
                    </h4>
                ) : (
                    <div />
                )}

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {[
                        { key: 'oneMonth', label: '1M' },
                        { key: 'sixMonths', label: '6M' },
                        { key: 'oneYear', label: '1Y' },
                    ].map((period) => {
                        const active = timePeriod === period.key;
                        return (
                            <button
                                key={period.key}
                                onClick={() => setTimePeriod(period.key as typeof timePeriod)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 0,
                                    background: active ? '#111827' : '#ffffff',
                                    color: active ? '#ffffff' : '#6b7280',
                                    cursor: 'pointer',
                                }}
                            >
                                {period.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ width: '100%', height: 250 }}>
                {empty ? (
                    <div
                        style={{
                            height: '100%',
                            border: '2px dashed #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        No trend data yet (run more audits)
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={currentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                stroke="#e5e7eb"
                            />
                            <YAxis
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                stroke="#e5e7eb"
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 0,
                                    fontSize: 12,
                                }}
                            />
                            <Bar dataKey="value" fill={color} radius={[0, 0, 0, 0]} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
