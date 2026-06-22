'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AdCard from '@/components/AdCard';

function EditAdInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [advertiser, setAdvertiser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    headline: '', bodyCopy: '', ctaLabel: 'Learn More', ctaUrl: '',
    phone: '', logoUrl: '', photoUrl: '', rating: '', reviewCount: '',
  });

  useEffect(() => {
    fetch('/api/advertiser/ads')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push('/advertiser/login'); return; }
        setAdvertiser(data.advertiser);
        const ad = editId ? data.ads.find((a: any) => a.id === editId) : data.ads[0];
        if (ad) {
          setForm({
            headline: ad.headline ?? '',
            bodyCopy: ad.body_copy ?? '',
            ctaLabel: ad.cta_label ?? 'Learn More',
            ctaUrl: ad.cta_url ?? '',
            phone: ad.phone ?? '',
            logoUrl: ad.logo_url ?? '',
            photoUrl: ad.photo_url ?? '',
            rating: ad.rating?.toString() ?? '',
            reviewCount: ad.review_count?.toString() ?? '',
          });
        }
      });
  }, [editId, router]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const uploadFile = async (file: File, field: 'logoUrl' | 'photoUrl') => {
    const setter = field === 'logoUrl' ? setUploadingLogo : setUploadingPhoto;
    setter(true);

    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('ad-assets')
      .upload(path, file, { upsert: true });

    if (error) { setError('Upload failed: ' + error.message); setter(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('ad-assets').getPublicUrl(data.path);
    set(field, publicUrl);
    setter(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/advertiser/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, ...form }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
    setSaved(true);
    setTimeout(() => { router.push('/advertiser/dashboard'); }, 1200);
  };

  const previewAd = {
    id: 'preview', advertiser_id: '',
    headline: form.headline || 'Your headline here',
    body_copy: form.bodyCopy || 'Your description will appear here',
    cta_label: form.ctaLabel || 'Learn More',
    cta_url: form.ctaUrl || '#',
    phone: form.phone || null,
    logo_url: form.logoUrl || null,
    photo_url: form.photoUrl || null,
    rating: form.rating ? Number(form.rating) : null,
    review_count: form.reviewCount ? Number(form.reviewCount) : null,
    business_name: advertiser?.business_name ?? 'Your Business',
    city: advertiser?.city ?? null,
    state: advertiser?.state ?? null,
    category: advertiser?.category ?? null,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/advertiser/dashboard" className="text-zinc-400 hover:text-zinc-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-extrabold text-zinc-900">{editId ? 'Edit Ad' : 'Create Ad'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-zinc-800">Ad Copy</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Headline <span className="text-zinc-300">(60 chars)</span></label>
              <input type="text" maxLength={60} value={form.headline} onChange={e => set('headline', e.target.value)}
                placeholder="Chicago's premier classic car detailing since 1987"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <p className="text-xs text-zinc-400 mt-1 text-right">{form.headline.length}/60</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Description <span className="text-zinc-300">(160 chars)</span></label>
              <textarea maxLength={160} rows={3} value={form.bodyCopy} onChange={e => set('bodyCopy', e.target.value)}
                placeholder="Full detail packages, paint correction, ceramic coating. Serving classic car owners for 35+ years."
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              <p className="text-xs text-zinc-400 mt-1 text-right">{form.bodyCopy.length}/160</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Button Text (Call to Action)</label>
                <input type="text" maxLength={20} value={form.ctaLabel} onChange={e => set('ctaLabel', e.target.value)}
                  placeholder="Learn More"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Button Link URL</label>
                <input type="url" value={form.ctaUrl} onChange={e => set('ctaUrl', e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="(312) 555-0100"
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Star Rating</label>
                <input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={e => set('rating', e.target.value)}
                  placeholder="4.9"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Review Count</label>
                <input type="number" min="0" value={form.reviewCount} onChange={e => set('reviewCount', e.target.value)}
                  placeholder="127"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-zinc-800">Images</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Business Logo (square)</label>
              <div className="flex items-center gap-3">
                {form.logoUrl && <img src={form.logoUrl} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-zinc-200" />}
                <label className="cursor-pointer flex items-center gap-2 border border-zinc-200 hover:border-red-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:text-red-600 transition-colors">
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'logoUrl')} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Hero Photo (wide format)</label>
              <div className="flex items-center gap-3">
                {form.photoUrl && <img src={form.photoUrl} alt="photo" className="w-24 h-12 rounded-lg object-cover border border-zinc-200" />}
                <label className="cursor-pointer flex items-center gap-2 border border-zinc-200 hover:border-red-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:text-red-600 transition-colors">
                  {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                  <input type="file" accept="image/*" className="sr-only" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'photoUrl')} />
                </label>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">Ad saved! Redirecting…</p>}

          <button type="submit" disabled={saving || uploadingLogo || uploadingPhoto}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
            {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Ad'}
          </button>
        </form>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 self-start">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Live Preview</p>
          <div className="max-w-xs">
            <AdCard ad={previewAd} />
          </div>
          <p className="text-xs text-zinc-400 mt-3">This is how your ad appears to buyers on listing pages.</p>
        </div>
      </div>
    </div>
  );
}

export default function EditAdPage() {
  return (
    <Suspense>
      <EditAdInner />
    </Suspense>
  );
}
