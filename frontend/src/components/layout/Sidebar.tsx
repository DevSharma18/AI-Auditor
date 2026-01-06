'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

// Main navigation structure with nested items
const navItems = [
    {
        name: 'Dashboard',
        href: '/',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
        subItems: [
            {
                name: 'Drift',
                href: '/drift',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                ),
            },
            {
                name: 'Bias',
                href: '/bias',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                ),
            },
            {
                name: 'Hallucination',
                href: '/hallucination',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                    </svg>
                ),
            },
            {
                name: 'PII',
                href: '/pii',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ),
            },
            {
                name: 'Compliance',
                href: '/compliance',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                ),
            },
        ],
    },
    {
        name: 'Model Manager',
        href: '/model-manager',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
        ),
    },
    {
        name: 'Audits',
        href: '/reports',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
    },
    {
        name: 'Settings',
        href: '/settings',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDashboardExpanded, setIsDashboardExpanded] = useState(true);

    const handleLogout = () => {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('username');
        router.push('/login');
    };

    return (
        <aside
            className="relative flex flex-col transition-all duration-300"
            style={{
                width: isCollapsed ? '70px' : '220px',
                minHeight: '100vh',
                background: '#f5f5f5',
                borderRight: '1px solid #e5e7eb',
            }}
        >
            {/* Collapse/Expand Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute transition-all duration-200"
                style={{
                    top: '20px',
                    right: '-12px',
                    width: '24px',
                    height: '24px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#666666"
                    strokeWidth="2"
                    style={{
                        transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Logo Section */}
            <Link
                href="/"
                className="flex items-center transition-all duration-300"
                style={{
                    padding: isCollapsed ? '24px 0' : '24px 16px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                }}
            >
                {!isCollapsed ? (
                    <div className="flex flex-col">
                        <span className="font-bold" style={{ fontSize: '18px', color: '#1a1a1a' }}>AI Auditor</span>
                        <span className="text-xs font-medium" style={{ color: '#888888' }}>Enterprise Suite</span>
                    </div>
                ) : (
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' }}>AI</div>
                )}
            </Link>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => pathname === sub.href));
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                        <div key={item.name}>
                            {/* Main navigation item */}
                            {hasSubItems ? (
                                <div
                                    className="w-full flex items-center justify-between transition-all duration-200"
                                    style={{
                                        padding: isCollapsed ? '12px 0' : '12px 14px',
                                        background: isActive ? '#e5e7eb' : 'transparent',
                                        color: isActive ? '#1a1a1a' : '#666666',
                                        marginBottom: '4px',
                                        justifyContent: isCollapsed ? 'center' : 'space-between',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) e.currentTarget.style.background = '#f0f0f0';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {/* Clickable area for navigation */}
                                    <Link
                                        href={item.href}
                                        className="flex items-center gap-3 flex-1"
                                        style={{
                                            textDecoration: 'none',
                                            color: 'inherit',
                                        }}
                                    >
                                        <div style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                                            {item.icon}
                                        </div>
                                        {!isCollapsed && (
                                            <span className="font-medium text-sm">{item.name}</span>
                                        )}
                                    </Link>

                                    {/* Arrow button for toggling submenu */}
                                    {!isCollapsed && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsDashboardExpanded(!isDashboardExpanded);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                style={{
                                                    transform: isDashboardExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s ease',
                                                }}
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="flex items-center gap-3 transition-all duration-200"
                                    style={{
                                        padding: isCollapsed ? '12px 0' : '12px 14px',
                                        background: isActive ? '#e5e7eb' : 'transparent',
                                        color: isActive ? '#1a1a1a' : '#666666',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        marginBottom: '4px',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) e.currentTarget.style.background = '#f0f0f0';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <div style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                                        {item.icon}
                                    </div>
                                    {!isCollapsed && (
                                        <span className="font-medium text-sm">{item.name}</span>
                                    )}
                                </Link>
                            )}

                            {/* Sub-items (only shown when expanded and Dashboard is expanded) */}
                            {hasSubItems && isDashboardExpanded && !isCollapsed && (
                                <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                                    {item.subItems.map((subItem) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.name}
                                                href={subItem.href}
                                                className="flex items-center gap-3 transition-all duration-200"
                                                style={{
                                                    padding: '10px 14px',
                                                    background: isSubActive ? '#d1d5db' : 'transparent',
                                                    color: isSubActive ? '#1a1a1a' : '#666666',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    marginBottom: '2px',
                                                    fontSize: '13px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSubActive) e.currentTarget.style.background = '#e5e7eb';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSubActive) e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                                                    {subItem.icon}
                                                </div>
                                                <span className="font-medium">{subItem.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div
                style={{
                    padding: isCollapsed ? '20px 0' : '20px 16px',
                    borderTop: '1px solid #e5e7eb',
                }}
            >
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 transition-all duration-200"
                    style={{
                        padding: isCollapsed ? '12px 0' : '12px 14px',
                        background: 'transparent',
                        border: 'none',
                        color: '#666666',
                        cursor: 'pointer',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
