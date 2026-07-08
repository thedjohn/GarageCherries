'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DealerResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // @supabase/ssr doesn't auto-detect hash tokens — parse them manually.
    // generateLink (admin API) uses the implicit flow: tokens arrive as #access_token=...
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    // Supabase sends error params when the link is expired or already used
    if (params.get('error')) {
      setError(params.get('error_description')?.replace(/\+/g, ' ') ?? 'This reset link is invalid or has expired.');
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';
    const type = params.get('type');

    if (accessToken && type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (data.session) {
            setReady(true);
          } else {
            setError(error?.message ?? 'This reset link is invalid or has expired.');
          }
        });
      return;
    }

    // No valid token in the hash — link is missing or already consumed
    setError('This reset link is invalid or has expired. Please contact support for a new one.');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(() => router.push('/dealer/login'), 3000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="GarageCherries" width={32} height={32} unoptimized />
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Dealer portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Set a new password</h1>

          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✓</div>
              <p className="text-sm text-zinc-600 font-medium">Password updated successfully.</p>
              <p className="text-xs text-zinc-400 mt-1">Redirecting you to sign in…</p>
            </div>
          ) : !ready ? (
            <div>
              {error
                ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                : <p className="text-sm text-zinc-400">Verifying reset link…</p>
              }
              {error && (
                <Link href="/dealer/login"
                  className="mt-4 block text-center text-sm text-red-600 hover:underline">
                  Back to sign in
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Min. 8 characters"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Re-enter password"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                {saving ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
