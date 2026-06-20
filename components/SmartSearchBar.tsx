'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SmartSearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const { filters } = await res.json();
      const params = new URLSearchParams();
      if (filters.make) params.set('make', filters.make);
      if (filters.yearMin) params.set('yearMin', String(filters.yearMin));
      if (filters.yearMax) params.set('yearMax', String(filters.yearMax));
      if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.bodyStyle) params.set('bodyStyle', filters.bodyStyle);
      if (filters.transmission) params.set('transmission', filters.transmission);
      if (filters.state) params.set('state', filters.state);
      router.push(`/listings?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-zinc-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Try "1969 Dodge muscle car under $50k" or "red Ford convertible in Texas"'
          className="w-full pl-12 pr-32 py-3.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Searching…' : 'AI Search'}
        </button>
      </div>
    </form>
  );
}
