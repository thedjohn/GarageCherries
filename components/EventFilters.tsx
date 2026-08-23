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

export default function EventFilters({ basePath = '/events', hideStateSelect = false, cityOptions }: { basePath?: string; hideStateSelect?: boolean; cityOptions?: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState(params.get('state') || '');
  const [type, setType] = useState(params.get('type') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [zip, setZip] = useState(params.get('zip') || '');

  const apply = (nextState: string, nextType: string, nextCity: string, nextZip: string) => {
    const p = new URLSearchParams();
    if (nextState) p.set('state', nextState);
    if (nextType) p.set('type', nextType);
    if (nextCity) p.set('city', nextCity);
    if (nextZip) p.set('zip', nextZip);
    router.push(p.toString() ? `${basePath}?${p}` : basePath);
  };

  const clear = () => {
    setState('');
    setType('');
    setCity('');
    setZip('');
    router.push(basePath);
  };

  const handleZipChange = (value: string) => {
    setZip(value.replace(/\D/g, '').slice(0, 5));
  };

  return (
    <div className="mt-8 mb-8 bg-white border border-zinc-100 rounded-xl p-4 shadow-sm">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Filters</h2>
      <p className="text-xs text-zinc-500 mb-3">
        {hideStateSelect
          ? 'Narrow the events below by city, ZIP, or event type.'
          : 'Narrow the events below by state, city, event type, or ZIP — enter a ZIP to see the closest events first.'}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {!hideStateSelect && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">State</label>
            <select
              value={state}
              onChange={e => { setState(e.target.value); apply(e.target.value, type, city, zip); }}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All States</option>
              {STATES.filter(s => s !== 'All States').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Type</label>
          <select
            value={type}
            onChange={e => { setType(e.target.value); apply(state, e.target.value, city, zip); }}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">City</label>
          <input
            type="text"
            value={city}
            placeholder="e.g. Austin"
            list={cityOptions ? 'city-options' : undefined}
            onChange={e => setCity(e.target.value)}
            onBlur={() => apply(state, type, city, zip)}
            onKeyDown={e => { if (e.key === 'Enter') apply(state, type, city, zip); }}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
          />
          {cityOptions && (
            <datalist id="city-options">
              {cityOptions.map(c => <option key={c} value={c} />)}
            </datalist>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">ZIP</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            placeholder="e.g. 90210"
            onChange={e => handleZipChange(e.target.value)}
            onBlur={() => apply(state, type, city, zip)}
            onKeyDown={e => { if (e.key === 'Enter') apply(state, type, city, zip); }}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-24"
          />
        </div>
        {(state || type || city || zip) && (
          <button onClick={clear} className="text-xs text-red-600 hover:underline pb-2.5">
            Clear filters
          </button>
        )}
      </div>
      {zip.length === 5 && (
        <p className="text-xs text-zinc-400 mt-2">Showing events within 50 miles of {zip}, closest first.</p>
      )}
    </div>
  );
}
