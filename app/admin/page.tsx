'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPhone } from '@/lib/data';
import { MAKES, BODY_STYLES, CONDITIONS } from '@/lib/types';

const ADMIN_EMAIL = 'derek_ljohnson@yahoo.com';

interface Listing {
  id: string;
  title: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number | null;
  condition: string;
  body_style: string;
  transmission: string;
  engine: string | null;
  color: string | null;
  location: string;
  state: string;
  seller_name: string;
  seller_phone: string;
  seller_email: string;
  images: string[];
  description: string;
  featured: boolean;
  status: string;
  created_at: string;
}

type EditFields = Omit<Listing, 'id' | 'images' | 'created_at' | 'title'>;

export default function AdminPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthed(true);
        supabase
          .from('listings')
          .select('id,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,location,state,seller_name,seller_phone,seller_email,images,description,featured,status,created_at')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setListings((data ?? []) as Listing[]);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  function openEdit(l: Listing) {
    setEditing(l);
    setEditFields({
      year: l.year, make: l.make, model: l.model, price: l.price,
      mileage: l.mileage, condition: l.condition, body_style: l.body_style,
      transmission: l.transmission, engine: l.engine, color: l.color,
      location: l.location, state: l.state, description: l.description,
      seller_name: l.seller_name, seller_phone: l.seller_phone,
      seller_email: l.seller_email, featured: l.featured, status: l.status,
    });
    setSaveError('');
  }

  async function saveEdit() {
    if (!editing || !editFields) return;
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, ...editFields }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(json.error ?? 'Save failed'); return; }
    setListings(prev => prev.map(l => l.id === editing.id
      ? { ...l, ...editFields, title: `${editFields.year} ${editFields.make} ${editFields.model}` }
      : l));
    setEditing(null);
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setWorking(id + action);
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id
        ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l));
    }
    setWorking(null);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Loading…</div>;
  if (!authed) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Access denied.</div>;

  const pending = listings.filter(l => l.status === 'pending');
  const approved = listings.filter(l => l.status === 'approved');
  const rejected = listings.filter(l => l.status === 'rejected');

  const set = (k: keyof EditFields, v: string | number | boolean | null) =>
    setEditFields(f => f ? { ...f, [k]: v } : f);

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';
  const labelCls = 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1';

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Admin — Listings</h1>
      <p className="text-zinc-400 text-sm mb-8">{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>

      {listings.length === 0 && (
        <div className="text-center py-20 text-zinc-400">No listings submitted yet.</div>
      )}

      <div className="space-y-4">
        {listings.map(l => (
          <div key={l.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex gap-4">
            {l.images?.[0] && (
              <img src={l.images[0]} alt={l.title} className="w-32 h-24 object-cover rounded-xl shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="font-bold text-zinc-900">{l.title}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  l.status === 'approved' ? 'bg-green-100 text-green-700' :
                  l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{l.status}</span>
              </div>
              <p className="text-sm text-zinc-500">{l.condition} · {l.location}, {l.state} · ${l.price?.toLocaleString()}</p>
              <p className="text-sm text-zinc-500">{l.seller_name} · {formatPhone(l.seller_phone)} · {l.seller_email}</p>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{l.description}</p>
              {l.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAction(l.id, 'approve')} disabled={!!working}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    {working === l.id + 'approve' ? 'Approving…' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(l.id, 'reject')} disabled={!!working}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    {working === l.id + 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && editFields && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">Edit Listing</h2>
              <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-zinc-700 text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Vehicle */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Year</label>
                  <input type="number" value={editFields.year} onChange={e => set('year', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Make</label>
                  <select value={editFields.make} onChange={e => set('make', e.target.value)} className={inputCls}>
                    {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input value={editFields.model} onChange={e => set('model', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Price ($)</label>
                  <input type="number" value={editFields.price} onChange={e => set('price', Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mileage</label>
                  <input type="number" value={editFields.mileage ?? ''} onChange={e => set('mileage', e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank if unknown" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Condition</label>
                  <select value={editFields.condition} onChange={e => set('condition', e.target.value)} className={inputCls}>
                    {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Body Style</label>
                  <select value={editFields.body_style} onChange={e => set('body_style', e.target.value)} className={inputCls}>
                    {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Transmission</label>
                  <select value={editFields.transmission} onChange={e => set('transmission', e.target.value)} className={inputCls}>
                    <option>Manual</option>
                    <option>Automatic</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Engine</label>
                  <input value={editFields.engine ?? ''} onChange={e => set('engine', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Color</label>
                  <input value={editFields.color ?? ''} onChange={e => set('color', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input value={editFields.location} onChange={e => set('location', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input value={editFields.state} maxLength={2} onChange={e => set('state', e.target.value.toUpperCase())} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={4} value={editFields.description} onChange={e => set('description', e.target.value)} className={inputCls + ' resize-none'} />
              </div>

              {/* Seller */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Seller Name</label>
                  <input value={editFields.seller_name} onChange={e => set('seller_name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Seller Phone</label>
                  <input value={editFields.seller_phone} onChange={e => set('seller_phone', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Seller Email</label>
                  <input type="email" value={editFields.seller_email} onChange={e => set('seller_email', e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Status & featured */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={editFields.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editFields.featured} onChange={e => set('featured', e.target.checked)}
                      className="w-4 h-4 accent-red-600" />
                    <span className="text-sm font-semibold text-zinc-700">Featured listing</span>
                  </label>
                </div>
              </div>

              {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
            </div>

            <div className="flex gap-3 p-6 border-t border-zinc-100">
              <button onClick={() => setEditing(null)}
                className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
