import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/server';
import { formatPrice, formatMileage, toSegment } from '@/lib/data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Recently Sold Classic Cars | GarageCherries',
  description: 'Browse classic cars recently sold on GarageCherries. See what muscle cars, collector vehicles, and vintage automobiles have sold for across the USA.',
  alternates: { canonical: 'https://www.garagecherries.com/sold' },
};

interface SoldCar {
  id: string; slug: string; title: string; year: number;
  make: string; model: string; price: number; mileage: number | null;
  location: string | null; state: string | null;
  condition: string; body_style: string; images: string[];
  sold_at: string | null;
}

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-800',
  Good: 'bg-blue-100 text-blue-800',
  Fair: 'bg-yellow-100 text-yellow-800',
  Project: 'bg-red-100 text-red-800',
};

export default async function SoldPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('listings')
    .select('id, slug, title, year, make, model, price, mileage, location, state, condition, body_style, images, sold_at')
    .eq('status', 'approved')
    .eq('is_sold', true)
    .order('sold_at', { ascending: false })
    .limit(120);

  const cars: SoldCar[] = data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Recently Sold</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Classic cars, muscle cars, and collector vehicles that have recently sold on GarageCherries.
          Prices shown are the original asking price.
        </p>
      </div>

      {cars.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🏁</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No sold listings yet</h2>
          <p className="text-zinc-500 text-sm mb-6">Check back soon — sold vehicles will appear here as deals close.</p>
          <Link href="/listings" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
            Browse Available Cars →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400 mb-6">{cars.length} vehicle{cars.length !== 1 ? 's' : ''} sold</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cars.map(car => (
              <SoldCard key={car.id} car={car} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-400 mb-4">Looking for your next classic?</p>
            <Link href="/listings" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
              Browse Available Cars →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function SoldCard({ car }: { car: SoldCar }) {
  const href = `/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`;
  const image = car.images?.[0];
  const soldDate = car.sold_at
    ? new Date(car.sold_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <Link href={href} className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 relative">
      {/* Sold ribbon */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-zinc-900/80 text-white text-xs font-bold text-center py-1 tracking-widest uppercase">
        Sold{soldDate ? ` · ${soldDate}` : ''}
      </div>

      {/* Image */}
      <div className="relative h-48 bg-zinc-200 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={car.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 grayscale-[30%]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">No photo</div>
        )}
        <span className={`absolute bottom-2 right-2 text-xs font-semibold px-2 py-1 rounded ${CONDITION_COLORS[car.condition] ?? 'bg-zinc-100 text-zinc-600'}`}>
          {car.condition}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-zinc-900 text-base leading-tight group-hover:text-red-600 transition-colors line-clamp-1">
          {car.title}
        </h3>
        {car.mileage != null && (
          <p className="text-sm text-zinc-500 mt-0.5">{formatMileage(car.mileage)}</p>
        )}
        {(car.location || car.state) && (
          <p className="text-xs text-zinc-400 mt-0.5">{[car.location, car.state].filter(Boolean).join(', ')}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
          <div>
            <p className="text-xs text-zinc-400 leading-none mb-0.5">Listed at</p>
            <p className="text-lg font-bold text-zinc-900">{formatPrice(car.price)}</p>
          </div>
          <span className="text-xs text-zinc-400">{car.body_style}</span>
        </div>
      </div>
    </Link>
  );
}
