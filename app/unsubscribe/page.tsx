import Image from 'next/image';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let success = false;
  let alreadyDone = false;

  if (id) {
    const admin = createAdminClient();
    const { data: entry } = await admin.from('watchlists').select('id, dealer_contact_blocked').eq('id', id).single();

    if (entry) {
      if (entry.dealer_contact_blocked) {
        alreadyDone = true;
      } else {
        await admin.from('watchlists').update({ dealer_contact_blocked: true }).eq('id', id);
        success = true;
      }
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="GarageCherries" width={32} height={32} unoptimized />
          <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
        </Link>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          {success || alreadyDone ? (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">
                {alreadyDone ? 'Already unsubscribed' : 'You\'ve been unsubscribed'}
              </h1>
              <p className="text-sm text-zinc-500 mb-6">
                You won't receive any more seller messages for this listing.
                Your watchlist is unaffected — the car is still saved.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h1 className="text-xl font-bold text-zinc-900 mb-2">Invalid link</h1>
              <p className="text-sm text-zinc-500 mb-6">
                This unsubscribe link is invalid or has expired.
              </p>
            </>
          )}
          <Link href="/listings"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  );
}
