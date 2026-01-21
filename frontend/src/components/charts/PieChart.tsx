'use client';

import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';

interface PieChartProps {
    data: { name: string; value: number }[];
    colors: string[];
    title?: string;
}

export default function PieChart({ data, colors, title }: PieChartProps) {
    const safeData = Array.isArray(data)
        ? data.map((x) => ({
              name: String(x?.name ?? ''),
              value: Number(x?.value ?? 0),
          }))
        : [];

    const isEmpty = safeData.length === 0 || safeData.every((d) => Number(d.value) === 0);

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {title && (
                <h4
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#333333',
                        marginBottom: 16,
                        textAlign: 'center',
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                    }}
                >
                    {title}
                </h4>
            )}

            <ResponsiveContainer width="100%" height={250}>
                {isEmpty ? (
                    <div
                        style={{
                            height: 250,
                            border: '2px dashed #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        No data yet
                    </div>
                ) : (
                    <RechartsPieChart>
                        <Pie
                            data={safeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                                `${name}: ${(((percent ?? 0) * 100) || 0).toFixed(0)}%`
                            }
                            outerRadius={80}
                            dataKey="value"
                        >
                            {safeData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                />
                            ))}
                        </Pie>

                        <Tooltip
                            contentStyle={{
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: 0,
                            }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="square" />
                    </RechartsPieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
