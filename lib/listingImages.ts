// Guards against a client-supplied image URL that isn't a real, uploaded
// image in our own storage bucket -- shared by both the initial listing
// submission and later edits, so neither path can silently save an
// unconfirmed/arbitrary URL to a listing's images array.
export function isValidListingImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('https://')) return false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!url.includes(supabaseUrl.replace('https://', ''))) return false;
  if (!url.includes('/listing-images/')) return false;
  return true;
}
