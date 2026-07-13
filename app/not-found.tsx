import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="" width={64} height={64} unoptimized className="mb-6 inline-block" />
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-3">Page not found</h1>
        <p className="text-zinc-500 text-sm mb-8">
          The page you're looking for doesn't exist or may have been moved.
          If you were looking for a listing, it may have been sold or removed.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/listings"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Browse listings
          </Link>
          <Link
            href="/"
            className="border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
