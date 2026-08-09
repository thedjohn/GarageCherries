export const metadata = {
  title: 'Affiliate Disclosure',
  description: 'GarageCherries\' disclosure of affiliate and referral relationships, in accordance with FTC guidelines.',
  alternates: { canonical: 'https://www.garagecherries.com/affiliate-disclosure' },
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-zinc-900 mb-6">Affiliate Disclosure</h1>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <p>
          In accordance with the Federal Trade Commission&apos;s guidelines on endorsements and testimonials (16
          C.F.R. Part 255), GarageCherries LLC (&quot;GarageCherries,&quot; &quot;we,&quot; &quot;us&quot;) discloses
          the following.
        </p>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">What This Means</h2>
          <p>
            Some links on GarageCherries — for example, links to third-party financing, insurance, vehicle
            transport, or vehicle inspection services — are affiliate or referral links. If you click one of these
            links and complete a purchase or sign up for a service, GarageCherries may receive a referral fee or
            commission from that third party, at no additional cost to you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Our Editorial Independence</h2>
          <p>
            Whether or not GarageCherries has a referral relationship with a given company does not influence the
            accuracy of information we provide about listings on the Site. We only recommend third-party services
            that we believe may be useful to buyers and sellers of classic, muscle, and collector vehicles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Where You&apos;ll See a Disclosure</h2>
          <p>
            Any page or section that includes an affiliate or referral link will include a clear, visible
            disclosure near the link itself, in addition to this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Questions</h2>
          <p>
            If you have questions about a specific link or partnership, contact us at{' '}
            <a href="mailto:contact-us@garagecherries.com" className="text-red-600 hover:underline">contact-us@garagecherries.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
