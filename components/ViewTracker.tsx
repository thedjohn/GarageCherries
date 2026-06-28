'use client';

import { useEffect } from 'react';

export default function ViewTracker({ listingId, dealerId, userId }: { listingId: string; dealerId: string; userId?: string }) {
  useEffect(() => {
    if (!listingId || !dealerId) return;
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, dealerId, userId }),
    }).catch(() => {});
  }, [listingId, dealerId, userId]);

  return null;
}
