'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Validate credentials
        if (formData.username.trim() === 'admin' && formData.password === 'admin') {
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('username', formData.username.trim());
            router.push('/');
        } else {
            setError('Invalid credentials. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex justify-center items-center min-h-screen w-full p-5"
            style={{
                background: '#4f46e5',
                boxSizing: 'border-box'
            }}
        >
            <div
                className="bg-white w-full max-w-[420px] animate-[slideIn_0.4s_ease-out]"
                style={{
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    padding: '48px'
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="m-0 mb-2"
                        style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1a1a1a'
                        }}
                    >
                        AI Auditor
                    </h1>
                    <p
                        className="m-0"
                        style={{
                            fontSize: '14px',
                            color: '#6b7280'
                        }}
                    >
                        Sign in to your account
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        className="mb-6 animate-[shake_0.3s_ease]"
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* User ID Field */}
                    <div className="mb-6">
                        <label
                            htmlFor="username"
                            className="block mb-2"
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#374151'
                            }}
                        >
                            User ID
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Enter your user ID"
                            autoComplete="username"
                            disabled={isLoading}
                            required
                            className="w-full outline-none transition-all duration-300"
                            style={{
                                padding: '12px 16px',
                                fontSize: '15px',
                                fontFamily: 'Inter, sans-serif',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = '#667eea';
                                (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                                (e.target as HTMLInputElement).style.boxShadow = 'none';
                            }}
                            onMouseEnter={(e) => {
                                if (document.activeElement !== e.target) {
                                    (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (document.activeElement !== e.target) {
                                    (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                                }
                            }}
                        />
                    </div>

                    {/* Password Field */}
                    <div className="mb-6">
                        <label
                            htmlFor="password"
                            className="block mb-2"
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#374151'
                            }}
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isLoading}
                                required
                                className="w-full outline-none transition-all duration-300"
                                style={{
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    fontFamily: 'Inter, sans-serif',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    (e.target as HTMLInputElement).style.borderColor = '#667eea';
                                    (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                                }}
                                onBlur={(e) => {
                                    (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                                    (e.target as HTMLInputElement).style.boxShadow = 'none';
                                }}
                                onMouseEnter={(e) => {
                                    if (document.activeElement !== e.target) {
                                        (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (document.activeElement !== e.target) {
                                        (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute flex items-center justify-center"
                                style={{
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '4px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#6b7280';
                                }}
                                tabIndex={-1}
                                disabled={isLoading}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            marginTop: '32px',
                            padding: '14px',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'white',
                            background: '#4f46e5',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onMouseDown={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
