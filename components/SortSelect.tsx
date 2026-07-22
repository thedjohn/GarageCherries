'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'featured', label: 'Featured First' },
];

export default function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('sort') ?? 'newest';

  const handleChange = (value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value === 'newest') p.delete('sort'); else p.set('sort', value);
    p.delete('page'); // sort change resets to page 1, same as changing a filter
    const qs = p.toString();
    router.push(qs ? `/listings?${qs}` : '/listings');
  };

  return (
    <select
      value={current}
      onChange={e => handleChange(e.target.value)}
      aria-label="Sort listings"
      className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white text-zinc-700 hover:border-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
    >
      {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
