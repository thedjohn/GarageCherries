import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Dodge SRT — The Complete Guide to America's Performance Sub-Brand",
  description: "The history of Dodge's SRT performance division, from the Neon SRT-4 to the 1,025-hp Demon 170 — lineup, notable special editions, and what to know before buying a used SRT.",
  alternates: { canonical: 'https://www.garagecherries.com/cars/srt' },
};

const LINEUP = [
  {
    name: 'Neon SRT-4',
    years: '2003–2005',
    blurb: 'A turbocharged compact that punched far above its price, launching SRT as a genuine performance brand rather than a badge-engineering exercise.',
  },
  {
    name: 'Charger SRT8',
    years: '2006–2014',
    blurb: "The modern Charger's first factory performance flagship, running a 6.1L then 6.4L (392) HEMI V8.",
  },
  {
    name: 'Challenger SRT8',
    years: '2008–2014',
    blurb: 'Revived the Challenger nameplate with genuine factory muscle, building the foundation for the Hellcat era that followed.',
  },
  {
    name: 'Charger & Challenger SRT Hellcat',
    years: '2015–2023',
    blurb: 'A 707-hp supercharged 6.2L HEMI that reignited the American horsepower war and made 700+ hp attainable from a factory showroom.',
  },
  {
    name: 'Durango SRT / SRT Hellcat',
    years: '2018–2023',
    blurb: 'Brought Hellcat power to a three-row SUV — the SRT Hellcat version was, at the time, the most powerful three-row SUV ever built.',
  },
  {
    name: 'Challenger SRT Demon',
    years: '2018',
    blurb: '840 hp, drag-strip legal, and capable of a factory wheelie — came with the "Demon Crate" of dedicated drag-racing parts. One model year only.',
  },
  {
    name: 'Challenger & Charger SRT Hellcat Redeye',
    years: '2019–2023',
    blurb: '797 hp, splitting the difference between Hellcat and Demon, with more of the Demon\'s hardware in a street-legal, everyday package.',
  },
  {
    name: 'Challenger SRT Super Stock',
    years: '2020–2023',
    blurb: 'The highest-horsepower non-Demon Challenger ever offered, built for drag strip duty with Demon-sourced running gear.',
  },
];

const LAST_CALL = [
  { name: 'Challenger SRT Demon 170', detail: '1,025 hp on E85 — the most powerful muscle car ever put into production, and the final word in the Hellcat/Demon story.' },
  { name: 'Challenger Black Ghost', detail: 'A tribute to a legendary, once-mythical street-raced 1970 Challenger R/T SE, reimagined as a modern Hellcat Redeye.' },
  { name: 'Charger King Daytona', detail: 'Widebody Redeye homage to the 1969 Charger Daytona aero cars, with period-correct styling cues.' },
  { name: 'Challenger Shakedown', detail: 'A drag-strip-focused Scat Pack homage to the 1970s Challenger T/A.' },
];

export default function SRTGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: "Dodge SRT — The Complete Guide to America's Performance Sub-Brand",
    description: "The history of Dodge's SRT performance division, its full model lineup, and what to know before buying one used.",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-zinc-500 mb-8 flex gap-2">
        <Link href="/cars" className="hover:text-red-600">Encyclopedia</Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium">SRT</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Performance Sub-Brand</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Dodge SRT</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Street and Racing Technology — Dodge's in-house performance division, responsible for some of the highest-horsepower factory vehicles ever sold in America.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">What SRT Is</h2>
        <p className="text-zinc-600 leading-relaxed mb-4">
          SRT began as an internal Chrysler performance engineering group in the early 2000s, tasked with building genuine factory hot-rod versions of otherwise ordinary models — starting with the turbocharged Neon SRT-4. What started as a badge on a handful of niche models grew into the engineering force behind the Hellcat, Demon, and Redeye era: a run of vehicles that took the modern muscle car further than anyone expected a factory-built, warrantied car could go.
        </p>
        <p className="text-zinc-600 leading-relaxed">
          For a few years around 2011–2014, SRT operated as its own standalone brand rather than a Dodge sub-badge — Viper was briefly sold as "SRT Viper" during this period. It folded back under Dodge shortly after, and by 2023, as the Charger and Challenger platform reached the end of its run ahead of an EV transition, the SRT badge itself was retired in favor of Dodge's "Direct Connection" performance parts and service branding.
        </p>
      </section>

      {/* Lineup */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-5">The Lineup</h2>
        <div className="space-y-4">
          {LINEUP.map(item => (
            <div key={item.name} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <h3 className="font-bold text-zinc-900">{item.name}</h3>
                <span className="text-xs text-zinc-400 whitespace-nowrap">{item.years}</span>
              </div>
              <p className="text-sm text-zinc-600">{item.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Last Call */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">The 2023 "Last Call" Send-Off</h2>
        <p className="text-zinc-600 mb-5">
          As the Charger/Challenger platform's final model year approached, Dodge released seven special-edition "Last Call" models celebrating the car's history — highlighted by the most extreme SRT product ever built.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {LAST_CALL.map(item => (
            <div key={item.name} className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <h3 className="font-bold text-zinc-900 mb-1.5">{item.name}</h3>
              <p className="text-sm text-zinc-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buying tips */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">What to Know Before Buying a Used SRT</h2>
        <p className="text-zinc-500 text-sm mb-5">Key considerations from experienced collectors and owners.</p>
        <div className="space-y-3">
          {[
            { title: 'Supercharger belt service history matters', detail: 'Hellcat and Demon engines depend on a properly maintained supercharger drive belt — ask for service records, not just an odometer reading.' },
            { title: 'Insurance costs are a real ownership factor', detail: '700+ hp factory cars carry meaningfully higher premiums than a standard V8 Challenger or Charger — get a quote before you commit.' },
            { title: 'Verify Demon-specific hardware on a genuine Demon', detail: 'The narrow front tire, wheelie bar, and "Demon Crate" contents are part of what makes a real Demon valuable — confirm authenticity against the build sheet given how much a genuine example is worth versus a Hellcat dressed up to look like one.' },
            { title: 'Widebody vs. narrowbody changes the value equation', detail: 'Widebody cars carry different tire costs and a different market premium — know which you\'re actually looking at.' },
            { title: 'Assume it may be modified until proven otherwise', detail: 'SRT models have a huge aftermarket tuning community. If originality matters to you, verify the car is stock — logged dyno tunes and bolt-on parts are common.' },
            { title: 'Limited editions command real premiums — and get faked', detail: 'Jailbreak packages and Last Call editions (Black Ghost, Demon 170, King Daytona, etc.) sell for significant premiums over a standard Hellcat. Verify build sheet and VIN-specific documentation before paying up for a "special" car.' },
          ].map(tip => (
            <div key={tip.title} className="bg-white border border-zinc-100 rounded-xl p-4">
              <h3 className="font-semibold text-zinc-900 text-sm mb-1">{tip.title}</h3>
              <p className="text-sm text-zinc-600">{tip.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-red-600 rounded-2xl p-6 text-white text-center">
        <p className="font-bold text-lg mb-1">Looking for one?</p>
        <p className="text-sm text-red-100 mb-4">Browse current SRT-badged listings from trusted dealers and private sellers.</p>
        <Link
          href="/listings?q=SRT"
          className="inline-block bg-white text-red-600 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
        >
          View SRT Listings →
        </Link>
      </div>
    </div>
  );
}
