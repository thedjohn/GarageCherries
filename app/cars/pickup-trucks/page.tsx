import { Metadata } from 'next';
import BodyStylePage from '@/components/BodyStylePage';
import { getBodyStyleContent } from '@/lib/bodyStyles';

export const metadata: Metadata = {
  title: 'Classic Pickup Trucks — History, Notable Models & Buying Guide',
  description: 'The history of the classic American pickup, notable models from the C10 to the F-100, buying tips for collector trucks, and current pickup truck listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/pickup-trucks' },
};

export default function PickupTrucksPage() {
  return <BodyStylePage content={getBodyStyleContent('pickup-trucks')!} />;
}
