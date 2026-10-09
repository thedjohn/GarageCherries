// Listing codes ("GC-7KQ4M") let YouTube viewers reach a listing by typing a
// short code, since links in Shorts descriptions aren't clickable. Codes are
// generated in the database (see supabase/migrations/20261009_listing_code_youtube_block.sql);
// the alphabet leaves out the ambiguous 0/O and 1/I/L.
const CODE_BODY = /^[2-9A-HJKMNP-Z]{5}$/;

// Accepts "GC-7KQ4M", "gc7kq4m", " 7kq4m " etc. Returns the bare 5-character
// code in upper case, or null when the input can't be a listing code.
export function normalizeListingCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const body = input.trim().toUpperCase().replace(/^GC-?/, '');
  return CODE_BODY.test(body) ? body : null;
}
// Note: plain 5-letter words (e.g. "CHEVY") also fit the pattern, so callers
// treat input as a code only when it matches a real listing.
