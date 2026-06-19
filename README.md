# GarageCherries

A classic and collector car marketplace connecting buyers with trusted dealers and private sellers across the United States. Built with Next.js 16, Supabase, and Claude AI.

**Tagline:** *Find Your Cherry.*

---

## Project

GarageCherries is a modern alternative to platforms like Hemmings and ClassicCars.com. The name comes from "cherry" — enthusiast slang for a car in perfect, pristine condition.

**Target audience:**
- Classic car dealers (primary revenue source — monthly subscriptions)
- Private sellers with 1–3 cars to sell (one-time listing fee)
- Buyers and collectors searching for specific vehicles

**Competitive edge:**
- Lower cost than every major competitor ($49–$199/mo vs. $450–$2,000/mo on AutoTrader)
- No seller commissions — ever
- Five built-in AI features no competitor offers
- Modern mobile-first design

**Revenue streams:** Dealer subscriptions, private seller listing fees, featured listing upgrades, homepage spotlights. Long-term: auction buyer fees, financing/insurance/shipping referrals.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Breaking changes from earlier versions — see Rules below |
| Language | TypeScript | |
| Database | Supabase (PostgreSQL) | Row Level Security on all tables |
| Auth | Supabase Auth | Dealer login only; no buyer accounts yet |
| Storage | Supabase Storage | `car-images` bucket for listing photos |
| AI | Anthropic Claude (`claude-opus-4-8`) | 5 features: Smart Search, Listing Writer, Price Assessment, Inquiry Reply, Similar Cars |
| Email | Resend | Buyer inquiry emails to dealers |
| Styling | Tailwind CSS | |
| Hosting | TBD (Vercel recommended) | |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Anthropic API key
- A Resend API key

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
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
```

### Database Setup

Run the SQL files in order in your Supabase project's SQL editor:

```
supabase/schema.sql                        # Core tables + RLS policies
supabase/migrations/metrics_tables.sql    # listing_views + inquiries analytics tables
supabase/storage-policies.sql             # car-images bucket RLS
supabase/seed.sql                         # Optional: sample dealers and listings
```

### Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

All tables have Row Level Security enabled. Public data is readable by anyone; writes are restricted by auth rules.

### `dealers`
Dealer profiles. One row per dealership, `id` matches the Supabase Auth `uid`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Matches Supabase Auth UID |
| `slug` | text unique | URL slug, e.g. `fast-lane-classic-cars` |
| `name` | text | |
| `phone`, `email` | text | |
| `location`, `state` | text | City and 2-letter state |
| `address`, `zip` | text | Full address for map embed |
| `description` | text | Shown on public dealer profile |
| `specialties` | text[] | e.g. `['Muscle Cars', 'Mopar']` |
| `since` | integer | Founding year |
| `logo` | text | Path to logo file in `/public/dealers/` |
| `website` | text | |

**RLS:** Public select. Dealers can update their own row only (`auth.uid()::text = id`).

### `cars`
Vehicle listings. Every public listing lives here.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `slug` | text unique | URL slug |
| `title` | text | e.g. `1969 Dodge Charger R/T` |
| `year`, `make`, `model` | integer / text | |
| `price` | integer | 0 = "Call for price" |
| `mileage` | integer | |
| `condition` | text | `Excellent`, `Good`, `Fair`, `Project` |
| `body_style` | text | |
| `transmission` | text | `Automatic` or `Manual` |
| `engine`, `displacement`, `cylinders` | text / integer | |
| `horsepower`, `torque` | integer | |
| `forced_induction`, `fuel_type`, `drive_type`, `num_speeds` | text / integer | |
| `color`, `interior_color`, `seat_material`, `seating_type` | text | |
| `images` | text[] | Public URLs from Supabase Storage |
| `options` | text[] | e.g. `['Power Steering', 'A/C']` |
| `description` | text | Short summary |
| `description_paragraphs` | text[] | Rich multi-paragraph description |
| `headline` | text | Bold marketing headline |
| `hobby_segment`, `lot_number`, `rear_wheel_spec`, `doors` | text / integer | Optional detail fields |
| `seller_id` | text FK → dealers | |
| `seller_name`, `seller_phone` | text | Denormalized for performance |
| `featured` | boolean | Appears on homepage + search top |
| `listed_at` | text | Display date (YYYY-MM-DD) |

**RLS:** Public select. Dealers can insert/update/delete their own cars only (`auth.uid()::text = seller_id`).

### `listing_views`
Deduplicated view tracking — one row per unique IP per listing per day.

| Column | Type | Notes |
|---|---|---|
| `listing_id` | text | References `cars.id` |
| `dealer_id` | text | References `dealers.id` |
| `ip_hash` | text | Hashed IP for deduplication |
| `viewed_at` | timestamptz | |

**RLS:** Service role only — written via API route, never exposed to the client.

### `inquiries`
Buyer contact form submissions stored for the dealer dashboard.

| Column | Type | Notes |
|---|---|---|
| `listing_id` | text | |
| `dealer_id` | text | |
| `buyer_name`, `buyer_email`, `buyer_phone` | text | |
| `message` | text | |
| `read` | boolean | |

**RLS:** Service role only — written and read via API routes.

### `dealer_stats` (view)
Aggregated metrics view: listing count and 30-day inquiry count per dealer.

---

## Important Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Homepage — featured listings, browse by style/make |
| `/listings` | `app/listings/page.tsx` | Browse all listings with filter sidebar |
| `/listings/[make]` | `app/listings/[...segments]/page.tsx` | Make page, e.g. `/listings/ford` |
| `/listings/[make]/[model]` | `app/listings/[...segments]/page.tsx` | Model page, e.g. `/listings/ford/mustang` |
| `/listings/[make]/[model]/[id]/[slug]` | `app/listings/[...segments]/page.tsx` | Listing detail page |
| `/dealers` | `app/dealers/page.tsx` | Dealer directory |
| `/dealers/[slug]` | `app/dealers/[slug]/page.tsx` | Dealer profile + live inventory |
| `/dealer/login` | `app/dealer/login/page.tsx` | Dealer auth (Supabase Auth) |
| `/dealer/dashboard` | `app/dealer/dashboard/page.tsx` | Dealer dashboard (protected) |
| `/pricing` | `app/pricing/page.tsx` | Pricing plans — static page |
| `/sell` | `app/sell/page.tsx` | Private seller listing form — UI only, no backend yet |
| `/sitemap.xml` | `app/sitemap.ts` | Auto-generated XML sitemap from live DB |

### Key API Routes

| Route | Purpose |
|---|---|
| `POST /api/ai/smart-search` | Translates natural language into filter params |
| `POST /api/ai/listing-writer` | Generates listing description from specs |
| `POST /api/ai/valuation` | AI price assessment for a listing |
| `POST /api/ai/inquiry-reply` | Drafts a dealer reply to a buyer message |
| `POST /api/ai/similar-cars` | Recommends similar listings |
| `POST /api/inquire` | Submits buyer contact form → Resend email + DB insert |
| `POST /api/track-view` | Records a deduplicated listing view |
| `GET /api/dealer/metrics` | Returns dashboard metrics for the authenticated dealer |
| `POST /api/dealer/settings` | Saves dealer profile changes |

---

## Rules

### Next.js 16
This project uses **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` — do not rely on training data or older documentation. Heed all deprecation notices.

