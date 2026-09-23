import Link from 'next/link';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/server';
import { formatListingPrice, formatMileage, toSegment } from '@/lib/data';

export const revalidate = 0;

export const metadata = {
  title: 'GarageCherry Pick of the Day',
  description: 'A new classic, muscle, or collector car featured every day.',
  alternates: { canonical: 'https://www.garagecherries.com/car-of-the-day' },
};

interface FeaturedListing {
  id: string; slug: string; title: string; year: number; make: string; model: string;
  price: number; mileage: number | null; location: string | null; state: string | null;
  images: string[] | null;
}

interface TodaysPick {
  featured_date: string;
  short_description: string | null;
  interesting_facts: string | null;
  listings: FeaturedListing | null;
}

export default async function CarOfTheDayPage() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await admin
    .from('garagecherry_of_the_day')
    .select('featured_date, short_description, interesting_facts, listings(id, slug, title, year, make, model, price, mileage, location, state, images)')
    .eq('featured_date', today)
    .maybeSingle();

  const pick = data as unknown as TodaysPick | null;
  const car = pick?.listings ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-2">GarageCherry Pick of the Day</h1>
        <p className="text-zinc-500">A new classic, muscle, or collector car featured every day.</p>
      </div>

      {!car ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🍒</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No pick for today yet</h2>
          <p className="text-zinc-500 text-sm mb-4">Check back soon, or see past picks below.</p>
          <Link href="/car-of-the-day/archive" className="text-sm font-semibold text-red-600 hover:text-red-700">
            View the archive &rarr;
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
          {car.images?.[0] && (
            <div className="relative h-80 bg-zinc-200">
              <Image src={car.images[0]} alt={car.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
            </div>
          )}
          <div className="p-6">
            <h2 className="text-2xl font-extrabold text-zinc-900 mb-1">{car.title}</h2>
            <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
              <span>{formatListingPrice(car.price)}</span>
              <span>·</span>
              <span>{formatMileage(car.mileage)}</span>
              {car.location && (
                <>
                  <span>·</span>
                  <span>{car.location}{car.state ? `, ${car.state}` : ''}</span>
                </>
              )}
            </div>
            {pick?.short_description && <p className="text-zinc-700 mb-4">{pick.short_description}</p>}
            {pick?.interesting_facts && (
              <div className="bg-zinc-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Interesting Facts</p>
                <p className="text-sm text-zinc-700 whitespace-pre-line">{pick.interesting_facts}</p>
              </div>
            )}
            <Link
              href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`}
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              View Full Listing &rarr;
            </Link>
          </div>
        </div>
      )}

      <div className="text-center mt-8">
        <Link href="/car-of-the-day/archive" className="text-sm font-semibold text-zinc-500 hover:text-red-600">
          See past GarageCherries of the Day &rarr;
        </Link>
      </div>
    </div>
  );
}
