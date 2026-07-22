import { Metadata } from 'next';
import BodyStylePage from '@/components/BodyStylePage';
import { getBodyStyleContent } from '@/lib/bodyStyles';

export const metadata: Metadata = {
  title: 'Classic Pickup Trucks — History, Notable Models & Buying Guide',
  description: 'The history of the classic American pickup, notable models from the C10 to the F-100, buying tips for collector trucks, and current pickup truck listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/pickup-trucks' },
};

export default async function PickupTrucksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <BodyStylePage content={getBodyStyleContent('pickup-trucks')!} page={Math.max(1, parseInt(page ?? '1', 10) || 1)} />;
}
