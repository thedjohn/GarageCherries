import { Metadata } from 'next';
import PriceTierPage from '@/components/PriceTierPage';
import { getPriceTierContent } from '@/lib/priceTiers';

export const metadata: Metadata = {
  title: 'Classic Cars $10,000–$25,000 — Buying Guide & Listings',
  description: 'Solid weekend-driver classics from $10,000 to $25,000 — what to expect at this price point, buying tips, and current listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/10k-to-25k' },
};

export default async function TenToTwentyFiveKPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <PriceTierPage content={getPriceTierContent('10k-to-25k')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
