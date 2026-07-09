# GarageCherries — Implementation Status
*Last updated: 2026-07-09 — drag-and-drop image reorder fixed; edit listing form expanded to all vehicle fields; Detail 360 sponsor card + Lemon Squad inspection affiliate button restored to listing detail sidebar; unit test suite expanded to 312 tests across 21 files; buyer golden-path E2E test suite added (27 tests, 15 spec files total); admin Users tab: color-coded type icons + left border stripe per primary role; server-side role/status filtering + 25-per-page pagination; full UAT complete (181/196 E2E automated + 15 manual) — all sections signed off 2026-07-09; /contact simplified to single email; /feedback page added (category + message + optional email, pre-populated if logged in, rate-limited 5/hr, emails contact-us@garagecherries.com); footer + sitemap updated*

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
- [x] Full inventory grid on dealer profile

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
- [x] VIN field + inline "Verify VIN" button on the `/sell` form
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
- [x] **Note:** `/sell` renders `SellClient.tsx` — `SellForm.tsx` exists but is unused
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
- [x] Admin review at `/admin` — approve creates an auth user + `dealers` row (`plan: 'beta'`); `beta_expires_at = 2026-10-31` for 250th promo applications (submitted before Aug 1 2026), otherwise `now + 6 months`; emails a password-reset link with `redirectTo: /dealer/reset-password`; reject sends a note
- [x] **Applications tab — filter + pagination** — filter buttons (Pending/Approved/Rejected/All) with counts, defaults to Pending; 10-per-page pagination with Prev/Next; error alerts on approve/reject failure (added 2026-07-07)
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
- [x] About (`/about`), Contact (`/contact`), Privacy Policy (`/privacy`), Terms of Service (`/terms`); `/about` "The Platform" stats now live from DB — active listings + event counts (fixed 2026-07-07)
- [x] Cookie consent banner and Turnstile CAPTCHA on public forms
- [x] XML Sitemap (`/sitemap.xml`) — dynamic, covers homepage, listings (individual + make + make/model), dealers, encyclopedia (77 models), advertisers, guides (6 articles), `/events`, individual event detail pages (`/events/[slug]`), `/sold`, `/dealer/apply`, `/advertiser/signup`, `/privacy`, `/terms`; revalidates every hour
- [x] Robots.txt (`/robots.txt`) — allows all crawlers, blocks `/admin`, `/api/`, `/dealer/dashboard`
- [x] **Advertiser public directory** (`/advertisers`) — grouped by category (detail, insurance, finance, transport, storage, restoration, inspection); active + valid trial only
- [x] **Advertiser public profile pages** (`/advertisers/[slug]`) — business info, description, phone/website CTAs, active ads as "Current Offers"; `slug`, `description`, `website` columns added via migration
- [x] **Sold archive** (`/sold`) — gallery of recently sold vehicles (up to 120, ordered by `sold_at` desc); shows asking price labeled "Listed at $X" (not sale price); sold date ribbon + light grayscale tint on photos; CTA to browse active listings; in sitemap at priority 0.7/daily. *Future enhancement: add optional actual sale price field to Mark as Sold flow (Option 2 — deferred)*

### Buyer Accounts
- [x] Signup, Login, forgot/reset password flow
- [x] Profile management (`/account/profile`)
- [x] Watchlist — save listings, view at `/account?tab=watchlist` and standalone `/account/watchlist`
- [x] Car Alerts — saved searches with automatic email notification on new matches, up to 10 per user, edit/pause/delete
- [x] My Listings tab — private sellers manage their own listings; persistent "+ Post a Listing" button in the tab header (previously only shown in the empty state, disappearing once a user had any listings) (added 2026-07-07)
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
- [x] Users tab — search/filter, view seller listings, suspend/unsuspend, edit, promote seller to dealer, delete account; **color-coded left border stripe + type icon per primary role** (dealer=blue/🏢, advertiser=purple/📢, seller=green/🧑, buyer=gray/👤; suspended=red override); **server-side role/status filtering** + **25-per-page pagination** with Prev/Next controls and total count (added 2026-07-09)
- [x] Team tab — add/remove admin team members by email + role
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

- [x] **Unit test suite (Vitest)** — `tests/unit/` directory; **21 test files, 312 tests**, all passing (expanded 2026-07-09):
  - Pure lib functions fully covered: `lib/emailBranding.ts`, `lib/encyclopedia.ts`, `lib/admin.ts` (hasRole + mocked Supabase for getAdminRole/requireAdmin), `lib/verifyTurnstile.ts` (fetch mock), `lib/notifyAdmin.ts` (Resend mock), `lib/logger.ts` (Axiom + Sentry mocks)
  - Business logic: `lib/rateLimit.ts`, `lib/data.ts`, `lib/matchAlerts.ts` (via scoreMatch), listing limits, slug generation, auth guards, validation
  - API route behavior: `GET /api/listings/my` (7 tests — auth, field selection, ordering, empty/error states), `PATCH /api/listings/[id]` (10 tests — auth, ownership, all vehicle fields, interior_color/seat_material, title regeneration, status transitions, resubmission_note gate, empty string nullification)
  - Vitest config: `tests/unit/**/*.test.ts`, coverage provider `v8`, includes `lib/**` and `app/api/**`
