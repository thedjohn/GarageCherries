'use client';

import { trackEvent } from '@/lib/gtag';

interface Props {
  href: string;
  eventName: string;
  eventParams?: Record<string, unknown>;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

// A plain <a> tag that also fires a GA4 event on click -- used for links
// (dealer phone/website) that aren't backed by a form submission, so there's
// no other place to hook a client-side event into.
export default function TrackedLink({ href, eventName, eventParams, className, target, rel, children }: Props) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => trackEvent(eventName, eventParams)}
    >
      {children}
    </a>
  );
}
