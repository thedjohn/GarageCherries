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
  stopPropagation?: boolean;
  // Renders a <button> instead of an <a> and navigates via window.open() in
  // the click handler instead. Needed when this sits inside another real <a>
  // (e.g. a dealer directory card that's itself a card-wide Link) -- a
  // nested <a> is invalid HTML and causes a hydration mismatch, since the
  // browser silently restructures it during parsing.
  asButton?: boolean;
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
export default function TrackedLink({ href, eventName, eventParams, listingId, className, target, rel, stopPropagation, asButton, children }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    trackEvent(eventName, eventParams);

    const clickType = DEALER_CLICK_TYPES[eventName];
    const dealerId = eventParams?.dealer_id;
    if (clickType && dealerId) {
      fetch('/api/dealer/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealerId, listingId, clickType }),
      }).catch(() => {});
    }

    if (asButton) {
      e.preventDefault();
      window.open(href, target || '_self', rel);
    }
  };

  if (asButton) {
    // Unlike <a>, a <button> doesn't get cursor: pointer from the browser by
    // default -- add it explicitly so it still looks/feels like a link.
    return (
      <button type="button" className={`cursor-pointer ${className ?? ''}`} onClick={handleClick}>
        {children}
      </button>
    );
  }

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
