'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { token, user } = response.data;
      setAuth(user, token);
      
      // Small delay to ensure state is persisted before redirect
      setTimeout(() => {
        if (user.mustChangePassword) {
          router.push('/change-password');
        } else {
          router.push('/dashboard');
        }
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--teal-500)' }}
          >
            <svg className="w-10 h-10" style={{ color: 'var(--navy-900)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">
            The<span style={{ color: 'var(--teal-500)' }}>RxOS</span>
          </h1>
          <p className="mt-2" style={{ color: 'var(--slate-400)' }}>Pharmacy Optimization Platform</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>

          {error && (
            <div 
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: 'var(--red-100)', color: '#991b1b' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@pharmacy.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--slate-400)' }}>
            Need help? Contact{' '}
            <a href="mailto:support@therxos.app" className="hover:text-[var(--teal-400)]" style={{ color: 'var(--teal-500)' }}>
              support@therxos.app
            </a>
          </div>
        </div>

        <p className="text-center text-sm mt-8" style={{ color: 'var(--slate-500)' }}>
          © {new Date().getFullYear()} TheRxOS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
