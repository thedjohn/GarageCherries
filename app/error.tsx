'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🍒</div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-3">Something went wrong</h1>
        <p className="text-zinc-500 text-sm mb-8">
          We hit an unexpected error. Our team has been notified. You can try again or head back to the homepage.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Try again
          </button>
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
