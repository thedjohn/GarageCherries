import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

const GUIDES: Record<string, {
  title: string; subtitle: string; category: string; readTime: string;
  sections: { heading: string; body: string[] }[];
}> = {
  'how-to-buy-a-classic-car-online': {
    title: 'How to Buy a Classic Car Online',
    subtitle: 'A step-by-step guide for first-time and experienced buyers',
    category: 'Getting Started', readTime: '8 min read',
    sections: [
      { heading: 'Start with research, not listings', body: [
        'Before you open a single listing, spend time understanding the specific model you want. What are the common issues? What makes a good example versus a project? What should you expect to pay? The GarageCherries Encyclopedia has detailed buying guides for 20 popular models.',
        'Buyers who research first make better decisions and waste less time on cars that were never right for them. Know what a numbers-matching 1969 Camaro Z28 means before you start reading listings that claim to have one.',
      ]},
      { heading: 'Set a realistic budget — including costs beyond purchase price', body: [
        'The purchase price is only part of what you\'ll spend. Budget for: a professional pre-purchase inspection ($150–400), shipping if buying out of state ($500–1,500 enclosed), insurance (get quotes before you buy), registration and taxes, and immediate mechanical work you\'ll want done after purchase.',
        'A car priced $5,000 below market that needs $8,000 in immediate work is not a deal. Build a realistic total-cost model before you fall in love with a listing.',
      ]},
      { heading: 'Evaluate listings critically', body: [
        'A great listing has many photos including engine bay, underneath, trunk, all four corners, door jams, and the firewall. It describes known issues honestly. It provides documentation: original title, service history, broadcast sheet or Marti Report.',
        'A listing with three photos, vague descriptions like "runs great," and a seller who can\'t answer basic questions about the car\'s history should make you cautious, not excited.',
      ]},
      { heading: 'Hire a professional inspector before committing', body: [
        'If you can\'t inspect the car yourself, hire a qualified pre-purchase inspector. For classic cars, this means someone who specializes in the era — not a general mechanic. AMCI, National Auto Research, and many specialty shops offer this service.',
        'A $300 inspection that reveals hidden rust or a clocked odometer can save you $30,000. Never skip this step on a car you\'re buying sight-unseen.',
      ]},
      { heading: 'Understand the paperwork before you send money', body: [
        'Verify the VIN on the title matches the car. Check the title is clean and in the seller\'s name. For high-value cars, verify authenticity via the appropriate registry (Marti Report for Fords, PHS for Pontiacs, SAAC for Shelby Mustangs).',
        'Wire transfers are standard for classic car purchases but use them carefully. Never wire money before receiving all documentation and agreeing on the inspection results.',
      ]},
    ],
  },
  'pre-purchase-inspection-checklist': {
    title: 'Pre-Purchase Inspection: The Complete Checklist',
    subtitle: "What to check before you hand over a check",
    category: 'Inspection', readTime: '10 min read',
    sections: [
      { heading: 'Body and paint', body: [
        'Walk the entire car in bright light. Look for color inconsistencies, orange peel texture differences, and panel gaps that don\'t align. Inconsistent gaps or ripples in the bodywork suggest prior accident damage.',
        'Check all four wheel arches, the lower rocker panels, the bottom of the doors, the lower rear quarters (especially on A and B-body GM cars), the trunk floor, and the floor pans under the carpet. Probe suspicious areas with a magnet — Bondo won\'t attract it.',
      ]},
      { heading: 'Frame and structure', body: [
        'Get under the car with a flashlight. Look for rust, cracks, and evidence of welding on the frame rails. Body-on-frame cars should have straight, unkinked frame rails front to rear.',
        'Check the torque boxes on Mustangs, the frame rails on B-body Mopars, and the subframe connectors on any unibody car. Bent or repaired frame components indicate a prior collision.',
      ]},
      { heading: 'Engine and drivetrain', body: [
        'A cold engine startup tells you more than a warm one. Blue smoke on startup indicates worn valve seals; persistent blue smoke means rings. White smoke is coolant. Black smoke is a rich fuel mixture.',
        'Check for oil leaks around the valve covers, pan gasket, and rear main seal. Look for fresh oil that might be covering a leak. Check the coolant level and look inside the radiator cap for a milky residue that would indicate a head gasket leak.',
        'Drive the car. Listen for clunks in the drivetrain, vibrations at highway speed, and any hesitation or misfires. Test the brakes hard in a safe location.',
      ]},
      { heading: 'Electrical systems', body: [
        'Check every gauge, switch, and accessory. Turn signals, headlights, backup lights, interior lights. Air conditioning if equipped. Power windows and locks if present.',
        'Look for aftermarket wiring, spliced wires, and taped connections in the engine bay. Sloppy electrical work is a red flag for the car\'s maintenance history overall.',
      ]},
      { heading: 'Documentation review', body: [
        'Verify the VIN on the dash, door jam, and firewall all match the title. Check the partial VIN stamped on the engine block matches. Mismatched numbers significantly affect value.',
        'For muscle cars, demand the broadcast sheet or equivalent documentation. This is the factory build record that proves what options the car left the factory with.',
      ]},
    ],
  },
  'questions-to-ask-a-classic-car-dealer': {
    title: '20 Questions to Ask Before You Buy',
    subtitle: "What every serious buyer should know before making an offer",
    category: 'Due Diligence', readTime: '5 min read',
    sections: [
      { heading: 'History questions', body: [
        '1. How long have you owned the car, and how did you acquire it?\n2. Do you have the title in hand, and is it in your name?\n3. Is there a known accident history?\n4. Do you have any service records or maintenance history?\n5. Has this car ever been restored? If so, who did the work and when?',
      ]},
      { heading: 'Authenticity questions', body: [
        '6. Do the VIN numbers on the dash, firewall, and door jam all match?\n7. Is the engine original to the car (numbers matching)?\n8. Is there a broadcast sheet, Marti Report, or equivalent factory documentation?\n9. Has this car ever been through a registry or club certification?\n10. What documentation supports the option claims in the listing?',
      ]},
      { heading: 'Condition questions', body: [
        '11. What are the known mechanical issues?\n12. When were the brakes last serviced?\n13. Has the cooling system been flushed and is the thermostat correct?\n14. What was the last time the fuel system was serviced (carburetor, fuel lines, tank)?\n15. Is there any rust you haven\'t mentioned in the listing?',
      ]},
      { heading: 'Transaction questions', body: [
        '16. Will you allow a pre-purchase inspection by my independent mechanic?\n17. Is the price negotiable, and what would it take for us to make a deal today?\n18. What payment methods do you accept?\n19. Will you help coordinate shipping, or is pickup only?\n20. Is there anything about this car I should know that\'s not in the listing?',
      ]},
      { heading: 'Why question 20 matters most', body: [
        'The last question is the most important. A honest seller will answer it with specifics — "the passenger door needs an adjustment," "the radio doesn\'t work," "there\'s a small rust spot under the passenger rear carpet." A seller who says "nothing, it\'s perfect" on a 50-year-old car is either not being honest or hasn\'t looked closely enough.',
      ]},
    ],
  },
  'classic-car-red-flags': {
    title: 'Red Flags: When to Walk Away',
    subtitle: "Signs that a listing, seller, or car isn't what it claims to be",
    category: 'Safety', readTime: '7 min read',
    sections: [
      { heading: 'Listing red flags', body: [
        'Too few photos — especially no engine bay, trunk, undercarriage, or door jams. If a seller won\'t show it, assume there\'s a reason.',
        'Vague descriptions that repeat the obvious without specifics: "runs and drives great," "solid car," "a real head turner." Real listings describe what\'s actually there.',
        'Stock photos or photos clearly not of the actual car.',
        'An unusually low price with a complicated explanation (estate sale, divorce, overseas deployment, moving quickly).',
      ]},
      { heading: 'Seller red flags', body: [
        'A seller who can\'t answer basic questions about the car\'s history — what year they bought it, who the previous owner was, when basic maintenance was done.',
        'Pressure to close quickly without allowing an inspection.',
        'Requests to wire money before documentation is exchanged.',
        'A seller who is vague about their location or wants to handle everything via email with no phone calls.',
        'A title that\'s not in the seller\'s name (third-party title situations can lead to lien or fraud issues).',
      ]},
      { heading: 'Vehicle red flags', body: [
        'Mismatched VIN numbers between the dash, door jam, firewall, and engine block.',
        'Fresh paint on only part of the car — often a sign of accident repair that the seller hasn\'t disclosed.',
        'Rust that\'s been covered with undercoating, Bondo, or paint.',
        'A recently steam-cleaned engine bay (can hide leaks and make spotting original finishes impossible).',
        'A car claiming to be a rare variant (HEMI, Z28, LS6, Shelby) without documentation. Clone cars are far more common than the genuine articles.',
      ]},
      { heading: 'When to walk away', body: [
        'If an inspection reveals hidden rust, a non-original drivetrain, or undisclosed accident damage — especially if the seller knew and didn\'t disclose it — walk away. The right car is out there. The wrong car at any price is money poorly spent.',
        'Trust your instincts. If something feels off about the seller, the transaction structure, or the car\'s story, it usually is.',
      ]},
    ],
  },
  'how-to-negotiate-classic-car-price': {
    title: 'How to Negotiate a Classic Car Price',
    subtitle: 'Strategies that actually work — without burning the relationship',
    category: 'Negotiation', readTime: '6 min read',
    sections: [
      { heading: 'Understand the seller\'s psychology', body: [
        'Most classic cars are sold by people who have owned them for years and have emotional attachment to them. They\'re not motivated by maximizing return — they\'re motivated by finding the right buyer who will appreciate and care for the car.',
        'The best negotiations treat the seller as a partner, not an adversary. Express genuine interest. Ask about the car\'s history. Let them tell you about it. A seller who likes you will be more flexible on price.',
      ]},
      { heading: 'Do your research before making an offer', body: [
        'Know what comparable cars sell for. Use GarageCherries, Bring a Trailer completed auctions, Hagerty valuation, and NADA Guides. A well-researched offer backed by data is more persuasive than a number pulled from thin air.',
        'Identify legitimate reasons to negotiate: deferred maintenance items from the inspection, parts that need attention, the cost of bringing the car to your standards. These are concrete points, not just "I want a lower price."',
      ]},
      { heading: 'How to structure your offer', body: [
        'Start within 10–15% of asking price for a well-priced car. An opening offer that\'s 30% below asking will insult most sellers and end the conversation.',
        'Present your offer with reasons. "I love the car, but the inspection found the carburetor needs rebuilding and one front caliper is seized — based on that work, my offer is X." This is respectful and data-driven.',
        'Be prepared to walk. The willingness to walk away is your most powerful negotiating tool. Don\'t let urgency or emotional attachment eliminate it.',
      ]},
      { heading: 'If they won\'t negotiate on price', body: [
        'Ask for other concessions: fresh safety inspection, delivery rather than pickup, a short-term warranty on specific items, or a contribution to known repair costs.',
        'Sometimes the price is fair and the car is worth it. Not every negotiation should end below asking price.',
      ]},
    ],
  },
  'classic-car-shipping-guide': {
    title: 'Shipping a Classic Car: What You Need to Know',
    subtitle: 'Enclosed vs. open transport, how to choose a transporter, and what to document',
    category: 'Logistics', readTime: '6 min read',
    sections: [
      { heading: 'Enclosed vs. open transport', body: [
        'Open transport is cheaper ($400–800 for 500 miles) and accounts for the vast majority of all vehicle transport. Your car sits on an open multi-car carrier exposed to weather, road debris, and other vehicles\' exhaust.',
        'Enclosed transport ($900–1,600 for 500 miles) puts your car in a fully enclosed trailer. Required for show cars and very high-value vehicles. Strongly recommended for any car worth over $40,000.',
        'For daily-driver classics in the $15,000–40,000 range, open transport is typically acceptable. For anything irreplaceable or above $40,000, pay for enclosed.',
      ]},
      { heading: 'How to choose a transporter', body: [
        'Use only licensed, bonded carriers. Verify their MC (Motor Carrier) number at the FMCSA (Federal Motor Carrier Safety Administration) website.',
        'Get three quotes. Be skeptical of prices significantly below the market — low prices often indicate a broker who will shop your shipment to the cheapest carrier available.',
        'Uship, Montway, and Intercity Lines are established names in the market. For ultra-high-value cars, specialty transporters like Reliable Carriers offer white-glove service.',
      ]},
      { heading: 'What to document before shipping', body: [
        'Photograph every panel, every scratch, every dent, every ding — inside and outside — before the transporter picks up the car. Send the photos to yourself immediately to timestamp them.',
        'Walk the car with the driver and note every existing mark on the Bill of Lading. This document is your primary tool if a claim becomes necessary.',
        'Drain the fuel tank to less than a quarter tank. Remove personal items. Check that the battery is disconnected if the car won\'t be started.',
      ]},
      { heading: 'What to do on delivery', body: [
        'Inspect the car thoroughly before signing any delivery paperwork. Do not sign a clean bill of lading if there is any damage.',
        'Document any damage in photos immediately and note it on the bill of lading before the driver leaves.',
        'File a claim promptly — most carriers have short windows (24–72 hours) for reporting damage.',
      ]},
    ],
  },
};

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return { title: 'Not Found' };
  return {
    title: guide.title,
    description: guide.subtitle,
    alternates: { canonical: `https://www.garagecherries.com/guides/${slug}` },
  };
}

