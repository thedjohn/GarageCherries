'use client';

import { useEffect } from 'react';

export default function ViewTracker({ listingId, dealerId }: { listingId: string; dealerId: string }) {
  useEffect(() => {
    if (!listingId || !dealerId) return;
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, dealerId }),
    }).catch(() => {});
  }, [listingId, dealerId]);

  return null;
}
