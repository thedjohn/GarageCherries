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
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Data Breach Notification</h2>
        <p className="text-zinc-700 leading-relaxed">
          In the event we discover a breach of security leading to the unauthorized access, disclosure, or
          acquisition of your Personal Data, we will notify affected users without unreasonable delay, and in any
          case within 30 days of discovering the breach, unless a shorter period is required by applicable law.
          Notification will be provided via email to the address associated with your account, and/or by posting a
          notice on the Website where email notification is not feasible. We will also notify any applicable
          regulatory authority where required by law.
        </p>
        <p className="text-zinc-700 leading-relaxed mt-4">
          For purposes of this section, a &quot;breach&quot; means unauthorized access to, or acquisition of,
          Personal Data that compromises the security, confidentiality, or integrity of that data, excluding
          good-faith access by our employees or agents that does not result in further unauthorized use or
          disclosure.
        </p>
      </div>
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
      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Buyer-Seller Messages</h2>
        <p className="text-zinc-700 leading-relaxed">
          Messages sent through the Site&apos;s buyer-seller messaging feature are not fully private between the
          two parties. Authorized GarageCherries staff may access message content to provide customer support,
          investigate a reported message, or otherwise help ensure the safety and integrity of the Site.
        </p>
      </div>
    </div>
  );
}
