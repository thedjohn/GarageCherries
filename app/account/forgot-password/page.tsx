'use client';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/account/reset-password',
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/cherry-logo.png" alt="GarageCherries" width={32} height={32} unoptimized />
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">Check your email</h1>
              <p className="text-sm text-zinc-500">
                We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
              </p>
              <Link href="/account/login"
                className="inline-block mt-6 text-sm text-red-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">Forgot your password?</h1>
              <p className="text-sm text-zinc-500 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="text-xs text-zinc-400 text-center mt-6">
                Remembered it?{' '}
                <Link href="/account/login" className="text-red-600 hover:underline">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
