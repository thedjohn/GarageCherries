# GarageCherries — Implementation Status
*Last updated: 2026-07-06 — current as of commit cfab57f (dealer logo upload, dealer password reset page, dealer-logos storage bucket)*

**Note on data:** this site is pre-launch. As of 2026-07-03 the production database has 2 manually-added test listings and otherwise no real users, dealers, or advertisers. Empty tables (`dealers`, `advertisers`, `ads`, etc.) reflect that, not a broken signup funnel or feature regression — don't read zero rows as a product problem without checking this note first.

---

## ✅ Fully Implemented

### Browse & Search
- [x] Full listings page (`/listings`) with filter sidebar — make, year, price, condition, body style, transmission, state
- [x] **Keyword search** — `q` param on `/listings`; `SearchFilters` adds a text input at the top; server applies `ilike` on `title` and `description` columns (added 2026-07-03)
- [x] Make pages (`/cars/[make]`) — all cars by make with model sub-navigation
- [x] Model pages (`/cars/[make]/[model]`) — filtered by make + model
- [x] Featured listings — badge on card, prioritized on homepage
- [x] Recently listed section on homepage
- [x] Listing card component with price, condition, mileage, location, photos
- [x] Database-driven makes — make filter dropdown and make/model URL pages work for any make present in the database; `/api/makes` endpoint serves distinct makes to client components

### Listing Detail Pages
- [x] Full photo gallery with thumbnail navigation
- [x] Complete spec sheet — engine, drivetrain, interior, options, hobby segment, lot number
- [x] Dealer info panel with map embed and click-to-call
- [x] Message Seller contact form — emails seller/dealer, buyer address never exposed
- [x] Watch / Save listing button
- [x] Make an Offer button (`MakeOfferButton`) — dealer listings only; requires login, submits to `POST /api/offers` which saves the offer and emails both dealer and buyer
- [x] Financing calculator (`FinancingCalculator`) — collapsible, pure client-side amortization math; links to J.J. Best Banc and Woodside Credit
- [x] SEO — per-page title, description, Open Graph tags, JSON-LD Vehicle + BreadcrumbList schema, canonical URL
- [x] View tracking — deduplicated by hashed IP per day, records dealer_id when a dealer listing

### Dealer Public Pages
- [x] Dealer directory (`/dealers`) — all dealers with listing counts
- [x] Dealer profile page (`/dealers/[slug]`) — logo, description, specialties, location, hours, map, JSON-LD AutoDealer schema
- [x] Buyer reviews — star rating + review form (login required to submit, one review per user per dealer enforced via DB constraint), public read
- [x] Dealer tier badge — Bronze ≥5 listings, Silver ≥15, Gold ≥30
- [x] Full inventory grid on dealer profile

### Dealer Dashboard (`/dealer/dashboard`)
- [x] Overview tab — active listings, views (30d), inquiries (30d), avg. days on market, month-over-month comparison
- [x] Inventory tab — add, edit, delete, mark as sold; dealer-added listings bypass review (inserted `status: 'approved'` immediately)
- [x] Inquiries tab — buyer messages (real data from `GET /api/dealer/metrics`)
- [x] Settings tab — full profile management (name, phone, address, description, specialties)
- [x] **Logo upload in Settings tab** — dealers upload/replace logo (JPG/PNG/WebP ≤2 MB); stored in Supabase Storage `dealer-logos` bucket (public); URL saved to `dealers.logo`; cache-busted preview updates immediately (added 2026-07-06)
- [x] Price history recorded automatically on every price edit, fires watcher notification
- [x] Mark as Sold with confirmation modal
- [x] Free-text make input with `<datalist>` autocomplete
- [x] Featured-listing toggle per vehicle
- [x] Export inventory — "Export CSV" / "Export JSON" buttons wired to `GET /api/dealer/export?format=csv|json`
- [x] Beta plan expiry banner (warning at ≤30 days remaining)
- [x] **Beta expiry enforcement** — expired dealers redirected to `/dealer/expired` on dashboard load; listing submit and listing edit also block expired dealers (added 2026-07-03)

### Listing Expiry & Renewal
- [x] Listings auto-expire 30 days after approval (`expires_at`)
- [x] Expired listings excluded from all public browse/search surfaces
- [x] One-click "Renew listing" — private-seller account page and dealer dashboard, both show a days-remaining countdown (amber warning at ≤7 days)
- [x] **Renewal reminder email** — `POST /api/email/expiring-listings` emails sellers 3 days before expiry; idempotent via `renewal_reminder_sent_at`; triggerable from `/admin/email` (added 2026-07-03)

### VIN Verification
- [x] VIN field + inline "Verify VIN" button on the `/sell` form
- [x] NHTSA VIN decoder API integration (24h cache), fuzzy make/model/year matching
- [x] Color-coded result badge: verified / partial match / pre-1981 / invalid
- [x] `vin`, `vin_verified`, `vin_make`, `vin_model`, `vin_year` stored on the listing at submit time
- [x] Rate limited 20/hr/IP

