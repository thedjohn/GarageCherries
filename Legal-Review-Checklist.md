# GarageCherries — Legal Review Checklist

*For review with a licensed attorney before public launch. This document is not legal advice.*

---

## Priority 1 — Fix Before Launch

These items are either legally required or create significant liability exposure if missing.

### 1. DMCA Safe Harbor (17 U.S.C. § 512)

**What it is:** Federal copyright law provides a liability shield ("safe harbor") for platforms that host user-generated content — but only if the platform registers a DMCA agent with the U.S. Copyright Office and publishes a compliant takedown policy.

**Why it matters:** Dealers upload photos and listing descriptions. If a photo is copyrighted by a third party (e.g., a photographer, another marketplace), GarageCherries could be liable for infringement without this protection.

**What's needed:**
- [ ] Register a DMCA agent at copyright.gov/dmca-agent ($6 fee, renews every 3 years)
- [ ] Add a DMCA takedown procedure to the Terms of Service (counter-notice process, 10/14-day response window)
- [ ] Publish the agent's contact information on the Site (typically in Terms or a `/dmca` page)
- [ ] Implement a repeat infringer policy — required to maintain safe harbor

---

### 2. FTC Affiliate/Referral Disclosure (16 C.F.R. Part 255)

**What it is:** The FTC requires clear disclosure whenever a site earns compensation for recommending a product or service. "Clear and conspicuous" means near the recommendation, not buried in a footer or Terms page.

**Why it matters:** GarageCherries plans referral revenue from Hagerty (insurance), JJ Best Banc / Woodside Credit (financing), and Montway / uShip (transport). All of these trigger disclosure requirements.

**What's needed:**
- [ ] Add a disclosure statement to Terms of Service (already partially done — expand it)
- [ ] Add inline disclosures on any page where affiliate links appear (e.g., "We may earn a referral fee if you purchase a policy through this link")
- [ ] If a newsletter includes sponsored content, clearly label it as sponsored
- [ ] Create an `/affiliate-disclosure` page or section (common practice, not strictly required)

---

### 3. Fill In All Placeholder Text

The current Terms of Service and Privacy Policy contain unfilled placeholders that make them legally incoherent.

**What's needed:**
- [ ] `[Your State]` in Terms § 12 (Governing Law) — insert actual state of incorporation/operation
- [ ] `[Your City, State]` in Terms § 12 (Arbitration venue) — insert actual city
- [ ] `[Your Address]` in Privacy Policy § 9 (Contact) — insert registered business address
- [ ] Confirm `GarageCherries LLC` matches the actual registered legal entity name
- [ ] Confirm the registered agent address is correct for legal notices

---

### 4. Data Breach Notification Policy

**What it is:** 48 U.S. states have breach notification laws requiring companies to notify affected users within a defined window (commonly 30–45 days) after discovering a data breach.

**Why it matters:** Collecting email addresses, passwords (hashed), and financial data creates notification obligations if compromised. Supabase has had security incidents; GarageCherries holds user credentials.

**What's needed:**
- [ ] Add a breach notification section to the Privacy Policy stating the notification timeframe (recommend "within 30 days of discovery" to cover the most restrictive state laws)
- [ ] Define what constitutes a breach triggering notification
- [ ] Document an internal incident response process (even a one-page document)

---

## Priority 2 — Required for Dealer/Transaction Features

These become legally required once payment processing and dealer accounts go live.

### 5. FTC Used Car Rule (16 C.F.R. Part 455)

**What it is:** Federal law requires dealers to display a Buyer's Guide on every used vehicle offered for sale. The guide discloses warranty status (As-Is vs. warranty), what systems are covered, and who pays for repairs.

**Why it matters:** Dealers listing on GarageCherries are selling used vehicles. If GarageCherries facilitates or appears to facilitate the sale, it could share liability for non-compliance.

**What's needed:**
- [ ] Add a clause to dealer Terms requiring compliance with the FTC Used Car Rule
- [ ] Consider a checklist in the dealer dashboard confirming Buyer's Guide has been provided
- [ ] Attorney review of whether GarageCherries' role as a marketplace (vs. dealer) affects direct liability

---

### 6. Odometer Disclosure (49 U.S.C. § 32705)

