import { Metadata } from 'next';
import BodyStylePage from '@/components/BodyStylePage';
import { getBodyStyleContent } from '@/lib/bodyStyles';

export const metadata: Metadata = {
  title: 'Classic Coupes — History, Notable Models & Buying Guide',
  description: 'The history of the American muscle car coupe, notable models from the GTO to the Charger, buying tips for two-door classics, and current coupe listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/coupes' },
};

export default function CoupesPage() {
  return <BodyStylePage content={getBodyStyleContent('coupes')!} />;
}
