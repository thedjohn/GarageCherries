'use client';
import { useState } from 'react';
import { trackEvent } from '@/lib/gtag';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Signup failed. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
        trackEvent('newsletter_signup');
      }
    } catch {
      setErrorMsg('Signup failed. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return <p className="text-sm text-green-400">You&apos;re in! Check your inbox for updates.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mt-2">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? 'Signing up…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="text-xs text-red-400 mt-1 w-full">{errorMsg}</p>}
    </form>
  );
}
