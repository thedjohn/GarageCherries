import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Dealer Portal — GarageCherries',
    template: '%s — GarageCherries Dealer Portal',
  },
  description: 'GarageCherries dealer portal — manage your classic and specialty car inventory, inquiries, and account settings.',
  robots: { index: false, follow: true },
};

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
