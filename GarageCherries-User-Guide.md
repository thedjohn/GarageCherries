# GarageCherries — User Guide

## Table of Contents
1. [Buyers](#buyers)
2. [Dealers](#dealers)
3. [Advertisers](#advertisers)
4. [Admin / Site Owner](#admin--site-owner)

---

## Buyers

Buyers are anyone browsing the site looking to purchase a classic car. No account is required to browse, but creating one unlocks watchlists, alerts, and the offer system.

### Browsing Without an Account
- Visit `/listings` to browse all available cars
- Use the filter bar to narrow by make, model, year range, price range, condition, body style, transmission, and state
- Click any listing card to view the full detail page with photos, specs, description, and dealer info
- Visit `/cars` to browse the Classic Car Encyclopedia — detailed guides on 20 popular models including history, specs, buying tips, and price ranges
- Visit `/guides` to read buyer's guides covering inspection, negotiation, red flags, shipping, and more
- Visit `/events` to browse the 2026 classic car show calendar
- Visit `/reports` to view live market data — average prices by make, condition breakdown, and market commentary

### Creating a Buyer Account
1. Go to `/account/signup`
2. Enter your email address and choose a password
3. Verify your email via the confirmation link sent to your inbox
4. You are now logged in as a buyer

### Watchlist
- On any listing detail page, click **Add to Watchlist** to save a car
- View all saved cars at `/account/watchlist`
- You will receive an email notification if the price drops on a watched car
- Remove cars from the watchlist at any time from the watchlist page

### Car Alerts
- Go to `/account/alerts` to set up a saved search
- Choose make, model, year range, price range, and condition
- When a dealer lists a new car matching your criteria, you receive an email notification automatically
- You can have multiple active alerts and delete them at any time

### Making an Offer
- On any listing detail page, click **Make an Offer** (requires login)
- Enter your offer amount, name, email, and an optional message to the dealer
- Your offer is sent to the dealer via email and saved in the system
- The dealer will contact you directly at your email to accept, counter, or decline

### Contacting a Dealer
- On any listing detail page, use the **Contact Seller** form to send a message directly
- Alternatively, call the dealer using the phone number shown on the listing
- Click the dealer's name to visit their full profile and see all their inventory

### Writing a Dealer Review
- Visit a dealer's profile page at `/dealers/[dealer-name]`
- Scroll to the **Buyer Reviews** section at the bottom
- Click **Write a Review**, select a star rating (1–5), add your name and comments
- Reviews are visible to all site visitors immediately after submission
- Requires a buyer account to submit

### Financing Calculator
- On any listing detail page, scroll below the specs section
- The **Financing Calculator** accordion shows an estimated monthly payment based on the asking price
- Adjust the down payment (0–50%), interest rate (3–15%), and loan term (24–84 months) using the sliders
- The calculator shows total interest paid and total cost — no data is sent anywhere, all math is local

---

## Dealers

Dealers list classic cars for sale and manage their inventory through a private dashboard.

### Creating a Dealer Account
Dealer accounts are currently created manually by the site owner. Contact the admin to be set up with:
- A dealer profile (name, location, description, specialties, logo)
- Login credentials for the dealer dashboard

Once set up, log in at `/dealer/login`.

### Dealer Dashboard Overview
The dashboard at `/dealer/dashboard` has four tabs:
- **Inventory** — all your active and sold listings
- **Inquiries** — buyer messages and contact requests
- **Analytics** — views, inquiries, and performance metrics
- **Settings** — update your dealer profile

### Adding a Listing
1. From the Inventory tab, click **Add Vehicle**
2. Fill in all fields:
   - Year, Make, Model, Mileage, Condition
   - Body Style, Engine, Transmission, Color
   - Price, Description, Location, State
3. Upload photos by clicking the photo upload area (supports multiple images; drag to reorder)
4. Toggle **Featured** on to highlight the listing (premium feature)
5. Click **Add Vehicle** — the listing goes live immediately on the public site

### Editing a Listing
1. From the Inventory tab, find the listing and click **Edit**
2. Make changes to any fields including price, description, or photos
3. Click **Save Changes** — updates go live immediately
4. If you change the price, the change is automatically recorded in the price history (visible to buyers on the listing page)

### Marking a Listing as Sold
1. From the Inventory tab, find the listing and click **Mark Sold**
2. Confirm in the dialog that appears
3. The listing is marked as sold and removed from active inventory
4. The sold record is archived for market data purposes

### Deleting a Listing
1. From the Inventory tab, click the **✕** button on a listing
2. Confirm the deletion in the dialog
3. The listing is permanently removed — this cannot be undone

### Responding to Inquiries
- Buyer messages appear in the **Inquiries** tab
- Click any inquiry to view the full message and buyer contact details
- Reply directly to the buyer via email — the dashboard shows their email address
- Use the **Message Watchers** feature to notify everyone watching a specific car about price drops or updates

### Viewing Analytics
The **Analytics** tab shows:
- Total listing views over the past 30 days vs. the prior period
- Total buyer inquiries over the past 30 days
- Average days on market for your inventory
- Watcher counts per listing (how many buyers have it saved)

### Updating Your Dealer Profile
From the **Settings** tab you can update:
- Dealership name, phone, email, website
- Address, city, state, zip
- Description (shown on your public profile)
- Specialties (e.g. "Muscle Cars", "Restorations", "GM Vehicles")
- Logo image

### Dealer Badge
Your dealer profile automatically displays a badge based on your active listing count:
- **Bronze** — 5 or more active listings
- **Silver** — 15 or more active listings
- **Gold** — 30 or more active listings

Badges are displayed on your public profile and on the dealer directory.

### Your Public Profile
Your dealer profile is publicly visible at `/dealers/[your-slug]`. It shows:
- Your name, logo, location, description, and specialties
- All active listings
- Buyer reviews and star rating
- Your dealer badge tier

---

## Advertisers

Advertisers are businesses that purchase display ad space on GarageCherries (e.g. classic car insurers, parts suppliers, restoration shops, transport companies).

### Creating an Advertiser Account
1. Go to `/advertiser/signup`
2. Enter your business name, contact email, and password
3. Your account is created immediately — no manual approval required

Log in at `/advertiser/login`.

### Advertiser Dashboard
The dashboard at `/advertiser/dashboard` shows:
- All your active and paused ad campaigns
- Impressions and clicks for each ad
- Click-through rate (CTR)
- Option to create new ads or edit existing ones

### Creating an Ad
1. From the dashboard, click **Create New Ad**
2. Fill in:
   - **Ad Title** — headline shown in the ad
   - **Description** — supporting copy (1–2 sentences)
   - **Destination URL** — where clicking the ad goes
   - **Image URL** — the ad creative image
   - **State Targeting** (optional) — show the ad only to visitors in specific states
3. Submit — the ad goes into the rotation immediately

### How Ads Are Displayed
- Ads appear on listing detail pages in the sidebar
- State-targeted ads only show when a listing's location matches your targeted state
- Impressions are counted each time an ad is shown
- Clicks are counted each time a visitor clicks through to your URL
- Multiple ads rotate through available slots

### Billing
Ad billing is currently handled manually — contact the site owner to arrange payment terms. Stripe integration for self-serve billing is planned.

---

## Admin / Site Owner

The admin is the site owner managing the overall platform.

### Environment Variables
The following must be set in Vercel (Settings → Environment Variables) for the site to function:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `RESEND_API_KEY` | Resend email API key |
| `ADMIN_API_SECRET` | Secret string to protect email campaign endpoints |

### Database
The database is hosted on Supabase. Access the SQL editor and table browser at supabase.com under your project.

Key tables:
- `cars` — all listings
- `dealers` — dealer profiles
- `listing_views` — view tracking per listing
- `watchlists` — buyer watchlist entries
- `saved_searches` — buyer car alert configurations
- `messages` — buyer inquiry messages
- `offers` — buyer offers on listings
- `dealer_reviews` — buyer reviews of dealers
- `price_history` — price change log per listing
- `advertisers` — advertiser accounts
- `ads` — ad creatives and targeting

### Running Email Campaigns
Email campaigns are triggered manually from `/admin/email`. This page is not linked publicly — bookmark it.

**To send a campaign:**
1. Go to `/admin/email`
2. Enter your `ADMIN_API_SECRET` in the field at the top
3. Click **Send** next to the campaign you want to trigger:
   - **Weekly Fresh Listings Digest** — sends new listings from the past 7 days to all watchlist users
   - **Price Drop Notifications** — sends price reduction alerts to watchers of affected cars
   - **Monthly Dealer Performance Reports** — sends each dealer their monthly stats

### Adding a New Dealer
Currently dealers are added manually:
1. Go to Supabase Dashboard → Table Editor → `dealers`
2. Insert a new row with: `id` (must match the dealer's Supabase auth user ID), `slug`, `name`, `email`, `phone`, `location`, `state`, `description`, `specialties`
3. Create their auth account at Supabase Dashboard → Authentication → Users → Invite User
4. Send the dealer their login credentials for `/dealer/login`

### Featuring a Listing
To manually feature a listing (highlight it on the homepage and search results):
1. Go to Supabase → Table Editor → `cars`
2. Find the listing and set `featured = true`

Or the dealer can toggle Featured themselves when adding or editing a listing from their dashboard.

### Monitoring the Site
- **Vercel Dashboard** — deployment status, build logs, function logs at vercel.com
- **Supabase Dashboard** — database usage, API request volume, auth users at supabase.com
- **Resend Dashboard** — email delivery rates, bounces, opens at resend.com

### Key URLs
| URL | Purpose |
|---|---|
| `/listings` | Public car listings |
| `/dealers` | Public dealer directory |
| `/cars` | Classic Car Encyclopedia |
| `/guides` | Buyer's Guides |
| `/events` | Car Show Calendar |
| `/reports` | Market Report |
| `/dealer/login` | Dealer login |
| `/dealer/dashboard` | Dealer management |
| `/advertiser/login` | Advertiser login |
| `/advertiser/dashboard` | Ad campaign management |
| `/admin/email` | Email campaign trigger (admin only) |
| `/account/login` | Buyer login |
| `/account/signup` | Buyer registration |
| `/account/watchlist` | Buyer saved cars |
| `/account/alerts` | Buyer car alerts |
| `/sell` | Sell your car landing page |
