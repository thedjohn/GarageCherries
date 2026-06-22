# Vehicle Inspection Marketplace — Product Spec

*GarageCherries Feature Specification | Draft v1.0 | June 2026*

---

## Overview

The Vehicle Inspection Marketplace adds a third-party inspection layer to GarageCherries listings, giving private sellers a way to add credibility to their car and giving buyers confidence before committing to a purchase. A new **Inspector** user type joins the existing Buyer, Dealer, and Advertiser roles.

GarageCherries earns revenue by taking a 20–25% marketplace fee on every inspection booked through the platform.

---

## Problem

Private sellers on GarageCherries have no credibility signal. Dealers have reputation, reviews, and a licensed business — private sellers have only their word. Buyers are reluctant to travel, wire deposits, or commit to a purchase without independent verification. This friction reduces conversion on private listings and exposes the platform to fraud risk.

---

## Solution

A two-sided marketplace connecting:
- **Sellers** who want to signal their car is legitimate and accurately described
- **Buyers** who want independent confirmation before purchasing
- **Inspectors** who offer mobile pre-purchase inspection services and want a lead source

Inspections produce a structured, photo-backed report that attaches permanently to the listing and triggers an **Inspected** badge visible to all buyers.

---

## User Types

### Phase 1 — Affiliate (Weeks 1–2)
No new user type required. Add a "Get This Car Inspected" button on listing detail pages linking to a partner service (Lemon Squad, CARCHEX, or Veritech). GarageCherries earns a referral fee per booked inspection.

### Phase 2 — Native Inspector (Months 2–4)
Full Inspector user type with profile, dashboard, job management, and report submission.

---

## Phase 1: Affiliate Integration

### What Gets Built
- "Get This Car Inspected" button on listing detail pages (private seller listings only, or all listings)
- Referral link to partner inspection service pre-populated with the car's year/make/model/location
- Tracking parameter so GarageCherries earns the referral fee

### Affiliate Partners to Evaluate
| Partner | Coverage | Price Range | Affiliate Program |
|---|---|---|---|
| Lemon Squad | Nationwide (mobile) | $99–$199 | Yes — apply at lemonsquad.com |
| CARCHEX | Nationwide | $99–$249 | Yes |
| Veritech | Nationwide (mobile) | $125–$225 | Contact required |
| AAA | Member areas | ~$150 | Regional |
| Local mechanics | Market-dependent | $75–$150 | No (manual referral) |

### Revenue Estimate (Phase 1)
- Average inspection fee: $150
- GarageCherries referral cut: ~15% = $22.50 per inspection
- At 50 inspections/month: **$1,125/month passive revenue**

### Implementation Checklist
- [ ] Sign affiliate agreement with primary partner (recommend Lemon Squad for nationwide mobile coverage)
- [ ] Add "Get This Car Inspected" button to listing detail page sidebar
- [ ] Pre-populate partner link with `year`, `make`, `model`, `zip` from listing data
- [ ] Add UTM/referral tracking parameter to link
- [ ] Add FTC disclosure ("We may earn a referral fee") near the button
- [ ] Track click-throughs in analytics

---

## Phase 2: Native Inspector Marketplace

### Inspector User Type

#### Registration & Onboarding
Inspectors apply at `/inspector/signup`. Fields collected:

| Field | Type | Required |
|---|---|---|
| Full name | Text | Yes |
| Email | Email | Yes |
| Password | Password | Yes |
| Business name | Text | No |
| Phone | Tel | Yes |
| Service ZIP code | Text | Yes |
| Service radius (miles) | Select: 15 / 25 / 50 | Yes |
| Specialties | Multi-select | No |
| Certifications | Multi-select | No |
| Years of experience | Number | Yes |
| Inspection price | Number | Yes |
| Bio / about | Textarea | No |
| Profile photo | Image upload | No |

**Specialties options:** Domestic Muscle, Import/European, Classic/Pre-1970, Trucks & SUVs, Electric/Hybrid, High-Performance, Exotics

