'use client';
import { useEffect, useState } from 'react';
import AdCard, { type AdData } from '@/components/AdCard';

interface Props {
  carState: string;
  pagePath?: string;
}

export default function AdSlot({ carState, pagePath }: Props) {
  const [ad, setAd] = useState<AdData | null>(null);
  const [adId, setAdId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ state: carState });
    if (pagePath) params.set('path', pagePath);

    fetch(`/api/ads/serve?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ad) {
          setAd(data.ad);
          setAdId(data.ad.id);
        }
      })
      .catch(() => {});
  }, [carState, pagePath]);

  if (!ad) return null;

  const track = (type: 'click_cta' | 'click_phone') => {
    if (!adId) return;
    fetch('/api/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId, type, path: pagePath, state: carState }),
    }).catch(() => {});
  };

  return (
    <div className="mt-4">
      <AdCard
        ad={ad}
        onClickCta={() => track('click_cta')}
        onClickPhone={() => track('click_phone')}
      />
    </div>
  );
}
