# GarageCherries — Implementation Status
*Last updated: 2026-07-14 — Deleted `app/sell/SellForm.tsx`, a dead component never imported anywhere (`/sell` renders `SellClient.tsx` exclusively) — confirmed unused via a repo-wide grep immediately before deletion. No test file existed for it; type-check and full unit suite (860 tests) pass unchanged.
*Prior update: 2026-07-14 — Deleted the orphaned `inquiries` table, `app/api/inquire/route.ts`, and its dead cascade-delete reference in `app/api/admin/users/route.ts` (that reference had been silently broken anyway — it filtered on a `user_id` column `inquiries` never had). The dealer-facing consumers were already rewired to `conversations` in the prior changelog entry below; this just finishes the cleanup. Migration `supabase/migrations/20260714_drop_inquiries.sql` needs to be run manually (project convention for schema changes).
*Prior update: 2026-07-14 — Rewired three dealer-facing features off the orphaned `inquiries` table, which has had no live writer since "Message Seller" moved to the `conversations`/`messages` system (found while investigating whether `inquiries` was safe to retire). `app/api/dealer/metrics/route.ts` (Overview stat, "Recent inquiries" panel, Inventory tab's Inquiries tab) and `app/api/email/dealer-report/route.ts` (monthly digest email) now count `conversations` scoped to the dealer's listing IDs instead — `conversations` has no `dealer_id` column, so it's scoped the same way `GET /api/conversations` already does (`listing_id IN (dealer's listing ids)`); a conversation's first row in `messages` supplies the inquiry-list message text, since `conversations` doesn't store body text itself. Also fixed a second, independent dead-data bug the digest email had: "Top Listings by Views" read a `listings.views` column that's never incremented anywhere in the codebase — always reported 0 regardless of real traffic — now sourced from `listing_views` (the table the working views/watchers feature already uses), grouped by `listing_id`. Live-verified end to end: inserted a real test conversation+message for the dealer test account, confirmed it correctly appeared in the Overview stat, "Recent inquiries" panel, and Inquiries tab, then deleted the test rows. `inquiries` table/route left in place, unused but harmless, pending a decision on full removal. The "Build `/account/inquiries`" next-step item was removed — turned out unnecessary, since buyers already see their own sent messages via the existing Messages tab.
*Prior update: 2026-07-14 — VIN moved to the top of the `/sell` form, above Year/Make/Model, so it can auto-fill them from a clean NHTSA decode (`app/sell/SellClient.tsx`) — Year/Make/Model are only filled if still blank (never overwrites something the user already typed), and Make is matched case-insensitively against the `MAKES` dropdown (NHTSA returns "CHRYSLER", the dropdown has "Chrysler"). Also fixed a real latent bug this surfaced: checking a VIN before any of those three fields had anything in them always produced a misleading "Partial Match" warning, since the match logic requires at least one field to explicitly agree and there was nothing yet to compare — added a client-side check (all three match fields `null`) to show a distinct "✓ VIN Decoded" message instead; no backend changes were needed since `verify-vin` already distinguished "not provided" (`null`) from "explicitly disagrees" (`false`). Live-verified with the same VIN (`3C3AY75S75T283365`, 2005 Chrysler PT Cruiser) that originally surfaced the confusing message.
*Prior update: 2026-07-14 — Two dealer-listing display bugs fixed, found while manually verifying the views/watchers feature: (1) a dealer's public profile page (`app/dealers/[slug]/page.tsx`) only filtered `status='approved'`, not `is_sold` — since "Mark as Sold" never changes `status`, sold cars kept showing as available inventory on the dealer's own public page, inconsistent with the homepage/`/listings`/`fetchCars()`, which already excluded sold listings; (2) the dealer dashboard's Overview tab "Your listings" preview panel had the same gap with no sold indicator at all (unlike the Inventory tab table, which shows a proper "Sold" badge) — both now filter `is_sold`, while the Inventory tab intentionally still shows sold listings with their badge, matching the private-seller account page's "My Listings" section (verified this already correctly showed sold items with a badge, no changes needed there). Also added a **"Sign out" link** to `components/AccountTabBar.tsx` (shared by `/account` and `/messages`) — there was previously no way to sign out from those pages short of manually clearing cookies, found the same way.
*Prior update: 2026-07-13 — Per-listing views and watcher counts now shown to both dealers and private sellers: `GET /api/dealer/watcher-counts` (already ownership-generic across dealers/private sellers, despite its dealer-scoped-looking path) gained two new response fields — `views` (all-time count from `listing_views`, grouped by `listing_id`) and `totalWatchers` (every `watchlists` row per car, distinct from the pre-existing `counts` field which only tracks the opted-in/unmessaged subset used for the "Message watchers" button). Displayed in three places: the dealer dashboard's Overview "Your listings" panel, the Inventory tab table (new Views/Watchers columns), and the private-seller account page's My Listings section. Also fixed a real bug found while manually testing the dealer Add Vehicle flow live: `app/dealer/dashboard/page.tsx`'s `loadData()` used `.single()` to fetch the `dealers` row and only handled the case where a row was found — an authenticated user with no matching `dealers` row (e.g. a superadmin account with no dealer profile) got a silently broken dashboard (the "Your Dealership" fallback name masked that `dealer` state was actually `null`, so every dealer-data-dependent action, including "+ Add vehicle," was a silent no-op). Now redirects to `/dealer/login?error=no_dealer_account` with an explanatory message.
*Prior update: 2026-07-13 — 250th promo extended from July 31 to "end of year" (Dec 31, 2026): new OG image/promo graphic (`app/opengraph-image.jpg` and the Supabase Storage promo image, same file paths so no code changes needed elsewhere), `PromoBanner`/`PromoModal` copy and `DEFAULT_SITE_SETTINGS` dates updated, literal "US" abbreviations changed to "USA" sitewide (locale codes like `en-US` and schema.org `addressCountry` left untouched), "Nationwide" changed to "Worldwide" everywhere it appeared, and the homepage hero subtext reworded to drop an unearned "thousands of listings" claim and USA-only framing. Advertisers signing up before the promo cutoff now get the free trial through the promo expiry date instead of the fixed day-count trial, matching the existing dealer-signup pattern; signup/pricing copy shows "Free through [date]" during the promo window. Vehicle listing fields unified: new shared `components/VehicleFieldsForm.tsx` used by `/sell`, the dealer Add/Edit Vehicle modal, and the admin Edit Listing modal, closing the drift that had left the dealer form without VIN, admin without Fuel Type/Drive Type, and `/sell` without Drive Type; required fields are now consistently Year/Make/Model/Condition/Body Style/Fuel Type/Transmission/Drive Type/Price/Description/≥1 photo, with Mileage/City/State optional everywhere (dealer City/State pre-fill from the dealer's account on Add) and VIN displayed on all three forms. Required a DB migration (`supabase/migrations/20260713_listing_drive_type.sql`) adding `p_drive_type` to the `insert_listing_with_limit` RPC — note Postgres treats an added trailing parameter as a new overload, not a replacement, so the migration explicitly drops the old 26-arg signature first. `/api/listings/submit` now validates `transmission`/`driveType` server-side against the same allow-lists instead of trusting raw form input. Also fixed: the live `site_settings` DB row still had the old Aug 1/Oct 31 dates after the code-level defaults were bumped (code only falls back to defaults when the row is missing) — updated directly via SQL; a second, independent hardcoded `2026-10-31` literal in the `handle_new_user_profile()` DB trigger (email/password promo signups) was found via a live `pg_get_functiondef` query and fixed with its own migration (`supabase/migrations/20260713_promo_trigger_date.sql`); and 3 silently-broken `api.admin.users.test.ts` tests (test mock never gained an `update()` stub when the dealer-deletion application-reset fix landed earlier this session).
*Prior update: 2026-07-13 — Sign in with Facebook published to production (any Facebook user can now sign in, not just admins/testers); Facebook Page auto-posting is fully live (Business Verification cleared, second "GarageCherries Pages" Meta app created since Page management and Facebook Login are mutually exclusive use cases, Business Portfolio System User generated a non-expiring Page Access Token, env vars set in Vercel, live-confirmed via a real test event posting to the Page); dealer Add/Edit Vehicle form now requires a Transmission selection (was submitting as an empty string, tripping the `cars_transmission_check` DB constraint); AGENTS.md gained a requirement-auditing process (read actual files, cite file:line, table format, flag ambiguity, Verified vs Assumed section) for any tool/session working in this repo. See recent bullets below for other 2026-07-13 fixes (dealer deletion now resets stuck applications, dealer forgot-password surfaces real errors, listings filters, duplicate page-title suffix, cherry emoji replaced with branding image). Earlier: 2026-07-11 — Configurable free-account durations added: new `site_settings` singleton table + `GET/PATCH /api/admin/settings` route let a superadmin adjust the 250th-promo cutoff dates and default advertiser/dealer trial lengths from `/admin` → Team tab → "Trial & Promo Settings," replacing four previously-hardcoded literals (`admin/dealer-applications`, `advertiser/signup`, `cron/promo-expiry`, `email/promo-expiry`) via a new `lib/siteSettings.ts` helper that falls back to the original hardcoded values if the settings row is ever missing — nothing changes behaviorally until a superadmin edits a value. Separately, added a per-account override: any admin-role team member can now hand-adjust a specific dealer's beta expiry or advertiser's trial end date from the existing Users tab Edit modal, independent of the global defaults. New unit tests added across 7 files (2 new: `siteSettings.test.ts`, `api.admin.settings.test.ts`; 5 updated) plus 2 new credential-gated E2E tests in `admin.spec.ts`.
*Prior update: 2026-07-10 (commit `c5aa783`) — Unit test coverage expanded from 8.67% to 99.19% statements (90.61% branches, 96.26% functions, 99.78% lines) across every API route and lib file that previously had none: admin tools, dealer dashboard, alerts, ads, advertiser, cron/email triggers, and buyer-facing routes (conversations, messages, watchlist, offers, inquire) — 831 tests across 49 files, up from 312/21. Along the way, fixed a fake-coverage bug in `lib/matchAlerts.ts`: its existing tests re-implemented `scoreMatch`'s logic locally instead of importing the real (unexported) function, so the file measured 0% coverage despite having tests; `scoreMatch`/`alertName`/`matchBadges` are now exported and the real functions are tested directly, plus full tests added for the `matchAndNotifyAlerts` orchestrator. Added coverage thresholds to `vitest.config.ts` (97% statements / 88% branches / 94% functions / 97% lines) and switched CI to run `test:coverage` instead of `test`, so coverage can't silently regress again undetected the way it did to reach 8.67%.
*Prior update: 2026-07-10 (commit `98fc3c8`) — Supabase Auth redirect URL allow-list fixed: buyer password-reset emails were falling back to the bare homepage instead of `/account/reset-password` because the requested `redirectTo` wasn't in the project's Redirect URLs allow-list, so Supabase silently used the Site URL default; fixed by adding `https://garagecherries.com/**` and `https://www.garagecherries.com/**` wildcard entries in the Supabase Dashboard (dashboard-only change, also fixes the dealer self-serve forgot-password flow on `/dealer/login`, which had the same bug). Buyer signup name bug fixed: Full Name was optional and only ever written via a client-side `profiles` upsert that ran before the user had a session (project requires email confirmation, so `auth.signUp()` returns no session until the link is clicked) — the write was silently blocked by RLS every time, and the name never reached Supabase Auth's `user_metadata` either. Fixed by (1) making Full Name a required field on `/account/signup`, (2) passing `full_name` into `signUp`'s `options.data` so it lands in `user_metadata` immediately regardless of confirmation status, and (3) adding a `handle_new_user_profile()` trigger on `auth.users` insert (server-side, bypasses RLS, scoped to `provider='email'` so it doesn't interfere with the existing Google/Facebook profile-seeding + promo logic in `/auth/callback`) that reliably populates `profiles.full_name` going forward. Note: pre-existing no-name accounts (created before this fix) cannot be backfilled — the name was never captured anywhere for them.
*Earlier: 2026-07-09 — Sign in with Google published to production; Sign in with Facebook added (working for admins/testers, pending Business Verification for public use); GarageCherries Facebook Page created; Facebook Page auto-posting code built (inert pending access token); site OG image swapped to the 250th anniversary promo graphic as a static file, with a same-day production bug fixed (layout.tsx still pointed at the old extensionless dynamic-image path); GitHub Actions CI fixed (was silently failing all day on a pre-existing test type error, auto-bypassed by branch protection); drag-and-drop image reorder fixed; edit listing form expanded to all vehicle fields; Detail 360 sponsor card + Lemon Squad inspection affiliate button removed from listing detail sidebar (accidentally restored earlier the same day; Detail 360 isn't a real client and the Lemon Squad agreement isn't finalized); unit test suite expanded to 312 tests across 21 files; buyer golden-path E2E test suite added (27 tests, 15 spec files total); admin Users tab: color-coded type icons + left border stripe per primary role; server-side role/status filtering + 25-per-page pagination; full UAT complete (181/196 E2E automated + 15 manual) — all sections signed off 2026-07-09; /contact simplified to single email; /feedback page added (category + message + optional email, pre-populated if logged in, rate-limited 5/hr, emails contact-us@garagecherries.com); footer + sitemap updated*

