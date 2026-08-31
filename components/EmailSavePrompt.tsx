'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  onClose: () => void;
  // The car this prompt is trying to save. Encoded into the magic-link's
  // redirect URL so /auth/callback can complete the save server-side,
  // before it even redirects -- see the comment there for why that's the
  // only save path here (an earlier client-side "also save on sign-in"
  // fallback was removed: when both ran, the save's own POST would toggle
  // the car right back off after the server-side insert added it).
  pendingSave: { carId: string; currentPrice: number };
}

// Passwordless save: instead of sending someone through the full signup form
// just to save a car, we send a one-click magic-link email.
export default function EmailSavePrompt({ onClose, pendingSave }: Props) {
  const [email, setEmail]     = useState('');
  const [fullName, setFullName] = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    // save/price are top-level params (not nested in `next`) so /auth/callback
    // can read them directly and complete the save server-side, before it
    // even redirects -- see the comment there for why that matters.
    const next = encodeURIComponent(window.location.pathname);
    const redirectTo = `${window.location.origin}/auth/callback?next=${next}&save=${encodeURIComponent(pendingSave.carId)}&price=${pendingSave.currentPrice}`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, ...(fullName.trim() && { data: { full_name: fullName.trim() } }) },
    });
    setLoading(false);
    if (authError) { setError('Something went wrong. Please try again.'); return; }
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {sent ? (
          <div className="text-center py-2">
            <p className="text-3xl mb-3">📬</p>
            <h3 className="font-bold text-zinc-900 mb-1">Check your email</h3>
            <p className="text-sm text-zinc-500">
              We sent a link to <span className="font-medium text-zinc-700">{email}</span>. Click it and this car will be saved automatically.
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-zinc-900 mb-1">Save this car</h3>
            <p className="text-sm text-zinc-500 mb-4">Enter your email and we&apos;ll send a one-click link — no password needed.</p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {loading ? 'Sending…' : 'Send link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
