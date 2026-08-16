'use client';
import { useState } from 'react';

interface Result { ok: boolean; triggered?: number; error?: string }

export default function AdminVideoPriceRefresh() {
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState<Result | 'loading' | null>(null);

  const trigger = async () => {
    setResult('loading');
    try {
      const res = await fetch('/api/admin/video-price-refresh', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    }
  };

  return (
    <div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Cron Secret
        </label>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Enter CRON_SECRET from .env.local"
          className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
        />
        <p className="text-xs text-zinc-400 mt-1.5">
          Set <code className="bg-zinc-100 px-1 rounded">CRON_SECRET</code> in your <code className="bg-zinc-100 px-1 rounded">.env.local</code> to enable this feature.
        </p>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💲</span>
            <div>
              <h2 className="font-bold text-zinc-900">Refresh Videos After a Price Drop</h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Finds listings whose price dropped since their video was posted and queues a fresh render for whichever of Facebook, Instagram, or YouTube is still showing the old price. Already-refreshed platforms are skipped — safe to run anytime, including repeatedly.
              </p>
            </div>
          </div>
          <button
            onClick={trigger}
            disabled={!secret || result === 'loading'}
            className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors"
          >
            {result === 'loading' ? 'Running…' : 'Run'}
          </button>
        </div>

        {result && result !== 'loading' && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {result.ok ? (
              <span><strong>Queued {result.triggered ?? 0}</strong> listing{result.triggered === 1 ? '' : 's'} for a video refresh.</span>
            ) : (
              <span>Error: {result.error ?? 'Unknown error'}</span>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-400 text-center">
        This route requires the <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code> header.
      </p>
    </div>
  );
}
