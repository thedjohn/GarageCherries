'use client';
import { useState, useRef } from 'react';
import { MAKES, BODY_STYLES, CONDITIONS } from '@/lib/types';

export default function SellPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newImages = files
      .filter(() => images.length < 30)
      .slice(0, 30 - images.length)
      .map(file => ({ file, preview: URL.createObjectURL(file) }));
    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onDragStart = (i: number) => { dragIndex.current = i; };

  const onDrop = (i: number) => {
    const from = dragIndex.current;
    if (from === null || from === i) { setDragOver(null); return; }
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(i, 0, item);
      return next;
    });
    dragIndex.current = null;
    setDragOver(null);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">🍒</div>
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-3">Listing Submitted!</h1>
        <p className="text-zinc-500 text-lg">We&apos;ll review your listing and have it live within 24 hours. Check your email for confirmation.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900">Post Your Car</h1>
        <p className="text-zinc-500 mt-1">It&apos;s free and takes less than 5 minutes.</p>
      </div>

      <form onSubmit={async e => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const form = e.currentTarget as HTMLFormElement;
        const fd = new FormData(form);
        images.forEach(img => fd.append('images', img.file));
        const res = await fetch('/api/listings/submit', { method: 'POST', body: fd });
        const json = await res.json();
        setLoading(false);
        if (!res.ok) { setError(json.error ?? 'Submission failed. Please try again.'); return; }
        setSubmitted(true);
      }} className="space-y-8">
        {/* Vehicle info */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-800 text-lg mb-5">Vehicle Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Year *</label>
              <input type="number" name="year" required min="1900" max="2030" placeholder="1969"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Make *</label>
              <select name="make" required className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select make...</option>
                {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Model *</label>
              <input type="text" name="model" required placeholder="Camaro SS"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Mileage</label>
              <input type="number" name="mileage" min="0" placeholder="Leave blank if unknown"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Body Style</label>
              <select name="bodyStyle" className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Condition *</label>
              <select name="condition" required className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select condition...</option>
                {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Engine</label>
              <input type="text" name="engine" placeholder="396 V8"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Transmission</label>
              <select name="transmission" className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Color</label>
              <input type="text" name="color" placeholder="Rally Green"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Asking Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input type="number" name="price" required min="0" placeholder="89500"
                  className="w-full border border-zinc-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Description *</label>
            <textarea name="description" required rows={5} placeholder="Describe your car — history, restoration work, known issues, matching numbers, etc."
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-zinc-300" />
          </div>
        </section>

        {/* Photos */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-zinc-800 text-lg">Photos</h2>
            <span className="text-xs text-zinc-400">{images.length}/30 photos</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">First photo is the cover. Drag to reorder. Up to 30 images, JPG/PNG/WEBP.</p>

          {/* Thumbnails */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {images.map((img, i) => (
                <div
                  key={img.preview}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => { e.preventDefault(); setDragOver(i); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(i)}
                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${dragOver === i ? 'border-red-500 scale-105' : 'border-zinc-100'}`}
                >
                  {/* Order badge */}
                  <span className={`absolute top-1 left-1 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded ${i === 0 ? 'bg-red-600 text-white' : 'bg-black/60 text-white'}`}>
                    {i === 0 ? 'Cover' : i + 1}
                  </span>
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1">
                    <button type="button" onClick={() => removeImage(i)}
                      className="text-white text-xs bg-red-600/90 hover:bg-red-600 rounded px-1.5 py-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {images.length < 30 && (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
              <span className="text-3xl mb-1">📷</span>
              <span className="text-sm font-semibold text-zinc-600">Click to add photos</span>
              <span className="text-xs text-zinc-400 mt-0.5">{30 - images.length} remaining</span>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                multiple className="hidden" onChange={handleImageAdd} />
            </label>
          )}
        </section>

        {/* Location */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-800 text-lg mb-5">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City *</label>
              <input type="text" name="city" required placeholder="Nashville"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State *</label>
              <input type="text" name="state" required maxLength={2} placeholder="TN"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-800 text-lg mb-5">Your Contact Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Name *</label>
              <input type="text" name="sellerName" required placeholder="John Smith"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone *</label>
              <input type="tel" name="sellerPhone" required placeholder="(615) 555-0100"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300"
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let formatted = digits;
                  if (digits.length >= 7) formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                  else if (digits.length >= 4) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                  e.target.value = formatted;
                }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email *</label>
              <input type="email" name="sellerEmail" required placeholder="you@example.com"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
        <button type="submit" disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg">
          {loading ? 'Submitting…' : 'Submit My Listing — Free'}
        </button>
      </form>
    </div>
  );
}
