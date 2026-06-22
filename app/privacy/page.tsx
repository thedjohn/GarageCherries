import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — GarageCherries',
  description: 'GarageCherries Privacy Policy — how we collect, use, and protect your personal information.',
  alternates: { canonical: 'https://www.garagecherries.com/privacy' },
};

const LAST_UPDATED = 'June 21, 2026';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-3">Privacy Policy</h1>
        <p className="text-sm text-zinc-400">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-zinc max-w-none space-y-10">
        <section>
          <p className="text-zinc-600 leading-relaxed">
            GarageCherries (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates garagecherries.com (the &ldquo;Site&rdquo;). This Privacy Policy explains what information we collect, how we use it, and your choices. By using the Site, you agree to the practices described here.
          </p>
        </section>

        {[
          {
            title: '1. Information We Collect',
            body: (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Account Information</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">When you create an account, we collect your email address and a hashed password. Dealers may also provide a business name, phone number, and physical address.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Usage Data</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">We collect data about how you interact with the Site, including pages visited, search queries, filters applied, and listings viewed. This data is associated with your session and, if you are logged in, your account.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Saved Searches & Alerts</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">When you save a search or create a car alert, we store your search criteria and use them to send you notification emails when matching listings appear.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Device & Log Data</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">We automatically collect IP address, browser type, operating system, referring URL, and timestamps when you access the Site. This information is used for security, analytics, and debugging.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Cookies</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">We use cookies and similar tracking technologies to maintain your session, remember preferences, and analyze traffic. You can control cookie behavior through your browser settings, though some features may not work without cookies.</p>
                </div>
              </div>
            ),
          },
          {
            title: '2. How We Use Your Information',
            body: (
              <ul className="text-zinc-600 text-sm space-y-2 leading-relaxed list-disc pl-5">
                <li>Operate and improve the Site and its features</li>
                <li>Authenticate your account and protect against fraud</li>
                <li>Send car alert emails when matching listings are posted</li>
                <li>Send transactional emails (account confirmation, password resets)</li>
                <li>Send our weekly newsletter if you have subscribed (you can unsubscribe at any time)</li>
                <li>Analyze usage patterns to improve search relevance and recommendations</li>
                <li>Comply with legal obligations</li>
              </ul>
            ),
          },
          {
            title: '3. Information Sharing',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <p>We do not sell your personal information. We share it only in these limited circumstances:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><span className="font-medium text-zinc-800">Service providers.</span> We share data with Supabase (database and authentication), Vercel (hosting), Resend (email delivery), and Anthropic (AI features). Each is contractually bound to protect your data and use it only to provide services to us.</li>
                  <li><span className="font-medium text-zinc-800">Dealers.</span> When you send an inquiry through a listing, your name and message are shared with the dealer who listed the car. Your email address is shared only if you choose to include it.</li>
                  <li><span className="font-medium text-zinc-800">Legal requirements.</span> We may disclose information if required by law, regulation, or valid legal process.</li>
                  <li><span className="font-medium text-zinc-800">Business transfers.</span> If GarageCherries is acquired or merges, your information may transfer to the successor. We will notify you before that occurs.</li>
                </ul>
              </div>
            ),
          },
          {
            title: '4. Data Retention',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                We retain account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where retention is required by law or needed to resolve disputes. Anonymized, aggregated analytics data may be retained indefinitely.
              </p>
            ),
          },
          {
            title: '5. Your Rights and Choices',
            body: (
              <div className="text-zinc-600 text-sm space-y-3 leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                  <li><span className="font-medium text-zinc-800">Access and correction.</span> You can view and update your account information at any time from your account settings.</li>
                  <li><span className="font-medium text-zinc-800">Deletion.</span> You can request deletion of your account and associated data by emailing privacy@garagecherries.com.</li>
                  <li><span className="font-medium text-zinc-800">Email opt-out.</span> Every marketing email includes an unsubscribe link. Transactional emails (account security, order confirmations) cannot be opted out of while your account is active.</li>
                  <li><span className="font-medium text-zinc-800">Do Not Track.</span> We honor browser Do Not Track signals for analytics cookies.</li>
                </ul>
                <p>California residents have additional rights under the CCPA including the right to know, right to delete, and right to opt out of sale (we do not sell data). Contact us to exercise these rights.</p>
              </div>
            ),
          },
          {
            title: '6. Security',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                We use industry-standard security measures including TLS encryption in transit, bcrypt password hashing, and row-level security policies in our database so that no user can access another user's private data. No system is completely secure, and we cannot guarantee absolute security of your information.
              </p>
            ),
          },
          {
            title: '7. Children',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                GarageCherries is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us personal information, please contact us and we will delete it promptly.
              </p>
            ),
          },
          {
            title: '8. Changes to This Policy',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                We may update this policy from time to time. When we make material changes, we will update the &ldquo;Last updated&rdquo; date at the top of this page and, where appropriate, notify you by email. Continued use of the Site after changes take effect constitutes acceptance of the updated policy.
              </p>
            ),
          },
          {
            title: '9. Contact',
            body: (
              <p className="text-zinc-600 text-sm leading-relaxed">
                Questions or concerns about this policy? Email <span className="text-red-600 font-medium">privacy@garagecherries.com</span> or write to us at GarageCherries, c/o Privacy, [Your Address]. We respond to all privacy inquiries within 72 hours.
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
