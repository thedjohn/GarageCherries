'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'gc_promo_250_banner_dismissed';

export default function PromoBanner() {
  // Defaults to visible: most visitors are new (no dismiss flag set yet), so
  // rendering it from the first paint avoids the layout shift that showing it
  // late (after an effect) would cause for the majority of sessions. Only the
  // minority who already dismissed it this session see it hide right after mount.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(false);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-[#0D2050] text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="text-lg shrink-0">🇺🇸</span>
        <p className="text-sm leading-snug">
          <span className="font-bold text-yellow-300">Free listing till end of year</span>
          {' '}— celebrating America&apos;s 250th birthday. Dealers &amp; private sellers.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/account/signup?promo=250th"
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Claim offer
        </Link>
        <button
          onClick={dismiss}
          className="text-white/50 hover:text-white text-xl leading-none px-1 transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
