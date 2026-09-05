'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/gtag';

// Shows a quick confirmation toast after a save-without-account car save.
// The actual save now happens server-side in /auth/callback, before the
// redirect that lands here -- this component only has to notice the
// `saved=1` marker it left behind and clean up the URL.
function PendingSaveInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (params.get('saved') !== '1' || handledRef.current) return;
    handledRef.current = true;
    setShow(true);
    // The passwordless flow's actual save happens server-side in
    // /auth/callback -- no client code runs at that moment to fire GA4's
    // watchlist_add, so this is the only place that path's completion can
    // be tracked. Kept consistent with the already-logged-in path's event
    // (WatchlistButton.tsx) so watchlist_add reflects total completed
    // saves regardless of which flow got them there.
    trackEvent('watchlist_add', { source: 'magic_link' });

    const url = new URL(window.location.href);
    url.searchParams.delete('saved');
    router.replace(url.pathname + url.search);

    const timer = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(timer);
  }, [params, router]);

  if (!show) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
      Saved to your watchlist
    </div>
  );
}

export default function PendingSaveHandler() {
  return (
    <Suspense>
      <PendingSaveInner />
    </Suspense>
  );
}
