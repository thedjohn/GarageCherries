import Script from 'next/script';

export const metadata = {
  title: 'Terms of Service | GarageCherries',
  description: 'Terms of Service for GarageCherries LLC',
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div id="__enzuzo-root" />
      <Script
        id="__enzuzo-root-script"
        src="https://app.enzuzo.com/scripts/tos/f896c694-7593-11f1-be29-f74875305e25"
        strategy="afterInteractive"
      />
    </main>
  );
}