**What it is:** Federal law requires sellers to disclose a vehicle's odometer reading in writing at the time of sale for vehicles under 10 years old. Violations carry civil and criminal penalties.

**Why it matters:** Dealers list mileage on GarageCherries. If the stated mileage is inaccurate, buyers could claim the platform facilitated a disclosure violation.

**What's needed:**
- [ ] Add odometer accuracy requirement to dealer Terms
- [ ] Add a disclaimer on listing pages stating mileage is seller-reported and buyers should verify
- [ ] Attorney review of marketplace vs. seller liability here

---

### 7. Truth in Lending Act (TILA) / Regulation Z

**What it is:** If GarageCherries facilitates or advertises financing — even by linking to lenders — TILA requires certain disclosures about loan terms (APR, total cost, payment schedule).

**Why it matters:** Planned financing referral partnerships with JJ Best Banc and Woodside Credit will trigger this if GarageCherries shows any rate or payment estimate.

**What's needed:**
- [ ] Do not display financing estimates or "monthly payment" calculators without compliant TILA disclosures
- [ ] Affiliate links to lenders with no on-site rate display are generally lower risk — have an attorney confirm
- [ ] Review lender affiliate agreements for compliance obligations they pass to referrers

---

### 8. PCI DSS Compliance

**What it is:** Payment Card Industry Data Security Standard. Required for any entity that processes, stores, or transmits cardholder data.

**Why it matters:** When Stripe is wired for dealer subscriptions and listing fees, GarageCherries becomes a PCI-scoped entity.

**What's needed:**
- [ ] Use Stripe's hosted payment elements (not custom card fields) to minimize PCI scope
- [ ] Complete Stripe's SAQ A self-assessment questionnaire (sufficient for most SaaS businesses using hosted fields)
- [ ] Add a brief statement to the Privacy Policy noting that payment data is processed by Stripe and not stored by GarageCherries

---

## Priority 3 — State-Specific and Regulatory

### 9. State Motor Vehicle Dealer Licensing

**What it is:** Every U.S. state regulates motor vehicle dealers. Licensing requirements, bonding requirements, and consumer protection rules vary significantly.

**Why it matters:** GarageCherries allows dealers from all 50 states to list vehicles. The platform's dealer Terms should require licensing compliance and limit GarageCherries' liability for unlicensed dealers.

**What's needed:**
- [ ] Add a dealer representation/warranty to the Terms that they hold all required licenses in their jurisdiction
- [ ] Consider a license number field in dealer onboarding (adds friction but reduces liability)
- [ ] Consult an attorney in your primary state of operation about whether GarageCherries itself needs any licensing as a vehicle advertising platform

---

### 10. California Consumer Privacy Act (CCPA) — Expand

**What it is:** The CCPA (and its amendment, the CPRA) grants California residents specific rights over their personal data. The Privacy Policy already references CCPA but is thin on mechanics.

**Why it matters:** California is the largest U.S. car market. If any California residents use GarageCherries, CCPA applies.

**What's needed:**
- [ ] Add a "Do Not Sell or Share My Personal Information" link in the footer (required if "selling" or "sharing" data — review whether ad network integrations trigger this)
- [ ] Define the specific data categories collected (as CCPA enumerates them — identifiers, commercial information, internet activity, etc.)
- [ ] Add a response timeframe for data access/deletion requests (CCPA requires 45 days)
- [ ] Add a non-discrimination statement (users who exercise CCPA rights cannot be denied service)

---

### 11. CAN-SPAM Compliance

**What it is:** Federal law governing commercial email. Already partially compliant based on how email alerts are built, but a few specifics need verification.

**What's needed:**
- [ ] Every commercial email must include a physical mailing address (the `[Your Address]` placeholder in Privacy applies here too)
- [ ] Unsubscribe requests must be honored within 10 business days
- [ ] Subject lines must not be deceptive
- [ ] "From" name and address must accurately identify the sender
- [ ] Car alert emails — confirm they qualify as transactional (user-initiated) rather than commercial, as transactional emails have lighter requirements

---

## Priority 4 — Good Practice / Risk Reduction

These are not legally required in most cases but are standard practice for marketplaces and reduce litigation risk.

