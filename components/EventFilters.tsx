'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { STATES } from '@/lib/types';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'show', label: 'Car Show' },
  { value: 'swap-meet', label: 'Swap Meet' },
  { value: 'cruise', label: 'Cruise Night' },
  { value: 'auction', label: 'Auction' },
];

export default function EventFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState(params.get('state') || '');
  const [type, setType] = useState(params.get('type') || '');

  const apply = (nextState: string, nextType: string) => {
    const p = new URLSearchParams();
    if (nextState) p.set('state', nextState);
    if (nextType) p.set('type', nextType);
    router.push(p.toString() ? `/events?${p}` : '/events');
  };

  const clear = () => {
    setState('');
    setType('');
    router.push('/events');
  };

  return (
    <div className="flex flex-wrap items-end gap-3 mb-8 bg-white border border-zinc-100 rounded-xl p-4 shadow-sm">
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">State</label>
        <select
          value={state}
          onChange={e => { setState(e.target.value); apply(e.target.value, type); }}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All States</option>
          {STATES.filter(s => s !== 'All States').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Type</label>
        <select
          value={type}
          onChange={e => { setType(e.target.value); apply(state, e.target.value); }}
          className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {(state || type) && (
        <button onClick={clear} className="text-xs text-red-600 hover:underline pb-2.5">
          Clear filters
        </button>
      )}
    </div>
  );
}
