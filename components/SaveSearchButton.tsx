'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SaveSearchButton() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasFilters = Array.from(searchParams.values()).some(Boolean);
  if (!hasFilters) return null;

  const handleSave = async () => {
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/account/login?return=${encodeURIComponent('/listings?' + searchParams.toString())}`);
      return;
    }

    const sp = Object.fromEntries(searchParams.entries());
    const conditions = sp.condition && sp.condition !== 'All' ? [sp.condition] : undefined;

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make:         sp.make && sp.make !== 'All Makes' ? sp.make : undefined,
        model:        sp.model || undefined,
        yearMin:      sp.yearMin || undefined,
        yearMax:      sp.yearMax || undefined,
        priceMax:     sp.priceMax || undefined,
        mileageMax:   sp.mileageMax || undefined,
        condition:    conditions,
        bodyStyle:    sp.bodyStyle && sp.bodyStyle !== 'All Styles' ? sp.bodyStyle : undefined,
        transmission: sp.transmission || undefined,
        state:        sp.state && sp.state !== 'All States' ? sp.state : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to save alert');
    } else {
      setSaved(true);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold">Alert saved</span>
        <a href="/account/alerts" className="text-green-600 hover:underline ml-1">Manage alerts →</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-red-600 bg-white hover:bg-red-50 border border-zinc-200 hover:border-red-300 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {loading ? 'Saving…' : 'Notify me when a match lists'}
      </button>
      {error && <p className="text-xs text-red-600 px-1">{error}</p>}
    </div>
  );
}
