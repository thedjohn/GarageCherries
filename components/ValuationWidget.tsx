'use client';

import { useState } from 'react';

interface Props {
  year: number;
  make: string;
  model: string;
  mileage?: number;
  condition?: string;
  price: number;
  bodyStyle?: string;
  engine?: string;
}

export default function ValuationWidget({ year, make, model, mileage, condition, price, bodyStyle, engine }: Props) {
  const [assessment, setAssessment] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function handleAsk() {
    setLoading(true);
    setOpen(true);
    setError('');
    try {
      const res = await fetch('/api/ai/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, make, model, mileage, condition, price, bodyStyle, engine }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Error ${res.status}: ${text}`);
        return;
      }
      const data = await res.json();
      setAssessment(data.assessment);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      {!open ? (
        <button
          onClick={handleAsk}
          className="w-full flex items-center justify-center gap-2 border border-zinc-200 hover:border-red-400 hover:bg-red-50 text-zinc-700 hover:text-red-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Is this a fair price?
        </button>
      ) : (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Price Assessment
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              Analyzing market value…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          ) : (
            <p className="text-sm text-zinc-600 leading-relaxed">{assessment}</p>
          )}
          <p className="text-xs text-zinc-400 mt-2 italic">AI assessment — not financial advice.</p>
        </div>
      )}
    </div>
  );
}
