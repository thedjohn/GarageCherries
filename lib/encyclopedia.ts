export interface EncyclopediaEntry {
  make: string;
  model: string;
  years: string;
  tagline: string;
  overview: string;
  history: string[];
  specs: { label: string; value: string }[];
  notableVersions: { name: string; description: string }[];
  buyingTips: { title: string; detail: string }[];
  priceRange: { project: string; driver: string; show: string };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getEntry(makeSlug: string, modelSlug: string): EncyclopediaEntry | null {
  return ENCYCLOPEDIA.find(e => slug(e.make) === makeSlug && slug(e.model) === modelSlug) ?? null;
}

export function getEntriesByMake(makeSlug: string): EncyclopediaEntry[] {
  return ENCYCLOPEDIA.filter(e => slug(e.make) === makeSlug);
}

export function getMakeSlugs(): string[] {
  return [...new Set(ENCYCLOPEDIA.map(e => slug(e.make)))];
}

export function getMakeLabel(makeSlug: string): string | null {
  return ENCYCLOPEDIA.find(e => slug(e.make) === makeSlug)?.make ?? null;
}

export const ENCYCLOPEDIA: EncyclopediaEntry[] = [
  {
    make: 'Chevrolet',
    model: 'Camaro',
    years: '1967–1981',
    tagline: "Chevrolet's answer to the Mustang that became an icon in its own right.",
    overview: "Launched September 29, 1966 as a 1967 model, the Camaro immediately became the benchmark for American pony cars. Its combination of aggressive styling, diverse engine options from inline-six to 427 big-block, and legendary performance variants like the Z28 and COPO have made it one of the most collectible American cars ever built.",
    history: [
      "Chevrolet introduced the Camaro to directly challenge Ford's dominant Mustang. The first-generation car (1967–1969) offered an extraordinary range of powertrains — from thrifty inline-sixes to the 396 and 427 big-block V8s used in the COPO racers. The 1969 model year is the most sought-after first-gen, featuring revised styling and the legendary ZL1 variant of which only 69 were built.",
      "The second generation (1970–1981) debuted with dramatically revised bodywork designed by Bill Mitchell's studio — longer, lower, and distinctly European in character. The 1970½–1973 cars are the most valuable second-gen examples; post-1974 models suffered power losses from tightening emissions regulations. The Z28 was revived in 1977, bringing renewed performance focus to the nameplate just as the muscle car era was ending.",
    ],
    specs: [
      { label: 'Engine options', value: '230 I6, 302, 327, 350, 396, 427, 454 V8' },
      { label: 'Horsepower', value: '140–375 hp (pre-1972 gross)' },
      { label: 'Wheelbase', value: '108 in' },
      { label: 'Weight', value: '3,295–3,585 lbs' },
      { label: 'Transmission', value: '3-spd, 4-spd manual; TH350/400 auto' },
      { label: '0–60 (Z28)', value: 'approx. 6.0 seconds' },
    ],
    notableVersions: [
      { name: 'Z28 (1967–69)', description: '302 V8 built for Trans-Am racing homologation, 290 hp. One of the most collectible Camaros.' },
      { name: 'SS396 (1967–69)', description: '396 big-block with 325–375 hp, the performance halo of the first generation.' },
      { name: 'COPO ZL1 (1969)', description: 'All-aluminum 427 V8 installed by Central Office Production Order. Fewer than 70 were built.' },
      { name: 'Rally Sport (RS)', description: 'Appearance package with hidden headlights, available on any engine/trim combination.' },
    ],
    buyingTips: [
      { title: 'Inspect the cowl for rust', detail: 'The firewall area below the windshield is the #1 hidden rust location on first-gen Camaros. Probe every inch before buying.' },
      { title: 'Verify the partial VIN stamp', detail: 'The partial VIN stamped on the engine block must match the dash plate. Mismatched numbers drop resale value significantly.' },
      { title: 'Demand the broadcast sheet', detail: 'SS and Z28 models were frequently cloned from base cars. The broadcast sheet or Protect-O-Plate is the primary authenticity document.' },
      { title: 'Check floor pans and trunk floor', detail: 'Both rust regularly on first-gen cars. Probe with a screwdriver — soft spots mean replacement is needed.' },
      { title: 'Second-gen rear quarter rust', detail: '1970–73 cars rust at the lower sail panel of the rear quarters. This area is expensive to repair correctly.' },
    ],
    priceRange: { project: '$8,000–$22,000', driver: '$22,000–$65,000', show: '$65,000–$200,000+' },
  },
  {
    make: 'Chevrolet',
    model: 'Corvette',
    years: '1953–1982',
    tagline: "America's only true sports car, built in fiberglass since day one.",
    overview: "The Corvette has been in continuous production since 1953, making it the longest-running sports car nameplate in American history. The C2 Sting Ray (1963–1967) and early C3 (1968–1972) represent the peak of collector demand, with the 1963 split-window coupe and L88-equipped cars among the most valuable American automobiles ever made.",
    history: [
      "The first-generation Corvette (1953–1962) debuted at the GM Motorama show and went into production the same year with a fiberglass body — revolutionary for an American production car. Early C1s used a straight-six and Powerglide automatic. The 1955 addition of a V8 transformed the car entirely, and by the early 1960s the C1 with its 327 V8 was a genuine world-class performance machine.",
      "The C2 Sting Ray (1963–1967), designed by Bill Mitchell and Larry Shinoda, is widely considered the most beautiful American car ever produced. The 1963 split-window fastback coupe appeared for one year only before customer pressure led to a one-piece rear window. Fewer than 250 L88-equipped Corvettes were ever produced across the 1967–69 model years; those cars are among the rarest American collectibles.",
      "The C3 (1968–1982) carried the Sting Ray styling language into a more dramatic package. Early C3s (1968–72) with big-block engines — particularly the LS6 454 — are highly collectible. Later emissions-restricted examples (1975–82) are more affordable entry points into Corvette ownership.",
    ],
    specs: [
      { label: 'Engine options', value: '235 I6, 265–350 V8, 396–454 big-block V8' },
      { label: 'Horsepower', value: '150–560 hp (LS6 454)' },
      { label: 'Wheelbase', value: '98 in (C2/C3)' },
      { label: 'Weight', value: '3,100–3,450 lbs' },
      { label: 'Transmission', value: '3/4-spd manual, Powerglide, TH350/400' },
      { label: '0–60 (L88)', value: 'under 5 seconds' },
    ],
    notableVersions: [
      { name: '1963 Split-Window Coupe', description: 'One-year-only design with divided rear window. The most valuable production C2.' },
      { name: 'L88 (1967–69)', description: '427 rated at 430 hp (actual output ~540 hp). Required racing fuel. Fewer than 200 produced.' },
      { name: 'LT-1 (1970–72)', description: '350 small-block with solid lifter cam, 370 hp. Preferred by handling purists over the big-blocks.' },
      { name: '1978 Pace Car', description: 'Limited edition commemorating the 25th anniversary and Indianapolis 500 pace car duties.' },
    ],
    buyingTips: [
      { title: 'Inspect every body panel for delamination', detail: 'Fiberglass panels are expensive to repair properly. Look for cracks, spider webbing, and soft spots indicating moisture damage.' },
      { title: 'Check the birdcage frame structure', detail: 'Frame rust under the body is critical and common on outdoor-stored cars. The birdcage repair is a major restoration expense.' },
      { title: 'Verify engine number location by year', detail: 'Stamp location varies by year — research the correct location before buying. Numbers-matching engines are essential for value.' },
      { title: 'Windshield frame and A-pillar rust', detail: 'Common on cars that sat outside. Inspect the steel structure around the windshield opening carefully.' },
      { title: 'L88 and high-option clones are common', detail: 'Rare, high-value Corvettes are frequently faked. Thorough documentation and registry verification is non-negotiable.' },
    ],
    priceRange: { project: '$12,000–$35,000', driver: '$35,000–$90,000', show: '$90,000–$600,000+' },
  },
  {
    make: 'Chevrolet',
    model: 'Chevelle',
    years: '1964–1977',
    tagline: 'The muscle car that peaked with the most powerful engine ever offered in a production American car.',
    overview: "The Chevelle represented Chevrolet's A-body intermediate and spawned some of the most powerful muscle cars ever built. The 1970 SS454 LS6, conservatively rated at 450 hp, is widely considered the pinnacle of the muscle car era and remains one of the most valuable collectible GM vehicles.",
    history: [
      "Introduced in 1964 on GM's A-body platform, the Chevelle filled the gap between the full-size Impala and the compact Chevy II. The first generation (1964–67) established the nameplate, but it was the restyled 1968–72 second generation where the Chevelle found its identity as a performance car. The SS (Super Sport) package could be ordered with engines up to the 396 big-block.",
      "The 1970 model year brought the LS6 454 V8 — the most powerful engine ever offered in a production American muscle car. Rated conservatively at 450 hp, real-world output often exceeded 500 hp. This was the last gasp of the raw muscle car era; insurance costs and emissions regulations quickly ended the era of big-block A-body intermediates.",
    ],
    specs: [
      { label: 'Engine options', value: '194–250 I6, 283–396, 402, 454 V8' },
      { label: 'Horsepower', value: '120–450 hp (LS6)' },
      { label: 'Wheelbase', value: '112 in' },
      { label: 'Transmission', value: '3/4-spd manual, Powerglide, TH350/400' },
      { label: 'Production peak', value: '1970 SS454 LS6' },
    ],
    notableVersions: [
      { name: 'SS396 (1966–69)', description: 'Super Sport package with 396 big-block, 325–375 hp.' },
      { name: 'SS454 LS6 (1970)', description: '450 hp, the absolute peak of muscle car performance. Numbers-matching examples are the most valuable Chevelles.' },
      { name: 'Z16 (1965)', description: 'Prototype-level limited production 375 hp 396 car. Fewer than 200 built; the rarest Chevelle.' },
      { name: 'Malibu', description: 'The base/luxury trim, more affordable and plentiful entry point to the Chevelle nameplate.' },
    ],
    buyingTips: [
      { title: 'Lower rear quarters are rust-prone', detail: 'On 1968–72 models, the rear quarters, trunk floor, and tailpan are extremely common rust areas — budget for repair on most examples.' },
      { title: 'Verify SS and LS6 authenticity', detail: 'Use the partial VIN stamp on the engine block and the trim tag codes. LS6 cars carry a massive premium and are frequently faked.' },
      { title: 'Inspect forward frame rails', detail: 'Frame rails forward of the front crossmember rust from the inside out. A frame straightening bill can be substantial.' },
      { title: 'Third-gen cars (1973–77) have limited upside', detail: 'The heavier, federally-bumpered 1973–77 Chevelles are significantly less valuable but are more available and affordable for drivers.' },
    ],
    priceRange: { project: '$10,000–$28,000', driver: '$28,000–$75,000', show: '$75,000–$250,000+' },
  },
  {
    make: 'Chevrolet',
    model: 'Nova',
    years: '1962–1979',
    tagline: 'Lightweight, simple, and capable of handling big-block power — the drag racer\'s favorite Chevy.',
    overview: "The Nova began as an economy compact and evolved into one of the most practical and affordable muscle cars. Its light weight, strong aftermarket support, and compatibility with the full Chevrolet engine lineup have made it a perennial favorite with performance enthusiasts and drag racers.",
    history: [
      "The Nova launched in 1962 as the Chevy II Nova, intended as a conventional economy car. The second generation (1966–67) was the last of the compact Nova. The third generation (1968–74) is the most collectible — it adopted the Camaro's F-body suspension geometry and could be ordered with V8 engines up to the 396. The SS package and the 375 hp L78 396 made it a formidable street car in a lightweight package. The fourth generation (1975–79) lacks collector interest.",
    ],
    specs: [
      { label: 'Engine options', value: '153–250 I6, 283–396 V8' },
      { label: 'Horsepower', value: '90–375 hp' },
      { label: 'Wheelbase', value: '111 in' },
      { label: 'Weight', value: '~3,200 lbs (V8 coupe)' },
      { label: 'Transmission', value: '3/4-spd manual, Powerglide, TH350' },
    ],
    notableVersions: [
      { name: 'SS350 / SS396 (1968–72)', description: 'Super Sport package with bucket seats, upgraded suspension, and up to 375 hp.' },
      { name: 'L78 396 (1969)', description: '375 hp big-block in a 3,200-lb car — one of the best performance-per-dollar options of the era.' },
      { name: 'COPO Nova (1969)', description: 'Factory-built drag car with aluminum big-blocks. Extremely rare, extremely valuable.' },
      { name: 'Yenko Nova (1969)', description: 'Dealer-installed 427 transplants by Yenko Chevrolet. Approximately 37 produced.' },
    ],
    buyingTips: [
      { title: 'Floor pans rust through', detail: 'Rockers and floor pans are the primary rust issues. Budget for replacement on most project cars.' },
      { title: 'Parts sharing with Camaro', detail: 'Third-gen cars (1968–74) share many parts with the F-body Camaro, improving availability and reducing restoration costs.' },
      { title: 'Verify SS trim authenticity', detail: 'High-performance trims are easily faked. The broadcast sheet (also called the "trim tag") is essential for confirming factory options.' },
      { title: 'Six-cylinder cars make great restomods', detail: 'Inline-six base cars are cheap, rust-free examples that accept any small-block V8. Ideal for a clean build.' },
    ],
    priceRange: { project: '$4,000–$14,000', driver: '$14,000–$40,000', show: '$40,000–$90,000' },
  },
  {
    make: 'Chevrolet',
    model: 'Impala',
    years: '1958–1976',
    tagline: "Chevrolet's flagship full-size — the best-selling car in America and a cultural icon.",
    overview: "The Impala was Chevrolet's top-of-the-line full-size car and one of the most culturally significant American automobiles. The 1958–1964 models with their dramatic styling, the SS409 performance package, and the full-size convertibles are among the most sought-after collector cars from the era.",
    history: [
      "Introduced as a top-trim option in 1958 and given its own series in 1959, the Impala immediately became a status symbol. The 1959's dramatic bat-wing rear fins represent the high-water mark of American styling excess. The clean-lined 1961–64 Impalas — particularly the 'bubbletop' hardtop — are today's most collected examples. The SS (Super Sport) package arrived in 1961, and when the 409 V8 was added, The Beach Boys immortalized the combination.",
      "By 1965, the full-size Impala was the best-selling car in America, a position it held for years. The 1965–70 models are more affordable and widely available. The 1971–76 cars grew larger and heavier under federal bumper mandates and have less collector appeal, though they remain comfortable drivers.",
    ],
    specs: [
      { label: 'Engine options', value: '235–250 I6, 283–454 V8 (including 409)' },
      { label: 'Horsepower', value: '135–425 hp' },
      { label: 'Wheelbase', value: '119 in (1958–70), 121.5 in (1971–76)' },
      { label: 'Transmission', value: 'Powerglide, TH350/400, 3/4-spd manual' },
    ],
    notableVersions: [
      { name: 'SS409 (1961–65)', description: '409 cubic inch V8, 340–425 hp. Immortalized by The Beach Boys in their 1962 hit "409."' },
      { name: '1958 Convertible', description: 'The first Impala model year. Dramatic chrome and jet-age styling, highly sought-after.' },
      { name: '1961–64 Bubbletop', description: 'Clean hardtop roofline without a B-pillar. The definitive Impala profile for collectors.' },
      { name: 'SS427 (1967–69)', description: '427 big-block in the full-size body. Rare, fast, and undervalued compared to A-body muscle cars.' },
    ],
    buyingTips: [
      { title: 'Full-size floors need careful inspection', detail: 'Full-size GM cars have extensive floor and trunk areas — inspect every square inch for rust before committing.' },
      { title: 'Convertible mechanisms are complex', detail: "Top mechanisms on 1958–64 convertibles are expensive to rebuild. A non-functioning top should factor into your offer price." },
      { title: '409 parts are scarcer', detail: 'The 409 engine is rare and harder to source than small-block Chevys. Budget for that in a restoration.' },
      { title: 'Chrome restoration is expensive', detail: 'The extensive chrome trim on 1958–64 cars is often pitted. A full chrome restoration can run $5,000–$15,000.' },
    ],
    priceRange: { project: '$6,000–$18,000', driver: '$18,000–$45,000', show: '$45,000–$120,000' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    years: '1964–1973',
    tagline: 'The original pony car — sold 400,000 units in its first year and never looked back.',
    overview: "The Mustang debuted April 17, 1964 and immediately defined a new automotive segment. The first-generation car (1964½–1970) is the most collectible, with Shelby GT350 and GT500 variants commanding six-figure prices. The Boss 302 and Boss 429 from 1969–70 are among the most dramatic factory performance cars of the era.",
    history: [
      "Lee Iacocca championed the Mustang as a sporty, affordable car aimed at the baby boom generation. The '1964½' debut cars are technically early 1965 models (distinguished by generator versus alternator). The 1964–68 'classic' Mustangs represent the purest pony car concept. Carroll Shelby transformed the GT350 into a genuine road racer and the GT500 into a boulevard bruiser with the 428 Cobra Jet.",
      "The 1969–70 SportsRoof fastback — particularly in Boss 302 and Boss 429 form — is perhaps the most visually aggressive first-gen design. The Boss 302 was built to homologate for Trans-Am racing; the Boss 429 used a NASCAR-spec engine shoe-horned into the engine bay by hand. The 1971–73 Mustang grew substantially larger and heavier, a direction the market rejected. Collectors strongly prefer the 1964–70 cars.",
    ],
    specs: [
      { label: 'Engine options', value: '170–250 I6, 260–428 CJ, 429 V8' },
      { label: 'Horsepower', value: '101–375 hp factory; Shelby variants higher' },
      { label: 'Wheelbase', value: '108 in' },
      { label: 'Transmission', value: '3/4-spd manual, Ford-O-Matic, C4/C6 auto' },
      { label: '0–60 (428 CJ)', value: 'approx. 5.5 seconds' },
    ],
    notableVersions: [
      { name: 'Shelby GT350 (1965–66)', description: '289 Hi-Po with 271 hp, race-bred suspension, fiberglass components. Built by Carroll Shelby in San Jose, CA.' },
      { name: 'Shelby GT500 (1967–70)', description: '428 Cobra Jet, 335 hp (underrated). The ultimate factory Mustang.' },
      { name: 'Boss 302 (1969–70)', description: '302 V8, 290 hp (underrated). Homologated for Trans-Am racing — one of the best-handling first-gen Mustangs.' },
      { name: 'Boss 429 (1969–70)', description: 'NASCAR-spec 429 engine hand-fitted into a widened engine bay. Fewer than 2,000 per year, extremely collectible.' },
      { name: 'Mach 1 (1969–73)', description: 'SportsRoof fastback with performance trim and engine options up to the 428 CJ.' },
    ],
    buyingTips: [
      { title: 'Mustangs are the most-cloned muscle car', detail: "Demand a Marti Report (Ford's production data service). It documents every factory option and is essential for authentication." },
      { title: 'Convertible rust is predictable', detail: 'Rear quarter rust-out behind the wheel arches and the convertible top well are the primary structural issues on open cars.' },
      { title: 'Big-block front suspension wear', detail: '1967–68 390/428 cars put heavy weight on the front suspension. Inspect steering, ball joints, and shock towers carefully.' },
      { title: 'Shelby clones vastly outnumber real cars', detail: "More Shelby Mustangs exist today than were built. Use the Shelby American Automobile Club (SAAC) registry." },
      { title: 'Torque box rust is common', detail: 'The front frame reinforcements (torque boxes) rust and crack. A collapsed torque box is a significant structural repair.' },
    ],
    priceRange: { project: '$8,000–$25,000', driver: '$25,000–$70,000', show: '$70,000–$300,000+' },
  },
  {
    make: 'Ford',
    model: 'Thunderbird',
    years: '1955–1971',
    tagline: 'The original personal luxury car — and the most beautiful Ford ever built.',
    overview: "The Thunderbird debuted in 1955 as a two-seat sports car to challenge the Corvette, then pivoted to four-seat personal luxury for 1958. The first three model years (1955–57) are the most collectible, representing a pure vision of American personal transportation that was abandoned in the name of sales volume.",
    history: [
      "Ford designed the Thunderbird as a nimble, stylish personal car — not a raw sports car. With a V8, comfortable interior, and optional removable hardtop, it outsold the Corvette by a wide margin. After just two model years, Ford dropped the two-seat configuration in favor of a four-seater. The decision remains controversial; the two-seat 'Classic Birds' are worth significantly more than any successor.",
      "The 'Square Bird' (1958–60) introduced unit-body construction and four seats. The 'Bullet Bird' (1961–63) represents the pinnacle of personal luxury design sophistication. The 'Flair Bird' (1964–66) and later models continued the luxury direction until Ford discontinued the line in 1971. The 1961–63 cars are undervalued relative to their design quality.",
    ],
    specs: [
      { label: 'Engine options (1955–57)', value: '292, 312 V8 (supercharged option)' },
      { label: 'Engine options (1958+)', value: '352, 390, 428, 429 V8' },
      { label: 'Horsepower', value: '193–360 hp' },
      { label: 'Wheelbase', value: '102 in (1955–57), 113 in (1958–63)' },
      { label: 'Transmission', value: '3-spd manual (1955–57), Ford-O-Matic auto' },
    ],
    notableVersions: [
      { name: '1955–57 Classic Bird', description: 'Two-seat roadster with removable hardtop and soft top. The most collectible T-Birds.' },
      { name: '1957 Supercharged', description: '312 V8 with McCulloch supercharger, 300 hp. Rare and significantly more valuable than naturally aspirated 1957s.' },
      { name: '1961–63 Bullet Bird', description: 'Considered the most sophisticated design of the four-seat era. Undervalued by many collectors.' },
    ],
    buyingTips: [
      { title: '1955–57 rust concentrates at the cowl', detail: 'The lower cowl, rocker panels, and floor pans are the primary rust areas. Probe carefully before buying any project bird.' },
      { title: 'Hardtop condition matters for 1955–57 values', detail: 'Cars with both the removable hardtop and soft top are most complete. A missing hardtop significantly reduces value.' },
      { title: 'Supercharged 1957 maintenance', detail: 'The McCulloch supercharger requires specific maintenance and rebuilding expertise. Verify it functions before buying.' },
      { title: '1961–63 firewall rust', detail: 'Body-on-frame construction on later birds — inspect the firewall area for rust and prior collision repair.' },
    ],
    priceRange: { project: '$8,000–$22,000', driver: '$22,000–$55,000', show: '$55,000–$140,000' },
  },
  {
    make: 'Ford',
    model: 'Torino',
    years: '1968–1976',
    tagline: "Ford's mid-size muscle car — faster than its reputation and undervalued by the market.",
    overview: "The Torino was Ford's A-body intermediate and, with the 428 Cobra Jet and 429 Super Cobra Jet engines, a legitimate muscle car. The 1969 Talladega is among the rarest NASCAR homologation cars ever built. Torinos remain significantly undervalued compared to Mustangs of the same era, making them an excellent value proposition for performance buyers.",
    history: [
      "The Fairlane nameplate became the Torino in 1968 with a restyled lower, fastback SportsRoof body. The timing was perfect: the 428 Cobra Jet engine arrived that same year, creating a formidable combination. The 1969 Torino Cobra and GT with 428 CJ represent the performance peak. Ford built 427 Talladega models for NASCAR aero homologation — a number so small the car is extraordinarily rare today.",
      "The 1970 Torino redesign produced one of the cleanest fastback shapes in American automotive history. The 429 SCJ option brought solid-lifter V8 performance. By 1973, the Torino had grown into a formal-roofed personal luxury car in the mold of the Monte Carlo, losing its sporting character entirely.",
    ],
    specs: [
      { label: 'Engine options', value: '200–250 I6, 289–429 V8' },
      { label: 'Horsepower', value: '120–375 hp' },
      { label: 'Wheelbase', value: '117 in' },
      { label: 'Transmission', value: '3/4-spd manual, C4/C6 automatic' },
    ],
    notableVersions: [
      { name: '428 Cobra Jet (1968–70)', description: 'Factory-rated at 335 hp; actual output closer to 410 hp. The top performance option.' },
      { name: '429 Super Cobra Jet (1971)', description: '370 hp solid-lifter engine. The last true muscle car Torino.' },
      { name: '1969 Talladega', description: 'NASCAR aerodynamic homologation car with flush grille and extended nose. Approximately 745 produced.' },
    ],
    buyingTips: [
      { title: 'Excellent value versus comparable Mustangs', detail: 'A 428 CJ Torino delivers similar performance to a 428 Mustang at a fraction of the price. The market has not caught up.' },
      { title: 'SportsRoof rear quarter rust', detail: 'Rust at the rear quarters just above the rear bumper is extremely common on fastback cars.' },
      { title: 'Verify 428 CJ and 429 SCJ authenticity', detail: 'Check the door data sticker and the partial VIN stamp on the block. Performance cars are undervalued enough that faking is less common.' },
      { title: '351W parts are plentiful', detail: 'The 351 Windsor engine is among the most widely supported Ford V8s. Non-performance Torinos make excellent and affordable project cars.' },
    ],
    priceRange: { project: '$4,000–$13,000', driver: '$13,000–$35,000', show: '$35,000–$80,000' },
  },
  {
    make: 'Dodge',
    model: 'Charger',
    years: '1966–1978',
    tagline: 'The most recognizable American muscle car — made famous in Bullitt and The Dukes of Hazzard.',
    overview: "The 1968–70 Dodge Charger is one of the most iconic American cars ever designed — a tunnel-roof hardtop with a recessed grille and hidden headlights that set the standard for muscle car styling. The 426 HEMI option, rated at 425 hp, is one of the most legendary engines in automotive history. The 1969 Charger Daytona with its massive wing is the most extreme production car of the era.",
    history: [
      "The first-generation Charger (1966–67) used the B-body platform with a full-width fastback roofline and four bucket seats. It was stylish but lacked aerodynamic performance. The complete redesign for 1968 produced what many consider the best-looking American car ever made — smooth fastback roofline, hidden headlights, and an aircraft-inspired interior. The 1968–70 Charger dominated NASCAR racing.",
      "The 1969 Charger 500 and the legendary Charger Daytona were built specifically for NASCAR aerodynamic requirements. Only 503 Daytonas were produced for the street; their massive rear wing and pointed nose cone make them the most dramatic factory cars ever sold. The 1971–74 Charger featured a more formal roofline but retained availability of the 426 HEMI and 440 Six-Pack.",
    ],
    specs: [
      { label: 'Engine options', value: '225 Slant Six, 318–440 V8, 426 HEMI' },
      { label: 'Horsepower', value: '145–425 hp (HEMI conservatively rated)' },
      { label: 'Wheelbase', value: '117 in' },
      { label: 'Transmission', value: '4-spd manual, TorqueFlite 3-spd automatic' },
      { label: '0–60 (426 HEMI)', value: 'under 5.5 seconds' },
    ],
    notableVersions: [
      { name: 'R/T (Road/Track)', description: 'Performance package with 440 Magnum or 426 HEMI, upgraded suspension, and dual exhaust.' },
      { name: '426 HEMI (1966–71)', description: 'The ultimate street/strip engine. Rated 425 hp; widely accepted as underrated by 50–75 hp.' },
      { name: 'Charger 500 (1969)', description: 'NASCAR aerodynamic homologation car with flush rear window and grille. 392 produced.' },
      { name: 'Charger Daytona (1969)', description: 'Extended aero nose and 23-inch rear wing for superspeedway racing. 503 produced; values $150,000–$500,000+.' },
    ],
    buyingTips: [
      { title: 'B-body rust is extensive', detail: 'Trunk floor, lower quarters, floor pans, and the area under the rear window all rust regularly. Plan on addressing multiple areas.' },
      { title: 'HEMI authentication is critical', detail: 'A documented, numbers-matching HEMI car is worth 3–5× a comparable 440 example. Demand the fender tag and broadcast sheet.' },
      { title: 'Water intrusion from the tunnel roof', detail: 'The distinctive hardtop roofline creates water channeling issues. Check the headliner, floor, and door jambs for moisture damage.' },
      { title: 'Clone detection requires the fender tag', detail: 'The broadcast sheet (attached to the body) lists every factory option. Without it, R/T and HEMI claims require independent verification.' },
      { title: 'HEMI-specific parts are expensive', detail: 'Cylinder heads, intake manifolds, and unique accessories for HEMI-equipped cars carry significant premiums over 440 equivalents.' },
    ],
    priceRange: { project: '$15,000–$40,000', driver: '$40,000–$100,000', show: '$100,000–$500,000+' },
  },
  {
    make: 'Dodge',
    model: 'Challenger',
    years: '1970–1974',
    tagline: 'Built wider than any competitor to fit the HEMI — and it shows.',
    overview: "Introduced two years after the Camaro and Mustang, the Dodge Challenger arrived late to the pony car wars but made up for it with exceptional styling and a wider E-body that accommodated the 426 HEMI without compromise. Despite a five-year production run, it produced some of the rarest and most valuable American muscle cars ever sold.",
    history: [
      "Chrysler stretched the E-body platform wider than competing pony cars to allow the HEMI to fit without modification, giving the Challenger a more muscular stance. The 1970 model offered an extraordinary range: six-cylinder to 426 HEMI, economy hardtop to convertible, and the T/A package for Trans-Am racing homologation. The convertible was offered only in 1970 and 1971.",
      "By 1974, tightening emissions regulations and rising insurance costs had killed the muscle car era. The Challenger was cancelled without a true successor. The rarest combinations — HEMI convertibles — are among the most valuable American production cars; fewer than 10 HEMI convertibles are known to exist.",
    ],
    specs: [
      { label: 'Engine options', value: '225 Slant Six, 318–440 V8, 426 HEMI' },
      { label: 'Horsepower', value: '145–425 hp' },
      { label: 'Wheelbase', value: '110 in' },
      { label: 'Transmission', value: '4-spd manual, TorqueFlite automatic' },
    ],
    notableVersions: [
      { name: 'R/T', description: 'Road/Track performance package with 440 Magnum or 426 HEMI. The collector-grade Challenger.' },
      { name: 'T/A (1970)', description: 'Trans-Am homologation with 340 Six-Pack (three 2-barrel carbs), 290 hp. Rare and increasingly valuable.' },
      { name: '426 HEMI Convertible (1970)', description: 'Fewer than 10 known to exist. Among the most valuable American muscle cars.' },
      { name: 'SE (Special Edition)', description: 'Formal luxury trim with leather interior and smaller rear window. Less common than standard hardtops.' },
    ],
    buyingTips: [
      { title: 'E-body rust is extensive', detail: 'Lower quarters, trunk floor, and floor pans rust heavily. The bottom of the A-pillars is a particularly common problem area.' },
      { title: 'Convertibles need extra scrutiny', detail: 'Floor pans and rockers on convertibles are almost always compromised from water intrusion. Budget accordingly.' },
      { title: 'The fender tag documents everything', detail: 'The broadcast sheet on the firewall or door jamb lists all factory options. This is the primary authenticity document for high-value cars.' },
      { title: '340 T/A is more accessible', detail: 'The 340 Six-Pack T/A delivers exciting performance at a fraction of the HEMI premium. An excellent entry point to E-body collecting.' },
      { title: 'Reproduction panels are available', detail: "Quality reproduction quarters, floor pans, and trunk floors are widely available, making body restoration more practical than it was a decade ago." },
    ],
    priceRange: { project: '$15,000–$38,000', driver: '$38,000–$95,000', show: '$95,000–$400,000+' },
  },
  {
    make: 'Dodge',
    model: 'Dart',
    years: '1960–1976',
    tagline: 'The lightweight Mopar compact — what it lacks in glamour it makes up for in performance per dollar.',
    overview: "The Dart was Dodge's compact, and the 1968–76 third generation is beloved by performance enthusiasts for its light weight, strong aftermarket support, and compatibility with the full Mopar engine lineup. The Dart Sport and Swinger 340 represent excellent performance value — fast, affordable, and increasingly collectible.",
    history: [
      "The Dart began as a full-size car in 1960–61 before being repositioned as Dodge's compact in 1963. The third generation (1967–76) is the most collectible, offering the 340 and 383 V8 in a car weighing under 3,000 lbs. The 1968–69 GTS models with the 383 big-block are particularly rare — Chrysler force-fit the large engine into the small bay as a performance special. The Demon 340 (1971–72) brought a sportback body and strong drag strip credentials.",
    ],
    specs: [
      { label: 'Engine options', value: '170–225 Slant Six, 273–383 V8' },
      { label: 'Horsepower', value: '101–340 hp' },
      { label: 'Wheelbase', value: '111 in' },
      { label: 'Weight', value: '~2,850–3,100 lbs' },
      { label: 'Transmission', value: '3/4-spd manual, TorqueFlite automatic' },
    ],
    notableVersions: [
      { name: 'GTS (1968–69)', description: '340 or 383 V8 in a compact package. Rare and increasingly valued by collectors.' },
      { name: 'Demon 340 (1971–72)', description: '340 V8, 275 hp, fastback body. Renamed Sport Demon in 1973 due to controversy over the name.' },
      { name: 'Swinger 340', description: 'Value-priced performance package combining economy with real V8 performance.' },
    ],
    buyingTips: [
      { title: 'The Slant Six is nearly indestructible', detail: 'Base Slant Six Darts are reliable daily drivers available cheaply. They accept V8 conversions easily.' },
      { title: 'Rocker panels and A-pillars rust', detail: 'The bottom of the A-pillars and rocker panels are common rust areas. Probe before committing.' },
      { title: '383 engine bay clearances are tight', detail: 'Big-block Darts have minimal clearance around the engine. Verify all plumbing, wiring, and cooling system components are correct.' },
      { title: 'Excellent parts availability', detail: 'The 340 engine has outstanding aftermarket support. Restoration is practical and affordable compared to exotic muscle cars.' },
    ],
    priceRange: { project: '$3,500–$12,000', driver: '$12,000–$30,000', show: '$30,000–$70,000' },
  },
  {
    make: 'Plymouth',
    model: 'Barracuda',
    years: '1964–1974',
    tagline: "Technically the first pony car — and with a HEMI, one of the most valuable.",
    overview: "The Barracuda predated the Ford Mustang by two weeks, making it technically the first pony car. The third-generation E-body Barracuda (1970–74) shared its platform with the Dodge Challenger and, with the 426 HEMI, produced some of the most valuable American muscle cars ever made. A 1970 HEMI convertible can exceed $1 million at auction.",
    history: [
      "The first Barracuda (1964–66) was essentially a Valiant with a fastback greenhouse — attractive but not performance-focused. The second generation (1967–69) offered genuine muscle car credentials with 383 and 440 V8 options. The third generation (1970–74) on the E-body platform gave the 'Cuda its legendary proportions — shorter wheelbase than the Challenger, wider stance, and aggressive fastback styling that many consider the finest American muscle car design.",
    ],
    specs: [
      { label: 'Engine options', value: '170–225 I6, 273–440 V8, 426 HEMI' },
      { label: 'Horsepower', value: '101–425 hp' },
      { label: 'Wheelbase', value: '108 in (E-body)' },
      { label: 'Transmission', value: '4-spd manual, TorqueFlite automatic' },
    ],
    notableVersions: [
      { name: "'Cuda 440 Six-Pack (1970)", description: '440 V8 with three 2-barrel carbs, 390 hp. The high-performance option below the HEMI.' },
      { name: "'Cuda 426 HEMI (1970–71)", description: '425 hp. HEMI convertibles are among the rarest and most valuable American production cars.' },
      { name: "AAR 'Cuda (1970)", description: 'Trans-Am homologation car with 340 Six-Pack. Very rare; built by Dan Gurney\'s All American Racers.' },
    ],
    buyingTips: [
      { title: 'E-body rust mirrors the Challenger', detail: 'Floor pans, lower quarters, and trunk floor are the primary rust areas. Plan on addressing multiple locations.' },
      { title: 'Convertible floors are almost always compromised', detail: 'Water intrusion over decades leaves floor pans and rockers heavily rusted on virtually every convertible.' },
      { title: 'HEMI authentication is non-negotiable', detail: "The fender tag and broadcast sheet are the primary documents. Use Chrysler's registry for verification of rare configurations." },
      { title: 'AAR faking is common', detail: 'The AAR is frequently faked due to its value. Verify via the AAR registry and inspect hood, engine bay, and unique components.' },
      { title: '440 and 340 cars offer strong performance', detail: 'Non-HEMI E-bodies deliver excellent performance at a fraction of the HEMI premium — excellent value for drivers.' },
    ],
    priceRange: { project: '$10,000–$28,000', driver: '$28,000–$75,000', show: '$75,000–$1,000,000+' },
  },
  {
    make: 'Plymouth',
    model: 'Road Runner',
    years: '1968–1980',
    tagline: 'The no-frills muscle car — all engine, minimal luxury, licensed beep-beep horn included.',
    overview: "The Road Runner was Plymouth's answer to buyers who wanted maximum performance at minimum cost. The 383 V8, heavy-duty suspension, and a Warner Bros. licensed 'beep beep' horn were standard. It sold over 44,000 units in its first year — far beyond projections — proving that stripping out luxury was exactly what performance buyers wanted.",
    history: [
      "Plymouth conceived the Road Runner as a stripper performance car that came with a big engine as standard equipment rather than an expensive option. Built on the B-body Belvedere platform, it offered a 383 standard and the 426 HEMI as a brutal upcharge. The 1969 model added a convertible and the 440+6 (Six-Pack) option. The 1970 Superbird — Plymouth's aero NASCAR homologation car — is a related model with its own extraordinary collector history.",
    ],
    specs: [
      { label: 'Engine options', value: '383, 440, 440 Six-Pack, 426 HEMI V8' },
      { label: 'Horsepower', value: '335–425 hp' },
      { label: 'Wheelbase', value: '116 in' },
      { label: 'Transmission', value: '4-spd manual, TorqueFlite automatic' },
    ],
    notableVersions: [
      { name: '440+6 (1969–71)', description: '440 with three 2-barrel carbs, 390 hp. Strong performance at a lower price than the HEMI.' },
      { name: '426 HEMI', description: '425 hp factory rating. The ultimate Road Runner option.' },
      { name: 'Plymouth Superbird (1970)', description: 'Aero homologation car with extended nose and massive rear wing. 1,920 produced; values $100,000–$400,000+.' },
    ],
    buyingTips: [
      { title: 'B-body rust areas are well-known', detail: 'Lower quarters at the wheel arches, trunk floor, floor pans, and lower A-pillars. All are common and addressable.' },
      { title: '383 cars are affordable and plentiful', detail: 'Base Road Runners with the 383 are the most available and most affordable. HEMI cars carry a 3–5× premium.' },
      { title: 'Superbird authentication is critical', detail: 'The nose, wing attachment points, and rear window details must all be correct. Use the Superbird/Daytona registry.' },
      { title: 'Check the fender tag for options', detail: 'The broadcast sheet is essential for verifying the factory engine and transmission — easily checked before any purchase.' },
    ],
    priceRange: { project: '$8,000–$22,000', driver: '$22,000–$55,000', show: '$55,000–$200,000+' },
  },
  {
    make: 'Pontiac',
    model: 'GTO',
    years: '1964–1974',
    tagline: 'The original muscle car — John DeLorean put a 389 in a mid-size and changed everything.',
    overview: "The GTO is credited as the original muscle car. Conceived by John DeLorean's team as a $296 option package on the 1964 Tempest LeMans, it sold 32,450 units against GM management's projections of 5,000 — proving the formula and igniting every other manufacturer to follow. The 1966–67 design and the 1969 Judge with Ram Air engines are the most collectible examples.",
    history: [
      "DeLorean's team packaged the 389 V8 with Tri-Power (three two-barrel carbs), dual exhausts, and stiffer suspension into the Tempest and called it the GTO — after Ferrari's racing car. GM management tried to kill it; they failed. By 1966 it had its own model designation and one of the most handsome bodies in American automotive history.",
      "The 1968–69 'Endura' nose GTO was revolutionary — the first American car with a body-colored urethane bumper that absorbed minor impacts and returned to shape. The Judge option package (1969–71) added vibrant colors, spoilers, and the Ram Air III and IV engines. The Ram Air IV, with its round-port heads and aggressive cam, is widely considered the finest Pontiac street engine ever built.",
    ],
    specs: [
      { label: 'Engine options', value: '389, 400, 455 V8 (all V8 platform)' },
      { label: 'Horsepower', value: '325–370 hp (Ram Air IV: 370 hp)' },
      { label: 'Wheelbase', value: '115 in (1964–67), 112 in (1968–72)' },
      { label: 'Transmission', value: '3/4-spd manual, TH350/400 automatic' },
    ],
    notableVersions: [
      { name: '1964 Tri-Power', description: 'The original GTO with three 2-barrel carbs, 348 hp, and a racing car name borrowed from Ferrari.' },
      { name: 'The Judge (1969–71)', description: 'Performance/appearance package with bright colors, spoiler, and Ram Air engine options.' },
      { name: 'Ram Air IV (1969–70)', description: '370 hp with round-port heads and solid-lifter cam. Considered the definitive Pontiac muscle engine.' },
      { name: '1966–67 GTO', description: 'Considered by many to be the best-looking GTO. Stacked headlights, Coke-bottle styling.' },
    ],
    buyingTips: [
      { title: 'A-body rust patterns apply', detail: 'Lower quarters, trunk floor, and rockers — standard GM A-body areas. All are well-understood and reproducible.' },
      { title: 'Use PHS documentation for 1964–65 cars', detail: 'The 1964–65 GTO was an option on the Tempest, not a separate model. The Pontiac Historical Society (PHS) can provide factory documentation.' },
      { title: 'Ram Air IV cars are rare and valuable', detail: 'Authenticity requires complete documentation. The Ram Air IV is frequently faked by swapping engines.' },
      { title: 'The Judge graphics were often removed', detail: 'Some original Judges had their decals removed by embarrassed owners. Verify all Judge trim was factory-original.' },
    ],
    priceRange: { project: '$10,000–$25,000', driver: '$25,000–$60,000', show: '$60,000–$175,000' },
  },
  {
    make: 'Pontiac',
    model: 'Firebird',
    years: '1967–1981',
    tagline: 'The Trans Am made it famous — Burt Reynolds made it a legend.',
    overview: "The Firebird shared GM's F-body platform with the Camaro but developed a distinct performance identity through the Trans Am variant. The 1973–74 Super Duty 455 cars are the last great muscle car Pontiacs, and the 1977–81 Trans Am — immortalized by Smokey and the Bandit — is one of the most recognizable American cars of the decade.",
    history: [
      "The Firebird launched in 1967 alongside the Camaro, differentiated by Pontiac's divided grilles, unique sheetmetal, and its own engine lineup. The Trans Am variant arrived in 1969, named after a racing series Pontiac was actually barred from competing in. The second generation (1970–81) became the iconic form — long hood, short deck, available T-tops from 1976.",
      "Emissions regulations devastated most muscle cars by 1972. Pontiac fought back with the Super Duty 455 in 1973–74, producing 290 hp net — remarkable for the era. The 1977 Smokey and the Bandit film, featuring a black and gold Trans Am, made the car a cultural phenomenon and drove demand through the rest of the decade.",
    ],
    specs: [
      { label: 'Engine options', value: '326–455 V8, 400 T/A' },
      { label: 'Horsepower', value: '165–335 hp (SD-455: 310 hp net)' },
      { label: 'Wheelbase', value: '108 in' },
      { label: 'Transmission', value: '4-spd manual, TH350/400 automatic' },
    ],
    notableVersions: [
      { name: 'Super Duty 455 (1973–74)', description: '310 hp net in the emissions era — the last truly powerful Firebird. Extremely rare and valuable.' },
      { name: '1969 Trans Am', description: 'First year of the Trans Am nameplate. White with blue stripes. Very rare; fewer than 700 hardtops built.' },
      { name: 'WS6 Handling Package (1976–81)', description: 'Performance suspension and wheels. The driving enthusiast\'s choice for second-gen Trans Ams.' },
    ],
    buyingTips: [
      { title: 'F-body rust mirrors the Camaro', detail: 'Cowl, lower rockers, floor pans, and rear quarters at the wheel arches. All are common and expected.' },
      { title: 'Super Duty 455 requires full documentation', detail: 'The SD-455 is rare enough that fakes are uncommon, but values are high enough that documentation is still essential.' },
      { title: 'Hood decals were often removed', detail: 'The screaming chicken and other large hood graphics were removed by some owners. Re-applied decals are often obvious; inspect carefully.' },
      { title: 'T-tops leak universally', detail: 'T-top equipped cars (1976+) almost universally develop leaks at the header rail seals. Inspect the ceiling and floor carefully.' },
    ],
    priceRange: { project: '$5,000–$16,000', driver: '$16,000–$45,000', show: '$45,000–$110,000' },
  },
  {
    make: 'Buick',
    model: 'Riviera',
    years: '1963–1973',
    tagline: "GM's most elegant design — Bill Mitchell's masterpiece.",
    overview: "The Riviera was GM's personal luxury coupe and one of the most sophisticated American design achievements of the 20th century. The 1963–65 first-generation cars, designed by Bill Mitchell's team without a single chrome fender ornament, are widely considered among the most beautiful American cars ever built. The controversial 1971–73 'Boat-Tail' models are gaining strong collector interest.",
    history: [
      "Bill Mitchell's team created the Riviera as a restrained, European-influenced personal luxury car — a deliberate departure from Detroit's chrome excess. The 1963 debut received universal critical acclaim; Road & Track called it one of the most beautiful cars ever produced. Despite its elegance, the Riviera packed Buick's powerful Nailhead V8 in all configurations.",
      "The 'Boat-Tail' Riviera of 1971–73 polarized opinion with its tapered rear and arched backlight. Critics dismissed it; enthusiasts celebrated its boldness. Today those cars are recognized as one of GM's most adventurous designs and are increasingly sought by collectors who ignored them for decades.",
    ],
    specs: [
      { label: 'Engine options', value: '401 Nailhead, 425 Nailhead, 430, 455 V8' },
      { label: 'Horsepower', value: '325–360 hp' },
      { label: 'Wheelbase', value: '117 in (1963–65), 119 in (1966–70), 122 in (1971–73)' },
      { label: 'Transmission', value: 'Super Turbine 400 automatic' },
    ],
    notableVersions: [
      { name: '1963–65 First Generation', description: 'The design classic. 1963 is the most valuable year; clean lines with no exterior chrome ornamentation.' },
      { name: 'Gran Sport (GS, 1965–73)', description: 'Performance upgrade with higher-output engine and sport suspension.' },
      { name: '1971–73 Boat-Tail', description: 'Polarizing tapered rear design. Gaining collector recognition rapidly; currently undervalued.' },
    ],
    buyingTips: [
      { title: 'Lower quarter and rocker rust on 1963–65 cars', detail: 'Rust concentrates at the lower quarters, rocker panels, and behind the rear wheels. Check carefully on any project.' },
      { title: 'Concealed headlight mechanisms require attention', detail: '1963–65 hidden headlights operate on vacuum. Leaks cause malfunction; test the system before buying.' },
      { title: 'Nailhead engine service is specialized', detail: 'The 401/425 Nailhead engines are robust but different in service from later Buick V8s. Find a shop with specific experience.' },
      { title: 'Boat-Tail cars are currently undervalued', detail: 'The 1971–73 Riviera is significantly cheaper than the first generation despite its design significance. A smart buy right now.' },
    ],
    priceRange: { project: '$5,000–$15,000', driver: '$15,000–$35,000', show: '$35,000–$85,000' },
  },
  {
    make: 'Buick',
    model: 'Skylark',
    years: '1964–1972',
    tagline: "The Gran Sport — Buick's muscle car sleeper with Nailhead power.",
    overview: "Buick's entry in the muscle car sweepstakes, the Gran Sport option package stuffed a 401 Nailhead V8 into the mid-size Skylark and created a car that could embarrass better-known muscle cars. The Stage 1 455 option for 1970–72 produced 360 hp and enormous torque — making it one of the fastest street cars of the era at any price.",
    history: [
      "When Pontiac proved the mid-size muscle car concept with the GTO, every GM division followed. Buick's answer was the Gran Sport in 1965 — the 401 Nailhead V8 in the Skylark body. The GS400 (1967–69) with a 400 V8 replaced the Nailhead and is the performance sweet spot of the line. The Stage 1 option introduced for 1969 and continued through 1972 was a factory street-strip package that outran most of its contemporaries off the line.",
    ],
    specs: [
      { label: 'Engine options', value: '300, 340 V8 (base); 401 Nailhead, 400, 455 V8 (GS)' },
      { label: 'Horsepower', value: '210–360 hp (Stage 1 455: 360 hp)' },
      { label: 'Wheelbase', value: '112 in' },
      { label: 'Transmission', value: '4-spd manual, TH350/400 automatic' },
    ],
    notableVersions: [
      { name: 'Stage 1 455 (1970–72)', description: '360 hp, massive torque. Often faster in real-world testing than factory ratings suggested.' },
      { name: 'GS400 (1967–69)', description: '400 V8 in the GS package — the performance standard of the line before the 455 arrived.' },
      { name: 'GSX (1970)', description: 'Appearance and performance package in Saturn Yellow or Apollo White. Very desirable and frequently faked.' },
    ],
    buyingTips: [
      { title: 'A-body rust patterns apply', detail: 'GM A-body: lower quarters, trunk floor, floor pans. Well-understood and well-supported by reproduction parts.' },
      { title: 'Stage 1 must be verified', detail: 'The Stage 1 option adds significant value and is easily faked by swapping engines. Demand the broadcast sheet.' },
      { title: 'GSX documentation is essential', detail: 'GSX cars were built in small numbers and are well-documented. The GSX registry is the authoritative source.' },
      { title: 'Nailhead engines (1965–67) require different sourcing', detail: 'Parts for the 401/425 Nailhead are harder to find than later Buick V8s. Factor this into a project budget.' },
    ],
    priceRange: { project: '$7,000–$20,000', driver: '$20,000–$48,000', show: '$48,000–$120,000' },
  },
  {
    make: 'Oldsmobile',
    model: '4-4-2',
    years: '1964–1980',
    tagline: "Named for its spec — four-barrel, four-speed, dual exhaust — and built to back it up.",
    overview: "The 4-4-2 was Oldsmobile's muscle car answer and one of the best-balanced performance cars of the era. The W-30 Force-Air induction option, with its twin cold-air scoops and special components, is particularly sought after. Unlike many muscle cars, the 4-4-2 was praised for its handling as well as its straight-line speed.",
    history: [
      "The 4-4-2 debuted as a $285 option package on the 1964 F-85/Cutlass, powered by a 330 V8 with a single four-barrel. The name reflected its specification: four-barrel carburetor, four-speed transmission, dual exhausts. By 1968, with the 400 V8 standard and the 455 available, the 4-4-2 was a genuine top-shelf muscle car with handling that embarrassed most competitors. The W-30 Force-Air package introduced cold-air induction that made a significant real-world difference.",
    ],
    specs: [
      { label: 'Engine options', value: '330, 350, 400, 455 V8' },
      { label: 'Horsepower', value: '310–370 hp (W-30: 370 hp)' },
      { label: 'Wheelbase', value: '112 in' },
      { label: 'Transmission', value: '4-spd manual, TH350/400 automatic' },
    ],
    notableVersions: [
      { name: 'W-30 Force-Air (1966–72)', description: 'Cold-air induction with fiberglass hood scoops, special cam, and rear axle. The top performance option.' },
      { name: 'W-31 (1968–70)', description: 'Small-block 350 high-performance package. Rare and underrated by collectors.' },
      { name: 'Hurst/Olds (1968, 1969, 1972)', description: 'Joint project with Hurst Performance featuring special paint and Hurst pistol-grip shifter.' },
      { name: 'Rallye 350 (1970)', description: 'Economy muscle — 350 V8, distinctive orange/yellow paint, unique front styling. Cheap and fun.' },
    ],
    buyingTips: [
      { title: 'A-body rust patterns apply equally', detail: 'GM A-body: lower quarters, floor pans, trunk floor. Reproduction parts are excellent.' },
      { title: 'W-30 authentication requires the broadcast sheet', detail: 'The W-30 option adds significant value and requires the factory build sheet to verify.' },
      { title: 'Use the Hurst/Olds Club registry', detail: 'Hurst/Olds cars were built in small, documented numbers. The registry is the definitive reference.' },
      { title: 'Oldsmobile engines are not GM-universal', detail: 'Olds engines use different bolt patterns and internal specs than Chevy or Buick. Ensure the correct block is present.' },
    ],
    priceRange: { project: '$8,000–$22,000', driver: '$22,000–$55,000', show: '$55,000–$135,000' },
  },
  {
    make: 'Oldsmobile',
    model: 'Cutlass',
    years: '1961–1988',
    tagline: "The best-selling car in America in the 1970s — stylish, affordable, and underappreciated.",
    overview: "The Cutlass was the most popular car in America for several years in the 1970s, outselling even the full-size Chevrolet. While the performance-focused 4-4-2 gets the headlines, the Cutlass Supreme and Cutlass S offer the same A-body platform with strong parts availability at significantly lower prices — an excellent value for collectors who appreciate style over bragging rights.",
    history: [
      "The Cutlass nameplate appeared on the 1961 F-85 compact. The classic collector era is 1964–72, when the A-body car offered the best combination of style, performance options, and availability. By the early 1970s, the Cutlass had evolved into a sophisticated mid-size outselling everything else on the market. The 1973–77 colonnade hardtop with its formal-yet-elegant roofline is a design triumph of the decade and is currently significantly undervalued.",
    ],
    specs: [
      { label: 'Engine options', value: '215–455 V8 (various years)' },
      { label: 'Horsepower', value: '155–365 hp' },
      { label: 'Wheelbase', value: '112 in' },
      { label: 'Transmission', value: 'TH350/400 automatic, 4-spd manual (early)' },
    ],
    notableVersions: [
      { name: 'Cutlass Supreme (1971–77)', description: 'The luxury leader. Available with 350 or 455 V8 and an excellent ride.' },
      { name: 'Cutlass S (1966–72)', description: 'Sport-focused trim with performance options and bucket seats.' },
      { name: 'Hurst/Olds (1979–84)', description: 'Later collaboration with Hurst Performance. Less valuable than 1960s examples but distinctive.' },
    ],
    buyingTips: [
      { title: 'A-body rust is addressable', detail: 'Lower quarters, floor pans, trunk floor — all standard GM A-body rust areas with strong reproduction part support.' },
      { title: '455 V8 cars offer strong performance', detail: '1970–72 cars with the 455 V8 deliver strong performance at reasonable prices. An underrated muscle car.' },
      { title: '1973–77 colonnade cars are undervalued', detail: 'The structural rigidity and clean styling of the colonnade Cutlass is unrecognized by the market. Buy before prices rise.' },
      { title: 'Parts availability is excellent', detail: 'The Cutlass shared the A-body platform with Chevelle, GTO, and 4-4-2. Parts are among the most available of any classic GM car.' },
    ],
    priceRange: { project: '$3,500–$10,000', driver: '$10,000–$28,000', show: '$28,000–$65,000' },
  },
];
