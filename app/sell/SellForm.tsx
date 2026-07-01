'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { MAKES, BODY_STYLES, CONDITIONS } from '@/lib/types';

type UploadState = 'pending' | 'uploading' | 'done' | 'error';

interface ImageEntry {
  file: File;
  preview: string;
  uploadState: UploadState;
  publicUrl: string | null;
  progress: number; // 0-100
}

export default function SellForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  async function uploadImage(entry: ImageEntry, index: number): Promise<string | null> {
    // Get a signed upload URL from our API
    const res = await fetch('/api/listings/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: entry.file.name, contentType: entry.file.type }),
    });
    if (!res.ok) return null;
    const { signedUrl, publicUrl } = await res.json();

    // Upload directly to Supabase Storage — server never touches the bytes
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', entry.file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setImages(prev => prev.map((img, i) => i === index ? { ...img, progress: pct } : img));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'done', publicUrl, progress: 100 } : img));
          resolve(publicUrl);
        } else {
          setImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'error' } : img));
          resolve(null);
        }
      };
      xhr.onerror = () => {
        setImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'error' } : img));
        resolve(null);
      };
      xhr.send(entry.file);
    });
  }

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const slots = 30 - images.length;
    if (slots <= 0) return;
    const toAdd = files.slice(0, slots);

    // Add entries immediately so thumbnails appear, then upload in parallel
    const newEntries: ImageEntry[] = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploadState: 'uploading' as UploadState,
      publicUrl: null,
      progress: 0,
    }));

    setImages(prev => {
      const updated = [...prev, ...newEntries];
      // Kick off parallel uploads — use updated array indices
      newEntries.forEach((entry, i) => {
        const index = prev.length + i;
        uploadImage(entry, index);
      });
      return updated;
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const retryUpload = (index: number) => {
    setImages(prev => {
      const entry = prev[index];
      if (!entry) return prev;
      const updated = prev.map((img, i) => i === index ? { ...img, uploadState: 'uploading' as UploadState, progress: 0 } : img);
      uploadImage(updated[index], index);
      return updated;
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Block if any images are still uploading
    const stillUploading = images.some(img => img.uploadState === 'uploading');
    if (stillUploading) {
      setError('Please wait for all photos to finish uploading.');
      return;
    }
    const failedUploads = images.filter(img => img.uploadState === 'error');
    if (failedUploads.length > 0) {
      setError('Some photos failed to upload. Remove or retry them before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const imageUrls = images.map(img => img.publicUrl).filter(Boolean) as string[];
    formData.set('imageUrls', JSON.stringify(imageUrls));

    const res = await fetch('/api/listings/submit', { method: 'POST', body: formData });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (json.error === 'LISTING_LIMIT') {
        setLimitReached(true);
      } else {
        setError(json.message ?? json.error ?? 'Something went wrong. Please try again.');
      }
      return;
    }

    setSubmitted(true);
  }

  if (limitReached) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-3">Listing Limit Reached</h1>
        <p className="text-zinc-500 text-base mb-6">
          Private sellers can have up to <strong>10 active listings</strong> at a time.
          You&apos;ve reached that limit. Once one of your listings sells or is removed, you can post again.
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          If you&apos;re selling multiple vehicles regularly, a <strong>Dealer account</strong> gives you unlimited listings plus a dedicated profile page.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/account?tab=watchlist"
            className="px-6 py-3 border border-zinc-200 rounded-xl text-zinc-700 font-semibold hover:bg-zinc-50 transition-colors text-sm">
            Manage My Listings
          </Link>
          <Link href="/contact"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-sm">
            Inquire About Dealer Account
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">🍒</div>
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-3">Listing Submitted!</h1>
        <p className="text-zinc-500 text-lg">We&apos;ll review your listing and have it live within 24 hours. Check your email for confirmation.</p>
      </div>
    );
  }

  const inputCls = 'w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300';
  const allUploaded = images.length > 0 && images.every(img => img.uploadState === 'done');
  const anyUploading = images.some(img => img.uploadState === 'uploading');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900">Post Your Car</h1>
        <p className="text-zinc-500 mt-1">It&apos;s free and takes less than 5 minutes.</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        {/* Vehicle info */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-800 text-lg mb-5">Vehicle Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Year *</label>
              <input name="year" type="number" required min="1900" max="2030" placeholder="1969" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Make *</label>
              <select name="make" required className={inputCls}>
                <option value="">Select make...</option>
                {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Model *</label>
              <input name="model" type="text" required placeholder="Camaro SS" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Mileage</label>
              <input name="mileage" type="number" min="0" placeholder="Leave blank if unknown" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Body Style</label>
              <select name="bodyStyle" className={inputCls}>
                {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Condition *</label>
              <select name="condition" required className={inputCls}>
                <option value="">Select condition...</option>
                {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Engine</label>
              <input name="engine" type="text" placeholder="396 V8" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Transmission</label>
              <select name="transmission" className={inputCls}>
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Color</label>
              <input name="color" type="text" placeholder="Rally Green" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Asking Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input name="price" type="number" required min="0" placeholder="89500"
                  className="w-full border border-zinc-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-300" />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Description *</label>
            <textarea name="description" required rows={5}
              placeholder="Describe your car — history, restoration work, known issues, matching numbers, etc."
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-zinc-300" />
          </div>
        </section>

        {/* Photos */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-zinc-800 text-lg">Photos</h2>
            <div className="flex items-center gap-2">
              {anyUploading && (
                <span className="text-xs text-zinc-400 animate-pulse">Uploading…</span>
              )}
              {allUploaded && (
                <span className="text-xs text-emerald-600 font-semibold">✓ All photos ready</span>
              )}
              <span className="text-xs text-zinc-400">{images.length}/30 photos</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mb-4">First photo is the cover. Drag to reorder. Photos upload in the background as you fill in the form.</p>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {images.map((img, i) => (
                <div key={img.preview} draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => { e.preventDefault(); setDragOver(i); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(i)}
                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${dragOver === i ? 'border-red-500 scale-105' : img.uploadState === 'error' ? 'border-red-400' : 'border-zinc-100'}`}>

                  {/* Cover / number badge */}
                  <span className={`absolute top-1 left-1 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded ${i === 0 ? 'bg-red-600 text-white' : 'bg-black/60 text-white'}`}>
                    {i === 0 ? 'Cover' : i + 1}
                  </span>

                  <img src={img.preview} alt="" className="w-full h-full object-cover" />

                  {/* Upload progress overlay */}
                  {img.uploadState === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                      <div className="w-10 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${img.progress}%` }} />
                      </div>
                      <span className="text-white text-[10px]">{img.progress}%</span>
                    </div>
                  )}

                  {/* Error overlay */}
                  {img.uploadState === 'error' && (
                    <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1">
                      <span className="text-white text-[10px] font-bold">Failed</span>
                      <button type="button" onClick={() => retryUpload(i)}
                        className="text-white text-[10px] underline">Retry</button>
                    </div>
                  )}

                  {/* Done checkmark */}
                  {img.uploadState === 'done' && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Remove button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1">
                    <button type="button" onClick={() => removeImage(i)}
                      className="text-white text-xs bg-red-600/90 hover:bg-red-600 rounded px-1.5 py-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              <input name="city" type="text" required placeholder="Nashville" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State *</label>
              <input name="state" type="text" required maxLength={2} placeholder="TN" className={inputCls} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-800 text-lg mb-5">Your Contact Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Name *</label>
              <input name="sellerName" type="text" required placeholder="John Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone *</label>
              <input name="sellerPhone" type="tel" required placeholder="(615) 555-0100" className={inputCls}
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
              <input name="sellerEmail" type="email" required placeholder="you@example.com" className={inputCls} />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting || anyUploading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg">
          {submitting ? 'Submitting…' : anyUploading ? 'Waiting for photos…' : 'Submit My Listing — Free'}
        </button>
      </form>
    </div>
  );
}
