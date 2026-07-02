# GarageCherries — Implementation Status
*Last updated: 2026-07-02 — current as of commit a89dc2d*

**Note on data:** this site is pre-launch. As of 2026-07-02 the production database has 2 manually-added test listings and otherwise no real users, dealers, or advertisers. Empty tables (`dealers`, `advertisers`, `ads`, etc.) reflect that, not a broken signup funnel or feature regression — don't read zero rows as a product problem without checking this note first.

---

## ✅ Fully Implemented

### Browse & Search
- [x] Full listings page (`/listings`) with filter sidebar — make, year, price, condition, body style, transmission, state
- [x] Make pages (`/listings/[make]`) — all cars by make with model sub-navigation
- [x] Model pages (`/listings/[make]/[model]`) — filtered by make + model
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
- [x] Make an Offer button (`MakeOfferButton`) — re-wired 2026-07-02, dealer listings only (private-seller listings have no dealer email to notify, so the button is gated behind `dealer` truthy, same pattern as Call Dealer); requires login, submits to `POST /api/offers` which saves the offer and emails both dealer and buyer
- [x] Financing calculator (`FinancingCalculator`) — re-wired 2026-07-02 below the Specs card; collapsible, pure client-side amortization math (down payment / APR / term sliders), no backend dependency. Verified interactively — sliders recalculate monthly payment live. Links out to J.J. Best Banc and Woodside Credit with no affiliate tracking — untapped referral-revenue opportunity, see Financing Integration in the Long-Term wishlist below.
- [x] SEO — per-page title, description, Open Graph tags, JSON-LD Vehicle + BreadcrumbList schema, canonical URL
- [x] View tracking — deduplicated by hashed IP per day, records dealer_id when a dealer listing

