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
      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">YouTube API Services</h2>
        <p className="text-zinc-700 leading-relaxed">
          GarageCherries uses YouTube API Services to automatically post promotional videos for
          vehicle listings. Use of this API is subject to the{' '}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline"
          >
            YouTube Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:underline"
          >
            Google&apos;s Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
