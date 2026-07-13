# GarageCherries — Product Overview & Roadmap
*Last updated: July 2026*

---

## What Is GarageCherries?

GarageCherries is a classic and collector car marketplace connecting buyers with trusted dealers and private sellers worldwide. The name comes from "cherry" — enthusiast slang for a car in perfect, pristine condition. Every listing on GarageCherries represents a cherry find.

**Target audience:**
- Classic car dealers (primary revenue source)
- Private sellers with 1–3 cars to sell
- Buyers and collectors searching for specific vehicles

---

## Current Platform Features

### 🔍 Browse & Search
- Full listings page with filter sidebar (make, year, price, condition, body style, transmission, state)
- ~~**AI Smart Search**~~ — removed 2026-07-01; deferred to future release
- Make pages (`/listings/ford`) and model pages (`/listings/ford/mustang`) for SEO-friendly browsing
- Featured listings highlighted with badges and homepage placement
- Collector Cars and Convertibles quick-filter nav links

### 🚗 Listing Detail Pages
- Full photo gallery with thumbnail navigation
- Complete spec sheet (engine, drivetrain, interior, options)
- Dealer info with map embed and click-to-call
- ~~**AI Price Assessment**~~ — removed 2026-07-01; deferred to future release
- **Message Seller** — contact form that emails the seller directly (buyer email never exposed publicly)
- ~~**You May Also Like**~~ — removed 2026-07-01; deferred to future release
- SEO optimized with per-page titles, descriptions, Open Graph tags, and JSON-LD Vehicle schema

### 🏢 Dealer Pages
- Public dealer profile with logo, description, specialties, location map
- Full inventory grid
- JSON-LD AutoDealer schema for local SEO
- Verified dealer badge

### 💼 Dealer Dashboard
- **Overview tab** — real-time metrics: active listings, views (30d), inquiries (30d), avg. days on market
- **Inventory tab** — full CRUD for vehicle listings (add, edit, delete)
- **Inquiries tab** — buyer messages (~~AI draft reply assistant removed 2026-07-01~~)
- **Settings tab** — dealer profile management (name, phone, address, description, specialties)

### 🤖 AI Features
> **Removed 2026-07-01** — all 5 AI routes (Smart Search, Listing Writer, Price Assessment, Inquiry Reply Assistant, Similar Cars) were removed and deferred to a future release. This section describes the planned implementation, not the current live product.

### 📧 Buyer Inquiries
- Contact form on every listing
- Emails delivered instantly to seller via Resend
- Inquiry stored in database for dealer dashboard
- Buyer's email address never exposed publicly
- Seller replies directly from their own email client

### 📊 Analytics & Metrics
- Listing view tracking (deduplicated by IP per day)
- Inquiry tracking with full buyer details
- 30-day rolling metrics with month-over-month comparison
- All data stored in Supabase, accessible only to the relevant dealer

### 💰 Pricing Structure
**Dealer Subscriptions (Monthly)**
| Plan | Price | Listings | Featured Slots |
|---|---|---|---|
| Starter | $49/mo | 5 | 0 |
| Pro | $99/mo | 25 | 3 |
| Unlimited | $199/mo | Unlimited | 10 |

**Private Sellers (One-Time)**
| Option | Price |
|---|---|
| Basic Listing | $49 (30 days) |
| Featured Listing | $99 (30 days) |
| First listing | Free (to seed inventory) |

**Add-Ons**
| Add-On | Price |
|---|---|
| Featured Listing Upgrade | $25/listing/month |
| Homepage Spotlight | $75/week |
| Bold Search Result | $10/listing/month |

### 🔒 Technical Architecture
- **Framework:** Next.js 16 (App Router) with TypeScript
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth (dealer login)
- **AI:** Anthropic Claude — deferred; not currently active
- **Email:** Resend
- **Storage:** Supabase Storage (car photos)
- **Error tracking:** Sentry (`@sentry/nextjs`)
- **Structured logging:** Axiom (`next-axiom`)
- **Hosting:** Vercel — live at `garagecherries.com`
- **SEO:** Dynamic metadata, Open Graph, JSON-LD schema, XML sitemap, robots.txt

---

## Planned Features

### 🔜 Near-Term (Next 3 Months)

#### Payments — Stripe Integration
- Dealer subscription billing (Starter / Pro / Unlimited)
- Private seller one-time checkout ($49 / $99)
- Featured listing upgrades purchasable from dashboard
- Stripe Billing Portal so dealers manage their own cards
- Webhooks to auto-activate/deactivate accounts on payment events
- 14-day free trial for all dealer plans

