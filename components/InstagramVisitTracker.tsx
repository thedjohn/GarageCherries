'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/gtag';

// Mounted only on /links (the actual Instagram bio destination) -- fires
// once per page load so GA4 can measure real Instagram-driven traffic,
// distinct from the garagecherriesig-20 Amazon tag which only measures
// affiliate conversions specifically. Same mount-once pattern as
// components/UtmCapture.tsx, just scoped to this one page instead of the
// root layout.
export default function InstagramVisitTracker() {
  useEffect(() => {
    trackEvent('instagram_visit');
  }, []);
  return null;
}
