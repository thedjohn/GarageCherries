import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1980s Classic Cars — History, Notable Models & Buying Guide',
  description: "The history of 1980s performance cars, from the Grand National to the 5.0 Mustang, buying tips, and current 1980s listings for sale.",
  alternates: { canonical: 'https://www.garagecherries.com/cars/1980s' },
};

export default function Decade1980sPage() {
  return <DecadePage content={getDecadeContent('1980s')!} />;
}
