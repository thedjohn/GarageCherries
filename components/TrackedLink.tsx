'use client';

import { trackEvent } from '@/lib/gtag';

interface Props {
  href: string;
  eventName: string;
  eventParams?: Record<string, unknown>;
  listingId?: string;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

// Maps a GA4 event name to the click_type stored in dealer_link_clicks. Only
// dealer website/phone clicks are logged first-party -- everything else here
// stays GA4-only.
const DEALER_CLICK_TYPES: Record<string, 'website' | 'phone'> = {
  dealer_website_click: 'website',
  dealer_phone_click: 'phone',
};

// A plain <a> tag that also fires a GA4 event on click -- used for links
// (dealer phone/website) that aren't backed by a form submission, so there's
// no other place to hook a client-side event into. Dealer click events are
// additionally logged first-party (dealer_link_clicks) so the dealer
// dashboard/report can surface them without depending on the GA4 API.
export default function TrackedLink({ href, eventName, eventParams, listingId, className, target, rel, children }: Props) {
  const handleClick = () => {
    trackEvent(eventName, eventParams);

    const clickType = DEALER_CLICK_TYPES[eventName];
    const dealerId = eventParams?.dealer_id;
    if (clickType && dealerId && listingId) {
      fetch('/api/dealer/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealerId, listingId, clickType }),
      }).catch(() => {});
    }
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
