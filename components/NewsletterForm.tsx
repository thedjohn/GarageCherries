'use client';
import { useState } from 'react';
import { trackEvent, inferNewsletterSource, type NewsletterSource } from '@/lib/gtag';

interface Props {
  // Explicit page-context categories (dealer_page/vehicle_page/affiliate_page)
  // should always be passed -- there's no URL signal to infer those from.
  // Omit it entirely for a general placement (footer, listings page) and the
  // visitor's actual first-touch channel (Instagram, Facebook, or organic)
  // is inferred instead, rather than every such placement guessing the same
  // hardcoded value regardless of where the visitor actually came from.
  source?: NewsletterSource;
  // Off by default so the two existing compact placements (footer, listings
  // page) keep their current look -- a future placement built for lead-gen
  // (e.g. the Instagram landing page) can opt in.
  showFirstName?: boolean;
  headline?: string;
  supportingText?: string;
}

export default function NewsletterForm({ source, showFirstName = false, headline, supportingText }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    const resolvedSource = source ?? inferNewsletterSource();
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: showFirstName ? firstName : undefined, source: resolvedSource }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Signup failed. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
        setFirstName('');
        trackEvent('newsletter_signup');
        trackEvent('email_signup', { source: resolvedSource });
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
    <form onSubmit={handleSubmit} className="mt-2">
      {headline && <p className="text-sm font-bold text-white">{headline}</p>}
      {supportingText && <p className="text-xs text-zinc-400 mt-0.5 mb-2">{supportingText}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        {showFirstName && (
          <input
            type="text"
            placeholder="First name (optional)"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="sm:w-40 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        )}
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
      </div>
      {status === 'error' && <p className="text-xs text-red-400 mt-1 w-full">{errorMsg}</p>}
    </form>
  );
}
