'use client';
import Image from 'next/image';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import FacebookSignInButton from '@/components/FacebookSignInButton';

function LoginForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const returnTo = params.get('return') ?? '/account?tab=watchlist';
  const sessionEnded = params.get('reason') === 'session_ended';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Passwordless sign-in -- same signInWithOtp() mechanism EmailSavePrompt.tsx
  // already uses for the "save a car without an account" flow, offered here as
  // a real, discoverable login method rather than only reachable by accident
  // via "Forgot password?" (which some passwordless-signup users would never
  // think to click, since they never had a password to forget).
  const [magicMode, setMagicMode]     = useState(false);
  const [magicEmail, setMagicEmail]   = useState('');
  const [magicSent, setMagicSent]     = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError]   = useState('');

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError('');
    setMagicLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: redirectTo },
    });
    setMagicLoading(false);
    if (authError) { setMagicError('Something went wrong. Please try again.'); return; }
    setMagicSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    // Check if suspended
    const userId = data.user?.id;
    if (userId) {
      const { data: suspended } = await supabase
        .from('suspended_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (suspended) {
        await supabase.auth.signOut();
        router.push('/account/suspended');
        return;
      }

      // Dealer accounts belong in the dealer portal -- signing in here would
      // drop them into the buyer experience with no dealer dashboard access.
      // Local-scope sign-out so an active dealer session on another
      // device/tab isn't revoked by the mistake.
      const { data: dealerRow } = await supabase
        .from('dealers')
        .select('id')
        .or(`id.eq.${userId},email.eq.${data.user!.email}`)
        .maybeSingle();
      if (dealerRow) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('This is a dealer account. Please use the Dealer sign in link below.');
        setLoading(false);
        return;
      }
    }

    router.push(returnTo);
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="GarageCherries" width={32} height={32} unoptimized />
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-6">Welcome back</h1>

          {sessionEnded && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Your session has ended. Please sign in again.
            </p>
          )}

          {magicMode ? (
            magicSent ? (
              <div className="text-center py-2">
                <p className="text-3xl mb-3">📬</p>
                <h3 className="font-bold text-zinc-900 mb-1">Check your email</h3>
                <p className="text-sm text-zinc-500">
                  We sent a sign-in link to <span className="font-medium text-zinc-700">{magicEmail}</span>. Click it and you&apos;ll be signed in automatically.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" required autoFocus value={magicEmail} onChange={e => setMagicEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                {magicError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{magicError}</p>}

                <button type="submit" disabled={magicLoading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
                  {magicLoading ? 'Sending…' : 'Send sign-in link'}
                </button>

                <button type="button" onClick={() => { setMagicMode(false); setMagicError(''); }}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-600 text-center">
                  Back to password sign-in
                </button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Password</label>
                    <Link href="/account/forgot-password" className="text-xs text-red-600 hover:underline">Forgot password?</Link>
                  </div>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>

                <button type="button" onClick={() => { setMagicMode(true); setError(''); }}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-700 text-center">
                  Email me a sign-in link instead
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-xs text-zinc-400">or</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              <div className="space-y-2.5">
                <GoogleSignInButton returnTo={returnTo} />
                <FacebookSignInButton returnTo={returnTo} />
              </div>
            </>
          )}

          <p className="text-xs text-zinc-400 text-center mt-6">
            New to GarageCherries?{' '}
            <Link href="/account/signup" className="text-red-600 hover:underline">Create free account</Link>
          </p>
        </div>

        <p className="text-xs text-zinc-400 text-center mt-4">
          Are you a dealer?{' '}
          <Link href="/dealer/login" className="text-red-600 hover:underline">Dealer sign in →</Link>
        </p>
      </div>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