**Certification options:** ASE Certified, Former Dealership Technician, Classic Car Club of America (CCCA), Concours Judge, Licensed Mechanic, Independent Inspector

#### Inspector Review & Approval
All inspector applications are reviewed by GarageCherries before the account goes live.

Approval SLA: 48 business hours. See full vetting criteria below.

---

## Inspector Vetting Criteria

### Non-Negotiable Requirements (All Applicants)

These must be satisfied before any application proceeds to review:

| Requirement | How Verified |
|---|---|
| Government-issued photo ID | Upload during application; manually reviewed |
| Verifiable phone number | Staff callback within 24 hours of application |
| Physical address in stated service area | Cross-checked against ZIP code and service radius |
| Liability insurance (minimum $500k general liability) | Certificate of insurance uploaded at application |
| No active dealer or advertiser account on GarageCherries | Checked against internal user database by email |
| No financial interest in the vehicle being inspected | Attestation on application; spot-checked |

> **Why liability insurance is required:** Inspectors visit private homes and handle vehicles they don't own. Without insurance, a dropped tool or a test drive incident creates uninsured liability for both the inspector and the platform.

---

### Credential Evaluation

Classic car inspection requires different expertise than modern vehicle repair. ASE certification is a positive signal but is not sufficient on its own — ASE tests cover modern OBD-II systems, fuel injection, and electronic diagnostics that have little relevance to a 1967 Camaro with a carburetor and drum brakes.

Credentials are evaluated in three tiers:

#### Tier 1 — Strong Signal (any one qualifies)
| Credential | What It Signals | Verification Method |
|---|---|---|
| ASE Master Technician | Broad, tested mechanical competence | ASE name lookup at ase.com |
| Concours judging experience (AACA, CCCA, Amelia) | Deep knowledge of originality, correct parts, body quality | Self-reported; verified by reference call to show organizer or club |
| Documented restoration of 3+ classic vehicles | Hands-on full-system experience | Photos, receipts, or reference from owner of restored vehicle |
| 5+ years as a classic car specialist (shop or independent) | Sustained professional experience | Employment verification or 2 client references |

#### Tier 2 — Supporting Credential (strengthens application, not standalone)
| Credential | Notes |
|---|---|
| ASE Certification (non-Master) | Counts toward modern systems knowledge |
| Marque club membership (Mustang Club, Mopar, Corvette Club, etc.) | Signals community engagement and make-specific interest |
| CCCA or AACA membership | Active collector car community involvement |
| Former dealership technician | Professional shop discipline; verify with employment reference |
| Vocational/trade school automotive certification | Entry-level formal training |

#### Tier 3 — Not Sufficient Alone
| Credential | Why It's Insufficient |
|---|---|
| General ASE certification only (non-Master, no classic experience) | Covers modern systems; limited relevance to pre-1980 vehicles |
| "Car enthusiast" or hobbyist self-description | No verifiable skill |
| YouTube / social media presence | Not a professional credential |
| Modern dealership service experience only | Different skill set; no classic car overlap |

---

### Phone Interview (Required for All Applicants)

Every applicant who passes the document review receives a 15-minute phone interview with a GarageCherries team member. The purpose is to assess practical classic car knowledge — not to quiz the applicant, but to hear how they talk about cars.

**Interview guide:**

1. *"Tell me about the last classic car you inspected or worked on. What did you find?"*
   - **Good answer:** Specific — mentions matching numbers, date-coded parts, panel gaps, body stampings, correct carburetor for the model year, originality of components.
   - **Weak answer:** General — mentions fluid condition, tire tread, whether it started. These are real checks but suggest a modern-vehicle inspection mindset.

2. *"How do you verify whether an engine is numbers-matching on a pre-1970 American muscle car?"*
   - **Good answer:** Knows to check the VIN-stamped pad on the block, the partial VIN suffix, the build sheet if available, and date codes on major components.
   - **Weak answer:** Doesn't know what numbers-matching means, or thinks it's just matching the VIN on the door to the title.

