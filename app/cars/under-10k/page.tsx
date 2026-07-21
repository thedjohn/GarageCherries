import { Metadata } from 'next';
import PriceTierPage from '@/components/PriceTierPage';
import { getPriceTierContent } from '@/lib/priceTiers';

export const metadata: Metadata = {
  title: 'Classic Cars Under $10,000 — Buying Guide & Listings',
  description: 'Project cars and driver-quality classics under $10,000 — what to expect at this price point, buying tips, and current listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/under-10k' },
};

export default function UnderTenKPage() {
  return <PriceTierPage content={getPriceTierContent('under-10k')!} />;
}
