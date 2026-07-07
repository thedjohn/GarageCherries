import Link from 'next/link';

export const metadata = { title: 'Account Suspended', robots: { index: false } };

export default function SuspendedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 justify-center mb-8">
          <span className="text-2xl">🍒</span>
          <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
        </Link>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Account Suspended</h1>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Your account has been suspended due to a violation of our community guidelines.
            If you believe this was a mistake, please reach out and we'll review your case.
          </p>
          <a
            href="mailto:contact-us@garagecherries.com"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm mb-3">
            Contact Support
          </a>
          <Link href="/" className="block text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
            Return to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