3. *"What are the three most common structural issues you look for on a unibody car from the 1960s?"*
   - **Good answer:** Floor pan rust, frame rail rust/repair, torque box cracking, poorly repaired accident damage, evidence of rocker panel replacement.
   - **Weak answer:** Can't answer or gives generic responses.

4. *"Have you ever told a buyer not to purchase a car? What happened?"*
   - Looking for: willingness to give honest, unfavorable assessments. This is a trust signal for buyers. An inspector who never recommends against buying is not useful.

**Interview outcome:** Pass / Conditional Pass (require additional credential) / Fail. Noted in internal admin record.

---

### Probationary Period

New inspectors are approved on a **probationary** basis for their first 3 inspections. During probation:

- All submitted reports are reviewed by a GarageCherries team member before publishing to the listing
- Inspector is notified of any report quality issues (missing photos, incomplete sections, vague notes)
- If all 3 reports meet quality standards, inspector graduates to **Full Approval** and reports publish automatically
- If a report fails review, inspector receives feedback and one opportunity to revise; a second failure results in account suspension

---

### Ongoing Quality Monitoring

Approval is not permanent. Inspectors are monitored continuously:

| Trigger | Action |
|---|---|
| Rating drops below 3.8 (rolling 10 reviews) | Flagged for admin review; temporarily removed from new job matching |
| Two buyer complaints about inaccurate reports | Mandatory re-review; probationary status reinstated |
| Missed job without 24-hour notice (2 occurrences) | Warning; 3rd occurrence = suspension |
| Insurance certificate expires | 14-day grace period to renew; suspended if not renewed |
| Inspector found to have financial interest in an inspected vehicle | Immediate suspension; review for permanent removal |

---

### Conflict of Interest Policy

Inspectors may not inspect:
- A vehicle they have previously owned
- A vehicle listed by a dealer or seller they have a financial relationship with
- A vehicle they are considering purchasing
- A vehicle owned by a family member or business partner

Sellers and buyers attest at booking that they have no prior relationship with the assigned inspector. GarageCherries cross-references inspector and seller accounts for shared email domains, phone numbers, or addresses.

---

### Inspector Tiers (Earned Over Time)

As inspectors complete more jobs and accumulate reviews, they advance through tiers that affect their visibility in search results:

| Tier | Requirements | Benefit |
|---|---|---|
| **Provisional** | Approved, 0–2 completed inspections | Listed but ranked lower |
| **Verified** | 3+ completed, rating ≥ 4.0 | Standard ranking; "Verified Inspector" badge |
| **Elite** | 25+ completed, rating ≥ 4.5, no complaints | Top of search results; "Elite Inspector" badge on listing reports |
| **Specialist** | Elite + documented marque expertise | Shown first for listings matching their specialty |

#### Inspector Profile (Public)
Public-facing page at `/inspectors/[slug]`:
- Name, photo, location, years of experience
- Specialties and certifications as badges
- Inspection price and service radius
- Review score and number of completed inspections
- Reviews from past buyers/sellers
- "Request Inspection" button

---

### Inspection Request Flow

#### Seller-Initiated
1. Seller views their listing on GarageCherries
2. Clicks "Add Inspection" in their listing management panel
3. Enters ZIP code → sees available inspectors within their area, sorted by distance and rating
4. Selects an inspector and preferred date/time window
5. Pays the inspection fee (Stripe) — GarageCherries holds payment in escrow
6. Inspector receives job notification (email + dashboard)
7. Inspector confirms or proposes alternative time within 24 hours
8. Inspection takes place
9. Inspector submits report within 24 hours of inspection
10. GarageCherries releases payment to inspector (minus 20–25% platform fee)
11. Report attaches to listing; "Inspected" badge appears

