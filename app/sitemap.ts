import { MetadataRoute } from 'next';
<<<<<<< HEAD
import { createAdminClient } from '@/lib/supabase/server';
import { toSegment } from '@/lib/data';

export const revalidate = 3600; // Regenerate once per hour
=======
import { CARS, DEALERS, toSegment } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/server';
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)

const BASE_URL = 'https://www.garagecherries.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

<<<<<<< HEAD
  const [{ data: cars }, { data: dealers }] = await Promise.all([
    supabase.from('listings').select('id, slug, make, model, featured, listed_at, created_at'),
    supabase.from('dealers').select('slug, created_at'),
  ]);
=======
  const { data: dbListings } = await supabase
    .from('listings')
    .select('slug, make, model, updated_at, listed_at')
    .eq('status', 'active');

  const { data: dbDealers } = await supabase
    .from('dealers')
    .select('slug, updated_at');
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/dealers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/sell`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

<<<<<<< HEAD
  const listingPages: MetadataRoute.Sitemap = (cars ?? []).map(car => ({
    url: `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`,
    lastModified: new Date(car.created_at ?? car.listed_at ?? new Date()),
=======
  // Mock car listings
  const mockListingPages: MetadataRoute.Sitemap = CARS.map(car => ({
    url: `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`,
    lastModified: new Date(car.listedAt),
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
    changeFrequency: 'weekly' as const,
    priority: car.featured ? 0.9 : 0.8,
  }));

<<<<<<< HEAD
  // Make pages derived from live inventory
  const makes = [...new Set((cars ?? []).map(c => c.make))];
=======
  // Supabase listings
  const dbListingPages: MetadataRoute.Sitemap = (dbListings ?? []).map(l => ({
    url: `${BASE_URL}/listings/${toSegment(l.make)}/${toSegment(l.model)}/${l.slug}`,
    lastModified: new Date(l.updated_at ?? l.listed_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Make pages
  const makes = [...new Set(CARS.map(c => c.make))];
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
  const makePages: MetadataRoute.Sitemap = makes.map(make => ({
    url: `${BASE_URL}/listings/${toSegment(make)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

<<<<<<< HEAD
  const dealerPages: MetadataRoute.Sitemap = (dealers ?? []).map(d => ({
    url: `${BASE_URL}/dealers/${d.slug}`,
    lastModified: new Date(d.created_at ?? new Date()),
=======
  // Mock dealer pages
  const mockDealerPages: MetadataRoute.Sitemap = DEALERS.map(d => ({
    url: `${BASE_URL}/dealers/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Supabase dealer pages
  const dbDealerPages: MetadataRoute.Sitemap = (dbDealers ?? []).map(d => ({
    url: `${BASE_URL}/dealers/${d.slug}`,
    lastModified: new Date(d.updated_at ?? new Date()),
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
<<<<<<< HEAD
    ...listingPages,
    ...makePages,
    ...dealerPages,
=======
    ...mockListingPages,
    ...dbListingPages,
    ...makePages,
    ...mockDealerPages,
    ...dbDealerPages,
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
  ];
}