### 12. Accessibility (ADA / WCAG 2.1)

The ADA has been interpreted by courts to apply to websites. Plaintiffs' firms have filed hundreds of demand letters and lawsuits against e-commerce sites. Classic car buyers skew older (45–65) — a demographic more likely to use accessibility tools.

- [ ] Run an automated audit (axe, Lighthouse) and fix critical failures
- [ ] Add an Accessibility Statement page
- [ ] Target WCAG 2.1 Level AA compliance

---

### 13. Cookie Consent / GDPR

GDPR applies to any EU resident using the Site. If GarageCherries is US-only and has no EU marketing presence, risk is low — but not zero.

- [ ] Add a cookie consent banner for non-essential cookies (analytics, advertising)
- [ ] Add a brief GDPR section to the Privacy Policy (or a note that the Site is intended for US residents only)
- [ ] If EU visitors are significant in analytics, a full GDPR compliance review is warranted

---

### 14. Terms for AI-Generated Content

GarageCherries uses AI (Anthropic Claude) for price assessments and listing descriptions. AI-generated content creates specific legal exposure.

- [ ] The Terms currently disclaim AI content as "not a professional appraisal." Expand this — specify that AI price estimates are for informational purposes only and GarageCherries is not liable if a user relies on them in a transaction
- [ ] Review Anthropic's usage policies to confirm commercial use of Claude for this purpose is permitted (it is, under current terms, but log this for future policy changes)
- [ ] Do not represent AI-generated descriptions as dealer-authored without disclosure

---

### 15. Escrow and Anti-Fraud Warnings

Already partially covered in the Terms. Strengthen it:

- [ ] Add explicit warning on listing pages: "Never wire funds, use gift cards, or pay via cryptocurrency without using a licensed vehicle escrow service"
- [ ] Recommend specific escrow services (Escrow.com, Pavaso) — this also creates an affiliate opportunity
- [ ] Add a fraud reporting link/email prominently in the listing inquiry flow

---

## Seller & Listing Verification

These measures validate that a seller actually possesses the vehicle listed, protecting buyers from fraud and strengthening GarageCherries' credibility as a marketplace.

### 16. VIN Verification (NHTSA API — Free)

**What it is:** The NHTSA maintains a free public API that decodes any VIN and returns the official make, model, year, and body style.

**Why it matters:** A fabricated or mismatched VIN is a primary indicator of listing fraud. Verifying the VIN against stated listing details catches errors and deception at submission time.

**What's needed:**
- [ ] Require VIN on all listings (dealer and private seller)
- [ ] Call the NHTSA VIN decoder API at listing submission to confirm VIN matches stated make/model/year
- [ ] Display a "VIN Verified" badge on passing listings
- [ ] Block or flag listings where VIN does not match

**API:** `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{VIN}?format=json` (free, no key required)

---

### 17. Stolen Vehicle Check (NICB VINCheck — Free)

**What it is:** The National Insurance Crime Bureau (NICB) maintains a database of vehicles reported stolen or salvaged. Their VINCheck tool is publicly accessible.

**Why it matters:** Listing a stolen vehicle on a marketplace creates legal liability for the platform. A "Not reported stolen" badge is a meaningful trust signal buyers recognize.

**What's needed:**
- [ ] Integrate NICB VINCheck at listing submission (or as a scheduled background check)
- [ ] Display a "Not Reported Stolen" badge on cleared listings
- [ ] Automatically suppress or flag listings that return a stolen/salvage hit
- [ ] Review NICB's terms of service for commercial API usage — a partner agreement may be required

**API:** nicb.org/vincheck (manual lookup available; contact NICB for bulk/commercial API access)

---

### 18. Carfax / AutoCheck Partner Badge

**What it is:** Carfax and AutoCheck (Experian) offer dealer partner programs that display a vehicle history report badge on listings. Buyers immediately recognize these as credibility signals.

**Why it matters:** A Carfax badge communicates that the history is on record — accident history, title issues, service records. It is one of the most recognized trust signals in used car sales.

