'use client';
import { useState } from 'react';

interface Props {
  carId: string;
  currentPrice: number;
  initialWatched: boolean;
  isLoggedIn: boolean;
}

export default function WatchButton({ carId, currentPrice, initialWatched, isLoggedIn }: Props) {
  const [watching, setWatching]         = useState(initialWatched);
  const [allowContact, setAllowContact] = useState(true);
  const [loading, setLoading]           = useState(false);

  const toggle = async () => {
    if (!isLoggedIn) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/account/login?return=${returnUrl}`;
      return;
    }
    setLoading(true);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, currentPrice, allowDealerContact: allowContact }),
    });
    if (res.ok) {
      const { watching: next } = await res.json();
      setWatching(next);
    }
    setLoading(false);
  };

  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        disabled={loading}
        className={`block w-full border-2 font-bold py-3 rounded-xl transition-colors text-sm text-center flex items-center justify-center gap-2 ${
          watching
            ? 'bg-zinc-800 border-zinc-800 text-white hover:bg-zinc-700 hover:border-zinc-700'
            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
        }`}
      >
        <svg className="w-4 h-4 shrink-0" fill={watching ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {loading ? '…' : watching ? 'Watching' : 'Watch this Listing'}
      </button>

      {/* Opt-in checkbox — only shown to logged-in users who haven't watched yet */}
      {isLoggedIn && !watching && (
        <label className="flex items-start gap-2 mt-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={e => setAllowContact(e.target.checked)}
            className="mt-0.5 rounded accent-red-600 shrink-0"
          />
          <span className="text-xs text-zinc-500 group-hover:text-zinc-700 transition-colors leading-tight">
            Allow the seller to send me one message about this car
          </span>
        </label>
      )}
    </div>
  );
}
