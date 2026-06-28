'use client';

import { useEffect, useState } from 'react';
import CarCard from '@/components/CarCard';

interface Props {
  currentCarId: string | number;
  year: number;
  make: string;
  model: string;
  bodyStyle?: string;
  engine?: string | null;
  price: number;
  condition?: string;
  fallbackCars?: any[];
}

export default function SimilarCarsSection({
  currentCarId, year, make, model, bodyStyle, engine, price, condition, fallbackCars = []
}: Props) {
  const [cars, setCars] = useState<any[]>(fallbackCars);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/similar-cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentCarId, year, make, model, bodyStyle, engine, price, condition }),
    })
      .then(r => r.json())
      .then(({ listings }) => {
        if (listings && listings.length > 0) {
          setCars(listings.map((l: any) => ({
            id: l.id,
            slug: l.slug,
            title: `${l.year} ${l.make} ${l.model}`,
            year: l.year,
            make: l.make,
            model: l.model,
            price: l.price,
            mileage: l.mileage,
            condition: l.condition,
            bodyStyle: l.body_style,
            location: l.location_city ?? '',
            state: l.location_state ?? '',
            images: l.primary_image_url ? [l.primary_image_url] : [],
            featured: false,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentCarId]);

  if (!loading && cars.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-zinc-900">You May Also Like</h2>
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">AI Picks</span>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cars.map(c => <CarCard key={c.id} car={c} />)}
        </div>
      )}
    </section>
  );
}
