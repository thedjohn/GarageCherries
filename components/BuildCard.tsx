import Link from 'next/link';
import Image from 'next/image';

export interface ShowcaseBuild {
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  mileage: number | null;
  images: string[];
  mods: { description: string }[];
  slug: string;
}

export default function BuildCard({ build, highlight }: { build: ShowcaseBuild; highlight?: boolean }) {
  const title = `${build.year} ${build.make} ${build.model}${build.trim ? ` ${build.trim}` : ''}`;
  const img = build.images[0];

  return (
    <Link href={`/build/${build.slug}`}
      className={`group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border ${highlight ? 'border-red-200' : 'border-zinc-100'}`}>
      <div className="relative h-48 bg-zinc-200 overflow-hidden">
        {img ? (
          <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-300">🚗</div>
        )}
        {highlight && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            FEATURED
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-zinc-900 text-base leading-tight group-hover:text-red-600 transition-colors line-clamp-1">
          {build.nickname || title}
        </h3>
        {build.nickname && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{title}</p>}
        <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-500">
          {build.mileage != null && <span>{build.mileage.toLocaleString()} mi</span>}
          {build.mods.length > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {build.mods.length} mod{build.mods.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