#### Buyer-Initiated
Same flow, but buyer pays and is named as the report recipient. Seller must consent (checkbox) before an inspection can be booked on their listing.

#### Cancellation Policy
- Seller/buyer cancels 48+ hours before: full refund
- Cancels 24–48 hours before: 50% refund
- Cancels under 24 hours: no refund (inspector compensated for travel)
- Inspector cancels: full refund, inspector flagged for reliability review

---

### Inspection Report

The report is a **structured form** — not free-form text. Each section has a condition rating, required photo(s), and optional notes. The structured format allows GarageCherries to generate a standardized summary badge and ensures consistent quality across all inspectors.

#### Report Sections

**1. Identity Verification**
- [ ] VIN confirmed matches title
- [ ] VIN plate present and unaltered
- [ ] Odometer reading (photo required)
- [ ] Title status (clean / salvage / rebuilt / lien)
- [ ] Registration current

**2. Body & Paint**
- Overall body condition: Excellent / Good / Fair / Poor
- Panel gaps consistent: Yes / No
- Evidence of prior accidents or repairs: None / Minor / Significant
- Rust present: None / Surface / Structural
- Paint condition: Original / Repainted (partial) / Repainted (full)
- Photo required: each panel, front, rear, both sides, undercarriage

**3. Frame & Undercarriage**
- Frame condition: Straight / Minor damage / Bent or repaired
- Evidence of frame repair (welds, patches): Yes / No
- Undercarriage rust: None / Surface / Moderate / Severe
- Photo required: frame rails, floor pans, crossmembers

**4. Engine & Drivetrain**
- Engine starts and runs: Yes / No
- Engine identification: Matching numbers / Numbers-matching claimed but unverified / Replacement
- Oil condition: Clean / Dirty / Metal particles noted
- Coolant condition: Clean / Rusty / Low
- Transmission shifts correctly: Yes / No / Not tested
- Leaks observed: None / Minor / Active
- Photo required: engine bay from multiple angles, VIN stamp location

**5. Electrical**
- All lights operational: Yes / Partial / No
- Gauges functional: Yes / Partial / No
- Power accessories (windows, locks, radio): Yes / Partial / No / Not applicable
- Battery condition: Good / Weak / Dead

**6. Interior**
- Overall interior condition: Excellent / Good / Fair / Poor
- Seats: Original / Reupholstered / Damaged
- Dashboard: Intact / Cracked / Restored
- Carpet: Original / Replaced / Damaged
- Headliner: Intact / Sagging / Replaced
- Photo required: driver seat, passenger seat, dash, rear seat, trunk

**7. Tires & Brakes**
- Tire tread depth (all four): measurement in 32nds
- Tires match (brand/size): Yes / No
- Brake pedal feel: Firm / Soft / Pulsating
- Brake warning light: Off / On
- Visible rotor condition: Good / Grooved / Rusty

**8. Test Drive** *(if vehicle is operational)*
- Cold start behavior: Smooth / Rough / Wouldn't start
- Engine idle: Stable / Rough / High
- Acceleration: Normal / Hesitation / Misfiring
- Braking: Normal / Pulls / Grinding
- Steering: Normal / Loose / Pulls
- Transmission: Smooth / Slipping / Clunking
- Unusual noises noted: (free text)

**9. Inspector's Summary**
- Overall rating: ★★★★★ (1–5)
- Highlights: (free text, 500 char max)
- Concerns: (free text, 500 char max)
- Recommendation: **Buy with Confidence** / **Buy with Caveats** / **Proceed with Caution** / **Do Not Recommend**

**10. Photo Submission**
- Minimum 20 photos required to complete report
- Each section above has required photo slots
- Inspector uploads via dashboard; stored in Supabase Storage
- Photos watermarked with GarageCherries + inspection date

---

### Inspection Badge on Listing

Once report is submitted and approved, the listing displays:

