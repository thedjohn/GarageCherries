'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, toSegment } from '@/lib/data';
import { MAKES, BODY_STYLES, CONDITIONS, STATES } from '@/lib/types';
import AccountTabBar from '@/components/AccountTabBar';
import { useMessenger } from '@/lib/messenger-context';

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
  listing_id: string;
  listing_title: string;
  last_message_at: string;
  buyer_id: string;
  buyer_name: string | null;
  unread?: boolean;
  listing_image?: string | null;
}

interface Alert {
  id: string;
  name: string | null;
  make: string | null;
  model: string | null;
  year_min: number | null;
  year_max: number | null;
  price_min: number | null;
  price_max: number | null;
  condition: string[] | string | null;
  body_style: string | null;
  state: string | null;
  paused: boolean;
  created_at: string;
  last_matched_at: string | null;
}

interface Profile {
  full_name: string;
  phone: string;
}

function NotificationPermissionButton() {
  const [status, setStatus] = useState<NotificationPermission | 'unsupported'>('default');
  useEffect(() => {
    setStatus('Notification' in window ? Notification.permission : 'unsupported');
  }, []);
  if (status === 'unsupported') return <p className="text-sm text-zinc-400">Your browser does not support notifications.</p>;
  if (status === 'granted') return <p className="text-sm text-emerald-600 font-semibold">✓ Notifications enabled</p>;
  if (status === 'denied') return <p className="text-sm text-zinc-400">Notifications blocked — allow them in your browser settings to enable.</p>;
  return (
    <button
      onClick={() => Notification.requestPermission().then(p => setStatus(p))}
      className="bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
      Enable Notifications
    </button>
  );
}

