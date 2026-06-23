import type { Metadata } from 'next';
import Link from 'next/link';
import CarCard from '@/components/CarCard';
import { fetchCars, fetchCarCount } from '@/lib/db';
import { MAKES, BODY_STYLES } from '@/lib/types';

export const metadata: Metadata = {
  title: 'GarageCherries — Classic & Collector Cars For Sale',
  description: 'Browse thousands of classic cars, muscle cars, and collector vehicles from private sellers and dealers across the USA. Search by make, year, price, and condition.',
  alternates: { canonical: 'https://www.garagecherries.com' },
};

const BODY_STYLE_ICONS: Record<string, string> = {
  'Coupe': '🏎️',
  'Convertible': '🌞',
  'Sedan': '🚘',
  'Pickup Truck': '🛻',
  'Station Wagon': '🚗',
  'Hardtop': '🚙',
};

export default async function HomePage() {
  const [featured, recent, totalCount] = await Promise.all([
    fetchCars({ featured: true }),
    fetchCars({ limit: 8 }),
    fetchCarCount(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-red-950 opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
            Find Your Dream<br />
            <span className="text-red-500">Classic Car</span>
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Thousands of classic, muscle, and collector cars from private sellers and dealers across the USA.
          </p>

          {/* Quick search */}
          <div className="bg-white rounded-2xl p-4 max-w-3xl mx-auto shadow-2xl">
            <form action="/listings" method="GET">
              <div className="flex flex-col md:flex-row gap-3">
                <select name="make"
                  className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  {MAKES.map(m => <option key={m}>{m}</option>)}
                </select>
                <div className="flex gap-3 flex-1">
                  <input name="yearMin" type="number" placeholder="Year Min"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  <input name="yearMax" type="number" placeholder="Year Max"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <button type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-colors whitespace-nowrap">
                  Search Cars
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-zinc-400">
            <span>{totalCount.toLocaleString()} listing{totalCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>All 50 states</span>
            <span>·</span>
            <span>Muscle, Classic &amp; Collector</span>
          </div>
        </div>
      </section>

      {/* Browse by style */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">Browse by Body Style</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {BODY_STYLES.filter(b => b !== 'All Styles').map(style => (
            <Link key={style} href={`/listings?bodyStyle=${encodeURIComponent(style)}`}
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border border-zinc-100 hover:border-red-300 hover:shadow-md transition-all group">
              <span className="text-3xl">{BODY_STYLE_ICONS[style] || '🚗'}</span>
              <span className="text-sm font-medium text-zinc-700 group-hover:text-red-600 text-center">{style}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">Featured Listings</h2>
            <Link href="/listings" className="text-red-600 hover:underline text-sm font-medium">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featured.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        </section>
      )}

      {/* Recently listed */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Recently Listed</h2>
          <Link href="/listings" className="text-red-600 hover:underline text-sm font-medium">View all listings</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recent.map(car => <CarCard key={car.id} car={car} />)}
        </div>
      </section>

      {/* Sell CTA banner */}
      <section className="bg-red-600 text-white py-16 mt-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Sell Your Classic?</h2>
          <p className="text-red-100 text-lg mb-8">Reach thousands of serious buyers across the country. List your car in minutes.</p>
          <Link href="/sell"
            className="inline-block bg-white text-red-600 font-bold text-lg px-10 py-4 rounded-xl hover:bg-red-50 transition-colors shadow-lg">
            Post Your Listing — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Popular makes */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">Shop by Make</h2>
        <div className="flex flex-wrap gap-3">
          {MAKES.filter(m => m !== 'All Makes').map(make => (
            <Link key={make} href={`/listings?make=${encodeURIComponent(make)}`}
              className="px-5 py-2.5 bg-white border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 hover:border-red-400 hover:text-red-600 transition-colors shadow-sm">
              {make}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
