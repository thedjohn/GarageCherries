import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the GarageCherries team. Questions about listings, dealer accounts, advertising, or the platform.',
  alternates: { canonical: 'https://www.garagecherries.com/contact' },
};

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GarageCherries',
  url: 'https://www.garagecherries.com',
  contactPoint: [
    { '@type': 'ContactPoint', email: 'contact-us@garagecherries.com', contactType: 'customer support', areaServed: 'USA' },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">Get In Touch</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">We're here to help.</h1>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed">
            Questions about the platform, your account, or a specific listing? Reach out and we'll get back to you promptly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          {/* Contact channels */}
          <div className="space-y-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm flex gap-4 items-start">
              <span className="text-2xl mt-0.5">📧</span>
              <div>
                <p className="font-semibold text-zinc-900 text-sm mb-0.5">Email Us</p>
                <a href="mailto:contact-us@garagecherries.com" className="text-red-600 font-medium text-sm mb-1 block hover:underline">
                  contact-us@garagecherries.com
                </a>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  General questions, dealer support, advertising inquiries, listing issues — one inbox handles it all.
                </p>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm flex gap-4 items-start">
              <span className="text-2xl mt-0.5">💡</span>
              <div>
                <p className="font-semibold text-zinc-900 text-sm mb-0.5">Product Feedback</p>
                <Link href="/feedback" className="text-red-600 font-medium text-sm mb-1 block hover:underline">
                  Share a suggestion or report a bug →
                </Link>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Found something broken or have an idea to improve the site? Use our feedback form.
                </p>
              </div>
            </div>

          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <div className="bg-zinc-900 text-white rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Dealer Accounts</h2>
              <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
                Looking to list your inventory on GarageCherries? We offer flexible plans for dealers of all sizes — from part-time brokers to multi-location operations.
              </p>
              <Link
                href="/dealer/apply"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Apply for a Dealer Account
              </Link>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Advertise With Us</h2>
              <p className="text-zinc-500 text-sm mb-5 leading-relaxed">
                Reach an audience of serious classic car buyers, collectors, and enthusiasts. Our readers are engaged, affluent, and actively looking.
              </p>
              <Link
                href="/advertise"
                className="inline-block border border-red-300 hover:bg-red-100 text-red-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                View Advertising Options
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ teaser */}
        <div className="border-t border-zinc-100 pt-10 text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Common Questions</h2>
          <p className="text-zinc-500 mb-8 text-sm">You may find what you need without waiting for a reply.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              {
                q: 'How do I create a car alert?',
                a: 'Apply filters on the Listings page, then click "Notify me when a match lists." You\'ll get an email the moment a matching car is listed.',
              },
              {
                q: 'Are dealers verified?',
                a: 'Yes. Every dealer is reviewed by our team before receiving a listing account. We check business registration and prior selling history.',
              },
              {
                q: 'Can I list a car as a private seller?',
                a: 'Yes — create a free buyer account and visit the Sell page to submit your listing. It goes live after a quick review.',
              },
            ].map(item => (
              <div key={item.q} className="bg-zinc-50 rounded-2xl p-5">
                <p className="font-semibold text-zinc-900 text-sm mb-2">{item.q}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
