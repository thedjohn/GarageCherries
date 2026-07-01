'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, toSegment } from '@/lib/data';
import { MAKES, BODY_STYLES, CONDITIONS, STATES } from '@/lib/types';
import AccountTabBar from '@/components/AccountTabBar';
import { useMessenger } from '@/lib/messenger-context';

type Tab = 'watchlist' | 'messages' | 'alerts' | 'listings' | 'settings';

interface MyListing {
  id: string; slug: string; title: string; year: number; make: string; model: string;
  price: number; mileage: number | null; condition: string; body_style: string;
  transmission: string; engine: string | null; color: string | null;
  location: string; state: string; images: string[]; description: string;
  seller_name: string; seller_phone: string; seller_email: string;
  status: string; rejection_reason: string | null; resubmission_note: string | null;
  resubmission_count: number; created_at: string;
}

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

  // My Listings
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [editingListing, setEditingListing] = useState<MyListing | null>(null);
  const [editForm, setEditForm] = useState({ price: '', mileage: '', description: '', seller_name: '', seller_phone: '', seller_email: '', resubmission_note: '' });
  const [editImages, setEditImages] = useState<{ preview: string; publicUrl: string | null; uploadState: 'done' | 'uploading' | 'error'; file?: File; progress: number }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const editFileRef = useRef<HTMLInputElement>(null);

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

  const loadMyListings = useCallback(async () => {
    if (myListings.length > 0) return;
    setMyListingsLoading(true);
    const res = await fetch('/api/listings/my');
    const json = await res.json();
    setMyListings(json.listings ?? []);
    setMyListingsLoading(false);
  }, [myListings.length]);

  useEffect(() => {
    if (tab === 'watchlist') loadWatchlist();
    if (tab === 'messages') loadMessages();
    if (tab === 'alerts') loadAlerts();
    if (tab === 'listings') loadMyListings();
  }, [tab, loadWatchlist, loadMessages, loadAlerts, loadMyListings]);

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

  // Auto-open conversation when arriving from a notification click (?open=convId)
  useEffect(() => {
    const convId = searchParams.get('open');
    if (!convId || tab !== 'messages') return;
    // Wait for conversations to load then open the chat
    const tryOpen = () => {
      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        openChat(conv.id, conv.listing_title);
        markConvRead(conv.id, conv.last_message_at);
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: false } : c));
        // Remove ?open= from URL without triggering navigation
        const url = new URL(window.location.href);
        url.searchParams.delete('open');
        window.history.replaceState({}, '', url.toString());
      }
    };
    if (conversations.length > 0) tryOpen();
  }, [searchParams, conversations, tab, openChat]);

  function openEditListing(l: MyListing) {
    setEditingListing(l);
    setEditForm({
      price: String(l.price),
      mileage: l.mileage != null ? String(l.mileage) : '',
      description: l.description,
      seller_name: l.seller_name,
      seller_phone: l.seller_phone,
      seller_email: l.seller_email,
      resubmission_note: '',
    });
    setEditImages(l.images.map(url => ({ preview: url, publicUrl: url, uploadState: 'done' as const, progress: 100 })));
    setEditError('');
  }

  async function uploadEditImage(file: File, index: number): Promise<string | null> {
    const res = await fetch('/api/listings/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    if (!res.ok) return null;
    const { signedUrl, publicUrl } = await res.json();
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setEditImages(prev => prev.map((img, i) => i === index ? { ...img, progress: Math.round((e.loaded / e.total) * 100) } : img));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setEditImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'done', publicUrl, progress: 100 } : img));
          resolve(publicUrl);
        } else {
          setEditImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'error' } : img));
          resolve(null);
        }
      };
      xhr.onerror = () => {
        setEditImages(prev => prev.map((img, i) => i === index ? { ...img, uploadState: 'error' } : img));
        resolve(null);
      };
      xhr.send(file);
    });
  }

  function handleEditImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (editFileRef.current) editFileRef.current.value = '';
    const slots = 30 - editImages.length;
    if (slots <= 0) return;
    const toAdd = files.slice(0, slots);
    const newEntries = toAdd.map(file => ({
      file, preview: URL.createObjectURL(file),
      uploadState: 'uploading' as const, publicUrl: null, progress: 0,
    }));
    setEditImages(prev => {
      const updated = [...prev, ...newEntries];
      newEntries.forEach((_, i) => uploadEditImage(toAdd[i], prev.length + i));
      return updated;
    });
  }

  async function saveEditListing() {
    if (!editingListing) return;
    const anyUploading = editImages.some(img => img.uploadState === 'uploading');
    if (anyUploading) { setEditError('Please wait for all photos to finish uploading.'); return; }
    setEditSaving(true);
    setEditError('');
    const images = editImages.map(img => img.publicUrl).filter(Boolean) as string[];
    const res = await fetch(`/api/listings/${editingListing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, price: Number(editForm.price), mileage: editForm.mileage || null, images }),
    });
    const json = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(json.error ?? 'Failed to save.'); return; }
    setMyListings(prev => prev.map(l => l.id === editingListing.id
      ? { ...l, ...editForm, price: Number(editForm.price), mileage: editForm.mileage ? Number(editForm.mileage) : null, images, status: l.status === 'rejected' || l.status === 'approved' ? 'pending' : l.status, resubmission_note: editForm.resubmission_note, rejection_reason: null }
      : l));
    setEditingListing(null);
  }

  async function markAsSold(id: string) {
    await fetch('/api/cars/sold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId: id }),
    });
    setMyListings(prev => prev.map(l => l.id === id ? { ...l, status: 'removed' } : l));
  }

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

      {/* My Listings tab */}
      {tab === 'listings' && (
        <div>
          {myListingsLoading ? (
            <div className="text-center py-20 text-zinc-400 text-sm">Loading your listings…</div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-sm mb-4">You haven&apos;t posted any listings yet.</p>
              <Link href="/sell" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">Post a Car</Link>
            </div>
          ) : (

            /* Edit form */
            editingListing ? (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-zinc-900">Edit Listing — {editingListing.title}</h2>
                  <button onClick={() => setEditingListing(null)} className="text-zinc-400 hover:text-zinc-600 text-sm">Cancel</button>
                </div>

                {(editingListing.status === 'rejected' || editingListing.status === 'approved') && (
                  <div className={`rounded-xl p-4 mb-5 text-sm ${editingListing.status === 'rejected' ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                    {editingListing.status === 'rejected'
                      ? 'This listing was rejected. Fix the issues below and resubmit — it will go back to pending review.'
                      : 'Editing an approved listing will send it back to pending review before going live again.'}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Asking Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                        <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                          className="w-full border border-zinc-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Mileage</label>
                      <input type="number" value={editForm.mileage} onChange={e => setEditForm(f => ({ ...f, mileage: e.target.value }))}
                        placeholder="Leave blank if unknown"
                        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Description *</label>
                    <textarea rows={5} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Photos</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {editImages.map((img, i) => (
                        <div key={img.preview} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          {img.uploadState === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs">{img.progress}%</span>
                            </div>
                          )}
                          <button type="button" onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                          {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">Cover</span>}
                        </div>
                      ))}
                      {editImages.length < 30 && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
                          <span className="text-xl">📷</span>
                          <span className="text-xs text-zinc-400 mt-1">Add</span>
                          <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleEditImageAdd} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Name *</label>
                      <input type="text" value={editForm.seller_name} onChange={e => setEditForm(f => ({ ...f, seller_name: e.target.value }))}
                        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone *</label>
                      <input type="tel" value={editForm.seller_phone} onChange={e => setEditForm(f => ({ ...f, seller_phone: e.target.value }))}
                        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email *</label>
                      <input type="email" value={editForm.seller_email} onChange={e => setEditForm(f => ({ ...f, seller_email: e.target.value }))}
                        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>

                  {/* Resubmission note — required when resubmitting a rejected listing */}
                  {editingListing.status === 'rejected' && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">What did you fix? *</label>
                      <textarea rows={3} value={editForm.resubmission_note}
                        onChange={e => setEditForm(f => ({ ...f, resubmission_note: e.target.value }))}
                        placeholder="Briefly describe what you changed (e.g. 'Replaced all photos with clearer daylight shots and added full mileage.')"
                        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                    </div>
                  )}
                </div>

                {editError && <p className="text-sm text-red-600 mt-4">{editError}</p>}

                <div className="flex gap-3 mt-6">
                  <button onClick={saveEditListing} disabled={editSaving}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                    {editSaving ? 'Saving…' : editingListing.status === 'rejected' ? 'Fix & Resubmit' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditingListing(null)} className="border border-zinc-200 text-zinc-600 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myListings.map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex gap-4">
                    {l.images?.[0] && (
                      <img src={l.images[0]} alt={l.title} className="w-28 h-20 object-cover rounded-xl shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-zinc-900 text-sm">{l.title}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          l.status === 'approved' ? 'bg-green-100 text-green-700' :
                          l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          l.status === 'removed' ? 'bg-zinc-100 text-zinc-500' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{l.status === 'approved' ? 'Live' : l.status === 'removed' ? 'Removed' : l.status}</span>
                      </div>
                      <p className="text-xs text-zinc-500">${l.price.toLocaleString()} · {l.location}, {l.state}</p>

                      {/* Rejection reason */}
                      {l.status === 'rejected' && l.rejection_reason && (
                        <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-red-600 mb-0.5">Rejected</p>
                          <p className="text-xs text-red-700">{l.rejection_reason}</p>
                        </div>
                      )}
                      {l.status === 'rejected' && !l.rejection_reason && (
                        <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <p className="text-xs text-red-700">This listing was rejected. Edit and resubmit to try again.</p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3 flex-wrap">
                        {l.status !== 'removed' && (
                          <button onClick={() => openEditListing(l)}
                            className="text-xs font-semibold px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
                            {l.status === 'rejected' ? 'Fix & Resubmit' : 'Edit'}
                          </button>
                        )}
                        {l.status === 'approved' && (
                          <button onClick={() => markAsSold(l.id)}
                            className="text-xs font-semibold px-3 py-1.5 border border-green-200 rounded-lg text-green-700 hover:bg-green-50 transition-colors">
                            Mark as Sold
                          </button>
                        )}
                        {l.status === 'approved' && (
                          <Link href={`/listings/${toSegment(l.make)}/${toSegment(l.model)}/${l.id}/${l.slug}`}
                            className="text-xs font-semibold px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
                            View Listing
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
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
