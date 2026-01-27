'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, updateUser } = useAuthStore();

  const mustChange = user?.mustChangePassword;

  // Redirect if not authenticated
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);

      // Update user state to remove mustChangePassword flag
      updateUser({ mustChangePassword: false });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password. Please try again.');
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-900)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--amber-500)' }}
          >
            <Shield className="w-10 h-10" style={{ color: 'var(--navy-900)' }} />
          </div>
          <h1 className="text-3xl font-bold">
            The<span style={{ color: 'var(--teal-500)' }}>RxOS</span>
          </h1>
          <p className="mt-2" style={{ color: 'var(--slate-400)' }}>Password Update Required</p>
        </div>

        {/* Change Password Card */}
        <div className="card p-8">
          {mustChange && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg" style={{ background: 'var(--amber-100)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#92400e' }} />
              <p className="text-sm" style={{ color: '#92400e' }}>
                You must change your password before continuing.
              </p>
            </div>
          )}

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
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--slate-400)' }}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                New Password
              </label>
              <input
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--slate-300)' }}>
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="btn btn-primary w-full justify-center py-3 text-base mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-8" style={{ color: 'var(--slate-500)' }}>
          Need help? Contact{' '}
          <a href="mailto:stan@therxos.com" className="hover:text-[var(--teal-400)]" style={{ color: 'var(--teal-500)' }}>
            stan@therxos.com
          </a>
        </p>
      </div>
    </div>
  );
}
