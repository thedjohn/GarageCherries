// Reusable script to confirm ADF/XML lead delivery reaches a dealer's CRM
// before it's relied on for real buyer leads (see lib/adfLead.ts). Used to
// verify Beverly Hills Car Club's Salesforce Email Service inbox 2026-09-22;
// keep it around for re-verifying that dealer or onboarding the next one.
// Never touches a real listing, conversation, or offer row, and never emails
// a dealer's normal notification_email inbox.
//
// The lead-ingestion address itself is effectively a bearer secret (anyone
// who has it can inject leads into that dealer's CRM, no further auth) --
// same reasoning dealers.feed_auth_token is never committed. So it's a
// required argument here, not hardcoded, and never something to paste into
// a commit message or comment.
//
// Usage (--env-file has to come before the script path, and before --send):
//   npx tsx --env-file=.env.local scripts/test-adf-lead.ts <adf-lead-email> [dealer-name]            -- prints the XML, does not send
//   npx tsx --env-file=.env.local scripts/test-adf-lead.ts <adf-lead-email> [dealer-name] --send      -- actually sends the email
//
// lib/adfLead.ts constructs its Resend client at import time, so RESEND_API_KEY
// must already be in process.env before that import runs -- Node's --env-file
// flag loads it before any module code executes; a dotenv.config() call inside
// this file would run too late, since ESM evaluates this file's own imports
// (including lib/adfLead.ts) before its own top-level statements.

import { buildAdfLeadXml, sendAdfLead } from '../lib/adfLead';

const args = process.argv.slice(2).filter(a => a !== '--send');
const [adfLeadEmail, dealerName = 'Test Dealer'] = args;

if (!adfLeadEmail) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/test-adf-lead.ts <adf-lead-email> [dealer-name] [--send]');
  process.exit(1);
}

const testLead = {
  dealerName,
  listingId: 'TEST-GARAGECHERRIES-ADF-CHECK',
  vehicle: { year: 1986, make: 'Mercedes-Benz', model: '560SL', vin: 'TESTVIN0000000001', stockNumber: 'TEST-STOCK-1' },
  customer: {
    name: 'GarageCherries Test',
    email: 'no-reply@garagecherries.com',
    phone: '555-555-5555',
    comments: 'This is a test lead from GarageCherries to confirm ADF delivery into your CRM is working. Please disregard -- no action needed.',
  },
};

async function main() {
  const xml = buildAdfLeadXml(testLead);
  console.log('--- ADF lead XML that will be sent ---');
  console.log(xml);
  console.log('--- To: ---');
  console.log(adfLeadEmail);

  if (!process.argv.includes('--send')) {
    console.log('\nDry run only -- re-run with --send to actually email it.');
    return;
  }

  console.log('\nSending...');
  await sendAdfLead(adfLeadEmail, testLead);
  console.log('Done. Check the inbox above (and ask the dealer to confirm it landed as a lead in their CRM).');
}

main();
