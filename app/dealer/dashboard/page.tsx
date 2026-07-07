'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAKES, BODY_STYLES, CONDITIONS, TRANSMISSIONS } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/data';
import { resizeImageFiles } from '@/lib/resizeImage';

interface DbCar {
  id: string; slug: string; title: string; year: number;
  make: string; model: string; price: number; mileage: number;
  condition: string; body_style: string; engine: string;
  horsepower?: number; torque?: number; cylinders?: number; displacement?: string;
  forced_induction?: string; fuel_type?: string; drive_type?: string; num_speeds?: number;
  transmission: string; color: string; interior_color?: string; seat_material?: string; seating_type?: string; description: string;
  location: string; state: string; featured: boolean;
  listed_at: string; images: string[]; seller_id: string;
  status?: string; rejection_reason?: string | null;
  expires_at?: string | null; is_feed_managed?: boolean; is_sold?: boolean;
}
interface DbDealer {
  id: string; slug: string; name: string;
  phone?: string; email?: string; location?: string; state?: string;
  address?: string; zip?: string;
  description?: string; website?: string; specialties?: string[];
  plan?: string; beta_expires_at?: string;
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
    year:         car ? String(car.year)        : '',
    make:         car?.make                     ?? '',
    model:        car?.model                    ?? '',
    mileage:      car && car.mileage > 0 ? String(car.mileage) : '',
    condition:    car?.condition                ?? '',
    bodyStyle:    car?.body_style               ?? '',
    engine:          car?.engine            ?? '',
    horsepower:      car?.horsepower ? String(car.horsepower) : '',
    torque:          car?.torque      ? String(car.torque)     : '',
    cylinders:       car?.cylinders   ? String(car.cylinders)  : '',
    displacement:    car?.displacement          ?? '',
    forcedInduction: car?.forced_induction      ?? '',
    fuelType:        car?.fuel_type             ?? '',
    numSpeeds:       car?.num_speeds  ? String(car.num_speeds) : '',
    driveType:       car?.drive_type            ?? '',
    transmission: car?.transmission             ?? '',
    color:         car?.color                    ?? '',
    interiorColor: car?.interior_color           ?? '',
    seatMaterial:  car?.seat_material            ?? '',
    seatingType:   car?.seating_type             ?? '',
    price:        car && car.price > 0 ? car.price.toLocaleString() : '',
    description:  car?.description              ?? '',
    location:     car?.location                 ?? '',
    state:        car?.state                    ?? '',
  });
  const [featured, setFeatured] = useState(car?.featured ?? false);
  // Existing images (URLs) + new file uploads
  const [existingImages, setExistingImages] = useState<string[]>(car?.images ?? []);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const totalImages = existingImages.length + newImages.length;

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const resized = await resizeImageFiles(files.slice(0, 30 - totalImages));
    const next = resized.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setNewImages(prev => [...prev, ...next]);
  };

  const removeExisting = (i: number) => setExistingImages(prev => prev.filter((_, j) => j !== i));
  const removeNew = (i: number) => {
    setNewImages(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingImages.length + newImages.length === 0) {
      setError('Please add at least one photo before saving.');
      return;
    }
    setSaving(true);
    setError('');
    const supabase = createClient();

    // Upload any new images
    const uploadedUrls: string[] = [];
    for (const img of newImages) {
      const ext = img.file.name.split('.').pop();
      const path = `cars/${dealerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, img.file);
      if (uploadError) { setError('Image upload failed: ' + uploadError.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path);
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
      price:        parseInt(fields.price.replace(/,/g, '')) || 0,
      description:  fields.description,
      location:     fields.location,
      state:        fields.state.toUpperCase().slice(0, 2),
      images:       allImages,
      featured,
    };

    let dbError;
    if (isEdit) {
      const { error } = await supabase.from('listings').update(payload).eq('id', car!.id);
      dbError = error;
      // If price dropped on a live dealer listing, record it and notify watchers immediately
      const oldPrice = car!.price ?? 0;
      const newPrice = payload.price ?? 0;
      if (!error && newPrice > 0 && newPrice < oldPrice) {
        void supabase.from('price_history').insert({
          car_id: car!.id,
          old_price: oldPrice,
          price: newPrice,
          changed_at: new Date().toISOString(),
        });
        fetch('/api/notify-watchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carId: car!.id, oldPrice, newPrice }),
        }).catch(() => {});
      }
    } else {
      const uid = Date.now();
      const slug = `${toSlug(title)}-${uid}`;
      const newId = `${dealerId}-${uid}`;
      const { error } = await supabase.from('listings').insert({
        ...payload, id: newId, slug,
        seller_id: dealerId, seller_name: dealerName,
        featured: false, status: 'approved', listed_at: new Date().toISOString().split('T')[0],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      dbError = error;
      // Trigger buyer alert matching after successful insert — fire and forget
      if (!error) {
        fetch('/api/alerts/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carId: newId }),
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Year *</label>
              <input type="number" required min="1900" max="2030" placeholder="Year" value={fields.year}
                onChange={e => set('year', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Make *</label>
              <select required value={fields.make} onChange={e => set('make', e.target.value)} className={inp}>
                <option value="">Select...</option>
                {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Model *</label>
              <input type="text" required placeholder="Model" value={fields.model}
                onChange={e => set('model', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Mileage *</label>
              <input type="number" required min="0" placeholder="Mileage (0 = Unknown)" value={fields.mileage}
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
                <option value="">Select...</option>
                {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Engine Description</label>
              <input type="text" placeholder="Engine Description" value={fields.engine}
                onChange={e => set('engine', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Displacement</label>
              <input type="text" placeholder="Displacement" value={fields.displacement}
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
              <input type="number" min="0" placeholder="Horsepower" value={fields.horsepower}
                onChange={e => set('horsepower', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Torque (lb-ft)</label>
              <input type="number" min="0" placeholder="Torque" value={fields.torque}
                onChange={e => set('torque', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Forced Induction</label>
              <select value={fields.forcedInduction} onChange={e => set('forcedInduction', e.target.value)} className={inp}>
                <option value="">Select...</option>
                <option>None / N/A</option>
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
                <option value="">Select...</option>
                {TRANSMISSIONS.map(t => <option key={t}>{t}</option>)}
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
                <option>RWD</option>
                <option>FWD</option>
                <option>AWD</option>
                <option>4WD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Exterior Color</label>
              <input type="text" placeholder="Exterior Color" value={fields.color}
                onChange={e => set('color', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Interior Color</label>
              <input type="text" placeholder="Interior Color" value={fields.interiorColor}
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
                <input type="text" inputMode="numeric" placeholder="Asking Price" value={fields.price}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    set('price', raw ? Number(raw).toLocaleString() : '');
                  }}
                  className="w-full border border-zinc-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City</label>
              <input type="text" placeholder="City" value={fields.location}
                onChange={e => set('location', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State</label>
              <input type="text" placeholder="State" maxLength={2} value={fields.state}
                onChange={e => set('state', e.target.value)} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Description *</label>
            <textarea required rows={4} placeholder="Description"
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DealerDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'inventory' | 'inquiries' | 'settings'>('overview');
  const [modalCar, setModalCar] = useState<DbCar | null | 'new'>(null); // null=closed, 'new'=add, DbCar=edit
  const [dealer, setDealer] = useState<DbDealer | null>(null);
  const [listings, setListings] = useState<DbCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [soldConfirm, setSoldConfirm] = useState<string | null>(null);
  const [watcherCounts, setWatcherCounts] = useState<Record<string, number>>({});
  const [watcherMessaged, setWatcherMessaged] = useState<Record<string, boolean>>({});
  const [messageWatchersFor, setMessageWatchersFor] = useState<DbCar | null>(null);
  const [watcherMessage, setWatcherMessage] = useState('');
  const [sendingWatcherMsg, setSendingWatcherMsg] = useState(false);
  const [watcherMsgResult, setWatcherMsgResult] = useState<string | null>(null);
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
      .from('dealers').select('id, slug, name, phone, email, address, location, state, zip, description, website, specialties, since, logo, plan, beta_expires_at')
      .or(`id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (dealerRow) {
      if (dealerRow.beta_expires_at && new Date(dealerRow.beta_expires_at) < new Date()) {
        router.replace('/dealer/expired');
        return;
      }
      setDealer(dealerRow);
      const { data: cars } = await supabase
        .from('listings')
        .select('id, slug, title, year, make, model, price, mileage, condition, body_style, engine, horsepower, torque, cylinders, displacement, forced_induction, fuel_type, num_speeds, drive_type, transmission, color, interior_color, seat_material, seating_type, description, location, state, featured, listed_at, images, seller_id, status, rejection_reason, expires_at, is_feed_managed, is_sold')
        .eq('seller_id', dealerRow.id)
        .order('created_at', { ascending: false });
      setListings(cars ?? []);

      // Load watcher counts for all listings
      const ids = (cars ?? []).map((c: DbCar) => c.id).join(',');
      if (ids) {
        fetch(`/api/dealer/watcher-counts?carIds=${ids}`)
          .then(r => r.json())
          .then(data => {
            if (data.counts) setWatcherCounts(data.counts);
            if (data.messaged) setWatcherMessaged(data.messaged);
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
    await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadData();
  };

  const markSold = async (id: string) => {
    await fetch('/api/cars/sold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: id }),
    });
    setSoldConfirm(null);
    loadData();
  };

  const sendWatcherMessage = async () => {
    if (!messageWatchersFor || !watcherMessage.trim()) return;
    setSendingWatcherMsg(true);
    setWatcherMsgResult(null);
    const res = await fetch('/api/dealer/message-watchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: messageWatchersFor.id, message: watcherMessage.trim() }),
    });
    const data = await res.json();
    setSendingWatcherMsg(false);
    if (!res.ok) {
      setWatcherMsgResult(`Error: ${data.error ?? 'Failed to send'}`);
      return;
    }
    const sent = data.sent ?? 0;
    setWatcherMsgResult(sent > 0 ? `Message sent to ${sent} watcher${sent !== 1 ? 's' : ''}.` : 'No eligible watchers to message.');
    // Mark this car as messaged in local state
    setWatcherMessaged(prev => ({ ...prev, [messageWatchersFor.id]: true }));
    setWatcherCounts(prev => ({ ...prev, [messageWatchersFor.id]: 0 }));
  };

  const renewCar = async (id: string) => {
    const res = await fetch(`/api/listings/${id}/renew`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) { alert(json.error ?? 'Failed to renew listing.'); return; }
    setListings(prev => prev.map(c => c.id === id ? { ...c, expires_at: json.expiresAt } : c));
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

  const betaBanner = (() => {
    if (dealer?.plan !== 'beta' || !dealer?.beta_expires_at) return null;
    const expires = new Date(dealer.beta_expires_at);
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return null;
    const dateStr = expires.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const isWarning = daysLeft <= 30;
    return { daysLeft, dateStr, isWarning };
  })();

  return (
    <>
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

    {/* Mark as Sold confirmation */}
    {soldConfirm && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h2 className="font-bold text-zinc-900 mb-2">Mark as sold?</h2>
          <p className="text-zinc-500 text-sm mb-5">This will mark the listing as sold and notify any watchlist buyers. This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setSoldConfirm(null)}
              className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2 rounded-xl text-sm hover:bg-zinc-50">
              Cancel
            </button>
            <button onClick={() => markSold(soldConfirm)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-sm">
              Mark Sold
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

    {/* Message Watchers modal */}
    {messageWatchersFor && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
          <h2 className="font-bold text-zinc-900 mb-1">Message Watchers</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Send a one-time message to <strong>{watcherCounts[messageWatchersFor.id] ?? 0} opted-in watcher{(watcherCounts[messageWatchersFor.id] ?? 0) !== 1 ? 's' : ''}</strong> for <strong>{messageWatchersFor.title}</strong>.
            They won&apos;t see your email — replies go through the listing page.
          </p>
          <textarea
            rows={5}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-3"
            placeholder="e.g. Price just dropped to $34,900 — still available and in great condition. Come take a look!"
            value={watcherMessage}
            onChange={e => setWatcherMessage(e.target.value)}
          />
          {watcherMsgResult && (
            <p className={`text-sm font-medium mb-3 ${watcherMsgResult.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
              {watcherMsgResult}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { setMessageWatchersFor(null); setWatcherMessage(''); setWatcherMsgResult(null); }}
              className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2 rounded-xl text-sm hover:bg-zinc-50">
              {watcherMsgResult ? 'Close' : 'Cancel'}
            </button>
            {!watcherMsgResult && (
              <button
                onClick={sendWatcherMessage}
                disabled={sendingWatcherMsg || !watcherMessage.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm transition-colors">
                {sendingWatcherMsg ? 'Sending…' : 'Send Message'}
              </button>
            )}
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

        {/* Beta banner */}
        {betaBanner && (
          <div className={`rounded-xl px-5 py-3 mb-6 flex items-center justify-between text-sm ${
            betaBanner.isWarning ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <span>{betaBanner.isWarning ? '⚠️' : '🎉'}</span>
              <span className={betaBanner.isWarning ? 'text-amber-800' : 'text-blue-800'}>
                <strong>Beta access</strong> — your free beta period expires on <strong>{betaBanner.dateStr}</strong>
                {' '}({betaBanner.daysLeft} day{betaBanner.daysLeft !== 1 ? 's' : ''} remaining)
              </span>
            </div>
            {betaBanner.isWarning && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">Expiring soon</span>
            )}
          </div>
        )}

        <div className="bg-white border border-zinc-100 rounded-xl px-5 py-3 flex items-center justify-between mb-6 text-sm">
          <span className="text-zinc-500">Inventory: <span className="font-medium text-zinc-800">{listings.length} active vehicles</span></span>
          <div className="flex gap-2">
            <button disabled title="Coming soon" className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg text-zinc-400 cursor-not-allowed opacity-50">Import JSON</button>
            <button disabled title="Coming soon" className="text-xs bg-zinc-300 text-zinc-400 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-50">Sync now</button>
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
                <button
                  onClick={() => window.open('/api/dealer/export?format=csv', '_blank')}
                  className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
                >Export CSV</button>
                <button
                  onClick={() => window.open('/api/dealer/export?format=json', '_blank')}
                  className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50"
                >Export JSON</button>
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
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Listed</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map(car => (
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
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          car.is_sold                ? 'bg-zinc-100 text-zinc-500' :
                          car.status === 'approved'  ? 'bg-green-100 text-green-700' :
                          car.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                          car.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                          'bg-zinc-100 text-zinc-500'
                        }`}>
                          {car.is_sold ? 'Sold' : car.status === 'approved' ? 'Active' : car.status === 'pending' ? 'Under Review' : car.status === 'rejected' ? 'Rejected' : (car.status ?? 'Unknown')}
                        </span>
                        {car.status === 'rejected' && car.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1 max-w-[180px] leading-tight">{car.rejection_reason}</p>
                        )}
                        {car.status === 'rejected' && !car.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1">Edit listing to resubmit.</p>
                        )}
                        {car.status === 'approved' && !car.is_feed_managed && car.expires_at && (() => {
                          const daysLeft = Math.ceil((new Date(car.expires_at!).getTime() - Date.now()) / 86400000);
                          return (
                            <p className={`text-xs mt-1 ${daysLeft <= 7 ? 'text-amber-600 font-semibold' : 'text-zinc-400'}`}>
                              {daysLeft > 0 ? `Expires in ${daysLeft}d` : 'Expired'}
                            </p>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{car.listed_at}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => setModalCar(car)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
                            Edit
                          </button>
                          {car.status === 'approved' && !car.is_sold && (
                            <button onClick={() => setSoldConfirm(car.id)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors">
                              Mark Sold
                            </button>
                          )}
                          {car.status === 'approved' && !car.is_sold && (
                            watcherMessaged[car.id]
                              ? <span className="text-xs text-zinc-300 font-medium" title="Already messaged watchers for this car">Messaged</span>
                              : watcherCounts[car.id] > 0
                                ? <button onClick={() => { setMessageWatchersFor(car); setWatcherMessage(''); setWatcherMsgResult(null); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                                    Message {watcherCounts[car.id]} watcher{watcherCounts[car.id] !== 1 ? 's' : ''}
                                  </button>
                                : null
                          )}
                          <Link href={`/listings/${toSlug(car.make)}/${toSlug(car.model)}/${car.id}/${car.slug}`}
                            target="_blank" className="text-xs text-red-600 hover:underline">
                            View ↗
                          </Link>
                          {car.status === 'approved' && !car.is_sold && !car.is_feed_managed && (
                            <button onClick={() => renewCar(car.id)}
                              className="text-xs text-blue-600 hover:underline font-medium">
                              Renew
                            </button>
                          )}
                          <button onClick={() => setDeleteConfirm(car.id)}
                            className="text-xs text-zinc-300 hover:text-red-500 transition-colors">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INQUIRIES */}
        {tab === 'inquiries' && (
          <InquiriesTab realInquiries={metrics?.recentInquiries} />
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
function InquiriesTab({ realInquiries }: { realInquiries?: any[] }) {
  const inquiries = realInquiries && realInquiries.length > 0
    ? realInquiries.map(i => ({
        name: i.buyer_name,
        vehicle: i.carTitle,
        type: 'Message',
        time: new Date(i.created_at).toLocaleDateString(),
        msg: i.message,
      }))
    : [];

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
      <div className="px-5 py-4">
        <h2 className="font-bold text-zinc-800">Inquiries</h2>
      </div>
      {inquiries.length === 0 ? (
        <div className="px-5 py-16 text-center text-zinc-400 text-sm">
          No inquiries yet — they'll appear here when buyers message you.
        </div>
      ) : inquiries.map((inq, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-sm font-bold text-red-600 shrink-0">
              {inq.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-zinc-800">{inq.name} <span className="font-normal text-zinc-400">on</span> {inq.vehicle}</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">{inq.type}</span>
              </div>
              <p className="text-sm text-zinc-600">{inq.msg}</p>
              <p className="text-xs text-zinc-400 mt-1">{inq.time}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dealer Settings ──────────────────────────────────────────────────────────
function DealerSettings({ dealer, onSaved }: { dealer: DbDealer & { phone?: string; email?: string; location?: string; state?: string; description?: string; website?: string; specialties?: string[]; logo?: string }; onSaved: () => void }) {
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
  const [logoUrl, setLogoUrl] = useState<string>(dealer.logo ?? '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => { setFields(f => ({ ...f, [k]: v })); setSaved(false); };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB'); return; }
    setLogoUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${dealer.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from('dealer-logos').upload(path, file, { upsert: true });
    if (uploadError) { setError('Logo upload failed: ' + uploadError.message); setLogoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('dealer-logos').getPublicUrl(path);
    // Bust cache so the browser picks up the new image
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;
    setLogoUrl(bustedUrl);
    // Save logo URL immediately
    await fetch('/api/dealer/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealerId: dealer.id, logo: publicUrl }),
    });
    setLogoUploading(false);
    onSaved();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
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
      }),
    });
    setSaving(false);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Save failed'); return; }
    setSaved(true);
    onSaved();
  };

  const inp = "w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-6 max-w-2xl">
      <h2 className="font-bold text-zinc-800 text-lg mb-6">Dealer Profile</h2>

      {/* Logo upload */}
      <div className="mb-6 pb-6 border-b border-zinc-100">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Dealership Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border-2 border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="Dealer logo" className="w-full h-full object-contain p-1" />
              : <span className="text-2xl text-zinc-300">🏢</span>
            }
          </div>
          <div>
            <button type="button" onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="text-sm border border-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-50 font-medium disabled:opacity-60 transition-colors">
              {logoUploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            <p className="text-xs text-zinc-400 mt-1.5">JPG, PNG or WebP · max 2 MB</p>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email <span className="font-normal normal-case text-zinc-400">(login email — not editable)</span></label>
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
