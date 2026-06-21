'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AdCard from '@/components/AdCard';

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter · 15-mile radius',
  metro: 'Metro · 30-mile radius',
  regional: 'Regional · 60-mile radius',
  statewide: 'Statewide',
};

const CATEGORY_LABELS: Record<string, string> = {
  detail: 'Auto Detailing', insurance: 'Classic Car Insurance',
  finance: 'Financing', transport: 'Transport & Shipping',
  storage: 'Storage', restoration: 'Restoration',
  inspection: 'Pre-Purchase Inspection', other: 'Local Service',
};

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get('welcome') === '1';

  const [advertiser, setAdvertiser] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/advertiser/login'); return; }
    });

    fetch('/api/advertiser/ads')
      .then(r => {
        if (r.status === 401) { router.push('/advertiser/login'); return null; }
        if (r.status === 403) { setError('No advertiser account found.'); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setAdvertiser(data.advertiser);
        setAds(data.ads ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/advertise');
  };

  const activeAd = ads.find(a => a.active);
  const totalImpressions = ads.reduce((s: number, a: any) => s + (a.impressions ?? 0), 0);
  const totalClicks = ads.reduce((s: number, a: any) => s + (a.clicks ?? 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const toggleAd = async (adId: string, active: boolean) => {
    await fetch('/api/advertiser/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adId, active }),
    });
    setAds(prev => prev.map(a => a.id === adId ? { ...a, active } : a));
  };

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
      <div>
        <p className="text-zinc-500 mb-4">{error}</p>
        <Link href="/advertise" className="text-red-600 hover:underline">Create an account</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {welcome && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-bold text-green-800">Welcome! Your 14-day free trial has started.</p>
            <p className="text-sm text-green-600">Create your first ad to start reaching car buyers in your area.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">{advertiser?.business_name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {TIER_LABELS[advertiser?.tier] ?? advertiser?.tier}
            {advertiser?.city && ` · ${advertiser.city}, ${advertiser?.state}`}
          </p>
          {advertiser?.trial_ends_at && new Date(advertiser.trial_ends_at) > new Date() && (
            <p className="text-xs text-amber-600 font-semibold mt-1">
              Free trial ends {new Date(advertiser.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
        <button onClick={signOut} className="text-sm text-zinc-400 hover:text-red-600 transition-colors">
          Sign Out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString(), note: 'all time' },
          { label: 'Clicks', value: totalClicks.toLocaleString(), note: 'all time' },
          { label: 'Click-Through Rate', value: `${ctr}%`, note: `avg 2.1%` },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 text-center">
            <p className="text-2xl font-extrabold text-zinc-900">{stat.value}</p>
            <p className="text-sm font-semibold text-zinc-600 mt-1">{stat.label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* Ads */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-zinc-900">Your Ads</h2>
        <Link
          href="/advertiser/ads/edit"
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          {ads.length ? 'Edit Ad' : '+ Create Ad'}
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-4">📢</p>
          <h3 className="text-lg font-bold text-zinc-800 mb-2">No ads yet</h3>
          <p className="text-zinc-500 text-sm mb-6">Create your first ad to start reaching classic car buyers.</p>
          <Link href="/advertiser/ads/edit" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
            Create Ad
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ads.map(ad => (
            <div key={ad.id} className="space-y-3">
              <AdCard ad={{ ...ad, business_name: advertiser?.business_name, city: advertiser?.city, state: advertiser?.state, category: advertiser?.category }} />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{(ad.impressions ?? 0).toLocaleString()} impressions</span>
                  <span>{(ad.clicks ?? 0).toLocaleString()} clicks</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAd(ad.id, !ad.active)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${ad.active ? 'border-green-200 text-green-700 bg-green-50' : 'border-zinc-200 text-zinc-500'}`}
                  >
                    {ad.active ? 'Active' : 'Paused'}
                  </button>
                  <Link href={`/advertiser/ads/edit?id=${ad.id}`} className="text-xs font-semibold text-zinc-500 hover:text-red-600 border border-zinc-200 px-3 py-1 rounded-lg transition-colors">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Account</h2>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Plan</span><span className="font-semibold">{TIER_LABELS[advertiser?.tier] ?? advertiser?.tier}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Category</span><span className="font-semibold">{CATEGORY_LABELS[advertiser?.category] ?? advertiser?.category}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Coverage</span><span className="font-semibold">{advertiser?.city}, {advertiser?.state}</span></div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
            <span className="text-zinc-400 text-xs">Want to upgrade your plan or update billing?</span>
            <a href="mailto:ads@garagecherries.com" className="text-xs text-red-600 hover:underline">Contact us</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdvertiserDashboard() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
