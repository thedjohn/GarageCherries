'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  eventId: string;
}

// Compact save icon for event list rows, mirrors the car watchlist's
// CarCardHeart.tsx pattern. Event cards aren't photo-first like CarCard, so
// this renders as an inline icon button rather than a dark overlay on an image.
export default function EventCardHeart({ eventId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('event_watchlists').select('id').eq('user_id', user.id).eq('event_id', eventId).maybeSingle();
      setWatching(!!data);
    });
  }, [eventId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/account/login?return=${encodeURIComponent(pathname)}`); return; }
    setLoading(true);
    const res = await fetch('/api/event-watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    if (res.ok) {
      const { watching: next } = await res.json();
      setWatching(next);
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={watching ? 'Remove from saved events' : 'Save this event'}
      aria-pressed={watching}
      className="shrink-0 self-start w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill={watching ? '#dc2626' : 'none'}
        stroke={watching ? '#dc2626' : '#a1a1aa'}
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}
