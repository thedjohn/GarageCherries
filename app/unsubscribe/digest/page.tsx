import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export default async function UnsubscribeDigestPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const { uid } = await searchParams;

  let success = false;
  let alreadyDone = false;
  let invalid = false;

  if (uid) {
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.admin.getUserById(uid);

    if (error || !user) {
      invalid = true;
    } else if (user.user_metadata?.digest_opt_out) {
      alreadyDone = true;
    } else {
      await admin.auth.admin.updateUserById(uid, {
        user_metadata: { ...user.user_metadata, digest_opt_out: true },
      });
      success = true;
    }
  } else {
    invalid = true;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <span className="text-2xl">🍒</span>
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
                You won't receive any more weekly digest emails from GarageCherries.
                Your account and watchlist are unaffected.
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
