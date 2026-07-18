import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import DealerWebsiteLink from '@/components/DealerWebsiteLink';

export const metadata: Metadata = {
  title: 'Car Dealers — Classic, Muscle, Sport & Collector',
  description: 'Browse trusted specialty car dealers across the United States on GarageCherries. Find local dealers specializing in classic, muscle, sport, and collector vehicles.',
  alternates: { canonical: 'https://www.garagecherries.com/dealers' },
};

export default async function DealersPage() {
  const supabase = await createClient();
  const { data: dealers } = await supabase
    .from('dealers')
    .select('id,slug,name,location,state,description,specialties,since,logo,website')
    .order('name', { ascending: true });

  const dealerList = dealers ?? [];

  // Get approved listing counts per dealer
  const { data: listingCounts } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('status', 'approved')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const countByDealer: Record<string, number> = {};
  for (const row of listingCounts ?? []) {
    if (row.seller_id) countByDealer[row.seller_id] = (countByDealer[row.seller_id] ?? 0) + 1;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900">Car Dealers</h1>
        <p className="text-zinc-500 mt-1">{dealerList.length} verified dealer{dealerList.length !== 1 ? 's' : ''} across the United States</p>
      </div>

      {dealerList.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">No dealers listed yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealerList.map(dealer => {
            const listingCount = countByDealer[dealer.id] ?? 0;
            const specialties: string[] = dealer.specialties ?? [];
            return (
              <Link key={dealer.id} href={`/dealers/${dealer.slug}`}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-lg hover:border-red-200 transition-all p-6 group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {dealer.logo ? (
                      <Image src={dealer.logo} alt={`${dealer.name} logo`} width={44} height={44} className="object-contain w-full h-full" />
                    ) : (
                      <span className="text-2xl">🏎️</span>
                    )}
                  </div>
                  {dealer.since && (
                    <span className="text-xs font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
                      Est. {dealer.since}
                    </span>
                  )}
                </div>

                <h2 className="font-bold text-zinc-900 text-lg group-hover:text-red-600 transition-colors leading-tight mb-1">
                  {dealer.name}
                </h2>

                {(dealer.location || dealer.state) && (
                  <div className="flex items-center gap-1 text-sm text-zinc-400 mb-3">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {[dealer.location, dealer.state].filter(Boolean).join(', ')}
                  </div>
                )}

                {dealer.description && (
                  <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-4">
                    {dealer.description}
                  </p>
                )}

                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {specialties.map(s => (
                      <span key={s} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {dealer.website && <DealerWebsiteLink website={dealer.website} />}

                <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-700">
                    {listingCount} active listing{listingCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-red-600 text-sm font-semibold group-hover:underline">
                    View inventory →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
