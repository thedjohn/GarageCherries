// IndexNow lets Bing (and other participating engines) know the instant a
// URL goes live or changes, instead of waiting for their crawler to come
// back on its own schedule. Key must match the file hosted at KEY_LOCATION
// (public/<key>.txt is served at that exact path by Next.js automatically).
const INDEXNOW_KEY = '89db9decdac46613183dafb06c8a1c27af27f24b124ce7fc17290e9467232f29';
const KEY_LOCATION = `https://www.garagecherries.com/${INDEXNOW_KEY}.txt`;
const HOST = 'www.garagecherries.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// Fire-and-forget by design, same as the Facebook auto-post helpers this
// mirrors -- a failed submission should never break the request that
// triggered it, so this never throws.
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const urlList = urls.filter(Boolean);
  if (!urlList.length) return;
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }),
    });
  } catch {
    // Best-effort notification only -- indexing still happens on Bing's normal
    // crawl schedule if this fails, nothing on our side depends on success.
  }
}
