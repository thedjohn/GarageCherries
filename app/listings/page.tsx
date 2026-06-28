import { Suspense } from 'react';
import { Metadata } from 'next';
import CarCard from '@/components/CarCard';
import SearchFilters from '@/components/SearchFilters';
import SmartSearchBar from '@/components/SmartSearchBar';
import { searchCars } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { Car } from '@/lib/types';

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

  // Fetch approved listings from Supabase
  const supabase = await createClient();
  const { data: dbRows } = await supabase
    .from('cars')
    .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,transmission,engine,color,images,description,seller_name,seller_phone,featured,listed_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  const dbCars: Car[] = (dbRows ?? []).map(r => ({
    id: r.id, slug: r.slug, title: r.title,
    year: r.year, make: r.make, model: r.model,
    price: r.price, mileage: r.mileage,
    location: r.location ?? '', state: r.state ?? '',
    condition: r.condition, bodyStyle: r.body_style,
    transmission: r.transmission, engine: r.engine,
    color: r.color, images: r.images ?? [],
    description: r.description,
    sellerId: '', sellerName: r.seller_name ?? '', sellerPhone: r.seller_phone ?? '',
    featured: r.featured ?? false, listedAt: r.listed_at ?? '',
  }));

  const staticCars = searchCars({
    make:         sp.make,
    yearMin:      sp.yearMin  ? Number(sp.yearMin)  : undefined,
    yearMax:      sp.yearMax  ? Number(sp.yearMax)  : undefined,
    priceMin:     sp.priceMin ? Number(sp.priceMin) : undefined,
    priceMax:     sp.priceMax ? Number(sp.priceMax) : undefined,
    condition:    sp.condition  as any,
    bodyStyle:    sp.bodyStyle,
    transmission: sp.transmission as any,
    state:        sp.state,
  });

  const cars = [...dbCars, ...staticCars];
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

      <div className="flex flex-col lg:flex-row gap-8">
        <Suspense>
          <SearchFilters />
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
