import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Car } from '@/lib/types';
import CarCard from '@/components/CarCard';
import Pagination from '@/components/Pagination';
import { PriceTierContent } from '@/lib/priceTiers';

const PAGE_SIZE = 3; // 1 row at the 3-column (lg) breakpoint, matching /cars/[decade]

export default async function PriceTierPage({ content, page = 1 }: { content: PriceTierContent; page?: number }) {
  const supabase = await createClient();
  let query = supabase
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,transmission,engine,color,images,description,seller_name,seller_phone,featured,listed_at', { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_sold', false)
    .gte('price', content.min)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('listed_at', { ascending: false })
    .order('id', { ascending: true }); // tiebreaker for stable pagination -- see app/listings/page.tsx

  if (content.max !== null) query = query.lt('price', content.max);

  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: dbRows, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Car Guide', item: 'https://www.garagecherries.com/cars' },
      { '@type': 'ListItem', position: 3, name: `Classic Cars ${content.label}`, item: `https://www.garagecherries.com/cars/${content.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
          <Link href="/cars" className="hover:text-red-600 transition-colors">Car Guide</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-zinc-700">{content.label}</span>
        </nav>

        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Classic Cars {content.label}</h1>
        <p className="text-zinc-500 mb-10">{content.tagline}</p>

        <p className="text-zinc-600 leading-relaxed mb-12">{content.overview}</p>

        <h2 className="text-xl font-bold text-zinc-900 mb-5">Buying Tips</h2>
        <ul className="space-y-3 mb-12">
          {content.buyingTips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-zinc-600 leading-relaxed">
              <span className="text-red-600 font-bold shrink-0">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <h2 className="text-xl font-bold text-zinc-900 mb-5">
          Listings {content.label} {totalCount > 0 && <span className="text-zinc-400 font-normal">({totalCount})</span>}
        </h2>
        {totalCount === 0 ? (
          <p className="text-zinc-400 text-sm mb-8">
            No listings in this range right now — <Link href="/listings" className="text-red-600 hover:underline">browse all cars for sale</Link>.
          </p>
        ) : (
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cars.map(car => <CarCard key={car.id} car={car} />)}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} basePath={`/cars/${content.slug}`} />
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-zinc-100">
          <Link href="/cars" className="text-sm text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Car Guides
          </Link>
        </div>
      </div>
    </>
  );
}
