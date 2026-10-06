// Fills in body_style from a listing's own words (make/model/trim or title)
// when a dealer feed leaves it blank -- about 900 feed listings had none, so
// the Convertibles/Coupes/Trucks filters couldn't find them. Only explicit
// signals count: "Convertible", "Wagon", a known truck/SUV model name. A model
// that came in several bodies (240Z, Trans Am, Corvette) stays blank, since a
// wrong label is worse than none. Values match lib/types.ts BODY_STYLES.
//
// Order matters: the first match wins, so a "Roadster Pickup" is a truck, a
// "Hardtop Coupe" is a hardtop, and a "4 Door Convertible" is a convertible.
const RULES: [string, RegExp][] = [
  ['Pickup Truck', /\bpick-?ups?\b|\btrucks?\b|\b[ck]-?(10|15|20|1500|2500)\b|\bf-?(10|25|35)0\b|\bford f-?1\b|\bdodge c-?100\b|el camino|ranchero|\b3100\b|\b3600\b|\bd-?100\b|power wagon|\bstepside\b|\bfleetside\b|\bapache\b|\bcheyenne\b/i],
  ['SUV', /\bbronco\b|\bblazer\b|\bscout\b|wagoneer|land cruiser|\bfj-?\d\d\b|\bdefender\b|range rover|\bsuburban\b|\bcj-?\d\b|\btahoe\b|4runner|\bsuv\b|\bwrangler\b|\bjimmy\b|\bramcharger\b/i],
  ['Station Wagon', /\bwagon\b|\bnomad\b|country squire|vista cruiser|\bwood(y|ie)\b|\bavant\b/i],
  ['Convertible', /convertible|cabriolet|\bcabrio\b|\bspyder\b|\bspider\b|\bvolante\b|\bdrophead\b/i],
  ['Roadster', /roadster|\bspeedster\b/i],
  ['Fastback', /fastback|sports ?roof/i],
  ['Hardtop', /hard ?top/i],
  ['Sedan', /\bsedan\b|\b4-?door\b|\bfour door\b|\b4dr\b|\btown car\b/i],
  ['Coupe', /\bcoup[eé]\b|\b2-?door\b|\btwo door\b|\b2dr\b|\bhatchback\b/i],
];

// A sedan delivery is a panel wagon, not a sedan or a station wagon.
const AMBIGUOUS = /sedan delivery/i;

export function inferBodyStyle(text: string | null | undefined): string | null {
  if (!text || AMBIGUOUS.test(text)) return null;
  for (const [style, re] of RULES) if (re.test(text)) return style;
  return null;
}
