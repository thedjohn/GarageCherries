# GarageCherries

A classic and collector car marketplace connecting buyers with trusted dealers and private sellers across the United States. Built with Next.js 16, Supabase, and Resend.

**Tagline:** *Find Your Cherry.*

---

## Project

GarageCherries is a modern alternative to platforms like Hemmings and ClassicCars.com. The name comes from "cherry" — enthusiast slang for a car in perfect, pristine condition.

**Target audience:**
- Classic car dealers (primary revenue source — monthly subscriptions)
- Private sellers with 1–3 cars to sell
- Buyers and collectors searching for specific vehicles

**Competitive edge:**
- Lower cost than every major competitor ($49–$199/mo vs. $450–$2,000/mo on AutoTrader)
- No seller commissions — ever
- Modern mobile-first design with full buyer account features

**Revenue streams:** Dealer subscriptions, private seller listing fees, featured listing upgrades, homepage spotlights. Long-term: auction buyer fees, financing/insurance/shipping referrals.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server + client components, searchParams as Promises |
| Language | TypeScript | |
| Database | Supabase (PostgreSQL) | Row Level Security on all tables |
| Auth | Supabase Auth | Buyer, private seller, dealer, advertiser, and admin sessions |
| Storage | Supabase Storage | `listing-images` bucket for listing photos |
| Email | Resend | All transactional email — inquiries, alerts, digests, reports |
| CAPTCHA | Cloudflare Turnstile | On all public-facing submission forms |
| Styling | Tailwind CSS | |
| Hosting | Vercel | Auto-deploy from `main` branch |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Resend API key
- A Cloudflare Turnstile site key + secret

### Installation

```bash
git clone https://github.com/thedjohn/GarageCherries.git
cd GarageCherries
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
ADMIN_API_SECRET=your_admin_api_secret
INTERNAL_API_SECRET=your_internal_api_secret
ADMIN_EMAIL=derek_ljohnson@yahoo.com
```

### Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Pages

| Route | Description |
|---|---|
| `/` | Homepage — featured listings, browse by style/make |
| `/listings` | Browse all listings with filter sidebar + keyword search |
| `/listings/[make]/[model]/[id]/[slug]` | Listing detail page |
| `/cars` | Classic Car Encyclopedia (54 models, 12 makes) |
| `/dealers` | Dealer directory |
| `/dealers/[slug]` | Dealer profile + live inventory |
| `/sell` | Private seller listing form (auth required) |
| `/account` | Buyer account — watchlist, alerts, listings, profile |
| `/account/watchlist` | Standalone watchlist page |
| `/messages` | Buyer-seller messaging inbox |
| `/reports` | Live market report |
| `/dealer/apply` | Dealer application form |
| `/dealer/dashboard` | Dealer dashboard (auth required) |
| `/dealer/expired` | Beta expiry landing page |
| `/advertiser/signup` | Advertiser signup |
| `/advertiser/dashboard` | Advertiser dashboard |
| `/admin` | Admin panel (role-gated) |
| `/admin/email` | Email campaign trigger panel (superadmin) |
| `/pricing` | Plan pricing page |

---

## Key API Routes

| Route | Purpose |
|---|---|
| `POST /api/listings/submit` | Submit a new listing (private seller) |
| `POST /api/inquire` | Buyer contact form → Resend email + DB insert |
| `POST /api/offers` | Submit offer to dealer |
| `POST /api/track-view` | Record a deduplicated listing view |
| `GET /api/dealer/metrics` | Dashboard metrics for the authenticated dealer |
| `POST /api/dealer/settings` | Save dealer profile changes |
| `GET /api/dealer/export` | Export dealer inventory as CSV or JSON |
| `POST /api/notify-watchers` | Notify watchlist users of a price drop |
| `POST /api/alerts/match` | Match a new listing against saved searches (internal) |
| `POST /api/email/digest` | Trigger weekly listings digest (admin secret required) |
| `POST /api/email/dealer-report` | Trigger monthly dealer report (admin secret required) |
| `POST /api/email/expiring-listings` | Send renewal reminders for listings expiring in 3 days |
| `POST /api/admin/cleanup-images` | Delete orphaned storage images older than 24h (superadmin) |
| `POST /api/cars/verify-vin` | NHTSA VIN decode + fuzzy match |

---

## Database

All tables have Row Level Security enabled. Public data is readable by anyone; writes are restricted by auth rules. Use `createAdminClient()` (service role, server-side only) to bypass RLS in API routes.

### Core Tables

| Table | Description |
|---|---|
| `listings` | All vehicle listings (`status`, `expires_at`, `is_feed_managed`, `renewal_reminder_sent_at`) |
| `dealers` | Dealer profiles (`plan`, `beta_expires_at`, `report_opt_out`) |
| `saved_searches` | Buyer car alerts |
| `alert_matches` | Records of which listings triggered which alerts |
| `watchlists` | Saved listings per buyer |
| `price_history` | Price changes recorded on every edit |
| `conversations` / `messages` | Buyer-seller messaging |
| `offers` | Buyer offers to dealers |
| `dealer_reviews` | Buyer reviews of dealers |
| `listing_views` | Deduplicated view tracking |
| `inquiries` | Buyer contact form submissions |
| `profiles` | Buyer profile data |
| `admin_team` | Admin role assignments |
| `dealer_applications` | Pending/approved/rejected dealer applications |
| `advertisers` / `ads` / `ad_events` | Advertising system |

