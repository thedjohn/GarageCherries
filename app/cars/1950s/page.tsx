import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1950s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1950s tailfin-and-chrome classics, notable models like the Corvette and Thunderbird, buying tips, and current 1950s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1950s' },
};

export default function Decade1950sPage() {
  return <DecadePage content={getDecadeContent('1950s')!} />;
}
