'use client';
import { useEffect, useState } from 'react';

interface AffiliateProduct {
  id: string; name: string; image_url: string | null; description: string;
  category: string; merchant: string; affiliate_url: string; regular_url: string | null;
  price: number | null; featured: boolean; display_order: number; active: boolean;
}

const BLANK: Omit<AffiliateProduct, 'id'> = {
  name: '', image_url: '', description: '', category: '', merchant: '',
  affiliate_url: '', regular_url: '', price: null, featured: false, display_order: 0, active: true,
};

export default function AdminAffiliateProducts() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<AffiliateProduct, 'id'>>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/affiliate-products');
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: AffiliateProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name, image_url: p.image_url ?? '', description: p.description, category: p.category,
      merchant: p.merchant, affiliate_url: p.affiliate_url, regular_url: p.regular_url ?? '',
      price: p.price, featured: p.featured, display_order: p.display_order, active: p.active,
    });
    setShowAdd(true);
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm(BLANK);
    setError('');
  };

  const submit = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.merchant.trim() || !form.affiliate_url.trim()) {
      setError('Name, category, merchant, and affiliate URL are required.');
      return;
    }
    setWorking(true);
    setError('');
    const res = await fetch('/api/admin/affiliate-products', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await res.json();
    setWorking(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    cancelForm();
    load();
  };

  const toggleField = async (p: AffiliateProduct, field: 'active' | 'featured') => {
    await fetch('/api/admin/affiliate-products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, [field]: !p[field] }),
    });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, [field]: !x[field] } : x));
  };

  const move = async (p: AffiliateProduct, direction: -1 | 1) => {
    const siblings = products.filter(x => x.category === p.category).sort((a, b) => a.display_order - b.display_order);
    const idx = siblings.findIndex(x => x.id === p.id);
    const swapWith = siblings[idx + direction];
    if (!swapWith) return;
    await Promise.all([
      fetch('/api/admin/affiliate-products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, display_order: swapWith.display_order }) }),
      fetch('/api/admin/affiliate-products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swapWith.id, display_order: p.display_order }) }),
    ]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await fetch('/api/admin/affiliate-products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const byCategory = products.reduce<Record<string, AffiliateProduct[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">{products.length} product{products.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(BLANK); }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          + Add Product
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 space-y-3">
          <h3 className="font-bold text-zinc-900">{editingId ? 'Edit Product' : 'New Product'}</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Category (e.g. Detailing)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Merchant (e.g. Amazon)" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Price (optional)" type="number" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value === '' ? null : Number(e.target.value) })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Affiliate URL" value={form.affiliate_url} onChange={e => setForm({ ...form, affiliate_url: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="Regular URL (optional)" value={form.regular_url ?? ''} onChange={e => setForm({ ...form, regular_url: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="Image URL (optional)" value={form.image_url ?? ''} onChange={e => setForm({ ...form, image_url: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm col-span-2" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm col-span-2" rows={2} />
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={working} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              {working ? 'Saving…' : editingId ? 'Save Changes' : 'Add Product'}
            </button>
            <button onClick={cancelForm} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-zinc-400">No affiliate products yet.</p>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">{category}</h3>
            <div className="space-y-2">
              {items.sort((a, b) => a.display_order - b.display_order).map((p, i, arr) => (
                <div key={p.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-4 ${p.active ? 'border-zinc-100' : 'border-zinc-100 opacity-50'}`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">
                      {p.name} {p.featured && <span className="ml-1 text-[10px] font-bold uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Featured</span>}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{p.merchant}{p.price != null ? ` · $${p.price}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => move(p, -1)} disabled={i === 0} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 px-1.5" title="Move up">▲</button>
                    <button onClick={() => move(p, 1)} disabled={i === arr.length - 1} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 px-1.5" title="Move down">▼</button>
                    <button onClick={() => toggleField(p, 'featured')} className="text-xs text-zinc-500 hover:text-red-600 px-2 py-1">{p.featured ? 'Unfeature' : 'Feature'}</button>
                    <button onClick={() => toggleField(p, 'active')} className="text-xs text-zinc-500 hover:text-red-600 px-2 py-1">{p.active ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => startEdit(p)} className="text-xs text-zinc-500 hover:text-red-600 px-2 py-1">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