### Data Layer
All public data fetching goes through `lib/db.ts`. Do not import `CARS` or `DEALERS` arrays — they no longer exist. Use `fetchCars()`, `fetchCar()`, `fetchDealer()`, `fetchDealerById()`, or `fetchDealers()`.

### Supabase Clients
- **Server components and API routes:** import from `@/lib/supabase/server` — use `createClient()` for auth-aware queries, `createAdminClient()` to bypass RLS.
- **Client components:** import from `@/lib/supabase/client` — browser client only, never use the admin client here.

### Car Data Shape
The database uses `snake_case` column names (`body_style`, `seller_id`, etc.). The `Car` TypeScript type uses `camelCase` (`bodyStyle`, `sellerId`). The `adaptCar()` function in `lib/db.ts` handles this mapping — always go through it, never map manually in page files.

### RLS
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. The admin client (`createAdminClient`) is server-side only and bypasses all RLS — use it only in API routes for analytics writes (`listing_views`, `inquiries`).

### No Seller Commissions
This is a core business rule. GarageCherries charges subscription/listing fees only. Do not add any commission logic to checkout or payment flows.

---

## Project Structure

```
app/
  page.tsx                         # Homepage
  listings/
    page.tsx                       # Browse + filter
    [...segments]/page.tsx         # Make, model, detail (catch-all)
  dealers/
    page.tsx                       # Dealer directory
    [slug]/page.tsx                # Dealer profile
  dealer/
    login/page.tsx                 # Dealer auth
    dashboard/page.tsx             # Dealer dashboard (protected)
  api/
    ai/                            # Claude-powered endpoints
    dealer/                        # Metrics + settings
    inquire/route.ts               # Buyer contact → email
    track-view/route.ts            # View tracking
  pricing/page.tsx
  sell/page.tsx
  sitemap.ts
  robots.ts

components/                        # Shared UI components
lib/
  db.ts                            # All async Supabase data functions
  data.ts                          # Pure utilities (formatPrice, toSegment, etc.)
  types.ts                         # TypeScript interfaces + filter constants
  supabase/
    client.ts                      # Browser client
    server.ts                      # Server client + admin client

supabase/
  schema.sql                       # Core tables + RLS
  migrations/metrics_tables.sql   # listing_views + inquiries
  storage-policies.sql            # car-images bucket
  seed.sql                         # Sample data

public/
  cars/                            # Local car photos
  dealers/                         # Dealer logos
```

---

## Contact

Derek Johnson — derek_ljohnson@yahoo.com
