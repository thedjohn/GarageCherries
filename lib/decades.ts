import { ENCYCLOPEDIA, EncyclopediaEntry } from './encyclopedia';

export interface DecadeContent {
  slug: string;
  startYear: number;
  endYear: number;
  label: string;
  tagline: string;
  history: string;
  buyingTips: string[];
}

export const DECADES_CONTENT: DecadeContent[] = [
  {
    slug: '1930s',
    startYear: 1930,
    endYear: 1939,
    label: 'The 1930s',
    tagline: 'The golden age of coachbuilt luxury and the birth of streamlined American style.',
    history:
      "The 1930s were defined by contrast — the Great Depression forced many independent automakers out of business, even as the decade produced some of the most extravagant, coachbuilt luxury cars ever built. Streamlined, Art Deco styling took hold industry-wide by mid-decade, replacing the boxy, upright shapes of the 1920s. Cars from this era are true pre-war classics: six-volt electrics, non-synchronized manual transmissions, and mechanical brakes were still standard, and most surviving examples today are treated as investment-grade collectibles rather than drivers.",
    buyingTips: [
      'Pre-war cars require a mechanic with genuine experience on the era — six-volt electrical systems, non-synchro "crash box" manual transmissions, and babbitt bearing engines are fundamentally different from anything built after WWII.',
      'Check wood-framed body sections (common under the sheet metal on many 1930s cars) for rot — this is a distinct failure point that doesn\'t exist on later all-steel unibody or body-on-frame cars.',
      'Parts for 1930s cars are often NOS (new-old-stock) or reproduction-only — confirm what\'s actually available for the specific make and model before assuming a restoration is straightforward.',
      "Verify title and provenance carefully — cars from this era are frequently exhibited, appraised, and sold at a premium for documented history, so paperwork gaps matter more here than on a common postwar classic.",
    ],
  },
  {
    slug: '1940s',
    startYear: 1940,
    endYear: 1949,
    label: 'The 1940s',
    tagline: 'Wartime production halted almost entirely — then the first true postwar redesigns arrived.',
    history:
      "American civilian auto production nearly stopped from 1942 to 1945, as automakers converted factories to build tanks, jeeps, and aircraft for the war effort. The first postwar cars, from 1946 to 1948, were largely warmed-over versions of 1942 designs, since full retooling took years. The real story of the decade is 1949 — the first genuinely new postwar designs from Cadillac, Oldsmobile, and Ford arrived, and are generally considered the true start of the modern American car.",
    buyingTips: [
      'Distinguish clearly between true prewar-design cars (1940–1948, mechanically similar to 1930s cars) and the all-new 1949 "modern" designs — values and mechanical expectations differ significantly between the two.',
      'Flathead engines were still standard through the decade — confirm a seller understands the difference between a period-correct flathead and a later small-block V8 swap, which is common on driver-quality cars from this era.',
      'Six-volt electrical systems remain the norm — ask whether the car has been converted to 12-volt, since this affects both originality value and parts compatibility.',
      'War-effort shortages meant some 1942–1945 civilian cars used substitute materials (like painted trim instead of chrome) — know what\'s original to a given model year before assuming missing chrome is a later modification.',
    ],
  },
  {
    slug: '1950s',
    startYear: 1950,
    endYear: 1959,
    label: 'The 1950s',
    tagline: 'Tailfins, chrome, and the birth of the American V8 horsepower era.',
    history:
      "The 1950s brought postwar prosperity, the Interstate highway system, and the tailfin-and-chrome styling that most people picture when they think \"classic American car\" — a trend that peaked with the 1959 Cadillac's dramatic fins. It's also the decade the overhead-valve V8 went mainstream, replacing the flathead engines of the prior decade, and produced two genre-defining nameplates: the Chevrolet Corvette (1953) and the Ford Thunderbird (1955).",
    buyingTips: [
      'Check floor pans, rocker panels, and trunk floors closely for rust — cars from this era are old enough that hidden corrosion repair is the norm rather than the exception, even on cars that look clean.',
      'Confirm whether the drivetrain is original or a later V8 swap — many 1950s cars were upgraded with later engines and transmissions over the decades, which affects both value and what "correct" parts look like.',
      'Ask about a six-volt to 12-volt electrical conversion, which is extremely common on driver-quality 1950s cars and affects which accessories and parts are compatible.',
      'Chrome trim and glass are often expensive, NOS-only items for this era — price in the cost of sourcing missing or damaged brightwork before assuming a full restoration is affordable.',
    ],
  },
  {
    slug: '1960s',
    startYear: 1960,
    endYear: 1969,
    label: 'The 1960s',
    tagline: 'The muscle car era begins — big engines in mid-size bodies.',
    history:
      "The 1960s gave rise to the muscle car formula that defines the genre today: a large-displacement V8 stuffed into a mid-size body, usually credited to the 1964 Pontiac GTO. The same year brought the Ford Mustang and the entirely new \"pony car\" segment. Through the rest of the decade, automakers raced to one-up each other with factory performance options and increasingly powerful engines, setting up the horsepower peak that would arrive in the early 1970s.",
    buyingTips: [
      'Verify numbers-matching engine and transmission status carefully — 1960s muscle cars are among the most commonly modified, swapped, and "cloned" (dressed up as a higher trim than they actually were) cars in the collector market.',
      'Request a build sheet, broadcast sheet, or fender tag decode where available to confirm factory options actually match what\'s being advertised — factory performance packages carry a real premium, and mismatches are common.',
      'Inspect unibody cars (especially GM A-bodies and early Mopars) closely at the trunk drop-offs, floor pans, and subframe mounting points, which are the most common rust and structural failure points.',
      'Confirm whether a "big block" or performance-package car is genuinely factory-original — a huge share of 1960s muscle cars on the market today have been built up from lower-trim base cars over the years.',
    ],
  },
  {
    slug: '1970s',
    startYear: 1970,
    endYear: 1979,
    label: 'The 1970s',
    tagline: 'Peak horsepower, then emissions regulations reshaped the industry overnight.',
    history:
      "1970 and 1971 marked the true horsepower peak of the muscle car era, right before rising insurance surcharges on high-performance cars and new emissions and safety regulations sharply cut power outputs starting in 1972. The rest of the decade is often called the \"malaise era\" for its detuned engines and softer performance, which is exactly why early-1970s cars remain the most sought-after and valuable of the entire decade.",
    buyingTips: [
      "Know the difference between pre-1972 gross horsepower ratings and post-1972 net horsepower ratings when comparing advertised figures — the same engine can show very different numbers depending on which standard was used.",
      'Confirm the car\'s actual model year against its options — 1970–71 cars command a real premium over otherwise-identical 1972–74 cars specifically because of the compression and power difference.',
      'Catalytic converters and unleaded-fuel requirements began appearing partway through the decade — factor this in if originality of the emissions system matters to you.',
      'Rust protection was often worse on mid-1970s cars than on the 1960s models they replaced — inspect body panels and structural rust points at least as carefully as you would on an older car.',
    ],
  },
  {
    slug: '1980s',
    startYear: 1980,
    endYear: 1989,
    label: 'The 1980s',
    tagline: "The muscle car's quiet comeback, and the rise of the modern sport compact.",
    history:
      "The early 1980s were the low point for American performance, but the decade saw a genuine turnaround by its second half — the 5.0 Mustang, the Buick Grand National and GNX, and the Camaro IROC-Z all proved factory performance was coming back. The decade also produced the first wave of Japanese and German performance imports that are increasingly recognized as collectible today, alongside their American counterparts.",
    buyingTips: [
      'Fuel injection and early onboard engine computers began replacing carburetors through the decade — diagnosing issues on these cars is a different skill set than on a fully carbureted 1960s or 1970s car.',
      'Turbocharged models (like the Buick Grand National or Mustang SVO) need particular attention to boost-related wear on the turbo, intercooler, and related plumbing.',
      'Rust protection improved industry-wide compared to the 1970s, but electrical gremlins tied to early computer control systems are a common and sometimes hard-to-diagnose issue on this era\'s cars.',
      "Confirm aftermarket modifications on turbocharged or high-performance models — boost, timing, and fueling changes were common and aren't always disclosed by sellers.",
    ],
  },
  {
    slug: '1990s',
    startYear: 1990,
    endYear: 1999,
    label: 'The 1990s',
    tagline: "Where \"modern classic\" begins — the first collectible cars built with airbags and fuel injection.",
    history:
      "The 1990s produced genuine performance icons — the Fox-body and SN95 Mustangs, the C4 Corvette ZR-1, the Toyota Supra Turbo, the Acura NSX, the Dodge Viper — that are now firmly established in the collector market. It's also the decade where \"classic car\" started to mean something mechanically different: factory fuel injection, ABS, and airbags were standard, not exotic, marking a real shift point in what buying and maintaining a collectible car actually involves.",
    buyingTips: [
      'These cars are young enough that mileage and documented maintenance history matter more than the originality debates that dominate older-classic shopping.',
      'Check for aftermarket ECU tunes or engine modifications, which are common on this era\'s tuner-friendly platforms and aren\'t always disclosed upfront.',
      'Confirm timing belt and major service intervals have actually been kept up — many 1990s performance cars sat unused for long stretches, and deferred maintenance is common even on low-mileage examples.',
      'Ask specifically about rust in wheel wells and rocker panels on cars from this era that spent time in road-salt climates — a "clean" interior and paint job can still hide serious underbody corrosion.',
    ],
  },
  {
    slug: '2000s',
    startYear: 2000,
    endYear: 2009,
    label: 'The 2000s',
    tagline: 'The first wave of true 21st-century collectibles.',
    history:
      "Cars from the 2000s are only now entering serious collector territory. Limited-production performance models from this decade — early Z06 Corvettes, the first-generation Nissan 350Z, the Dodge Viper SRT-10 — are appreciating as the generation that grew up wanting them starts buying, following the same pattern that made 1980s and 1990s cars collectible a decade or two after they were new.",
    buyingTips: [
      'These are still largely "used cars" mechanically — a proper pre-purchase inspection matters more here than provenance or documentation debates that dominate older-classic shopping.',
      'Verify recall and factory service campaign history is up to date, since many 2000s models had well-documented manufacturer recalls that are worth confirming were actually completed.',
      'Low-mileage examples carry a real premium for this era specifically, since most 2000s cars were driven as daily transportation rather than preserved from new.',
      'Check for accident history and prior modifications through a vehicle history report — these cars are recent enough that this kind of documentation actually exists and is worth checking.',
    ],
  },
  {
    slug: '2010s',
    startYear: 2010,
    endYear: 2019,
    label: 'The 2010s',
    tagline: "Modern performance icons, bought today as tomorrow's classics.",
    history:
      "Buyers are increasingly treating limited-run and high-performance cars from the 2010s as future classics, purchased ahead of the curve rather than after decades of appreciation. The calculus is different here than for older classics — most cars from this decade are still well within their useful mechanical life, so buying one is closer to buying a well-specced used car than acquiring a restoration project.",
    buyingTips: [
      'Focus on documented maintenance and remaining warranty coverage over "originality" debates, which matter far less for a car this age.',
      'For performance and track-capable models, ask directly whether the car was track-driven — service records, tire wear patterns, and brake wear can help confirm what a seller tells you.',
      'Confirm all factory recalls and technical service bulletins have been addressed, which is straightforward to check for cars this recent.',
      'A full vehicle history report is worth the small cost for any car this age — accident and title history are far more reliably documented than on older classics.',
    ],
  },
];

