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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Builds a standard ADF 1.0 (Auto-lead Data Format) lead document -- the
// industry-standard schema dealer CRMs (including Salesforce Email Service
// listeners) use to ingest third-party leads by email. Every field that
// carries buyer-entered text is XML-escaped -- a buyer's message is free
// text and must never be able to break out of the document.
export function buildAdfLeadXml({ dealerName, listingId, vehicle, customer }: AdfLeadParams): string {
  const requestdate = new Date().toISOString();
  return `<?xml version="1.0"?>
<!DOCTYPE adf PUBLIC "-//ADF//DTD ADF 1.0//EN" "http://www.starstandard.org/ADF/adf1.0.dtd">
<adf>
<prospect>
<id sequence="1" source="GarageCherries.com">${escapeXml(listingId)}</id>
<requestdate>${requestdate}</requestdate>
<vehicle interest="buy" status="used">
<year>${escapeXml(String(vehicle.year))}</year>
<make>${escapeXml(vehicle.make)}</make>
<model>${escapeXml(vehicle.model)}</model>
${vehicle.vin ? `<vin>${escapeXml(vehicle.vin)}</vin>\n` : ''}${vehicle.stockNumber ? `<stock>${escapeXml(vehicle.stockNumber)}</stock>\n` : ''}</vehicle>
<customer>
<contact>
<name part="full">${escapeXml(customer.name)}</name>
<email>${escapeXml(customer.email)}</email>
${customer.phone ? `<phone>${escapeXml(customer.phone)}</phone>\n` : ''}</contact>
${customer.comments ? `<comments>${escapeXml(customer.comments)}</comments>\n` : ''}</customer>
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
