'use client';
import { useEffect } from 'react';

export default function PrivacyPage() {
  useEffect(() => {
    if (document.getElementById('__enzuzo-root-script')) return;
    const script = document.createElement('script');
    script.id = '__enzuzo-root-script';
    script.src = 'https://app.enzuzo.com/scripts/privacy/f896c694-7593-11f1-be29-f74875305e25';
    document.getElementById('__enzuzo-root')?.appendChild(script);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div id="__enzuzo-root" />
    </div>
  );
}
