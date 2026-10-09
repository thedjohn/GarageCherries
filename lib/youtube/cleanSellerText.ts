// Cleans a seller's ad text before it goes into a YouTube Short description:
// strips other sites' URLs/domains, phone numbers and email addresses (so
// viewers come to garagecherries.com rather than going around it), decodes
// HTML entities, and repairs common broken-character sequences.

const ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: '–', mdash: '—', hellip: '…',
};

// UTF-8 text that was decoded as Windows-1252 somewhere upstream (feeds).
const MOJIBAKE: [string, string][] = [
  ['â€™', "'"], ['â€˜', "'"], ['â€œ', '"'], ['â€\u009d', '"'], ['â€�', '"'],
  ['â€“', '–'], ['â€”', '—'], ['â€¦', '…'], ['Â ', ' '], ['Â', ''],
];

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function normalizeCharacters(text: string): string {
  let out = text;
  for (const [bad, good] of MOJIBAKE) out = out.split(bad).join(good);
  return out.replace(/ /g, ' ').replace(/�/g, '');
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;
// Bare domains like "Survivor-Cars.com" or "atomicmotors.net/inventory".
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|us|biz|info|co|auto|cars|car|motors)\b(?:\/[^\s<>"')]*)?/gi;
// US-style numbers: (330)-323-3933, 618 336 5210, 618.336.5210, +1 618-336-5210.
const PHONE = /(?:\+?1[\s.-]*)?\(?\b\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}\b/g;

// A sentence holding contact info is usually an instruction like "Call us at
// ..." or "Visit www.X.com for more photos" -- removing just the number or
// link would leave it reading broken, so those sentences go entirely.
const CONTACT_INTENT = /\b(call|text|phone|cell|email|e-mail|contact|visit|website|web site|reach|ask for|dm|message us|more photos|additional photos|more pictures|inquir)/i;

function isGarageCherries(s: string): boolean {
  return /garagecherries\.com/i.test(s);
}

export function findContactInfo(text: string): string[] {
  const found: string[] = [];
  for (const re of [EMAIL, URL, DOMAIN, PHONE]) {
    for (const m of text.match(re) ?? []) {
      if (!isGarageCherries(m)) found.push(m);
    }
  }
  return found;
}

function stripMatches(sentence: string, removed: string[]): string {
  let out = sentence;
  for (const re of [EMAIL, URL, DOMAIN, PHONE]) {
    out = out.replace(re, m => {
      if (isGarageCherries(m)) return m;
      removed.push(m);
      return '';
    });
  }
  return out;
}

function tidy(s: string): string {
  return s
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/(^|\s)[,;:]\s*/g, '$1')
    .trim();
}

export interface CleanResult { text: string; removed: string[] }

export function cleanSellerText(raw: string | null | undefined): CleanResult {
  const removed: string[] = [];
  if (!raw) return { text: '', removed };

  const text = normalizeCharacters(decodeEntities(raw)).replace(/\r\n?/g, '\n');

  const lines = text.split('\n').map(line => {
    // Split into sentences, keeping each sentence's own end punctuation.
    const sentences = line.split(/(?<=[.!?])\s+/);
    const kept: string[] = [];
    for (const sentence of sentences) {
      if (findContactInfo(sentence).length === 0) { kept.push(sentence); continue; }
      // Long run-on "sentences" (ads with little punctuation) keep their
      // other content even when they mention calling.
      if ((CONTACT_INTENT.test(sentence) && sentence.length < 300) || sentence.length < 120) {
        stripMatches(sentence, removed);
        continue;
      }
      const stripped = tidy(stripMatches(sentence, removed));
      if (stripped) kept.push(stripped);
    }
    return tidy(kept.join(' '));
  });

  const cleaned = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: cleaned, removed };
}
