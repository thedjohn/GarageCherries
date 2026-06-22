interface SponsorCardProps {
  name: string;
  tagline: string;
  logoUrl: string;
  href: string;
  cta?: string;
  layout?: 'vertical' | 'horizontal';
}

export default function SponsorCard({
  name, tagline, logoUrl, href, cta = 'Learn More', layout = 'vertical',
}: SponsorCardProps) {
  if (layout === 'horizontal') {
    return (
      <div className="rounded-2xl bg-zinc-900 overflow-hidden">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center gap-5 px-5 py-4 group"
        >
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="w-14 h-14 object-contain rounded-xl shrink-0 bg-white p-1"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Sponsored</span>
            <p className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{name}</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{tagline}</p>
          </div>
          <span className="shrink-0 bg-red-600 group-hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
            {cta} →
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Sponsored</span>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex flex-col items-center gap-3 px-5 pb-5 group"
      >
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-20 h-20 object-contain rounded-xl"
        />
        <div className="text-center">
          <p className="font-bold text-zinc-900 text-sm group-hover:text-red-600 transition-colors">{name}</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{tagline}</p>
        </div>
        <span className="inline-block bg-red-600 group-hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors">
          {cta} →
        </span>
      </a>
    </div>
  );
}
