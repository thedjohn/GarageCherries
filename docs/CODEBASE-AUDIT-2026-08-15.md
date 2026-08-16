# GarageCherries Codebase Audit
**Date:** 2026-08-15 · **Method:** Read-only, file:line-cited, 9 parallel research passes across the full repo. No code was modified.

> Legend: **IMPLEMENTED** (fully wired) · **PARTIAL** (something missing/broken/unenforced) · **NOT IMPLEMENTED** (no meaningful code) · **NEEDS MANUAL VERIFICATION** (repo can't prove it — usually external service/live-DB state)

---

## Table of Contents
1. [Section-by-section findings (1–69)](#findings)
2. [§70 Final Priority Table](#priority-table)
3. [26 Most Important Questions — Direct Answers](#questions)
4. [A–I Final Output](#final-output)

---
<a name="findings"></a>
## Section-by-section findings

### 1. Marketplace Statistics — **PARTIAL**
**Files:** `app/page.tsx:36-55`, `app/reports/page.tsx:26-32,86-89`, `app/pricing/page.tsx:87-90`, `app/about/page.tsx:33-36,113-115`, `app/dealers/page.tsx:23-27`, `app/dealers/[slug]/page.tsx:59-64`
**DB:** `listings`, `dealers`, `events` · **API:** none — live server-component queries
Active-listing, dealer, sold, and event counts are all real live DB queries, not hardcoded — good. But three conflicts found:
1. **`/pricing`'s listing count omits `is_sold`/expiry filters** that the homepage/`/reports`/`/about` all apply — inflates the advertised inventory number.
2. **`/dealers` per-dealer counts omit `is_sold=false`** — a sold-but-not-expired listing still counts as "active" on the dealer list page, but not on the dealer's own detail page.
3. **`/about`'s "Model Guides: 54" and "Buyer's Guides: 6" are hardcoded and wrong** — actual counts are 156 model guides (39 makes) and 10 buyer guides.
**Next action:** add missing filters to `/pricing` and `/dealers` queries; replace hardcoded `/about` numbers with real `.length` counts.
**Priority: P1**

### 2. Dealer Verification — **PARTIAL**
**Files:** `app/dealer/apply/page.tsx`, `app/api/dealer/apply/route.ts`, `app/api/admin/dealer-applications/route.ts`, `app/dealer/dashboard/page.tsx:779-781`, `components/DealerBadge.tsx`
**DB:** `dealer_applications` (status/rejection_note/reviewed_at) · `dealers` (**no `verified` boolean exists**)
A real admin-gated approve/reject workflow exists for dealer *applications* — but there is no actual verification of anything (no license check, no registration lookup, no document review): an admin reads free-text prose and clicks Approve. The "Verified" badge shown in every dealer's own dashboard header is a **hardcoded `<span>`**, unconditional, tied to no field. The advertised "Verified Dealer badge" (Unlimited plan feature on `/pricing`) does not exist as a distinct entity — `DealerBadge.tsx`'s Gold/Silver/Bronze tiers are computed from listing count only, unrelated to verification or plan.
**Answer to "is it a real workflow or a manual flag":** neither — there isn't even a flag. "Verified" = "row exists in `dealers` table."
**Priority: P1**

### 3. Private Seller Review — **PARTIAL** (dealer path bypasses review entirely — documented split, not a bug, but material)
**Files:** `app/sell/SellClient.tsx`, `app/api/listings/submit/route.ts`, `app/api/admin/listings/route.ts:260-312`, `app/dealer/dashboard/page.tsx:197-206`
**DB:** `listings.status` (pending/approved/rejected), `resubmission_count`, `resubmission_note`, `rejection_reason`
Step-by-step for a private seller: signup is generic (no seller-specific registration) → submit via rate-limited (5/hr), CAPTCHA-verified, image-URL-validated form → inserted via `insert_listing_with_limit` RPC (atomic 10-listing cap, closes a prior race condition) always as `status='pending'` → sits until a moderator approves/rejects via the admin panel → seller emailed either way (approval also triggers alert-matching + Facebook post; rejection includes a "Fix & Resubmit" CTA). Editing a **live approved listing sends it back to `pending`** for any change, even trivial ones (worth confirming this is intended UX).
By contrast, **dealers get an entirely separate flow that auto-publishes** (`status:'approved'` hardcoded, inserted client-side, no review step) — documented in code comments as intentional.
**Gap:** the actual Postgres RLS policy gating `listings` INSERT is **not present in any tracked migration** — cannot confirm from the repo that a private seller is technically blocked from inserting `status='approved'` directly. **Needs live-DB verification.**
No fraud/reporting workflow exists at the *listing* level (see §25).
**Priority: P1** (RLS-verification gap on a privilege-relevant control)

### 4. Promotional Messaging — **13 locations found, several contradictions**
| # | Quote | Location | Issue |
|---|---|---|---|
| 1 | "250th Birthday Promo — free through {date}" | `app/pricing/page.tsx:115` | Accurate |
| 2 | "Free listing till end of year" | `components/PromoBanner.tsx:32-33` | Accurate |
| 3 | "Listing on GarageCherries is free." | `app/sell/SellGate.tsx:14` | **Contradicts** the same page's advertised $49/$99 private-seller fees — `SellClient.tsx` has zero fee code, listings are unconditionally free regardless of promo |
| 4 | "Verified Dealer badge" (Unlimited plan) | `app/pricing/page.tsx:55` | No such feature exists (see §2) |
| 5 | "N verified dealers" | `app/dealers/page.tsx:38` | "Verified" = row exists in table, nothing more |
| 6 | "engaged, affluent" readers | `app/contact/page.tsx:83` | Unverifiable, no audience data collected anywhere |
| 7 | AutoTrader price comparison | `app/pricing/page.tsx:122-127` | Self-disclosed estimate, not a code issue |
| 8 | "14-day free trial" (dealer FAQ/CTA) | `app/pricing/page.tsx:74,194` | **Contradicts the promo banner on the same page** — dealers signing up now get months of free access via `beta_expires_at`, not 14 days; text was never wired to the real trial-length setting |
| 9 | "Your 14-day free trial has started" | `app/advertiser/dashboard/page.tsx:94` | Same issue — actual `trial_ends_at` is the promo date, far longer than 14 days |
| 10 | "Stripe coming soon" | `app/pricing/page.tsx:302-307` | **Accurate** — the one honest gap-admission on the site |
| 11 | "Priority rotation" (advertiser tiers) | `app/advertise/page.tsx:19,24,29` | Not implemented — ad selection is uniform-random, the serving code's own comment admits fairness isn't implemented |
| 12 | Ad-count limits per tier | `app/advertise/page.tsx:14-29` | Not enforced — unlimited ads regardless of tier |
| 13 | "We're finalizing paid dealer plans..." | `app/api/email/promo-expiry/route.ts:177-179` | Internal admission, in outbound email copy, that no paid mechanism exists yet |

### 5. Free Through December 31, 2026 Promotion — **PARTIAL**
**Files:** `lib/siteSettings.ts`, `app/api/advertiser/signup/route.ts:60-99`, `app/api/admin/dealer-applications/route.ts:168-194`, `app/dealer/dashboard/page.tsx:512-517`, `app/api/ads/serve/route.ts:34-57`
Enforced for **account access only**, not billing:
- **Dealers:** real `beta_expires_at` timestamp; expiry hard-locks the dashboard and blocks new/edited listings + SFTP provisioning. No self-service renewal exists — only a "contact us" dead-end, because there's no billing system to process a renewal even if a dealer wanted to pay.
- **Advertisers:** real `trial_ends_at`; expiry silently stops ad serving and blocks ad creation/editing. Same "contact us" dead-end.
- **Private sellers:** `profiles.promo_expires_at` exists and drives a reminder email — but **nothing in the submission code ever checks it**. Listings stay free indefinitely, promo or not, before and after Jan 1.
- **Featured/Spotlight/Bold Search:** unaffected either way — none of them are wired to billing or dates at all (see §9-11).
**No technical free-vs-paid distinction exists anywhere** — every "paid" feature on `/pricing` is either an unguarded free toggle or simply doesn't exist in code. The only real binary is the dealer/advertiser account-access gate.
**What happens Jan 1, 2027, literally:** dealers and advertisers past their individual expiry dates get locked out with no way to pay their way back in; private sellers and Featured/Spotlight/Bold notice nothing at all.
**Priority: P1**

### 6. Stripe / Payments — **NOT IMPLEMENTED**
**Files:** `package.json` (no `stripe` dependency), `app/pricing/page.tsx:302-308`
No Stripe SDK, no config, no customer/checkout/payment-intent/subscription objects, no webhook route (none to secure), no signature validation, no success/cancel pages, no refund/cancellation/renewal handling, no billing portal, no invoice handling, no DB persistence of any payment state, no product/price mapping, no idempotency, no payment-specific logging, no confirmation email. `/pricing` literally says "💳 Online payments via Stripe coming soon... contact us" — every CTA on the page routes to `/dealer/login` or `/sell`, never a checkout. Today, a prospective payer's only option is emailing `contact-us@garagecherries.com`.
**Priority: P0**

### 7. Dealer Subscription Plans (Starter/Pro/Unlimited) — **NOT IMPLEMENTED**
**Files:** `app/pricing/page.tsx:12-65` (`DEALER_PLANS`, hardcoded display array), `app/api/dealer/settings/route.ts`, `app/api/listings/submit/route.ts:54-73`
The only "plan" value ever actually written anywhere in the codebase is the literal string `'beta'` — `'starter'`/`'pro'`/`'unlimited'` never appear outside the marketing array. **No listing-cap or featured-slot enforcement exists for dealers at all** — the submit route explicitly exempts dealers from the cap logic that *does* apply to private sellers. **No January 2027 transition logic exists** — the only date-driven behavior is the flat `beta_expires_at` lockout described in §5.
**Security gap (shared with §56/63 findings):** `POST /api/dealer/settings` writes any POSTed field directly to the dealer's row with **no allowlist** — a dealer can self-write `plan`/`beta_expires_at` to anything they want via a raw API call, since only row ownership (not field access) is checked. This is the entire enforcement mechanism for §5/§7, and it's bypassable today.
**Priority: P0** for the settings mass-assignment gap; **P1** for the unenforced plan tiers generally.

### 8. 2027 Founding Dealer Plan — **NOT IMPLEMENTED** (confirmed absent, as expected)
No "Founding Dealer," annual billing, or 2027-dated logic exists anywhere. Cleanest integration point for later: `dealers.plan` (free-text, already supports new values) + the existing `site_settings` cutoff-date pattern (`promoApplicationCutoff`/`promoExpiresAt`) used for the current promo — a `foundingDealerCutoff` pair would follow the identical, already-proven shape. No implementation performed per instructions.
**Priority: P3** (informational only)

### 9. Featured Vehicle Functionality — **NOT IMPLEMENTED beyond a bare boolean**
**Files:** `app/page.tsx:29,45`, `app/dealer/dashboard/page.tsx:174,179,201-204,415-424`, `app/api/listings/[id]/route.ts` (deliberately excludes `featured`)
`listings.featured` is a plain boolean with no date/rank/payment columns anywhere. **Critical finding:** the dealer dashboard bypasses the server-side API entirely and writes `featured` directly via the Supabase client — meaning **any dealer can toggle Featured on any of their own listings for free, unlimited, right now**, directly contradicting the advertised per-plan slot limits (Starter 0 / Pro 3 / Unlimited 10), which have zero enforcement anywhere.
**Priority: P0** (active, exploitable revenue leak)

### 10. Homepage Spotlight — **NOT IMPLEMENTED**
Advertised at $75/week on `/pricing` with no backing code whatsoever — no DB field, no carousel component, no rotation, no payment, no purchase flow, no admin screen. It is purely a marketing label sitting on top of the same `featured` boolean and the same static homepage grid section — there is no code-level distinction between "Featured" and "Spotlight."
**Priority: P1**

### 11. Bold Search Result Upgrade — **NOT IMPLEMENTED**
Advertised at $10/month with zero backing anywhere — no DB column, no CSS treatment on search-result cards, no payment, no admin control. Confirmed advertised-but-not-built.
**Priority: P1**

### 12. Advertiser System — **PARTIAL** (the free/trial core loop genuinely works end-to-end; billing and moderation don't exist)
**Files:** `app/advertiser/*`, `app/api/advertiser/*`, `app/api/ads/serve/route.ts`, `app/api/ads/track/route.ts`
Signup (CAPTCHA + rate-limited), login, ad creation/editing, geographic targeting (real haversine distance on state centroids — not just a pricing label), impression/click tracking (real, RPC-backed counters) all function correctly. What's missing: **no ad moderation/approval workflow** (ads go live immediately on insert, no admin review screen exists at all), **no billing** (an unexpired trial date is the entire "paid" concept), **no per-tier ad-count or priority enforcement** despite being advertised. Campaign self-pause works; expiration is account-level only.
**Priority: P1**

### 13. Vehicle View Tracking — **PARTIAL**
**Files:** `app/api/track-view/route.ts`, `components/ViewTracker.tsx`
Deduped to one row per hashed-IP per listing per day — not a true unique-visitor count and not a raw pageview count either. `user_id` column exists but is never populated (caller never passes it). No referrer/UTM capture, no bot filtering.
**Priority: P2**

### 14. Dealer Website Click Tracking — **NOT IMPLEMENTED**
Plain `<a href>` to the dealer's external site, no click handler, no persistence, nothing.
**Priority: P3**

### 15. Dealer Phone Click Tracking — **NOT IMPLEMENTED**
Plain `tel:` links, same as above — no tracking of any kind.
**Priority: P3**

### 16. Message Seller Tracking — **IMPLEMENTED**
Full real flow: rate-limited form → `conversations`/`messages` tables → email notification on first contact → realtime broadcast on replies → per-message reporting → admin "Reported" queue → dealer-facing inquiry metrics. Legacy `inquiries` table was correctly dropped after this replaced it.

### 17. Make an Offer — **PARTIAL — a lead form with a status field, not a real negotiation**
**Files:** `components/MakeOfferButton.tsx`, `app/api/offers/route.ts`, `app/dealer/dashboard/page.tsx:1078-1171`
Buyer submits (no login required) → dealer emailed with a "reply by email" CTA → dealer can Accept/Decline **client-side only, direct DB write, no server route**. No counter-offer UI exists despite the DB enum supporting `'countered'`. **No buyer notification when accepted/declined, and no buyer-facing "my offers" page at all** — a buyer who submits an offer has zero in-app way to ever learn the outcome.
**Priority: P1**

### 18. Save / Favorite Vehicle — **PARTIAL**
**Files:** `components/WatchlistButton.tsx`, `components/WatchButton.tsx` (dead, unused), `app/api/watchlist/route.ts`
The live "save" button **bypasses the API entirely** (direct client-side Supabase writes), so the route's rate limiting never actually protects the write path. A second, correctly-wired component (`WatchButton`) exists but is imported nowhere. No favorite affordance exists on list/grid car cards, only the detail page.
**Priority: P2**

### 19. Saved Searches / Car Alerts — **IMPLEMENTED**, mechanism fully traced
Save criteria (max 10, ≥2 fields required) → **triggered on listing approval** (not a periodic cron) → weighted match-scoring (≥0.7 threshold, 24h cooldown, dedup) → email via Resend → manage/pause page → real unsubscribe. One flaw: failed sends are silently swallowed with no error logging, inconsistent with the rest of the codebase's logging discipline.
**Priority: P3**

### 20. Price Change Alerts — **PARTIAL — one path works, one is likely silently broken**
The **live** watcher-notification email (fires synchronously on a qualifying price drop, independent of `price_history`) works correctly. The **`price_history` table insert** references an `old_price` column that **does not exist in any tracked migration** — if true in production, every insert fails silently, which would mean the price chart never renders and the weekly price-drop digest always reports "no changes." **Needs live-DB verification** given this project's manual-migration history.
**Priority: P1**

### 21. Similar Vehicle Alerts — **NOT IMPLEMENTED** (distinct from saved searches, which already cover make/model)
**Priority: P3**

### 22. Recently Viewed Vehicles — **NOT IMPLEMENTED**
No persistence, no UI section, nothing.
**Priority: P3**

### 23. Similar Vehicles — **PARTIAL — dead code**
The listing detail page runs a real DB query for same-make listings (excludes current, checks approved+not-expired) — **but the result is never rendered anywhere in the JSX.** The query runs on every page load and its output is discarded. A separate `app/api/ai/similar-cars/` directory is a completely empty stub, referenced nowhere. Ranking logic (year/price/body-style proximity) was never implemented even in the unused query — it's same-make only.
**Priority: P1**

### 24. Share Vehicle — **NOT IMPLEMENTED**
No copy-link, no social share buttons, no `navigator.share`, nothing.
**Priority: P3**

### 25. Report Listing — **NOT IMPLEMENTED** (a narrower, different feature exists: reporting a *message*)
**Files:** `app/api/messages/[id]/report/route.ts`, `app/messages/[id]/page.tsx`
There is no report button on the public listing page at all. The only reporting capability requires an existing conversation thread — **a buyer who spots a fraudulent listing but hasn't messaged the seller has no way to report it.** Even message-reporting captures no reason/category text and no reporter identity, just a bare boolean.
**Priority: P2**

### 26. VIN Handling — **PARTIAL**
Stored (`listings.vin`, `vin_verified`) with real external NHTSA decode integration for private sellers (optional, not required) — genuinely a real API call, not just format validation, with 24h caching and graceful fallback on NHTSA downtime. Format validation checks length + character set but **no ISO 3779 checksum digit validation** exists anywhere. **Dealer manual-entry VINs are never run through verification at all.** **No cross-seller duplicate-VIN detection** — the only dedup check is scoped to a single dealer's own feed-sync matching; a private seller (or different dealer) can list an already-listed VIN with zero warning anywhere in the system. VIN is never displayed publicly (masking is moot).
**Priority: P2** (duplicate-VIN gap is a real fraud-prevention hole)

### 27. Financing Calculator — **PARTIAL**
Fully correct client-side amortization math, price auto-populated from the listing, all three inputs present. **Zero backend** — it's pure client-side JS with two static outbound links (JJ Best, Woodside Credit) carrying no affiliate ID, no tracking, no lead capture at all.
**Priority: P2**

### 28. Financing Referral — **NOT IMPLEMENTED** beyond the two static unbranded links above. No partner config, no affiliate URL, no consent, no tracking.
**Priority: P2**

### 29. Vehicle Shipping Referral — **NOT IMPLEMENTED**
Only mentioned as prose inside a static buyer guide — no links, no page, no partner, nothing actionable.
**Priority: P3**

### 30. Pre-Purchase Inspection Referral — **PARTIAL**
The **upload/storage half is real and fully wired**: dealers attach a PDF + photos to `listing_inspections`, buyers see it on the listing page — this genuinely backs the Terms page's disclaimer language. But there is **no referral partner integration at all** — it's a dealer self-upload feature, not a booking flow to an inspection service; "Lemon Squad" only appears as placeholder text. No CTA exists when a listing has *no* report. No migration file exists for this table/bucket — **needs live-DB verification that it actually exists in production.**
**Priority: P1** for the unverified-schema risk, **P2** for the missing referral partner.

### 31. Collector Insurance Referral — **NOT IMPLEMENTED**
Only prose mentions in a static guide, no links, no partner, nothing actionable.
**Priority: P3**

### 32. Dealer Analytics Dashboard — **PARTIAL**
Solid coverage: total/per-vehicle views, messages, offers, favorites/watchlist counts, previous-period comparison, inventory-data CSV export — all real. **Missing:** dealer-website clicks, phone clicks (neither is tracked anywhere in the system — not even by admin), car-alert-interest visibility, featured-vs-non-featured performance breakdown, date-range filtering (hardcoded 30/60-day windows), and metrics export (only inventory data exports, not performance numbers).
**Priority: P1** for click tracking (cheap, pattern already exists), **P2** for the rest.

### 33. Dealer Performance Emails — **PARTIAL — well-built content, zero automation**
The monthly report email itself is solid (real views/inquiries/top-listings data, correctly migrated off dead legacy tables). **But there is no cron entry anywhere pointing at it** — the only trigger is a human manually clicking "Send" in an unlinked admin page with a pasted secret. Same is true for the weekly digest and price-drop campaigns.
**Priority: P0** if stakeholders assume this is already automatic (it reads that way in the admin UI copy) — it isn't.

### 34. Market Report (/reports) — **IMPLEMENTED**
Four distinct live queries (active listings, this-month views, sold-this-month, sold-all-time); everything else is computed in-memory from those. No historical snapshot table exists — it's a live snapshot page, not an archival monthly report, despite its framing.
**Priority: P3**

### 35. "Most-Watched" Listings — **NOT IMPLEMENTED as labeled — confirmed mislabel bug**
The section is titled "Most-Watched" but is built entirely from raw page-view data (`listing_views`), not the real `watchlists`/favorites table that exists elsewhere in the codebase and genuinely represents "watched." This is a real content-honesty issue — buyers/dealers reading this section are told something different from what's actually measured.
**Priority: P1**

### 36. Sold Statistics — **PARTIAL**
`is_sold`/`sold_at`/`sold_price` are all real, distinct fields. Manual marking (dealer or private seller, their own listings only — **no admin override exists**) and feed-driven marking (absent-from-feed ⇒ auto-sold) both work, but **feed-driven sales never capture a sale price** — only the original asking price survives. The homepage's "Cars Sold" number is a plain lifetime `is_sold=true` count, no date bound, and is accurately labeled "All-Time." No days-on-market/days-to-sold value is computed anywhere (see §38).
**Priority: P2**

### 37. Market Demand Statements — **NOT PRESENT (previously existed, already fixed)**
Confirmed clean — the "Market Snapshot" section is fully computed from live data today; a code comment documents this replaced prior hardcoded prose.
**Priority: P3** (verification only, no action needed)

### 38. Days on Market — **PARTIAL**
`listed_at`/`sold_at` fields are real and populated. The **only** computed metric anywhere is "average days unsold" for a single dealer's *currently active* inventory, shown on their dashboard. **There is no days-to-sold calculation anywhere in the codebase** — the one thing that exists measures how long unsold cars have been sitting, not how long it took sold cars to sell. No site-wide, no by-make/model, no public-facing figure.
**Priority: P2**

### 39. Event System — **IMPLEMENTED** (core), **PARTIAL** (a few sub-items)
Full CRUD, Google Calendar integration, inventory/dealer cross-links, related-events logic all work. No `organizer` field exists (only `submitted_by`, i.e. who submitted, not an organizer entity). Expiration is a soft visual dim, not a real archive/status/cron.
**Priority: P3**

### 40. Claim This Event — **NOT IMPLEMENTED**, confirmed absent entirely (no claim button, no ownership verification, no claim status/history anywhere).
**Priority: N/A** (confirmed gap, not a bug)

### 41. Featured Events — **PARTIAL**
Boolean flag + real UI section + badge all work; not shown on the homepage (only on `/events`), no date window, **no payment association**, no analytics.
**Priority: P2**

### 42. Event Advertising — **NOT IMPLEMENTED**
The ads system has no concept of event location at all (targeting is by advertiser's own state radius, not any event's location); no event pages render an ad slot; zero cross-linking between the two systems anywhere.
**Priority: P2**

### 43. Homepage Navigation / CTAs — **PARTIAL**
Buy/Sell/Dealers/Events all reachable from desktop nav, mobile nav, and footer. **"Advertise" is missing from desktop nav specifically** (present in mobile nav and footer, so not fully unreachable, just inconsistent).
**Priority: P3**

### 44. Newsletter — **PARTIAL — real signup capture with no way out and no way to actually email it**
Signup form + DB table + dedup all work. **No unsubscribe mechanism exists for this specific list** (the several `/unsubscribe/*` pages all target *other* features — digest, alerts, price-drops — none of them touch `newsletter_subscribers`). **No campaign-sending system actually targets this subscriber list either** — the admin campaign buttons that exist all query different tables (`watchlists`, `profiles`). This is a real compliance gap (collecting emails with no opt-out) as well as a dead-end feature.
**Priority: P1**

### 45. YouTube / Vehicle Video Automation — **IMPLEMENTED, actively wired, not dormant**
Full OAuth, real upload, auto-generated title/description, listing association, duplicate prevention, graceful error handling. Runs automatically via an hourly cron (with up to ~1hr latency from approval to video start). Only real gap: no analytics import.
**Priority: P3**

### 46. Social Promotion — **mixed, mostly automatic**
Facebook (listings + events + Reels) and Instagram Reels post automatically on real triggers. YouTube automatic (see §45). **TikTok is code-complete and wired but functionally blocked** — pending TikTok's own platform content-API audit approval, explicitly documented in code as a known, unresolved external condition. **X/Twitter: not implemented at all**, and is only ever mentioned as a future item in project docs, not something built.
**Priority: P2** for TikTok (external blocker, not a code defect), **P3** for X/Twitter.

### 47. SEO Titles/Metadata — **PARTIAL** (page-by-page table)
| Page | Title | Description | Canonical | OG | Twitter |
|---|---|---|---|---|---|
| Homepage | static | ✓ | ✓ | ✓ full | ✓ full |
| Listing detail | ✓ dynamic | ✓ | ✓ | ✓ full incl. image | ✓ full |
| Listing make/model pages | ✓ | ✓ | ✓ | ✗ | ✗ |
| Dealer detail | ✓ | ✓ | ✓ | partial, no image | ✗ |
| Encyclopedia make/model | ✓ | ✓ | ✓ | partial | ✗ |
| Body-style/decade/price-tier | ✓ | ✓ | ✓ | ✗ | ✗ |
| Event detail | ✓ dynamic | ✓ | ✓ | partial, no image | ✗ |
| Market Report / Sold index / Guides index | ✓/static | ✓ | ✓ | ✗ | ✗ |
**Key finding:** because metadata merges shallowly, every page missing its own OG/Twitter block falls back to the **homepage's** static social-share card, not page-specific content — affects nearly every category/browse page shared on social media.
**Priority: P2**

### 48. Structured Data — **IMPLEMENTED broadly, with real gaps**
`Vehicle`/`Offer`/`BreadcrumbList` on listings; `Event`/`Place` on events; `LocalBusiness` on dealer/advertiser pages; `Organization`/`WebSite`/`SearchAction` sitewide; `Article` on encyclopedia model pages. **Not found anywhere:** `FAQPage`, `Review`/`AggregateRating` on dealer pages. **Bug:** sold listings' `Offer.availability` stays hardcoded `InStock` even when the car is sold — inaccurate structured data.
**Priority: P2**

### 49. Sitemap — **IMPLEMENTED**, comprehensive and well-guarded
Real dynamic generation, deliberately `revalidate=0` after a documented prior stale-cache incident, correctly excludes thin make+model pages matching the noindex threshold, includes sold listings, has a daily automated health-check cron. Only gap: no pagination ceiling handling for future scale (fine today).
**Priority: P3**

### 50. Robots / Indexing — **PARTIAL**
`/dealer/*` tree correctly noindexed (with `/dealer/apply` re-indexed). **Gap:** `/account/*`, `/messages/*`, and `/advertiser/dashboard`/`login`/`signup` have no noindex and aren't in robots.txt, inconsistent with the `/dealer` pattern. `/listings` correctly self-canonicalizes regardless of filters. Staging/preview protection: unverifiable from repo, check Vercel settings directly.
**Priority: P2**

### 51. Sold Listing SEO — **IMPLEMENTED, with two gaps**
Stays live at the same URL, stays indexed, retains full data + JSON-LD, shows a clear "Sold" banner, links to a filtered active-listings search. Gaps: (1) JSON-LD `Offer.availability` bug shared with §48; (2) the banner's own copy promises "browse similar vehicles below" but that content is never rendered (see §23/§52).
**Priority: P1** for the dead similar-vehicles promise, **P2** for the schema bug.

### 52. Internal Linking — **PARTIAL** (table)
Model pages → inventory: implemented. Make listing pages → guide: implemented. **Make+model listing pages → guide: missing** (only the make-level page links out). Listing detail → similar inventory: fetched but never rendered (dead code, see §23). Dealer page → inventory: implemented. Dealer page → related content: none at all. Event → local inventory/dealers: present but not tightly filtered.
**Priority: P1** for the dead similar-vehicles link, **P2** for the rest.

### 53. Feed Imports — **IMPLEMENTED with real gaps**
Three protocols supported (HTTPS pull, outbound SFTP pull, hosted SFTP push), hourly cron, per-dealer schedule, real error logging + admin email alerts, CSV-only (4 vendor layouts, no XML/JSON). **Duplicate detection has no DB unique constraint** — a concurrent sync could double-insert. **Removed-vehicle handling never runs if the fetch/parse itself failed.** Feed health is visible to the dealer but **completely absent from the admin UI**.
**Priority: P2**

### 54. Stale Inventory — **PARTIAL, materially incomplete**
Staleness detection is real but scoped to **exactly one of three feed protocols** (48h threshold, `sftp_incoming` only) — HTTPS and outbound-SFTP dealers get no staleness check at all. No `listings.updated_at` field exists. No auto-hide of stale listings exists anywhere — the one listing-expiry mechanism that does exist explicitly excludes feed-managed listings. **Net effect: if a dealer's feed silently dies, their (possibly already-sold) inventory stays live on the public site indefinitely, with nobody notified** outside a narrow admin-only email for one protocol.
**Priority: P1** — the single most consequential integrity gap found in this audit.

### 55. Admin Dashboard — **PARTIAL** (full enumeration)
Real, working tabs: Listings moderation, Users, Applications, Events, Overview (funnel counts). **Not present at all:** feed management, advertising/ad moderation, payments, a browsable leads view, real newsletter management (only 5 hardcoded trigger buttons), in-app error logs (explicitly deferred to Sentry/Axiom in a code comment).
**Priority: P1/P2** depending on business priority for advertising moderation & payments; **P2** for feed/leads; **P3** for newsletter/error-log tooling.

### 56. Admin Revenue Dashboard — **NOT IMPLEMENTED**
No `payments`/`transactions`/`revenue` table exists anywhere. The admin Overview tab shows only operational volume counts (views/inquiries/offers/sold, dealer signups) — zero dollar figures anywhere, correctly so, since there's no payment processor generating any (blocked entirely by §6).
**Priority: P2** (correctly blocked by §6, not an independent gap)

### 57. GA4 — **PARTIAL**
Correctly installed and environment-gated (production-only, deliberately using `VERCEL_ENV` over `NODE_ENV` per an in-code comment). **Zero custom events fire anywhere** — no search, listing-view, dealer-click, phone-click, message-seller, make-offer, signup, newsletter, purchase, or ad-conversion events exist in GA4, despite that funnel data existing server-side in the DB.
**Priority: P1**

### 58. Google Search Console — **NOT IMPLEMENTED (in-code verification)**
No verification meta tag, no verification file, no API integration found. Sitemap is declared in robots.txt (passive discovery only). Cannot confirm a GSC property has ever been claimed — check the GSC UI directly; performance data itself is never verifiable from source.
**Priority: P2**

### 59. UTM / Attribution — **NOT IMPLEMENTED**
Zero capture of `utm_*` params, referrer, or first/last-touch anywhere in the codebase — confirmed via exhaustive search. Any current campaign traffic leaves no attribution trail in this app at all.
**Priority: P1**

### 60. Lead Attribution — **PARTIAL**
Listing/dealer/buyer/date/type are all real, linked fields on offers and conversations. **Missing:** traffic-source/campaign linkage (same gap as §59) and featured-status-at-lead-time (not snapshotted, unrecoverable after the fact).
**Priority: P2**

### 61. Terms of Service — **PARTIAL / mostly unverifiable**
The repo's own hardcoded sections (affiliate disclosure, DMCA, inspection-report disclaimer) are real and implemented. Everything else the checklist asks about (eligibility, obligations, payments/subscriptions terms, liability, indemnification, etc.) is rendered entirely by an **external Enzuzo-hosted script** whose content this repo cannot see — marked **NEEDS MANUAL VERIFICATION**, not assumed present or absent.

### 62. Privacy / Lead Sharing — **PARTIAL / mostly unverifiable**
Same Enzuzo-widget caveat as §61 for most sub-items. Two hardcoded sections (data-breach notice, YouTube API data-use disclosure) are real. **Concrete code-level fact worth noting:** buyer info genuinely is shared with dealers server-side, with real opt-in consent plumbing (`allow_dealer_contact` flag, one-time-contact enforcement) — whatever the Privacy Policy *text* says, the underlying mechanism is real and consent-gated.

### 63. Security — **concrete findings only**
- **P1 — mass assignment:** `POST /api/dealer/settings` writes any POSTed field straight to the dealer's row with no allowlist (same root cause as §7's enforcement bypass).
- **P2** — `supabase/storage-policies.sql` governs a bucket name (`car-images`) that no actual code uses (`listing-images` is used everywhere) — the real bucket's RLS status is unverified from this repo.
- **P2** — only 6 tables have RLS enabled in tracked migrations; nearly everything runs through the service-role admin client, which bypasses RLS anyway, so app-code ownership checks (which are consistently correct everywhere spot-checked) are the real authorization boundary, not RLS.
- **P2** — `/api/newsletter/subscribe` has no rate limit or CAPTCHA; `/api/ads/serve` has no rate limit despite writing impression counters on every call.
- **P2** — `/admin/email` and `/admin/video-backfill` are unlinked from any nav and protected only by a pasted shared secret, weaker than the session+role auth used everywhere else in admin.
- **P3** — a dead one-time TikTok OAuth bootstrap route is still live and returns raw tokens in its response body; low risk but should be removed.
- **P3** — CAPTCHA fails open (silently disabled) if its secret env var is ever unset in production.
- No SQL injection surface found (fully parameterized/RPC-based). No unsafe `dangerouslySetInnerHTML` usage. No hardcoded secrets found. Dealer/seller ownership checks are consistently correct everywhere else checked. No CSRF token exists but relies on adequate default cookie/same-origin behavior — worth a conscious decision, not flagged as broken.

### 64. Background Jobs — **PARTIAL — a real automation gap**
7 real scheduled jobs (5 Vercel Cron + 2 GitHub Actions, all secret-gated correctly): promo-expiry emails, expiring-listings reminders, sitemap health, dealer feed sync (hourly), dealer feed staleness, Facebook post queue, video backfill. **Not scheduled at all, despite reading as automated in the admin UI:** the weekly digest, price-drop notifications, and monthly dealer performance report — all three exist only as manually-triggered admin actions on an unlinked page.
**Priority: P1/P2**

### 65. Email System — **broadly implemented, provider = Resend**
Templating is inline HTML via shared branding helpers, not a third-party template system. Real, triggered emails exist for: seller-message notification, offer notification (both directions), car alerts, dealer onboarding/approval/rejection, listing approval/rejection, listing-renewal reminders (automated), car-sold-to-watchers, promo expiry (automated), account warning/suspension. **Not implemented:** payment receipts/failures/subscription renewal (no billing system to trigger from), event-claim notifications (no claim feature exists), and **advertiser approval/rejection notifications** — a real asymmetry, since dealers get these emails on an equivalent flow and advertisers don't.
**Priority: P2** for the advertiser-notification asymmetry.

### 66. Dead / Incomplete Features
- One TODO: `app/events/[slug]/page.tsx:133` (promo image swap, already tracked in project memory).
- `app/admin/email/page.tsx` and `app/admin/video-backfill/page.tsx`: unlinked from any nav.
- The three "automated" email campaigns that aren't actually scheduled (§64).
- Dead TikTok OAuth bootstrap route (§63).
- Unenforced dealer-plan pricing tiers (§7).
- `storage-policies.sql` targeting the wrong bucket name (§63).
- The entire Stripe/payments flow, explicitly marked "coming soon" (§6).
No other commented-out functional code, disabled flags, or hardcoded demo data found.

### 67. Hardcoded Values
Advertiser tier pricing is defined **twice, independently** (`/advertise` and `/pricing`) — a price change requires editing two files in sync. Dealer plan pricing, add-on pricing (Featured/Spotlight/Bold), and private-seller listing fees are all hardcoded display-only numbers with no backing enforcement. By contrast, promo dates/trial lengths and dealer/listing/sold counts are correctly DB-driven already — good existing pattern to extend the rest toward. No affiliate IDs or Stripe product IDs exist anywhere (consistent with no live Stripe integration).

### 68. Configuration / Feature Flags
Real, DB-backed config exists for the promo window and trial lengths (superadmin-editable). `BETA_MODE` env var can globally bypass all beta-expiry gating. Dealer feed SFTP is env-gated (fails gracefully to 503 if VPS vars are unset). CAPTCHA is env-gated but fails open if unset. No dev-vs-prod branching found for payments/advertising/featured (because none of those have real gating logic to branch in the first place).

### 69. Tests — **strong coverage, with one structurally-expected gap**
82 unit test files + 16 Playwright specs cover dealer feeds, listing search, dealer verification/applications, private-seller limits, messages, offers, car alerts, sold listings, moderation/reports, and advertising signup. **Payments and subscriptions have zero test coverage** — but this exactly mirrors zero implementation (there's no billing code to test), not an independent testing gap. Pricing-tier enforcement (§7) similarly has no test because the enforcement logic itself doesn't exist.

---
<a name="priority-table"></a>
## §70 Final Priority Table

Sorted: revenue blockers → lead/attribution blockers → dealer retention → buyer retention → advertising → events → SEO/content → admin.

| Priority | Feature | Status | Evidence | Missing Work | Effort |
|---|---|---|---|---|---|
| P0 | Stripe / Payments | NOT IMPLEMENTED | `pricing.tsx:302-308`, no `stripe` dep | Entire billing stack — SDK, checkout, webhooks, DB persistence | **Large** |
| P0 | `/api/dealer/settings` mass-assignment | Security bug | `dealer/settings/route.ts:11,27` | Allowlist writable fields | **Small** |
| P0 | Featured listings free-for-all | Revenue leak | `dealer/dashboard/page.tsx:174,179` | Gate dealer-side toggle server-side against plan/slot count | **Small–Medium** |
| P0 | "Automated" dealer/digest/price-drop emails aren't scheduled | Automation gap | No `vercel.json` cron entry | Add cron routes for all three | **Small** |
| P1 | Dealer plan tiers (Starter/Pro/Unlimited) unenforced | NOT IMPLEMENTED | `pricing.tsx:12-65` | Real plan field + enforcement, blocked on Stripe | **Large** |
| P1 | "Verified Dealer" badge/claim is fictional | Misleading | `dashboard/page.tsx:780` hardcoded | Real verified flag + workflow, or remove the claim | **Medium** |
| P1 | Homepage Spotlight / Bold Search advertised, unbuilt | NOT IMPLEMENTED | `pricing.tsx:69-70` | Build both, or remove from pricing copy | **Medium** each |
| P1 | Advertiser billing + moderation missing | PARTIAL | no Stripe, no ad-review screen | Billing (blocked on §6) + admin moderation UI | **Medium–Large** |
| P1 | Zero GA4 custom events / zero UTM capture | NOT IMPLEMENTED | `layout.tsx:82-91` only config call | Instrument key funnel events + campaign params | **Medium** |
| P1 | Stale dealer-feed inventory stays live indefinitely | PARTIAL | `dealer-feed-staleness/route.ts` (1 of 3 protocols) | Extend staleness detection + dealer alerting to all protocols | **Medium** |
| P1 | Make an Offer: no buyer notification, no visibility | PARTIAL | `dealer/dashboard/page.tsx:1094-1100` | Server route + buyer email on status change | **Small–Medium** |
| P1 | "Most-Watched" is mislabeled page-views | Content bug | `reports/page.tsx:216` | Rename or rebuild against real watchlist data | **Small** |
| P1 | `similar` vehicles fetched, never rendered | Dead code | `listings/[...segments]/page.tsx:205-225` | Wire the existing query into the page | **Small** |
| P1 | Newsletter: no unsubscribe, no send mechanism | PARTIAL | no code touches `newsletter_subscribers` for sending/opt-out | Build unsubscribe + real send targeting that table | **Medium** |
| P1 | `price_history.old_price` likely missing column | Needs DB check | no migration defines it | Verify live schema; fix insert or add column | **Small** (after verify) |
| P1 | Private-seller listing RLS unverifiable from repo | Needs DB check | no `create policy` for `listings` in migrations | Pull live RLS policy, confirm it | **Small** (verify only) |
| P1 | Inspection-report table/bucket unverified in repo | Needs DB check | no migration for `listing_inspections` | Confirm exists live | **Small** (verify only) |
| P2 | Duplicate-VIN detection is single-dealer-scoped only | PARTIAL | feed-sync matching only | Add cross-marketplace VIN check | **Medium** |
| P2 | Financing/inspection/insurance referrals have no real partner links | NOT IMPLEMENTED | static prose/links only | Add affiliate IDs once partner agreements exist | **Small–Medium** |
| P2 | Dealer phone/website clicks untracked | NOT IMPLEMENTED | plain anchors | Add click-ping endpoint (pattern exists) | **Small** |
| P2 | Report Listing doesn't exist at listing level | NOT IMPLEMENTED | message-report only | New table + button on listing page | **Medium** |
| P2 | Event Advertising / Featured Events monetization | NOT IMPLEMENTED | no `event_id` on ads | Build targeting + payment if desired | **Medium–Large** |
| P2 | Sold-listing JSON-LD `availability` wrong | Content bug | `listings/[...segments]/page.tsx:273` | Conditional on `isSold` | **Small** |
| P2 | Category pages missing page-specific OG/Twitter | PARTIAL | shallow metadata merge | Add OG/Twitter blocks per page type | **Medium** |
| P2 | No GSC verification in code | NOT IMPLEMENTED | — | Add verification tag/DNS record | **Small** |
| P2 | `/account/*`, `/advertiser/*` not excluded from indexing | PARTIAL | `robots.ts:3-14` | Add noindex/disallow, matching `/dealer` pattern | **Small** |
| P3 | Claim This Event | NOT IMPLEMENTED | — | Net-new feature if wanted | **Large** |
| P3 | Recently Viewed / Share Vehicle / Similar-Vehicle Alerts | NOT IMPLEMENTED | — | Net-new features if wanted | **Medium** each |
| P3 | Sitemap pagination ceiling | Forward-looking | `sitemap.ts` | `generateSitemaps()` once scale requires it | **Small** |
| P3 | Admin error-log viewer, feed-management UI | NOT IMPLEMENTED | Sentry/Axiom substitute today | Build if in-app visibility is wanted | **Medium** |

---
<a name="questions"></a>
## 26 Most Important Questions — Direct Answers

1. **Can GarageCherries accept a real payment today?** No. No Stripe or any payment processor exists in the code. The only path is emailing `contact-us@garagecherries.com`.
2. **Exactly what products can currently be purchased?** None, through the platform itself. Everything currently free-to-use (dealer beta access, private listings, advertiser trial, Featured toggle) has no billing wired to it at all.
3. **Are Featured Listings tied to payment or manually controlled?** Manually controlled — a plain boolean any dealer can self-toggle for free via the dashboard, with no plan/slot-count enforcement.
4. **Is Homepage Spotlight actually implemented?** No. It's a marketing label on top of the same `featured` boolean; no distinct code exists.
5. **Is Bold Search Result actually implemented?** No. Advertised at $10/mo with zero backing code anywhere.
6. **Can advertisers create and pay for campaigns?** They can create campaigns (real, working flow). They cannot pay — there is no billing; "paid" today just means "trial not yet expired."
7. **Can dealers see measurable ROI from GarageCherries?** Partially — views, inquiries, offers, watchlist counts, and period-over-period comparison are real and visible. Phone clicks and website clicks are not tracked at all, and featured-listing performance isn't broken out.
8. **Are dealer website clicks tracked?** No — plain link, no tracking of any kind.
9. **Are dealer phone clicks tracked?** No — plain `tel:` link, no tracking.
10. **Are Message Seller leads tracked?** Yes, fully — real persistence, email notification, dealer-facing metrics, admin moderation queue.
11. **Are Make an Offer leads tracked?** Partially — the offer itself and dealer accept/decline are real, but there's no buyer notification on the outcome and no buyer-facing status page; it functions more as a lead form than a negotiation tool.
12. **Do favorites/save functionality exist?** Yes, but the live Save button bypasses the rate-limited API (writes directly to the DB), and a second, correctly-wired component sits unused in the codebase.
13. **Do price-change alerts exist?** The live email-on-drop path works. A parallel `price_history` write likely fails silently due to a missing DB column — needs live-schema verification.
14. **How exactly do saved-search alerts work?** A user saves criteria; matching runs when a new listing is approved (not on a timer); a weighted score ≥0.7 triggers a Resend email with manage/pause/unsubscribe links, deduped and cooldown-limited.
15. **Are financing referrals implemented?** No — two static, unbranded outbound links with no affiliate ID, tracking, or lead capture.
16. **Are shipping referrals implemented?** No — partner names appear only as prose in a static guide, no links at all.
17. **Are inspection referrals implemented?** No referral exists, but a genuinely real, fully-wired dealer self-upload/display feature for inspection reports does exist (unverified in live DB schema, no migration file found).
18. **Are insurance referrals implemented?** No — same as shipping, prose only.
19. **Can event organizers claim events?** No — confirmed entirely absent, no code of any kind.
20. **Can events be monetized?** No — Featured Events is a free admin toggle with no payment hook; there's no event-targeted advertising either.
21. **What exactly does "58 sold" mean?** A lifetime, unfiltered count of every listing ever flagged `is_sold=true`, correctly labeled "All-Time" wherever shown.
22. **Does "Most-Watched" actually mean page views?** Yes — confirmed mislabeled. It's raw page-view data, not the real favorites/watchlist table that exists elsewhere in the app.
23. **Are Market Report observations derived from real data or hardcoded?** Real data today — a prior hardcoded version was already found-and-fixed per the codebase's own change history.
24. **Are marketplace statistics dynamically generated everywhere?** Mostly yes, with two inconsistent query definitions (`/pricing`, `/dealers`) and two flatly wrong hardcoded numbers on `/about`.
25. **What will happen automatically on January 1, 2027?** Individual dealers/advertisers whose personal trial dates have passed get locked out of their dashboards/ad serving with only a "contact us" dead end. Private sellers and Featured/Spotlight/Bold notice nothing — none of them are gated by any date at all.
26. **What are the 10 highest-priority code changes required to start generating revenue?** See the Top 10 list below.

---
<a name="final-output"></a>
## A. Already Complete
Message Seller (§16), Saved Searches/Car Alerts (§19), Event System core (§39), YouTube automation (§45), Sitemap (§49), Market Report live data (§34, §37).

## B. Partially Complete
Marketplace stats (§1), dealer verification (§2), private-seller review (§3), the promo (§5), Featured Vehicles (§9), Advertiser system (§12), view tracking (§13), Make an Offer (§17), Save/Favorite (§18), Price alerts (§20), Similar Vehicles (§23), VIN handling (§26), Financing calculator (§27), Inspection uploads (§30), Dealer analytics (§32), Dealer performance emails (§33), Sold statistics (§36), Days on market (§38), Featured Events (§41), Newsletter (§44), SEO metadata (§47), Structured data (§48), Robots (§50), Sold SEO (§51), Internal linking (§52), Feed imports (§53), Stale inventory (§54), Admin dashboard (§55), GA4 (§57), Lead attribution (§60), Terms/Privacy (§61-62), Background jobs (§64), Email system (§65).

## C. Missing
Stripe/Payments (§6), Dealer plan enforcement (§7), 2027 Founding Plan (§8), Homepage Spotlight (§10), Bold Search (§11), dealer/phone/website click tracking (§14-15), Similar Vehicle Alerts (§21), Recently Viewed (§22), Share Vehicle (§24), Report Listing at the listing level (§25), Shipping/Insurance referrals (§29, §31), Admin Revenue Dashboard (§56), Google Search Console verification (§58), UTM/attribution capture (§59), Claim This Event (§40), Event Advertising (§42).

## D. Bugs / Contradictions
- Dealer plan pricing/caps advertised, never enforced (§7, §9).
- "Verified Dealer" badge is hardcoded, not real (§2, §4).
- "14-day trial" copy contradicts the actual promo-driven trial length on the same pages (§4).
- "Most-Watched" is page views, not watchlist data (§35).
- `similar` vehicles query runs and is discarded — dead code contradicting on-page copy promising it (§23, §51, §52).
- Sold-listing JSON-LD claims `InStock` (§48, §51).
- `/pricing` and `/dealers` count listings inconsistently vs. every other page (§1).
- `/about` has two flatly wrong hardcoded stat numbers (§1).
- "Automated" weekly/monthly emails are actually manual-only (§33, §64).
- `storage-policies.sql` governs a bucket name nothing in the app actually uses (§63).

## E. Revenue Blockers
No Stripe integration at all (§6) — the root blocker underneath everything else. Featured listings are free-for-the-taking with no enforcement (§9). Homepage Spotlight and Bold Search are sold on the pricing page with zero implementation (§10-11). Dealer plan tiers have no enforcement mechanism to bill against even if Stripe existed (§7). The one live security gap (`/api/dealer/settings` mass-assignment, §7/§63) currently lets a dealer bypass the only real enforcement lever that does exist.

## F. Tracking / Attribution Gaps
Zero GA4 custom events (§57), zero UTM/referrer capture anywhere (§59), no dealer phone/website click tracking (§14-15), no campaign-to-lead attribution (§60), "views" conflates raw hits with unique visitors (§13).

## G. Quick Wins
Allowlist `/api/dealer/settings` fields (small, closes a live security gap). Fix the `/about` hardcoded stat numbers. Rename or rebuild "Most-Watched." Wire the already-fetched `similar` vehicles array into the listing page. Fix the sold-listing JSON-LD `availability` value. Add dealer phone/website click tracking (pattern already exists in the ads-tracking code). Add cron entries for the three "automated" emails that currently aren't scheduled.

## H. Larger Development Items
Full Stripe integration + dealer plan enforcement. Homepage Spotlight and Bold Search Result, built from scratch. Advertiser billing + ad moderation workflow. Real GA4 event instrumentation + UTM capture pipeline. Extending stale-feed detection to all three feed protocols with dealer-facing alerts. A listing-level Report/fraud workflow.

## I. Top 10 Recommended Next Tasks (in order)

1. **Allowlist fields in `/api/dealer/settings`.** Closes a live security gap that currently undermines the one real enforcement mechanism in the system. *Files:* `app/api/dealer/settings/route.ts`. *Dependencies:* none. *Effort:* Small. *Revenue-enabling:* indirectly (protects future billing enforcement). *Scope-safe:* yes.

2. **Gate the dealer dashboard's Featured toggle server-side.** Stops dealers from self-granting a currently-advertised paid feature for free. *Files:* `app/dealer/dashboard/page.tsx`, needs a real server route replacing the direct Supabase write. *Dependencies:* none. *Effort:* Small–Medium. *Revenue-enabling:* directly. *Scope-safe:* yes, additive.

3. **Schedule the three "automated" emails that currently aren't.** Weekly digest, price-drop, monthly dealer report. *Files:* new `app/api/cron/*` routes mirroring `expiring-listings`/`promo-expiry`, plus `vercel.json`. *Dependencies:* none. *Effort:* Small. *Revenue-enabling:* indirectly (dealer retention/perceived value). *Scope-safe:* yes.

4. **Decide and build (or explicitly remove) Homepage Spotlight and Bold Search Result.** Both are actively sold on `/pricing` with zero backing — this is a trust/legal exposure until resolved either way. *Files:* new feature work, or edits to `pricing.tsx`/`advertise.tsx` copy. *Dependencies:* none technically, though real payment ideally lands first. *Effort:* Medium each. *Revenue-enabling:* directly, once paid. *Scope-safe:* requires your sign-off either direction.

5. **Minimal single-product Stripe integration** (e.g., scoped to Featured Listing purchase, as discussed earlier this session) rather than the full plan-tier system. *Files:* new `/api/stripe/*` routes, webhook handler, DB schema for payment state. *Dependencies:* items 2 and 4 ideally land first so there's something real to sell. *Effort:* Large. *Revenue-enabling:* directly — this is the actual unlock. *Scope-safe:* net-new, doesn't touch existing free functionality.

6. **Fix `/about`'s wrong hardcoded stats and the `/pricing`/`/dealers` count inconsistencies.** *Files:* `app/about/page.tsx`, `app/pricing/page.tsx`, `app/dealers/page.tsx`. *Dependencies:* none. *Effort:* Small. *Revenue-enabling:* no, but a visible correctness issue. *Scope-safe:* yes.

7. **Wire the already-fetched `similar` vehicles array into the listing page**, and fix "Most-Watched"'s label/data source. *Files:* `app/listings/[...segments]/page.tsx`, `app/reports/page.tsx`. *Dependencies:* none. *Effort:* Small each. *Revenue-enabling:* indirectly (engagement/SEO). *Scope-safe:* yes.

8. **Instrument core GA4 events** (contact-seller, make-offer, dealer-click, phone-click, signup) and add basic UTM capture on lead submission. *Files:* `app/layout.tsx` plus each lead-submission call site. *Dependencies:* none. *Effort:* Medium. *Revenue-enabling:* indirectly (proves marketing ROI, informs pricing decisions). *Scope-safe:* yes, additive.

9. **Extend feed-staleness detection to all three feed protocols and add dealer-facing (not just admin) alerts.** Prevents stale/sold dealer inventory sitting live indefinitely — a real trust/quality issue for buyers. *Files:* `app/api/cron/dealer-feed-staleness/route.ts`. *Dependencies:* none. *Effort:* Medium. *Revenue-enabling:* indirectly (marketplace trust/dealer retention). *Scope-safe:* yes.

10. **Verify the three live-DB-dependent unknowns**: `price_history.old_price` column, `listing_inspections` table/bucket existence, and the `listings` INSERT RLS policy. *Files:* none — direct Supabase dashboard check. *Dependencies:* none. *Effort:* Small (verification only; fixes depend on findings). *Revenue-enabling:* no. *Scope-safe:* yes, read-only.
