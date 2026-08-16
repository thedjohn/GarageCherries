import { Metadata } from 'next';
import Link from 'next/link';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import Pagination from '@/components/Pagination';
import { formatListingPrice, toSegment } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/server';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Vehicle Video Tours',
  description: 'Watch short video walkarounds of classic, muscle, and collector cars for sale on GarageCherries.',
  alternates: { canonical: 'https://www.garagecherries.com/videos' },
};

const PAGE_SIZE = 24; // 8 rows at the 3-column (lg) breakpoint

interface VideoCar {
  id: string; slug: string; title: string; year: number;
  make: string; model: string; price: number; youtube_video_id: string;
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function VideosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const admin = createAdminClient();
  const { data, count } = await admin
    .from('listings')
    .select('id, slug, title, year, make, model, price, youtube_video_id', { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_sold', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .not('youtube_video_id', 'is', null)
    // Secondary key needed for stable pagination -- same reasoning as /listings.
    .order('youtube_posted_at', { ascending: false }).order('id', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const cars: VideoCar[] = data ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Vehicle Video Tours</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Short video walkarounds of cars currently for sale on GarageCherries. Click a thumbnail to watch.
        </p>
      </div>

      {cars.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🎬</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No videos yet</h2>
          <p className="text-zinc-500 text-sm mb-6">Check back soon — video tours will appear here as they&apos;re posted.</p>
          <Link href="/listings" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
            Browse Available Cars →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400 mb-6">{totalCount.toLocaleString()} video{totalCount !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {cars.map(car => (
              <VideoCard key={car.id} car={car} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/videos" searchParams={sp} />
        </>
      )}
    </div>
  );
}

function VideoCard({ car }: { car: VideoCar }) {
  const href = `/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
      <YouTubeEmbed videoId={car.youtube_video_id} title={car.title} />
      <div className="p-4">
        <Link href={href} className="font-bold text-zinc-900 hover:text-red-600 transition-colors line-clamp-1 block">
          {car.title}
        </Link>
        <p className="text-sm text-zinc-500 mt-0.5">{formatListingPrice(car.price)}</p>
      </div>
    </div>
  );
}
