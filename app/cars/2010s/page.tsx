import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '2010s Classic Cars — History, Notable Models & Buying Guide',
  description: "Modern performance icons bought today as tomorrow's classics, buying tips, and current 2010s listings for sale.",
  alternates: { canonical: 'https://www.garagecherries.com/cars/2010s' },
};

export default function Decade2010sPage() {
  return <DecadePage content={getDecadeContent('2010s')!} />;
}
