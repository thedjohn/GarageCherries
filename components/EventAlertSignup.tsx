'use client';
import { useState } from 'react';

export default function EventAlertSignup({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null); // holds the resolved state on success

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/event-alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, zip }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Signup failed. Please try again.'); return; }
    setDone(data.state);
  };

  if (done) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 ${className ?? ''}`}>
        ✅ You're in! We'll email you {done} car shows every Thursday.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-2 ${className ?? ''}`}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <input
        type="text"
        required
        inputMode="numeric"
        maxLength={5}
        placeholder="ZIP"
        value={zip}
        onChange={e => setZip(e.target.value.replace(/\D/g, ''))}
        className="sm:w-24 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {loading ? 'Signing up…' : 'Get Thursday alerts'}
      </button>
      {error && <p className="text-xs text-red-600 sm:self-center">{error}</p>}
    </form>
  );
}
