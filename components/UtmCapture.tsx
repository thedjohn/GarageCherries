'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/gtag';

// Mounted once in the root layout. Renders nothing -- just captures
// first-touch campaign params (utm_source/utm_medium/utm_campaign/utm_content)
// off the landing URL into a cookie, so later GA4 events (see lib/gtag.ts)
// can carry attribution for the campaign that originally brought this visitor.
export default function UtmCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
