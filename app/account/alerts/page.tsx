import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import AlertActions from '@/components/AlertActions';

export const metadata = { title: 'Car Alerts — GarageCherries' };

function describeSearch(s: any): string {
  const parts: string[] = [];
  if (s.make && s.make !== 'All Makes') parts.push(s.make);
  if (s.model) parts.push(s.model);
  if (s.year_min && s.year_max) parts.push(`${s.year_min}–${s.year_max}`);
  else if (s.year_min) parts.push(`${s.year_min}+`);
  else if (s.year_max) parts.push(`up to ${s.year_max}`);
  if (s.price_max) parts.push(`under $${Number(s.price_max).toLocaleString()}`);
  if (s.mileage_max) parts.push(`under ${Number(s.mileage_max).toLocaleString()} mi`);
  if (s.condition?.length) parts.push(s.condition.join(' or '));
  if (s.transmission) parts.push(s.transmission);
  if (s.body_style) parts.push(s.body_style);
  if (s.state) parts.push(s.state);
  return parts.join(' · ') || 'Any car';
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ pause?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/account/login?return=/account/alerts');

  const { pause } = await searchParams;

  if (pause) {
    await supabase
      .from('saved_searches')
      .update({ paused: true })
      .eq('id', pause)
      .eq('user_id', user.id);
  }

  const { data: searches } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const admin = createAdminClient();
  const ids = (searches ?? []).map((s: any) => s.id);
  const { data: matchRows } = ids.length
    ? await admin.from('alert_matches').select('saved_search_id').in('saved_search_id', ids)
    : { data: [] };

  const matchCounts: Record<string, number> = {};
  for (const m of matchRows ?? []) {
    matchCounts[m.saved_search_id] = (matchCounts[m.saved_search_id] ?? 0) + 1;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Car Alerts</h1>
          <p className="text-zinc-500 text-sm mt-1">Get emailed when a matching car lists</p>
        </div>
        <Link
          href="/listings"
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          + New Alert
        </Link>
      </div>

      {(!searches || searches.length === 0) ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-4">🔔</p>
          <h3 className="text-lg font-bold text-zinc-800 mb-2">No alerts yet</h3>
          <p className="text-zinc-500 text-sm mb-6">
            Browse listings, set your filters, then click "Notify me when a match lists."
          </p>
          <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
            Browse Listings
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {searches.map((s: any) => {
            const count = matchCounts[s.id] ?? 0;
            const lastMatch = s.last_matched_at
              ? new Date(s.last_matched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : null;

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-lg">🔔</span>
                      <h3 className="font-bold text-zinc-900">{s.name || describeSearch(s)}</h3>
                      {s.paused && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Paused</span>
                      )}
                    </div>
                    {s.name && (
                      <p className="text-sm text-zinc-500 ml-7">{describeSearch(s)}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 ml-7 text-xs text-zinc-400">
                      <span>{count > 0 ? `${count} car${count !== 1 ? 's' : ''} matched` : 'No matches yet'}</span>
                      {lastMatch && <span>· Last match {lastMatch}</span>}
                    </div>
                  </div>
                  <AlertActions id={s.id} paused={s.paused} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center mt-6">
        Max 10 alerts per account · {searches?.length ?? 0}/10 used
      </p>

      <div className="mt-4 text-center">
        <Link href="/account/watchlist" className="text-sm text-zinc-500 hover:text-red-600">
          ← Back to Watchlist
        </Link>
      </div>
    </div>
  );
}
