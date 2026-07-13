import Image from 'next/image';
import Link from 'next/link';

export default function SellGate() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="" width={64} height={64} unoptimized className="mb-6 inline-block" />
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-3">
          Ready to sell your classic?
        </h1>
        <p className="text-zinc-500 text-base leading-relaxed mb-8">
          Listing on GarageCherries is free. Create an account in under a minute and your car will be in front of serious buyers nationwide.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          <Link
            href="/account/signup?return=/sell"
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold text-base py-3.5 rounded-2xl transition-colors shadow-sm"
          >
            Create a Free Account
          </Link>
          <Link
            href="/account/login?return=/sell"
            className="block w-full border-2 border-zinc-200 hover:border-red-300 text-zinc-700 font-semibold text-base py-3.5 rounded-2xl transition-colors"
          >
            Sign In to Existing Account
          </Link>
        </div>

        <div className="bg-zinc-50 rounded-2xl p-6 text-left">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5">How it works</p>
          <div className="space-y-5">
            {[
              {
                step: '1',
                title: 'Post your car',
                detail: 'Add photos, describe your car, and set your asking price. Takes less than 5 minutes.',
              },
              {
                step: '2',
                title: 'Buyers contact you directly',
                detail: 'Serious buyers reach out through the listing. No middleman, no auction fees — you talk to them on your terms.',
              },
              {
                step: '3',
                title: 'You handle the sale',
                detail: 'Negotiate, agree on a price, and close the deal however works best for you. GarageCherries takes nothing from the sale.',
              },
            ].map(({ step, title, detail }) => (
              <div key={step} className="flex gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 text-sm">{title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-400 mt-6">
          Are you a dealer?{' '}
          <Link href="/dealer/login" className="text-red-600 hover:underline">
            Dealer sign in →
          </Link>
        </p>

      </div>
    </div>
  );
}