### Private Seller Flow
- [x] `/sell` gated behind auth — `SellGate` shows "Create a Free Account" / "Sign In" for logged-out visitors
- [x] Full listing submission — vehicle info, VIN + verify, location, contact, up to 30 photos (lazy upload: images stay as File objects until submit, then uploaded inside `onSubmit`)
- [x] CAPTCHA (Turnstile), rate limiting (5/hr/IP), 10-active-listing cap for non-dealers
- [x] Admin review queue — pending listings approved/rejected at `/admin`; seller emailed either way
- [x] Seller can edit/delete/resubmit their own listings at `/account?tab=listings`
- [x] **Condition validation** on submit — rejects invalid `condition` values server-side (added 2026-07-03)
- [x] **Email format validation** on `/api/inquire` and `/api/offers` (added 2026-07-03)

### Dealer Application & Onboarding
- [x] Public application form (`/dealer/apply`) — name, contact, dealer name, address, specialties, description, CAPTCHA
- [x] Rate limited 3/hr/IP; duplicate application/dealer detection
- [x] Admin review at `/admin` — approve creates an auth user + `dealers` row (`plan: 'beta'`); `beta_expires_at = 2026-10-31` for 250th promo applications (submitted before Aug 1 2026), otherwise `now + 6 months`; emails a password-reset link; reject sends a note
- [x] **Dealer password reset page** (`/dealer/reset-password`) — validates Supabase session from reset email link; shows new-password + confirm fields; updates auth on submit; redirects to `/dealer/login`; handles expired/invalid links gracefully (added 2026-07-06)

### Advertising System
- [x] Public marketing page (`/advertise`) and advertiser signup (`/advertiser/signup`) — 14-day trial, tier selection
- [x] Advertiser login (`/advertiser/login`) and dashboard (`/advertiser/dashboard`)
- [x] Ad create/edit — headline, body copy, CTA label/URL, phone, logo, photo, rating
- [x] `GET /api/ads/serve` — geographic targeting via haversine distance between state centroids
- [x] Impression/click tracking via atomic RPCs, click endpoint rate-limited 60/hr/IP
- [x] Trial-expiry enforcement on ad creation and ad editing
- [x] `AdSlot` wired into the listing detail page sidebar

### Content & Marketing Pages
- [x] Classic Car Encyclopedia (`/cars`) — 54 models across 12 makes
- [x] Buyer's Guides index (`/guides`) — 6 articles
- [x] Market Report (`/reports`) — live avg price by make, most-viewed listings, market commentary
- [x] Pricing page (`/pricing`) — dealer plan tiers, private-seller pricing, advertiser section (banner ads, sponsored listings, newsletter), 250th promo banner, Stripe coming-soon note
- [x] About (`/about`), Contact (`/contact`), Privacy Policy (`/privacy`), Terms of Service (`/terms`)
- [x] Cookie consent banner and Turnstile CAPTCHA on public forms
- [x] XML Sitemap (`/sitemap.xml`) — dynamic, covers homepage, listings, dealers, encyclopedia (54 models), advertisers, and all static pages; revalidates every hour; 81 pages discovered by Google
- [x] Robots.txt (`/robots.txt`) — allows all crawlers, blocks `/admin`, `/api/`, `/dealer/dashboard`
- [x] **Advertiser public directory** (`/advertisers`) — grouped by category (detail, insurance, finance, transport, storage, restoration, inspection); active + valid trial only
- [x] **Advertiser public profile pages** (`/advertisers/[slug]`) — business info, description, phone/website CTAs, active ads as "Current Offers"; `slug`, `description`, `website` columns added via migration

### Buyer Accounts
- [x] Signup, Login, forgot/reset password flow
- [x] Profile management (`/account/profile`)
- [x] Watchlist — save listings, view at `/account?tab=watchlist` and standalone `/account/watchlist`
- [x] Car Alerts — saved searches with automatic email notification on new matches, up to 10 per user, edit/pause/delete
- [x] My Listings tab — private sellers manage their own listings
- [x] Live buyer-seller messaging — in-page Messenger-style chat widget, Supabase Realtime push, unread badges, report-message flow

### Email (via Resend)
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
- [x] Full admin panel (`/admin`) — Listings, Messages, Reported, Users, Applications, Team tabs
- [x] Role hierarchy: `support < moderator < admin < superadmin`; all 4 roles assignable via UI (fixed 2026-07-03)
- [x] Users tab — search/filter, view seller listings, suspend/unsuspend, edit, promote seller to dealer, delete account
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

