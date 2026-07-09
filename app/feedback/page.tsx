'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug Report', desc: 'Something is broken or not working as expected' },
  { value: 'feature', label: '💡 Feature Request', desc: 'An idea for something new or improved' },
  { value: 'general', label: '💬 General Feedback', desc: 'Anything else on your mind' },
];

export default function FeedbackPage() {
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setErrorMsg('Please select a category.'); return; }
    if (message.trim().length < 10) { setErrorMsg('Please enter at least 10 characters.'); return; }
    setErrorMsg('');
    setStatus('submitting');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-6">🎉</div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-3">Thanks for the feedback!</h1>
        <p className="text-zinc-500 mb-8">We read every submission and use it to make GarageCherries better.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
            Browse Listings
          </Link>
          <button onClick={() => { setStatus('idle'); setCategory(''); setMessage(''); setEmail(''); }} className="border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">Share Your Thoughts</p>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">Give Feedback</h1>
        <p className="text-zinc-500 leading-relaxed">
          Found a bug? Have an idea? Just want to say something? We want to hear it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <div>
          <p className="text-sm font-semibold text-zinc-700 mb-3">What kind of feedback is this?</p>
          <div className="space-y-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                  category === c.value
                    ? 'border-red-400 bg-red-50 ring-1 ring-red-300'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <span className="font-semibold text-sm text-zinc-900">{c.label}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-2" htmlFor="message">
            Tell us more
          </label>
          <textarea
            id="message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the issue or idea in as much detail as you'd like..."
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
          />
          <p className="text-xs text-zinc-400 mt-1 text-right">{message.length} characters</p>
        </div>

        {/* Optional email */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-2" htmlFor="email">
            Your email <span className="font-normal text-zinc-400">(optional — so we can follow up)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
        >
          {status === 'submitting' ? 'Sending…' : 'Send Feedback'}
        </button>

        <p className="text-center text-xs text-zinc-400">
          For urgent issues, email us directly at{' '}
          <a href="mailto:contact-us@garagecherries.com" className="text-zinc-600 hover:underline">
            contact-us@garagecherries.com
          </a>
        </p>
      </form>
    </div>
  );
}
