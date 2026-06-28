'use client';

import { useEffect } from 'react';

<<<<<<< HEAD
export default function ViewTracker({ listingId, dealerId, userId }: { listingId: string; dealerId: string; userId?: string }) {
=======
export default function ViewTracker({ listingId, dealerId }: { listingId: string; dealerId: string }) {
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
  useEffect(() => {
    if (!listingId || !dealerId) return;
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
<<<<<<< HEAD
      body: JSON.stringify({ listingId, dealerId, userId }),
    }).catch(() => {});
  }, [listingId, dealerId, userId]);
=======
      body: JSON.stringify({ listingId, dealerId }),
    }).catch(() => {});
  }, [listingId, dealerId]);
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)

  return null;
}
