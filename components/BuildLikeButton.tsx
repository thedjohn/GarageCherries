'use client';
import { useState, useEffect } from 'react';

export default function BuildLikeButton({ buildId }: { buildId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    fetch(`/api/build-like?buildId=${encodeURIComponent(buildId)}`)
      .then(res => res.json())
      .then(data => { setLiked(!!data.liked); setCount(data.count ?? 0); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [buildId]);

  const toggle = async () => {
    if (working) return;
    setWorking(true);
    // Optimistic update -- reconciled with the real response below.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(c => c + (nextLiked ? 1 : -1));
    try {
      const res = await fetch('/api/build-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId }),
      });
      const data = await res.json();
      setLiked(!!data.liked);
      setCount(data.count ?? 0);
    } catch {
      // Revert the optimistic update on failure.
      setLiked(!nextLiked);
      setCount(c => c + (nextLiked ? -1 : 1));
    }
    setWorking(false);
  };

  if (!loaded) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={working}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        liked ? 'border-red-200 bg-red-50 text-red-600' : 'border-zinc-200 text-zinc-500 hover:border-red-200 hover:text-red-600'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
      {count}
    </button>
  );
}