#### Buyer Accounts
- Save favorite listings
- Saved search alerts ("notify me when a 1969 Dodge Charger is listed")
- Inquiry history
- Compare up to 4 cars side by side

#### Geographic Analytics
- IP geolocation on listing views (city, state, region)
- Dealer dashboard map showing where buyer interest is coming from
- "Top buyer cities" and "local vs. out-of-state" breakdown
- Helps dealers target advertising spend geographically

#### Verified Listings Badge
- Dealers can submit VIN for verification
- Carfax/AutoCheck integration
- "Verified History" badge on listing
- Builds buyer trust, justifies premium pricing

### 📅 Mid-Term (3–6 Months)

#### Mobile App
- React Native app (iOS + Android) sharing the same Supabase backend
- Push notifications for new inquiries
- Photo upload from phone camera directly to listing
- Barcode/VIN scanner for quick listing creation

#### Auction Mode
- Timed auction listings (3, 7, or 14 day auctions)
- Reserve price option
- Real-time bid counter
- Outbid email notifications
- 5% buyer fee on auctions (no seller commission)

#### Dealer Analytics Dashboard V2
- Traffic sources (direct, search, social, referral)
- View-to-inquiry conversion rate per listing
- Best performing listing times/days
- Price competitiveness score vs. similar listings
- Suggested price adjustments based on market data

#### Social Features
- Listing shares to Facebook, Instagram, X
- "Spotted at a show" community posts
- Dealer follow/subscribe
- Community discussion on listings (questions & answers)

#### Inventory Import
- Bulk CSV upload for dealers with large inventories
- DealerSocket / vAuto integration
- Auto-sync from dealer website feeds
- VIN decode to auto-fill specs

### 🔭 Long-Term (6–12 Months)

#### GarageCherries Auctions
- Full auction platform (competing with Bring a Trailer)
- Live virtual auction events (streamed)
- In-person auction event listings
- White-glove listing service for high-value cars ($2,500+)

#### Financing Integration
- Partner with classic car lenders (J.J. Best Banc, Woodside Credit)
- "Get pre-qualified" button on listings
- Monthly payment calculator
- Referral revenue from financing partners

#### Insurance Integration
- Classic car insurance quotes (Hagerty, Grundy, American Collectors)
- Embedded quote widget on listing pages
- Referral revenue

#### Shipping & Transport
- Enclosed transport quotes on every listing
- Partner with Montway, Sherpa, uShip
- Click-to-quote from listing page
- Referral revenue

#### Market Intelligence Tool (Dealer Pro Feature)
- Real market value estimates based on GarageCherries sales data
- Comparable sold listings
- Price trend graphs by make/model/year
- "What's hot right now" alerts
- Dealer newsletter with market insights

#### GarageCherries Certified Program
- White-glove inspection program
- Third-party inspection at buyer's request
- Certified badge = inspected, verified, guaranteed accurate description
- Premium listing fee for certification

---

## Revenue Model Summary

| Stream | Type | Status |
|---|---|---|
| Dealer subscriptions | Recurring monthly | Planned (Stripe) |
| Private seller listings | One-time fee | Planned (Stripe) |
| Featured listing upgrades | Add-on | Planned (Stripe) |
| Homepage spotlight | Add-on | Planned (Stripe) |
| Auction buyer fee (5%) | Transaction | Long-term |
| Financing referrals | Referral | Long-term |
| Insurance referrals | Referral | Long-term |
| Shipping referrals | Referral | Long-term |
| Certified program | Premium service | Long-term |

**Zero seller commissions — ever.** Sellers keep 100% of the sale price.

---

## Competitive Positioning

| Platform | Monthly Cost | Commission | AI Features |
|---|---|---|---|
| AutoTrader Classics | $450–$2,000 | None | None |
| Hemmings | $135/yr + per listing | None | None |
| ClassicCars.com | $130–$350/listing | None | None |
| Bring a Trailer | $99/listing | 5% buyer fee | None |
| **GarageCherries** | **$49–$199/mo** | **None** | **Planned** |

**Our edge:** Lower cost than every major competitor, built-in AI tools no one else has, modern tech stack, mobile-first design.

---

## Brand

**Name:** GarageCherries
**Tagline:** *Find Your Cherry.*
**Colors:** Cherry Red (#DC2626), Garage Black (#18181b), Chrome White (#FAFAFA)
**Logo:** 🍒 + wordmark
**Voice:** Enthusiast-first. Knowledgeable but approachable. Never corporate.
**Mission:** Make buying and selling classic cars as enjoyable as driving them.

---

*Document maintained by the GarageCherries team. For questions contact derek_ljohnson@yahoo.com*
