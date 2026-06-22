'use client';
import { useState } from 'react';

export default function FinancingCalculator({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(6.9);
  const [term, setTerm] = useState(60);
  const [open, setOpen] = useState(false);

  const principal = price * (1 - down / 100);
  const monthly = rate === 0
    ? principal / term
    : (() => {
        const r = rate / 100 / 12;
        return (principal * r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
      })();
  const totalPaid = monthly * term;
  const totalInterest = totalPaid - principal;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="border border-zinc-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-zinc-900">Financing Calculator</p>
            {!open && <p className="text-xs text-zinc-400">Est. {fmt(monthly)}/mo with 20% down</p>}
          </div>
        </div>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-4 space-y-4">
          {/* Monthly payment display */}
          <div className="bg-white rounded-xl p-4 text-center border border-zinc-100">
            <p className="text-3xl font-extrabold text-zinc-900">{fmt(monthly)}<span className="text-base font-normal text-zinc-400">/mo</span></p>
            <p className="text-xs text-zinc-400 mt-1">
              {fmt(down / 100 * price)} down · {fmt(totalInterest)} interest · {fmt(totalPaid)} total
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Down payment</span><span className="font-semibold">{down}% ({fmt(price * down / 100)})</span>
              </div>
              <input type="range" min={0} max={50} step={5} value={down} onChange={e => setDown(Number(e.target.value))}
                className="w-full accent-red-600" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Interest rate</span><span className="font-semibold">{rate.toFixed(1)}% APR (Annual Percentage Rate)</span>
              </div>
              <input type="range" min={3} max={15} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))}
                className="w-full accent-red-600" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Loan term</span><span className="font-semibold">{term} months ({term / 12} yrs)</span>
              </div>
              <input type="range" min={24} max={84} step={12} value={term} onChange={e => setTerm(Number(e.target.value))}
                className="w-full accent-red-600" />
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Estimates only. Contact a lender for exact rates.{' '}
            <a href="https://www.jjbest.com" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">JJ Best</a>
            {' '}and{' '}
            <a href="https://www.woodsidecredit.com" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Woodside Credit</a>
            {' '}specialize in classic car loans.
          </p>
        </div>
      )}
    </div>
  );
}
