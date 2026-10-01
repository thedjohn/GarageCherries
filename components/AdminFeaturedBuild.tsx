'use client';
import { useState, useEffect } from 'react';

interface FeaturedVehicle {
  year: number; make: string; model: string; trim: string | null; nickname: string | null; images: string[] | null;
}

interface Pick {
  id: string; garage_vehicle_id: string; featured_date: string;
  blurb: string | null;
  garage_vehicles: FeaturedVehicle | null;
}

interface VehicleSearchResult {
  id: string; year: number; make: string; model: string; trim: string | null; nickname: string | null;
}

const BLANK = { garage_vehicle_id: '', featured_date: '', blurb: '' };

function vehicleLabel(v: { year: number; make: string; model: string; trim: string | null; nickname: string | null }) {
  const title = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`;
  return v.nickname ? `${v.nickname} (${title})` : title;
}

export default function AdminFeaturedBuild() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<VehicleSearchResult[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/featured-build');
    const data = await res.json();
    setPicks(data.picks ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Debounced vehicle search -- avoids firing a query on every keystroke.
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/admin/garage-vehicles?search=${encodeURIComponent(search.trim())}&limit=10`);
      const data = await res.json();
      setSearchResults(data.vehicles ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const startEdit = (p: Pick) => {
    setEditingId(p.id);
    setForm({ garage_vehicle_id: p.garage_vehicle_id, featured_date: p.featured_date, blurb: p.blurb ?? '' });
    setSelectedVehicle(p.garage_vehicles ? { id: p.garage_vehicle_id, ...p.garage_vehicles } : null);
    setSearch('');
    setSearchResults([]);
    setShowAdd(true);
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm(BLANK);
    setSelectedVehicle(null);
    setSearch('');
    setSearchResults([]);
    setError('');
  };

  const submit = async () => {
    if (!form.garage_vehicle_id.trim() || !form.featured_date.trim()) {
      setError('A vehicle and featured date are required.');
      return;
    }
    setWorking(true);
    setError('');
    const res = await fetch('/api/admin/featured-build', {
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
    if (!confirm('Delete this Featured Build? This cannot be undone.')) return;
    await fetch('/api/admin/featured-build', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPicks(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">{picks.length} feature{picks.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(BLANK); setSelectedVehicle(null); }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          + Add Featured Build
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 space-y-3">
          <h3 className="font-bold text-zinc-900">{editingId ? 'Edit Featured Build' : 'New Featured Build'}</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Vehicle</label>
            {selectedVehicle ? (
              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm">
                <span>{vehicleLabel(selectedVehicle)}</span>
                <button onClick={() => { setSelectedVehicle(null); setForm(f => ({ ...f, garage_vehicle_id: '' })); }} className="text-xs text-zinc-400 hover:text-red-600">Change</button>
              </div>
            ) : (
              <div>
                <input
                  placeholder="Search by make, model, or nickname…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full"
                />
                {searchResults.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg mt-1 max-h-48 overflow-y-auto">
                    {searchResults.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVehicle(v); setForm(f => ({ ...f, garage_vehicle_id: v.id })); setSearch(''); setSearchResults([]); }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                      >
                        {vehicleLabel(v)}
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
          <textarea placeholder="Blurb (optional)" value={form.blurb} onChange={e => setForm({ ...form, blurb: e.target.value })} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full" rows={2} />

          <div className="flex gap-2">
            <button onClick={submit} disabled={working} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              {working ? 'Saving…' : editingId ? 'Save Changes' : 'Add Feature'}
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
        <p className="text-sm text-zinc-400">No Featured Builds yet.</p>
      ) : (
        <div className="space-y-2">
          {picks.map(p => (
            <div key={p.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 text-sm truncate">{p.garage_vehicles ? vehicleLabel(p.garage_vehicles) : '(vehicle not found)'}</p>
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
