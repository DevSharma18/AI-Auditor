'use client';

import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartProps {
    data: { name: string; value: number }[];
    colors: string[];
    title?: string;
}

export default function PieChart({ data, colors, title }: PieChartProps) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            {title && (
                <h4
                    style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#333333',
                        marginBottom: '16px',
                        textAlign: 'center'
                    }}
                >
                    {title}
                </h4>
            )}
            <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0px'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="square"
                    />
                </RechartsPie>
            </ResponsiveContainer>
        </div>
    );
}
