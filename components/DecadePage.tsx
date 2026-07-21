import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Car } from '@/lib/types';
import CarCard from '@/components/CarCard';
import { DecadeContent, getNotableModelsForDecade } from '@/lib/decades';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function DecadePage({ content }: { content: DecadeContent }) {
  const supabase = await createClient();
  const { data: dbRows } = await supabase
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,transmission,engine,color,images,description,seller_name,seller_phone,featured,listed_at')
    .eq('status', 'approved')
    .eq('is_sold', false)
    .gte('year', content.startYear)
    .lte('year', content.endYear)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('listed_at', { ascending: false });

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

  const notableModels = getNotableModelsForDecade(content);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Car Guide', item: 'https://www.garagecherries.com/cars' },
      { '@type': 'ListItem', position: 3, name: content.label, item: `https://www.garagecherries.com/cars/${content.slug}` },
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

        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">{content.label} Classic Cars</h1>
        <p className="text-zinc-500 mb-10">{content.tagline}</p>

        <p className="text-zinc-600 leading-relaxed mb-12">{content.history}</p>

        {notableModels.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-zinc-900 mb-5">Notable Models</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
              {notableModels.map(entry => (
                <Link
                  key={`${entry.make}-${entry.model}`}
                  href={`/cars/${slugify(entry.make)}/${slugify(entry.model)}`}
                  className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-zinc-900 group-hover:text-red-600 transition-colors">{entry.make} {entry.model}</h3>
                    <span className="text-xs text-zinc-400">{entry.years}</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{entry.overview}</p>
                </Link>
              ))}
            </div>
          </>
        )}

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
          {content.label} Listings {cars.length > 0 && <span className="text-zinc-400 font-normal">({cars.length})</span>}
        </h2>
        {cars.length === 0 ? (
          <p className="text-zinc-400 text-sm mb-8">
            No {content.label.toLowerCase()} listings right now — <Link href="/listings" className="text-red-600 hover:underline">browse all cars for sale</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {cars.map(car => <CarCard key={car.id} car={car} />)}
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