### Dealer Public Pages
- [x] Dealer directory (`/dealers`) — all dealers with listing counts
- [x] Dealer profile page (`/dealers/[slug]`) — logo, description, specialties, location, hours, map, JSON-LD AutoDealer schema
- [x] Buyer reviews (`DealerReviews`) — re-wired 2026-07-02 below the inventory grid; star rating + review form (login required to submit, one review per user per dealer enforced via DB constraint), public read. Type-checked and code-reviewed but not visually verified end-to-end — the `dealers` table is currently empty (pre-launch, no real dealers yet), so every `/dealers/[slug]` slug 404s and there's no live dealer profile to render against yet.
- [x] Dealer tier badge (`DealerBadge`) — re-wired 2026-07-02 next to the dealer name (Bronze ≥5 listings, Silver ≥15, Gold ≥30, using the dealer's live listing count already computed on the page). Pure presentational component, no backend dependency — verified visually for all three tiers. No real dealer currently has 5+ listings (pre-launch), so it won't show for anyone yet, but it's correctly wired and will activate automatically as dealers add inventory.
- [x] Full inventory grid on dealer profile

### Dealer Dashboard (`/dealer/dashboard`)
- [x] Overview tab — active listings, views (30d), inquiries (30d), avg. days on market, month-over-month comparison
- [x] Inventory tab — add, edit, delete, mark as sold; dealer-added listings bypass review (inserted `status: 'approved'` immediately)
- [x] Inquiries tab — buyer messages (real data from `GET /api/dealer/metrics`)
- [x] Settings tab — full profile management (name, phone, address, logo, description, specialties)
- [x] Price history recorded automatically on every price edit, fires watcher notification
- [x] Mark as Sold with confirmation modal
- [x] Free-text make input with `<datalist>` autocomplete — dealers can enter any make, not limited to a hardcoded list
- [x] Featured-listing toggle per vehicle
- [x] Export inventory — "Export CSV" / "Export JSON" buttons wired to `GET /api/dealer/export?format=csv|json`
- [x] Beta plan expiry banner (warning at ≤30 days remaining)

### Listing Expiry & Renewal (new, 2026-07-02)
- [x] Listings auto-expire 30 days after approval (`expires_at` set alongside `listed_at`, both on admin approval of private-seller/manual submissions and on dealer-dashboard direct-approve inserts)
- [x] Expired listings excluded from all public browse/search surfaces (homepage, `/listings`, make/model pages, similar-cars, dealer directory counts, dealer profile inventory) — still viewable at their direct URL, just not discoverable via browse
- [x] One-click "Renew listing" button — private-seller account page and dealer dashboard, both show a days-remaining countdown (amber warning at ≤7 days) and extend `expires_at` another 30 days via `POST /api/listings/[id]/renew`
- [x] Rationale: there's no way to verify a private-seller car actually sold (self-reported only, see `is_sold`/`sold_at` — nothing stops a seller from leaving a sold listing up forever with zero cost to them). Auto-expire + renew flips the default from "stays live forever unless someone remembers to remove it" to "goes stale unless actively renewed," so content stays current without needing to detect a sale at all.
- [x] `is_feed_managed` column added for forward-compatibility with the not-yet-built dealer data-feed/bulk-import sync (see "Import JSON"/"Sync Now" stubs below) — feed-managed listings are meant to have freshness driven by the sync itself, not manual renewal; nothing sets this true yet since that feature doesn't exist
- ⚠️ **Not built**: no reminder email before expiry — sellers only see the countdown if they visit their account/dashboard. Also, `listed_at` turned out to be stored as `text` rather than `timestamptz` (SPEC.md's prior schema docs were wrong on this) — the backfill migration needed an explicit cast; worth keeping in mind for any future date math on that column.

### VIN Verification (new)
- [x] VIN field + inline "Verify VIN" button on the `/sell` form — calls `POST /api/cars/verify-vin`
- [x] NHTSA VIN decoder API integration (24h cache), fuzzy make/model/year matching against entered values
- [x] Color-coded result badge: verified / partial match / pre-1981 (unstandardized VIN) / invalid
- [x] `vin`, `vin_verified`, `vin_make`, `vin_model`, `vin_year` stored on the listing at submit time
- [x] Rate limited 20/hr/IP

### Private Seller Flow
- [x] `/sell` gated behind auth — `SellGate` interstitial shows "Create a Free Account" / "Sign In" (with `?return=/sell`) for logged-out visitors; only authenticated users see the actual form
- [x] Full listing submission for private sellers — vehicle info, VIN + verify, location, contact, up to 30 photos (client-side direct upload to Supabase Storage via signed URL)
- [x] Submission goes through CAPTCHA (Turnstile), rate limiting (5/hr/IP), and a 10-active-listing cap for non-dealers (bypassable via `BETA_MODE` env var)
- [x] Admin review queue — pending listings approved/rejected at `/admin`; seller emailed either way
- [x] Seller can edit/delete/resubmit their own listings at `/account?tab=listings` (editing an approved listing sends it back to pending; resubmitting a rejected one requires a note)
- [x] **Note**: this corrects the previous version of this document, which claimed "no listing creation for non-dealers" — that has not been true for some time. What is still missing is **payment/checkout** — private seller listings are free and unlimited-in-price, just capped at 10 active at a time.

### Dealer Application & Onboarding
- [x] Public application form (`/dealer/apply`) — name, contact, dealer name, address, specialties, description, CAPTCHA
- [x] Rate limited 3/hr/IP; duplicate application/dealer detection
- [x] Admin review at `/admin` (Applications tab, admin+ role) — approve creates an auth user + `dealers` row (`plan: 'beta'`, 6-month beta expiry) and emails a password-reset link; reject sends a note
- [x] Still **not** self-serve — there is no plan-selection/payment signup flow for dealers. "Signup" for a dealer means submitting an application and waiting on manual admin approval, same as before.

### Advertising System — Backend, Dashboard & Display
- [x] Public marketing page (`/advertise`) and advertiser signup (`/advertiser/signup`) — 14-day trial, tier selection (starter/metro/regional/statewide) with tier-derived targeting radius
- [x] Advertiser login (`/advertiser/login`) and dashboard (`/advertiser/dashboard`) — shows aggregate impressions/clicks, lists ads
- [x] Ad create/edit (`/advertiser/ads/edit`) — headline, body copy, CTA label/URL (scheme-validated, `http(s)://` only), phone, logo, photo, rating
- [x] `GET /api/ads/serve` — geographic targeting via haversine distance between state centroids against the advertiser's `radius_miles`; picks the eligible ad with fewest impressions
- [x] Impression/click tracking via atomic RPCs (`inc_ad_impressions`, `inc_ad_clicks`), click endpoint rate-limited 60/hr/IP
- [x] Trial-expiry enforcement on both ad creation and ad editing
- [x] Footer links: "Advertise With Us" and "Advertiser Login"
- [x] `AdSlot` re-wired into the listing detail page (`app/listings/[...segments]/page.tsx`) sidebar, passing `car.state` and the canonical listing path — display path fixed 2026-07-02 (had been dropped since the 2026-06-28 merge-conflict regression, commit `b65e5a8`)
- ℹ️ Checked prod data on 2026-07-02 — `advertisers`, `ads`, and `ad_events` tables are all empty (0 rows each). Expected: **this site is pre-launch** — the database has no real users/dealers/advertisers yet, only 2 manually-added test listings. So the display regression wasn't actually costing any real customer anything (there were none yet); this just means the feature hasn't been exercised with live data.

### Content & Marketing Pages
- [x] Classic Car Encyclopedia (`/cars`) — **54 models across 12 makes** (AMC, Buick, Chevrolet, Chrysler, Dodge, Ford, Lincoln, Mercury, Oldsmobile, Plymouth, Pontiac, Studebaker) — expanded from 20/7
- [x] Encyclopedia make pages (`/cars/[make]`) and model pages (`/cars/[make]/[model]`) — history, specs, notable versions, buying tips, price guide, live listings
- [x] Buyer's Guides index (`/guides`) — 6 articles
- [x] Individual guide articles (`/guides/[slug]`) — full content for all 6 guides
- [x] Market Report (`/reports`) — live avg price by make, most-viewed listings, market commentary, pulled directly from the `listings` table
- [x] Pricing page (`/pricing`) — dealer plan tiers and private-seller messaging (still marketing copy only, no payment — see Partial section)
- [x] About (`/about`) and Contact (`/contact`) pages — new since last update
- [x] Privacy Policy (`/privacy`) and Terms of Service (`/terms`) — new since last update, both embed Enzuzo-hosted legal documents via client-side script injection
- [x] Cookie consent banner and Turnstile CAPTCHA on public forms
- [x] XML Sitemap (`/sitemap.xml`) and Robots.txt (`/robots.txt`)

### Buyer Accounts
- [x] Signup (`/account/signup`), Login (`/account/login`), forgot/reset password flow
- [x] Profile management (`/account/profile`)
- [x] Watchlist — save listings, view at `/account?tab=watchlist` (also standalone `/account/watchlist` route)
- [x] Car Alerts — saved searches with automatic email notification on new matches (`/account?tab=alerts`), up to 10 per user, edit/pause/delete, inline alert-match viewer
- [x] My Listings tab (`/account?tab=listings`) — private sellers manage their own listings, see rejection reasons, resubmit
- [x] Live buyer-seller messaging — in-page Messenger-style chat widget plus full `/messages` inbox, Supabase Realtime push notifications, unread badges, report-message flow

### Email (via Resend)
- [x] Buyer inquiry delivered to seller/dealer instantly
- [x] Listing approved / listing rejected notifications to seller
- [x] Dealer application approved / rejected notifications
- [x] Car alert match notification to buyer
- [x] Price drop notification to watchlist users (immediate, on price edit) and weekly digest batch (manual/cron trigger)
- [x] Sold-listing notification to watchlist users
- [x] Weekly fresh listings digest (manual trigger)
- [x] Monthly dealer performance report (manual trigger)
- [x] Admin rate-limit alert emails

### Admin Tools
- [x] Full admin panel (`/admin`) — Listings, Messages, Reported, Users, Applications, Team tabs, each gated by role (support / moderator / admin / superadmin) per a documented capability matrix
- [x] Role-based tab visibility — support users see only the Reported tab; API layer independently enforces minimum roles
- [x] Users tab — search/filter, view seller listings, suspend/unsuspend, edit name/email, promote seller to dealer (superadmin), delete account + all data (superadmin)
- [x] Team tab (superadmin) — add/remove admin team members by email + role
- [x] Orphaned storage image cleanup (superadmin-triggered, 24h grace period)
- [x] Email campaign trigger page (`/admin/email`) — manually fires digest, price-drop, and dealer-report jobs against a secret-protected API
- [x] All admin/email routes protected by role checks or `ADMIN_API_SECRET`/`INTERNAL_API_SECRET` bearer headers

### Security Hardening (new since last update)
- [x] Rate limiting extended across nearly all public-write routes (listings submit, dealer apply, conversations, messages, watchlist, offers, reviews, VIN verify, ad tracking)
- [x] Suspended-user checks on listing submit/edit and all messaging routes
- [x] `POST /api/alerts/match` and `POST /api/notify-watchers` now require internal auth / ownership (previously unauthenticated)
- [x] DB-level race-condition fixes: `dealer_reviews` unique constraint, advisory-lock-guarded triggers/RPCs for the max-10-alerts and max-10-listings caps
- [x] State-code validation against a real `US_STATES` list on listing submit and dealer apply
- [x] Ad `cta_url` scheme validation (`http(s)://` only, blocks `javascript:`)

### Technical Infrastructure
- [x] Next.js 16.2.9 App Router with TypeScript, React 19
- [x] Supabase PostgreSQL with Row Level Security
- [x] Supabase Auth (buyer + private seller + dealer + advertiser + admin sessions)
- [x] Supabase Storage (car photo uploads via signed URL + direct client PUT)
- [x] Server components + client components correctly separated
- [x] `createClient()` (async, RLS-enforced) and `createAdminClient()` (sync, service role) pattern
- [x] Centralized data fetching in `lib/db.ts`
- [x] Cloudflare Turnstile CAPTCHA on public-facing submission forms
- [x] Deployed to Vercel with GitHub auto-deploy on push to `main`
- [x] `SPEC.md` — a detailed, current master specification (roles, flows, DB schema, API contracts, business rules, security checklist) generated 2026-07-02; treat as the primary technical reference alongside this document

---

## ⚠️ Partially Implemented

| Feature | What Exists | What Is Missing |
|---|---|---|
| **AI Features** | Nothing — all 5 AI routes (Smart Search, Listing Writer, Price Assessment, Similar Cars, Inquiry Reply Assistant) and their UI components were **deliberately removed** on 2026-07-01 ("deferred to future release") | Everything; `app/api/ai/*` directories are now empty stubs. Marketing copy on `/pricing` removed 2026-07-02 ("AI listing description writer" / "AI buyer inquiry assistant" bullets pulled from all 3 dealer plans since they're not currently offered) — re-add to plan feature lists once AI features actually ship. |
| **Advertising — ad display on-site** | Full backend: signup, tiers, trial, ad CRUD, geographic targeting, impression/click RPCs, advertiser dashboard stats. `AdSlot` re-wired into the listing detail page 2026-07-02. | A "Detail 360" sponsor card and a "Phase 1 inspection affiliate" button were each built and briefly present on listing pages in late June, then both were removed (the affiliate button was lost in a merge-conflict resolution rather than a deliberate product decision) — neither exists in the current codebase. Note: `advertisers`/`ads`/`ad_events` are all empty in prod as of 2026-07-02, but that's expected — this site is pre-launch with no real advertisers signed up yet, not a sign of a broken funnel. |
| **Dealer Watcher Messaging** | `GET /api/dealer/watcher-counts` and `POST /api/dealer/message-watchers` API routes work | No UI in the dealer dashboard calls them — dealers currently have no way to see watcher counts per listing or message watchers directly (price-drop notifications still fire automatically on price edit, independent of this feature) |
| **Dealer Subscriptions** | Pricing page shows Starter/Pro/Unlimited plans | No Stripe — nothing actually charges |
| **Featured Listing Toggle** | Toggle in dashboard, `featured` DB field, badge + homepage placement | No payment gate — free for all dealers currently |
| **Homepage Spotlight** | Featured listings appear on homepage | No paid weekly spotlight product |
| **Sold Listings Archive** | `is_sold` flag on cars, Mark Sold in dashboard, sold-notification emails | No public `/sold` browsable page for buyers |
| **Import/Sync Inventory** | "Import JSON" and "Sync Now" buttons visible in dealer dashboard | Both are stubs with no click handler/API route behind them |
| **Bold Search Result Add-On** | Listed on pricing page | No implementation or payment flow |
| **Email unsubscribe / preferences** | `/unsubscribe` and `/unsubscribe/digest` pages exist and set opt-out flags | No general email-preferences UI in account settings |

---

## ❌ Not Implemented

### Near-Term Priority

| Feature | Description | Blocker |
|---|---|---|
| **Stripe Integration** | Dealer subscriptions, private seller checkout (if ever introduced), featured listing upgrades, add-ons | Requires Stripe account + webhooks |
| **Dealer Self-Serve Onboarding** | Signup → choose plan → pay → dashboard (currently: apply → wait for manual admin approval) | Requires Stripe; also a product decision on whether to keep the vetted-application model |
| **Compare Listings** | Side-by-side comparison of 2–4 cars | Complex persistent UI state |
| **Buyer Inquiry History** | `/account/inquiries` — past contact forms sent | Not built |
| **Geographic Analytics** | IP geolocation on views, buyer location map in dealer dashboard | No geolocation service wired up |
| **Verified History Badge (Carfax/AutoCheck)** | Full vehicle history report (accidents, title issues, prior owners), distinct from the NHTSA-based VIN decode/format check that now exists | Requires a Carfax/AutoCheck (or similar) API and commercial agreement |
| **Vehicle Inspection Marketplace** | Third-party pre-purchase inspection referral (a "Phase 1" affiliate button linking to an inspector such as Lemon Squad was built and specced, then lost in a merge) | Affiliate agreement still needs finalizing; button needs re-adding once terms are confirmed |
| **Google Analytics / Plausible** | Traffic analytics | Not installed |
| **Google Search Console** | SEO indexing, sitemap submission | Not submitted |
| **Email Newsletter Signup** | Buyer opt-in form for digest | No signup form on site |

### Mid-Term

| Feature | Description |
|---|---|
| **Mobile App** | React Native iOS + Android sharing the Supabase backend |
| **Auction Mode** | Timed listings with reserve price, real-time bidding, outbid notifications |
| **Dealer Analytics V2** | Traffic sources, view-to-inquiry conversion rate, price competitiveness score, suggested price adjustments |
| **Social Sharing** | One-click share to Facebook, Instagram, X from listing pages |
| **Community Posts** | "Spotted at a show" posts, questions & answers on listings |
| **Dealer Follow / Subscribe** | Buyers follow a dealer and get notified of new listings |
| **Inventory Import** | CSV bulk upload, DealerSocket/vAuto integration, VIN decode to auto-fill specs (note: VIN decode itself now exists via NHTSA — this item is specifically about bulk import) |
| **Car Show / Events Calendar Content** | `/events` page exists and is fully built (empty state, "Submit an Event" mailto CTA) but currently lists **zero events** — the previously-claimed "12 major 2026 events" were removed and not replaced. Needs real event data before it delivers value. |

### Long-Term

| Feature | Description |
|---|---|
| **GarageCherries Auctions** | Full auction platform competing with Bring a Trailer — live virtual events, white-glove listing service |
| **Financing Integration** | `FinancingCalculator` already links out to J.J. Best Banc and Woodside Credit (plain `<a href>`, no affiliate ID, no click tracking, no lead capture) — currently free referral traffic for them with zero revenue captured. Quick win once a partner agreement exists: swap in affiliate-tagged URLs and add click tracking (same pattern as `AdSlot`'s impression/click RPCs). The real blocker is business, not code — need an actual referral agreement with a classic-car lender before there's anything to track. |
| **Insurance Integration** | Hagerty / Grundy / American Collectors quote widget, referral revenue |
| **Shipping & Transport** | Montway / uShip quote integration on listing pages, referral revenue |
| **Market Intelligence Tool** | Comparable sold listings, price trend graphs, "what's hot" alerts for dealers |
| **GarageCherries Certified Program** | Third-party inspection, certified badge, premium listing fee (related to, but broader than, the near-term inspection-affiliate item above) |
| **Price History Chart (`PriceHistoryChart.tsx`)** | Component and `price_history` table both already exist and work (server component, sparkline + timeline of price changes); deliberately deprioritized rather than re-wired now — it needs 2+ recorded price changes per car to render anything, and this site is pre-launch with only 2 test listings and no price-change history yet. Revisit once there's enough real price-edit activity for it to be worth showing. |

---

## Revenue Streams — Implementation Status

| Stream | Status | Monthly Potential |
|---|---|---|
| Dealer subscriptions | ❌ Stripe not wired | $3,000–$50,000 |
| Private seller listings | ❌ No checkout (listing creation itself is free and works) | $500–$5,000 |
| Featured listing upgrades | ⚠️ Toggle exists, no payment | $1,000–$8,000 |
| Homepage spotlight | ❌ Not built | $300–$3,000 |
| Display advertising | ✅ Signup, ad creation, targeting, tracking, and display all work (`AdSlot` re-wired 2026-07-02) — tables are empty in prod as of this writing, but that's expected pre-launch state, not a broken funnel | $500–$15,000 |
| Newsletter sponsorships | ⚠️ Email built, no sponsor workflow | $400–$6,000 |
| Lead gen / pay-per-inquiry | ❌ Not built | $3,000–$30,000 |
| Auction buyer fee (5%) | ❌ Not built | $5,000–$35,000 |
| Financing referrals | ❌ Not built | $1,000–$10,000 |
| Insurance referrals | ❌ Not built | $1,000–$8,000 |
| Shipping referrals | ❌ Not built | $500–$3,000 |
| Inspection affiliate referral | ❌ Built once, then lost in a merge; not currently live | $500–$5,000 |

---

## Third-Party Services

| Service | Purpose | Status | Dashboard |
|---|---|---|---|
| **Vercel** | Hosting + deploys | ✅ Live | vercel.com |
| **GitHub** | Source control | ✅ Live | github.com/thedjohn/GarageCherries |
| **Supabase** | Database, Auth, Storage | ✅ Live | supabase.com |
| **Resend** | Transactional email | ✅ Live | resend.com |
| **Cloudflare Turnstile** | CAPTCHA on public forms | ✅ Live | dash.cloudflare.com |
| **NHTSA VIN Decoder API** | VIN format/decode verification | ✅ Live (free, no key required) | vpic.nhtsa.dot.gov |
| **Enzuzo** | Hosted Privacy Policy / Terms of Service content | ✅ Live | app.enzuzo.com |
| **Anthropic** | AI features (Claude) | ❌ Removed 2026-07-01 — all AI features deferred to a future release | console.anthropic.com |
| **Stripe** | Payments | ❌ Not connected | stripe.com |
| **Google Search Console** | SEO indexing | ❌ Not submitted | search.google.com/search-console |
| **Google Analytics / Plausible** | Traffic analytics | ❌ Not installed | — |
| **Carfax / AutoCheck** | Full vehicle history verification (accidents, title, prior owners) | ❌ Not connected — separate from the NHTSA VIN decode check, which is live | — |
| **Lemon Squad (or similar inspector)** | Pre-purchase inspection affiliate | ❌ Built once, lost in a merge; agreement not finalized | — |
| **Mediavine / AdThrive** | Premium programmatic ads | ❌ Pending traffic threshold | — |

---

## Recommended Next Steps (Priority Order)

1. ~~Re-wire the orphaned components~~ — **Done 2026-07-02**: `AdSlot`, `MakeOfferButton`, `DealerReviews`, `DealerBadge`, and `FinancingCalculator` are all re-wired and verified. `PriceHistoryChart` intentionally deferred — see Long-Term wishlist above (needs real price-change history to be worth showing, and the site is pre-launch).
2. **Restore or replace the inspection-affiliate button** — it was built, specced, and lost in a merge; either re-add it once the Lemon Squad agreement is confirmed, or formally deprioritize it
3. **Add real events to `/events`** — the calendar currently shows zero events; either populate it or remove the page from nav until there's content
4. **Rotate all API keys** — if not already done, generate new keys in Resend and Supabase dashboards
5. **Set all env vars in Vercel** — confirm `ADMIN_API_SECRET` and `INTERNAL_API_SECRET` are set
6. **Submit sitemap to Google Search Console** — starts SEO indexing clock
7. **Wire Stripe** — Featured listing upgrades are the fastest first product to charge for
8. **Add Google Analytics or Plausible** — need visibility into what traffic you have
9. **Build the "listing expiring soon" reminder email** — the 30-day expiry/renewal system (2026-07-02) has no proactive nudge yet; sellers only see the countdown if they happen to visit their account/dashboard. Reuses the existing Resend pipeline used for price-drop digests.
10. **Build `/account/inquiries`** — completes the buyer account experience
11. **Build public `/sold` archive page** — SEO value + buyer trust signal
12. **Decide on dealer self-serve signup** — current apply-and-wait model may be intentional (vetting quality), but if faster growth is the goal, self-serve + Stripe removes the bottleneck

---

*For architecture details and credentials reference see `GarageCherries-User-Guide.md`*
*For full product vision see `PRODUCT_OVERVIEW.md`*
*For detailed API contracts, DB schema, user flows, and a feature-by-feature gap list, see `SPEC.md`*
