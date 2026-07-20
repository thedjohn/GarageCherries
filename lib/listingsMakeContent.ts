// Short intro copy for /listings/[make] browse pages, keyed by the same
// slug format as toSegment()/lib/encyclopedia.ts's slug() (lowercase, dashes).
// This is a separate, shorter blurb from the Encyclopedia's per-model content
// in lib/encyclopedia.ts -- the two pages target different search intent
// (buying inventory vs. researching history/specs), so this stays brief and
// links to the Encyclopedia entry instead of duplicating it.
export const MAKE_INTROS: Record<string, string> = {
  'amc': 'American Motors Corporation (1954–1987) was an independent automaker known for the Rambler, Javelin, and AMX — and for owning the Jeep brand before Chrysler acquired it.',
  'bmw': 'BMW is a German marque known for sport sedans and coupes; classic models like the 2002 and E30 3 Series remain prized for their handling.',
  'buick': 'Buick is GM’s near-luxury division and one of the oldest American auto brands, known for smooth-riding coupes and sedans.',
  'cadillac': 'Cadillac is GM’s flagship luxury marque, long associated with chrome-laden postwar land yachts and tailfin styling.',
  'chevrolet': 'Chevrolet is GM’s high-volume division and home to some of the most collected American muscle cars, including the Camaro, Chevelle, and Corvette.',
  'chrysler': 'Chrysler is a founding member of Detroit’s "Big Three," known for innovative engineering and full-size postwar cruisers.',
  'datsun': 'Datsun was Nissan’s export badge through 1984, best remembered among collectors for the 240Z sports car.',
  'desoto': 'DeSoto was Chrysler’s mid-priced brand from 1928 to 1961, known for flashy postwar styling before the marque was discontinued.',
  'dodge': 'Dodge is a Chrysler division known for trucks and, later, high-performance muscle cars like the Charger and Challenger.',
  'fiberfab': 'Fiberfab was a 1960s–70s maker of fiberglass-bodied kit cars, popular for building custom hot rods and replicas.',
  'ford': 'Ford is one of the original American automakers, producing everything from the Model T to the Mustang and F-Series trucks.',
  'gmc': 'GMC is GM’s truck-focused division, sharing engineering with Chevrolet but marketed toward a more upscale buyer.',
  'hudson': 'Hudson (1909–1954) was an independent automaker best remembered for its unibody "step-down" design and early stock car racing success.',
  'international': 'International Harvester is known primarily for trucks and the Scout, an early precursor to the modern SUV.',
  'jaguar': 'Jaguar is a British marque celebrated for elegant sports cars and sedans, including the E-Type and XJ series.',
  'jeep': 'Jeep originated the modern 4x4, tracing back to WWII military vehicles and later the CJ and Wrangler lines.',
  'kaiser': 'Kaiser (1946–1955) was an independent postwar automaker known for early unibody construction and safety-forward design.',
  'land-rover': 'Land Rover is a British 4x4 pioneer, producing rugged off-roaders from the original Series I through the Defender.',
  'lincoln': 'Lincoln is Ford’s luxury division, known for the Continental and other large postwar personal luxury cars.',
  'lotus': 'Lotus is a British sports car maker focused on lightweight performance, from the Elan to the Esprit.',
  'mazda': 'Mazda is a Japanese automaker known for the rotary-engined RX-7 and the best-selling Miata roadster.',
  'mercedes': 'Mercedes-Benz is a German luxury marque with a long history of engineering-forward sedans, coupes, and roadsters.',
  'mercury': 'Mercury (1938–2011) was Ford’s mid-priced division, producing upscale variants of Ford models like the Cougar.',
  'mg': 'MG is a British sports car maker known for lightweight, affordable roadsters like the MGB and MGA.',
  'nash': 'Nash (1916–1957) was an independent automaker known for early unibody construction and the compact Rambler, before merging into AMC.',
  'nissan': 'Nissan is a Japanese automaker behind sports cars like the Z-car and Skyline.',
  'oldsmobile': 'Oldsmobile (1897–2004) was GM’s innovation-focused division, credited with the first mass-produced automatic transmission.',
  'packard': 'Packard (1899–1958) was a prestige American luxury marque known for engineering excellence and high-end coachwork.',
  'plymouth': 'Plymouth was Chrysler’s value-priced division, home to muscle cars like the Barracuda and Road Runner.',
  'pontiac': 'Pontiac was GM’s performance-oriented division, credited with launching the muscle car era via the GTO.',
  'porsche': 'Porsche is a German sports car maker best known for the 911, in continuous production since 1963.',
  'ram': 'Ram is the modern Chrysler/Stellantis truck brand, spun off from Dodge in 2010.',
  'studebaker': 'Studebaker (1852–1967) was an independent automaker known for distinctive styling, including the Avanti and Hawk.',
  'tucker': 'Tucker was a short-lived but legendary independent automaker, remembered for the innovative 1948 Tucker 48 — only 51 were built.',
  'volkswagen': 'Volkswagen is a German marque best known among collectors for the air-cooled Beetle and Bus.',
  'willys': 'Willys produced the original military Jeep and later the civilian CJ line, before the brand was absorbed into Jeep.',
};

export function getListingsIntro(makeSlug: string, makeLabel: string): string {
  return MAKE_INTROS[makeSlug]
    ?? `Browse ${makeLabel} classic cars for sale on GarageCherries — new listings added regularly.`;
}
