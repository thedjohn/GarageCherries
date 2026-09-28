'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// A standalone keyword search box that's always visible on /listings,
// independent of the full filter panel -- which is collapsed behind a
// "Filters ▼" tap on mobile (components/SearchFilters.tsx). Per Clarity data,
// 73% of traffic is mobile and only 207 sessions ever used search, and the
// full filter panel being hidden by default there is the likely reason why.
// This box keeps working even when the full panel is collapsed.
export default function TopSearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams(params);
    if (q.trim()) p.set('q', q.trim()); else p.delete('q');
    p.delete('page');
    router.push(`/listings?${p.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by make, model, or keyword (e.g. Mustang, barn find)"
        className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button type="submit"
        className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors whitespace-nowrap">
        Search
      </button>
    </form>
  );
}
