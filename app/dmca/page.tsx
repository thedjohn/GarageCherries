export const metadata = {
  title: 'DMCA Policy',
  description: 'GarageCherries\' Digital Millennium Copyright Act (DMCA) policy, designated agent contact information, and takedown notice procedure.',
};

export default function DmcaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-zinc-900 mb-6">DMCA Policy</h1>

      <div className="space-y-8 text-zinc-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Copyright Infringement Notification</h2>
          <p>
            GarageCherries LLC (&quot;GarageCherries,&quot; &quot;we,&quot; &quot;us&quot;) respects the intellectual
            property rights of others and expects users of the Site to do the same. In accordance with the Digital
            Millennium Copyright Act of 1998 (&quot;DMCA&quot;), we will respond expeditiously to claims of
            copyright infringement committed using the Site that are reported to our Designated Agent, identified
            below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Designated Agent</h2>
          <p>
            If you believe that content on GarageCherries infringes your copyright, please send a notification of
            claimed infringement to our Designated Agent:
          </p>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 mt-3">
            <p className="font-semibold text-zinc-900">Copyright Agent</p>
            <p>GarageCherries LLC</p>
            <p>
              Email: <a href="mailto:contact-us@garagecherries.com" className="text-red-600 hover:underline">contact-us@garagecherries.com</a>
            </p>
          </div>
          <p className="mt-3">
            This agent is also registered with the U.S. Copyright Office&apos;s DMCA Designated Agent Directory.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">What to Include in a Takedown Notice</h2>
          <p>To be effective, a notification of claimed infringement must be in writing and include substantially the following:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the exclusive right that is allegedly infringed.</li>
            <li>Identification of the copyrighted work claimed to have been infringed, or, if multiple works are covered by a single notification, a representative list of such works.</li>
            <li>Identification of the material that is claimed to be infringing, with information reasonably sufficient to permit us to locate it on the Site (e.g., the listing URL).</li>
            <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address.</li>
            <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement, made under penalty of perjury, that the above information is accurate, and that you are the copyright owner or authorized to act on the owner&apos;s behalf.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Counter-Notification</h2>
          <p>
            If you believe material you posted was removed or disabled by mistake or misidentification, you may
            submit a counter-notification to our Designated Agent that includes:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Your physical or electronic signature.</li>
            <li>Identification of the material that was removed and its location before removal.</li>
            <li>A statement, under penalty of perjury, that you have a good faith belief the material was removed as a result of mistake or misidentification.</li>
            <li>Your name, address, and telephone number, and a statement consenting to the jurisdiction of the federal court in your district (or, if outside the U.S., an appropriate judicial district), and that you will accept service of process from the person who filed the original takedown notice.</li>
          </ul>
          <p className="mt-3">
            Upon receipt of a valid counter-notification, we may restore the removed material within 10 to 14
            business days, unless the original complaining party first notifies us that they have filed an action
            seeking a court order to restrain the alleged infringer from engaging in infringing activity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-3">Repeat Infringer Policy</h2>
          <p>
            GarageCherries will, in appropriate circumstances and at its sole discretion, disable and/or terminate
            the accounts of users who are determined to be repeat infringers of the intellectual property rights of
            others.
          </p>
        </section>
      </div>
    </div>
  );
}
