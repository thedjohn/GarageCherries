'use client';
import { useEffect, useState } from 'react';

interface PickedListing {
  title: string; year: number; make: string; model: string; price: number; images: string[] | null; slug: string;
}

interface Pick {
  id: string; listing_id: string; featured_date: string;
  short_description: string | null; interesting_facts: string | null;
  instagram_caption: string | null; instagram_reel_caption: string | null; hashtags: string | null;
  listings: PickedListing | null;
}

interface ListingSearchResult {
  id: string; title: string; year: number; make: string; model: string;
}

const BLANK = {
  listing_id: '', featured_date: '', short_description: '', interesting_facts: '',
  instagram_caption: '', instagram_reel_caption: '', hashtags: '',
};

export default function AdminGarageCherryOfTheDay() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ListingSearchResult[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingSearchResult | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/garagecherry-of-the-day');
    const data = await res.json();
    setPicks(data.picks ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Debounced listing search -- avoids firing a query on every keystroke.
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/listings?search=${encodeURIComponent(search.trim())}&limit=10`);
      const data = await res.json();
      setSearchResults(data.listings ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const startEdit = (p: Pick) => {
    setEditingId(p.id);
    setForm({
      listing_id: p.listing_id, featured_date: p.featured_date,
      short_description: p.short_description ?? '', interesting_facts: p.interesting_facts ?? '',
      instagram_caption: p.instagram_caption ?? '', instagram_reel_caption: p.instagram_reel_caption ?? '',
      hashtags: p.hashtags ?? '',
    });
    setSelectedListing(p.listings ? { id: p.listing_id, title: p.listings.title, year: p.listings.year, make: p.listings.make, model: p.listings.model } : null);
    setSearch('');
    setSearchResults([]);
    setShowAdd(true);
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm(BLANK);
    setSelectedListing(null);
    setSearch('');
    setSearchResults([]);
    setError('');
  };

  const submit = async () => {
    if (!form.listing_id.trim() || !form.featured_date.trim()) {
      setError('A vehicle and featured date are required.');
      return;
    }
    setWorking(true);
    setError('');
    const res = await fetch('/api/admin/garagecherry-of-the-day', {
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

  const remove = async (id: string) => {
    if (!confirm('Delete this GarageCherry of the Day pick? This cannot be undone.')) return;
    await fetch('/api/admin/garagecherry-of-the-day', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPicks(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">{picks.length} pick{picks.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(BLANK); setSelectedListing(null); }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          + Add Pick
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 space-y-3">
          <h3 className="font-bold text-zinc-900">{editingId ? 'Edit Pick' : 'New Pick'}</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Vehicle</label>
            {selectedListing ? (
              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm">
                <span>{selectedListing.title}</span>
                <button onClick={() => { setSelectedListing(null); setForm(f => ({ ...f, listing_id: '' })); }} className="text-xs text-zinc-400 hover:text-red-600">Change</button>
              </div>
            ) : (
              <div>
                <input
                  placeholder="Search listings by title…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full"
                />
                {searchResults.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg mt-1 max-h-48 overflow-y-auto">
                    {searchResults.map(l => (
                      <button
                        key={l.id}
                        onClick={() => { setSelectedListing(l); setForm(f => ({ ...f, listing_id: l.id })); setSearch(''); setSearchResults([]); }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                      >
                        {l.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Featured Date</label>
              <input type="date" value={form.featured_date} onChange={e => setForm({ ...form, featured_date: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>
          <textarea placeholder="Short description" value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" rows={2} />
          <textarea placeholder="Interesting vehicle facts" value={form.interesting_facts} onChange={e => setForm({ ...form, interesting_facts: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" rows={3} />
          <textarea placeholder="Instagram caption" value={form.instagram_caption} onChange={e => setForm({ ...form, instagram_caption: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" rows={2} />
          <textarea placeholder="Instagram Reel caption" value={form.instagram_reel_caption} onChange={e => setForm({ ...form, instagram_reel_caption: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" rows={2} />
          <input placeholder="Hashtags" value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" />

          <div className="flex gap-2">
            <button onClick={submit} disabled={working} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              {working ? 'Saving…' : editingId ? 'Save Changes' : 'Add Pick'}
            </button>
            <button onClick={cancelForm} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : picks.length === 0 ? (
        <p className="text-sm text-zinc-400">No GarageCherry of the Day picks yet.</p>
      ) : (
        <div className="space-y-2">
          {picks.map(p => (
            <div key={p.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 text-sm truncate">{p.listings?.title ?? '(listing not found)'}</p>
                <p className="text-xs text-zinc-400 truncate">{p.featured_date}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => startEdit(p)} className="text-xs text-zinc-500 hover:text-red-600 px-2 py-1">Edit</button>
                <button onClick={() => remove(p.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
