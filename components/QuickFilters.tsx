'use client';
import { useRouter, useSearchParams } from 'next/navigation';

// One-click shortcuts for the filters people reach for most, based on actual
// inventory distribution (see chip labels below) -- sits above the full
// SearchFilters sidebar, not a replacement for it. Toggling an already-active
// chip clears just that param; picking a different chip in the same param
// (e.g. Convertibles -> Coupes) replaces it rather than stacking.
const CHIPS: { label: string; param: string; value: string }[] = [
  { label: 'Under $30k', param: 'priceMax', value: '30000' },
  { label: 'Chevrolet', param: 'make', value: 'Chevrolet' },
  { label: 'Convertibles', param: 'bodyStyle', value: 'Convertible' },
  { label: 'Coupes', param: 'bodyStyle', value: 'Coupe' },
  { label: 'Trucks', param: 'bodyStyle', value: 'Pickup Truck' },
  { label: 'Featured', param: 'sort', value: 'featured' },
];

export default function QuickFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const toggle = (param: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    const isActive = p.get(param) === value;
    if (isActive) {
      p.delete(param);
    } else {
      p.set(param, value);
    }
    p.delete('page');
    router.push(`/listings${p.toString() ? `?${p.toString()}` : ''}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-4 mb-4 border-b border-zinc-100">
      <span className="text-xs text-zinc-400 mr-1 shrink-0">Quick filters</span>
      {CHIPS.map(chip => {
        const active = params.get(chip.param) === chip.value;
        return (
          <button
            key={chip.label}
            onClick={() => toggle(chip.param, chip.value)}
            className={`shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors ${
              active ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
