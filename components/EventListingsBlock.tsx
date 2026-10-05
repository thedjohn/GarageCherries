import Link from 'next/link';
import CarCard from './CarCard';
import type { ListingsBlock } from '@/lib/eventListings';

// Server-rendered "cars for sale" block for event pages, the /events index,
// and state pages. Plain <a href> links (CarCard and the browse link) so
// they're crawlable; `source` becomes data-source on every link for Clarity.
// CarCard's image box has a fixed height and next/image lazy-loads by
// default, so this adds no layout shift and no new client-side JS.
export default function EventListingsBlock({
  block, source, className = '', columns = 2,
}: {
  block: ListingsBlock;
  source: string;
  className?: string;
  // Max columns on wide screens; always one column at phone width.
  columns?: 2 | 3 | 4;
}) {
  const grid = columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <section className={className}>
      <h2 className="text-lg font-bold text-zinc-900 mb-4">{block.heading}</h2>
      <div className={`grid grid-cols-1 ${grid} gap-4`}>
        {block.cars.map(car => <CarCard key={car.id} car={car} dataSource={source} />)}
      </div>
      <Link
        href={block.browseHref}
        data-source={source}
        className="mt-4 inline-flex items-center justify-center w-full sm:w-auto bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors"
      >
        {block.browseLabel} →
      </Link>
    </section>
  );
}
