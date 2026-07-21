import { Metadata } from 'next';
import PriceTierPage from '@/components/PriceTierPage';
import { getPriceTierContent } from '@/lib/priceTiers';

export const metadata: Metadata = {
  title: 'Classic Cars $25,000–$50,000 — Buying Guide & Listings',
  description: 'Show-quality and documented classics from $25,000 to $50,000 — what to expect at this price point, buying tips, and current listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/25k-to-50k' },
};

export default function TwentyFiveToFiftyKPage() {
  return <PriceTierPage content={getPriceTierContent('25k-to-50k')!} />;
}