function parseYearRange(years: string): [number, number] {
  const parts = years.split(/[–-]/).map(Number).filter(n => !Number.isNaN(n));
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1) return [parts[0], parts[0]];
  return [0, 0];
}

// Decade history text (especially 1960s/1970s) is written around the American
// muscle car story specifically -- sorting notable models purely alphabetically
// let makes like Alfa Romeo outrank AMC by accident, leading with international
// sports cars on a page about domestic muscle. International classics are still
// genuinely relevant and still shown, just after the domestic makes that match
// the narrative rather than ahead of them by coincidence of the alphabet.
const AMERICAN_MAKES = new Set([
  'AMC', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'DeSoto', 'Dodge', 'Ford',
  'GMC', 'Hudson', 'International', 'Jeep', 'Kaiser', 'Lincoln', 'Mercury', 'Nash',
  'Oldsmobile', 'Packard', 'Plymouth', 'Pontiac', 'Studebaker', 'Tucker', 'Willys',
]);

export function getNotableModelsForDecade(decade: DecadeContent, limit = 6): EncyclopediaEntry[] {
  return ENCYCLOPEDIA
    .filter(entry => {
      const [start, end] = parseYearRange(entry.years);
      return start <= decade.endYear && end >= decade.startYear;
    })
    .sort((a, b) => {
      const aUS = AMERICAN_MAKES.has(a.make) ? 0 : 1;
      const bUS = AMERICAN_MAKES.has(b.make) ? 0 : 1;
      if (aUS !== bUS) return aUS - bUS;
      return a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
    })
    .slice(0, limit);
}

export function getDecadeContent(slug: string): DecadeContent | null {
  return DECADES_CONTENT.find(d => d.slug === slug) ?? null;
}

export function getDecadeSlugs(): string[] {
  return DECADES_CONTENT.map(d => d.slug);
}