export async function generateStaticParams() {
  return Object.keys(GUIDES).map(slug => ({ slug }));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  const CATEGORY_COLORS: Record<string, string> = {
    'Getting Started': 'bg-blue-100 text-blue-700', 'Inspection': 'bg-amber-100 text-amber-700',
    'Due Diligence': 'bg-green-100 text-green-700', 'Safety': 'bg-red-100 text-red-700',
    'Negotiation': 'bg-purple-100 text-purple-700', 'Logistics': 'bg-zinc-100 text-zinc-600',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
        <Link href="/guides" className="hover:text-red-600 transition-colors">Buyer's Guides</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-zinc-700 line-clamp-1">{guide.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[guide.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {guide.category}
          </span>
          <span className="text-xs text-zinc-400">{guide.readTime}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-3">{guide.title}</h1>
        <p className="text-xl text-zinc-500">{guide.subtitle}</p>
      </div>

      {/* Content */}
      <div className="prose prose-zinc max-w-none">
        {guide.sections.map((section, i) => (
          <section key={i} className="mb-10">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">{section.heading}</h2>
            {section.body.map((para, j) => (
              <p key={j} className="text-zinc-600 leading-relaxed mb-3 whitespace-pre-line">{para}</p>
            ))}
          </section>
        ))}
      </div>

      {/* Nav */}
      <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between">
        <Link href="/guides" className="text-sm text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Guides
        </Link>
        <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
          Browse Listings →
        </Link>
      </div>
    </div>
  );
}
