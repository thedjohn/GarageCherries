import Link from 'next/link';
import { Metadata } from 'next';
import { ENCYCLOPEDIA } from '@/lib/encyclopedia';

export const metadata: Metadata = {
  title: "Classic Car Encyclopedia — Specs, History & Buyer's Guides",
  description: 'Research classic American muscle cars before you buy. Specs, history, buying tips, and market values for Camaro, Mustang, Charger, Corvette, GTO, and 20+ iconic models.',
  alternates: { canonical: 'https://www.garagecherries.com/cars' },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function EncyclopediaPage() {
  const makeGroups: Record<string, { label: string; count: number; slug: string }> = {};
  for (const entry of ENCYCLOPEDIA) {
    const s = slugify(entry.make);
    if (!makeGroups[s]) makeGroups[s] = { label: entry.make, count: 0, slug: s };
    makeGroups[s].count++;
  }
  const makes = Object.values(makeGroups).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Classic Car Encyclopedia</h1>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
          Research specs, history, buying tips, and market values for the most iconic American classics — before you make an offer.
        </p>
      </div>

      {/* Featured Guide */}
      <div className="mb-14">
        <Link
          href="/cars/srt"
          className="block bg-zinc-900 rounded-2xl p-6 md:p-8 hover:bg-zinc-800 transition-colors group"
        >
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Featured Guide</p>
          <p className="text-2xl font-extrabold text-white mb-2 group-hover:text-red-400 transition-colors">Dodge SRT</p>
          <p className="text-zinc-400 max-w-xl">
            The complete history of Dodge's performance sub-brand — from the Neon SRT-4 to the 1,025-hp Demon 170 — plus the full lineup and what to know before buying one used.
          </p>
        </Link>
      </div>

      {/* Browse by Make */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-zinc-800 mb-5">Browse by Make</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {makes.map(make => (
            <Link
              key={make.slug}
              href={`/cars/${make.slug}`}
              className="bg-white border border-zinc-100 rounded-2xl p-5 hover:border-red-200 hover:shadow-md transition-all group"
            >
              <p className="font-bold text-zinc-900 group-hover:text-red-600 transition-colors">{make.label}</p>
              <p className="text-sm text-zinc-400 mt-1">{make.count} model{make.count !== 1 ? 's' : ''}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* All Models */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-zinc-800">All Models</h2>
          <span className="text-sm text-zinc-400">{ENCYCLOPEDIA.length} entries</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENCYCLOPEDIA.map(entry => {
            const makeSlug = slugify(entry.make);
            const modelSlug = slugify(entry.model);
            return (
              <Link
                key={`${makeSlug}-${modelSlug}`}
                href={`/cars/${makeSlug}/${modelSlug}`}
                className="bg-white border border-zinc-100 rounded-xl p-4 hover:border-red-200 hover:shadow-sm transition-all group flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900 group-hover:text-red-600 transition-colors">
                    {entry.make} {entry.model}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{entry.years}</p>
                  <p className="text-sm text-zinc-500 mt-1.5 line-clamp-2">{entry.tagline}</p>
                </div>
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-red-400 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
