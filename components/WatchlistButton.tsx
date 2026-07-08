'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Tooltip from '@/components/Tooltip';

export default function WatchlistButton({ carId, price }: { carId: string; price: number }) {
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('car_id', carId)
        .maybeSingle();
      setWatched(!!data);
      setLoading(false);
    });
  }, [carId]);

  async function toggle() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/account/login'; return; }
    setWorking(true);
    if (watched) {
      await supabase.from('watchlists').delete().eq('user_id', user.id).eq('car_id', carId);
      setWatched(false);
    } else {
      await supabase.from('watchlists').insert({ user_id: user.id, car_id: carId, price_at_add: price });
      setWatched(true);
    }
    setWorking(false);
  }

  if (loading) return null;

  return (
    <div className="flex items-center gap-1 mb-3">
      <button
        onClick={toggle}
        disabled={working}
        className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl border-2 transition-colors text-sm ${
          watched
            ? 'border-red-600 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-zinc-200 text-zinc-600 hover:border-red-300 hover:text-red-600'
        }`}>
        <svg className="w-4 h-4" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {working ? '…' : watched ? 'Saved to Watchlist' : 'Save to Watchlist'}
      </button>
      <Tooltip text="Save this listing to your watchlist. You'll get an email alert if the price drops." />
    </div>
  );
}
