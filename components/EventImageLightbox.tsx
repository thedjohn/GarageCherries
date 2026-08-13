'use client';
import { useState, useEffect } from 'react';

// Single-image version of ImageGallery's lightbox pattern -- that component
// is built for multi-image carousels with a fixed-crop main view, which
// would re-crop the event flyer this is meant to show in full. Kept as its
// own small component rather than adding an object-contain mode to the
// shared gallery, since that's used on every listing page and this is a
// different, events-only need.
export default function EventImageLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className="relative w-full max-h-[420px] bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden cursor-zoom-in group mb-6"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className="w-full max-h-[420px] object-contain" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Click to expand
          </span>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors z-10"
            aria-label="Close"
          >
            ×
          </button>
          <img src={src} alt={alt} className="max-w-[95vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
