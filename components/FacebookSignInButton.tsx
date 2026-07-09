'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  returnTo?: string;
  promo?: string;
  label?: string;
}

export default function FacebookSignInButton({ returnTo, promo, label = 'Continue with Facebook' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    const params = new URLSearchParams();
    if (returnTo) params.set('next', returnTo);
    if (promo) params.set('promo', promo);
    const qs = params.toString();

    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback${qs ? `?${qs}` : ''}` },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-60 text-zinc-700 font-semibold py-3 rounded-xl transition-colors text-sm"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#1877F2" d="M18 9c0-4.97-4.03-9-9-9S0 4.03 0 9c0 4.49 3.29 8.21 7.59 8.89v-6.29H5.31V9h2.28V7.02c0-2.25 1.34-3.49 3.39-3.49.98 0 2.01.18 2.01.18v2.21h-1.13c-1.11 0-1.46.69-1.46 1.4V9h2.49l-.4 2.6h-2.09v6.29C14.71 17.21 18 13.49 18 9Z" />
      </svg>
      {loading ? 'Redirecting…' : label}
    </button>
  );
}
