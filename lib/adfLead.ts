import { Resend } from 'resend';
import { createLogger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('lib/adfLead');

export interface AdfVehicle {
  year: number | string;
  make: string;
  model: string;
  vin?: string | null;
  stockNumber?: string | null;
}

export interface AdfCustomer {
  name: string;
  email: string;
  phone?: string | null;
  comments?: string | null;
}

export interface AdfLeadParams {
  dealerName: string;
  listingId: string;
  vehicle: AdfVehicle;
  customer: AdfCustomer;
}

// BHCC's Salesforce Web Form Stock Number field silently drops the lead
// (no bounce, no error) if <stock> is over 10 characters -- confirmed by
// their CRM team 2026-09-23 after a 12-char test value failed to insert.
// Truncated rather than omitted: still useful partial info, and every stock
// number seen from any dealer feed so far is well under this anyway.
const MAX_STOCK_NUMBER_LENGTH = 10;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ADF elements expect separate first/last <name> elements (confirmed against
// BHCC's own Salesforce parser 2026-09-22 -- see the split below), but every
// call site here only has a single full-name string. Splits on the last
// space; a one-word name (or "Jane" alone) becomes first-only with an empty
// last, which is still valid ADF, just less precise than a real split name.
function splitName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { first: trimmed, last: '' };
  return { first: trimmed.slice(0, idx).trim(), last: trimmed.slice(idx + 1).trim() };
}

// Builds an ADF 1.0 (Auto-lead Data Format) lead document -- the industry-
// standard schema dealer CRMs use to ingest third-party leads by email. This
// exact shape (the `<?adf?>` processing instruction, `status="new"`, split
// first/last name, `phone type="voice"`) was confirmed working against
// BHCC's own Salesforce Email Service parser 2026-09-22 -- their team tested
// a sample in this shape and it created a real lead. Every field that
// carries buyer-entered text is XML-escaped -- a buyer's message is free
// text and must never be able to break out of the document.
export function buildAdfLeadXml({ dealerName, listingId, vehicle, customer }: AdfLeadParams): string {
  const requestdate = new Date().toISOString();
  const { first, last } = splitName(customer.name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<?adf version="1.0"?>
<adf>
  <prospect status="new">
    <id sequence="1" source="GarageCherries">${escapeXml(listingId)}</id>
    <requestdate>${requestdate}</requestdate>
    <vehicle interest="buy" status="used">
      <year>${escapeXml(String(vehicle.year))}</year>
      <make>${escapeXml(vehicle.make)}</make>
      <model>${escapeXml(vehicle.model)}</model>
${vehicle.vin ? `      <vin>${escapeXml(vehicle.vin)}</vin>\n` : ''}${vehicle.stockNumber ? `      <stock>${escapeXml(vehicle.stockNumber.slice(0, MAX_STOCK_NUMBER_LENGTH))}</stock>\n` : ''}    </vehicle>
    <customer>
      <contact>
        <name part="first">${escapeXml(first)}</name>
        <name part="last">${escapeXml(last)}</name>
        <email>${escapeXml(customer.email)}</email>
${customer.phone ? `        <phone type="voice">${escapeXml(customer.phone)}</phone>\n` : ''}      </contact>
${customer.comments ? `      <comments>${escapeXml(customer.comments)}</comments>\n` : ''}    </customer>
    <vendor>
      <vendorname>${escapeXml(dealerName)}</vendorname>
    </vendor>
    <provider>
      <name part="full">GarageCherries</name>
      <service>Lead Provider</service>
      <url>https://www.garagecherries.com</url>
      <email>no-reply@garagecherries.com</email>
    </provider>
  </prospect>
</adf>`;
}

// Sends the ADF lead as a second, separate email alongside the dealer's
// normal HTML notification -- fire-and-forget, same as the other lead
// emails in app/api/conversations and app/api/offers. Callers only invoke
// this when a dealer has adf_lead_email set (opt-in, null for every dealer
// except one whose CRM has been confirmed to accept it), so a delivery
// failure here should never block or fail the buyer-facing request.
export async function sendAdfLead(adfLeadEmail: string, params: AdfLeadParams) {
  const xml = buildAdfLeadXml(params);
  try {
    await resend.emails.send({
      from: 'GarageCherries Leads <no-reply@garagecherries.com>',
      to: adfLeadEmail,
      subject: 'ADF',
      text: xml,
    });
    log.info('ADF lead sent', { adfLeadEmail, listingId: params.listingId });
  } catch (err) {
    log.error('ADF lead send failed', err, { adfLeadEmail, listingId: params.listingId });
  } finally {
    await log.flush();
  }
}