function markConvRead(convId: string, lastMessageAt: string) {
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem('gc_conv_read_at') ?? '{}');
    const wasUnread = !map[convId] || new Date(lastMessageAt) > new Date(map[convId]);
    map[convId] = lastMessageAt;
    localStorage.setItem('gc_conv_read_at', JSON.stringify(map));
    if (wasUnread) window.dispatchEvent(new CustomEvent('gc:conv-read', { detail: { convId } }));
  } catch {}
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
  const { openChat } = useMessenger();
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
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [alertMatchesCache, setAlertMatchesCache] = useState<Record<string, any[]>>({});
  const [alertMatchesLoading, setAlertMatchesLoading] = useState(false);
  const [alertForm, setAlertForm] = useState({ name: '', make: '', model: '', year_min: '', year_max: '', price_min: '', price_max: '', condition: '', body_style: '', state: '' });
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertError, setAlertError] = useState('');

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
      supabase.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('last_matched_at', 'is', null),
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
    const convs: Conversation[] = json.conversations ?? [];

    // Fetch first image for each listing
    const listingIds = [...new Set(convs.map(c => c.listing_id).filter(Boolean))];
    if (listingIds.length > 0) {
      const supabase = createClient();
      const { data: listings } = await supabase
        .from('listings')
        .select('id, images')
        .in('id', listingIds);
      const imageMap = Object.fromEntries((listings ?? []).map(l => [l.id, l.images?.[0] ?? null]));
      convs.forEach(c => { c.listing_image = imageMap[c.listing_id] ?? null; });
    }

    // Mark unread: unread if never seen, or if last_message_at is newer than last seen
    try {
      const map: Record<string, string> = JSON.parse(localStorage.getItem('gc_conv_read_at') ?? '{}');
      convs.forEach(c => {
        c.unread = !map[c.id] || new Date(c.last_message_at) > new Date(map[c.id]);
      });
    } catch {}

    setConversations(convs);
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

  // Listen for new inbound messages and mark that conversation unread
  useEffect(() => {
    const onNewMessage = (e: Event) => {
      const { conversationId, sentAt } = (e as CustomEvent).detail;
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unread: true, last_message_at: sentAt } : c
      ));
    };
    window.addEventListener('gc:new-message', onNewMessage);
    return () => window.removeEventListener('gc:new-message', onNewMessage);
  }, []);

  const removeFromWatchlist = async (watchId: string) => {
    const supabase = createClient();
    await supabase.from('watchlists').delete().eq('id', watchId);
    setWatchItems(prev => prev.filter(w => w.id !== watchId));
    setCounts(c => {
      const next = Math.max(0, c.watchlist - 1);
      window.dispatchEvent(new CustomEvent('gc:watchlist-change', { detail: { count: next } }));
      return { ...c, watchlist: next };
    });
  };

  const deleteAlert = async (alertId: string) => {
    const supabase = createClient();
    await supabase.from('saved_searches').delete().eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setCounts(c => ({ ...c, alerts: Math.max(0, c.alerts - 1) }));
  };

  const alertFields = () => ({
    name: alertForm.name || null,
    make: alertForm.make || null,
    model: alertForm.model || null,
    year_min: alertForm.year_min ? Number(alertForm.year_min) : null,
    year_max: alertForm.year_max ? Number(alertForm.year_max) : null,
    price_min: alertForm.price_min ? Number(alertForm.price_min) : null,
    price_max: alertForm.price_max ? Number(alertForm.price_max) : null,
    condition: alertForm.condition ? [alertForm.condition] : null,
    body_style: alertForm.body_style || null,
    state: alertForm.state || null,
  });

  const resetAlertForm = () => {
    setAlertForm({ name: '', make: '', model: '', year_min: '', year_max: '', price_min: '', price_max: '', condition: '', body_style: '', state: '' });
    setShowAlertForm(false);
    setEditingAlertId(null);
    setAlertError('');
  };

  const openEditAlert = (a: Alert) => {
    setAlertForm({
      name: a.name || '',
      make: a.make || '',
      model: a.model || '',
      year_min: a.year_min ? String(a.year_min) : '',
      year_max: a.year_max ? String(a.year_max) : '',
      price_min: a.price_min ? String(a.price_min) : '',
      price_max: a.price_max ? String(a.price_max) : '',
      condition: (Array.isArray(a.condition) ? a.condition[0] : a.condition) || '',
      body_style: a.body_style || '',
      state: a.state || '',
    });
    setEditingAlertId(a.id);
    setShowAlertForm(true);
    setAlertError('');
  };

  const toggleAlertExpand = async (alertId: string) => {
    if (expandedAlertId === alertId) { setExpandedAlertId(null); return; }
    setExpandedAlertId(alertId);
    if (alertMatchesCache[alertId]) return;
    setAlertMatchesLoading(true);
    const res = await fetch(`/api/alerts/matches?alertId=${alertId}`);
    const json = await res.json();
    setAlertMatchesCache(c => ({ ...c, [alertId]: json.listings ?? [] }));
    setAlertMatchesLoading(false);
  };

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alerts.length >= 10) { setAlertError('You have reached the 10 alert limit.'); return; }
    setAlertSaving(true); setAlertError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAlertError('Not logged in.'); setAlertSaving(false); return; }
    const { data, error } = await supabase.from('saved_searches').insert({ user_id: user.id, ...alertFields() }).select().single();
    setAlertSaving(false);
    if (error) { setAlertError(error.message); return; }
    setAlerts(prev => [data as Alert, ...prev]);
    setCounts(c => ({ ...c, alerts: c.alerts + 1 }));
    resetAlertForm();
  };

  const updateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertId) return;
    setAlertSaving(true); setAlertError('');
    const supabase = createClient();
    const { data, error } = await supabase.from('saved_searches').update(alertFields()).eq('id', editingAlertId).select().single();
    setAlertSaving(false);
    if (error) { setAlertError(error.message); return; }
    setAlerts(prev => prev.map(a => a.id === editingAlertId ? (data as Alert) : a));
    resetAlertForm();
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
    else if (a.year_max) parts.push(`up to ${a.year_max}`);
    return parts.join(' · ') || 'All listings';
  };

  const alertTags = (a: Alert) => {
    const tags: string[] = [];
    const cond = Array.isArray(a.condition) ? a.condition[0] : a.condition;
    if (cond) tags.push(cond);
    if (a.body_style) tags.push(a.body_style);
    if (a.state) tags.push(a.state);
    if (a.price_min && a.price_max) tags.push(`$${a.price_min.toLocaleString()}–$${a.price_max.toLocaleString()}`);
    else if (a.price_min) tags.push(`$${a.price_min.toLocaleString()}+`);
    else if (a.price_max) tags.push(`Under $${a.price_max.toLocaleString()}`);
    return tags;
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
                      <Link href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`}>
                        <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-100 relative">
                          <Image src={img} alt={car.title} fill className="object-cover" sizes="96px" />
                        </div>
                      </Link>
                    ) : (
                      <div className="w-24 h-16 rounded-xl bg-zinc-100 shrink-0 flex items-center justify-center text-zinc-300 text-2xl">🚗</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`}
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
                <button key={conv.id}
                  onClick={() => {
                    openChat(conv.id, conv.listing_title);
                    markConvRead(conv.id, conv.last_message_at);
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: false } : c));
                  }}
                  className={`w-full flex items-center gap-4 rounded-2xl border shadow-sm p-4 hover:border-red-200 hover:shadow transition-all text-left ${conv.unread ? 'bg-blue-50 border-blue-100' : 'bg-white border-zinc-100'}`}>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden relative">
                      {conv.listing_image
                        ? <Image src={conv.listing_image} alt={conv.listing_title} fill className="object-cover" sizes="40px" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg">🚗</div>
                      }
                    </div>
                    {conv.unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${conv.unread ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-900'}`}>{conv.listing_title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {conv.buyer_id === userId ? 'You are the buyer' : `Buyer: ${conv.buyer_name || 'Unknown'}`}
                      {' · '}{new Date(conv.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-zinc-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-zinc-500">{alerts.length}/10 alerts used</p>
            {alerts.length < 10 && !showAlertForm && !editingAlertId && (
              <button onClick={() => setShowAlertForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                + New Alert
              </button>
            )}
          </div>

          {/* New / Edit alert form */}
          {showAlertForm && (
            <form onSubmit={editingAlertId ? updateAlert : createAlert} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-5">
              <h2 className="font-bold text-zinc-900 mb-4">{editingAlertId ? 'Edit Alert' : 'New Alert'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Alert Name (optional)</label>
                  <input value={alertForm.name} onChange={e => setAlertForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Dream Mustang"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Make</label>
                    <select value={alertForm.make} onChange={e => setAlertForm(f => ({ ...f, make: e.target.value, model: '' }))}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      <option value="">Any Make</option>
                      {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Model</label>
                    <input value={alertForm.model} onChange={e => setAlertForm(f => ({ ...f, model: e.target.value }))}
                      placeholder="Any model"
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Year From</label>
                    <input type="number" value={alertForm.year_min} onChange={e => setAlertForm(f => ({ ...f, year_min: e.target.value }))}
                      placeholder="e.g. 1965" min={1900} max={new Date().getFullYear() + 1}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Year To</label>
                    <input type="number" value={alertForm.year_max} onChange={e => setAlertForm(f => ({ ...f, year_max: e.target.value }))}
                      placeholder="e.g. 1970" min={1900} max={new Date().getFullYear() + 1}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Min Price</label>
                    <input type="number" value={alertForm.price_min} onChange={e => setAlertForm(f => ({ ...f, price_min: String(Math.max(0, Number(e.target.value))) }))}
                      placeholder="No minimum" min={0}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Max Price</label>
                    <input type="number" value={alertForm.price_max} onChange={e => setAlertForm(f => ({ ...f, price_max: String(Math.max(0, Number(e.target.value))) }))}
                      placeholder="No limit" min={0}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Condition</label>
                    <select value={alertForm.condition} onChange={e => setAlertForm(f => ({ ...f, condition: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      <option value="">Any Condition</option>
                      {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Body Style</label>
                    <select value={alertForm.body_style} onChange={e => setAlertForm(f => ({ ...f, body_style: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      <option value="">Any Style</option>
                      {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">State</label>
                    <select value={alertForm.state} onChange={e => setAlertForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      <option value="">Any State</option>
                      {STATES.filter(s => s !== 'All States').map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {alertError && <p className="text-sm text-red-600 mt-3">{alertError}</p>}
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={resetAlertForm}
                  className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">
                  Cancel
                </button>
                <button type="submit" disabled={alertSaving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                  {alertSaving ? 'Saving…' : editingAlertId ? 'Update Alert' : 'Save Alert'}
                </button>
              </div>
            </form>
          )}

          {alertsLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : alerts.length === 0 && !showAlertForm ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
              <p className="text-5xl mb-4">🔔</p>
              <h2 className="text-xl font-bold text-zinc-800 mb-2">No alerts yet</h2>
              <p className="text-zinc-500 text-sm mb-6">Get notified by email when a listing matches your criteria.</p>
              <button onClick={() => setShowAlertForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => {
                const isExpanded = expandedAlertId === a.id;
                const matches = alertMatchesCache[a.id] ?? [];
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                    {/* Alert header row */}
                    <div className="p-4 flex items-center gap-4">
                      <button onClick={() => toggleAlertExpand(a.id)} className="text-2xl shrink-0" title="View matches">
                        🔔
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleAlertExpand(a.id)}>
                        <p className="font-semibold text-zinc-900">{a.name || describeAlert(a)}</p>
                        {a.name && <p className="text-xs text-zinc-500 mt-0.5">{describeAlert(a)}</p>}
                        {alertTags(a).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {alertTags(a).map(tag => (
                              <span key={tag} className="text-xs bg-zinc-100 text-zinc-600 font-medium px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {a.paused && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Paused</span>}
                          {a.last_matched_at && (
                            <span className="text-xs text-zinc-400">Last match {new Date(a.last_matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                      {/* Chevron */}
                      <button onClick={() => toggleAlertExpand(a.id)} className="text-zinc-300 hover:text-zinc-500 transition-colors p-2">
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => openEditAlert(a)}
                        className="text-zinc-300 hover:text-zinc-600 transition-colors p-2" title="Edit alert">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteAlert(a.id)}
                        className="text-zinc-300 hover:text-red-500 transition-colors p-2" title="Delete alert">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Matches panel */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                        {alertMatchesLoading && !alertMatchesCache[a.id] ? (
                          <div className="space-y-2 py-2">
                            {[1,2].map(i => <div key={i} className="h-16 bg-zinc-200 rounded-xl animate-pulse" />)}
                          </div>
                        ) : matches.length === 0 ? (
                          <p className="text-sm text-zinc-400 text-center py-4">No matches yet — we'll email you when a listing fits.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
                            {matches.map((car: any) => {
                              const img = car.images?.[0];
                              return (
                                <Link
                                  key={car.id}
                                  href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`}
                                  target="_blank"
                                  className="flex items-center gap-3 bg-white rounded-xl border border-zinc-100 p-3 hover:border-red-200 hover:shadow-sm transition-all"
                                >
                                  {img ? (
                                    <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-zinc-100 relative">
                                      <Image src={img} alt={car.title} fill className="object-cover" sizes="80px" />
                                    </div>
                                  ) : (
                                    <div className="w-20 h-14 rounded-lg bg-zinc-100 shrink-0 flex items-center justify-center text-zinc-300 text-xl">🚗</div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-zinc-900 line-clamp-1">{car.title}</p>
                                    <p className="text-sm font-bold text-red-600">{formatPrice(car.price)}</p>
                                    <p className="text-xs text-zinc-400">{car.location}, {car.state}</p>
                                  </div>
                                  <svg className="w-4 h-4 text-zinc-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="space-y-8 max-w-lg">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-900 mb-1">Notifications</h2>
            <p className="text-sm text-zinc-500 mb-4">Get browser notifications when you receive a new message, even when the tab is in the background.</p>
            <NotificationPermissionButton />
          </div>

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
