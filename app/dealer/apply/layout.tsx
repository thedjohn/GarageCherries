import type { Metadata } from 'next';

// app/dealer/layout.tsx sets a blanket noindex for the whole /dealer/* tree
// (correct for the private dashboard/login/reset-password pages), but this
// page is the public dealer signup funnel and needs its own override --
// same pattern as app/sell/layout.tsx, required because the page itself is
// a Client Component and can't export metadata directly.
export const metadata: Metadata = {
  // Plain string, not an object -- app/dealer/layout.tsx's title.template
  // ("%s — GarageCherries Dealer Portal") already appends the suffix; setting
  // a full title here would double it, the same bug fixed sitewide 2026-07-17.
  title: 'Become a Dealer',
  description: 'Apply for a GarageCherries dealer account to list your classic, muscle, and collector car inventory. Free listings through 2026 — approved dealers get a full dashboard to manage inventory, inquiries, and performance.',
  alternates: { canonical: 'https://www.garagecherries.com/dealer/apply' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Become a Dealer — GarageCherries',
    description: 'Apply for a GarageCherries dealer account to list your classic, muscle, and collector car inventory.',
    url: 'https://www.garagecherries.com/dealer/apply',
  },
};

export default function DealerApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
