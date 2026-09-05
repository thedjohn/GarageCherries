'use client';
import { useState, useEffect } from 'react';
import EmailSavePrompt from './EmailSavePrompt';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/gtag';

interface Props {
  carId: string;
  currentPrice: number;
}

// Compact save icon for grid cards. Sits inside a <Link>, so every handler
// stops propagation/prevents default -- otherwise saving a car would also
// navigate to its detail page.
export default function CarCardHeart({ carId, currentPrice }: Props) {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  // Same on-mount check WatchlistButton already uses on the detail page --
  // without it, a card's heart forgets it was saved as soon as you navigate
  // away and back.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('watchlists').select('id').eq('user_id', user.id).eq('car_id', carId).maybeSingle();
      setWatching(!!data);
    });
  }, [carId]);

  const save = async () => {
    setLoading(true);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, currentPrice, allowDealerContact: true }),
    });
    if (res.ok) {
      const { watching: next } = await res.json();
      setWatching(next);
    }
    setLoading(false);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!watching) trackEvent('watchlist_intent_click', { car_id: carId, source: 'card_heart' });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setShowEmailPrompt(true); return; }
    await save();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={watching ? 'Remove from saved' : 'Save this car'}
        aria-pressed={watching}
        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill={watching ? '#dc2626' : 'none'}
          stroke={watching ? '#dc2626' : 'white'}
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>

      {showEmailPrompt && (
        <div onClick={e => e.stopPropagation()}>
          <EmailSavePrompt
            pendingSave={{ carId, currentPrice }}
            onClose={() => setShowEmailPrompt(false)}
          />
        </div>
      )}
    </>
  );
}
