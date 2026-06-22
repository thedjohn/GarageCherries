'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAKES, BODY_STYLES, CONDITIONS } from '@/lib/types';

import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/data';

interface DbCar {
  id: string; slug: string; title: string; year: number;
  make: string; model: string; price: number; mileage: number;
  condition: string; body_style: string; engine: string;
  horsepower?: number; torque?: number; cylinders?: number; displacement?: string;
  forced_induction?: string; fuel_type?: string; drive_type?: string; num_speeds?: number;
  transmission: string; color: string; interior_color?: string; seat_material?: string; seating_type?: string; description: string;
  location: string; state: string; featured: boolean;
  listed_at: string; images: string[]; seller_id: string;
  is_sold?: boolean;
  vin?: string; vin_verified?: boolean;
}
interface DbDealer {
  id: string; slug: string; name: string;
  phone?: string; email?: string; location?: string; state?: string;
  address?: string; zip?: string;
  description?: string; website?: string; specialties?: string[];
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Vehicle Modal (Add + Edit) ───────────────────────────────────────────────
function VehicleModal({ dealerId, dealerName, car, onClose, onSaved }: {
  dealerId: string; dealerName: string;
  car?: DbCar;             // undefined = Add mode, defined = Edit mode
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!car;
  const [fields, setFields] = useState({
    vin:          car?.vin                      ?? '',
    year:         car ? String(car.year)        : '',
    make:         car?.make                     ?? '',
    model:        car?.model                    ?? '',
    mileage:      car ? String(car.mileage)     : '',
    condition:    car?.condition                ?? '',
    bodyStyle:    car?.body_style               ?? 'Coupe',
    engine:          car?.engine            ?? '',
    horsepower:      car?.horsepower ? String(car.horsepower) : '',
    torque:          car?.torque      ? String(car.torque)     : '',
    cylinders:       car?.cylinders   ? String(car.cylinders)  : '',
    displacement:    car?.displacement          ?? '',
    forcedInduction: car?.forced_induction      ?? '',
    fuelType:        car?.fuel_type             ?? '',
    numSpeeds:       car?.num_speeds  ? String(car.num_speeds) : '',
    driveType:       car?.drive_type            ?? '',
    transmission: car?.transmission             ?? 'Manual',
    color:         car?.color                    ?? '',
    interiorColor: car?.interior_color           ?? '',
    seatMaterial:  car?.seat_material            ?? '',
    seatingType:   car?.seating_type             ?? '',
    price:        car && car.price > 0 ? String(car.price) : '',
    description:  car?.description              ?? '',
    location:     car?.location                 ?? '',
    state:        car?.state                    ?? '',
  });
  const [featured, setFeatured] = useState(car?.featured ?? false);
  // Existing images (URLs) + new file uploads
  const [existingImages, setExistingImages] = useState<string[]>(car?.images ?? []);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [vinStatus, setVinStatus] = useState<{
    verified: boolean; vinValid: boolean; preStandard?: boolean;
    makeMatch: boolean | null; modelMatch: boolean | null; yearMatch: boolean | null;
    nhtsaMake?: string; nhtsaModel?: string; nhtsaYear?: string;
    message: string; nicbUrl?: string;
  } | null>(car?.vin ? { verified: car.vin_verified ?? false, vinValid: true, makeMatch: null, modelMatch: null, yearMatch: null, message: 'Previously saved.' } : null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateDescription = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/listing-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields }),
      });
      const { description } = await res.json();
      if (description) set('description', description);
    } finally {
      setGenerating(false);
    }
  };

  const verifyVin = async () => {
    if (!fields.vin.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/cars/verify-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: fields.vin, make: fields.make, model: fields.model, year: fields.year }),
      });
      const data = await res.json();
      setVinStatus(data);
    } finally {
      setVerifying(false);
    }
  };

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const totalImages = existingImages.length + newImages.length;

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const next = files.slice(0, 30 - totalImages).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setNewImages(prev => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExisting = (i: number) => setExistingImages(prev => prev.filter((_, j) => j !== i));
  const removeNew = (i: number) => {
    setNewImages(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const supabase = createClient();

    // Upload any new images
    const uploadedUrls: string[] = [];
    for (const img of newImages) {
      const ext = img.file.name.split('.').pop();
      const path = `cars/${dealerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('car-images').upload(path, img.file);
      if (uploadError) { setError('Image upload failed: ' + uploadError.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(path);
      uploadedUrls.push(publicUrl);
    }

    const allImages = [...existingImages, ...uploadedUrls];
    const title = `${fields.year} ${fields.make} ${fields.model}`;
    const payload = {
      title,
      year:         parseInt(fields.year),
      make:         fields.make,
      model:        fields.model,
      mileage:      parseInt(fields.mileage) || 0,
      condition:    fields.condition,
      body_style:   fields.bodyStyle,
      engine:           fields.engine,
      horsepower:       fields.horsepower    ? parseInt(fields.horsepower)    : null,
      torque:           fields.torque        ? parseInt(fields.torque)        : null,
      cylinders:        fields.cylinders     ? parseInt(fields.cylinders)     : null,
      displacement:     fields.displacement  || null,
      forced_induction: fields.forcedInduction || null,
      fuel_type:        fields.fuelType      || null,
      num_speeds:       fields.numSpeeds     ? parseInt(fields.numSpeeds)     : null,
      drive_type:       fields.driveType     || null,
      transmission: fields.transmission,
      color:          fields.color,
      interior_color: fields.interiorColor,
      seat_material:  fields.seatMaterial,
      seating_type:   fields.seatingType,
      price:        parseInt(fields.price) || 0,
      description:  fields.description,
      location:     fields.location,
      state:        fields.state.toUpperCase().slice(0, 2),
      images:       allImages,
      featured,
      vin:          fields.vin.trim().toUpperCase() || null,
      vin_verified: vinStatus?.verified ?? false,
      vin_make:     vinStatus?.nhtsaMake ?? null,
      vin_model:    vinStatus?.nhtsaModel ?? null,
      vin_year:     vinStatus?.nhtsaYear ? parseInt(vinStatus.nhtsaYear) : null,
      vin_checked_at: vinStatus ? new Date().toISOString() : null,
    };

    let dbError;
    if (isEdit) {
      const oldPrice = car!.price;
      const { error } = await supabase.from('cars').update(payload).eq('id', car!.id);
      dbError = error;
      // Fire-and-forget: notify watchers if the price dropped
      if (!dbError && payload.price !== oldPrice) {
        fetch('/api/notify-watchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carId: car!.id, oldPrice, newPrice: payload.price }),
        }).catch(console.error);
        // Record price change in history (fire-and-forget)
        void supabase.rpc('record_price_change', { p_car_id: car!.id, p_price: payload.price });
      }
    } else {
      const uid = Date.now();
      const slug = `${toSlug(title)}-${uid}`;
      const newCarId = `${dealerId}-${uid}`;
      const { error } = await supabase.from('cars').insert({
        ...payload, id: newCarId, slug,
        seller_id: dealerId, seller_name: dealerName,
        featured: false, listed_at: new Date().toISOString().split('T')[0],
      });
      dbError = error;
      if (!error) {
        fetch('/api/alerts/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carId: newCarId }),
        }).catch(() => {});
      }
    }

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    setDone(true);
    onSaved();
  };

  if (done) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">{isEdit ? 'Vehicle Updated' : 'Vehicle Added'}</h2>
        <p className="text-zinc-500 text-sm mb-6">{isEdit ? 'Your changes are live.' : 'Your listing is now live in your inventory.'}</p>
        <button onClick={onClose} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm">Done</button>
      </div>
    </div>
  );

  const inp = "w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-lg">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* VIN */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">VIN — Vehicle Identification Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="17-character VIN (pre-1981 vehicles: use manufacturer serial number)"
                value={fields.vin}
                onChange={e => { set('vin', e.target.value); setVinStatus(null); }}
                maxLength={17}
                className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  vinStatus ? (vinStatus.verified ? 'border-green-400 bg-green-50' : 'border-zinc-200') : 'border-zinc-200'
                }`}
              />
              <button
                type="button"
                onClick={verifyVin}
                disabled={verifying || !fields.vin.trim()}
                className="shrink-0 px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                {verifying ? 'Checking…' : 'Verify'}
              </button>
            </div>
            {vinStatus && (
              <div className={`mt-2 rounded-xl px-4 py-3 text-xs leading-relaxed ${
                vinStatus.verified
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : vinStatus.preStandard
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : vinStatus.vinValid
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="font-semibold mb-1">
                  {vinStatus.verified ? '✅ VIN Verified' : vinStatus.preStandard ? 'ℹ️ Pre-1981 VIN' : vinStatus.vinValid ? '⚠️ VIN Decoded — Mismatch' : '❌ Invalid VIN'}
                </p>
                <p>{vinStatus.message}</p>
                {vinStatus.nhtsaMake && (
                  <p className="mt-1">NHTSA (National Highway Traffic Safety Administration) records: {vinStatus.nhtsaYear} {vinStatus.nhtsaMake} {vinStatus.nhtsaModel}</p>
                )}
                {vinStatus.nicbUrl && (
                  <a href={vinStatus.nicbUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-1.5 underline opacity-70 hover:opacity-100">
                    Check stolen vehicle status on NICB (National Insurance Crime Bureau) →
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Year *</label>
              <input type="number" required min="1900" max="2030" placeholder="1967" value={fields.year}
                onChange={e => set('year', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Make *</label>
              <input required list="makes-list" placeholder="e.g. Chevrolet, BMW, Jaguar" value={fields.make}
                onChange={e => set('make', e.target.value)} className={inp} />
              <datalist id="makes-list">
                {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Model *</label>
              <input type="text" required placeholder="GTX" value={fields.model}
                onChange={e => set('model', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Mileage *</label>
              <input type="number" required min="0" placeholder="42000" value={fields.mileage}
                onChange={e => set('mileage', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Condition *</label>
              <select required value={fields.condition} onChange={e => set('condition', e.target.value)} className={inp}>
                <option value="">Select...</option>
                {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Body Style</label>
              <select value={fields.bodyStyle} onChange={e => set('bodyStyle', e.target.value)} className={inp}>
                {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Engine Description</label>
              <input type="text" placeholder="426 Hemi V8" value={fields.engine}
                onChange={e => set('engine', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Displacement</label>
              <input type="text" placeholder="6.2L" value={fields.displacement}
                onChange={e => set('displacement', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Cylinders</label>
              <select value={fields.cylinders} onChange={e => set('cylinders', e.target.value)} className={inp}>
                <option value="">Select...</option>
                {[4,5,6,8,10,12,16].map(n => <option key={n} value={n}>{n}-cylinder</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Horsepower</label>
              <input type="number" min="0" placeholder="807" value={fields.horsepower}
                onChange={e => set('horsepower', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Torque (lb-ft / pound-feet)</label>
              <input type="number" min="0" placeholder="707" value={fields.torque}
                onChange={e => set('torque', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Forced Induction</label>
              <select value={fields.forcedInduction} onChange={e => set('forcedInduction', e.target.value)} className={inp}>
                <option value="">None</option>
                <option>Supercharged</option>
                <option>Turbocharged</option>
                <option>Twin-Turbocharged</option>
                <option>Supercharged + Turbocharged</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Fuel Type</label>
              <select value={fields.fuelType} onChange={e => set('fuelType', e.target.value)} className={inp}>
                <option value="">Select...</option>
                <option>Gasoline</option>
                <option>Diesel</option>
                <option>Electric</option>
                <option>Hybrid</option>
                <option>Flex Fuel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Transmission</label>
              <select value={fields.transmission} onChange={e => set('transmission', e.target.value)} className={inp}>
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5"># of Speeds</label>
              <select value={fields.numSpeeds} onChange={e => set('numSpeeds', e.target.value)} className={inp}>
                <option value="">Select...</option>
                {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}-speed</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Drive Type</label>
              <select value={fields.driveType} onChange={e => set('driveType', e.target.value)} className={inp}>
                <option value="">Select...</option>
                <option value="RWD">RWD — Rear-Wheel Drive</option>
                <option value="FWD">FWD — Front-Wheel Drive</option>
                <option value="AWD">AWD — All-Wheel Drive</option>
                <option value="4WD">4WD — Four-Wheel Drive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Exterior Color</label>
              <input type="text" placeholder="Bright Red" value={fields.color}
                onChange={e => set('color', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Interior Color</label>
              <input type="text" placeholder="Black" value={fields.interiorColor}
                onChange={e => set('interiorColor', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Seat Material</label>
              <select value={fields.seatMaterial} onChange={e => set('seatMaterial', e.target.value)} className={inp}>
                <option value="">Select...</option>
                <option>Leather</option>
                <option>Cloth</option>
                <option>Vinyl</option>
                <option>Suede</option>
                <option>Alcantara</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Seating Type</label>
              <select value={fields.seatingType} onChange={e => set('seatingType', e.target.value)} className={inp}>
                <option value="">Select...</option>
                <option>Bucket</option>
                <option>Bench</option>
                <option>Sport Bucket</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Asking Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input type="number" min="0" placeholder="0 = Call for price" value={fields.price}
                  onChange={e => set('price', e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City</label>
              <input type="text" placeholder="St. Charles" value={fields.location}
                onChange={e => set('location', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State</label>
              <input type="text" placeholder="MO" maxLength={2} value={fields.state}
                onChange={e => set('state', e.target.value)} className={inp} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description *</label>
              <button type="button" onClick={handleGenerateDescription} disabled={generating || !fields.year || !fields.make || !fields.model}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 transition-colors">
                {generating ? (
                  <><span className="inline-block w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />Generating…</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Generate with AI</>
                )}
              </button>
            </div>
            <textarea required rows={4} placeholder="History, restoration work, matching numbers, options..."
              value={fields.description} onChange={e => set('description', e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Photos</label>
              <span className="text-xs text-zinc-400">{totalImages}/30</span>
            </div>
            {totalImages > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {existingImages.map((url, i) => (
                  <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-100">
                    {i === 0 && <span className="absolute top-1 left-1 z-10 text-[9px] bg-red-600 text-white font-bold px-1 py-0.5 rounded">Cover</span>}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExisting(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
                {newImages.map((img, i) => (
                  <div key={img.preview} className="relative group aspect-square rounded-lg overflow-hidden border border-dashed border-zinc-300">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}
            {totalImages < 30 && (
              <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors text-sm text-zinc-500">
                📷 <span>Add photos</span>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImageAdd} />
              </label>
            )}
          </div>

          {/* Featured toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={featured} onChange={e => setFeatured(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${featured ? 'bg-red-600' : 'bg-zinc-200'}`} />
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${featured ? 'translate-x-4' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Featured listing</p>
              <p className="text-xs text-zinc-400">Appears on homepage and gets a Featured badge</p>
            </div>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Message Watchers Modal ───────────────────────────────────────────────────
function MessageWatchersModal({ car, count, onClose }: { car: DbCar; count: number; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState<number | null>(null);
  const [error, setError]     = useState('');
  const MAX = 500;

  const handleSend = async () => {
    if (!message.trim()) { setError('Please write a message.'); return; }
    setSending(true); setError('');
    const res = await fetch('/api/dealer/message-watchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: car.id, message }),
    });
    setSending(false);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to send.'); return; }
    setSent(json.sent);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {sent !== null ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-lg font-bold text-zinc-900 mb-2">
              {sent === 0 ? 'No messages sent' : `Sent to ${sent} buyer${sent !== 1 ? 's' : ''}`}
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
              {sent === 0
                ? 'No eligible watchers found (they may have already been messaged or unsubscribed).'
                : 'Each buyer received a one-time email. This cannot be sent again for this listing.'}
            </p>
            <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Message watchers</h2>
                <p className="text-sm text-zinc-500 mt-0.5">{car.title}</p>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">✕</button>
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 mb-4">
              <strong>{count}</strong> {count === 1 ? 'buyer has' : 'buyers have'} this car saved and allowed seller contact.
              This message can only be sent <strong>once</strong> per listing.
            </div>

            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value.slice(0, MAX)); setError(''); }}
              rows={5}
              placeholder="e.g. I'm open to a reasonable offer — feel free to reach out. The car is in excellent shape and available for viewing this weekend."
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="text-xs text-zinc-400 text-right mt-1">{message.length}/{MAX}</p>

            <p className="text-xs text-zinc-400 mt-2 mb-4">
              Buyers will receive this via email. Their addresses are never shared with you.
            </p>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50">
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending || !message.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DealerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'inventory' | 'inquiries' | 'settings'>('overview');
  const [modalCar, setModalCar] = useState<DbCar | null | 'new'>(null);
  const [messageTarget, setMessageTarget] = useState<DbCar | null>(null);
  const [dealer, setDealer] = useState<DbDealer | null>(null);
  const [listings, setListings] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [markSoldId, setMarkSoldId] = useState<string | null>(null);
  const [markingSold, setMarkingSold] = useState(false);
  const [watcherCounts, setWatcherCounts]   = useState<Record<string, number>>({});
  const [watcherMessaged, setWatcherMessaged] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<{
    views30d: number; viewsDelta: number | null;
    inquiries30d: number; inquiriesDelta: number | null;
    avgDaysOnMarket: number;
    recentInquiries: any[];
  } | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/dealer/login'); return; }

    const { data: dealerRow } = await supabase
      .from('dealers').select('id, slug, name, phone, email, address, location, state, zip, description, website, specialties, since, logo')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (dealerRow) {
      setDealer(dealerRow);
      const { data: cars } = await supabase
        .from('cars')
        .select('id, slug, title, year, make, model, price, mileage, condition, body_style, engine, horsepower, torque, cylinders, displacement, forced_induction, fuel_type, num_speeds, drive_type, transmission, color, interior_color, seat_material, seating_type, description, location, state, featured, listed_at, images, seller_id, is_sold')
        .eq('seller_id', dealerRow.id)
        .order('created_at', { ascending: false });
      setListings(cars ?? []);

      // Load watcher counts for all cars
      if (cars?.length) {
        const ids = cars.map((c: DbCar) => c.id).join(',');
        fetch(`/api/dealer/watcher-counts?carIds=${ids}`)
          .then(r => r.json())
          .then(({ counts, messaged }) => {
            if (counts) setWatcherCounts(counts);
            if (messaged) setWatcherMessaged(messaged);
          })
          .catch(() => {});
      }

      // Load real metrics
      fetch('/api/dealer/metrics')
        .then(r => r.json())
        .then(data => { if (!data.error) setMetrics(data); })
        .catch(() => {});
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteCar = async (id: string) => {
    const supabase = createClient();
    await supabase.from('cars').delete().eq('id', id);
    setDeleteConfirm(null);
    loadData();
  };

  const handleMarkSold = async () => {
    if (!markSoldId) return;
    setMarkingSold(true);
    await fetch('/api/cars/sold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: markSoldId }),
    });
    setMarkingSold(false);
    setMarkSoldId(null);
    loadData();
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/dealer/login');
    router.refresh();
  };

  const fmtDelta = (d: number | null) => {
    if (d === null) return 'No prior data';
    const sign = d >= 0 ? '+' : '';
    return `${sign}${d}% vs last month`;
  };

  const statCards = [
    {
      label: 'Active listings',
      value: listings.length,
      sub: 'total in inventory',
      up: true,
    },
    {
      label: 'Views (30d)',
      value: metrics ? metrics.views30d.toLocaleString() : '—',
      sub: metrics ? fmtDelta(metrics.viewsDelta) : 'Loading…',
      up: (metrics?.viewsDelta ?? 0) >= 0,
    },
    {
      label: 'Inquiries (30d)',
      value: metrics ? metrics.inquiries30d.toLocaleString() : '—',
      sub: metrics ? fmtDelta(metrics.inquiriesDelta) : 'Loading…',
      up: (metrics?.inquiriesDelta ?? 0) >= 0,
    },
    {
      label: 'Avg. days on market',
      value: metrics ? String(metrics.avgDaysOnMarket) : '—',
      sub: 'across all active listings',
      up: true,
    },
  ];

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Loading dashboard…</div>
    </div>
  );

  const dealerName = dealer?.name ?? 'Your Dealership';
  const dealerSlug = dealer?.slug ?? '';

  return (
    <>
    {/* Message watchers modal */}
    {messageTarget && (
      <MessageWatchersModal
        car={messageTarget}
        count={watcherCounts[messageTarget.id] ?? 0}
        onClose={() => { setMessageTarget(null); loadData(); }}
      />
    )}

    {/* Vehicle modal */}
    {modalCar !== null && dealer && (
      <VehicleModal
        dealerId={dealer.id}
        dealerName={dealerName}
        car={modalCar === 'new' ? undefined : modalCar}
        onClose={() => setModalCar(null)}
        onSaved={() => { loadData(); }}
      />
    )}

    {/* Mark Sold confirmation */}
    {markSoldId && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h2 className="font-bold text-zinc-900 mb-2">Mark as sold?</h2>
          <p className="text-zinc-500 text-sm mb-5">This will mark the listing as sold. The listing will remain visible in the sold archive.</p>
          <div className="flex gap-3">
            <button onClick={() => setMarkSoldId(null)}
              className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2 rounded-xl text-sm hover:bg-zinc-50">
              Cancel
            </button>
            <button onClick={handleMarkSold} disabled={markingSold}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm">
              {markingSold ? 'Saving…' : 'Mark Sold'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete confirmation */}
    {deleteConfirm && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h2 className="font-bold text-zinc-900 mb-2">Delete vehicle?</h2>
          <p className="text-zinc-500 text-sm mb-5">This will permanently remove the listing from your inventory.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2 rounded-xl text-sm hover:bg-zinc-50">
              Cancel
            </button>
            <button onClick={() => deleteCar(deleteConfirm)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="min-h-screen bg-zinc-50">
      <div className="bg-zinc-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span>🍒</span>
            <span className="font-bold">Garage<span className="text-red-400">Cherries</span></span>
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300 text-sm">{dealerName}</span>
          <span className="text-xs bg-green-700 text-green-200 px-2 py-0.5 rounded-full font-medium">Verified</span>
        </div>
        <div className="flex items-center gap-3">
          {dealerSlug && (
            <Link href={`/dealers/${dealerSlug}`} target="_blank"
              className="text-xs text-zinc-400 hover:text-white transition-colors">View public page ↗</Link>
          )}
          <button onClick={signOut}
            className="text-xs border border-zinc-600 hover:border-zinc-400 px-3 py-1.5 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-zinc-200 px-6 flex gap-1">
        {(['overview', 'inventory', 'inquiries', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}>{t}</button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="bg-white border border-zinc-100 rounded-xl px-5 py-3 flex items-center justify-between mb-6 text-sm">
          <span className="text-zinc-500">Inventory: <span className="font-medium text-zinc-800">{listings.length} active vehicles</span></span>
          <div className="flex gap-2">
            <button className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">Import JSON</button>
            <button className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors">Sync now</button>
          </div>
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map(m => (
                <div key={m.label} className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">{m.label}</p>
                  <p className="text-2xl font-bold text-zinc-900">{m.value}</p>
                  <p className={`text-xs mt-1 font-medium ${m.up ? 'text-green-600' : 'text-red-500'}`}>
                    {m.up ? '▲' : '▼'} {m.sub}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5">
                <h2 className="font-bold text-zinc-800 mb-4 text-sm">Recent inquiries <span className="text-zinc-400 font-normal">— last 30 days</span></h2>
                {!metrics || metrics.recentInquiries.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-4 text-center">No inquiries yet — they'll appear here when buyers message you.</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.recentInquiries.slice(0, 5).map((inq: any) => (
                      <div key={inq.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-sm font-bold text-red-600 shrink-0">
                          {inq.buyer_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{inq.buyer_name} <span className="font-normal text-zinc-400">on</span> {inq.carTitle}</p>
                          <p className="text-xs text-zinc-500 truncate">{inq.message}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{new Date(inq.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5">
                <h2 className="font-bold text-zinc-800 mb-4 text-sm">Your listings</h2>
                {listings.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-4 text-center">No listings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {listings.slice(0, 5).map(car => (
                      <div key={car.id} className="flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                          {car.images?.[0] && <img src={car.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-800 truncate">{car.title}</p>
                          <p className="text-xs text-zinc-400">{car.condition} · {car.price > 0 ? `$${car.price.toLocaleString()}` : 'Call for price'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* INVENTORY */}
        {tab === 'inventory' && (
          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-zinc-800">Inventory <span className="text-zinc-400 font-normal text-sm">({listings.length} vehicles)</span></h2>
              <div className="flex gap-2">
                <button className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50">Export</button>
                <button onClick={() => setModalCar('new')} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">+ Add vehicle</button>
              </div>
            </div>
            {listings.length === 0 ? (
              <div className="px-5 py-16 text-center text-zinc-400 text-sm">
                No vehicles yet. Click <strong>+ Add vehicle</strong> to add your first listing.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-xs text-zinc-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Vehicle</th>
                    <th className="text-left px-4 py-3 font-semibold">Price</th>
                    <th className="text-left px-4 py-3 font-semibold">Condition</th>
                    <th className="text-left px-4 py-3 font-semibold">Watchers</th>
                    <th className="text-left px-4 py-3 font-semibold">Listed</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map(car => {
                    const count    = watcherCounts[car.id] ?? 0;
                    const messaged = watcherMessaged[car.id] ?? false;
                    return (
                    <tr key={car.id} className="border-t border-zinc-50 hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-zinc-900">{car.title}</p>
                        <p className="text-xs text-zinc-400">ID #{car.id}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">{car.price > 0 ? formatPrice(car.price) : 'Call for price'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          car.condition === 'Excellent' ? 'bg-green-100 text-green-700' :
                          car.condition === 'Good'      ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{car.condition}</span>
                      </td>
                      <td className="px-4 py-3">
                        {count > 0 && !messaged ? (
                          <button onClick={() => setMessageTarget(car)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {count} watching
                          </button>
                        ) : messaged ? (
                          <span className="text-xs text-zinc-400">✓ Messaged</span>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{car.listed_at}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          {car.is_sold ? (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Sold</span>
                          ) : (
                            <button onClick={() => setMarkSoldId(car.id)}
                              className="text-xs text-green-700 hover:text-green-900 font-medium transition-colors border border-green-200 hover:border-green-400 px-2 py-0.5 rounded-full">
                              Mark Sold
                            </button>
                          )}
                          <button onClick={() => setModalCar(car)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
                            Edit
                          </button>
                          <Link href={`/listings/${toSlug(car.make)}/${toSlug(car.model)}/${car.id}/${car.slug}`}
                            target="_blank" className="text-xs text-red-600 hover:underline">
                            View ↗
                          </Link>
                          <button onClick={() => setDeleteConfirm(car.id)}
                            className="text-xs text-zinc-300 hover:text-red-500 transition-colors">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INQUIRIES */}
        {tab === 'inquiries' && (
          <InquiriesTab dealerName={dealer?.name ?? 'the dealer'} realInquiries={metrics?.recentInquiries} />
        )}

        {/* SETTINGS */}
        {tab === 'settings' && dealer && (
          <DealerSettings dealer={dealer} onSaved={loadData} />
        )}

      </div>
    </div>
    </>
  );
}

// ─── Inquiries Tab ───────────────────────────────────────────────────────────
const SAMPLE_INQUIRIES = [
  { name: 'James K.',  vehicle: '1967 Plymouth GTX Hemi', carYear: 1967, carMake: 'Plymouth', carModel: 'GTX Hemi', type: 'Message', time: '2 min ago',  msg: 'Interested in scheduling a viewing this weekend. Is the car still available?' },
  { name: 'Sarah M.',  vehicle: '1966 Shelby GT350',       carYear: 1966, carMake: 'Shelby',   carModel: 'GT350',    type: 'Message', time: '1 hour ago', msg: 'Is the Shelby still available? Have cash ready and can move fast.' },
  { name: 'Robert T.', vehicle: '1969 Dodge Charger R/T',  carYear: 1969, carMake: 'Dodge',    carModel: 'Charger',  type: 'Message', time: 'Yesterday',  msg: 'Can you tell me more about the documentation and restoration history?' },
];

function InquiriesTab({ dealerName, realInquiries }: { dealerName: string; realInquiries?: any[] }) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const displayInquiries = realInquiries && realInquiries.length > 0
    ? realInquiries.map(i => ({
        name: i.buyer_name,
        vehicle: i.carTitle,
        carYear: 0,
        carMake: '',
        carModel: i.carTitle,
        type: 'Message',
        time: new Date(i.created_at).toLocaleDateString(),
        msg: i.message,
      }))
    : SAMPLE_INQUIRIES;

  async function generateReply(i: number) {
    const inq = displayInquiries[i];
    setLoading(l => ({ ...l, [i]: true }));
    setOpen(o => ({ ...o, [i]: true }));
    const res = await fetch('/api/ai/inquiry-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: inq.name, buyerMessage: inq.msg, carYear: inq.carYear, carMake: inq.carMake, carModel: inq.carModel, dealerName }),
    });
    const { reply } = await res.json();
    setDrafts(d => ({ ...d, [i]: reply }));
    setLoading(l => ({ ...l, [i]: false }));
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
      <div className="px-5 py-4">
        <h2 className="font-bold text-zinc-800">Inquiries</h2>
      </div>
      {displayInquiries.map((inq, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-sm font-bold text-red-600 shrink-0">
                {inq.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">{inq.name} <span className="font-normal text-zinc-400">on</span> {inq.vehicle}</p>
                <p className="text-sm text-zinc-600 mt-0.5">{inq.msg}</p>
                <p className="text-xs text-zinc-400 mt-1">{inq.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{inq.type}</span>
              <button onClick={() => generateReply(i)} disabled={loading[i]}
                className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                {loading[i] ? 'Drafting…' : open[i] ? 'Regenerate' : 'AI Draft Reply'}
              </button>
            </div>
          </div>
          {open[i] && (
            <div className="mt-3 ml-12">
              {loading[i] ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  Writing reply…
                </div>
              ) : drafts[i] ? (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">AI Draft Reply</p>
                  <textarea rows={6} value={drafts[i]} onChange={e => setDrafts(d => ({ ...d, [i]: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                  <p className="text-xs text-zinc-400 mt-1">Edit as needed, then send from your email client.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Dealer Settings ──────────────────────────────────────────────────────────
const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

const TIME_SLOTS = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
  '9:00 PM','10:00 PM',
];

type DayKey = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
type DayHours = { open: string; close: string; closed: boolean };
type WeekHours = Record<DayKey, DayHours>;

const DEFAULT_HOURS: WeekHours = {
  mon: { open: '9:00 AM', close: '6:00 PM', closed: false },
  tue: { open: '9:00 AM', close: '6:00 PM', closed: false },
  wed: { open: '9:00 AM', close: '6:00 PM', closed: false },
  thu: { open: '9:00 AM', close: '6:00 PM', closed: false },
  fri: { open: '9:00 AM', close: '6:00 PM', closed: false },
  sat: { open: '10:00 AM', close: '4:00 PM', closed: false },
  sun: { open: '10:00 AM', close: '3:00 PM', closed: true },
};

function DealerSettings({ dealer, onSaved }: { dealer: DbDealer & { phone?: string; email?: string; location?: string; state?: string; description?: string; website?: string; specialties?: string[]; logo?: string; hours?: WeekHours }; onSaved: () => void }) {
  const [fields, setFields] = useState({
    name:        dealer.name        ?? '',
    phone:       dealer.phone       ?? '',
    email:       dealer.email       ?? '',
    address:     dealer.address     ?? '',
    location:    dealer.location    ?? '',
    state:       dealer.state       ?? '',
    zip:         dealer.zip         ?? '',
    description: dealer.description ?? '',
    website:     dealer.website     ?? '',
    specialties: (dealer.specialties ?? []).join(', '),
  });
  const [logoUrl, setLogoUrl]     = useState<string>(dealer.logo ?? '');
  const [logoFile, setLogoFile]   = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(dealer.logo ?? '');
  const [hours, setHours]         = useState<WeekHours>(dealer.hours ?? DEFAULT_HOURS);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const logoInputRef              = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => { setFields(f => ({ ...f, [k]: v })); setSaved(false); };
  const setDay = (day: DayKey, field: keyof DayHours, value: string | boolean) =>
    setHours(h => ({ ...h, [day]: { ...h[day], [field]: value } }));

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let finalLogoUrl = logoUrl;

    // Upload logo if a new file was selected
    if (logoFile) {
      const supabase = createClient();
      const ext = logoFile.name.split('.').pop() ?? 'jpg';
      const path = `${dealer.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('dealer-logos').upload(path, logoFile, { upsert: true });
      if (uploadErr) { setError('Logo upload failed: ' + uploadErr.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('dealer-logos').getPublicUrl(path);
      finalLogoUrl = publicUrl;
      setLogoUrl(publicUrl);
    }

    const res = await fetch('/api/dealer/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealerId:    dealer.id,
        name:        fields.name,
        phone:       fields.phone,
        address:     fields.address,
        location:    fields.location,
        state:       fields.state.toUpperCase().slice(0, 2),
        zip:         fields.zip,
        description: fields.description,
        website:     fields.website,
        specialties: fields.specialties.split(',').map(s => s.trim()).filter(Boolean),
        logo:        finalLogoUrl,
        hours,
      }),
    });
    setSaving(false);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Save failed'); return; }
    setSaved(true);
    setLogoFile(null);
    onSaved();
  };

  const inp = "w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-6 max-w-2xl">
      <h2 className="font-bold text-zinc-800 text-lg mb-6">Dealer Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Dealership Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                : <span className="text-3xl">🏎️</span>
              }
            </div>
            <div>
              <button type="button" onClick={() => logoInputRef.current?.click()}
                className="text-sm border border-zinc-200 hover:bg-zinc-50 px-4 py-2 rounded-xl font-medium transition-colors">
                {logoPreview ? 'Change logo' : 'Upload logo'}
              </button>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(''); setLogoUrl(''); setLogoFile(null); }}
                  className="ml-2 text-sm text-zinc-400 hover:text-red-500 transition-colors">Remove</button>
              )}
              <p className="text-xs text-zinc-400 mt-1">JPG, PNG or WebP · Max 2MB</p>
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoSelect} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Dealership Name *</label>
            <input type="text" required value={fields.name} onChange={e => set('name', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input type="tel" value={fields.phone} onChange={e => set('phone', e.target.value)} placeholder="(314) 555-0100" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email <span className="font-normal normal-case text-zinc-400">(login — not editable)</span></label>
            <input type="email" value={fields.email} readOnly className={`${inp} bg-zinc-50 text-zinc-400 cursor-not-allowed`} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Street Address</label>
            <input type="text" value={fields.address} onChange={e => set('address', e.target.value)} placeholder="123 Auto Row Dr" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City</label>
            <input type="text" value={fields.location} onChange={e => set('location', e.target.value)} placeholder="St. Charles" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State</label>
            <input type="text" value={fields.state} onChange={e => set('state', e.target.value)} placeholder="MO" maxLength={2} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">ZIP Code</label>
            <input type="text" value={fields.zip} onChange={e => set('zip', e.target.value)} placeholder="63301" maxLength={10} className={inp} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Website</label>
            <input type="url" value={fields.website} onChange={e => set('website', e.target.value)} placeholder="https://www.yourdealership.com" className={inp} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Specialties <span className="font-normal normal-case text-zinc-400">(comma separated)</span></label>
            <input type="text" value={fields.specialties} onChange={e => set('specialties', e.target.value)} placeholder="Classic Cars, Muscle Cars, Trucks" className={inp} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">About / Description</label>
            <textarea rows={5} value={fields.description} onChange={e => set('description', e.target.value)}
              placeholder="Tell buyers about your dealership..."
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </div>
        </div>

        {/* Business Hours */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Business Hours</label>
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            {DAYS.map(({ key, label }, i) => (
              <div key={key} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? 'border-t border-zinc-100' : ''}`}>
                <span className="w-24 font-medium text-zinc-700 shrink-0">{label}</span>
                <label className="flex items-center gap-1.5 text-zinc-500 text-xs shrink-0">
                  <input type="checkbox" checked={hours[key].closed}
                    onChange={e => setDay(key, 'closed', e.target.checked)}
                    className="rounded" />
                  Closed
                </label>
                {!hours[key].closed && (
                  <div className="flex items-center gap-2 flex-1">
                    <select value={hours[key].open} onChange={e => setDay(key, 'open', e.target.value)}
                      className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-zinc-400 text-xs shrink-0">to</span>
                    <select value={hours[key].close} onChange={e => setDay(key, 'close', e.target.value)}
                      className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