**Inspected badge** (green) — appears on listing card and detail page
**Report summary** — collapsible section on listing detail page showing:
- Inspector name, certifications, rating
- Date of inspection
- Overall rating (stars)
- Recommendation label
- Section-by-section condition summary
- Link to view full report (all photos)

Badge persists permanently on the listing. If a listing is edited significantly after inspection (price, mileage, or photos changed substantially), the badge shows "Inspected — see notes" rather than plain "Inspected" and the report remains accessible.

---

### Inspector Dashboard

Located at `/inspector/dashboard`. Sections:

**Pending Jobs** — incoming inspection requests awaiting confirmation
**Upcoming** — confirmed jobs with date/time/address
**In Progress** — jobs where inspection has occurred but report not yet submitted
**Completed** — historical jobs with earnings summary
**Earnings** — total paid out, pending, and platform fee breakdown
**Profile** — edit public profile, update pricing, service radius, availability

---

### Pricing & Fees

#### Inspector Pricing
Inspectors set their own price (minimum $75, suggested $125–$250). GarageCherries displays the price to sellers/buyers before booking.

#### Platform Fee
GarageCherries retains **22%** of each inspection fee.

| Inspector price | Platform fee (22%) | Inspector earns |
|---|---|---|
| $100 | $22 | $78 |
| $150 | $33 | $117 |
| $200 | $44 | $156 |
| $250 | $55 | $195 |

#### Seller Upgrade Option
"Inspection-Ready" badge — seller pays a $25 coordination fee to GarageCherries and GarageCherries handles scheduling. Inspector fee is separate and paid by seller at booking.

---

### Revenue Projections

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active inspectors | 15 | 40 | 120 |
| Inspections/month | 30 | 120 | 500 |
| Average inspection fee | $150 | $160 | $165 |
| GarageCherries revenue (22%) | $990 | $4,224 | $18,150 |
| Annual run rate | — | — | **$217,800** |

---

## Database Schema (New Tables)

### `inspectors`
```sql
id               uuid PRIMARY KEY
user_id          uuid REFERENCES auth.users(id)
slug             text UNIQUE
name             text
business_name    text
phone            text
bio              text
photo_url        text
service_zip      text
service_radius   integer  -- miles
price            numeric  -- inspector's fee
specialties      text[]
certifications   text[]
years_experience integer
active           boolean DEFAULT false  -- false until approved by admin
approved_at      timestamptz
rating           numeric(3,2)
review_count     integer DEFAULT 0
created_at       timestamptz DEFAULT now()
```

### `inspection_requests`
```sql
id               uuid PRIMARY KEY
listing_id       text REFERENCES cars(id)
inspector_id     uuid REFERENCES inspectors(id)
requested_by     uuid REFERENCES auth.users(id)  -- seller or buyer
request_type     text  -- 'seller' | 'buyer'
status           text  -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
preferred_date   date
preferred_time   text
confirmed_at     timestamptz
fee_total        numeric
platform_fee     numeric
inspector_payout numeric
stripe_payment_id text
created_at       timestamptz DEFAULT now()
```

### `inspection_reports`
```sql
id                    uuid PRIMARY KEY
request_id            uuid REFERENCES inspection_requests(id)
listing_id            text REFERENCES cars(id)
inspector_id          uuid REFERENCES inspectors(id)
status                text  -- 'draft' | 'submitted' | 'published'
overall_rating        integer  -- 1–5
recommendation        text  -- 'buy_confident' | 'buy_caveats' | 'caution' | 'do_not_buy'
highlights            text
concerns              text
vin_confirmed         boolean
odometer_reading      integer
title_status          text
body_condition        text
frame_condition       text
engine_condition      text
drivetrain_condition  text
electrical_condition  text
interior_condition    text
tires_condition       text
brakes_condition      text
test_drive_notes      text
photos                text[]
submitted_at          timestamptz
published_at          timestamptz
created_at            timestamptz DEFAULT now()
```

