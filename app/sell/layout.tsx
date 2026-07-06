import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post Your Car For Sale — Free Classic Car Listing',
  description: 'List your classic, muscle, or collector car for free on GarageCherries. Reach thousands of serious buyers nationwide. Takes less than 5 minutes.',
  alternates: { canonical: 'https://www.garagecherries.com/sell' },
  openGraph: {
    title: 'Post Your Car For Sale — GarageCherries',
    description: 'List your classic, muscle, or collector car for free. Reach thousands of serious buyers nationwide.',
    url: 'https://www.garagecherries.com/sell',
  },
};

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
