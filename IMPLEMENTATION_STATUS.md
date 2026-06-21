# GarageCherries — Implementation Status
*Last updated: June 2026 — current as of commit 2db0b42*

---

## ✅ Fully Implemented

### Browse & Search
- [x] Full listings page (`/listings`) with filter sidebar — make, year, price, condition, body style, transmission, state
- [x] AI Smart Search — natural language query translates to filters (e.g. "red Ford convertible in Texas under $40k")
- [x] Make pages (`/listings/ford`) — all cars by make with model sub-navigation
- [x] Model pages (`/listings/ford/mustang`) — filtered by make + model
- [x] Featured listings — badge on card, prioritized on homepage
- [x] Recently listed section on homepage
- [x] Listing card component with price, condition, mileage, location, photos
- [x] Database-driven makes — make filter dropdown and make/model URL pages work for any make present in the database; `/api/makes` endpoint serves distinct makes to client components

### Listing Detail Pages
- [x] Full photo gallery with thumbnail navigation
- [x] Complete spec sheet — engine, drivetrain, interior, options
- [x] Dealer info panel with map embed and click-to-call
- [x] AI Price Assessment widget ("Is this a fair price?")
- [x] Message Seller contact form — emails dealer, buyer address never exposed
- [x] AI Similar Cars recommendations
- [x] Watch / Save listing button
- [x] Financing Calculator — amortization accordion with down payment, rate, and term sliders
- [x] Price History Chart — SVG sparkline of past price changes
- [x] Make an Offer button — modal flow with offer amount, message, Resend emails to dealer and buyer
- [x] SEO — per-page title, description, Open Graph tags, JSON-LD Vehicle schema, canonical URL
- [x] View tracking — deduplicated by IP per day, records user_id when logged in

### Dealer Public Pages
- [x] Dealer directory (`/dealers`) — all dealers with listing counts
- [x] Dealer profile page (`/dealers/[slug]`) — logo, description, specialties, location, hours, map
- [x] Full inventory grid on dealer profile
- [x] Dealer badge — Bronze (5+ listings), Silver (15+), Gold (30+)
- [x] Buyer reviews and star ratings on dealer profiles
- [x] JSON-LD AutoDealer schema for local SEO

### Dealer Dashboard (`/dealer/dashboard`)
- [x] Overview tab — active listings, views (30d), inquiries (30d), avg. days on market, month-over-month comparison
- [x] Inventory tab — add, edit, delete, mark as sold
- [x] Inquiries tab — all buyer messages with AI draft reply assistant
- [x] Settings tab — full profile management (name, phone, address, logo, description, specialties)
- [x] Watcher counts per listing (how many buyers have it saved)
- [x] Message Watchers — notify all watchers of a specific car
- [x] Price history recorded automatically on every price edit
- [x] Mark as Sold with confirmation modal
- [x] Free-text make input with `<datalist>` autocomplete — dealers can enter any make, not limited to a hardcoded list

### AI Features (Powered by Claude)
- [x] **Smart Search** — `/api/ai/smart-search`
- [x] **AI Listing Writer** — generates descriptions from specs
- [x] **Price Assessment** — fair price analysis for buyers
- [x] **Inquiry Reply Assistant** — draft dealer replies to buyer messages
- [x] **Similar Cars** — AI-powered related listing recommendations

### Buyer Accounts
- [x] Signup (`/account/signup`)
- [x] Login (`/account/login`)
- [x] Forgot password / reset password flow
- [x] Profile management (`/account/profile`)
- [x] Watchlist — save listings, view at `/account/watchlist`
- [x] Car Alerts — saved searches with automatic email notification on new matches (`/account/alerts`)

### Email (via Resend)
- [x] Buyer inquiry delivered to dealer instantly
- [x] Offer notification to dealer with offer details
- [x] Offer confirmation to buyer
- [x] Car alert match notification to buyer
- [x] Price drop notification to watchlist users (manual trigger)
- [x] Weekly fresh listings digest (manual trigger)
- [x] Monthly dealer performance report (manual trigger)
- [x] Watcher blast from dealer dashboard

