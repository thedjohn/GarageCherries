'use client';
import { useState } from 'react';
import Tooltip from '@/components/Tooltip';

interface Props {
  carId: string;
  carTitle: string;
  askingPrice: number;
  dealerId: string;
  isLoggedIn: boolean;
}

export default function MakeOfferButton({ carId, carTitle, askingPrice, dealerId, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, carTitle, dealerId, amount: Number(amount), buyerName: name, buyerEmail: email, message }),
    });
    setSending(false);
    if (res.ok) { setSent(true); }
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to send offer. Please try again.');
    }
  };

  if (sent) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
      <p className="text-sm font-bold text-green-800">Offer sent!</p>
      <p className="text-xs text-green-600 mt-1">The dealer will be notified and can respond to your offer.</p>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-1 mb-0">
        <button
          onClick={() => isLoggedIn ? setOpen(true) : window.location.href = '/account/login?return=' + encodeURIComponent(window.location.pathname)}
          className="flex-1 border-2 border-zinc-200 hover:border-red-400 text-zinc-700 hover:text-red-600 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Make an Offer
        </button>
        <Tooltip text="Send the dealer a non-binding offer. They can accept, decline, or counter. You won't be charged anything — this is just a message to start a conversation." />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Make an Offer</h2>
                  <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">{carTitle}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Asking {fmt(askingPrice)}</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Offer</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                    <input
                      type="number" required min={1} value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder={String(Math.round(askingPrice * 0.9))}
                      className="w-full border border-zinc-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  {amount && Number(amount) > 0 && (
                    <p className="text-xs text-zinc-400 mt-1">
                      {Number(amount) < askingPrice
                        ? `${((askingPrice - Number(amount)) / askingPrice * 100).toFixed(1)}% below asking`
                        : `${((Number(amount) - askingPrice) / askingPrice * 100).toFixed(1)}% above asking`}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Message <span className="text-zinc-300 normal-case font-normal">(optional)</span></label>
                  <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="I'm a serious buyer. Cash in hand. Available to inspect this weekend..."
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={sending}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
                  {sending ? 'Sending…' : `Submit Offer of ${amount ? fmt(Number(amount)) : '…'}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
