'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Counts { watchlist: number; messages: number; alerts: number }

function AccountTabBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState<Counts>({ watchlist: 0, messages: 0, alerts: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [watchRes, alertRes, convRes] = await Promise.all([
        supabase.from('watchlists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        fetch('/api/conversations'),
      ]);
      const convJson = await convRes.json();
      setCounts({
        watchlist: watchRes.count ?? 0,
        alerts: alertRes.count ?? 0,
        messages: convJson.conversations?.length ?? 0,
      });
    });

    const onWatchlistChange = (e: Event) => {
      setCounts(c => ({ ...c, watchlist: (e as CustomEvent).detail.count }));
    };
    window.addEventListener('gc:watchlist-change', onWatchlistChange);
    return () => window.removeEventListener('gc:watchlist-change', onWatchlistChange);
  }, []);

  // Determine active tab from URL
  const getActiveTab = () => {
    if (pathname.startsWith('/messages')) return 'messages';
    if (pathname === '/account') {
      const tab = searchParams.get('tab');
      return tab || 'watchlist';
    }
    return null;
  };
  const activeTab = getActiveTab();

  const tabs = [
    { key: 'watchlist', label: 'Watchlist', href: '/account?tab=watchlist', count: counts.watchlist },
    { key: 'messages', label: 'Messages', href: '/account?tab=messages', count: counts.messages },
    { key: 'alerts', label: 'Alerts', href: '/account?tab=alerts', count: counts.alerts },
    { key: 'settings', label: 'Settings', href: '/account?tab=settings', count: 0 },
  ];

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 pt-4 pb-1 text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/account?tab=watchlist" className="hover:text-zinc-600 transition-colors">My Account</Link>
          {pathname.startsWith('/messages') && (
            <>
              <span>/</span>
              <span className="text-zinc-600">Messages</span>
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px">
          {tabs.map(t => {
            const isActive = activeTab === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    isActive ? 'bg-red-100 text-red-600' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {t.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AccountTabBar() {
  return (
    <Suspense fallback={null}>
      <AccountTabBarInner />
    </Suspense>
  );
}
