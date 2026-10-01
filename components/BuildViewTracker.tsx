'use client';

import { useEffect } from 'react';

export default function BuildViewTracker({ buildId }: { buildId: string }) {
  useEffect(() => {
    if (!buildId) return;
    fetch('/api/track-build-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildId }),
    }).catch(() => {});
  }, [buildId]);

  return null;
}
