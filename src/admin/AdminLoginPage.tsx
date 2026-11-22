import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import type { BackendHealthStatus } from '../lib/types';
import { api } from '../services/apiClient';
import { NewLifeBrandLockup } from '../components/BrandLogo';

export function AdminLoginPage() {
  const { navigate, adminToken, setAdminSession, pushToast } = useApp();

  const [health, setHealth] = useState<BackendHealthStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [mode, setMode] = useState<'login' | 'claim' | 'reset'>('login');

  const [fullName, setFullName] = useState('Bijay Gupta');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (adminToken) {
      navigate('/admin');
      return;
    }
    api
      .getAuthStatus()
      .then((res) => {
        setHealth(res.health);
        if (!res.health.adminInitialized && res.health.authMode === 'local_claim') {
          setMode('claim');
        } else {
          setMode('login');
        }
      })
      .catch(() => {
        setError('Unable to reach server authentication endpoint.');
      })
      .finally(() => setLoadingStatus(false));
  }, [adminToken, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      const res = await api.loginAdmin({ email, password });
      setAdminSession(res.token, res.profile);
      pushToast('success', `Welcome back, ${res.profile.full_name}.`);
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Choose a strong administrator password (at least 8 characters).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.claimAdmin({ email, full_name: fullName, password });
      setAdminSession(res.token, res.profile);
      pushToast('success', 'Administrator account initialized.');
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'Unable to set up administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      const res = await api.resetAdminPassword(email);
      setInfoMsg(res.message);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F9F4] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52645B] hover:text-[#168B4B]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Public Website
          </button>
          <span className="text-xs font-medium text-[#52645B]">Admin Portal</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#DDECE3] p-7 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <NewLifeBrandLockup compact showSub />
            <h1 className="font-display font-extrabold text-2xl text-[#26352E] pt-2">
              {mode === 'claim'
                ? 'First-Run Administrator Setup'
                : mode === 'reset'
                  ? 'Reset Administrator Password'
                  : 'Administrator Sign In'}
            </h1>
            <p className="text-xs text-[#52645B] leading-relaxed">
              {mode === 'claim'
                ? 'Set up the initial owner administrator credentials for this server session. Public signup is permanently disabled.'
                : mode === 'reset'
                  ? 'Enter your authorized administrator email to request a password reset.'
                  : 'Restricted to authorized administrators of New Life Medical Store Kalimpong.'}
            </p>
          </div>

          {health && !health.supabaseConnected && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <strong>Supabase Not Connected Yet:</strong> Running in local preview mode. Once
                <code className="mx-1 font-mono">SUPABASE_URL</code>,
                <code className="mx-1 font-mono">SUPABASE_PUBLISHABLE_KEY</code>, and
                <code className="mx-1 font-mono">SUPABASE_SECRET_KEY</code> are configured, Supabase
                Auth and PostgreSQL activate automatically.
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#F5C6C0] bg-[#FFF2F0] px-4 py-3 text-xs font-medium text-[#C93B2D]">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-xl border border-[#CBE0D3] bg-[#F2F9F4] px-4 py-3 text-xs font-medium text-[#168B4B]">
              {infoMsg}
            </div>
          )}

          {loadingStatus ? (
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-[#F2F9F4] animate-pulse" />
              <div className="h-11 rounded-xl bg-[#F2F9F4] animate-pulse" />
            </div>
          ) : mode === 'claim' ? (
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@newlifekalimpong.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Choose Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'Initializing...' : 'Initialize & Open Dashboard'}
              </button>
            </form>
          ) : mode === 'reset' ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@newlifekalimpong.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Request Password Reset'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfoMsg(null);
                }}
                className="w-full text-xs font-semibold text-[#52645B] hover:text-[#168B4B]"
              >
                Return to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@newlifekalimpong.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {submitting ? 'Signing In...' : 'Sign In to Admin Panel'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-[#52645B] hover:text-[#168B4B] font-medium"
                >
                  Forgot password?
                </button>
                <span className="text-[#7D9186]">Public registration disabled</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
