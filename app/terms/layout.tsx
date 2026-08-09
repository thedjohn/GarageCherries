import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'GarageCherries\' terms of service governing use of the site.',
  alternates: { canonical: 'https://www.garagecherries.com/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
