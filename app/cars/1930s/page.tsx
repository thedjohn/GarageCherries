import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1930s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1930s pre-war classics, notable coachbuilt models, buying tips for cars of the era, and current 1930s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1930s' },
};

export default async function Decade1930sPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <DecadePage content={getDecadeContent('1930s')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
