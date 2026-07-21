import { Metadata } from 'next';
import BodyStylePage from '@/components/BodyStylePage';
import { getBodyStyleContent } from '@/lib/bodyStyles';

export const metadata: Metadata = {
  title: 'Classic Fastbacks — History, Notable Models & Buying Guide',
  description: 'The history of the fastback body style, notable models from the Mustang Fastback to the Charger, buying tips for fastback classics, and current fastback listings for sale.',
  alternates: { canonical: 'https://www.garagecherries.com/cars/fastbacks' },
};

export default function FastbacksPage() {
  return <BodyStylePage content={getBodyStyleContent('fastbacks')!} />;
}
