import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    // Plain 'Dealer Portal', not 'Dealer Portal — GarageCherries' -- the root
    // layout's own template ('%s | GarageCherries') wraps this default title,
    // so including the suffix here doubled it to "...GarageCherries | GarageCherries"
    // on every /dealer/* page that doesn't set its own title (login, dashboard,
    // reset-password, expired).
    default: 'Dealer Portal',
    template: '%s — GarageCherries Dealer Portal',
  },
  description: 'GarageCherries dealer portal — manage your classic and specialty car inventory, inquiries, and account settings.',
  robots: { index: false, follow: true },
};

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
