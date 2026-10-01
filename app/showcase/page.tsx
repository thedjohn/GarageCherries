import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import BuildCard, { type ShowcaseBuild } from '@/components/BuildCard';
import Pagination from '@/components/Pagination';

export const revalidate = 0;
const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: 'Showcase — Community Builds',
  description: 'Browse classic, muscle, and collector car builds shared by the GarageCherries community.',
  alternates: { canonical: 'https://www.garagecherries.com/showcase' },
};

interface FeaturedRow {
  featured_date: string;
  blurb: string | null;
  garage_vehicles: ShowcaseBuild | null;
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ShowcasePage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: featuredData } = await admin
    .from('featured_builds')
    .select('featured_date, blurb, garage_vehicles(year, make, model, trim, nickname, mileage, images, mods, slug)')
    .eq('featured_date', today)
    .maybeSingle();
  const featured = (featuredData as unknown as FeaturedRow | null)?.garage_vehicles ?? null;

  const { data: builds, count } = await admin
    .from('garage_vehicles')
    .select('year, make, model, trim, nickname, mileage, images, mods, slug', { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Showcase</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Builds shared by the GarageCherries community — browse what people are driving, restoring, and showing off.
        </p>
      </div>

      {featured && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Featured Build</h2>
          <div className="max-w-sm">
            <BuildCard build={featured} highlight />
          </div>
        </div>
      )}

      {(builds ?? []).length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🍒</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No public builds yet</h2>
          <p className="text-zinc-500 text-sm">Add a car to your garage and make it public to be the first one here.</p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">All Builds</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(builds ?? []).map((b, i) => <BuildCard key={b.slug ?? i} build={b as ShowcaseBuild} />)}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/showcase" searchParams={sp} />
        </>
      )}
    </div>
  );
}