**Note on data:** this site is pre-launch. As of 2026-07-07 the production database has a handful of manually-created test listings (private-seller and dealer) and no real buyers or advertisers yet. Empty tables (`advertisers`, `ads`, etc.) reflect that, not a broken signup funnel or feature regression — don't read zero rows as a product problem without checking this note first.

---

## ✅ Fully Implemented

### Browse & Search
- [x] Full listings page (`/listings`) with filter sidebar — make, year, price, condition, body style, transmission, state
- [x] **Cascading model filter** — when a make is selected AND that make has active listings with distinct models in the DB, a Model dropdown appears under Make; invisible with sparse/pre-launch inventory (added 2026-07-07)
- [x] **Keyword search** — `q` param on `/listings`; `SearchFilters` adds a text input at the top; server applies `ilike` on `title` and `description` columns (added 2026-07-03)
- [x] Make pages (`/cars/[make]`) — all cars by make with model sub-navigation
- [x] Model pages (`/cars/[make]/[model]`) — filtered by make + model
- [x] Featured listings — badge on card, prioritized on homepage
- [x] Recently listed section on homepage
- [x] Listing card component with price, condition, mileage, location, photos
- [x] Database-driven makes — make filter dropdown and make/model URL pages work for any make present in the database; `/api/makes` endpoint serves distinct makes to client components
- [x] **`MAKES`/`BODY_STYLES` alphabetized, Ram added** (`lib/types.ts`) — Ram was missing entirely, blocking sellers from listing under its correct make; also added a shared `TRANSMISSIONS` constant, consolidating Manual/Automatic which had been hardcoded independently (and inconsistently ordered) in 4 separate places. `CONDITIONS` intentionally left in quality order rather than alphabetized (added 2026-07-07)
- [x] **"Clear all" now actually refreshes results, not just the form** — `SearchFilters.tsx`'s `clear()` reset local form state and pushed to `/listings`, but the results grid (server-rendered) could keep showing the previous filtered state until the next `Apply Filters` click — a Next.js Router Cache staleness gap. Added `router.refresh()` alongside `router.push()`; new E2E test (`listings.spec.ts`) reproduces the exact stale-state symptom and confirms the fix (fixed 2026-07-12)
- [x] **Year filter now clamped server-side** — `yearMin`/`yearMax` on `/listings` had client-side `min`/`max` attributes that weren't enforced (no submitting `<form>`), so out-of-range values like `-500` flowed straight into the Supabase query. `app/listings/page.tsx` now clamps both to `[1900, currentYear+1]` before querying (fixed 2026-07-12)

### Listing Detail Pages
- [x] **Sold listing banner** — when `is_sold = true`, a dark "This vehicle has sold" banner appears at the top of the listing page with a "View Similar Listings" link filtered to the same make; page stays live for SEO value (added 2026-07-06)
- [x] Full photo gallery with thumbnail navigation — adjacent (prev/next) photos preloaded invisibly at the same `sizes` variant so Prev/Next feels instant instead of triggering a fresh fetch per click (added 2026-07-07)
- [x] Complete spec sheet — engine, drivetrain, interior, options, hobby segment, lot number
- [x] Dealer info panel with map embed and click-to-call
- [x] Message Seller contact form — emails seller/dealer, buyer address never exposed
- [x] Watch / Save listing button
- [x] Make an Offer button (`MakeOfferButton`) — dealer listings only; requires login, submits to `POST /api/offers` which saves the offer and emails both dealer and buyer
- [x] Financing calculator (`FinancingCalculator`) — collapsible, pure client-side amortization math; links to J.J. Best Banc and Woodside Credit
- [x] SEO — per-page title, description, Open Graph tags, JSON-LD Vehicle + BreadcrumbList schema, canonical URL
- [x] View tracking — deduplicated by hashed IP per day, records dealer_id when a dealer listing
- [x] **Sidebar layout fixed** — the price/contact/map card and `AdSlot` used to be positioned independently (one sticky, one not), which could make the ad card visually overlap the map mid-scroll; now the whole sidebar scrolls as one sticky unit (added 2026-07-07)

