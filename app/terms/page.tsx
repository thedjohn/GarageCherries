'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function TermsPage() {
  useEffect(() => {
    if (document.getElementById('__enzuzo-root-script')) return;
    const script = document.createElement('script');
    script.id = '__enzuzo-root-script';
    script.src = 'https://app.enzuzo.com/scripts/tos/f896c694-7593-11f1-be29-f74875305e25';
    document.getElementById('__enzuzo-root')?.appendChild(script);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div id="__enzuzo-root" />
      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Copyright Infringement (DMCA)</h2>
        <p className="text-zinc-700 leading-relaxed">
          GarageCherries responds to notices of alleged copyright infringement in accordance with the Digital
          Millennium Copyright Act. For our takedown notice procedure, counter-notification process, and designated
          agent contact information, see our{' '}
          <Link href="/dmca" className="text-red-600 hover:underline">DMCA Policy</Link>.
        </p>
      </div>
      <div className="mt-8 pt-8 border-t border-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Independent Inspection Reports</h2>
        <p className="text-zinc-700 leading-relaxed">
          Some listings may include an independent inspection report submitted by the dealer or seller from a
          third-party inspection provider. Any such report is prepared solely by the named third party and is
          provided &quot;as-is&quot; for informational purposes only. GarageCherries did not commission, participate
          in, or verify any such inspection, and makes no representation or warranty as to its accuracy,
          completeness, or currency. An inspection report does not constitute a warranty, guarantee, or
          certification of the vehicle&apos;s condition. Buyers are solely responsible for independently verifying
          the vehicle&apos;s condition before purchase.
        </p>
      </div>
    </div>
  );
}
