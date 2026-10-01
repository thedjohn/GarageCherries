import { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import ImageGallery from '@/components/ImageGallery';
import BuildViewTracker from '@/components/BuildViewTracker';

export const revalidate = 0;

interface GarageMod {
  description: string;
  installed_at?: string;
}

interface Build {
  id: string; year: number; make: string; model: string; trim: string | null;
  nickname: string | null; mileage: number | null; notes: string | null;
  images: string[]; mods: GarageMod[]; slug: string;
}

const getBuild = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from('garage_vehicles')
    .select('id,year,make,model,trim,nickname,mileage,notes,images,mods,slug')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();
  return data as Build | null;
});

function buildTitle(b: Build) {
  return `${b.year} ${b.make} ${b.model}${b.trim ? ` ${b.trim}` : ''}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const build = await getBuild(slug);
  if (!build) return { title: 'Build Not Found' };

  const title = `${buildTitle(build)} Build`;
  const description = build.notes
    ? build.notes.slice(0, 160)
    : `A ${buildTitle(build)} with ${build.mods.length} modification${build.mods.length === 1 ? '' : 's'}, shared on GarageCherries.`;
  const canonical = `https://www.garagecherries.com/build/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(build.images[0] ? { images: [{ url: build.images[0], width: 1200, height: 800, alt: title }] } : {}),
    },
  };
}

export default async function BuildProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const build = await getBuild(slug);
  if (!build) notFound();

  const title = buildTitle(build);
  const admin = createAdminClient();
  const { count: viewCount } = await admin
    .from('build_views').select('id', { count: 'exact', head: true }).eq('build_id', build.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: title,
    brand: build.make,
    model: build.model,
    vehicleModelDate: String(build.year),
    ...(build.mileage != null ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: build.mileage, unitCode: 'SMI' } } : {}),
    ...(build.images[0] ? { image: build.images[0] } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BuildViewTracker buildId={build.id} />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600 transition-colors mb-8">
          ← GarageCherries
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest">Build Profile</p>
          {!!viewCount && <p className="text-xs text-zinc-400">· {viewCount.toLocaleString()} view{viewCount === 1 ? '' : 's'}</p>}
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-2 leading-tight">
          {build.nickname || title}
        </h1>
        {build.nickname && <p className="text-zinc-500 mb-6">{title}</p>}
        {!build.nickname && <div className="mb-6" />}

        {build.images.length > 0 ? (
          <ImageGallery images={build.images} title={title} />
        ) : (
          <div className="h-72 md:h-[480px] rounded-2xl bg-zinc-100 flex items-center justify-center mb-2">
            <span className="text-6xl text-zinc-300">🚗</span>
          </div>
        )}

        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 mt-6 mb-6">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold">Year</p>
              <p className="font-bold text-zinc-900">{build.year}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold">Make</p>
              <p className="font-bold text-zinc-900">{build.make}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold">Model</p>
              <p className="font-bold text-zinc-900">{build.model}{build.trim ? ` ${build.trim}` : ''}</p>
            </div>
            {build.mileage != null && (
              <div>
                <p className="text-xs text-zinc-400 uppercase font-semibold">Mileage</p>
                <p className="font-bold text-zinc-900">{build.mileage.toLocaleString()} mi</p>
              </div>
            )}
          </div>
        </div>

        {build.notes && (
          <div className="bg-zinc-50 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3">The Story</h2>
            <p className="text-zinc-700 leading-relaxed whitespace-pre-line">{build.notes}</p>
          </div>
        )}

        {build.mods.length > 0 && (
          <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Modifications</h2>
            <ul className="space-y-2">
              {build.mods.map((mod, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{mod.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 text-xs text-zinc-400 text-center">
          Shared from a GarageCherries member's garage.{' '}
          <Link href="/" className="text-red-600 hover:underline">Browse more at GarageCherries.com →</Link>
        </p>
      </div>
    </>
  );
}
