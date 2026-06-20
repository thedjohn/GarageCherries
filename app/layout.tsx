import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const geist = Geist({ subsets: ['latin'] });

const BASE_URL = 'https://www.garagecherries.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'GarageCherries — Classic & Collector Cars For Sale',
    template: '%s | GarageCherries',
  },
  description: 'Buy and sell classic cars, muscle cars, and collector vehicles. Browse thousands of listings from trusted dealers across the United States.',
  keywords: ['classic cars for sale', 'muscle cars', 'collector cars', 'vintage cars', 'antique cars', 'classic car dealers'],
  authors: [{ name: 'GarageCherries' }],
  openGraph: {
    type: 'website',
    siteName: 'GarageCherries',
    title: 'GarageCherries — Classic & Collector Cars For Sale',
    description: 'Buy and sell classic cars, muscle cars, and collector vehicles. Browse thousands of listings from trusted dealers across the United States.',
    url: BASE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'GarageCherries Classic Cars' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GarageCherries — Classic & Collector Cars For Sale',
    description: 'Buy and sell classic cars, muscle cars, and collector vehicles.',
    images: ['/og-default.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: BASE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-50 text-zinc-900 min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
