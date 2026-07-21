import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1940s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1940s classic cars, from wartime production halts to the first true postwar redesigns, buying tips, and current 1940s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1940s' },
};

export default function Decade1940sPage() {
  return <DecadePage content={getDecadeContent('1940s')!} />;
}
