'use client';

export interface AdData {
  id: string;
  advertiser_id: string;
  headline: string | null;
  body_copy: string | null;
  cta_label: string | null;
  cta_url: string | null;
  phone: string | null;
  logo_url: string | null;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  business_name: string;
  city: string | null;
  state: string | null;
  category: string | null;
}

interface Props {
  ad: AdData;
  onClickCta?: () => void;
  onClickPhone?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  detail: 'Auto Detailing',
  insurance: 'Classic Car Insurance',
  finance: 'Financing',
  transport: 'Transport & Shipping',
  storage: 'Storage',
  restoration: 'Restoration',
  inspection: 'Pre-Purchase Inspection',
  other: 'Local Service',
};

export default function AdCard({ ad, onClickCta, onClickPhone }: Props) {
  const categoryLabel = CATEGORY_LABELS[ad.category ?? 'other'] ?? 'Local Service';
  const location = [ad.city, ad.state].filter(Boolean).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      {ad.photo_url && (
        <div className="relative h-32 bg-zinc-100">
          <img src={ad.photo_url} alt={ad.business_name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {ad.logo_url ? (
            <img src={ad.logo_url} alt={ad.business_name} className="w-10 h-10 rounded-lg object-contain bg-zinc-50 border border-zinc-100 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-600 font-bold text-sm">{ad.business_name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-zinc-900 text-sm leading-tight">{ad.business_name}</p>
            {ad.rating && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} className={`w-3 h-3 ${i <= Math.round(ad.rating!) ? 'text-amber-400' : 'text-zinc-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-zinc-500">{ad.rating.toFixed(1)}{ad.review_count ? ` (${ad.review_count})` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Copy */}
        {ad.headline && <p className="font-semibold text-zinc-900 text-sm mb-1">{ad.headline}</p>}
        {ad.body_copy && <p className="text-xs text-zinc-500 leading-relaxed mb-3">{ad.body_copy}</p>}

        {/* Location */}
        {location && (
          <p className="text-xs text-zinc-400 mb-3 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {location}
          </p>
        )}

        {/* CTAs */}
        <div className="flex gap-2">
          {ad.phone && (
            <a
              href={`tel:${ad.phone.replace(/\D/g, '')}`}
              onClick={onClickPhone}
              className="flex-1 border border-zinc-200 hover:border-red-300 text-zinc-700 hover:text-red-600 font-semibold text-xs py-2 rounded-lg text-center transition-colors"
            >
              Call Now
            </a>
          )}
          {ad.cta_url && (
            <a
              href={ad.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClickCta}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg text-center transition-colors"
            >
              {ad.cta_label ?? 'Learn More'}
            </a>
          )}
        </div>
      </div>

      {/* Sponsored label */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-zinc-300 uppercase tracking-wide">Sponsored · {categoryLabel}</p>
      </div>
    </div>
  );
}
