export interface PriceTierContent {
  slug: string;
  label: string;
  min: number;
  max: number | null; // null = open-ended
  tagline: string;
  overview: string;
  buyingTips: string[];
}

export const PRICE_TIERS_CONTENT: PriceTierContent[] = [
  {
    slug: 'under-10k',
    label: 'Under $10,000',
    min: 0,
    max: 10000,
    tagline: "Real classics within reach of a first-time buyer's budget.",
    overview:
      "Cars in this range are mostly project cars and honest driver-quality classics rather than show cars — deferred maintenance, cosmetic flaws, and the occasional needed repair are the norm rather than the exception. That doesn't mean a bad buy: it means budgeting time and money beyond the purchase price, and prioritizing mechanical soundness over cosmetic polish.",
    buyingTips: [
      "Budget an extra 20–30% beyond the purchase price for deferred maintenance — cars at this price point rarely arrive fully sorted.",
      'Prioritize a mechanically sound car with cosmetic flaws over a pretty car with unknown mechanical history — paint and trim are easier and cheaper to fix later than a bad engine or transmission.',
      'Verify title status carefully — salvage, rebuilt, and bonded titles are more common at this price point and significantly affect resale value and insurability.',
      "A pre-purchase inspection matters even more here than at higher price points, since problems are simply more likely on a car that hasn't had recent professional attention.",
    ],
  },
  {
    slug: '10k-to-25k',
    label: '$10,000–$25,000',
    min: 10000,
    max: 25000,
    tagline: 'The sweet spot for a genuinely drivable classic without a full restoration budget.',
    overview:
      "This range is where most buyers find a car they can actually drive and enjoy without taking on a project. Cars here typically have some recent mechanical work behind them and a broader selection across makes, models, and body styles than the entry-level tier — but condition still varies widely, so comparing similar listings matters more than at higher price points where documentation does more of the talking.",
    buyingTips: [
      'Ask for recent maintenance records specifically — a seller who can show what was done in the last few years is a much stronger signal than general claims about condition.',
      "Compare against similar listings for the same make and model before making an offer — pricing at this tier varies more with condition and options than at either extreme.",
      'Ask directly about any known issues rather than relying solely on the listing description — sellers in this range are usually candid if asked.',
      'Check for aftermarket modifications that could affect insurability or resale value, especially on cars that may have been modified for daily driving rather than kept original.',
    ],
  },
  {
    slug: '25k-to-50k',
    label: '$25,000–$50,000',
    min: 25000,
    max: 50000,
    tagline: 'Where restoration quality, documentation, and originality start to define the price.',
    overview:
      "Cars in this range often carry a full or recent restoration, numbers-matching drivetrains, and documented ownership history — the kind of details that justify a real premium over a similar-looking car at a lower price point. Buyers here should expect (and ask for) a higher standard of originality and documentation than at the lower tiers.",
    buyingTips: [
      'Request restoration receipts, photos, or documentation of the work performed — a seller with genuine restoration history should be able to produce it.',
      'Verify numbers-matching status directly rather than taking a listing\'s word for it, especially on nameplates where matching-numbers cars carry a significant premium.',
      'Consider a marque-specialist inspection or appraisal for less common makes, where a generalist mechanic may not know what to look for.',
      "Understand specifically what options or trim level justify the asking price relative to a base-model example of the same year — factory-rare options carry real value at this tier.",
    ],
  },
  {
    slug: '50k-plus',
    label: '$50,000 and Up',
    min: 50000,
    max: null,
    tagline: 'Investment-grade and rare classics, bought for appreciation as much as for driving.',
    overview:
      "Cars in this range are typically concours-quality restorations or genuinely rare, desirable factory-optioned examples. At this level, a purchase is closer to acquiring a collectible investment than buying a car to drive daily, and the diligence involved should reflect that — professional appraisal, documented authenticity, and appropriate insurance coverage all matter more than at any other tier.",
    buyingTips: [
      'Get a professional appraisal before buying — at this price point, the cost of an independent appraisal is small relative to the risk of overpaying or missing an issue.',
      'Verify authenticity of rare factory options through documentation like broadcast sheets or factory build records, not just the seller\'s description.',
      'Consider agreed-value insurance coverage rather than standard auto insurance, which typically undervalues collector cars in this range.',
      'Factor in the cost of specialized enclosed transport and proper climate-controlled storage as part of the real cost of ownership at this level.',
    ],
  },
];

export function getPriceTierContent(slug: string): PriceTierContent | null {
  return PRICE_TIERS_CONTENT.find(t => t.slug === slug) ?? null;
}

export function getPriceTierSlugs(): string[] {
  return PRICE_TIERS_CONTENT.map(t => t.slug);
}
