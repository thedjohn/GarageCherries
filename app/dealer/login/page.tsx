'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DealerLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Password setup state (for recovery tokens Supabase sends here)
  const [setupMode, setSetupMode] = useState(false);
  const [setupReady, setSetupReady] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    // Supabase ignores redirect_to and sends recovery tokens to this page.
    // Detect them and show the password setup form inline.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    if (params.get('error')) {
      setError(params.get('error_description')?.replace(/\+/g, ' ') ?? 'This link is invalid or has expired.');
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';
    const type = params.get('type');

    if (accessToken && type === 'recovery') {
      setSetupMode(true);
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error: sessionError }) => {
          if (data.session) {
            setSetupReady(true);
          } else {
            setSetupMode(false);
            setError(sessionError?.message ?? 'This setup link is invalid or has expired. Please contact support for a new one.');
          }
        });
    }
  }, []);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassword !== setupConfirm) { setError('Passwords do not match.'); return; }
    if (setupPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSetupSaving(true);
    setError('');
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: setupPassword });
    setSetupSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setSetupDone(true);
    setTimeout(() => router.push('/dealer/dashboard'), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Invalid email or password.');
      setLoading(false);
    } else {
      router.push('/dealer/dashboard');
      router.refresh();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/dealer/login`,
    });
    setResetLoading(false);
    setResetSent(true);
  };

  // Password setup view (recovery token flow)
  if (setupMode) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">🍒</span>
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Dealer portal</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Set a new password</h1>
          {setupDone ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✓</div>
              <p className="text-sm text-zinc-600 font-medium">Password set successfully.</p>
              <p className="text-xs text-zinc-400 mt-1">Taking you to your dashboard…</p>
            </div>
          ) : !setupReady ? (
            <div>
              {error
                ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                : <p className="text-sm text-zinc-400">Verifying link…</p>
              }
            </div>
          ) : (
            <form onSubmit={handleSetupSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">New Password</label>
                <input type="password" required minLength={8} value={setupPassword}
                  onChange={e => { setSetupPassword(e.target.value); setError(''); }}
                  placeholder="Min. 8 characters"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <input type="password" required value={setupConfirm}
                  onChange={e => { setSetupConfirm(e.target.value); setError(''); }}
                  placeholder="Re-enter password"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={setupSaving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                {setupSaving ? 'Saving…' : 'Set Password & Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (showReset) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">🍒</span>
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Dealer portal</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Reset your password</h1>
          {resetSent ? (
            <>
              <p className="text-sm text-zinc-500 mb-6">Check your email — we sent a reset link to <strong>{resetEmail}</strong>.</p>
              <button onClick={() => { setShowReset(false); setResetSent(false); }}
                className="w-full border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
                Back to sign in
              </button>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-zinc-500">Enter your dealer email and we'll send you a reset link.</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@dealership.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <button type="submit" disabled={resetLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => setShowReset(false)}
                className="w-full text-zinc-400 text-sm hover:text-zinc-600 transition-colors">
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">🍒</span>
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Dealer portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-6">Sign in to your account</h1>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@dealership.com"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Password</label>
                <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); }}
                  className="text-xs text-red-600 hover:underline">
                  Forgot password?
                </button>
              </div>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500 mb-3">Don't have a dealer account yet?</p>
            <a href="/dealer/apply"
              className="inline-block w-full border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-colors text-center">
              Apply for a Dealer Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
