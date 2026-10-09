import { describe, it, expect } from 'vitest';
import { cleanSellerText, decodeEntities, normalizeCharacters, findContactInfo } from '@/lib/youtube/cleanSellerText';

describe('cleanSellerText', () => {
  it('returns empty text for null/empty input', () => {
    expect(cleanSellerText(null)).toEqual({ text: '', removed: [] });
    expect(cleanSellerText('')).toEqual({ text: '', removed: [] });
  });

  it('drops a "call us" sentence with a spaced phone number, keeping the rest', () => {
    const r = cleanSellerText('Runs and drives great. Call us at 618 336 5210 to discuss a deal. Clean title.');
    expect(r.text).toBe('Runs and drives great. Clean title.');
    expect(r.removed).toContain('618 336 5210');
  });

  it('removes a phone number in (330)-323-3933 format', () => {
    const r = cleanSellerText('Questions? (330)-323-3933 anytime.');
    expect(r.text).not.toMatch(/\d{3}.?\d{4}/);
    expect(r.removed.join(' ')).toContain('323-3933');
  });

  it('removes dotted and +1 phone formats', () => {
    expect(findContactInfo('618.336.5210')).toHaveLength(1);
    expect(findContactInfo('+1 618-336-5210')).toHaveLength(1);
  });

  it('drops a "visit our website" sentence with a bare domain', () => {
    const r = cleanSellerText('Fresh paint. Please visit www.Survivor-Cars.com for additional photos. Original interior.');
    expect(r.text).toBe('Fresh paint. Original interior.');
    expect(r.removed.join(' ')).toMatch(/survivor-cars\.com/i);
  });

  it('removes bare domains without www', () => {
    const r = cleanSellerText('See atomicmotors.net/inventory for more.');
    expect(r.text).toBe('');
    expect(r.removed.join(' ')).toContain('atomicmotors.net');
  });

  it('removes email addresses', () => {
    const r = cleanSellerText('Email sales@vaughnsclassiccars.com with questions.');
    expect(r.text).toBe('');
    expect(r.removed).toContain('sales@vaughnsclassiccars.com');
  });

  it('keeps garagecherries.com links', () => {
    const r = cleanSellerText('Listed on https://www.garagecherries.com/listings/x today.');
    expect(r.text).toContain('garagecherries.com');
    expect(r.removed).toEqual([]);
  });

  it('strips just the contact detail from a long, otherwise useful sentence', () => {
    const long = 'This beautifully restored coupe has a rebuilt 350 V8, new suspension bushings throughout, fresh brakes, a new exhaust, and a stunning interior redone in 2021 by a shop at 555 123 4567 near our showroom.';
    const r = cleanSellerText(long);
    expect(r.text).toContain('rebuilt 350 V8');
    expect(r.text).not.toContain('555 123 4567');
  });

  it('keeps a long run-on ad (no sentence breaks) that mentions calling, removing just the number', () => {
    const runOn = 'Beautiful paint and chrome with a rebuilt engine and new tires plus a fresh interior and working gauges and a solid floor and trunk with no rust anywhere and new brakes all around and a new exhaust and a fresh tune and new weatherstripping and a rebuilt carburetor and a new radiator and fresh fluids and it drives great so call 555 123 4567 for details and more';
    expect(runOn.length).toBeGreaterThan(300);
    const r = cleanSellerText(runOn);
    expect(r.text).toContain('rebuilt engine');
    expect(r.text).not.toContain('555 123 4567');
  });

  it('keeps paragraph breaks and collapses extra blank lines', () => {
    const r = cleanSellerText('Paragraph one.\n\n\n\nParagraph two.');
    expect(r.text).toBe('Paragraph one.\n\nParagraph two.');
  });

  it('does not treat prices, mileage or years as phone numbers', () => {
    expect(findContactInfo('Asking $45,000 with 45,801 miles, a 1969 classic.')).toEqual([]);
  });
});

describe('decodeEntities / normalizeCharacters', () => {
  it('decodes named and numeric HTML entities', () => {
    expect(decodeEntities('Black &amp; Gold &quot;Bandit&quot; &#39;77 &#x2014; nice')).toBe('Black & Gold "Bandit" \'77 — nice');
  });

  it('leaves unknown entities alone', () => {
    expect(decodeEntities('&bogus; &#0;')).toBe('&bogus; &#0;');
  });

  it('repairs common broken-character sequences', () => {
    expect(normalizeCharacters('Fordâ€™s pride and joy�')).toBe("Ford's pride and joy");
  });

  it('is applied by cleanSellerText', () => {
    expect(cleanSellerText('Red &amp; white.').text).toBe('Red & white.');
  });
});
