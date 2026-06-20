'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RemoveWatchButton({ carId }: { carId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    setLoading(true);
    await fetch(`/api/watchlist?carId=${encodeURIComponent(carId)}`, { method: 'DELETE' });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      title="Remove from watchlist"
    >
      {loading ? (
        <span className="text-xs">…</span>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}
