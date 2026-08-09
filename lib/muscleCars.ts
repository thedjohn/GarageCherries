// "Muscle car" isn't a body style (see lib/bodyStyles.ts's BODY_STYLES_CONTENT,
// which filters on the exact `body_style` column value) -- it's a category that
// spans several makes and models, so it needs its own make+model-prefix filter
// list rather than a single body_style match.
export const MUSCLE_CAR_FILTER: { make: string; modelPrefixes: string[] }[] = [
  { make: 'Chevrolet', modelPrefixes: ['Camaro', 'Chevelle', 'El Camino'] },
  { make: 'Ford', modelPrefixes: ['Mustang', 'Torino', 'Fairlane', 'Ranchero'] },
  { make: 'Dodge', modelPrefixes: ['Charger', 'Challenger', 'Coronet', 'Super Bee'] },
  { make: 'Plymouth', modelPrefixes: ['Barracuda', 'Road Runner', 'GTX', 'Superbird', 'Duster'] },
  { make: 'Pontiac', modelPrefixes: ['GTO', 'Firebird'] },
  { make: 'AMC', modelPrefixes: ['AMX', 'Javelin', 'Rebel Machine', 'SC/Rambler', 'Matador Machine', 'Hornet'] },
  { make: 'Mercury', modelPrefixes: ['Cougar', 'Cyclone'] },
  { make: 'Oldsmobile', modelPrefixes: ['4-4-2', '442'] },
  { make: 'Buick', modelPrefixes: ['GSX', 'Skylark', 'Grand National', 'Regal'] },
  { make: 'Shelby', modelPrefixes: ['Cobra', 'Mustang'] },
];

export const MUSCLE_CARS_CONTENT = {
  slug: 'muscle-cars',
  title: 'Muscle Cars For Sale',
  tagline: 'American V8 performance icons — from the original 1964 GTO to the last true big-block classics.',
  history:
    "\"Muscle car\" generally refers to a mid-size American two-door built around a large, high-output V8 — a formula usually traced to the 1964 Pontiac GTO, which proved a full-size performance engine could be dropped into a lighter intermediate body for a genuinely fast, relatively affordable car. Every major domestic manufacturer followed with its own take through the late 1960s and early 1970s: the Chevelle SS, the Road Runner, the Charger R/T, the Mustang and Camaro (technically \"pony cars,\" close cousins built on a smaller platform). Rising insurance premiums, tightening emissions standards, and the 1973 oil crisis effectively ended the era by the mid-1970s, though a handful of nameplates carried the spirit forward. Today, well-documented, numbers-matching examples from the 1964–1972 peak years remain some of the most actively collected American cars.",
  notableModels: [
    { name: 'Pontiac GTO', years: '1964–1974', blurb: "Widely credited with starting the muscle car era outright — the original 1964–67 GTO is as close to the template as it gets." },
    { name: 'Chevrolet Chevelle SS', years: '1964–1972', blurb: 'The 1970 SS454 LS6 is considered by many the high-water mark of the entire muscle car era.' },
    { name: 'Chevrolet Camaro', years: '1967–1981', blurb: "Chevrolet's pony-car answer to the Mustang, with the Z28 and COPO ZL1 among its most collectible performance variants." },
    { name: 'Dodge Charger', years: '1966–1974', blurb: "The second-generation (1968–70) Charger's coke-bottle styling made it an instant icon; R/T and Daytona variants remain top-tier collectibles." },
    { name: 'Plymouth Road Runner', years: '1968–1980', blurb: 'Built deliberately stripped-down and affordable compared to the GTX, proving raw performance could be sold on a budget.' },
    { name: 'Ford Mustang', years: '1964½–1973', blurb: 'The pony car that started the segment, with genuine muscle-car performance in GT, Boss 302/429, and Shelby-built variants.' },
    { name: 'Oldsmobile 4-4-2', years: '1964–1980', blurb: "Oldsmobile's entry, praised for handling as well as straight-line speed — the W-30 Force-Air package is particularly sought after." },
    { name: 'AMC AMX', years: '1968–1970', blurb: "American Motors' two-seat muscle car — a genuine oddity in the segment, increasingly recognized as undervalued." },
  ],
  buyingTips: [
    'Verify numbers-matching engine/transmission before paying a premium — muscle cars are among the most commonly cloned or re-created vehicles in the hobby, given how much a documented factory performance package affects value.',
    'Get the broadcast sheet, fender tag, or cowl tag decoded, and cross-check it against what the seller claims — factory-optioned performance packages (specific engines, axle ratios, trim) carry a real premium, and mismatches are common on cars that have changed hands many times.',
    'Inspect trunk floor, floor pans, and quarter panels for rust and prior repair — these are 50+ year old unibody and body-on-frame cars, and structural rust is the norm on unrestored examples, not the exception.',
    'Confirm whether the car has been modified from its original specification (engine swap, non-original paint code, added trim) — a well-done resto-mod isn\'t a bad car, but it\'s priced and valued differently than a numbers-matching original.',
  ],
};
