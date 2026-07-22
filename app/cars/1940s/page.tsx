import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1940s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1940s classic cars, from wartime production halts to the first true postwar redesigns, buying tips, and current 1940s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1940s' },
};

export default async function Decade1940sPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <DecadePage content={getDecadeContent('1940s')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
