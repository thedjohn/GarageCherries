import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'GarageCherries\' privacy policy — what information we collect, how it\'s used, and your choices.',
  alternates: { canonical: 'https://www.garagecherries.com/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