- [x] **E2E test suite (Playwright)** — `tests/e2e/` directory; **15 spec files**, all tests pass against local dev server (reuses existing server via `reuseExistingServer: true`):
  - `auth-pages.spec.ts` — buyer login/signup, dealer login, forgot-password, `/sell` auth gate
  - `ui-flows.spec.ts` — homepage, listings browse, legal pages, sell page gate, dealer apply, 404
  - `sell.spec.ts` — auth-gated sell page: loads without error, logged-out gate visible, sign-in CTA present
  - `admin.spec.ts` — admin panel tabs (listings, events, reported, users, team, applications); non-admin denied (requires `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars)
  - `events.spec.ts` — `/events` loads, logged-out sees sign-in CTA, page shows events or empty state, `POST /api/events/submit` returns 401 unauthenticated
  - `api-auth.spec.ts` — all protected API endpoints return 401 unauthenticated; public endpoints accept unauthenticated requests
  - `buyer-golden-path.spec.ts` — **27 tests** covering full unauthenticated buyer journey: browse/filter (keyword, body style, year/price range, empty state), listing detail core content (title, price, condition, gallery, spec sheet, breadcrumbs), listing detail sidebar (watchlist button, message seller, inspection affiliate card with Lemon Squad URL/UTM, Detail 360 sponsor card, financing calculator), contact form presence, watchlist auth guard (UI + API), car alerts API auth guard, make/model encyclopedia pages, sold archive (added 2026-07-09)
  - `browse.spec.ts`, `listings.spec.ts`, `listing-detail.spec.ts`, `auth.spec.ts`, `dealer.spec.ts`, `homepage.spec.ts`, `unsubscribe.spec.ts`, `criticalGaps.spec.ts`, `highGaps.spec.ts` — additional coverage across all major surfaces
- [x] **GitHub Actions CI** — `.github/workflows/ci.yml`; runs `tsc --noEmit` + `npm test` (Vitest unit tests) on every push to `main` and on PRs; Node 24; branch protection requires `check` job to pass (added 2026-07-09)

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
- [x] **SEO — OG image** — dynamic `app/opengraph-image.tsx` using Next.js ImageResponse (1200×630); replaces missing static file
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
| **Advertising — ad display** | Full backend + `AdSlot` wired into listing detail page sidebar; Detail 360 `SponsorCard` restored below AdSlot; Lemon Squad inspection affiliate card restored above AdSlot (2026-07-09) | — |
| ~~**Dealer Watcher Messaging**~~ | ✅ Complete (2026-07-07) — watcher counts load per listing; "Message X watchers" button appears on eligible approved listings; compose modal with send confirmation; "Messaged" label shown after send to prevent duplicates | — |
| **Dealer Subscriptions** | Pricing page shows Starter/Pro/Unlimited plans | No Stripe — nothing actually charges |
| **Featured Listing Toggle** | Toggle in dashboard, `featured` DB field, badge + homepage placement | No payment gate — free for all dealers currently |
| **Import/Sync Inventory** | "Import JSON" and "Sync Now" buttons visible in dealer dashboard; sample file at `docs/dealer-import-sample.json` | Both are visually disabled (greyed out, `disabled` attr, "Coming soon" tooltip) — no API route or click handler yet |
| ~~**Email preferences UI**~~ | ✅ Complete (2026-07-07) — Email Preferences card in `/account` Settings tab; three toggles; persisted to `user_metadata` | — |

---

## ❌ Not Implemented

### Near-Term Priority

| Feature | Description | Blocker |
|---|---|---|
| **Stripe Integration** | Dealer subscriptions, private seller checkout, featured listing upgrades | Requires Stripe account + webhooks |
| **Dealer Self-Serve Onboarding** | Signup → choose plan → pay → dashboard | Requires Stripe; product decision on vetting model |
| **Seller/buyer ratings** | P2P rating system for private sellers and buyers (dealer reviews already exist) | Not started |
| **Compare Listings** | Side-by-side comparison of 2–4 cars | Complex persistent UI state |
| **Buyer Inquiry History** | `/account/inquiries` — past contact forms sent | Not built |
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

1. **Promo expiry notification email** — automated email to all users (dealers, individuals, advertisers) warning that free period ends October 31, 2026; send ~2 weeks before cutoff
2. **Wire Stripe** — featured listing upgrades are the fastest first product to charge for; pricing page already shows plan tiers; `promo_expires_at` column already tracking who needs to pay post-promo *(on hold)*
3. **Build `/account/inquiries`** — completes the buyer account experience; last remaining "small win" item
4. **Delete `app/sell/SellForm.tsx`** — dead file, never imported; `/sell` renders `SellClient.tsx` exclusively
5. **Decide on dealer self-serve signup** — current apply-and-wait model may be intentional (vetting quality), but if faster growth is the goal, self-serve + Stripe removes the bottleneck
6. **Restore inspection-affiliate button** — once Lemon Squad agreement is confirmed
7. **Submit event pages to Google** — use URL Inspection in Search Console to request indexing for individual `/events/[slug]` pages; rich Event results will appear once Google crawls the JSON-LD
8. **Add actual sale price to `/sold`** — optional "Sold for $X" field on Mark as Sold flow; deferred until enough sold listings accumulate to make it worthwhile

---

*For full product vision see `PRODUCT_OVERVIEW.md`*
*For detailed API contracts, DB schema, user flows, and a feature-by-feature gap list, see `SPEC.md`*
