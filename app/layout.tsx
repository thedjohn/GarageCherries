import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MessengerProvider } from '@/lib/messenger-context';
import MessengerWidget from '@/components/MessengerWidget';
import PromoBanner from '@/components/PromoBanner';

const geist = Geist({ subsets: ['latin'] });

const BASE_URL = 'https://www.garagecherries.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: 'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png',
    apple: 'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png',
  },
  title: {
    default: 'GarageCherries — Classic, Muscle, Sport & Collector Cars',
    template: '%s | GarageCherries',
  },
  description: 'Buy and sell classic cars, muscle cars, sports cars, supercars, and collector vehicles from private sellers and trusted dealers worldwide.',
  keywords: ['classic cars for sale', 'muscle cars', 'sports cars', 'supercars', 'collector cars', 'vintage cars', 'specialty car dealers'],
  authors: [{ name: 'GarageCherries' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'GarageCherries',
    title: 'GarageCherries — Classic, Muscle, Sport & Collector Cars',
    description: 'Buy and sell classic cars, muscle cars, and collector vehicles from private sellers and trusted dealers worldwide.',
    url: BASE_URL,
    images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: 'GarageCherries — Specialty Cars For Sale' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GarageCherries — Classic, Muscle, Sport & Collector Cars',
    description: 'Buy and sell classic cars, muscle cars, and collector vehicles.',
    images: ['/opengraph-image.jpg'],
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
        <MessengerProvider>
          {/* SessionGuard disabled 2026-07-07 -- two bugs in a row (a timing-race
              false positive, then a logic inversion) force-logged-out at least one
              real user. Re-enable only after the root cause of /api/ 401s on a
              valid session is diagnosed and the fix is tested without a live user
              as the test subject. See components/SessionGuard.tsx. */}
          <Header />
          <PromoBanner />
          <main className="flex-1">{children}</main>
          <Footer />
          <MessengerWidget />
        </MessengerProvider>
        {/* Cookie consent managers are Next.js's own documented example use case
            for beforeInteractive — it must genuinely run before the Google tag
            below (afterInteractive), not just appear earlier in the DOM, which
            a same-strategy reorder doesn't actually guarantee. */}
        <Script
          src="https://app.enzuzo.com/scripts/cookiebar/f896c694-7593-11f1-be29-f74875305e25"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-B36QB0J7TX"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-B36QB0J7TX');
        `}</Script>
      </body>
    </html>
  );
}