### Dealer Public Pages
- [x] Dealer directory (`/dealers`) — all dealers with listing counts
- [x] Dealer profile page (`/dealers/[slug]`) — logo, description, specialties, location, hours, map, JSON-LD AutoDealer schema
- [x] Buyer reviews — star rating + review form (login required to submit, one review per user per dealer enforced via DB constraint), public read
- [x] Dealer tier badge — Bronze ≥5 listings, Silver ≥15, Gold ≥30
- [x] Full inventory grid on dealer profile — excludes sold listings (`is_sold=false`), matching the homepage/`/listings` pattern (fixed 2026-07-14, was showing sold cars as available since `status` doesn't change when a listing is marked sold)

### Dealer Dashboard (`/dealer/dashboard`)
- [x] Overview tab — active listings, views (30d), inquiries (30d), avg. days on market, month-over-month comparison; "Your Listings" cards now link to the public listing page (fixed 2026-07-07)
- [x] Inventory tab — add, edit, delete, mark as sold; dealer-added listings bypass review (inserted `status: 'approved'` immediately)
- [x] **Mark as Sold** — green "Mark Sold" button on approved listings; confirmation modal; calls `POST /api/cars/sold`; badge changes to "Sold"; Mark Sold and Renew buttons hidden after sold (added 2026-07-06)
- [x] Inquiries tab — buyer messages (real data from `GET /api/dealer/metrics`); shows empty state when no inquiries exist (no fake placeholder data)
- [x] **Offers tab** — dealer sees all offers on their listings (amount, buyer name, status); Accept/Decline buttons for pending offers; updates `offers` table status inline (added 2026-07-07)
- [x] Settings tab — full profile management (name, phone, address, description, specialties)
- [x] **Logo upload in Settings tab** — dealers upload/replace logo (JPG/PNG/WebP ≤2 MB); stored in Supabase Storage `dealer-logos` bucket (public); URL saved to `dealers.logo`; cache-busted preview updates immediately (added 2026-07-06)
- [x] Price history recorded automatically on every price edit, fires watcher notification
- [x] Mark as Sold with confirmation modal
- [x] Free-text make input with `<datalist>` autocomplete
- [x] Featured-listing toggle per vehicle
- [x] Export inventory — "Export CSV" / "Export JSON" buttons wired to `GET /api/dealer/export?format=csv|json`
- [x] Beta plan expiry banner (warning at ≤30 days remaining)
- [x] **Beta expiry enforcement** — expired dealers redirected to `/dealer/expired` on dashboard load; listing submit and listing edit also block expired dealers (added 2026-07-03)
- [x] **EV-conditional form fields** — when Fuel Type = Electric: Cylinders, Displacement, and Forced Induction fields hidden; Transmission and # of Speeds show only "1-Speed" (added 2026-07-07)
- [x] **Shared `VehicleFieldsForm` component** — the core vehicle-info fields (Year, Make, Model, Mileage, Condition, Body Style, Fuel Type, Engine, Transmission, Drive Type, Color, Price, Description) are now one component shared by `/sell`, this modal, and the admin Edit Listing modal, instead of three independently-maintained copies that had already drifted (this modal was missing VIN; admin was missing Fuel Type and Drive Type; `/sell` was missing Drive Type). Required: Year/Make/Model/Condition/Body Style/Fuel Type/Transmission/Drive Type/Price/Description/≥1 photo. Mileage, City, and State are optional everywhere — City/State pre-fill from the dealer's account on Add (added 2026-07-13)
- [x] **Fuel Type reordered** — appears before Engine Description so EV conditionals apply immediately (added 2026-07-07)
- [x] **Comma formatting on numeric inputs** — Mileage, Horsepower, Torque, and Price display commas while typing (e.g. `89,500`); commas stripped before API submit (added 2026-07-07)
- [x] **Phone formatting in Settings tab** — formats as `(xxx) xxx-xxxx` while typing (added 2026-07-07)

### Listing Expiry & Renewal
- [x] Listings auto-expire 30 days after approval (`expires_at`)
- [x] Expired listings excluded from all public browse/search surfaces
- [x] **Sold listings excluded from showcase surfaces** — homepage (Featured/Recently Listed), `/listings` search, and `fetchCars()` (encyclopedia model pages' live listings) all filter `is_sold = false`; `fetchCars()` previously had no filtering at all (pending/rejected listings could appear publicly on encyclopedia pages) — now matches `status='approved'` + not expired + not sold everywhere. The listing detail page and `/sold` archive intentionally still show sold listings (added 2026-07-07)
- [x] One-click "Renew listing" — private-seller account page and dealer dashboard, both show a days-remaining countdown (amber warning at ≤7 days)
- [x] **Renewal reminder email** — `POST /api/email/expiring-listings` emails sellers 3 days before expiry; idempotent via `renewal_reminder_sent_at`; triggerable from `/admin/email` (added 2026-07-03)

### VIN Verification
- [x] VIN field + inline "Verify VIN" button, positioned first on the `/sell` form so a clean decode auto-fills Year/Make/Model below it (moved 2026-07-14; fields already filled in by the user are never overwritten). **Pre-1981 VINs never auto-fill** — NHTSA has no decode data for that era (`nhtsaMake`/`nhtsaModel`/`nhtsaYear` aren't even returned by the API for `preStandard` VINs), so the user still fills those fields in manually, same as before this feature; confirmed working as intended, not a gap. A plain (non-verifying) VIN field is now also shown on the dealer Add/Edit Vehicle modal and the admin Edit Listing modal (added 2026-07-13)
- [x] NHTSA VIN decoder API integration (24h cache), fuzzy make/model/year matching
- [x] Color-coded result badge: verified / partial match / pre-1981 / invalid
- [x] `vin`, `vin_verified`, `vin_make`, `vin_model`, `vin_year` stored on the listing at submit time
- [x] Rate limited 20/hr/IP

### Private Seller Flow
- [x] `/sell` gated behind auth — server component checks session; logged-out visitors see `SellGate` ("Create a Free Account" / "Sign In"); form moved to `SellClient.tsx` (added 2026-07-06)
- [x] **Contact section removed from sell form** — seller name, phone, and email fields removed (2026-07-06); submit API reads `seller_name`/`seller_phone` from the `profiles` table and `seller_email` from `user.email`
- [x] **Fuel Type field added to `/sell` form** — Gasoline/Diesel/Electric/Hybrid/Flex Fuel; controlled via `fuelType` state; positioned before Engine field (added 2026-07-07); implemented in `SellClient.tsx`
- [x] **EV-conditional form fields on `/sell`** — when Fuel Type = Electric: Transmission shows only "1-Speed" (added 2026-07-07)
- [x] **Comma formatting on `/sell` numeric inputs** — Mileage and Price display commas while typing; stripped before FormData submit (added 2026-07-07)
- [x] **Note:** `/sell` renders `SellClient.tsx` — the unused `SellForm.tsx` was deleted 2026-07-14
- [x] Full listing submission — vehicle info, VIN + verify, location, up to 30 photos (lazy upload: images stay as File objects until submit, then uploaded inside `onSubmit`)
- [x] **Client-side image resize/compression before upload** (`lib/resizeImage.ts`) — applied on `/sell`, `/account` listing edit, and dealer Add/Edit Vehicle; downscales to fit 1920px on the long edge, re-encodes JPEG at 82% quality, preserves EXIF orientation, skips already-small images, falls back to the original on decode failure. Fixes slow uploads/gallery loads from unresized multi-MB phone photos, especially on cellular (added 2026-07-07)
- [x] **Require at least one photo** — both `/sell` form and dealer Add/Edit Vehicle modal block submission if no images are attached (added 2026-07-06)
- [x] CAPTCHA (Turnstile), rate limiting (5/hr/IP), 10-active-listing cap for non-dealers
- [x] Admin review queue — pending listings approved/rejected at `/admin`; seller emailed either way
- [x] Seller can edit/delete/resubmit their own listings at `/account?tab=listings` — full vehicle fields editable (year, make, model, body style, condition, fuel type, engine, transmission, exterior/interior color, seat material, city, state, price, mileage, description, photos); drag-to-reorder photos
- [x] **Condition validation** on submit — rejects invalid `condition` values server-side (added 2026-07-03)
- [x] **Email format validation** on `/api/inquire` and `/api/offers` (added 2026-07-03)

### Dealer Application & Onboarding
- [x] Public application form (`/dealer/apply`) — name, contact, dealer name, address, specialties, description, CAPTCHA
- [x] Rate limited 3/hr/IP; duplicate application/dealer detection
- [x] Admin review at `/admin` — approve creates an auth user + `dealers` row (`plan: 'beta'`); `beta_expires_at` = the configured promo expiry (default 2026-12-31, superadmin-editable in Team tab) for 250th promo applications submitted before the configured cutoff (default 2026-12-31), otherwise `now + dealerDefaultTrialDays`; emails a password-reset link with `redirectTo: /dealer/reset-password`; reject sends a note
- [x] **Applications tab — filter + pagination** — filter buttons (Pending/Approved/Rejected/All) with counts, defaults to Pending; 10-per-page pagination with Prev/Next; error alerts on approve/reject failure (added 2026-07-07)
- [x] **Applications tab — real beta-expiry date + link to Users tab** — approved-application cards previously guessed the beta expiry as `reviewed_at + 6 calendar months` client-side, which was wrong for promo applications (fixed date, not +6 months), imprecise even for standard approvals (calendar months vs. the configured day-count), and went stale if the date was later hand-edited via Users tab. `GET /api/admin/dealer-applications` now joins to `dealers` (matched by email — there's no FK between the tables) and returns the real `beta_expires_at`; the card displays that value and adds an "Edit in Users tab →" link (pre-fills the Users search with that dealer's email) instead of duplicating editable date fields (fixed 2026-07-12)
- [x] **Resend Setup Email button** — on approved applications; generates a fresh recovery link via `auth.admin.generateLink` with correct `redirectTo` and emails it; fixes cases where Supabase dashboard "Send password recovery" sent link to wrong URL (added 2026-07-07)
- [x] **Dealer password setup flow** — recovery token handling moved inline to `/dealer/login` (Supabase ignores `redirect_to` and always sends tokens there); detects `#access_token=...&type=recovery` hash, shows Set Password form directly; expired/invalid links show error via Supabase `#error=...` hash detection; `setSession()` establishes dealer session before password update; on success redirects to `/dealer/dashboard`; **Resend Setup Email** admin button generates a fresh recovery link (added 2026-07-06, fixed 2026-07-08)

### Advertising System
- [x] Public marketing page (`/advertise`) and advertiser signup (`/advertiser/signup`) — 14-day trial, tier selection; **Turnstile CAPTCHA added** (2026-07-08)
- [x] Advertiser login (`/advertiser/login`) and dashboard (`/advertiser/dashboard`)
- [x] Ad create/edit — headline, body copy, CTA label/URL, phone, logo, photo, rating
- [x] `GET /api/ads/serve` — geographic targeting via haversine distance between state centroids
- [x] Impression/click tracking via atomic RPCs, click endpoint rate-limited 60/hr/IP
- [x] Trial-expiry enforcement on ad creation and ad editing
- [x] `AdSlot` wired into the listing detail page sidebar

### Content & Marketing Pages
- [x] Classic Car Encyclopedia (`/cars`) — 77 models across 12 makes (expanded 2026-07-08: added 23 muscle car models missing vs. musclecarsillustrated.com reference; Dodge Dart GT added to notable versions)
- [x] Buyer's Guides index (`/guides`) — 6 articles
- [x] Market Report (`/reports`) — live avg price by make, most-viewed listings, market commentary; active listing count correctly filters `approved + not expired + not sold` (fixed 2026-07-07)
- [x] Pricing page (`/pricing`) — dealer plan tiers, private-seller pricing, advertiser tier grid ($79/$139/$219/$349/mo matching `/advertiser/signup`), 250th promo banner, Stripe coming-soon note (advertiser tiers added 2026-07-07)
- [x] **Private-seller listing copy corrected** — the $49/$99 one-time fee's "30 days" was ambiguous, reading like a hard repeat-paywall. Clarified it's a single payment that keeps the listing active **until it sells**; the 30-day cycle is a database-hygiene expiry, and renewing past it is free and unlimited — only a brand-new listing (after the current one sells or is removed) requires a new payment (fixed 2026-07-12)
- [x] About (`/about`), Contact (`/contact`), Privacy Policy (`/privacy`), Terms of Service (`/terms`); `/about` "The Platform" stats now live from DB — active listings + event counts (fixed 2026-07-07)
- [x] **Duplicated page-title suffix fixed** — `app/layout.tsx`'s metadata `template: '%s | GarageCherries'` auto-appends the site name to every page title, but 5 pages also appended it themselves, producing e.g. "... | GarageCherries | GarageCherries": `/cars/[make]/[model]`, `/guides`, `/guides/[slug]`, `/events`, `/contact`. Removed the redundant manual suffix from each (fixed 2026-07-12)
- [x] **Decorative cherry icon now matches the brand logo** — `/sell` (gate + both submitted-confirmation states), `/dealer/apply` (submitted confirmation), `/error`, and `/not-found` used a raw 🍒 Unicode emoji (renders via the OS's own emoji font) for a large decorative icon, which visually didn't match the actual branding PNG used in the header logo. Replaced all 6 instances with the same `cherries.png` branding image (fixed 2026-07-12)
- [x] Cookie consent banner and Turnstile CAPTCHA on public forms
- [x] XML Sitemap (`/sitemap.xml`) — dynamic, covers homepage, listings (individual + make + make/model), dealers, encyclopedia (77 models), advertisers, guides (6 articles), `/events`, individual event detail pages (`/events/[slug]`), `/sold`, `/dealer/apply`, `/advertiser/signup`, `/privacy`, `/terms`; revalidates every hour
- [x] Robots.txt (`/robots.txt`) — allows all crawlers, blocks `/admin`, `/api/`, `/dealer/dashboard`
- [x] **Advertiser public directory** (`/advertisers`) — grouped by category (detail, insurance, finance, transport, storage, restoration, inspection); active + valid trial only
- [x] **Advertiser public profile pages** (`/advertisers/[slug]`) — business info, description, phone/website CTAs, active ads as "Current Offers"; `slug`, `description`, `website` columns added via migration
- [x] **Sold archive** (`/sold`) — gallery of recently sold vehicles (up to 120, ordered by `sold_at` desc); shows asking price labeled "Listed at $X" (not sale price); sold date ribbon + light grayscale tint on photos; CTA to browse active listings; in sitemap at priority 0.7/daily. *Future enhancement: add optional actual sale price field to Mark as Sold flow (Option 2 — deferred)*

### Buyer Accounts
- [x] Signup, Login, forgot/reset password flow
- [x] **Full Name required + reliably captured on signup** — Full Name is now a `required` field on `/account/signup`; `full_name` is passed into `auth.signUp()`'s `options.data` so it populates Supabase Auth's `user_metadata` (Display Name) immediately; a `handle_new_user_profile()` DB trigger on `auth.users` insert reliably writes it to `profiles.full_name` server-side, replacing a client-side upsert that silently failed under RLS before email confirmation (fixed 2026-07-10, commit `98fc3c8`)
- [x] **Password reset email redirect fixed** — Supabase's Redirect URLs allow-list was missing `/account/reset-password` and `/dealer/login`, so reset emails silently fell back to the bare homepage instead of the reset form. First attempt added `https://garagecherries.com/**` / `https://www.garagecherries.com/**` wildcard entries, but these did **not** work in practice — reset emails kept falling back to the homepage even with the wildcards in place. Fixed for real by replacing the wildcards with four exact literal entries (`https://garagecherries.com/account/reset-password`, `https://www.garagecherries.com/account/reset-password`, `https://garagecherries.com/dealer/login`, `https://www.garagecherries.com/dealer/login`) in Supabase Dashboard → Authentication → URL Configuration, and removing the wildcard entries entirely. Confirmed working end-to-end on live 2026-07-11 (dashboard-only change, no code deploy). Also replaced Supabase's default generic reset-password email with a branded HTML template (Supabase Dashboard → Authentication → Emails → Reset Password) matching GarageCherries' look.
- [x] **Sign in with Google** on `/account/login` and `/account/signup` (`components/GoogleSignInButton.tsx`) — buyer-only, scoped deliberately (dealers have no self-serve signup, so there's no friction to remove there); first-time Google sign-ins get a `profiles` row seeded from their Google name; `?promo=`/`?return=` params carried through to the post-auth redirect. Extends the existing `/auth/callback` route (shared with dealer password-reset links) rather than a separate route. **Published to production in Google Cloud Console** — any Google user can sign in, not just allowlisted testers (added 2026-07-09)
- [x] **Sign in with Facebook** on `/account/login` and `/account/signup` (`components/FacebookSignInButton.tsx`) — mirrors the Google sign-in implementation exactly (same `profiles`-seeding gate in `/auth/callback`, now keyed on `provider` being `google` or `facebook`; same `?promo=`/`?return=` handling); buyer-only, same reasoning as Google. **Published to production** — the Meta app (App ID `1342998511376071`) was published via the dashboard's Publish page 2026-07-13, the same way Google was published; any Facebook user can now sign in, not just Admins/Developers/Testers (added 2026-07-09, published 2026-07-13)
- [x] Profile management (`/account/profile`)
- [x] Watchlist — save listings, view at `/account?tab=watchlist` and standalone `/account/watchlist`
- [x] Car Alerts — saved searches with automatic email notification on new matches, up to 10 per user, edit/pause/delete
- [x] My Listings tab — private sellers manage their own listings; persistent "+ Post a Listing" button in the tab header (previously only shown in the empty state, disappearing once a user had any listings) (added 2026-07-07)
- [x] **Per-listing views + watcher counts** — each listing card shows "N views · N watching" (all-time), sourced from `GET /api/dealer/watcher-counts` (added 2026-07-13)
- [x] Live buyer-seller messaging — in-page Messenger-style chat widget, Supabase Realtime push, unread badges, report-message flow
- [x] **Dealer inventory export — seat_material and seating_type added** — both fields were present in the Add Vehicle form and DB but missing from `GET /api/dealer/export`; added to both CSV column list and Supabase select (fixed 2026-07-08)
- [x] **Dealer dashboard sold listing cleanup** — Edit button and "Expires in Xd" text hidden for sold listings in dealer inventory table, matching the same fix on the private seller account page (fixed 2026-07-08)
- [x] **Verified and Mark Sold tooltips removed** — removed from dealer dashboard header and inventory row (fixed 2026-07-08)
- [x] **WatchlistButton tooltip removed** — info tooltip removed from Save to Watchlist button on listing detail page (fixed 2026-07-08)
- [x] **Mark as Sold UI fixed (private seller)** — `is_sold` added to `/api/listings/my` select and `MyListing` interface; `markAsSold` now updates local state with `is_sold: true` on success; badge shows "Sold" (not "Live") immediately and persists after refresh; Mark as Sold and Renew buttons hidden when `is_sold` is true (fixed 2026-07-08)
- [x] **WatchlistButton tooltip removed** — info tooltip ("Save this listing to your watchlist…") removed from `components/WatchlistButton.tsx`; button label already communicates the action (fixed 2026-07-08)
- [x] **MessengerWidget sender_name fixed** — `sender_name` is now derived server-side from `user.user_metadata?.full_name || user.email` on both the initial conversation POST and the reply POST; client-supplied `senderName` was removed as a trust vector; existing bad rows fixable via SQL update against `auth.users` (fixed 2026-07-08)
- [x] **Conversation list buyer/seller label fixed** — `buyer_id` was missing from the Supabase select in `GET /api/conversations`; without it the `buyer_id === userId` check always evaluated false, so every conversation showed "Buyer: name" even for the seller; `buyer_id` added to select and the label now correctly shows "Private Seller" for the buyer's own conversations (fixed 2026-07-08)
- [x] **Email preferences tab in `/account` settings** — "Email Preferences" card under Settings tab; toggle switches for Weekly Digest, Price Drop alerts, Car Alerts; reads/writes `digest_opt_out`, `price_drop_opt_out`, `alerts_opt_out` in Supabase `user_metadata` (added 2026-07-07)

### Email (via Resend)
- [x] **Shared email branding** — `lib/emailBranding.ts` exports `emailHeader` (dark zinc bar with cherry image + GarageCherries wordmark) and `emailWrap(body)` helper; all outgoing transactional emails (approval, rejection, dealer application, alerts, digest, price-drop, sold notifications, renewal reminder, warn user, account suspension) import from this single source so branding is consistent (added 2026-07-08)
- [x] **Rejection email logging hardened** — `log.flush()` called inside `.then()/.catch()` callbacks on Resend send calls; previously log entries were batched and dropped when the route returned before the promise resolved; also added `log.warn` when `seller_email` is missing (fixed 2026-07-08)
- [x] **New message email to seller** — when a buyer starts a new conversation, seller receives an email with the buyer's name, listing title, message preview, and a "Reply to Message →" CTA linking to `/account?tab=messages`; fire-and-forget, logged to Axiom; only fires on first contact (not every reply) (added 2026-07-08)
- [x] Buyer inquiry delivered to seller/dealer instantly
- [x] Listing approved / listing rejected notifications to seller
- [x] Dealer application approved / rejected notifications
- [x] Car alert match notification — with "Unsubscribe from all alerts" link (added 2026-07-03)
- [x] Price drop notification to watchlist users (immediate, on price edit)
- [x] Sold-listing notification to watchlist users
- [x] Weekly fresh listings digest (manual/cron trigger) — with unsubscribe link
- [x] Monthly dealer performance report (manual/cron trigger) — with unsubscribe link
- [x] Admin rate-limit alert emails
- [x] **Listing renewal reminder** — 3 days before expiry, idempotent (added 2026-07-03)

### Email Unsubscribe
- [x] `/unsubscribe/digest` — sets `digest_opt_out` in `user_metadata`; UUID guard
- [x] `/unsubscribe/price-drops` — sets `price_drop_opt_out` in `user_metadata`; UUID guard
- [x] `/unsubscribe/dealer-report` — sets `report_opt_out` on `dealers` row; UUID guard
- [x] `/unsubscribe/alerts` — sets `alerts_opt_out` in `user_metadata`; UUID guard; link in alert emails (all added 2026-07-03)

### Admin Tools
- [x] Full admin panel (`/admin`) — Listings, Reported, Users, Applications, Events, Team tabs
- [x] Role hierarchy: `support < moderator < admin < superadmin`; all 4 roles assignable via UI (fixed 2026-07-03)
- [x] **Reported tab — full conversation thread** — clicking a reported card expands it to show the full message history (oldest → newest); reported message highlighted in red; three inline actions: Dismiss (clears flag), Warn User (sends warning email via Resend; customizable message), Suspend User (inline reason + confirm); `GET /api/admin/conversations/[id]/messages` admin-only endpoint; `PATCH /api/admin/users` extended with `action:'warn'` (added 2026-07-07)
- [x] **Warn User feedback banner** — after sending a warning, an amber "⚠️ Warning sent to [name]" banner replaces the action buttons on the report card; report auto-dismisses from the queue after 1.5 s; `warnedMsgIds` Set state drives this without a DB round-trip (added 2026-07-08)
- [x] Users tab — search/filter, view seller listings, suspend/unsuspend, edit, promote seller to dealer, delete account; **color-coded left border stripe + type icon per primary role** (dealer=blue/🏢, advertiser=purple/📢, seller=green/🧑, buyer=gray/👤; suspended=red override); **server-side role/status filtering** + **25-per-page pagination** with Prev/Next controls and total count (added 2026-07-09); **Edit modal now includes per-account dealer beta / advertiser trial override** — a date field appears for whichever role(s) the account has, letting any admin-role team member extend/shorten a specific account's free period independent of the site-wide default (added 2026-07-11)
- [x] Team tab — add/remove admin team members by email + role
- [x] **Trial & Promo Settings card** in Team tab (superadmin) — four fields (Promo Application Cutoff, Promo Expires At, Advertiser Trial Days, Dealer Default Trial Days) backed by a new `site_settings` table; `GET/PATCH /api/admin/settings`; replaces four previously-hardcoded literals across `admin/dealer-applications`, `advertiser/signup`, `cron/promo-expiry`, and `email/promo-expiry` (added 2026-07-11)
- [x] **Advertiser signups now use the promo window too** — `POST /api/advertiser/signup` previously always used the fixed `advertiserTrialDays` day-count; it now checks the same `promoApplicationCutoff` the dealer flow uses, and gives signups before that cutoff a trial through `promoExpiresAt` instead. `/advertiser/signup` and `/pricing` show "Free through [date]" during the promo window rather than a misleading fixed "X-day trial" claim (added 2026-07-13)
- [x] **Advertiser trial marketing copy now reflects the configured value** — `/advertiser/signup` and the Advertise section of `/pricing` previously hardcoded "14-day free trial" regardless of the actual `advertiserTrialDays` setting, so changing the setting silently made the copy wrong. Fixed via a new public `GET /api/public/trial-days` endpoint (exposes only the trial day count, no auth); `/advertiser/signup` fetches it client-side, `/pricing` reads it server-side via `getSiteSettings()` directly (found and fixed 2026-07-12)
- [x] **Non-superadmin Settings-card visibility now has real test coverage** — a review found the client-side gate (`adminRole === 'superadmin' &&` in the Team tab) had no test exercising the negative case. The actual risk was the *role-resolution logic* (matching the logged-in user's email against the team list), not the one-line conditional itself, so it's extracted into a pure, dependency-free `resolveAdminRole()` (`lib/resolveAdminRole.ts`) and unit tested directly for all four roles, including confirming admin/moderator/support resolve to a non-superadmin role. A full E2E negative-case test (log in as a real non-superadmin admin and assert the card is absent) still isn't wired up — it needs a second admin-role test credential that doesn't exist in CI secrets yet (fixed 2026-07-12)
- [x] **`dealer_applications.dealer_id`** — approved applications now link to the exact `dealers` row they created (`on delete set null`), instead of the Applications-tab beta-expiry display matching by email alone. Found while testing: deleting a dealer account and later approving a new application that reuses the same email would have shown the *new* dealer's expiry date on the *old*, now-orphaned application card. `dealer_id` is set at approval time; the GET route joins on it instead of email; a stale application whose dealer was deleted shows "Account created." with no date rather than a misattributed one (fixed 2026-07-12)
- [x] **Dealer deletion now resets the linked application's status** — a follow-up gap in the above: deleting a dealer nulled `dealer_id` via the FK but left `dealer_applications.status` stuck at `'approved'` forever, permanently blocking that email from ever re-applying (`app/api/dealer/apply` rejects new submissions while a `pending`/`approved` row exists for the email). `DELETE /api/admin/users` now resets any `status='approved'` row pointing at the dealer being deleted to `'rejected'` (with an explanatory `rejection_note`) before the dealer row is removed. Found via a real stuck test account; 4 pre-existing orphaned applications cleaned up via one-off SQL (fixed 2026-07-13)
- [x] **Email Campaigns** card in Team tab (superadmin) — links to `/admin/email` (added 2026-07-03)
- [x] **Cleanup Orphan Images** button in Team tab (superadmin) — triggers `POST /api/admin/cleanup-images`, shows deleted count inline (added 2026-07-03)
- [x] Email campaign trigger page (`/admin/email`) — digest, price-drop, dealer-report, and renewal-reminder jobs
- [x] All admin/email routes protected by role checks or `ADMIN_API_SECRET`/`INTERNAL_API_SECRET` bearer headers

### Metrics
- [x] `avgDaysOnMarket` NaN guard — filters to approved, unsold listings only; guards against unparseable dates (fixed 2026-07-03)

### Security Hardening
- [x] Rate limiting across all public-write routes
- [x] Suspended-user checks on listing submit/edit and all messaging routes
- [x] `POST /api/alerts/match` and `POST /api/notify-watchers` require internal auth
- [x] DB-level race-condition fixes: unique constraints, advisory-lock-guarded RPCs
- [x] State-code validation on listing submit and dealer apply
- [x] Ad `cta_url` scheme validation (`http(s)://` only)
- [x] UUID regex guard before all `admin.auth.admin.getUserById()` calls (prevents SDK throws on non-UUID input)
- [x] **`SessionGuard`** (`components/SessionGuard.tsx`) — detects zombie sessions (deleted user still has valid JWT) and forces sign-out. **Currently disabled in `app/layout.tsx`** (2026-07-07) — two back-to-back bugs (timing-race false positive, then logic inversion) force-logged-out at least one real user. Re-enable only after root cause of `/api/` 401s on valid sessions is diagnosed and tested without a live user as subject.

### Testing

- [x] **Unit test suite (Vitest)** — `tests/unit/` directory; **51 test files, 859 tests**, all passing (expanded 2026-07-11 for the configurable-durations feature; coverage: 99.2% statements / 90.75% branches / 96.29% functions / 99.79% lines across `lib/**` + `app/api/**`, holding above the enforced CI thresholds of 97/88/94/97):
  - Every API route now has real test coverage, not just the pure-logic helpers: all `admin/*` tools, `dealer/*` dashboard routes, `alerts/*`, `ads/*`, `advertiser/*`, `cron/*` + `email/*` triggers, `conversations`/`messages`/`watchlist`/`offers`/`inquire`, `listings/*`, `events/submit`, `feedback`, `reviews`, `track-view`, `newsletter/subscribe`, `account/profile`, `facebook/post-listing`
  - Every previously-untested `lib/` file now covered: `lib/db.ts`, `lib/matchAlerts.ts`, `lib/resizeImage.ts` (canvas/`createImageBitmap` mocked), `lib/messenger-context.tsx` (via `@testing-library/react` `renderHook`), `lib/facebook/postToPage.ts` (fetch mocked)
  - **Fixed a fake-coverage bug**: `lib/matchAlerts.ts`'s `scoreMatch`/`alertName`/`matchBadges` weren't exported, so `tests/unit/scoreMatch.test.ts` and `matchAlerts.test.ts` tested local reimplementations instead of the real code — the file measured 0% despite "passing" tests. Now exported and tested directly, plus full `matchAndNotifyAlerts` orchestrator coverage (cooldown, dedup, opt-out, email send) added
  - Pure lib functions: `lib/emailBranding.ts`, `lib/encyclopedia.ts`, `lib/admin.ts`, `lib/verifyTurnstile.ts`, `lib/notifyAdmin.ts`, `lib/logger.ts`
  - **Coverage thresholds added** to `vitest.config.ts` (97% statements / 88% branches / 94% functions / 97% lines) — CI now runs `npm run test:coverage` (previously plain `npm test`, which never checked coverage at all) so a regression below these floors fails the `check` job the same way a failing test does
  - Remaining gap to literal 100% is almost entirely no-op `.catch(() => {})` fire-and-forget handlers, redundant `??`/`||` fallback chains where both branches produce the same outcome, and `rateLimit.ts`'s background `setInterval` pruning callback — none representing real behavioral risk
  - Vitest config: `tests/unit/**/*.test.ts`, coverage provider `v8`, includes `lib/**` and `app/api/**`, excludes `lib/supabase/**`
- [x] **E2E test suite (Playwright)** — `tests/e2e/` directory; **15 spec files**, all tests pass against local dev server (reuses existing server via `reuseExistingServer: true`):
  - `auth-pages.spec.ts` — buyer login/signup, dealer login, forgot-password, `/sell` auth gate
  - `ui-flows.spec.ts` — homepage, listings browse, legal pages, sell page gate, dealer apply, 404
  - `sell.spec.ts` — auth-gated sell page: loads without error, logged-out gate visible, sign-in CTA present
  - `admin.spec.ts` — admin panel tabs (listings, events, reported, users, team, applications); non-admin denied (requires `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars)
  - `events.spec.ts` — `/events` loads, logged-out sees sign-in CTA, page shows events or empty state, `POST /api/events/submit` returns 401 unauthenticated
  - `api-auth.spec.ts` — all protected API endpoints return 401 unauthenticated; public endpoints accept unauthenticated requests
  - `buyer-golden-path.spec.ts` — **24 tests** covering full unauthenticated buyer journey: browse/filter (keyword, body style, year/price range, empty state), listing detail core content (title, price, condition, gallery, spec sheet, breadcrumbs), listing detail sidebar (watchlist button, message seller, financing calculator), contact form presence, watchlist auth guard (UI + API), car alerts API auth guard, make/model encyclopedia pages, sold archive (added 2026-07-09; 3 tests for the inspection affiliate card and Detail 360 sponsor card removed the same day — see "Advertising — ad display" above)
  - `browse.spec.ts`, `listings.spec.ts`, `listing-detail.spec.ts`, `auth.spec.ts`, `dealer.spec.ts`, `homepage.spec.ts`, `unsubscribe.spec.ts`, `criticalGaps.spec.ts`, `highGaps.spec.ts` — additional coverage across all major surfaces
- [x] **GitHub Actions CI** — `.github/workflows/ci.yml`; runs `tsc --noEmit` + `npm run test:coverage` (Vitest unit tests with coverage thresholds enforced) on every push to `main` and on PRs; Node 24; branch protection requires `check` job to pass (added 2026-07-09; switched from plain `npm test` to `test:coverage` 2026-07-10 so coverage regressions fail CI). Was actually red the whole day on 2026-07-09 — `tests/unit/api.listings.patch.test.ts` had a fake `Request` cast that didn't satisfy the `NextRequest` param type; GitHub auto-bypassed the failing check due to admin permissions. Fixed same day (cast changed to `as unknown as NextRequest`) — the `check` job genuinely passes rather than being bypassed; verified again 2026-07-10 (run #29, commit `c5aa783`) after the coverage-threshold change actually completed rather than being bypassed
- [x] **GitHub Actions — Playwright `e2e` job** — second job in `ci.yml`, runs the full `tests/e2e/` suite on every push/PR alongside `check`; installs Chromium (`playwright install --with-deps`), uploads the HTML report as an artifact on every run. Requires repo secrets for Supabase/Resend/Turnstile (same values as local `.env.local`, since there's no separate staging environment) plus optional `E2E_ADMIN_*`/`E2E_DEALER_*` secrets to unskip the credential-gated admin/dealer authenticated tests (left unset for now — those 17 tests still skip in CI same as locally). Verified genuinely passing (not bypassed) via the GitHub API on run #32 (commit `3c62464`) and again on runs #33–35 (added 2026-07-12)

### Technical Infrastructure
- [x] Next.js 16 App Router with TypeScript, React 19
- [x] Supabase PostgreSQL with Row Level Security
- [x] Supabase Auth (buyer + private seller + dealer + advertiser + admin sessions)
- [x] Supabase Storage (listing photo uploads via signed URL + lazy client-side upload); `dealer-logos` public bucket with RLS policies for authenticated dealer uploads (added 2026-07-06)
- [x] Server components + client components correctly separated
- [x] `createClient()` (async, RLS-enforced) and `createAdminClient()` (sync, service role) pattern
- [x] Cloudflare Turnstile CAPTCHA on public-facing submission forms — `/sell`, `/dealer/apply`, `/advertiser/signup`, `/account/signup`; all verified blocking empty/fake tokens with correct 400 responses
- [x] **Sentry error tracking** — `@sentry/nextjs`; client + server + edge configs; `instrumentation.ts` hook; `app/error.tsx` captures unhandled errors; env vars in Vercel (added 2026-07-06)
- [x] **Axiom structured logging** — `next-axiom`; `lib/logger.ts` unified logger with Axiom + Sentry integration; `createLogger(source)` wired across all high-value API routes: `api/inquire`, `api/dealer/apply`, `api/alerts/match`, `api/notify-watchers`, `api/conversations`, `api/conversations/[id]/messages`, `api/email/digest`, `api/email/dealer-report`, `api/email/expiring-listings`, `api/admin/listings`, `api/admin/events`, `api/listings/submit`; env vars in Vercel (added 2026-07-06, expanded 2026-07-07)
- [x] Deployed to Vercel (project `garage-cherries`, GarageCherries team account, Hobby plan); custom domain `garagecherries.com` and `www.garagecherries.com` live with SSL
- [x] **Events calendar** (`/events`) — DB-backed; `events` table with `status` (`pending/approved/rejected`), `submitted_by`, `submitter_email`, `submitter_name`, `start_time`, `end_time`, `slug` columns; public page (approved only) shows upcoming/featured/past sections with time display; logged-in users can submit events via inline form (goes to `pending`); logged-out users see sign-in prompt; admin Events tab has pending approval queue with Approve/Reject buttons; admin-created events go straight to `approved`; `revalidatePath('/events')` called on every admin mutation so page updates instantly without hard refresh (added 2026-07-07)
- [x] **Individual event detail pages** (`/events/[slug]`) — per-event page with `generateMetadata` (title/description/OG), JSON-LD `Event` schema for Google rich results, date/time/location details card, "Add to Google Calendar" deep link, "Visit Event Website" CTA; event names on `/events` list link to detail pages; slugs auto-generated on insert (`name-date` format); `slug` column backfilled for existing events via migration (added 2026-07-07); **JSON-LD `image` and `offers` fields added** to fix Google Search Console non-critical warnings; using promo eagle image (Supabase storage) — **swap to permanent brand OG image after 2026-07-31** (added 2026-07-08)
- [x] **Cherry logo + favicon** — `public/cherry-logo.png` (transparent background PNG); used in Header (44×44, `unoptimized` to preserve alpha), Footer (36×36); `app/favicon.ico` replaced with cherry ICO file (Next.js App Router: `app/favicon.ico` always takes precedence over metadata icons) (added 2026-07-07)
- [x] **Google Analytics 4** — Measurement ID `G-B36QB0J7TX`; added to `app/layout.tsx` via Next.js `Script` (afterInteractive)
- [x] **SEO — JSON-LD structured data** — Organization (homepage, about, contact), AutoDealer + BreadcrumbList (dealer pages), Vehicle + BreadcrumbList (listing detail), Article + BreadcrumbList (encyclopedia model pages), LocalBusiness + BreadcrumbList (advertiser detail pages)
- [x] **SEO — OG image** — static `app/opengraph-image.jpg` (1200×630), currently the 250th anniversary eagle promo graphic; served at `/opengraph-image.jpg` (note the extension — static image files keep it in the URL, unlike the old dynamic `ImageResponse` version this replaced, which served at `/opengraph-image` with no extension); `app/layout.tsx` metadata must reference the exact same path or link previews 404 (this broke in production on 2026-07-09 and was fixed same day); swap back to a permanent non-promo brand image after 2026-07-31
- [x] **SEO — sell page metadata** — `app/sell/layout.tsx` adds title, description, canonical (page is `use client` so layout wrapper required)
- [x] **SEO — filter clamping** — year inputs `min=1900 max=2030`, price inputs `min=0` (client); `lib/db.ts` clamps year to [1900–2030] and rejects negative price server-side
- [x] **Google Search Console** — property `https://www.garagecherries.com` verified (DNS method, auto-detected); sitemap submitted; 81 pages discovered
- [x] **Admin — Events tab** — add/edit/delete events (straight to approved); pending submissions queue with Approve/Reject; visible to admin and superadmin roles; logged via Axiom/Sentry (added 2026-07-07)
- [x] **Account suspension flow** — suspend action in Users tab sends Resend email to user with reason; suspended users redirected to `/account/suspended` on login with "Contact Support" CTA (added 2026-07-08)
- [x] **Admin Panel link for non-superadmin team members** — `GET /api/admin/team` now accessible to all team roles (previously superadmin-only), allowing Header to detect admin status and show the Admin Panel link (fixed 2026-07-08)
- [x] **Admin listings rejection "Other" textarea fix** — separate `customRejectionReason` state prevents textarea from closing when typing (fixed 2026-07-08)
- [x] **Bing Webmaster Tools** — imported from GSC; sitemap submitted; processing
- [x] **Expiring-listings cron** — `GET /api/cron/expiring-listings` Vercel Cron route (runs 10:00 UTC daily); authenticated by `CRON_SECRET`; delegates to `POST /api/email/expiring-listings` via `ADMIN_API_SECRET`; registered in `vercel.json` alongside `promo-expiry` cron (added 2026-07-08)
- [x] **Tooltip `align` and `side` props** — `components/Tooltip.tsx` now accepts `align` (`left`/`center`/`right`, default `center`) and `side` (`top`/`bottom`, default `top`); Renew button uses `align="right"` so bubble opens leftward instead of clipping the right edge; Verified badge uses `side="bottom"` so bubble opens downward instead of hiding behind browser chrome (added 2026-07-08)
- [x] `SPEC.md` — detailed master specification; treat as the primary technical reference

---

## ⚠️ Partially Implemented

| Feature | What Exists | What Is Missing |
|---|---|---|
| **AI Features** | Nothing — all 5 AI routes deliberately removed 2026-07-01 | Everything; deferred to future release |
| **Advertising — ad display** | Full backend + `AdSlot` wired into listing detail page sidebar | — |
| ~~**Dealer Watcher Messaging**~~ | ✅ Complete (2026-07-07) — watcher counts load per listing; "Message X watchers" button appears on eligible approved listings; compose modal with send confirmation; "Messaged" label shown after send to prevent duplicates | — |
| ~~**Per-listing Views/Watchers display**~~ | ✅ Complete (2026-07-13) — Views and total-watcher columns added to the dealer Inventory table and Overview "Your listings" panel, and to the private-seller account page's My Listings cards | — |
| **Dealer Subscriptions** | Pricing page shows Starter/Pro/Unlimited plans | No Stripe — nothing actually charges |
| **Featured Listing Toggle** | Toggle in dashboard, `featured` DB field, badge + homepage placement | No payment gate — free for all dealers currently |
| **Import/Sync Inventory** | "Import JSON" and "Sync Now" buttons visible in dealer dashboard; sample file at `docs/dealer-import-sample.json` | Both are visually disabled (greyed out, `disabled` attr, "Coming soon" tooltip) — no API route or click handler yet |
| ~~**Email preferences UI**~~ | ✅ Complete (2026-07-07) — Email Preferences card in `/account` Settings tab; three toggles; persisted to `user_metadata` | — |
| ~~**Facebook Page auto-posting**~~ | ✅ Complete (2026-07-13) — GarageCherries Facebook Page created and linked to the Business Portfolio; posting code (`lib/facebook/postToPage.ts`) hooked into dealer listing creation, admin event creation, and listing/event approval flows. Facebook Login and Page-management use cases are mutually exclusive on the same Meta app (confirmed via Meta's own docs), so Page posting required a second dedicated app ("GarageCherries Pages," separate from the Login app at App ID `1342998511376071` — see Meta dashboard for the Pages app's own ID, not captured here) with a Business Portfolio System User ("GarageCherries Auto-Poster") holding Content access on the Page and Manage-app access on the app itself, generating a non-expiring Page Access Token. `FACEBOOK_PAGE_ID`/`FACEBOOK_PAGE_ACCESS_TOKEN` set in Vercel; live-confirmed working via a real test event auto-posting to the Page | — |

---

## ❌ Not Implemented

### Near-Term Priority

| Feature | Description | Blocker |
|---|---|---|
| **Stripe Integration** | Dealer subscriptions, private seller checkout, featured listing upgrades | Requires Stripe account + webhooks |
| **Dealer Self-Serve Onboarding** | Signup → choose plan → pay → dashboard | Requires Stripe; product decision on vetting model |
| **Seller/buyer ratings** | P2P rating system for private sellers and buyers (dealer reviews already exist) | Not started |
| **Compare Listings** | Side-by-side comparison of 2–4 cars | Complex persistent UI state |
| ~~**Buyer Inquiry History**~~ | ✅ Already covered — buyers already see everything they've sent to sellers via the `/account` Messages tab (`conversations`/`messages` tables, the live two-way system behind "Message Seller"). A separate `/account/inquiries` page would have shown the `inquiries` table, which had no live writer since that button switched to `conversations` — that table and its route were deleted 2026-07-14 rather than built out further | — |
| **Geographic Analytics** | IP geolocation on views, buyer location map in dealer dashboard | No geolocation service wired up |
| **Verified History Badge** | Full vehicle history report (accidents, title, prior owners) | Requires Carfax/AutoCheck API + commercial agreement |
| ~~**Email Newsletter Signup**~~ | ✅ Complete (2026-07-07) — newsletter banner in footer with email form; `/api/newsletter/subscribe` POST; `newsletter_subscribers` table; duplicate emails silently succeed | — |
| **Sales Pipeline / CRM** | Track dealers & advertisers through free → paying conversion. Options: (A) Sales tab in `/admin` showing active/expiring/expired/converted with one-click email; (B) Export contacts CSV from admin → load into HubSpot free tier for email sequences and deal tracking; (C) automated drip emails at 30 days / 14 days / day-of expiry. Recommended order: B first (quick export), then C (drip emails), then A. | Stripe must be live first for "converted" status to mean anything |
| **Sold archive — actual sale price** | Add optional "Sold for $X" field to Mark as Sold flow; show real transaction price on `/sold` instead of asking price | Deferred (Option 2) — `/sold` page is live with asking price for now |
| ~~**Model filter on /listings**~~ | ✅ Complete (2026-07-07) — cascading Make → Model dropdown; hidden until a make is selected AND models exist in DB; `/api/models` endpoint | — |
| **Impression-weighted ad rotation across advertisers** | `GET /api/ads/serve` picks among eligible advertisers with a flat uniform random pick (`app/api/ads/serve/route.ts` — a misleading comment claiming impression-weighting was corrected 2026-07-09). Only the ad-selection step *within* a single advertiser's own ads is impression-weighted; there's no fairness *between* competing advertisers in the same market. Would need per-advertiser impression totals aggregated from the `ads` table, then a weighted pick favoring less-served advertisers. | Low value until multiple advertisers are actually trialing/paying in the same overlapping market at the same time — currently there's rarely more than one eligible advertiser per state to be unfair between |

### Mid-Term

| Feature | Description |
|---|---|
| **Mobile App** | React Native iOS + Android sharing the Supabase backend |
| **Auction Mode** | Timed listings with reserve price, real-time bidding, outbid notifications |
| **Dealer Analytics V2** | Traffic sources, view-to-inquiry conversion, price competitiveness score |
| **Social Sharing** | One-click share to Facebook, Instagram, X from listing pages |
| **Community Posts** | "Spotted at a show" posts, Q&A on listings |
| **Dealer Follow / Subscribe** | Buyers follow a dealer and get notified of new listings |
| **Inventory Import** | CSV bulk upload, DealerSocket/vAuto integration (VIN decode exists; this is bulk import) |

### Long-Term

| Feature | Description |
|---|---|
| **GarageCherries Auctions** | Full auction platform competing with Bring a Trailer |
| **Financing Integration** | `FinancingCalculator` links to lenders with no affiliate ID — quick win once a partner agreement exists |
| **Insurance Integration** | Hagerty / Grundy quote widget, referral revenue |
| **Shipping & Transport** | Montway / uShip quote integration, referral revenue |
| **Market Intelligence Tool** | Comparable sold listings, price trend graphs |
| **GarageCherries Certified Program** | Third-party inspection, certified badge, premium listing fee |
| **Price History Chart** | `PriceHistoryChart.tsx` component exists; deferred until real price-change history accumulates post-launch |

---

## Revenue Streams — Implementation Status

| Stream | Status | Monthly Potential |
|---|---|---|
| Dealer subscriptions | ❌ Stripe not wired | $3,000–$50,000 |
| Private seller listings | ❌ No checkout (listing creation itself is free and works) | $500–$5,000 |
| Featured listing upgrades | ⚠️ Toggle exists, no payment | $1,000–$8,000 |
| Homepage spotlight | ❌ Not built | $300–$3,000 |
| Display advertising | ✅ Signup, ad creation, targeting, tracking, and display all work | $500–$15,000 |
| Newsletter sponsorships | ⚠️ Email built + subscriber signup form live; no sponsor workflow or audience yet | $400–$6,000 |
| Lead gen / pay-per-inquiry | ❌ Not built | $3,000–$30,000 |
| Auction buyer fee (5%) | ❌ Not built | $5,000–$35,000 |
| Financing referrals | ❌ Not built (calculator links out with no affiliate tracking) | $1,000–$10,000 |
| Insurance referrals | ❌ Not built | $1,000–$8,000 |
| Shipping referrals | ❌ Not built | $500–$3,000 |
| Inspection affiliate referral | ❌ Built once, lost in a merge; not currently live | $500–$5,000 |

---

## Third-Party Services

| Service | Purpose | Status | Dashboard |
|---|---|---|---|
| **Vercel** | Hosting + deploys | ✅ Live | vercel.com |
| **GitHub** | Source control | ✅ Live | github.com/thedjohn/GarageCherries |
| **Supabase** | Database, Auth, Storage | ✅ Live | supabase.com |
| **Resend** | Transactional email | ✅ Live | resend.com |
| **Cloudflare Turnstile** | CAPTCHA on public forms | ✅ Live (new widget created 2026-07-06; site key `0x4AAAAAADw8X7lzy2nijmab`) | dash.cloudflare.com |
| **NHTSA VIN Decoder API** | VIN format/decode verification | ✅ Live (free, no key required) | vpic.nhtsa.dot.gov |
| **Enzuzo** | Hosted Privacy Policy / Terms of Service content | ✅ Live | app.enzuzo.com |
| **Anthropic** | AI features (Claude) | ❌ Removed 2026-07-01 — deferred to future release | console.anthropic.com |
| **Sentry** | Error tracking | ✅ Live — `@sentry/nextjs`, DSN configured, errors flowing (added 2026-07-06) | sentry.io |
| **Axiom** | Structured logging | ✅ Live — `next-axiom`, dataset `garagecherries`, logs flowing (added 2026-07-06) | axiom.co |
| **Stripe** | Payments | ❌ Not connected | stripe.com |
| **Google Search Console** | SEO indexing | ✅ Live — property verified, sitemap submitted (2026-07-07) | search.google.com/search-console |
| **Google Analytics** | Traffic analytics | ✅ Live — GA4 `G-B36QB0J7TX` installed 2026-07-06 | analytics.google.com |
| **Carfax / AutoCheck** | Full vehicle history verification | ❌ Not connected | — |
| **Lemon Squad (or similar)** | Pre-purchase inspection affiliate | ❌ Built once, lost in a merge; agreement not finalized | — |
| **Mediavine / AdThrive** | Premium programmatic ads | ❌ Pending traffic threshold | — |

---

## Recommended Next Steps (Priority Order)

1. **Wire Stripe** — featured listing upgrades are the fastest first product to charge for; pricing page already shows plan tiers; `promo_expires_at` column already tracking who needs to pay post-promo *(on hold)*
2. **Decide on dealer self-serve signup** — current apply-and-wait model may be intentional (vetting quality), but if faster growth is the goal, self-serve + Stripe removes the bottleneck
3. **Restore inspection-affiliate button** — once Lemon Squad agreement is confirmed
4. **Add actual sale price to `/sold`** — optional "Sold for $X" field on Mark as Sold flow; deferred until enough sold listings accumulate to make it worthwhile

*("Submit event pages to Google" removed 2026-07-14 — done. All 3 currently-approved events (`caffeine-chrome-2026-07-25`, `1st-phorm-cars-caffeine-2026-07-19`, `sticky-s-friday-night-car-cruise-in-2026-07-17`) submitted via Search Console URL Inspection. Verified all three have correct indexing signals first (robots meta `index, follow`, HTTP 200 for Googlebot UA, present in sitemap.xml, valid JSON-LD) — no code issue on our end. The first submission was rejected with a generic "issues detected during live testing" error, which is a known GSC quirk on a URL Google has never crawled before; the other two succeeded on the first try, and the first one will just need a retry from `/admin` or Search Console directly whenever — not urgent, since it's already discoverable via the sitemap regardless.)*

*("Delete `app/sell/SellForm.tsx`" removed 2026-07-14 — done. Dead file deleted, confirmed unused via repo-wide grep first.)*

*("Decide whether to fully delete the orphaned `inquiries` table/route" removed 2026-07-14 — decided and done. Table, route, and its dead cascade-delete reference are all deleted.)*

*("Build `/account/inquiries`" removed 2026-07-14 — turned out to be unnecessary. Buyers already see everything they've sent via the Messages tab; see the "Buyer Inquiry History" row above.)*

*(Promo expiry notification email was already fully built and cron-registered — confirmed 2026-07-14, see `app/api/email/promo-expiry/route.ts` and `vercel.json`'s daily 14:00 UTC cron. It's just dormant until its send window opens ~Dec 17, 2026, 14 days before the Dec 31 cutoff. Previously listed here as a TODO in error.)*

---

*For full product vision see `PRODUCT_OVERVIEW.md`*
*For detailed API contracts, DB schema, user flows, and a feature-by-feature gap list, see `SPEC.md`*
