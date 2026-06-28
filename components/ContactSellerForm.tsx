'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useMessenger } from '@/lib/messenger-context';

interface Props {
  carId: string;
  carTitle: string;
  sellerName: string;
  sellerEmail?: string;
}

export default function ContactSellerForm({ carId, carTitle, sellerName, sellerEmail }: Props) {
  const router = useRouter();
  const { openChat } = useMessenger();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) setUser({ id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name || u.email || '' });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/account/login?return=/listings`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: carId,
          listingTitle: carTitle,
          sellerEmail: sellerEmail || 'noreply@garagecherries.com',
          buyerName: user.name,
          message,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to send.'); return; }
      setOpen(false);
      setMessage('');
      // Open the floating messenger widget
      openChat(json.conversationId, carTitle);
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
        Message {sellerName || 'Seller'}
      </p>

      {!user ? (
        <div className="bg-zinc-50 rounded-xl p-4 text-center">
          <p className="text-sm text-zinc-600 mb-3">Sign in to message this seller.</p>
          <button
            onClick={() => router.push(`/account/login?return=/listings`)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-2 rounded-xl transition-colors">
            Sign In to Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            required
            rows={3}
            placeholder={`Hi, I'm interested in the ${carTitle}. Is it still available?`}
            value={message}
            onChange={e => setMessage(e.target.value)}
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
        </form>
      )}
    </div>
  );
}
