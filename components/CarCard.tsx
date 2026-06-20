import Link from 'next/link';
import Image from 'next/image';
import { Car } from '@/lib/types';
import { formatPrice, formatMileage, toSegment } from '@/lib/data';

const CONDITION_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-800',
  Good:      'bg-blue-100 text-blue-800',
  Fair:      'bg-yellow-100 text-yellow-800',
  Project:   'bg-red-100 text-red-800',
};

export default function CarCard({ car }: { car: Car }) {
  return (
    <Link href={`/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`} className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100">
      {/* Image */}
      <div className="relative h-48 bg-zinc-200 overflow-hidden">
        <Image
          src={car.images[0]}
          alt={car.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {car.featured && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            FEATURED
          </span>
        )}
        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded ${CONDITION_COLORS[car.condition]}`}>
          {car.condition}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-zinc-900 text-base leading-tight group-hover:text-red-600 transition-colors line-clamp-1">
          {car.title}
        </h3>

        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
          <span>{formatMileage(car.mileage)}</span>
          <span>·</span>
          <span>{car.engine}</span>
          <span>·</span>
          <span>{car.transmission === 'Manual' ? '4-Spd' : 'Auto'}</span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>{car.location}, {car.state}</span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
          <span className="text-xl font-bold text-zinc-900">{formatPrice(car.price)}</span>
          <span className="text-xs text-zinc-400">{car.bodyStyle}</span>
        </div>
      </div>
    </Link>
  );
}
