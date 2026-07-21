import { Metadata } from 'next';
import BodyStylePage from '@/components/BodyStylePage';
import { getBodyStyleContent } from '@/lib/bodyStyles';

export const metadata: Metadata = {
  title: 'Classic Convertibles — History, Notable Models & Buying Guide',
  description: "The history of the American convertible, notable models from the Mustang to the Bel Air, buying tips for open-top classics, and current convertible listings for sale.",
  alternates: { canonical: 'https://www.garagecherries.com/cars/convertibles' },
};

export default function ConvertiblesPage() {
  return <BodyStylePage content={getBodyStyleContent('convertibles')!} />;
}
