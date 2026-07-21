import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '2000s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The first wave of 21st-century collectibles, notable models from this era, buying tips, and current 2000s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/2000s' },
};

export default function Decade2000sPage() {
  return <DecadePage content={getDecadeContent('2000s')!} />;
}
