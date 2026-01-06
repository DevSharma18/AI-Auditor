'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    // Authentication disabled for now - will be added later
    // useEffect(() => {
    //     // Check if user is authenticated
    //     const isAuthenticated = sessionStorage.getItem('isAuthenticated');

    //     if (isAuthenticated !== 'true') {
    //         // Redirect to login if not authenticated
    //         router.push('/login');
    //     }
    // }, [router]);

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1" style={{ background: '#fafafa' }}>
                {/* Header */}
                <div
                    className="flex justify-between items-center"
                    style={{
                        padding: '20px 40px',
                        background: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                    }}
                >
                    <div>{/* Spacer */}</div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <button
                            className="relative transition-all duration-200"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#666666"
                                strokeWidth="2"
                            >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {/* Red notification badge */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    width: '8px',
                                    height: '8px',
                                    background: '#ef4444',
                                    borderRadius: '50%',
                                    border: '2px solid #ffffff',
                                }}
                            />
                        </button>

                        {/* User Avatar */}
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#d1d5db',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ padding: '32px 40px' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
