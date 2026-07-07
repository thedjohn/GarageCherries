'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'dealer' }
  | { status: 'advertiser' }
  | { status: 'buyer'; email: string; name: string };

interface Counts { watchlist: number; messages: number; alerts: number }

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [counts, setCounts] = useState<Counts>({ watchlist: 0, messages: 0, alerts: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function resolveAuth(userId: string | null, email: string | null, name: string | null) {
      if (!userId) { setAuth({ status: 'none' }); return; }
      const [{ data: dealer }, { data: advertiser }] = await Promise.all([
        supabase.from('dealers').select('id').eq('id', userId).single(),
        supabase.from('advertisers').select('id').eq('user_id', userId).single(),
      ]);
      if (dealer) { setAuth({ status: 'dealer' }); return; }
      if (advertiser) { setAuth({ status: 'advertiser' }); return; }
      setAuth({ status: 'buyer', email: email ?? '', name: name ?? email ?? '' });
      // Fetch counts for badge display + check admin status in parallel
      const [watchRes, alertRes, convRes, adminRes] = await Promise.all([
        supabase.from('watchlists').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('last_matched_at', 'is', null),
        fetch('/api/conversations'),
        fetch('/api/admin/team'),
      ]);
      setIsAdmin(adminRes.ok);
      const convJson = await convRes.json();
      const allConvs: { id: string; last_message_at: string }[] = convJson.conversations ?? [];
      let unreadCount = allConvs.length;
      try {
        const map: Record<string, string> = JSON.parse(localStorage.getItem('gc_conv_read_at') ?? '{}');
        unreadCount = allConvs.filter(c => !map[c.id] || new Date(c.last_message_at) > new Date(map[c.id])).length;
      } catch {}
      setCounts({
        watchlist: watchRes.count ?? 0,
        alerts: alertRes.count ?? 0,
        messages: unreadCount,
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuth(session?.user?.id ?? null, session?.user?.email ?? null, session?.user?.user_metadata?.full_name ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAuth(session?.user?.id ?? null, session?.user?.email ?? null, session?.user?.user_metadata?.full_name ?? null);
    });

    const handleConvRead = () => {
      setCounts(prev => ({ ...prev, messages: Math.max(0, prev.messages - 1) }));
    };
    const handleWatchlistChange = (e: Event) => {
      setCounts(prev => ({ ...prev, watchlist: (e as CustomEvent).detail.count }));
    };
    const handleNewMessage = () => {
      setCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
    };
    window.addEventListener('gc:conv-read', handleConvRead);
    window.addEventListener('gc:watchlist-change', handleWatchlistChange);
    window.addEventListener('gc:new-message', handleNewMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('gc:conv-read', handleConvRead);
      window.removeEventListener('gc:watchlist-change', handleWatchlistChange);
      window.removeEventListener('gc:new-message', handleNewMessage);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-zinc-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/cherry-logo.png" alt="GarageCherries" width={44} height={44} unoptimized />
            <span className="text-xl font-bold tracking-tight">
              Garage<span className="text-red-500">Cherries</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href="/listings" className="hover:text-red-400 transition-colors">Browse</Link>
            <Link href="/cars" className="hover:text-red-400 transition-colors">Car Guide</Link>
            <Link href="/guides" className="hover:text-red-400 transition-colors">Guides</Link>
            <Link href="/events" className="hover:text-red-400 transition-colors">Events</Link>
            <Link href="/dealers" className="hover:text-red-400 transition-colors">Dealers</Link>
            <Link href="/sell" className="hover:text-red-400 transition-colors">Sell</Link>
            <Link href="/pricing" className="hover:text-red-400 transition-colors">Pricing</Link>
          </nav>

          {/* Auth CTA */}
          <div className="hidden md:flex items-center gap-3">
            {auth.status === 'loading' && (
              <div className="w-20 h-8 bg-zinc-700 animate-pulse rounded-lg" />
            )}
            {auth.status === 'none' && (
              <>
                <Link href="/account/login" className="text-sm font-medium hover:text-red-400 transition-colors">
                  Sign In
                </Link>
                <Link href="/dealer/login" className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
                  Dealers
                </Link>
                <Link href="/sell" className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  Post a Listing
                </Link>
              </>
            )}
            {auth.status === 'buyer' && (
              <div className="relative" ref={dropdownRef}>
                {/* Avatar button */}
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="relative focus:outline-none"
                  title={auth.name || auth.email}
                >
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-transparent hover:ring-red-400 transition-all">
                    {(auth.name || auth.email).charAt(0).toUpperCase()}
                  </div>
                  {(counts.watchlist + counts.messages + counts.alerts) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {Math.min(counts.watchlist + counts.messages + counts.alerts, 9)}
                    </span>
                  )}
                </button>

                {/* GoDaddy-style panel */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-xl border border-zinc-200 z-50 overflow-hidden">
                    {/* Centered profile header */}
                    <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-zinc-100">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                        {(auth.name || auth.email).charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-zinc-900 text-base leading-tight text-center">{auth.name || 'My Account'}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 text-center truncate w-full">{auth.email}</p>
                    </div>

                    {/* Menu links */}
                    <div className="py-2">
                      <Link href="/account?tab=watchlist"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        <span>Watchlist</span>
                        {counts.watchlist > 0 && (
                          <span className="bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full px-2 py-0.5">{counts.watchlist}</span>
                        )}
                      </Link>
                      <Link href="/account?tab=messages"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        <span>Messages</span>
                        {counts.messages > 0 && (
                          <span className="bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full px-2 py-0.5">{counts.messages}</span>
                        )}
                      </Link>
                      <Link href="/account?tab=alerts"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        <span>Alerts</span>
                        {counts.alerts > 0 && (
                          <span className="bg-zinc-100 text-zinc-600 text-xs font-bold rounded-full px-2 py-0.5">{counts.alerts}</span>
                        )}
                      </Link>
                      <Link href="/account?tab=listings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        My Listings
                      </Link>
                      <Link href="/account?tab=settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        Settings
                      </Link>
                    </div>

                    {/* Admin link */}
                    {isAdmin && (
                      <div className="border-t border-zinc-100 py-2">
                        <Link href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 transition-colors">
                          Admin Panel
                        </Link>
                      </div>
                    )}

                    {/* Sign out */}
                    <div className="border-t border-zinc-100 py-2">
                      <button
                        onClick={() => { setDropdownOpen(false); signOut(); }}
                        className="w-full text-left px-5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {auth.status === 'dealer' && (
              <>
                <Link href="/dealer/dashboard" className="text-sm font-medium hover:text-red-400 transition-colors">
                  Dashboard
                </Link>
                <button onClick={signOut} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
                  Sign Out
                </button>
              </>
            )}
            {auth.status === 'advertiser' && (
              <>
                <Link href="/advertiser/dashboard" className="text-sm font-medium hover:text-red-400 transition-colors">
                  Ad Portal
                </Link>
                <button onClick={signOut} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-zinc-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-zinc-700 py-3 space-y-2 text-sm">
            <Link href="/listings" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Browse</Link>
            <Link href="/cars" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Car Guide</Link>
            <Link href="/guides" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Buyer's Guides</Link>
            <Link href="/events" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Car Show Calendar</Link>
            <Link href="/reports" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Market Report</Link>
            <Link href="/dealers" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Dealers</Link>
            <Link href="/sell" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Sell Your Car</Link>
            <Link href="/pricing" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/advertise" className="block py-2 hover:text-red-400" onClick={() => setMenuOpen(false)}>Advertise</Link>

            <div className="border-t border-zinc-700 pt-3 mt-2 space-y-2">
              {auth.status === 'none' && (
                <>
                  <Link href="/account/login" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link href="/dealer/login" className="block py-2 text-zinc-400 hover:text-red-400" onClick={() => setMenuOpen(false)}>Dealer Sign In</Link>
                  <Link href="/sell" className="block mt-2 bg-red-600 text-center py-2 rounded-lg font-semibold" onClick={() => setMenuOpen(false)}>Post a Listing</Link>
                </>
              )}
              {auth.status === 'buyer' && (
                <>
                  <Link href="/account?tab=watchlist" className="flex justify-between py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>
                    <span>Watchlist</span>
                    {counts.watchlist > 0 && <span className="bg-zinc-700 text-white text-xs font-bold rounded-full px-2 py-0.5">{counts.watchlist}</span>}
                  </Link>
                  <Link href="/account?tab=messages" className="flex justify-between py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>
                    <span>Messages</span>
                    {counts.messages > 0 && <span className="bg-zinc-700 text-white text-xs font-bold rounded-full px-2 py-0.5">{counts.messages}</span>}
                  </Link>
                  <Link href="/account?tab=alerts" className="flex justify-between py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>
                    <span>Alerts</span>
                    {counts.alerts > 0 && <span className="bg-zinc-700 text-white text-xs font-bold rounded-full px-2 py-0.5">{counts.alerts}</span>}
                  </Link>
                  <Link href="/account?tab=listings" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>My Listings</Link>
                  <Link href="/account?tab=settings" className="block py-2 text-zinc-400 hover:text-red-400" onClick={() => setMenuOpen(false)}>Account Settings</Link>
                  {isAdmin && (
                    <Link href="/admin" className="block py-2 text-red-500 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>Admin Panel</Link>
                  )}
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-zinc-400 hover:text-red-400 text-left w-full">Sign Out</button>
                </>
              )}
              {auth.status === 'dealer' && (
                <>
                  <Link href="/dealer/dashboard" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-zinc-400 hover:text-red-400 text-left w-full">Sign Out</button>
                </>
              )}
              {auth.status === 'advertiser' && (
                <>
                  <Link href="/advertiser/dashboard" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>Ad Portal</Link>
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-zinc-400 hover:text-red-400 text-left w-full">Sign Out</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
