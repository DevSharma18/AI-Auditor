'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [metricsOpen, setMetricsOpen] = useState(true);

    const isActive = (href: string) =>
        pathname === href ? '#e5e7eb' : 'transparent';

    return (
        <aside
            style={{
                width: '220px',
                background: '#f5f5f5',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ padding: '24px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>
                    AI Auditor
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                    Enterprise Suite
                </div>
            </div>

            <nav style={{ padding: '0 8px', flex: 1 }}>
                <Link href="/" style={navItem(isActive('/'))}>
                    Dashboard
                </Link>

                <div>
                    <button
                        onClick={() => setMetricsOpen(!metricsOpen)}
                        style={{
                            ...navItem('#'),
                            width: '100%',
                            background: 'transparent',
                            textAlign: 'left',
                        }}
                    >
                        Metrics ▾
                    </button>

                    {metricsOpen && (
                        <div style={{ marginLeft: '12px' }}>
                            <Link href="/bias" style={navItem(isActive('/bias'))}>
                                Bias
                            </Link>
                            <Link
                                href="/hallucination"
                                style={navItem(isActive('/hallucination'))}
                            >
                                Hallucination
                            </Link>
                            <Link href="/pii" style={navItem(isActive('/pii'))}>
                                PII
                            </Link>
                            <Link
                                href="/compliance"
                                style={navItem(isActive('/compliance'))}
                            >
                                Compliance
                            </Link>
                            <Link href="/drift" style={navItem(isActive('/drift'))}>
                                Drift
                            </Link>
                        </div>
                    )}
                </div>

                {/* ✅ NEW: Executive Reports page below Metrics */}
                <Link
                    href="/executive-reports"
                    style={navItem(isActive('/executive-reports'))}
                >
                    Executive Reports
                </Link>

                <Link
                    href="/model-manager"
                    style={navItem(isActive('/model-manager'))}
                >
                    Model Manager
                </Link>

                {/* ✅ Reports is your audits page */}
                <Link href="/reports" style={navItem(isActive('/reports'))}>
                    Audits
                </Link>

                <Link href="/settings" style={navItem(isActive('/settings'))}>
                    Settings
                </Link>
            </nav>
        </aside>
    );
}

const navItem = (bg: string) => ({
    display: 'block',
    padding: '10px 14px',
    marginBottom: '4px',
    background: bg,
    color: '#1a1a1a',
    textDecoration: 'none',
    fontSize: '14px',
    borderRadius: '6px',
});
