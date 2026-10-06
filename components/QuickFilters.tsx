'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// One-click shortcuts for the filters people reach for most, based on actual
// inventory distribution (see chip labels below) -- sits above the full
// SearchFilters sidebar, not a replacement for it. Toggling an already-active
// chip clears just its params; picking a different chip that sets the same
// param (e.g. Convertibles -> Coupes, Chevrolet -> Ford) replaces it rather
// than stacking. Chips are plain <a href> links so search engines can follow
// them to the filtered pages.
//
// Counts as of 2026-10-06 (2,263 active): Chevrolet 585, Ford 435, Mopar 149,
// 1964-74 685, trucks 151 (saved as both "Pickup" and "Pickup Truck").
const CHIPS: { label: string; set: Record<string, string> }[] = [
  { label: 'Under $30k', set: { priceMax: '30000' } },
  { label: 'Chevrolet', set: { make: 'Chevrolet' } },
  { label: 'Ford', set: { make: 'Ford' } },
  { label: 'Mopar', set: { make: 'Dodge,Plymouth,Chrysler,DeSoto' } },
  { label: "Muscle Era '64–'74", set: { yearMin: '1964', yearMax: '1974' } },
  { label: 'Convertibles', set: { bodyStyle: 'Convertible' } },
  { label: 'Coupes', set: { bodyStyle: 'Coupe' } },
  { label: 'Trucks', set: { bodyStyle: 'Pickup,Pickup Truck' } },
  { label: 'Featured', set: { sort: 'featured' } },
];

export default function QuickFilters() {
  const params = useSearchParams();

  const hrefFor = (set: Record<string, string>, active: boolean) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(set)) {
      if (active) p.delete(k); else p.set(k, v);
    }
    p.delete('page');
    return `/listings${p.toString() ? `?${p.toString()}` : ''}`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-4 mb-4 border-b border-zinc-100">
      <span className="text-xs text-zinc-400 mr-1 shrink-0">Quick filters</span>
      {CHIPS.map(chip => {
        const active = Object.entries(chip.set).every(([k, v]) => params.get(k) === v);
        return (
          <Link
            key={chip.label}
            href={hrefFor(chip.set, active)}
            data-source="listings-quick-filter"
            className={`shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors ${
              active ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
