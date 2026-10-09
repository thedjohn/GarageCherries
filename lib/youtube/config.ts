// YouTube Shorts description settings that change with promotions, kept out
// of the description builder so they can be edited (or switched off) in one
// place.

// The free-listing promotion line shown as the 3rd line of every Short's
// description. Set `line` to null to remove it. It also drops off on its own
// after `expiresAt` -- kept in step with DEFAULT_SITE_SETTINGS.promoExpiresAt
// in lib/siteSettings.ts (not imported, since that module pulls in the
// Supabase server client).
export const YOUTUBE_SELL_PROMO: { line: string | null; expiresAt: string } = {
  line: 'Selling a car? List it free through Dec 31: garagecherries.com/sell',
  expiresAt: '2026-12-31T23:59:59Z',
};