### Content & SEO Pages
- [x] Classic Car Encyclopedia (`/cars`) — 20 models across 7 makes
- [x] Encyclopedia make pages (`/cars/[make]`)
- [x] Encyclopedia model pages (`/cars/[make]/[model]`) — history, specs, notable versions, buying tips, price guide, live listings
- [x] Buyer's Guides index (`/guides`) — 6 articles
- [x] Individual guide articles (`/guides/[slug]`) — full content for all 6 guides
- [x] Car Show Calendar (`/events`) — 12 major 2026 events
- [x] Market Report (`/reports`) — live avg price by make, condition breakdown, most viewed, market commentary
- [x] Pricing page (`/pricing`)
- [x] Sell Your Car page (`/sell`)
- [x] XML Sitemap (`/sitemap.xml`)
- [x] Robots.txt (`/robots.txt`)

### Advertising System
- [x] Advertiser signup (`/advertiser/signup`) and login (`/advertiser/login`)
- [x] Ad campaign dashboard (`/advertiser/dashboard`) — create, edit, pause ads
- [x] AdSlot component on listing detail pages
- [x] Impressions and clicks tracking
- [x] State-level ad targeting
- [x] Atomic impression/click increment functions (no race conditions)

### Admin Tools
- [x] Email campaign trigger page (`/admin/email`) — manually fire digest, price drops, dealer reports
- [x] All email routes protected by `ADMIN_API_SECRET` header

### Technical Infrastructure
- [x] Next.js 16 App Router with TypeScript
- [x] Supabase PostgreSQL with Row Level Security
- [x] Supabase Auth (buyer + dealer + advertiser sessions)
- [x] Supabase Storage (car photo uploads)
- [x] Server components + client components correctly separated
- [x] `createClient()` (async, RLS-enforced) and `createAdminClient()` (sync, service role) pattern
- [x] Centralized data fetching in `lib/db.ts` — includes `fetchMakes()` and `resolveMake()` for database-driven make resolution
- [x] `/api/makes` — GET endpoint returning distinct makes from the cars table, used by SearchFilters and dealer dashboard datalist
- [x] Database migration file (`supabase/migrations/002_new_features.sql`)
- [x] Deployed to Vercel with GitHub auto-deploy on push to `main`

---

## ⚠️ Partially Implemented

| Feature | What Exists | What Is Missing |
|---|---|---|
| **Dealer Subscriptions** | Pricing page shows Starter/Pro/Unlimited plans | No Stripe — nothing actually charges |
| **Private Seller Flow** | `/sell` landing page | No checkout, no listing creation for non-dealers |
| **Featured Listing Toggle** | Toggle in dashboard, `featured` DB field | No payment gate — free for all dealers currently |
| **Homepage Spotlight** | Featured listings appear on homepage | No paid weekly spotlight product |
| **Sold Listings Archive** | `is_sold` flag on cars, Mark Sold in dashboard | No public `/sold` browsable page for buyers |
| **Dealer Self-Serve Signup** | Login page exists | Admin must manually create dealer accounts in Supabase |
| **Collector Cars / Convertibles Nav** | Was in original nav | Replaced with Guides, Events, Dealers, Sell, Pricing links — original make-specific nav links not restored |
| **Bold Search Result Add-On** | Listed on pricing page | No implementation or payment flow |

---

## ❌ Not Implemented

### Near-Term Priority

| Feature | Description | Blocker |
|---|---|---|
| **Stripe Integration** | Dealer subscriptions, private seller checkout, featured listing upgrades, add-ons | Requires Stripe account + webhooks |
| **Dealer Self-Serve Onboarding** | Signup → choose plan → pay → dashboard | Requires Stripe |
| **14-Day Free Trial** | Trial period before first charge | Requires Stripe |
| **Compare Listings** | Side-by-side comparison of 2–4 cars | Complex persistent UI state |
| **Buyer Inquiry History** | `/account/inquiries` — past contact forms sent | Not built |
| **Geographic Analytics** | IP geolocation on views, buyer location map in dealer dashboard | No geolocation service wired up |
| **Verified Listing Badge** | VIN submission, Carfax/AutoCheck integration, "Verified History" badge | Requires Carfax/AutoCheck API |
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
| **Inventory Import** | CSV bulk upload, DealerSocket/vAuto integration, VIN decode to auto-fill specs |