**What's needed:**
- [ ] Apply for the Carfax Advantage Dealer program or AutoCheck partner program
- [ ] Display report badges on eligible listings (requires VIN to be present — see item 16)
- [ ] Review partner agreement for display requirements and fees
- [ ] Note: Carfax reports also flag odometer rollbacks — supports compliance with item 6 (Odometer Disclosure)

---

### 19. State Dealer License Verification

**What it is:** All 50 states maintain public databases of licensed motor vehicle dealers. Most are searchable by license number or business name.

**Why it matters:** Verifying a dealer's license at onboarding ensures only legitimate, licensed dealers list on the platform — reducing fraud risk and supporting the warranty made in dealer Terms (item 9).

**What's needed:**
- [ ] Add a dealer license number field to the dealer onboarding form
- [ ] Manually verify license against the applicable state database before approving the account
- [ ] Display a "Licensed Dealer" badge on dealer profiles
- [ ] Re-verify licenses annually (licenses expire; dealers can lose them)
- [ ] Consider building a lookup tool against state DMV APIs for the most active dealer states (CA, TX, FL, NY, IL)

---

### 20. Photo Authenticity Requirement

**What it is:** Require sellers to include at least one photo showing the vehicle with a handwritten GarageCherries listing code (or a printed card with the listing ID) visibly in frame. Used by Bring a Trailer and Cars & Bids.

**Why it matters:** Stock photos and photos stolen from other listings cannot include a code specific to this listing. This single requirement eliminates the most common form of listing photo fraud.

**What's needed:**
- [ ] Generate a unique listing code at the time a listing is created
- [ ] Require at least one submitted photo to include the code (enforced via dealer dashboard instructions; optionally reviewed manually for early listings)
- [ ] Add a note in listing submission UI: "At least one photo must show the vehicle with your listing code [XXXX-XXXX] visibly displayed"
- [ ] Consider AI-assisted photo review to flag listings where no photo contains text matching the code

---

### 21. Identity Verification for Dealers (Stripe Identity / KYC)

**What it is:** Stripe Identity is a Know Your Customer (KYC) product that verifies a government-issued ID during onboarding. It confirms the dealer account is associated with a real, identified person.

**Why it matters:** Deters fraudulent dealer accounts from being created. Creates a paper trail if a dealer commits fraud — law enforcement can be provided with verified identity records.

**What's needed:**
- [ ] Integrate Stripe Identity into the dealer onboarding flow (requires Stripe account — aligns with Stripe wiring for payments)
- [ ] Store verification status (verified / pending / failed) on the dealer record
- [ ] Display a "Identity Verified" badge on dealer profiles
- [ ] Review Stripe Identity pricing (currently ~$1.50 per verification) and include in dealer onboarding cost model
- [ ] Update Privacy Policy to disclose that identity documents are collected and processed by Stripe during dealer onboarding

---

### 22. Listing Fraud Warnings for Buyers

**What it is:** Prominent buyer-facing warnings in the listing inquiry flow about common fraud tactics in the collector car market.

**Why it matters:** GarageCherries' Terms already include fraud warnings, but placing them at the point of transaction (inquiry form, not just a Terms page) significantly improves buyer protection and reduces platform liability.

**What's needed:**
- [ ] Add a fraud warning callout on the listing detail page near the contact/inquiry button
- [ ] Warn specifically against: wire transfers, gift card payments, cryptocurrency without escrow, sellers requesting deposit before viewing
- [ ] Link to recommended escrow services (Escrow.com, Pavaso)
- [ ] Consider a one-click "Report this listing" button on every listing detail page

---

## Recommended Next Steps

1. **Retain an attorney** experienced in internet/marketplace law and automotive transactions. DMCA registration, FTC affiliate disclosures, and state dealer licensing are the three areas where errors create the most acute liability.

2. **Register the DMCA agent** immediately — it is a $6 federal filing and there is no downside to doing it now.

3. **Fill in the placeholder text** in Terms and Privacy before any public promotion.

4. **Before wiring Stripe:** have the Terms reviewed with payment terms in place, and complete the PCI SAQ A questionnaire.

5. **Before launching affiliate links** (Hagerty, JJ Best, etc.): add inline FTC disclosures to every page where those links appear.

---

*This checklist was prepared as a development reference. It is not legal advice. Consult a licensed attorney in your jurisdiction before relying on any of the above.*
