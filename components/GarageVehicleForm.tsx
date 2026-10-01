'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resizeImageFiles } from '@/lib/resizeImage';
import { MAKES } from '@/lib/types';

export interface GarageMod {
  description: string;
  installed_at?: string;
}

export interface GarageVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  mileage: number | null;
  notes: string | null;
  images: string[];
  mods: GarageMod[];
  is_public: boolean;
  slug: string | null;
}

// Same transform used throughout the repo (e.g. app/api/cron/dealer-feed-sync/route.ts)
// for content slugs, suffixed with the row's own id so it's unique by
// construction -- no collision check needed since the id already exists.
function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface ImageEntry {
  preview: string;
  publicUrl: string | null;
  uploadState: 'done' | 'uploading' | 'error';
  file?: File;
}

const MAKE_OPTIONS = MAKES.filter(m => m !== 'All Makes');
const currentYear = new Date().getFullYear();

export default function GarageVehicleForm({ vehicle, onSaved, onCancel }: {
  vehicle?: GarageVehicle;
  onSaved: (vehicle: GarageVehicle) => void;
  onCancel: () => void;
}) {
  const [year, setYear] = useState(vehicle ? String(vehicle.year) : '');
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [trim, setTrim] = useState(vehicle?.trim ?? '');
  const [nickname, setNickname] = useState(vehicle?.nickname ?? '');
  const [mileage, setMileage] = useState(vehicle?.mileage != null ? String(vehicle.mileage) : '');
  const [notes, setNotes] = useState(vehicle?.notes ?? '');
  const [mods, setMods] = useState<GarageMod[]>(vehicle?.mods ?? []);
  const [newMod, setNewMod] = useState('');
  const [isPublic, setIsPublic] = useState(vehicle?.is_public ?? false);
  const [images, setImages] = useState<ImageEntry[]>(
    (vehicle?.images ?? []).map(url => ({ preview: url, publicUrl: url, uploadState: 'done' as const }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File, stableId: string) {
    const res = await fetch('/api/garage/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    if (!res.ok) {
      setImages(prev => prev.map(img => img.preview === stableId ? { ...img, uploadState: 'error' } : img));
      return;
    }
    const { signedUrl, publicUrl } = await res.json();
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setImages(prev => prev.map(img => img.preview === stableId ? { ...img, uploadState: 'done', publicUrl } : img));
      } else {
        setImages(prev => prev.map(img => img.preview === stableId ? { ...img, uploadState: 'error' } : img));
      }
    };
    xhr.onerror = () => {
      setImages(prev => prev.map(img => img.preview === stableId ? { ...img, uploadState: 'error' } : img));
    };
    xhr.send(file);
  }

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const slots = 20 - images.length;
    if (slots <= 0) return;
    const toAdd = await resizeImageFiles(files.slice(0, slots));
    const newEntries: ImageEntry[] = toAdd.map(file => ({
      file, preview: URL.createObjectURL(file), uploadState: 'uploading', publicUrl: null,
    }));
    setImages(prev => [...prev, ...newEntries]);
    newEntries.forEach((entry, i) => uploadImage(toAdd[i], entry.preview));
  }

  function removeImage(preview: string) {
    setImages(prev => prev.filter(img => img.preview !== preview));
  }

  function addMod() {
    if (!newMod.trim()) return;
    setMods(prev => [...prev, { description: newMod.trim() }]);
    setNewMod('');
  }

  function removeMod(index: number) {
    setMods(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!year || !make.trim() || !model.trim()) { setError('Year, make, and model are required.'); return; }
    if (images.some(img => img.uploadState === 'uploading')) { setError('Please wait for photos to finish uploading.'); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not logged in.'); setSaving(false); return; }

    const payload: Record<string, unknown> = {
      year: Number(year),
      make: make.trim(),
      model: model.trim(),
      trim: trim.trim() || null,
      nickname: nickname.trim() || null,
      mileage: mileage ? Number(mileage) : null,
      notes: notes.trim() || null,
      images: images.map(img => img.publicUrl).filter(Boolean) as string[],
      mods,
    };

    // Slug is generated once, from the row's own id, and kept forever after --
    // toggling public off and back on re-uses the same slug so a shared link
    // never rots. Only relevant when editing (a brand-new vehicle has no id
    // to base a slug on yet, so publishing happens on a later edit).
    if (vehicle) {
      payload.is_public = isPublic;
      if (isPublic && !vehicle.slug) {
        payload.slug = `${toSlug(`${year}-${make}-${model}`)}-${vehicle.id.slice(0, 8)}`;
      }
    }

    const { data, error: dbError } = vehicle
      ? await supabase.from('garage_vehicles').update(payload).eq('id', vehicle.id).select().single()
      : await supabase.from('garage_vehicles').insert({ ...payload, user_id: user.id }).select().single();

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved(data as GarageVehicle);
  }

  const inp = "w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";
  const label = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-5">
      <h2 className="font-bold text-zinc-900 mb-4">{vehicle ? 'Edit Vehicle' : 'Add a Vehicle'}</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} min={1900} max={currentYear + 1}
              placeholder="e.g. 1969" className={inp} required />
          </div>
          <div className="col-span-2">
            <label className={label}>Make</label>
            <input list="garage-makes" value={make} onChange={e => setMake(e.target.value)}
              placeholder="e.g. Chevrolet" className={inp} required />
            <datalist id="garage-makes">
              {MAKE_OPTIONS.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Camaro" className={inp} required />
          </div>
          <div>
            <label className={label}>Trim (optional)</label>
            <input value={trim} onChange={e => setTrim(e.target.value)} placeholder="e.g. Z28" className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nickname (optional)</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. The Beast" className={inp} />
          </div>
          <div>
            <label className={label}>Mileage (optional)</label>
            <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} min={0} className={inp} />
          </div>
        </div>
        <div>
          <label className={label}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="History, plans, anything worth remembering about this car" className={inp} />
        </div>

        <div>
          <label className={label}>Photos (optional)</label>
          <div className="flex flex-wrap gap-3 mb-2">
            {images.map(img => (
              <div key={img.preview} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                {img.uploadState === 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-semibold">…</div>
                )}
                {img.uploadState === 'error' && (
                  <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center text-white text-[10px] font-semibold">Failed</div>
                )}
                <button type="button" onClick={() => removeImage(img.preview)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">×</button>
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 text-xs font-semibold flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors">
              + Add
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
        </div>

        <div>
          <label className={label}>Modifications (optional)</label>
          <div className="space-y-1.5 mb-2">
            {mods.map((mod, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-zinc-700">{mod.description}</span>
                <button type="button" onClick={() => removeMod(i)} className="text-zinc-300 hover:text-red-500 text-xs font-semibold">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newMod} onChange={e => setNewMod(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMod(); } }}
              placeholder="e.g. Cold air intake" className={inp} />
            <button type="button" onClick={addMod}
              className="shrink-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-sm px-4 rounded-xl transition-colors">
              Add
            </button>
          </div>
        </div>

        {vehicle && (
          <label className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-red-600" />
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Make this build public</span>
              <span className="block text-xs text-zinc-500 mt-0.5">
                Anyone with the link can view a shareable page for this build. Photos make for a better page, but aren't required.
              </span>
            </span>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
          {saving ? 'Saving…' : vehicle ? 'Save Changes' : 'Add to Garage'}
        </button>
      </div>
    </form>
  );
}
