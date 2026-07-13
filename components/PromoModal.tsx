'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'gc_promo_250_seen';
const PROMO_IMG = 'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/promo/gc%20eagle.png';

export default function PromoModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const promoExpired = new Date() > new Date('2026-12-31T23:59:59');
    if (!promoExpired && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const claim = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
    router.push('/account/signup?promo=250th');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Image */}
        <div className="relative w-full bg-zinc-900" style={{aspectRatio: '16/9'}}>
          <Image
            src={PROMO_IMG}
            alt="Free listing till end of year — America's 250th Birthday"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        {/* Body */}
        <div className="px-6 py-5">
          <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            🇺🇸 Limited time offer
          </span>
          <h2 className="text-2xl font-extrabold text-zinc-900 leading-tight mb-2">
            Free listing till end of year<br />
            <span className="text-red-600">for dealers &amp; private sellers</span>
          </h2>
          <p className="text-zinc-500 text-sm mb-5 leading-relaxed">
            Celebrating America&apos;s 250th birthday — post your classic car for free and reach serious buyers nationwide.
          </p>
          <div className="flex gap-3">
            <button
              onClick={claim}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              Get started — it&apos;s free
            </button>
            <button
              onClick={dismiss}
              className="px-4 border border-zinc-200 hover:border-zinc-300 text-zinc-500 font-medium rounded-xl text-sm transition-colors"
            >
              Not now
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-3 text-center">
            No credit card required. Offer valid through December 31, 2026.
          </p>
        </div>
      </div>
    </div>
  );
}
