import { Metadata } from 'next';
import PriceTierPage from '@/components/PriceTierPage';
import { getPriceTierContent } from '@/lib/priceTiers';

export const metadata: Metadata = {
  title: 'Classic Cars $50,000 and Up — Buying Guide & Listings',
  description: 'Investment-grade and rare classics $50,000 and up — what to expect at this price point, buying tips, and current listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/50k-plus' },
};

export default async function FiftyKPlusPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <PriceTierPage content={getPriceTierContent('50k-plus')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