### Long-Term

| Feature | Description |
|---|---|
| **GarageCherries Auctions** | Full auction platform competing with Bring a Trailer — live virtual events, white-glove listing service |
| **Financing Integration** | J.J. Best Banc / Woodside Credit partner widgets, "get pre-qualified" button, referral revenue |
| **Insurance Integration** | Hagerty / Grundy / American Collectors quote widget, referral revenue |
| **Shipping & Transport** | Montway / uShip quote integration on listing pages, referral revenue |
| **Market Intelligence Tool** | Comparable sold listings, price trend graphs, "what's hot" alerts for dealers |
| **GarageCherries Certified Program** | Third-party inspection, certified badge, premium listing fee |

---

## Revenue Streams — Implementation Status

| Stream | Status | Monthly Potential |
|---|---|---|
| Dealer subscriptions | ❌ Stripe not wired | $3,000–$50,000 |
| Private seller listings | ❌ No checkout | $500–$5,000 |
| Featured listing upgrades | ⚠️ Toggle exists, no payment | $1,000–$8,000 |
| Homepage spotlight | ❌ Not built | $300–$3,000 |
| Display advertising | ✅ Live | $500–$15,000 |
| Newsletter sponsorships | ⚠️ Email built, no sponsor workflow | $400–$6,000 |
| Lead gen / pay-per-inquiry | ❌ Not built | $3,000–$30,000 |
| Auction buyer fee (5%) | ❌ Not built | $5,000–$35,000 |
| Financing referrals | ❌ Not built | $1,000–$10,000 |
| Insurance referrals | ❌ Not built | $1,000–$8,000 |
| Shipping referrals | ❌ Not built | $500–$3,000 |

---

## Third-Party Services

| Service | Purpose | Status | Dashboard |
|---|---|---|---|
| **Vercel** | Hosting + deploys | ✅ Live | vercel.com |
| **GitHub** | Source control | ✅ Live | github.com/thedjohn/GarageCherries |
| **Supabase** | Database, Auth, Storage | ✅ Live | supabase.com |
| **Anthropic** | AI features (Claude) | ✅ Live | console.anthropic.com |
| **Resend** | Transactional email | ✅ Live | resend.com |
| **Stripe** | Payments | ❌ Not connected | stripe.com |
| **Google Search Console** | SEO indexing | ❌ Not submitted | search.google.com/search-console |
| **Google Analytics / Plausible** | Traffic analytics | ❌ Not installed | — |
| **Carfax / AutoCheck** | VIN history verification | ❌ Not connected | — |
| **Mediavine / AdThrive** | Premium programmatic ads | ❌ Pending traffic threshold | — |

---

## Recommended Next Steps (Priority Order)

1. **Rotate all API keys** — they were exposed; generate new keys in Anthropic, Resend, and Supabase dashboards
2. **Set all env vars in Vercel** — `ADMIN_API_SECRET` not yet set
3. **Submit sitemap to Google Search Console** — starts SEO indexing clock
4. **Wire Stripe** — Featured listing upgrades are the fastest first product to charge for
5. **Build dealer self-serve signup** — removes manual onboarding bottleneck
6. **Recruit 10–20 dealers** — inventory volume drives everything else
7. **Add Google Analytics or Plausible** — need visibility into what traffic you have
8. **Build `/account/inquiries`** — completes the buyer account experience
10. **Build public `/sold` archive page** — SEO value + buyer trust signal

---

*For architecture details and credentials reference see `GarageCherries-User-Guide.md`*
*For full product vision see `PRODUCT_OVERVIEW.md`*
