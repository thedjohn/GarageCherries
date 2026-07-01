import Script from 'next/script';

export const metadata = {
  title: 'Privacy Policy | GarageCherries',
  description: 'Privacy Policy for GarageCherries LLC',
};

export default function PrivacyPage() {
  return (
    <>
      <div id="__enzuzo-root" className="max-w-4xl mx-auto px-4 py-12" />
      <Script
        id="__enzuzo-root-script"
        src="https://app.enzuzo.com/scripts/privacy/f896c694-7593-11f1-be29-f74875305e25"
        strategy="afterInteractive"
      />
    </>
  );
}
