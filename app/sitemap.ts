import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { toSegment } from '@/lib/data';

export const revalidate = 3600;

const BASE_URL = 'https://www.garagecherries.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [{ data: cars }, { data: dealers }] = await Promise.all([
    supabase.from('listings').select('id, slug, make, model, featured, listed_at, created_at'),
    supabase.from('dealers').select('slug, created_at'),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/dealers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/sell`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  const listingPages: MetadataRoute.Sitemap = (cars ?? []).map(car => ({
    url: `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`,
    lastModified: new Date(car.created_at ?? car.listed_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: car.featured ? 0.9 : 0.8,
  }));

  const makes = [...new Set((cars ?? []).map(c => c.make))];
  const makePages: MetadataRoute.Sitemap = makes.map(make => ({
    url: `${BASE_URL}/listings/${toSegment(make)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const dealerPages: MetadataRoute.Sitemap = (dealers ?? []).map(d => ({
    url: `${BASE_URL}/dealers/${d.slug}`,
    lastModified: new Date(d.created_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...listingPages,
    ...makePages,
    ...dealerPages,
  ];
}
