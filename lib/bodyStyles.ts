export interface BodyStyleContent {
  slug: string;
  label: string; // matches the `body_style` value stored on listings (lib/types.ts BODY_STYLES)
  title: string;
  tagline: string;
  history: string;
  notableModels: { name: string; years: string; blurb: string }[];
  buyingTips: string[];
}

export const BODY_STYLES_CONTENT: BodyStyleContent[] = [
  {
    slug: 'convertibles',
    label: 'Convertible',
    title: 'Classic Convertibles',
    tagline: 'Open-air classics, from big-block muscle to elegant European droptops.',
    history:
      "The convertible has been a fixture of American car culture since the 1920s, but its golden age runs from the postwar years through the early 1970s, when nearly every domestic model line offered a drop-top variant. Rising federal rollover-safety proposals in the early '70s nearly killed the convertible off entirely — most automakers had stopped offering one by 1976 — before a resurgence in the 1980s brought them back for good. Today, convertible variants of muscle cars and postwar classics command a real premium over their hardtop counterparts, since fewer were built and even fewer survive in unmodified condition.",
    notableModels: [
      { name: 'Ford Mustang Convertible', years: '1964½–1973', blurb: "The convertible that arrived alongside the hardtop from day one — a first-generation Mustang droptop remains one of the most recognizable and collectible American convertibles ever built." },
      { name: 'Chevrolet Bel Air Convertible', years: '1955–1957', blurb: "The Tri-Five Bel Air convertible defined 1950s American style, and clean originals are among the most sought-after cars of the era." },
      { name: 'Chevrolet Camaro SS Convertible', years: '1967–1969', blurb: 'A first-generation Camaro convertible pairs muscle-car performance with genuine open-air rarity — factory SS convertibles were a small fraction of total production.' },
      { name: 'Shelby Cobra', years: '1962–1967', blurb: 'Not a factory convertible conversion but a roadster from the ground up — among the most valuable and influential American sports cars of any era.' },
    ],
    buyingTips: [
      "Cycle the top by hand and by motor if power-operated — worn hydraulic pumps, cracked lines, and seized cylinders are common and can be expensive to source for less common models.",
      'Convertibles lose structural rigidity without a fixed roof, so check for cowl shake (a shudder felt through the dash and windshield frame over bumps) as a sign of a car that may need frame or subframe reinforcement.',
      'Inspect the trunk floor, spare tire well, and rear floor pans closely — a failing top seal channels water directly into these areas, and rust here is far more common on convertibles than the equivalent hardtop.',
      'Get an exact match on the top material, boot, and frame bows before assuming a replacement top is a simple bolt-on — many models used year-specific hardware that reproduction tops don\'t always replicate correctly.',
    ],
  },
  {
    slug: 'coupes',
    label: 'Coupe',
    title: 'Classic Coupes',
    tagline: 'Two-door performance and style — the backbone of the American muscle car era.',
    history:
      "The two-door coupe was the default body style for American performance cars through the muscle car era, prized for its lighter weight and stiffer structure compared to a convertible or four-door sedan built on the same platform. Nearly every legendary muscle car — the GTO, the Chevelle SS, the Charger — was built first and foremost as a coupe, with other body styles arriving as variants. That combination of rigidity, lower weight, and factory performance intent is exactly why coupes remain the baseline collectible version of most classic nameplates today.",
    notableModels: [
      { name: 'Pontiac GTO', years: '1964–1974', blurb: "Widely credited with starting the muscle car era outright — a '64-'67 GTO coupe is as close to the original muscle car template as it gets." },
      { name: 'Chevrolet Chevelle SS', years: '1964–1972', blurb: 'The SS coupe, especially with the 396 or 454 big-block, is one of the most consistently strong-value muscle cars in the collector market.' },
      { name: 'Dodge Charger', years: '1966–1974', blurb: "The second-generation (1968-1970) Charger coupe's rounded, coke-bottle styling made it an instant icon, and R/T and Daytona variants remain top-tier collectibles." },
      { name: 'Plymouth Barracuda', years: '1964–1974', blurb: "The third-generation ('Cuda) coupe, especially with a 440 or Hemi, is among the most valuable American muscle cars in existence." },
    ],
    buyingTips: [
      'Check numbers-matching status on the engine and transmission carefully — coupes are the most commonly cloned/re-created body style for high-value nameplates, so a documented build sheet or fender tag verification is worth the effort.',
      'Inspect trunk drop-offs, quarter panels, and floor pans for rust and prior repair — these are the most commonly rusted (and most commonly patched) areas on unibody and body-on-frame coupes alike.',
      'Verify the cowl tag or VIN-decoded options against what the seller claims — factory-optioned performance packages carry a real premium, and mismatches are common on cars that have changed hands many times.',
      'A coupe that has been sitting for years often has more deferred mechanical maintenance than the equivalent well-driven car — budget for brakes, fuel system, and cooling system work even on a car described as "runs and drives."',
    ],
  },
  {
    slug: 'pickup-trucks',
    label: 'Pickup Truck',
    title: 'Classic Pickup Trucks',
    tagline: "From farm workhorses to today's sought-after collector trucks.",
    history:
      "Classic pickups spent decades as simple, disposable work vehicles before collector interest caught up to cars in the last 20 years. Trucks from the 1950s through the early 1970s — built with the same era-appropriate styling as their car counterparts, but far fewer of which survived in original condition — are now among the fastest-appreciating segments of the classic market. A clean, unmodified classic pickup is often genuinely rarer today than an equivalent car from the same model year, simply because so many were used hard and discarded rather than preserved.",
    notableModels: [
      { name: 'Chevrolet C10', years: '1960–1972', blurb: 'The most popular classic truck platform in the collector market today, prized for its simple styling, huge parts availability, and ease of modification.' },
      { name: 'Ford F-100', years: '1953–1956, 1957–1960', blurb: "The Ford counterpart to the C10 — the '53-'56 generation in particular is highly sought after for its rounded, pre-facelift styling." },
      { name: 'Chevrolet Cameo Carrier', years: '1955–1958', blurb: 'A fleetside-bed, car-like trim package that is now one of the rarest and most valuable classic trucks built by any manufacturer.' },
      { name: 'Dodge Li\'l Red Express', years: '1978–1979', blurb: 'A factory high-performance truck built to exploit a loophole in emissions regulations — one of the quickest American vehicles of any kind in 1978.' },
    ],
    buyingTips: [
      'Inspect the bed floor and frame rails closely — classic trucks were work vehicles first, and bed wood, floor pans, and frame rust from hauling and weather exposure are the norm rather than the exception.',
      'Confirm whether a 4x4 conversion is a factory configuration or an aftermarket addition — factory 4x4 trucks carry a real premium, and undisclosed conversions are common.',
      "Check for a matching cab and bed data plate/VIN — trucks were mixed and matched for repairs far more often than cars, so a truck's cab and bed don't always share the same original build.",
      'Budget for brakes and steering components specifically — many classic trucks were built with heavier-duty, work-truck-spec parts that wear differently than a passenger car of the same year.',
    ],
  },
  {
    slug: 'fastbacks',
    label: 'Fastback',
    title: 'Classic Fastbacks',
    tagline: 'The sloping roofline that defined muscle car style — and aerodynamics.',
    history:
      "The fastback body style — a single continuous slope from roofline to rear bumper, with no separate trunk lid break — had its American heyday in the muscle car era, when the shape doubled as both a styling statement and a genuine (if modest) aerodynamic advantage at speed. The 1965 Mustang Fastback (marketed as the \"2+2\") is the model most responsible for popularizing the shape in the U.S. market, and it was quickly followed by fastback variants across nearly every muscle car nameplate through the early 1970s, before more angular, notchback styling took over later in the decade.",
    notableModels: [
      { name: 'Ford Mustang Fastback', years: '1965–1973', blurb: 'The definitive American fastback, and the body style used on the most famous Mustangs of the era, including the Shelby GT350/GT500 and the "Bullitt" car.' },
      { name: 'Dodge Charger', years: '1968–1970', blurb: "The second-generation Charger's flowing fastback roofline is one of the most recognizable silhouettes in American car design." },
      { name: 'Plymouth Barracuda / \'Cuda', years: '1967–1969', blurb: "The second-generation Barracuda's fastback variant is rarer and more distinctive than the notchback coupe that outsold it." },
      { name: 'AMC AMX', years: '1968–1970', blurb: "American Motors' two-seat fastback muscle car — a genuine oddity in the segment, and increasingly recognized as an undervalued collectible." },
    ],
    buyingTips: [
      "Check the rear window seal and trunk floor for water intrusion — a fastback's long, near-horizontal rear glass is more prone to leaking than a conventional notchback's, and trunk floor rust from it is common.",
      'Inspect the headliner and rear parcel shelf for sun and heat damage — the greenhouse area over a fastback\'s sloped roof runs hotter than a notchback\'s, accelerating interior wear.',
      "Verify rear quarter window and hinge mechanisms if the car has flip-out or roll-down rear glass — these are often the first things to stop working and can be difficult to source for less common models.",
      'Confirm the fastback body was original to the car rather than swapped from a donor — cosmetic fastback conversions on notchback cars exist and are difficult to spot without checking the VIN and body tag.',
    ],
  },
];

export function getBodyStyleContent(slug: string): BodyStyleContent | null {
  return BODY_STYLES_CONTENT.find(b => b.slug === slug) ?? null;
}

export function getBodyStyleSlugs(): string[] {
  return BODY_STYLES_CONTENT.map(b => b.slug);
}
