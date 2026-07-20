import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Advertiser Directory — Classic Car Services',
  description: 'Discover trusted classic car services on GarageCherries — insurance, financing, detailing, restoration, transport, and more.',
  alternates: { canonical: 'https://www.garagecherries.com/advertisers' },
};

const CATEGORY_LABELS: Record<string, string> = {
  detail: 'Auto Detailing',
  insurance: 'Classic Car Insurance',
  finance: 'Financing',
  transport: 'Transport & Shipping',
  storage: 'Storage',
  restoration: 'Restoration',
  inspection: 'Pre-Purchase Inspection',
  other: 'Local Service',
};

const CATEGORY_ICONS: Record<string, string> = {
  detail: '✨',
  insurance: '🛡️',
  finance: '💰',
  transport: '🚚',
  storage: '🏪',
  restoration: '🔧',
  inspection: '🔍',
  other: '⭐',
};

export default async function AdvertisersPage() {
  const supabase = await createClient();
  const { data: advertisers } = await supabase
    .from('advertisers')
    .select('id, slug, business_name, city, state, category, tier, description, website')
    .eq('active', true)
    .gt('trial_ends_at', new Date().toISOString())
    .order('business_name', { ascending: true });

  const grouped = (advertisers ?? []).reduce<Record<string, typeof advertisers>>((acc, a) => {
    const cat = a!.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Advertiser Directory</h1>
        <p className="text-zinc-500">Trusted classic car services — insurance, financing, restoration, transport, and more.</p>
      </div>

      {Object.keys(CATEGORY_LABELS).filter(cat => grouped[cat]?.length).map(cat => (
        <section key={cat} className="mb-12">
          <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
            <span>{CATEGORY_ICONS[cat]}</span>
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {grouped[cat]!.map(a => (
              <Link
                key={a!.id}
                href={`/advertisers/${a!.slug}`}
                className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm hover:border-red-300 hover:shadow-md transition-all group"
              >
                <p className="font-bold text-zinc-900 group-hover:text-red-600 mb-1">{a!.business_name}</p>
                {(a!.city || a!.state) && (
                  <p className="text-zinc-400 text-sm mb-2">📍 {[a!.city, a!.state].filter(Boolean).join(', ')}</p>
                )}
                {a!.description && (
                  <p className="text-zinc-500 text-sm line-clamp-2">{a!.description}</p>
                )}
                <span className="inline-block mt-3 text-xs font-semibold text-red-600 group-hover:underline">View profile →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {(!advertisers || advertisers.length === 0) && (
        <div className="text-center py-24">
          <p className="text-zinc-400 text-lg mb-4">No advertisers yet.</p>
          <Link href="/advertise" className="text-red-600 hover:underline font-medium">Advertise your business →</Link>
        </div>
      )}

      <div className="mt-12 bg-red-50 border border-red-100 rounded-2xl px-8 py-6 text-center">
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Advertise Your Business</h2>
        <p className="text-zinc-500 text-sm mb-4">Reach classic car enthusiasts worldwide.</p>
        <Link href="/advertise" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
          Get started
        </Link>
      </div>
    </div>
  );
}
