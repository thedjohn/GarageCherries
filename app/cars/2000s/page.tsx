import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '2000s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The first wave of 21st-century collectibles, notable models from this era, buying tips, and current 2000s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/2000s' },
};

export default async function Decade2000sPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <DecadePage content={getDecadeContent('2000s')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
