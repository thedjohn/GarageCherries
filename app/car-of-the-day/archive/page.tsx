import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import type { Car } from '@/lib/types';
import CarCard from '@/components/CarCard';

export const revalidate = 0;

export const metadata = {
  title: 'GarageCherry Pick of the Day Archive',
  description: 'Every past GarageCherry Pick of the Day, all in one place.',
  alternates: { canonical: 'https://www.garagecherries.com/car-of-the-day/archive' },
};

interface ArchivedListing {
  id: string; slug: string; title: string; year: number; make: string; model: string;
  price: number; mileage: number | null; location: string | null; state: string | null;
  condition: string | null; body_style: string; transmission: string; engine: string | null;
  color: string | null; images: string[] | null; description: string | null;
  seller_name: string | null; seller_phone: string | null; featured: boolean | null; listed_at: string | null;
}

interface ArchivedPick {
  featured_date: string;
  listings: ArchivedListing | null;
}

export default async function CarOfTheDayArchivePage() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await admin
    .from('garagecherry_of_the_day')
    .select('featured_date, listings(id, slug, title, year, make, model, price, mileage, location, state, condition, body_style, transmission, engine, color, images, description, seller_name, seller_phone, featured, listed_at)')
    .lt('featured_date', today)
    .order('featured_date', { ascending: false });

  const picks = ((data ?? []) as unknown as ArchivedPick[]).filter(p => p.listings);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
        <Link href="/car-of-the-day" className="hover:text-red-600 transition-colors">GarageCherry Pick of the Day</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-zinc-700">Archive</span>
      </nav>

      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-2">GarageCherry Pick of the Day Archive</h1>
        <p className="text-zinc-500">Every past pick, all in one place.</p>
      </div>

      {picks.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🍒</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No past picks yet</h2>
          <p className="text-zinc-500 text-sm">Check back after today's GarageCherry Pick of the Day has been featured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {picks.map(p => {
            const l = p.listings!;
            const car: Car = {
              id: l.id, slug: l.slug, title: l.title,
              year: l.year, make: l.make, model: l.model ?? '',
              price: l.price, mileage: l.mileage,
              location: l.location ?? '', state: l.state ?? '',
              condition: l.condition, bodyStyle: l.body_style,
              transmission: l.transmission, engine: l.engine,
              color: l.color, images: l.images ?? [],
              description: l.description ?? '',
              sellerId: '', sellerName: l.seller_name ?? '', sellerPhone: l.seller_phone ?? '',
              featured: l.featured ?? false, listedAt: l.listed_at ?? '',
            };
            return (
              <div key={p.featured_date}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  {new Date(p.featured_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <CarCard car={car} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
