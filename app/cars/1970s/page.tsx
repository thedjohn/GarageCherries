import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1970s Classic Cars — History, Notable Models & Buying Guide',
  description: "The history of 1970s muscle cars, from peak horsepower to the emissions-era slowdown, buying tips, and current 1970s listings for sale.",
  alternates: { canonical: 'https://www.garagecherries.com/cars/1970s' },
};

export default function Decade1970sPage() {
  return <DecadePage content={getDecadeContent('1970s')!} />;
}