### `inspector_reviews`
```sql
id            uuid PRIMARY KEY
inspector_id  uuid REFERENCES inspectors(id)
reviewer_id   uuid REFERENCES auth.users(id)
request_id    uuid REFERENCES inspection_requests(id)
rating        integer  -- 1–5
body          text
created_at    timestamptz DEFAULT now()
```

---

## Pages & Routes

| Route | Description |
|---|---|
| `/inspectors` | Browse inspectors by location/specialty |
| `/inspectors/[slug]` | Public inspector profile |
| `/inspector/signup` | Inspector application form |
| `/inspector/login` | Inspector login |
| `/inspector/dashboard` | Inspector job management |
| `/inspector/dashboard/report/[requestId]` | Submit inspection report |
| `/inspector/dashboard/profile` | Edit profile |
| `/listings/[...segments]` | Updated — shows inspection badge + report summary |
| `/api/inspector/requests` | GET/POST inspection requests |
| `/api/inspector/report` | POST submit report |
| `/api/inspector/profile` | GET/PATCH inspector profile |

---

## Implementation Phases

### Phase 1 — Affiliate Button (1–2 days)
- [ ] Add "Get This Car Inspected" button to listing detail sidebar
- [ ] Link to Lemon Squad with pre-populated car details
- [ ] Add FTC disclosure
- [ ] Sign affiliate agreement with Lemon Squad

### Phase 2 — Inspector Profiles & Browse (1 week)
- [ ] Create `inspectors` table and migration
- [ ] Build `/inspector/signup` form and approval flow
- [ ] Build `/inspectors` browse page with location filter
- [ ] Build `/inspectors/[slug]` public profile page
- [ ] Admin review queue for new inspector applications

### Phase 3 — Booking & Payment (2 weeks)
- [ ] Create `inspection_requests` table
- [ ] Build booking flow (date selection, inspector selection, Stripe checkout)
- [ ] Inspector dashboard — pending/upcoming jobs
- [ ] Confirmation emails to both parties
- [ ] Cancellation flow and refund logic

### Phase 4 — Report Submission (2 weeks)
- [ ] Create `inspection_reports` table
- [ ] Build structured report form in inspector dashboard
- [ ] Photo upload per section
- [ ] Report submission and admin review
- [ ] Publish report to listing — badge + summary display
- [ ] Stripe payout to inspector (Stripe Connect)

### Phase 5 — Reviews & Trust (1 week)
- [ ] Post-inspection review prompt to buyer/seller
- [ ] `inspector_reviews` table
- [ ] Rating aggregation on inspector profile
- [ ] Flag inspectors with low ratings for review

---

## Open Questions

1. **Who approves reports before publishing?** Manual admin review adds quality control but creates a bottleneck. Auto-publish if all required photos are uploaded and report is complete?
2. **Stripe Connect or manual payouts?** Stripe Connect handles inspector payouts automatically but requires inspectors to onboard to Stripe. Manual (ACH/check) is simpler to launch but doesn't scale.
3. **Buyer consent for seller-initiated inspections?** Should buyers be notified that an inspection was commissioned by the seller, not a neutral third party?
4. **Inspector insurance requirements?** Mobile inspectors visiting private homes should carry liability insurance. Require proof of insurance at onboarding?
5. **Geographic launch strategy?** Launch in 2–3 metro markets first (St. Louis, Chicago, Dallas) to build inspector density before opening nationally?

---

## Success Metrics

| Metric | Month 3 target | Month 6 target |
|---|---|---|
| Active inspectors | 15 | 40 |
| Inspection requests/month | 30 | 120 |
| Report completion rate | > 90% | > 95% |
| Average inspector rating | > 4.2 | > 4.4 |
| Buyer satisfaction (post-purchase survey) | — | > 4.0/5 |
| Listings with inspection badge | 5% | 15% |

---

*For legal considerations related to this feature see `Legal-Review-Checklist.md`. For revenue context see `Annual-Revenue-Potential.md`.*
