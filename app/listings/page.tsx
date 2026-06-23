import { Suspense } from 'react';
import { Metadata } from 'next';
import CarCard from '@/components/CarCard';
import SearchFilters from '@/components/SearchFilters';
import SmartSearchBar from '@/components/SmartSearchBar';
import SaveSearchButton from '@/components/SaveSearchButton';
import { fetchCars, fetchMakes } from '@/lib/db';
import SponsorCard from '@/components/SponsorCard';

export const metadata: Metadata = {
  title: 'Classic Cars For Sale',
  description: 'Browse thousands of classic cars, muscle cars, and collector vehicles for sale from trusted dealers across the United States. Filter by make, year, price, and condition.',
  alternates: { canonical: 'https://www.garagecherries.com/listings' },
};

interface Props {
  searchParams: Promise<{
    make?: string; yearMin?: string; yearMax?: string;
    priceMin?: string; priceMax?: string; condition?: string;
    bodyStyle?: string; transmission?: string; state?: string;
  }>;
}

export default async function ListingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [cars, makes] = await Promise.all([
    fetchCars({
      make:         sp.make,
      yearMin:      sp.yearMin  ? Number(sp.yearMin)  : undefined,
      yearMax:      sp.yearMax  ? Number(sp.yearMax)  : undefined,
      priceMin:     sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax:     sp.priceMax ? Number(sp.priceMax) : undefined,
      condition:    sp.condition,
      bodyStyle:    sp.bodyStyle,
      transmission: sp.transmission as any,
      state:        sp.state,
    }),
    fetchMakes(),
  ]);

  const hasFilters = Object.values(sp).some(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-zinc-900">
          {hasFilters ? 'Search Results' : 'All Classic Cars'}
        </h1>
        <p className="text-zinc-500 mt-1">{cars.length} listing{cars.length !== 1 ? 's' : ''} found</p>
      </div>

      <SmartSearchBar />

      <div className="mt-4">
        <SponsorCard
          name="Detail 360"
          tagline="Professional auto detailing for your classic. St. Louis, MO."
          logoUrl="https://lirp.cdn-website.com/ef1e4ee0/dms3rep/multi/opt/detail-360-logo-sq-204w.jpg"
          href="https://www.detail360stl.com/"
          cta="Book a Detail"
          layout="horizontal"
        />
      </div>

      {hasFilters && (
        <div className="mt-3 mb-1">
          <Suspense>
            <SaveSearchButton />
          </Suspense>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 mt-4">
        <Suspense>
          <SearchFilters initialMakes={makes} />
        </Suspense>

        <div className="flex-1">
          {cars.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-16 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <h3 className="text-xl font-bold text-zinc-800 mb-2">No listings found</h3>
              <p className="text-zinc-500">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {cars.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