---

## Supabase Client Pattern

```ts
// Server components and API routes:
import { createClient, createAdminClient } from '@/lib/supabase/server';
const supabase = await createClient();     // RLS-enforced
const admin = createAdminClient();         // bypasses RLS — service role only

// Client components:
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

---

## Admin Roles

Four tiers: `support < moderator < admin < superadmin`

| Capability | support | moderator | admin | superadmin |
|---|---|---|---|---|
| View reported messages | ✅ | ✅ | ✅ | ✅ |
| Approve / reject listings | — | ✅ | ✅ | ✅ |
| Edit listings | — | — | ✅ | ✅ |
| View / edit users | — | — | ✅ | ✅ |
| Review dealer applications | — | — | ✅ | ✅ |
| Manage team members | — | — | — | ✅ |
| Delete listings / users | — | — | — | ✅ |
| Trigger email campaigns | — | — | — | ✅ |
| Cleanup orphan images | — | — | — | ✅ |

---

## Email Unsubscribe Pages

All opt-out flags are stored in `user_metadata` (Supabase Auth) or on the `dealers` table. Each page validates the `uid` param against a UUID regex before calling the Supabase admin SDK.

| Page | Flag Set |
|---|---|
| `/unsubscribe/digest` | `user_metadata.digest_opt_out` |
| `/unsubscribe/price-drops` | `user_metadata.price_drop_opt_out` |
| `/unsubscribe/alerts` | `user_metadata.alerts_opt_out` |
| `/unsubscribe/dealer-report` | `dealers.report_opt_out` |

---

## Business Rules

- **No seller commissions** — GarageCherries charges subscription/listing fees only. Do not add commission logic to any checkout or payment flow.
- **Lazy image upload** — images are held as `File` objects on the client until the listing form is submitted; upload happens inside `onSubmit`, not on file select.
- **Dealer beta** — new dealers get a 6-month beta period (`plan: 'beta'`, `beta_expires_at`). Expired dealers are redirected to `/dealer/expired` and blocked from submitting or editing listings.
- **Listing expiry** — listings expire 30 days after approval. Feed-managed listings (`is_feed_managed: true`) are exempt from the renewal flow.
- **Admin secret routes** — `/api/email/*` require `Authorization: Bearer <ADMIN_API_SECRET>`. Internal routes (`/api/alerts/match`, `/api/notify-watchers`) require `Authorization: Bearer <INTERNAL_API_SECRET>`.

---

## Project Structure

```
app/
  page.tsx                         # Homepage
  listings/
    page.tsx                       # Browse + filter + keyword search
    [...segments]/page.tsx         # Make, model, detail (catch-all)
  dealer/
    apply/page.tsx
    login/page.tsx
    dashboard/page.tsx             # Dealer dashboard (protected)
    expired/page.tsx               # Beta expiry landing
  dealers/
    page.tsx                       # Dealer directory
    [slug]/page.tsx                # Dealer profile
  account/                         # Buyer account pages
  admin/
    page.tsx                       # Admin panel
    email/page.tsx                 # Email campaign triggers
  advertiser/                      # Advertiser pages
  unsubscribe/                     # Email opt-out pages
  api/
    listings/                      # Submit, edit, renew, delete
    alerts/                        # Saved search matching
    dealer/                        # Metrics, settings, export
    email/                         # Digest, dealer-report, expiring-listings
    admin/                         # Team, listings, cleanup-images
    notify-watchers/               # Price drop notifications
    inquire/                       # Buyer contact form
    offers/                        # Buyer offers
    track-view/                    # View tracking
    cars/verify-vin/               # NHTSA VIN decode

components/                        # Shared UI components
lib/
  matchAlerts.ts                   # Saved-search scoring + email
  rateLimit.ts                     # In-memory rate limiter
  admin.ts                         # Role hierarchy helpers
  data.ts                          # Pure utilities (formatPrice, toSegment, etc.)
  types.ts                         # TypeScript interfaces + filter constants
  supabase/
    client.ts                      # Browser Supabase client
    server.ts                      # Server client + admin client

supabase/
  migrations/                      # SQL migration files

docs/
  dealer-import-sample.json        # Sample format for future Import JSON feature
```

---

## Secrets Reference

Secrets are stored at `C:\Users\derek\Documents\GarageCherries-SECRETS.txt` — **outside the git repo**. Never commit `.env.local` or secrets to version control.

- Admin email: `derek_ljohnson@yahoo.com`
- Business email: `contact-us@garagecherries.com` (Zoho Mail)

---

## Contact

Derek Johnson — derek_ljohnson@yahoo.com
