import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, toSegment } from '@/lib/data';
import RemoveWatchButton from '@/components/RemoveWatchButton';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'My Watchlist — GarageCherries',
};

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/account/login');

  const [{ data: watchRows }, { data: profile }] = await Promise.all([
    supabase.from('watchlists').select('id, car_id, price_at_add, added_at')
      .eq('user_id', user.id).order('added_at', { ascending: false }),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ]);

  const carIds = (watchRows ?? []).map((r: any) => r.car_id);
  const { data: carsData } = carIds.length
    ? await supabase.from('cars').select('*').in('id', carIds)
    : { data: [] };

  const carsById = Object.fromEntries((carsData ?? []).map((c: any) => [c.id, c]));
  const items = (watchRows ?? [])
    .map((e: any) => ({ ...e, cars: carsById[e.car_id] ?? null }))
    .filter((e: any) => e.cars);

  const displayName = profile?.full_name || user.email;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">My Watchlist</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {items.length} saved listing{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium text-zinc-700">{displayName}</p>
          <div className="flex items-center gap-3 justify-end text-xs">
            <Link href="/account/profile" className="text-red-600 hover:underline">Account settings</Link>
            <SignOutButton />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
          <p className="text-5xl mb-4">🔖</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No saved listings yet</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Click "Watch this Listing" on any car to save it here and get notified when the price drops.
          </p>
          <Link href="/listings"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Browse Listings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry: any) => {
            const car = entry.cars;
            const priceDiff = car.price - entry.price_at_add;
            const listingUrl = `/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`;

            return (
              <div key={entry.id}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex gap-4 items-center">
                <Link href={listingUrl} className="shrink-0">
                  {car.images?.[0] ? (
                    <Image src={car.images[0]} alt={car.title} width={128} height={80}
                      className="w-32 h-20 object-cover rounded-xl" />
                  ) : (
                    <div className="w-32 h-20 bg-zinc-100 rounded-xl flex items-center justify-center text-3xl">🚗</div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={listingUrl}
                    className="font-bold text-zinc-900 hover:text-red-600 transition-colors line-clamp-1 block">
                    {car.title}
                  </Link>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {car.condition} · {car.location}{car.state ? `, ${car.state}` : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-lg font-bold text-red-600">{formatPrice(car.price)}</span>
                    {priceDiff < 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        ▼ {formatPrice(Math.abs(priceDiff))} drop
                      </span>
                    )}
                    {priceDiff > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        ▲ {formatPrice(priceDiff)} increase
                      </span>
                    )}
                    {entry.price_at_add > 0 && (
                      <span className="text-xs text-zinc-400">Saved at {formatPrice(entry.price_at_add)}</span>
                    )}
                  </div>
                </div>

                <RemoveWatchButton carId={car.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
