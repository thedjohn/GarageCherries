'use client';
import { useState } from 'react';

const CAMPAIGNS = [
  {
    id: 'digest',
    endpoint: '/api/email/digest',
    title: 'Weekly Fresh Listings Digest',
    description: 'Sends new listings from the past 7 days to all users with active watchlists.',
    icon: '📬',
  },
  {
    id: 'price-drops',
    endpoint: '/api/email/price-drops',
    title: 'Price Drop Notifications',
    description: 'Notifies watchlist users of price reductions on cars they are watching.',
    icon: '📉',
  },
  {
    id: 'dealer-report',
    endpoint: '/api/email/dealer-report',
    title: 'Monthly Dealer Performance Reports',
    description: 'Sends each dealer a summary of their views, inquiries, and inventory for the past 30 days.',
    icon: '📊',
  },
] as const;

interface Result { ok: boolean; sent?: number; total?: number; message?: string; error?: string }

export default function AdminEmailPage() {
  const [secret, setSecret] = useState('');
  const [results, setResults] = useState<Record<string, Result | 'loading'>>({});

  const trigger = async (endpoint: string, id: string) => {
    setResults(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      setResults(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      setResults(prev => ({ ...prev, [id]: { ok: false, error: String(err) } }));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">Admin</p>
          <h1 className="text-3xl font-extrabold text-zinc-900">Email Campaigns</h1>
          <p className="text-zinc-500 mt-1">Manually trigger email campaigns. Requires the admin API secret.</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            Admin API Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Enter ADMIN_API_SECRET from .env.local"
            className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
          />
          <p className="text-xs text-zinc-400 mt-1.5">
            Set <code className="bg-zinc-100 px-1 rounded">ADMIN_API_SECRET</code> in your <code className="bg-zinc-100 px-1 rounded">.env.local</code> to enable this feature.
          </p>
        </div>

        <div className="space-y-4">
          {CAMPAIGNS.map(campaign => {
            const result = results[campaign.id];
            return (
              <div key={campaign.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{campaign.icon}</span>
                    <div>
                      <h2 className="font-bold text-zinc-900">{campaign.title}</h2>
                      <p className="text-sm text-zinc-500 mt-0.5">{campaign.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => trigger(campaign.endpoint, campaign.id)}
                    disabled={!secret || result === 'loading'}
                    className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors"
                  >
                    {result === 'loading' ? 'Sending…' : 'Send'}
                  </button>
                </div>

                {result && result !== 'loading' && (
                  <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    {result.ok ? (
                      <span>
                        <strong>Sent {result.sent ?? 0}</strong>
                        {result.total != null ? ` of ${result.total}` : ''} emails.
                        {result.message ? ` ${result.message}` : ''}
                      </span>
                    ) : (
                      <span>Error: {result.error ?? 'Unknown error'}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-zinc-400 text-center">
          These routes require the <code>Authorization: Bearer &lt;ADMIN_API_SECRET&gt;</code> header.
          Keep this page bookmarked — it is not linked from the public site.
        </p>
      </div>
    </div>
  );
}
