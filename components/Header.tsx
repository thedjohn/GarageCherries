'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'dealer' }
  | { status: 'advertiser' }
  | { status: 'buyer'; email: string };

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function resolveAuth(userId: string | null, email: string | null) {
      if (!userId) { setAuth({ status: 'none' }); return; }
      const [{ data: dealer }, { data: advertiser }] = await Promise.all([
        supabase.from('dealers').select('id').eq('id', userId).single(),
        supabase.from('advertisers').select('id').eq('user_id', userId).single(),
      ]);
      if (dealer) { setAuth({ status: 'dealer' }); return; }
      if (advertiser) { setAuth({ status: 'advertiser' }); return; }
      setAuth({ status: 'buyer', email: email ?? '' });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuth(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAuth(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
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
            <span className="text-2xl">🍒</span>
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
              <>
                <Link href="/account/watchlist" className="text-sm font-medium hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Watchlist
                </Link>
                <Link href="/account/alerts" className="text-sm font-medium hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Alerts
                </Link>
                <Link href="/account/profile" className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
                  Account
                </Link>
                <button onClick={signOut} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
                  Sign Out
                </button>
              </>
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
                  <Link href="/account/watchlist" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>My Watchlist</Link>
                  <Link href="/account/alerts" className="block py-2 font-semibold hover:text-red-400" onClick={() => setMenuOpen(false)}>Car Alerts</Link>
                  <Link href="/account/profile" className="block py-2 text-zinc-400 hover:text-red-400" onClick={() => setMenuOpen(false)}>Account Settings</Link>
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
