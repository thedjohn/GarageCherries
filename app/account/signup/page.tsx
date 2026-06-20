'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AccountSignupPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/account/watchlist` },
    });

    setLoading(false);
    if (authError) { setError(authError.message); } else { setSent(true); }
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Check your email</h1>
          <p className="text-zinc-500 text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and start saving listings.
          </p>
          <Link href="/" className="inline-block text-sm text-red-600 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">🍒</span>
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Create a free account</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Sign up free</h1>
          <p className="text-zinc-500 text-sm mb-6">Save listings and get price drop alerts.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-6">
            Already have an account?{' '}
            <Link href="/account/login" className="text-red-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
