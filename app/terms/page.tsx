import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — GarageCherries',
  description: 'GarageCherries Terms of Service — the rules for using our classic car marketplace.',
  alternates: { canonical: 'https://www.garagecherries.com/terms' },
};

const LAST_UPDATED = 'June 21, 2026';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-3">Terms of Service</h1>
        <p className="text-sm text-zinc-400">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-zinc max-w-none space-y-10">
        <section>
          <p className="text-zinc-600 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of GarageCherries, operated by GarageCherries LLC (&ldquo;GarageCherries,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;). By creating an account or using the Site, you agree to these Terms. If you do not agree, do not use the Site.
          </p>
        </section>

        {[
          {
            title: '1. The Platform',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                GarageCherries is an online marketplace that connects buyers with dealers of classic, muscle, and collector automobiles. We provide tools to search listings, save searches, receive alerts, and contact dealers. We are not a party to any vehicle sale and do not take ownership of, or assume liability for, any vehicle listed on the Site.
              </p>
            ),
          },
          {
            title: '2. Accounts',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>You must be at least 18 years old to create an account. You are responsible for keeping your credentials secure and for all activity that occurs under your account. Notify us immediately at trust@garagecherries.com if you believe your account has been compromised.</p>
                <p>You may not create accounts for others, impersonate any person or entity, or use another person's account without authorization.</p>
              </div>
            ),
          },
          {
            title: '3. Dealer Accounts',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>Dealer accounts are subject to review and approval. By applying, you certify that you are a licensed motor vehicle dealer (where required by your jurisdiction) or operate legally under applicable state law.</p>
                <p>Dealers agree to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>List only vehicles they own, have authority to sell, or represent on behalf of a consignor</li>
                  <li>Ensure all listing information (photos, mileage, condition, history) is accurate and not misleading</li>
                  <li>Respond to buyer inquiries within 48 hours</li>
                  <li>Remove sold vehicles from the platform within 24 hours of sale</li>
                  <li>Comply with all applicable federal, state, and local laws governing vehicle sales</li>
                </ul>
                <p>GarageCherries reserves the right to suspend or terminate dealer accounts for misrepresentation, excessive buyer complaints, or failure to comply with these standards.</p>
              </div>
            ),
          },
          {
            title: '4. Listings and Content',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>You are solely responsible for content you post (listings, photos, descriptions, messages). You warrant that:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>You have the right to post the content and it does not infringe any third-party intellectual property rights</li>
                  <li>All photos accurately represent the vehicle currently being sold (no stock photos substituted for the actual car)</li>
                  <li>Stated condition, mileage, and history are accurate to the best of your knowledge</li>
                  <li>You will not post fraudulent, deceptive, or misleading listings</li>
                </ul>
                <p>GarageCherries may remove any listing that violates these Terms or that we determine, in our sole discretion, is harmful to buyers or the marketplace.</p>
              </div>
            ),
          },
          {
            title: '5. Prohibited Conduct',
            body: (
              <div className="text-zinc-600 text-sm leading-relaxed">
                <p className="mb-3">You may not:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Scrape, crawl, or systematically download content from the Site without written permission</li>
                  <li>Use the Site to distribute spam, malware, or unsolicited commercial messages</li>
                  <li>Attempt to circumvent security measures, access another user's account, or interfere with the Site's operation</li>
                  <li>Use the Site to engage in fraud, identity theft, or any illegal activity</li>
                  <li>Reverse engineer, decompile, or disassemble any part of the Site</li>
                  <li>Post content that is defamatory, harassing, or violates applicable law</li>
                </ul>
              </div>
            ),
          },
          {
            title: '6. Transactions',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>GarageCherries does not facilitate or process vehicle sales transactions. Any purchase, negotiation, or contract is between buyer and dealer directly. We strongly encourage buyers to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Conduct an independent inspection by a qualified mechanic before purchase</li>
                  <li>Obtain a vehicle history report (Carfax or AutoCheck)</li>
                  <li>Never wire money or use gift cards as payment — use escrow services for large transactions</li>
                  <li>Verify dealer licensing in their state before completing a sale</li>
                </ul>
                <p>GarageCherries is not responsible for any losses arising from transactions conducted with dealers or other users found through the Site.</p>
              </div>
            ),
          },
          {
            title: '7. Fees and Payment',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                Dealer subscriptions, listing upgrades, and private seller listings are subject to fees as described on the applicable pricing pages. Fees are billed in advance. Refunds are not available for partial billing periods. GarageCherries reserves the right to change fees upon 30 days&rsquo; advance notice to the email on file.
              </p>
            ),
          },
          {
            title: '8. Intellectual Property',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>The GarageCherries name, logo, site design, encyclopedia content, and original written content are owned by GarageCherries and protected by copyright and trademark law. You may not use them without written permission.</p>
                <p>By posting content on the Site, you grant GarageCherries a non-exclusive, royalty-free, worldwide license to display, reproduce, and distribute that content in connection with operating and promoting the Site. You retain ownership of your content.</p>
              </div>
            ),
          },
          {
            title: '9. Disclaimer of Warranties',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                THE SITE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. AI-GENERATED CONTENT ON THE SITE (PRICE ASSESSMENTS, DESCRIPTIONS) IS FOR INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE A PROFESSIONAL APPRAISAL OR FINANCIAL ADVICE.
              </p>
            ),
          },
          {
            title: '10. Limitation of Liability',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, GARAGECHERRIES IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE OR ANY VEHICLE TRANSACTION, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM IS LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            ),
          },
          {
            title: '11. Indemnification',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                You agree to indemnify and hold harmless GarageCherries and its officers, employees, and agents from any claims, damages, or expenses (including reasonable attorney&rsquo;s fees) arising from your use of the Site, your content, your violation of these Terms, or your violation of any third-party rights.
              </p>
            ),
          },
          {
            title: '12. Governing Law and Disputes',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                These Terms are governed by the laws of the State of [Your State] without regard to conflict-of-law principles. Any dispute arising from these Terms shall first be submitted to non-binding mediation. If mediation fails, disputes shall be resolved by binding arbitration under the AAA Consumer Arbitration Rules, conducted in [Your City, State]. You waive your right to participate in a class action lawsuit or class-wide arbitration.
              </p>
            ),
          },
          {
            title: '13. Termination',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                We may suspend or terminate your access at any time if you violate these Terms or if we believe your account poses a risk to the platform or other users. You may terminate your account at any time by emailing hello@garagecherries.com. Sections 8–12 survive termination.
              </p>
            ),
          },
          {
            title: '14. Changes to These Terms',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated by email and by updating the &ldquo;Last updated&rdquo; date above. Continued use of the Site after changes take effect constitutes your acceptance of the new Terms.
              </p>
            ),
          },
          {
            title: '15. Contact',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                Questions about these Terms? Email <span className="text-red-600 font-medium">legal@garagecherries.com</span>.
              </p>
            ),
          },
        ].map(section => (
          <section key={section.title} className="border-t border-zinc-100 pt-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">{section.title}</h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}
