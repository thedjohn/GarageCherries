'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPhone } from '@/lib/data';

const ADMIN_EMAIL = 'derek_ljohnson@yahoo.com';

interface Listing {
  id: string;
  title: string;
  year: number;
  make: string;
  model: string;
  price: number;
  condition: string;
  location: string;
  state: string;
  seller_name: string;
  seller_phone: string;
  seller_email: string;
  images: string[];
  description: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthed(true);
        supabase
          .from('listings')
          .select('id,title,year,make,model,price,condition,location,state,seller_name,seller_phone,seller_email,images,description,status,created_at')
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

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setWorking(id + action);
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l));
    }
    setWorking(null);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Loading…</div>;
  if (!authed) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Access denied.</div>;

  const pending = listings.filter(l => l.status === 'pending');
  const approved = listings.filter(l => l.status === 'approved');
  const rejected = listings.filter(l => l.status === 'rejected');

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
                  <button
                    onClick={() => handleAction(l.id, 'approve')}
                    disabled={!!working}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    {working === l.id + 'approve' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction(l.id, 'reject')}
                    disabled={!!working}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    {working === l.id + 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
