import { Metadata } from 'next';
import DecadePage from '@/components/DecadePage';
import { getDecadeContent } from '@/lib/decades';

export const metadata: Metadata = {
  title: '1960s Classic Cars — History, Notable Models & Buying Guide',
  description: 'The history of 1960s muscle cars and the birth of the pony car, notable models from the GTO to the Mustang, buying tips, and current 1960s listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/1960s' },
};

export default async function Decade1960sPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <DecadePage content={getDecadeContent('1960s')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