### Technical Infrastructure
- [x] Next.js 16 App Router with TypeScript, React 19
- [x] Supabase PostgreSQL with Row Level Security
- [x] Supabase Auth (buyer + private seller + dealer + advertiser + admin sessions)
- [x] Supabase Storage (listing photo uploads via signed URL + lazy client-side upload); `dealer-logos` public bucket with RLS policies for authenticated dealer uploads (added 2026-07-06)
- [x] Server components + client components correctly separated
- [x] `createClient()` (async, RLS-enforced) and `createAdminClient()` (sync, service role) pattern
- [x] Cloudflare Turnstile CAPTCHA on public-facing submission forms
- [x] Deployed to Vercel (project `garage-cherries`, GarageCherries team account, Hobby plan); custom domain `garagecherries.com` and `www.garagecherries.com` live with SSL
- [x] **Google Analytics 4** — Measurement ID `G-B36QB0J7TX`; added to `app/layout.tsx` via Next.js `Script` (afterInteractive)
- [x] **SEO — JSON-LD structured data** — Organization (homepage, about, contact), AutoDealer + BreadcrumbList (dealer pages), Vehicle + BreadcrumbList (listing detail), Article + BreadcrumbList (encyclopedia model pages), LocalBusiness + BreadcrumbList (advertiser detail pages)
- [x] **SEO — OG image** — dynamic `app/opengraph-image.tsx` using Next.js ImageResponse (1200×630); replaces missing static file
- [x] **SEO — sell page metadata** — `app/sell/layout.tsx` adds title, description, canonical (page is `use client` so layout wrapper required)
- [x] **SEO — filter clamping** — year inputs `min=1900 max=2030`, price inputs `min=0` (client); `lib/db.ts` clamps year to [1900–2030] and rejects negative price server-side
- [x] **Google Search Console** — property `https://www.garagecherries.com` verified (DNS method, auto-detected); sitemap submitted; 81 pages discovered
- [x] **Bing Webmaster Tools** — imported from GSC; sitemap submitted; processing
- [x] `SPEC.md` — detailed master specification; treat as the primary technical reference

---

## ⚠️ Partially Implemented

| Feature | What Exists | What Is Missing |
|---|---|---|
| **AI Features** | Nothing — all 5 AI routes deliberately removed 2026-07-01 | Everything; deferred to future release |
| **Advertising — ad display** | Full backend + `AdSlot` wired into listing detail page | "Detail 360" sponsor card and inspection-affiliate button were built, then lost in a merge |
| **Dealer Watcher Messaging** | `GET /api/dealer/watcher-counts` and `POST /api/dealer/message-watchers` API routes work | No UI in dealer dashboard calls them |
| **Dealer Subscriptions** | Pricing page shows Starter/Pro/Unlimited plans | No Stripe — nothing actually charges |
| **Featured Listing Toggle** | Toggle in dashboard, `featured` DB field, badge + homepage placement | No payment gate — free for all dealers currently |
| **Import/Sync Inventory** | "Import JSON" and "Sync Now" buttons visible in dealer dashboard; sample file at `docs/dealer-import-sample.json` | Both are stubs — no API route or click handler |
| **Email preferences UI** | All unsubscribe pages built and linked from emails | No email preferences tab in `/account` settings — users must click unsubscribe in an email |

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
| **Email Newsletter Signup** | Buyer opt-in form for digest | No signup form on site |
| **Sales Pipeline / CRM** | Track dealers & advertisers through free → paying conversion. Options: (A) Sales tab in `/admin` showing active/expiring/expired/converted with one-click email; (B) Export contacts CSV from admin → load into HubSpot free tier for email sequences and deal tracking; (C) automated drip emails at 30 days / 14 days / day-of expiry. Recommended order: B first (quick export), then C (drip emails), then A. | Stripe must be live first for "converted" status to mean anything |

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
| **Car Show / Events Calendar** | `/events` page exists but lists zero events — needs real event data |

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
| Newsletter sponsorships | ⚠️ Email built, no sponsor workflow | $400–$6,000 |
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
| **Stripe** | Payments | ❌ Not connected | stripe.com |
| **Google Search Console** | SEO indexing | ❌ Not submitted | search.google.com/search-console |
| **Google Analytics** | Traffic analytics | ✅ Live — GA4 `G-B36QB0J7TX` installed 2026-07-06 | analytics.google.com |
| **Carfax / AutoCheck** | Full vehicle history verification | ❌ Not connected | — |
| **Lemon Squad (or similar)** | Pre-purchase inspection affiliate | ❌ Built once, lost in a merge; agreement not finalized | — |
| **Mediavine / AdThrive** | Premium programmatic ads | ❌ Pending traffic threshold | — |

---

## Recommended Next Steps (Priority Order)

1. **Promo expiry notification email** — automated email to all users (dealers, individuals, advertisers) warning that free period ends October 31, 2026; send ~2 weeks before cutoff
2. **Wire Stripe** — featured listing upgrades are the fastest first product to charge for; pricing page already shows plan tiers; `promo_expires_at` column already tracking who needs to pay post-promo
4. **Add email preferences tab to `/account`** — lets users manage all opt-outs without waiting for an email
5. **Decide on dealer self-serve signup** — current apply-and-wait model may be intentional (vetting quality), but if faster growth is the goal, self-serve + Stripe removes the bottleneck
6. **Build `/account/inquiries`** — completes the buyer account experience
7. **Build public `/sold` archive page** — SEO value + buyer trust signal
8. **Restore inspection-affiliate button** — once Lemon Squad agreement is confirmed
9. **Add real events to `/events`** — the calendar currently shows zero events

---

*For full product vision see `PRODUCT_OVERVIEW.md`*
*For detailed API contracts, DB schema, user flows, and a feature-by-feature gap list, see `SPEC.md`*
