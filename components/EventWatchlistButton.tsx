'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function EventWatchlistButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('event_watchlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();
      setWatched(!!data);
      setLoading(false);
    });
  }, [eventId]);

  async function toggle() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/account/login?return=${encodeURIComponent(pathname)}`); return; }
    setWorking(true);
    if (watched) {
      await supabase.from('event_watchlists').delete().eq('user_id', user.id).eq('event_id', eventId);
      setWatched(false);
    } else {
      await supabase.from('event_watchlists').insert({ user_id: user.id, event_id: eventId });
      setWatched(true);
    }
    setWorking(false);
  }

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      disabled={working}
      className={`inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl border transition-colors ${
        watched
          ? 'border-red-600 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-zinc-200 text-zinc-700 hover:border-red-300 hover:text-red-600'
      }`}>
      <svg className="w-4 h-4" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
      {working ? '…' : watched ? 'Saved' : 'Save Event'}
    </button>
  );
}
