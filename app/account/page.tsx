'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, toSegment } from '@/lib/data';
import AccountTabBar from '@/components/AccountTabBar';

type Tab = 'watchlist' | 'messages' | 'alerts' | 'settings';

interface WatchItem {
  id: string;
  car_id: string;
  price_at_add: number | null;
  added_at: string;
  car: {
    id: string;
    slug: string;
    title: string;
    year: number;
    make: string;
    model: string;
    price: number;
    mileage: number | null;
    location: string | null;
    state: string | null;
    images: string[];
    status: string;
  } | null;
}

interface Conversation {
  id: string;
  listing_title: string;
  last_message_at: string;
  buyer_id: string;
  buyer_name: string | null;
  unread?: boolean;
}

interface Alert {
  id: string;
  name: string | null;
  make: string | null;
  model: string | null;
  year_min: number | null;
  year_max: number | null;
  price_max: number | null;
  paused: boolean;
  created_at: string;
  last_matched_at: string | null;
}

interface Profile {
  full_name: string;
  phone: string;
}

export default function AccountPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-20 text-center text-zinc-400">Loading…</div>}>
      <AccountPage />
    </Suspense>
  );
}

function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') as Tab) || 'watchlist');

  // Keep tab in sync when URL changes (e.g. clicking AccountTabBar links)
  useEffect(() => {
    const t = (searchParams.get('tab') as Tab) || 'watchlist';
    setTab(t);
  }, [searchParams]);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [counts, setCounts] = useState({ watchlist: 0, messages: 0, alerts: 0 });

  // Watchlist
  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [watchLoading, setWatchLoading] = useState(false);

  // Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Settings
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/account/login?return=/account'); return; }
      setUserId(user.id);
      setEmail(user.email ?? '');
    });
    fetch('/api/account/profile').then(r => r.json()).then(({ profile }) => {
      if (profile) { setFullName(profile.full_name ?? ''); setPhone(profile.phone ?? ''); }
    });
  }, [router]);

  // Fetch counts for badges
  const fetchCounts = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const [watchRes, alertRes, convRes] = await Promise.all([
      supabase.from('watchlists').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      fetch('/api/conversations'),
    ]);
    const convJson = await convRes.json();
    setCounts({
      watchlist: watchRes.count ?? 0,
      alerts: alertRes.count ?? 0,
      messages: convJson.conversations?.length ?? 0,
    });
  }, [userId]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Load watchlist tab data
  const loadWatchlist = useCallback(async () => {
    if (!userId || watchItems.length > 0) return;
    setWatchLoading(true);
    const supabase = createClient();
    const { data: rows } = await supabase
      .from('watchlists').select('id, car_id, price_at_add, added_at')
      .eq('user_id', userId).order('added_at', { ascending: false });
    const carIds = (rows ?? []).map((r: any) => r.car_id);
    const { data: cars } = carIds.length
      ? await supabase.from('listings').select('id,slug,title,year,make,model,price,mileage,location,state,images,status').in('id', carIds)
      : { data: [] };
    const byId = Object.fromEntries((cars ?? []).map((c: any) => [c.id, c]));
    setWatchItems((rows ?? []).map((r: any) => ({ ...r, car: byId[r.car_id] ?? null })).filter((r: any) => r.car));
    setWatchLoading(false);
  }, [userId, watchItems.length]);

  // Load messages tab data
  const loadMessages = useCallback(async () => {
    if (conversations.length > 0) return;
    setMessagesLoading(true);
    const res = await fetch('/api/conversations');
    const json = await res.json();
    setConversations(json.conversations ?? []);
    setMessagesLoading(false);
  }, [conversations.length]);

  // Load alerts tab data
  const loadAlerts = useCallback(async () => {
    if (!userId || alerts.length > 0) return;
    setAlertsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setAlerts(data ?? []);
    setAlertsLoading(false);
  }, [userId, alerts.length]);

  useEffect(() => {
    if (tab === 'watchlist') loadWatchlist();
    if (tab === 'messages') loadMessages();
    if (tab === 'alerts') loadAlerts();
  }, [tab, loadWatchlist, loadMessages, loadAlerts]);

  const removeFromWatchlist = async (watchId: string) => {
    const supabase = createClient();
    await supabase.from('watchlists').delete().eq('id', watchId);
    setWatchItems(prev => prev.filter(w => w.id !== watchId));
    setCounts(c => ({ ...c, watchlist: Math.max(0, c.watchlist - 1) }));
  };

  const deleteAlert = async (alertId: string) => {
    const supabase = createClient();
    await supabase.from('saved_searches').delete().eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setCounts(c => ({ ...c, alerts: Math.max(0, c.alerts - 1) }));
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    setProfileSaving(false);
    if (res.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
    else { const j = await res.json(); setProfileError(j.error ?? 'Save failed.'); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwError(error.message); }
    else { setPwSaved(true); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setTimeout(() => setPwSaved(false), 3000); }
  };

  const describeAlert = (a: Alert) => {
    const parts: string[] = [];
    if (a.make) parts.push(a.make);
    if (a.model) parts.push(a.model);
    if (a.year_min && a.year_max) parts.push(`${a.year_min}–${a.year_max}`);
    else if (a.year_min) parts.push(`${a.year_min}+`);
    if (a.price_max) parts.push(`under $${a.price_max.toLocaleString()}`);
    return parts.join(' · ') || 'All listings';
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'watchlist', label: 'Watchlist', count: counts.watchlist },
    { key: 'messages', label: 'Messages', count: counts.messages },
    { key: 'alerts', label: 'Alerts', count: counts.alerts },
    { key: 'settings', label: 'Settings' },
  ];

  if (!userId) {
    return (
      <>
        <AccountTabBar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-zinc-400">Loading…</div>
      </>
    );
  }

  return (
    <>
      <AccountTabBar />
      <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Watchlist tab */}
      {tab === 'watchlist' && (
        <div>
          {watchLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : watchItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
              <p className="text-5xl mb-4">🔖</p>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No saved listings yet</h2>
              <p className="text-zinc-500 text-sm mb-6">Click "Watch this Listing" on any car to save it here.</p>
              <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {watchItems.map(item => {
                const car = item.car!;
                const img = car.images?.[0];
                const priceChange = item.price_at_add && car.price < item.price_at_add
                  ? item.price_at_add - car.price : null;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex gap-4 items-center">
                    {img ? (
                      <Link href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.slug}`}>
                        <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-100 relative">
                          <Image src={img} alt={car.title} fill className="object-cover" sizes="96px" />
                        </div>
                      </Link>
                    ) : (
                      <div className="w-24 h-16 rounded-xl bg-zinc-100 shrink-0 flex items-center justify-center text-zinc-300 text-2xl">🚗</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.slug}`}
                        className="font-bold text-zinc-900 hover:text-red-600 transition-colors line-clamp-1">
                        {car.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-lg font-extrabold text-zinc-900">{formatPrice(car.price)}</span>
                        {priceChange && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ↓ {formatPrice(priceChange)} drop
                          </span>
                        )}
                        {car.status !== 'approved' && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Sold / Removed</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {car.location}{car.state ? `, ${car.state}` : ''} · Saved {new Date(item.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="text-zinc-300 hover:text-red-500 transition-colors shrink-0 p-2"
                      title="Remove">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {messagesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
              <p className="text-5xl mb-4">💬</p>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No messages yet</h2>
              <p className="text-zinc-500 text-sm mb-6">Message a seller from any listing page.</p>
              <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map(conv => (
                <Link key={conv.id} href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:border-red-200 hover:shadow transition-all">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
                    🚗
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{conv.listing_title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {conv.buyer_id === userId ? 'You are the buyer' : `Buyer: ${conv.buyer_name || 'Unknown'}`}
                      {' · '}{new Date(conv.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-zinc-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-zinc-500">{alerts.length}/10 alerts used</p>
            <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              + New Alert
            </Link>
          </div>
          {alertsLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
              <p className="text-5xl mb-4">🔔</p>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No alerts yet</h2>
              <p className="text-zinc-500 text-sm mb-6">Browse listings, set filters, then click "Notify me when a match lists."</p>
              <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="text-2xl">🔔</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900">{a.name || describeAlert(a)}</p>
                    {a.name && <p className="text-xs text-zinc-500">{describeAlert(a)}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {a.paused && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Paused</span>}
                      {a.last_matched_at && (
                        <span className="text-xs text-zinc-400">Last match {new Date(a.last_matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(a.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors p-2"
                    title="Delete alert">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="space-y-8 max-w-lg">
          {/* Profile */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-900 mb-4">Profile</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  value={email}
                  disabled
                  className="w-full border border-zinc-100 rounded-xl px-4 py-2.5 text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed"
                />
              </div>
              {profileError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileError}</p>}
              {profileSaved && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">Profile saved!</p>}
              <button type="submit" disabled={profileSaving}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                {profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-900 mb-4">Change Password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">New Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {pwError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>}
              {pwSaved && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">Password updated!</p>}
              <button type="submit" disabled={pwSaving}
                className="bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
