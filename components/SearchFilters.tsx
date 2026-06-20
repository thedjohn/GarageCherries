'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { MAKES, BODY_STYLES, CONDITIONS, STATES } from '@/lib/types';

export default function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [filters, setFilters] = useState({
    make:         params.get('make')        || '',
    yearMin:      params.get('yearMin')     || '',
    yearMax:      params.get('yearMax')     || '',
    priceMin:     params.get('priceMin')    || '',
    priceMax:     params.get('priceMax')    || '',
    condition:    params.get('condition')   || '',
    bodyStyle:    params.get('bodyStyle')   || '',
    transmission: params.get('transmission')|| '',
    state:        params.get('state')       || '',
  });

  const apply = useCallback(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    router.push(`/listings?${p.toString()}`);
  }, [filters, router]);

  const clear = () => {
    setFilters({ make:'', yearMin:'', yearMax:'', priceMin:'', priceMax:'', condition:'', bodyStyle:'', transmission:'', state:'' });
    router.push('/listings');
  };

  const set = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-5 sticky top-20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-zinc-800 text-lg">Filter</h2>
          <button onClick={clear} className="text-xs text-red-600 hover:underline">Clear all</button>
        </div>

        <div className="space-y-4">
          {/* Make */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Make</label>
            <select value={filters.make} onChange={e => set('make', e.target.value === 'All Makes' ? '' : e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">All Makes</option>
              {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Year</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.yearMin} onChange={e => set('yearMin', e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <input type="number" placeholder="Max" value={filters.yearMax} onChange={e => set('yearMax', e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Price</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min $" value={filters.priceMin} onChange={e => set('priceMin', e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <input type="number" placeholder="Max $" value={filters.priceMax} onChange={e => set('priceMax', e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Condition</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button key={c}
                  onClick={() => set('condition', c === 'All' ? '' : c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    (c === 'All' && !filters.condition) || filters.condition === c
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-zinc-200 text-zinc-600 hover:border-red-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Body Style */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Body Style</label>
            <select value={filters.bodyStyle} onChange={e => set('bodyStyle', e.target.value === 'All Styles' ? '' : e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">All Styles</option>
              {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Transmission */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Transmission</label>
            <div className="flex gap-2">
              {['Any','Manual','Automatic'].map(t => (
                <button key={t}
                  onClick={() => set('transmission', t === 'Any' ? '' : t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    (t === 'Any' && !filters.transmission) || filters.transmission === t
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-zinc-200 text-zinc-600 hover:border-red-400'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">State</label>
            <select value={filters.state} onChange={e => set('state', e.target.value === 'All States' ? '' : e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">All States</option>
              {STATES.filter(s => s !== 'All States').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button onClick={apply}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2">
            Apply Filters
          </button>
        </div>
      </div>
    </aside>
  );
}
