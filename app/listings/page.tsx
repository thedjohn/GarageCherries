import { Suspense } from 'react';
import { Metadata } from 'next';
import CarCard from '@/components/CarCard';
import SearchFilters from '@/components/SearchFilters';
import Pagination from '@/components/Pagination';
import { createClient } from '@/lib/supabase/server';
import type { Car } from '@/lib/types';

const PAGE_SIZE = 9; // 3 rows at the 3-column (xl) breakpoint

export const metadata: Metadata = {
  title: 'Cars For Sale — Classic, Muscle, Sport & Collector',
  description: 'Browse classic, muscle, sport, supercar, and collector vehicles for sale from private sellers and trusted dealers worldwide. Filter by make, year, price, and condition.',
  alternates: { canonical: 'https://www.garagecherries.com/listings' },
};

interface Props {
  searchParams: Promise<{
    q?: string; make?: string; model?: string; yearMin?: string; yearMax?: string;
    priceMin?: string; priceMax?: string; condition?: string;
    bodyStyle?: string; transmission?: string; state?: string; page?: string;
  }>;
}

export default async function ListingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,transmission,engine,color,images,description,seller_name,seller_phone,featured,listed_at', { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_sold', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('listed_at', { ascending: false })
    .order('id', { ascending: true }); // tiebreaker -- listed_at is text and often shared across bulk-imported rows, so pagination needs a unique secondary key to avoid duplicate/skipped rows across pages

  if (sp.q) query = query.or(`title.ilike.%${sp.q}%,description.ilike.%${sp.q}%`);
  if (sp.make && sp.make !== 'All Makes') query = query.eq('make', sp.make);
  if (sp.model) query = query.eq('model', sp.model);
  const currentYear = new Date().getFullYear();
  const clampYear = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1900), currentYear + 1) : null;
  };
  if (sp.yearMin) { const y = clampYear(sp.yearMin); if (y !== null) query = query.gte('year', y); }
  if (sp.yearMax) { const y = clampYear(sp.yearMax); if (y !== null) query = query.lte('year', y); }
  if (sp.priceMin)     query = query.gte('price', Number(sp.priceMin));
  if (sp.priceMax)     query = query.lte('price', Number(sp.priceMax));
  if (sp.condition && sp.condition !== 'All')      query = query.eq('condition', sp.condition);
  if (sp.bodyStyle && sp.bodyStyle !== 'All Styles') query = query.eq('body_style', sp.bodyStyle);
  if (sp.transmission) query = query.eq('transmission', sp.transmission);
  if (sp.state)        query = query.eq('state', sp.state);

  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: dbRows, count, error: listingsError } = await query;
  if (listingsError) console.error('Listings query error:', listingsError.message, listingsError.details);
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const activeListingsFilter = () => supabase
    .from('listings')
    .select('year')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const [{ data: minYearRow }, { data: maxYearRow }] = await Promise.all([
    activeListingsFilter().order('year', { ascending: true }).limit(1),
    activeListingsFilter().order('year', { ascending: false }).limit(1),
  ]);
  const minYear = minYearRow?.[0]?.year ?? null;
  const maxYear = maxYearRow?.[0]?.year ?? null;

  const cars: Car[] = (dbRows ?? []).map(r => ({
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
  const hasFilters = Object.entries(sp).some(([k, v]) => k !== 'page' && Boolean(v));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-zinc-900">
          {hasFilters ? 'Search Results' : 'All Cars'}
        </h1>
        <p className="text-zinc-500 mt-1">{totalCount} listing{totalCount !== 1 ? 's' : ''} found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <Suspense>
          <SearchFilters minYear={minYear} maxYear={maxYear} />
        </Suspense>

        <div className="flex-1">
          {cars.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-16 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <h3 className="text-xl font-bold text-zinc-800 mb-2">No listings found</h3>
              <p className="text-zinc-500">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {cars.map(car => <CarCard key={car.id} car={car} />)}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} basePath="/listings" searchParams={sp} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
