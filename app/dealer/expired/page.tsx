import Link from 'next/link';

export default function DealerExpiredPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <span className="text-2xl">🍒</span>
          <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
        </Link>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Your beta period has ended</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Your free beta access to GarageCherries has expired. To continue listing your inventory
            and accessing your dealer dashboard, please contact us to upgrade your account.
          </p>
          <a
            href="mailto:contact-us@garagecherries.com?subject=Dealer Account Upgrade"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm mb-3"
          >
            Contact us to upgrade →
          </a>
          <Link
            href="/"
            className="block w-full border border-zinc-200 text-zinc-600 font-semibold py-3 rounded-xl text-sm hover:bg-zinc-50 transition-colors"
          >
            Back to GarageCherries
          </Link>
        </div>
      </div>
    </div>
  );
}
