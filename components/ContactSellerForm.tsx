'use client';

import { useState } from 'react';

interface Props {
  carId: string;
  carTitle: string;
  sellerName: string;
}

export default function ContactSellerForm({ carId, carTitle, sellerName }: Props) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          carTitle,
          buyerName: fields.name,
          buyerEmail: fields.email,
          buyerPhone: fields.phone,
          message: fields.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to send. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="block w-full bg-zinc-800 border-2 border-zinc-700 text-white hover:bg-red-600 hover:border-red-500 font-bold py-3 rounded-xl transition-colors text-sm text-center mt-3"
      >
        Message Seller
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
        Message {sellerName}
      </p>

      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="text-sm font-bold text-green-800">Message sent!</p>
          <p className="text-xs text-green-600 mt-1">{sellerName} will reply to your email directly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text" required placeholder="Your name"
            value={fields.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="email" required placeholder="Your email"
            value={fields.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="tel" placeholder="Your phone (optional)"
            value={fields.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <textarea
            required rows={3} placeholder={`Hi, I'm interested in the ${carTitle}. Is it still available?`}
            value={fields.message} onChange={e => set('message', e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 border border-zinc-200 text-zinc-500 text-sm font-semibold py-2 rounded-xl hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition-colors">
              {loading ? 'Sending…' : 'Send Message'}
            </button>
          </div>
          <p className="text-xs text-zinc-400 text-center">The seller will reply directly to your email.</p>
        </form>
      )}
    </div>
  );
}
