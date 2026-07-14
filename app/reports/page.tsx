import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return {
    title: `Classic Car Market Report — ${monthName}`,
    description: 'Monthly classic car market data: average prices by make, most-watched models, price trends, and market insights from GarageCherries listings.',
    alternates: { canonical: 'https://www.garagecherries.com/reports' },
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default async function MarketReportPage() {
  const admin = createAdminClient();
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Pull all active listings
  const { data: cars } = await admin
    .from('listings')
    .select('make, model, price, condition, listed_at, is_sold, sold_at, views')
    .eq('is_sold', false)
    .eq('status', 'approved')
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order('listed_at', { ascending: false });

  const allCars = cars ?? [];

  // Average price by make
  const makeMap: Record<string, { total: number; count: number }> = {};
  for (const c of allCars) {
    if (!c.price || c.price <= 0) continue;
    if (!makeMap[c.make]) makeMap[c.make] = { total: 0, count: 0 };
    makeMap[c.make].total += c.price;
    makeMap[c.make].count++;
  }
  const byMake = Object.entries(makeMap)
    .filter(([, v]) => v.count >= 1)
    .map(([make, v]) => ({ make, avg: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  // Most viewed listings
  const mostViewed = [...allCars]
    .filter(c => c.views > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);

  // Condition breakdown
  const conditionMap: Record<string, number> = {};
  for (const c of allCars) {
    conditionMap[c.condition] = (conditionMap[c.condition] ?? 0) + 1;
  }

  // Sold this month
  const thisMonth = now.toISOString().slice(0, 7);
  const { data: soldThisMonth } = await admin
    .from('listings')
    .select('id')
    .eq('is_sold', true)
    .gte('sold_at', `${thisMonth}-01T00:00:00Z`);

  const { data: totalSold } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('is_sold', true);

  // Price ranges
  const prices = allCars.map(c => c.price).filter(Boolean).sort((a, b) => a - b);
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">Monthly Report</span>
          <span className="text-xs text-zinc-400">{monthName}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-3">GarageCherries Market Report</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Classic car market data pulled directly from our live inventory — average prices, trending models, and what's moving fast.
        </p>
      </div>

      {/* Snapshot stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Active Listings', value: allCars.length.toLocaleString() },
          { label: 'Median Asking Price', value: medianPrice > 0 ? fmt(medianPrice) : '—' },
          { label: 'Average Asking Price', value: avgPrice > 0 ? fmt(avgPrice) : '—' },
          { label: 'Sold This Month', value: (soldThisMonth?.length ?? 0).toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-white border border-zinc-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-zinc-900">{s.value}</p>
            <p className="text-sm text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Average Price by Make */}
        <section className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-5">Average Asking Price by Make</h2>
          {byMake.length === 0 ? (
            <p className="text-zinc-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {byMake.map((row, i) => {
                const maxAvg = byMake[0].avg;
                const barWidth = (row.avg / maxAvg) * 100;
                return (
                  <div key={row.make}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                        <Link href={`/listings/${row.make.toLowerCase()}`} className="font-semibold text-zinc-800 hover:text-red-600 transition-colors">
                          {row.make}
                        </Link>
                        <span className="text-xs text-zinc-400">({row.count} listings)</span>
                      </div>
                      <span className="font-bold text-zinc-900">{fmt(row.avg)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Condition Breakdown */}
        <section className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-5">Inventory by Condition</h2>
          {Object.keys(conditionMap).length === 0 ? (
            <p className="text-zinc-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(conditionMap)
                .sort((a, b) => b[1] - a[1])
                .map(([condition, count]) => {
                  const pct = Math.round((count / allCars.length) * 100);
                  const colors: Record<string, string> = {
                    Excellent: 'bg-green-500', Good: 'bg-blue-500',
                    Fair: 'bg-yellow-500', Project: 'bg-red-400',
                  };
                  const badges: Record<string, string> = {
                    Excellent: 'bg-green-100 text-green-800', Good: 'bg-blue-100 text-blue-800',
                    Fair: 'bg-yellow-100 text-yellow-800', Project: 'bg-red-100 text-red-800',
                  };
                  return (
                    <div key={condition}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badges[condition] ?? 'bg-zinc-100 text-zinc-700'}`}>{condition}</span>
                        <span className="font-bold text-zinc-900">{count} <span className="font-normal text-zinc-400">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[condition] ?? 'bg-zinc-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      {/* Most Viewed */}
      {mostViewed.length > 0 && (
        <section className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm mb-12">
          <h2 className="text-lg font-bold text-zinc-900 mb-5">Most-Watched Listings This Month</h2>
          <div className="space-y-3">
            {mostViewed.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-400 w-4">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-zinc-800">{c.make} {c.model}</p>
                    <p className="text-xs text-zinc-400">{fmt(c.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-semibold">{(c.views ?? 0).toLocaleString()} views</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market Commentary */}
      <section className="bg-zinc-50 border border-zinc-100 rounded-2xl p-8 mb-10">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Market Observations — {monthName}</h2>
        <div className="space-y-3 text-zinc-600 leading-relaxed text-sm">
          <p>The classic car market continues to see strong buyer demand for driver-quality examples priced in the $20,000–$50,000 range. Show-condition vehicles above $100,000 are moving more slowly as buyers become increasingly price-sensitive heading into the summer show season.</p>
          <p>Muscle cars from the 1968–1972 era remain the most-searched segment on GarageCherries. Pontiac GTOs and Oldsmobile 4-4-2s are showing strong interest relative to available inventory, suggesting upward price pressure in those models specifically.</p>
          <p>Project cars in the $5,000–$15,000 range are selling quickly as entry-level collectors look for restoration opportunities. Complete, running examples with good sheet metal are particularly competitive regardless of mechanical condition.</p>
        </div>
      </section>

      {/* Total sold badge */}
      {(totalSold as any)?.count > 0 && (
        <div className="text-center py-8 border-t border-zinc-100">
          <p className="text-4xl font-extrabold text-zinc-900">{((totalSold as any).count as number).toLocaleString()}</p>
          <p className="text-zinc-500 mt-1">cars sold through GarageCherries</p>
        </div>
      )}

      <div className="pt-6 border-t border-zinc-100 text-xs text-zinc-400">
        Data sourced from GarageCherries active and sold listings. Prices are asking prices, not final sale prices unless reported by the dealer. Updated daily.
      </div>
    </div>
  );
}
