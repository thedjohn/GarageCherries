import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1990s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1990s performance icons, from the Supra Turbo to the Viper, buying tips for modern classics, and current 1990s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1990s' },
};

export default function Decade1990sPage() {
  return <DecadePage content={getDecadeContent('1990s')!} />;
}
