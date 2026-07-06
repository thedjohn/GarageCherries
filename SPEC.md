# GarageCherries — Master Specification

> Generated 2026-07-02 from a full read of every route, page, and library file. Last updated 2026-07-06 (promo campaign, homepage hero copy, E2E test fixes, GA4, Vercel redeploy, custom domain, promo expiry enforcement, pricing page advertiser section).
> Stack: Next.js 16.2.9 · React 19 · Supabase (Auth + Postgres + Storage) · Resend (email) · Cloudflare Turnstile (CAPTCHA) · NHTSA VIN API · Tailwind CSS 4 · Vitest + Playwright

---

## 1. User Roles & Permissions Matrix

### Role Definitions

| Role | Where Stored | Notes |
|------|-------------|-------|
| **buyer** | Inferred (auth.users + watchlist/conversations) | Any authenticated user who has watchlisted or messaged |
| **private seller** | Inferred (auth.users + listings.seller_id where no dealers row) | Authenticated user who has posted listings |
| **dealer** | `dealers` table, row keyed by `user.id` | Has `plan` and `beta_expires_at` fields |
| **advertiser** | `advertisers` table, keyed by `user_id` | Has `tier`, `trial_ends_at`, `radius_miles` |
| **support** | `admin_users.role = 'support'` | Lowest admin tier |
| **moderator** | `admin_users.role = 'moderator'` | Mid tier |
| **admin** | `admin_users.role = 'admin'` | High tier |
| **superadmin** | `admin_users.role = 'superadmin'` | Highest tier, all capabilities |

### Role Hierarchy (from `lib/admin.ts`)

```
support < moderator < admin < superadmin
```

### Capabilities Matrix

| Capability | Buyer | Private Seller | Dealer | Advertiser | Support | Moderator | Admin | Superadmin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Browse listings (public) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View listing detail (public) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit listing (with CAPTCHA) | — | ✓ | ✓ | — | — | — | — | — |
| Post up to 10 listings (private) | — | ✓ (capped) | — | — | — | — | — | — |
| Post unlimited listings (dealer) | — | — | ✓ | — | — | — | — | — |
| Upload listing images | — | ✓ | ✓ | — | — | — | — | — |
| Edit own listing (price/desc/images) | — | ✓ | ✓ | — | — | — | — | — |
| Delete own listing | — | ✓ | ✓ | — | — | — | — | — |
| Mark own listing as sold | — | ✓ | ✓ | — | — | — | — | — |
| Resubmit rejected listing (with note) | — | ✓ | ✓ | — | — | — | — | — |
| Send inquiry (CAPTCHA) | ✓ | ✓ | — | — | — | — | — | — |
| Start conversation | ✓ | ✓ | — | — | — | — | — | — |
| Reply to conversation | ✓ | ✓ | — | — | — | — | — | — |
| Report a message | ✓ | ✓ | — | — | — | — | — | — |
| Add/remove watchlist | ✓ | ✓ | — | — | — | — | — | — |
| Create/manage saved searches (alerts) | ✓ | ✓ | — | — | — | — | — | — |
| Make offer on a listing | ✓ | ✓ | — | — | — | — | — | — |
| Leave dealer review | ✓ | ✓ | — | — | — | — | — | — |
| Apply for dealer account | ✓ | ✓ | — | — | — | — | — | — |
| Access dealer dashboard | — | — | ✓ | — | — | — | — | — |
| Add/edit dealer inventory directly | — | — | ✓ | — | — | — | — | — |
| View dealer metrics/inquiries | — | — | ✓ | — | — | — | — | — |
| Message watchlist users about their car | — | — | ✓ | — | — | — | — | — |
| Update dealer profile settings | — | — | ✓ | — | — | — | — | — |
| Signup as advertiser | — | — | — | (signup) | — | — | — | — |
| Create/edit/delete own ads | — | — | — | ✓ | — | — | — | — |
| Update account profile (name/phone) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View all listings in admin | — | — | — | — | — | ✓ | ✓ | ✓ |
| Approve/reject listings | — | — | — | — | — | ✓ | ✓ | ✓ |
| Edit any listing content | — | — | — | — | — | — | ✓ | ✓ |
| Delete any listing | — | — | — | — | — | — | — | ✓ |
| View all users | — | — | — | — | — | ✓ | ✓ | ✓ |
| Suspend user | — | — | — | — | — | ✓* | ✓ | ✓ |
| Unsuspend user | — | — | — | — | — | — | ✓ | ✓ |
| Edit user name/email | — | — | — | — | — | — | ✓ | ✓ |
| Promote seller to dealer | — | — | — | — | — | — | — | ✓ |
| Delete user account + data | — | — | — | — | — | — | — | ✓ |
| Create dealer account directly | — | — | — | — | — | — | — | ✓ |
| View dealer applications | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| Approve/reject dealer applications | — | — | — | — | — | — | ✓ | ✓ |
| Dismiss reported messages | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| View admin team | — | — | — | — | — | — | — | ✓ |
| Add/remove team members | — | — | — | — | — | — | — | ✓ |
| Clean up orphaned storage images | — | — | — | — | — | — | — | ✓ |
| Trigger email digest/price-drop jobs | — | — | — | — | — | — | — | (API secret) |

\* Moderators can suspend non-dealer users only; dealers require admin or above.

---

## 2. User Flows

### 2.1 New User Browsing and Buying

1. Land on homepage (`/`) — sees featured listings, value props, search widget.
2. Browse `/listings` — filter by make, model, year range, price, condition, body style, transmission, state.
3. Navigate `cars/[make]` or `cars/[make]/[model]` to browse by make/model.
4. Click a listing → `/listings/[make]/[model]/[id]/[slug]`.
5. Listing detail page fires `POST /api/track-view` (hashed IP deduplication per listing per day).
6. Guest sees inquiry form; fills name, email, phone, message, solves Turnstile CAPTCHA.
7. `POST /api/inquire` → stores inquiry in DB, emails seller directly with reply-to buyer.
8. To make an offer, user submits `POST /api/offers` (auth optional) → emails dealer + buyer confirmation.
9. To watchlist, user must be logged in → `POST /api/watchlist` toggles watch; sets `allow_dealer_contact = true` by default.
10. Authenticated user can create a saved search alert from the filters on `/listings` — up to 10 per account.
11. When a matching new listing is approved, system emails the user with match details.
12. User can manage watchlist and alerts at `/account` (tabs: Watchlist, Messages, Alerts, Listings, Settings).

### 2.2 Private Seller Posting a Listing

1. Navigate to `/sell`.
2. If not logged in, `SellGate` component shown — redirects to `/account/signup?return=/sell` or `/account/login?return=/sell`.
3. Authenticated user sees `SellForm`:
   a. Fills vehicle info: year (required, 1900–2030), make (dropdown), model (required), mileage (optional), body style, condition (required), engine, transmission, color, price (required), description (required).
   a2. Optionally enters VIN and clicks "Verify VIN" — calls `POST /api/cars/verify-vin` inline; result shown as color-coded badge (green=verified, yellow=partial, blue=pre-1981, red=invalid). VIN and verification status stored with listing on submit.
   b. Fills location: city (required), state (required, validated against US state codes).
   c. Fills contact: seller name (required), phone (required, auto-formatted), email (required).
   d. Uploads photos (up to 30): clicks "Add photos" → files stored as `File` objects in component state with local `URL.createObjectURL()` previews — nothing uploaded yet. Upload happens on submit (see step 4).
4. On submit, images are uploaded first — directly from the browser to Supabase Storage (`listing-images` bucket, `cars/private/` path) using the Supabase JS client. Public URLs are collected, then `POST /api/listings/submit` (multipart) is sent with all fields + `imageUrls` JSON array. The `POST /api/listings/upload-image` signed-URL route exists but is not used by this form.
5. API checks: rate limit (5/hour/IP), Turnstile CAPTCHA, listing limit (10 active if not dealer, unless `BETA_MODE=true`), beta expiry for dealers.
6. Listing inserted with `status: 'pending'`, `featured: false`.
7. Seller sees "Listing Submitted" confirmation screen.
8. Admin reviews listing at `/admin` (Listings tab).
9. On approval: `listed_at` set to now, seller emailed "Your listing is live", alert matching triggered via `POST /api/alerts/match`.
10. On rejection: `rejection_reason` stored, seller emailed "Your listing needs attention" with reason.
11. Seller can edit listing at `/account?tab=listings`: editable fields are price, mileage, description, seller contact info, images. Editing an approved listing sends it back to pending. Editing a rejected listing requires `resubmission_note`.

### 2.3 Dealer Applying and Managing Inventory

1. Navigate to `/dealer/apply` — fills application form (name, email, phone, dealer name, address, city, state, zip, website, specialties, description) + Turnstile.
2. `POST /api/dealer/apply` — rate limit 3/hour/IP; checks for duplicate pending/approved application or existing dealer; inserts into `dealer_applications`.
3. Admin reviews at `/admin` (Applications tab) — only admin/superadmin can approve/reject.
4. On approval:
   - Auth user created (email confirmed, no password).
   - Dealer row inserted with `plan: 'beta'`; `beta_expires_at` = `2026-10-31` for applications submitted before Aug 1 2026 (250th promo period), otherwise `now + 6 months`.
   - Password reset link generated and emailed to dealer.
5. Dealer sets password via link, logs into `/dealer/dashboard`.
6. Dashboard tabs: Overview (stats), Inventory, Inquiries, Settings.
7. **Add inventory**: clicks "+ Add vehicle" → `VehicleModal` with rich fields (year, make, model, mileage, condition, body style, engine details, HP, torque, cylinders, displacement, forced induction, fuel type, transmission, speeds, drive type, exterior/interior color, seat material, seating type, price, description, photos). Dealer listings bypass review — inserted with `status: 'approved'` immediately.
8. **Edit inventory**: same modal, pre-filled. If price drops, `price_history` row inserted + `POST /api/notify-watchers` fired.
9. **Delete inventory**: `DELETE /api/listings/[id]` — removes images from storage, deletes conversations.
10. **Mark sold**: `POST /api/cars/sold` — sets `is_sold: true`, notifies watchlist users.
11. **Message watchers**: dealer sends message to opted-in watchers via `POST /api/dealer/message-watchers` — one-time per watcher, email sent, `dealer_messaged_at` recorded.
12. **Update profile**: `POST /api/dealer/settings` — updates `dealers` table fields (name, phone, address, location, state, zip, description, website, specialties).
13. **Export inventory**: clicks "Export CSV" or "Export JSON" → `GET /api/dealer/export?format=csv|json` → triggers authenticated download of all dealer listings.
13. **Metrics**: `GET /api/dealer/metrics` returns views (30d + delta), inquiries (30d + delta), avg days on market, recent inquiries.
14. Beta expiry warning shown at ≤30 days remaining.

### 2.4 Advertiser Signing Up and Creating an Ad

1. Navigate to `/advertise` page (public marketing page) or `/advertiser/signup`.
2. `POST /api/advertiser/signup` — creates Supabase auth user + `advertisers` row with 14-day trial, chosen tier (starter/metro/regional/statewide), radius_miles derived from tier.
3. Login at `/advertiser/login`.
4. Access dashboard at `/advertiser/dashboard`.
5. Create ad via `POST /api/advertiser/ads` with headline, body copy, CTA label/URL, phone, logo URL, photo URL, rating, review count.
6. If trial expired, ad creation blocked with `TRIAL_EXPIRED` error.
7. `GET /api/ads/serve?state=XX` picks a random eligible advertiser whose trial is valid and whose tier covers that state → returns ad with least impressions from their active ads.
8. Every serve logs an `ad_events` impression row + increments `ads.impressions` via RPC.
9. Click events: `POST /api/ads/track` → logs `ad_events` click row + increments `ads.clicks` via RPC.
10. Advertiser can edit/delete ads via `POST/DELETE /api/advertiser/ads`.

### 2.5 Admin Moderating Content

1. Admin navigates to `/admin` — access gated by `admin_users` row.
2. **Role resolved first** — before any data loads, the page calls `GET /api/admin/team` to read the acting user's role.
3. **Support role scoping** (fixed 2026-07-02): support users are redirected to the Reported tab automatically; only reported content is loaded. They see only the Reported tab; Listings, Messages, and Users tabs are hidden from the nav. Attempting to access those tabs directly would still require moderator+ at the API layer.
4. **Listings tab** (moderator+): sees all listings with pending/approved/rejected counts. Can approve, reject (with reason from preset list or custom), edit (admin+), delete (superadmin only). Hidden from support.
5. **Messages tab** (moderator+): views all conversations (buyer/seller/listing title/timestamp). Hidden from support — support cannot browse all private conversations.
6. **Reported tab** (all admin roles including support): sees flagged messages. Can dismiss (clears `reported` flag) via `DELETE /api/messages/[id]/report`. This is the primary job of the support tier.
7. **Users tab** (moderator+): search/filter by role or status. Can view seller listings, suspend (moderator+ for non-dealers), unsuspend (admin+), edit name/email (admin+), promote to dealer (superadmin), delete account (superadmin). Hidden from support.
8. **Applications tab** (admin+): review dealer applications, approve or reject with optional note.
9. **Team tab** (superadmin only): view team members, add members by email with role selection, remove members.

### 2.6 Buyer Messaging a Seller

1. On listing detail page, buyer clicks "Contact Seller" (must be logged in).
2. `POST /api/conversations` — rate limit 20/hour/IP; suspension check; finds/creates conversation; inserts message; fires Supabase Realtime broadcast to seller's `notifications:${sellerId}` channel.
3. Seller receives real-time notification (if subscribed via `messenger-context`).
4. Either party opens `/messages` or the in-page chat widget.
5. `GET /api/conversations/[id]/messages` — verifies participant (buyer or seller); returns message list.
6. `POST /api/conversations/[id]/messages` — suspension check; verifies participant; inserts message; updates `last_message_at`; broadcasts to recipient.
7. Either party can flag a message via `PATCH /api/messages/[id]/report` (sets `reported: true`).
8. Admin sees reported messages in Reported tab; can dismiss via `DELETE /api/messages/[id]/report`.

### 2.7 Price Drop / Sold Notifications

**Price Drop (immediate)**:
1. Seller edits listing (`PATCH /api/listings/[id]`) and lowers price.
2. API detects `newPrice < oldPrice` → inserts `price_history` row → fire-and-forget `POST /api/notify-watchers`.
3. `notify-watchers` fetches car details and all watchers → emails each watcher with old/new price comparison.

**Price Drop (weekly batch)**:
- `POST /api/email/price-drops` (Bearer `ADMIN_API_SECRET`) — finds all `price_history` rows from past 7 days → groups by watcher → sends digest email per user.

**Sold Notification**:
1. Dealer calls `POST /api/cars/sold` → sets `is_sold: true`.
2. Fire-and-forget: fetches all watchlist users → emails each: "{Car} has sold — browse similar listings."

---

## 3. Database Tables & Fields

All tables are in Supabase Postgres. Fields derived from code reads; no migration files were read, so nullable/non-null constraints are inferred from code usage (nullable = field sometimes null-checked or defaulted).

### `listings`

| Field | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid / text | Primary key; `crypto.randomUUID()` for private sellers; `${dealerId}-${Date.now()}` for dealers |
| `slug` | text | URL-safe slug, e.g. `1969-dodge-charger-1234567890` |
| `title` | text | Auto-computed: `${year} ${make} ${model}` |
| `year` | integer | |
| `make` | text | |
| `model` | text | |
| `price` | integer | 0 = "Call for price" |
| `mileage` | integer \| null | |
| `location` | text | City |
| `state` | text | 2-char state code |
| `condition` | text | Excellent / Good / Fair / Project |
| `body_style` | text | Coupe / Convertible / Sedan / etc. |
| `transmission` | text | Manual / Automatic |
| `engine` | text \| null | Free text, e.g. "396 V8" |
| `color` | text \| null | Exterior color |
| `interior_color` | text \| null | |
| `seat_material` | text \| null | Leather / Cloth / Vinyl / Suede / Alcantara |
| `seating_type` | text \| null | Bucket / Bench / Sport Bucket |
| `horsepower` | integer \| null | Dealer only |
| `torque` | integer \| null | Dealer only |
| `cylinders` | integer \| null | Dealer only |
| `displacement` | text \| null | Dealer only, e.g. "6.2L" |
| `forced_induction` | text \| null | Supercharged / Turbocharged / etc. |
| `fuel_type` | text \| null | Gasoline / Diesel / Electric / Hybrid / Flex Fuel |
| `num_speeds` | integer \| null | Dealer only |
| `drive_type` | text \| null | RWD / FWD / AWD / 4WD |
| `images` | text[] | Array of Supabase Storage public URLs |
| `description` | text | |
| `headline` | text \| null | Rich listing headline (seed data / future use) |
| `hobby_segment` | text \| null | e.g. "Muscle Car" |
| `doors` | integer \| null | |
| `rear_wheel_spec` | text \| null | |
| `options` | text[] \| null | |
| `description_paragraphs` | text[] \| null | |
| `lot_number` | text \| null | |
| `vin` | text \| null | |
| `vin_verified` | boolean | Default false |
| `vin_make` | text \| null | From NHTSA |
| `vin_model` | text \| null | From NHTSA |
| `vin_year` | integer \| null | From NHTSA |
| `seller_id` | uuid \| null | FK to auth.users |
| `seller_name` | text | |
| `seller_phone` | text | |
| `seller_email` | text | |
| `featured` | boolean | Default false |
| `status` | text | pending / approved / rejected |
| `rejection_reason` | text \| null | |
| `resubmission_note` | text \| null | Seller's note on what was fixed |
| `resubmission_count` | integer | Default 0 |
| `listed_at` | **text** \| null | Set on approval; despite the name/prior docs this is actually stored as text, not timestamptz — confirmed 2026-07-02 when a migration's date-arithmetic UPDATE failed with `operator does not exist: text + interval` until an explicit `::timestamptz` cast was added |
| `is_sold` | boolean | Default false |
| `sold_at` | timestamptz \| null | |
| `sold_price` | integer \| null | |
| `expires_at` | timestamptz \| null | Added 2026-07-02. Set to `listed_at + 30 days` on approval; listings past this date are excluded from all public browse/search queries (still viewable at their direct URL). Seller can push it out another 30 days via `POST /api/listings/[id]/renew`. |
| `is_feed_managed` | boolean | Added 2026-07-02, default false. Forward-compat flag for the not-yet-built dealer data-feed/bulk-import sync — nothing sets this true yet. Once that feature exists, feed-managed listings should have `expires_at` driven by the sync instead of manual renewal, and are meant to skip the renew UI entirely. |
| `renewal_reminder_sent_at` | timestamptz \| null | Added 2026-07-03. Set when a renewal reminder email is sent; prevents duplicate reminder sends. |
| `views` | integer | Used in dealer-report email (may be a denormalized column) |
| `created_at` | timestamptz | Auto-managed by Supabase |

### `dealers`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Same as auth.users.id |
| `slug` | text | URL-safe name |
| `name` | text | Dealership name |
| `phone` | text \| null | |
| `email` | text \| null | |
| `address` | text \| null | Street address |
| `location` | text | City |
| `state` | text | 2-char |
| `zip` | text \| null | |
| `description` | text \| null | |
| `website` | text \| null | |
| `specialties` | text[] | |
| `since` | integer \| null | Year established |
| `logo` | text \| null | URL |
| `plan` | text \| null | e.g. 'beta' |
| `beta_expires_at` | timestamptz \| null | Set to +6 months on approval |
| `report_opt_out` | boolean | Default false; set true via `/unsubscribe/dealer-report`; skipped by monthly report job |
| `created_at` | timestamptz | |

### `dealer_applications`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Contact name |
| `email` | text | |
| `phone` | text | |
| `dealer_name` | text | |
| `address` | text \| null | |
| `location` | text | City |
| `state` | text | 2-char |
| `zip` | text \| null | |
| `website` | text \| null | |
| `specialties` | text[] | |
| `description` | text | |
| `status` | text | pending / approved / rejected |
| `rejection_note` | text \| null | |
| `reviewed_at` | timestamptz \| null | |
| `reviewed_by` | uuid \| null | FK to auth.users (admin) |
| `created_at` | timestamptz | |

### `admin_users`

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK to auth.users; PK |
| `email` | text | Denormalized copy |
| `role` | text | support / moderator / admin / superadmin |
| `created_at` | timestamptz | |

### `suspended_users`

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK to auth.users; PK (upsert target) |
| `reason` | text \| null | |
| `suspended_by` | uuid | FK to admin_users |
| `suspended_at` | timestamptz | |

### `watchlists`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `car_id` | uuid | FK to listings.id |
| `price_at_add` | integer \| null | Price when watchlisted |
| `added_at` | timestamptz | |
| `allow_dealer_contact` | boolean | Default true; opt-in for dealer messages |
| `dealer_messaged_at` | timestamptz \| null | Set when dealer messages this watcher |
| `dealer_contact_blocked` | boolean | Default false; user can block |

### `saved_searches` (alerts)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `name` | text \| null | User-given alert name |
| `make` | text \| null | |
| `model` | text \| null | |
| `year_min` | integer \| null | |
| `year_max` | integer \| null | |
| `price_max` | integer \| null | |
| `price_min` | integer \| null | Not used in match scoring; stored only |
| `mileage_max` | integer \| null | |
| `condition` | text[] \| null | Array of conditions |
| `body_style` | text \| null | |
| `transmission` | text \| null | |
| `state` | text \| null | |
| `active` | boolean | Default true |
| `paused` | boolean | Default false |
| `last_emailed_at` | timestamptz \| null | 24h cooldown per alert |
| `last_matched_at` | timestamptz \| null | |
| `created_at` | timestamptz | |

### `alert_matches`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `saved_search_id` | uuid | FK to saved_searches |
| `car_id` | uuid | FK to listings |
| `match_score` | float | 0.0–1.0; threshold ≥ 0.7 |
| `emailed_at` | timestamptz | |
| `created_at` | timestamptz | |

### `conversations`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `listing_id` | uuid | FK to listings |
| `listing_title` | text | Denormalized |
| `buyer_id` | uuid | FK to auth.users |
| `buyer_name` | text | |
| `buyer_email` | text | |
| `seller_email` | text | |
| `last_message_at` | timestamptz | |
| `created_at` | timestamptz | |

### `messages`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK to conversations |
| `sender_id` | uuid | FK to auth.users |
| `sender_name` | text | |
| `body` | text | |
| `reported` | boolean | Default false |
| `created_at` | timestamptz | |

### `inquiries`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `listing_id` | uuid | FK to listings |
| `dealer_id` | text | Seller's user ID or 'unknown' |
| `buyer_name` | text | |
| `buyer_email` | text | |
| `buyer_phone` | text \| null | |
| `message` | text | |
| `read` | boolean | |
| `created_at` | timestamptz | |

### `offers`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `car_id` | uuid | FK to listings |
| `car_title` | text | Denormalized |
| `dealer_id` | uuid \| null | FK to dealers |
| `buyer_id` | uuid \| null | FK to auth.users (optional) |
| `buyer_email` | text | |
| `buyer_name` | text \| null | |
| `amount` | integer | Must be > 0 |
| `message` | text \| null | |
| `status` | text | pending / accepted / declined |
| `created_at` | timestamptz | |

### `price_history`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK (implicit) |
| `car_id` | uuid | FK to listings |
| `old_price` | integer | |
| `price` | integer | New (lower) price |
| `changed_at` | timestamptz | |

### `listing_views`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `listing_id` | uuid | FK to listings |
| `dealer_id` | uuid | FK to dealers |
| `ip_hash` | text | SHA-256(ip + listingId), first 16 chars |
| `viewed_at` | timestamptz | Default now() |

### `dealer_reviews`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `dealer_id` | uuid | FK to dealers |
| `reviewer_id` | uuid | FK to auth.users |
| `reviewer_name` | text \| null | |
| `rating` | integer | 1–5 |
| `review` | text \| null | |
| `created_at` | timestamptz | |

### `advertisers`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `business_name` | text | |
| `contact_name` | text \| null | |
| `phone` | text \| null | |
| `address` | text \| null | |
| `city` | text \| null | |
| `state` | text \| null | |
| `zip` | text \| null | |
| `category` | text | Default 'other' |
| `tier` | text | starter / metro / regional / statewide |
| `radius_miles` | integer | starter=15, metro=30, regional=60, statewide=9999 |
| `active` | boolean | Default true |
| `trial_ends_at` | timestamptz | 14 days from signup |
| `created_at` | timestamptz | |

### `ads`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `advertiser_id` | uuid | FK to advertisers |
| `headline` | text \| null | |
| `body_copy` | text \| null | |
| `cta_label` | text | Default 'Learn More' |
| `cta_url` | text \| null | |
| `phone` | text \| null | |
| `logo_url` | text \| null | |
| `photo_url` | text \| null | |
| `rating` | numeric \| null | |
| `review_count` | integer \| null | |
| `impressions` | integer | Incremented via `inc_ad_impressions` RPC |
| `clicks` | integer | Incremented via `inc_ad_clicks` RPC |
| `active` | boolean | Default true (inferred) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `ad_events`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `ad_id` | uuid | FK to ads |
| `event_type` | text | 'impression' / 'click' |
| `page_path` | text | |
| `geo_state` | text | |
| `created_at` | timestamptz | |

### `profiles`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK = auth.users.id |
| `full_name` | text | |
| `phone` | text | |
| `updated_at` | timestamptz | |
| `promo_expires_at` | timestamptz \| null | Set to `2026-10-31T23:59:59Z` when user signs up with `promo=250th`. Used to gate free access when paid plans launch. |

---

## 4. API Contract

### `POST /api/listings/submit`
- **Auth**: optional (sellerId = null if anonymous, but listing still accepted)
- **Rate limit**: 5 requests / IP / hour
- **Suspension check**: yes — authenticated suspended users blocked with 403 before any DB writes
- **State validation**: `state` must be a valid US state/territory code from `lib/constants.ts US_STATES` — returns 400 if invalid
- **Input** (multipart/form-data):

| Field | Required | Type | Validation |
|---|---|---|---|
| `cf-turnstile-response` | yes | string | Verified via Cloudflare |
| `year` | yes | number | Numeric |
| `make` | yes | string | From MAKES list |
| `model` | yes | string | |
| `price` | yes | number | `Number() \|\| 0` |
| `mileage` | no | number | Null if blank |
| `city` | yes | string | Stored as `location` |
| `state` | yes | string | |
| `condition` | yes | string | |
| `bodyStyle` | no | string | |
| `transmission` | no | string | |
| `engine` | no | string | Null if blank |
| `color` | no | string | Null if blank |
| `description` | yes | string | |
| `sellerName` | yes | string | |
| `sellerPhone` | yes | string | |
| `sellerEmail` | yes | string | |
| `imageUrls` | yes | JSON string | Array of Supabase URLs; capped at 20; must match our Supabase domain and `/listing-images/` path |
| `vin` | no | string | Optional; stored as-is |
| `vinVerified` | no | string | `'true'` if user verified via NHTSA; stored as `vin_verified` boolean |

- **Business rules checked**:
  - If `BETA_MODE !== 'true'` and seller is a dealer with expired `beta_expires_at` → 403 `BETA_EXPIRED`
  - If `BETA_MODE !== 'true'` and seller is NOT a dealer and has ≥ 10 pending/approved listings → 403 `LISTING_LIMIT`
- **Success**: `200 { success: true }`
- **Errors**: 400 (CAPTCHA), 403 (limit), 429 (rate limit), 500
- **Side effects**: inserts `listings` row with `status: 'pending'`; sends admin notification on rate limit hit

---

### `PATCH /api/listings/[id]`
- **Auth**: required (user session)
- **Rate limit**: none
- **Suspension check**: yes — suspended users blocked with 403 before ownership check
- **Beta expiry check**: yes — dealers with expired `beta_expires_at` blocked with 403 `BETA_EXPIRED` (respects `BETA_MODE` bypass)
- **Input** (JSON):

| Field | Required | Type | Notes |
|---|---|---|---|
| `price` | no | number | |
| `mileage` | no | number \| null | Null if blank |
| `description` | no | string | |
| `seller_name` | no | string | |
| `seller_phone` | no | string | |
| `seller_email` | no | string | |
| `images` | no | string[] | |
| `resubmission_note` | conditional | string | Required if listing status is 'rejected' |

- **Ownership**: verifies `listing.seller_id === user.id`
- **Status transitions**: rejected → pending (requires `resubmission_note`); approved → pending (any edit)
- **Success**: `200 { success: true }`
- **Side effects**: if price drops, inserts `price_history`, fires `POST /api/notify-watchers`

---

### `DELETE /api/listings/[id]`
- **Auth**: required
- **Ownership**: verifies `listing.seller_id === user.id`
- **Side effects**: removes images from `listing-images` storage bucket; deletes linked `conversations`
- **Success**: `200 { success: true }`

---

### `GET /api/listings/my`
- **Auth**: required
- **Returns**: `{ listings: Listing[] }` — all listings for current user ordered by `created_at` desc
- **Fields returned**: id, slug, title, year, make, model, price, mileage, condition, body_style, transmission, engine, color, location, state, images, description, seller_name, seller_phone, seller_email, status, rejection_reason, resubmission_note, resubmission_count, created_at, featured

---

### `POST /api/listings/upload-image`
- **Auth**: required
- **Input** (JSON): `{ fileName: string, contentType: string }`
- **Validation**: contentType used to determine extension (png/webp/jpg)
- **Returns**: `{ signedUrl, token, path, publicUrl }`
- **Side effects**: creates signed upload URL in `listing-images` bucket; client PUTs directly to Supabase

---

### `GET /api/admin/listings`
- **Auth**: required, min role: moderator
- **Query params**: `seller_id?`, `page?` (default 1), `limit?` (default 50, max 100)
- **Returns**: `{ listings: [], total, page, limit }`

---

### `PATCH /api/admin/listings`
- **Auth**: required, any admin role
- **Input** (JSON): `{ id, action?, ...fields }`
- **Without action** (edit): requires admin+; updates all listing fields except seller_id
- **With action='approve'**: requires moderator+; sets status='approved', listed_at=now, clears rejection fields; emails seller; triggers `/api/alerts/match`
- **With action='reject'**: requires moderator+; sets status='rejected', stores rejection_reason; emails seller with reason
- **Error codes**: 400 (missing id), 401 (unauthorized), 403 (forbidden), 500

---

### `DELETE /api/admin/listings`
- **Auth**: required, role: superadmin only
- **Input**: `{ id }`
- **Side effects**: removes storage images, deletes conversations, deletes listing row

---

### `GET /api/admin/users`
- **Auth**: required, min role: moderator
- **Query**: `page?`, `limit?` (default 100, max 200)
- **Returns**: rich user objects with roles array, suspended status, dealer/advertiser info, listing counts, watchlist/conversation counts

---

### `PATCH /api/admin/users`
- **Auth**: required, any admin role
- **Input**: `{ id, action, ...params }`

| action | Min role | Params |
|---|---|---|
| `suspend` | moderator | `reason?` |
| `unsuspend` | admin | — |
| `edit` | admin | `name?`, `email?`, `dealer?` |
| `promote` | superadmin | `dealer: { name, location, state }` |

---

### `DELETE /api/admin/users`
- **Auth**: required, role: superadmin
- **Input**: `{ id }`
- **Side effects**: deletes suspended_users, watchlists, saved_searches, conversations, inquiries; deletes listings + images; deletes dealer profile; deletes auth user

---

### `POST /api/admin/users`
- **Auth**: required, role: superadmin
- **Input**: `{ email, password, name?, dealerName, location?, state? }`
- **Validation**: email, password, dealerName required
- **Side effects**: creates auth user + dealers row

---

### `GET /api/admin/dealer-applications`
- **Auth**: required, any admin role
- **Returns**: `{ applications: [] }` ordered by created_at desc

---

### `PATCH /api/admin/dealer-applications`
- **Auth**: required, min role: admin
- **Input**: `{ id, action: 'approve'|'reject', rejection_note? }`
- **On approve**: creates auth user, inserts dealer row (plan='beta'); `beta_expires_at = 2026-10-31` if application submitted before Aug 1 2026, else `now + 6 months`; sends welcome email with password-reset link
- **On reject**: updates status, sends rejection email with optional note

---

### `GET /api/admin/reported`
- **Auth**: required, any admin role
- **Returns**: `{ reported: [] }` — messages with `reported=true`, with conversation details

---

### `GET /api/admin/team`
- **Auth**: required, superadmin only
- **Returns**: `{ team: [{ user_id, email, role, created_at }] }`

---

### `POST /api/admin/team`
- **Auth**: required, role: superadmin
- **Input**: `{ email, role }` — role must be 'superadmin' or 'moderator' (note: code actually allows all 4 roles via UI dropdown but API validates only 'superadmin'|'moderator')
- **Validation**: target user must already have a GarageCherries account

---

### `DELETE /api/admin/team`
- **Auth**: required, role: superadmin
- **Input**: `{ user_id }`
- **Validation**: cannot remove yourself

---

### `POST /api/admin/cleanup-images`
- **Auth**: required, role: superadmin
- **Side effects**: lists all files in `listing-images` bucket; deletes orphans (not referenced by any listing) older than 24 hours
- **Returns**: `{ deleted: number, paths?: string[] }`

---

### `POST /api/dealer/apply`
- **Auth**: none required
- **Rate limit**: 3 / IP / hour
- **State validation**: `state` must be a valid US state/territory code — returns 400 if invalid
- **Input** (JSON):

| Field | Required | Validation |
|---|---|---|
| `name` | yes | Non-empty |
| `email` | yes | Lowercased, trimmed |
| `phone` | yes | Non-empty |
| `dealerName` | yes | Non-empty |
| `address` | no | |
| `location` | yes | City |
| `state` | yes | Uppercased, max 2 chars |
| `zip` | no | |
| `website` | no | |
| `specialties` | no | Comma-separated string → array |
| `description` | yes | Non-empty |
| `captchaToken` | yes | Turnstile verification |

- **Duplicate checks**: existing dealer with email → 409; existing pending/approved application → 409
- **Success**: `200 { success: true }`

---

### `POST /api/dealer/settings`
- **Auth**: required, must own dealer record
- **Input** (JSON): `{ dealerId?, name, phone, address, location, state, zip, description, website, specialties[] }`
- **Ownership**: verifies `dealers.id === user.id`
- **Returns**: `{ ok: true, plan, beta_expires_at }`

---

### `GET /api/dealer/metrics`
- **Auth**: required, must be a dealer
- **Returns**: `{ views30d, viewsDelta, inquiries30d, inquiriesDelta, avgDaysOnMarket, recentInquiries[] }`
- **`avgDaysOnMarket`**: calculated from approved, non-sold listings only; guards against NaN if `listed_at` text value is unparseable (fixed 2026-07-03)

---

### `GET /api/dealer/watcher-counts`
- **Auth**: required
- **Ownership**: carIds filtered to only those owned by the authenticated user (`seller_id = user.id`) before querying watchlists; unowned IDs silently dropped
- **Query**: `carIds=id1,id2,...`
- **Returns**: `{ counts: { [carId]: number }, messaged: { [carId]: boolean } }` — counts of opted-in watchers not yet messaged; whether dealer already messaged each car

---

### `POST /api/dealer/message-watchers`
- **Auth**: required, must be the dealer who owns the car
- **Input**: `{ carId, message }`
- **Validation**: carId and non-empty message required; car must belong to dealer
- **Side effects**: emails each eligible watcher (allow_dealer_contact=true, not yet messaged, not blocked); sets `dealer_messaged_at` after each send
- **Returns**: `{ sent: number }`

---

### `GET /api/dealer/export`
- **Auth**: required, must be a dealer
- **Query**: `format=json|csv` (default: `json`)
- **Returns**: downloadable file of all dealer's listings
  - JSON: `{ dealer, exported_at, count, listings[] }` with `Content-Disposition: attachment`
  - CSV: all listing fields as comma-separated rows with header
- **Fields included**: id, title, year, make, model, price, mileage, condition, body_style, transmission, engine, color, interior_color, horsepower, torque, cylinders, displacement, forced_induction, fuel_type, num_speeds, drive_type, location, state, description, vin, vin_verified, status, is_sold, created_at, listed_at

---

### `POST /api/advertiser/signup`
- **Auth**: none
- **Input**: `{ email, password, businessName, contactName?, phone?, address?, city?, state?, zip?, category?, tier? }`
- **Validation**: email, password, businessName required
- **Side effects**: creates auth user + advertisers row (trial 14 days); on DB error, rolls back auth user
- **Returns**: `{ ok: true, advertiserId }`

---

### `GET /api/advertiser/ads`
- **Auth**: required, must be advertiser
- **Returns**: `{ advertiser, ads: [] }`

---

### `POST /api/advertiser/ads`
- **Auth**: required, must be advertiser
- **Input**: `{ id?, headline, bodyCopy, ctaLabel, ctaUrl, phone, logoUrl, photoUrl, rating, reviewCount }`
- **Business rule**: trial must not be expired (checked for both create and update)
- **URL validation**: `ctaUrl` must start with `http://` or `https://` — `javascript:` and other schemes rejected with 400
- **With id**: updates existing ad (ownership verified via `advertiser_id`)
- **Without id**: creates new ad
- **Returns**: `{ ok: true }` on update; `{ ad: {...} }` on create

---

### `DELETE /api/advertiser/ads`
- **Auth**: required, must be advertiser
- **Query**: `id`
- **Ownership**: verified via `advertiser_id`

---

### `GET /api/ads/serve`
- **Auth**: none
- **Query**: `state?`, `path?`
- **Logic**: finds active advertisers with valid trial; filters by radius using haversine distance between state centroids:
  - `statewide` tier: always eligible regardless of viewer state
  - All other tiers: advertiser's state centroid must be within `radius_miles` of the viewer's state centroid
  - Falls back to exact state match if viewer state is unknown
  - Picks random eligible advertiser; returns their ad with fewest impressions
- **Side effects**: logs impression to `ad_events`; increments `ads.impressions` via RPC `inc_ad_impressions`
- **Returns**: `{ ad: {...} | null }`

---

### `POST /api/ads/track`
- **Auth**: none
- **Rate limit**: 60 / IP / hour (prevents click stuffing)
- **Input**: `{ adId, type?, path?, state? }`
- **Validation**: adId required
- **Side effects**: logs to `ad_events`; increments `ads.clicks` via RPC `inc_ad_clicks`

---

### `GET /api/alerts`
- **Auth**: required
- **Returns**: `{ searches: [] }` — user's saved searches

---

### `POST /api/alerts`
- **Auth**: required
- **Input**: `{ name?, make?, model?, yearMin?, yearMax?, priceMax?, mileageMax?, condition?, bodyStyle?, transmission?, state? }`
- **Validation**: max 10 per user; at least 2 criteria required
- **Returns**: `{ search: {...} }`

---

### `PATCH /api/alerts`
- **Auth**: required
- **Input**: `{ id, paused?, active? }`
- **Ownership**: verified via `user_id` filter

---

### `DELETE /api/alerts`
- **Auth**: required
- **Query**: `id`
- **Ownership**: verified

---

### `POST /api/alerts/match`
- **Auth**: Bearer `INTERNAL_API_SECRET` header required — returns 401 if missing or mismatched
- **Caller**: only `PATCH /api/admin/listings` (approve action) passes the secret header; no public access
- **Input**: `{ carId }`
- **Side effects**: fetches listing, calls `matchAndNotifyAlerts(car)` — emails matching alert subscribers

---

### `GET /api/alerts/matches`
- **Auth**: required
- **Query**: `alertId`
- **Ownership**: verifies alert belongs to current user
- **Returns**: `{ listings: [] }` — up to 20 most recent matches with listing details

---

### `POST /api/conversations`
- **Auth**: required
- **Rate limit**: 20 / IP / hour
- **Suspension check**: yes
- **Input**: `{ listingId, listingTitle?, buyerName?, message }`
- **Validation**: listingId and non-empty message required
- **Side effects**: finds or creates conversation; inserts first message; updates `last_message_at`; broadcasts Realtime event
- **Returns**: `{ conversationId }`

---

### `GET /api/conversations`
- **Auth**: required
- **Query**: `page?`, `limit?`
- **Returns**: `{ conversations: [], userId, total, page, limit }` — merged buyer + seller conversations sorted by `last_message_at`

---

### `GET /api/conversations/[id]/messages`
- **Auth**: required; must be buyer or seller of the listing
- **Returns**: `{ messages: [] }` — ordered by `created_at` asc

---

### `POST /api/conversations/[id]/messages`
- **Auth**: required; must be participant; suspension check
- **Rate limit**: 60 / IP / hour
- **Input**: `{ body, senderName? }`
- **Validation**: non-empty body
- **Side effects**: inserts message; updates `last_message_at`; broadcasts Realtime to recipient

---

### `PATCH /api/messages/[id]/report`
- **Auth**: required; must be conversation participant
- **Side effects**: sets `reported = true`
- **Returns**: `{ success: true }`

---

### `DELETE /api/messages/[id]/report`
- **Auth**: required, any admin role
- **Side effects**: clears `reported = false` (dismiss report)

---

### `POST /api/watchlist`
- **Auth**: required
- **Rate limit**: 60 / IP / hour
- **Input**: `{ carId, currentPrice?, allowDealerContact? }`
- **Logic**: if exists → delete (unwatch); if not → insert (watch)
- **Returns**: `{ watching: boolean }`

---

### `DELETE /api/watchlist`
- **Auth**: required
- **Query**: `carId`
- **Returns**: `{ watching: false }`

---

### `POST /api/inquire`
- **Auth**: none (public)
- **Rate limit**: 10 / IP / hour
- **Input**: `{ carId, carTitle?, buyerName, buyerEmail, buyerPhone?, message, captchaToken }`
- **Validation**: Turnstile; buyerName, buyerEmail, message required
- **Side effects**: stores in `inquiries`; emails seller (resolves from dealer table first, falls back to listing `seller_email`, falls back to `INQUIRY_FALLBACK_EMAIL` env var)
- **Returns**: `{ success: true }`

---

### `POST /api/offers`
- **Auth**: optional
- **Rate limit**: 10 / IP / hour
- **Input**: `{ carId, carTitle, dealerId, amount, buyerName?, buyerEmail, message? }`
- **Validation**: carId, amount, buyerEmail required; amount > 0
- **Side effects**: inserts `offers` row; emails dealer (if email found); sends confirmation to buyer
- **Returns**: `{ ok: true, offerId }`

---

### `GET /api/reviews`
- **Auth**: none
- **Query**: `dealerId`
- **Returns**: `{ reviews: [] }` — up to 50, ordered by `created_at` desc

---

### `POST /api/reviews`
- **Auth**: required
- **Input**: `{ dealerId, rating, review?, reviewerName? }`
- **Validation**: dealerId and rating required; rating 1–5; one review per user per dealer
- **Returns**: `{ ok: true }`

---

### `POST /api/track-view`
- **Auth**: none
- **Input**: `{ listingId, dealerId }`
- **Side effects**: deduplicates by hashed IP per listing per day; inserts `listing_views` row if new
- **Returns**: `{ ok: true }`

---

### `POST /api/notify-watchers`
- **Auth**: required — must be authenticated seller who owns the listing
- **Rate limit**: 30 / IP / hour
- **Ownership**: verifies `listing.seller_id === user.id` — returns 403 if not owner
- **Input**: `{ carId, oldPrice, newPrice }`
- **Validation**: only notifies if newPrice < oldPrice
- **Side effects**: emails all watchlist users for that car
- **Returns**: `{ sent: number }`

---

### `POST /api/cars/sold`
- **Auth**: required; ownership verified (`seller_id === user.id`)
- **Input**: `{ carId, soldPrice? }`
- **Side effects**: sets `is_sold=true`, `sold_at=now`, `sold_price`; emails all watchlist users (fire-and-forget)
- **Returns**: `{ ok: true }`

---

### `POST /api/listings/[id]/renew`
- **Added**: 2026-07-02, part of the 30-day listing expiry system (see `expires_at` in the `listings` schema above)
- **Auth**: required; ownership verified (`seller_id === user.id`); rejects if `status !== 'approved'` or `is_feed_managed === true`
- **Side effects**: sets `expires_at = now + 30 days`
- **Returns**: `{ ok: true, expiresAt }`
- **Renewal reminder**: `POST /api/email/expiring-listings` sends reminder emails 3 days before expiry (added 2026-07-03)

---

### `POST /api/email/expiring-listings`
- **Added**: 2026-07-03
- **Auth**: Bearer `ADMIN_API_SECRET` header
- **Side effects**: finds approved, unsold, non-feed-managed listings where `expires_at` is within 3 days and `renewal_reminder_sent_at IS NULL`; emails each seller a renewal reminder; sets `renewal_reminder_sent_at` to prevent duplicate sends
- **Returns**: `{ ok: true, sent, total }`
- **Note**: safe to run daily — idempotent via `renewal_reminder_sent_at` guard; triggerable from `/admin/email` page

---

### `POST /api/cars/verify-vin`
- **Auth**: none
- **Rate limit**: 20 / IP / hour
- **Input**: `{ vin, make?, model?, year? }`
- **Validation**: VIN required; 17-char VINs validated against `/^[A-HJ-NPR-Z0-9]{17}$/`; pre-1981 VINs (< 17 chars) accepted with note
- **Side effects**: calls NHTSA VIN decoder API (cached 24h)
- **Returns**: `{ vinValid, verified, nhtsaMake, nhtsaModel, nhtsaYear, makeMatch, modelMatch, yearMatch, message, nicbUrl, preStandard? }`

---

### `GET /api/makes`
- **Auth**: none
- **Returns**: `{ makes: string[] }` — distinct makes from `listings` table, sorted

---

### `GET /api/account/profile`
- **Auth**: required
- **Returns**: `{ profile: { id, full_name, phone } }`

---

### `POST /api/account/profile`
- **Auth**: required
- **Input**: `{ full_name?, phone? }`
- **Side effects**: upserts `profiles` row
- **Returns**: `{ ok: true }`

---

### `POST /api/email/price-drops`
- **Auth**: Bearer `ADMIN_API_SECRET` header
- **Side effects**: finds price_history rows from past 7 days; groups watchers by car; sends digest email per user showing all price-dropped watchlist cars
- **Returns**: `{ ok: true, sent, message? }`

---

### `POST /api/email/digest`
- **Auth**: Bearer `ADMIN_API_SECRET` header
- **Side effects**: fetches last 10 new listings (7 days); finds watchlist users who haven't opted out (`digest_opt_out` not set in user_metadata); sends weekly new listings digest
- **Returns**: `{ ok: true, sent, total }`

---

### `POST /api/email/dealer-report`
- **Auth**: Bearer `ADMIN_API_SECRET` header
- **Side effects**: for each dealer with email: fetches their listings, active/sold counts, total views, inquiry count (30d); sends monthly performance report
- **Returns**: `{ ok: true, sent, total }`

---

## 5. Business Rules

| Rule | File:Line | Details |
|---|---|---|
| Private seller listing limit | `app/api/listings/submit/route.ts:44` | Max 10 active (pending + approved) listings per private seller; dealers exempt |
| Beta mode bypass | `app/api/listings/submit/route.ts:29` | `BETA_MODE=true` env var bypasses the listing limit check entirely |
| Dealer beta expiry | `app/api/listings/submit/route.ts`, `app/api/listings/[id]/route.ts` | If dealer's `beta_expires_at < now`, 403 BETA_EXPIRED on listing submit and listing edit; dashboard access and metrics not blocked |
| Dealer beta period duration | `app/api/admin/dealer-applications/route.ts:97` | Applications submitted before `2026-08-01` (250th promo period) → `beta_expires_at = 2026-10-31T23:59:59Z`; all others → `now + 6 months` |
| Individual promo expiry | `app/account/signup/page.tsx` | Signup with `promo=250th` stores `promo_expires_at = 2026-10-31T23:59:59Z` on `profiles` row; enforced when paid plans launch |
| Promo modal date gate | `components/PromoModal.tsx` | Modal stops displaying after `2026-07-31T23:59:59`; date check runs client-side on mount |
| Advertiser trial period | `app/api/advertiser/signup/route.ts:28` | `trial_ends_at = now + 14 days`; ad creation AND editing blocked if expired |
| Advertiser tier → radius | `app/api/advertiser/signup/route.ts:26` | starter=15mi, metro=30mi, regional=60mi, statewide=9999mi |
| Ad serving radius filter | `app/api/ads/serve/route.ts` | statewide tier serves everywhere; other tiers use haversine distance between state centroids vs. `radius_miles`; falls back to exact state match if viewer state unknown |
| Ad CTA URL scheme | `app/api/advertiser/ads/route.ts` | `cta_url` must start with `http://` or `https://`; `javascript:` and other schemes rejected with 400 |
| State code validation | `app/api/listings/submit/route.ts`, `app/api/dealer/apply/route.ts` | `state` field validated against `US_STATES` set in `lib/constants.ts` (50 states + DC + territories); invalid codes return 400 |
| Max alerts per user | `app/api/alerts/route.ts:31` | Max 10 saved searches per user |
| Alert minimum criteria | `app/api/alerts/route.ts:39` | At least 2 criteria required to create an alert |
| Alert match threshold | `lib/matchAlerts.ts:45` | Score must be ≥ 0.7 to trigger notification |
| Alert cooldown | `lib/matchAlerts.ts:121` | 24-hour cooldown per alert before re-emailing |
| Alert duplicate prevention | `lib/matchAlerts.ts:127` | `alert_matches` table prevents emailing same car for same alert twice |
| Max images per listing | `app/api/listings/submit/route.ts:63` | Server caps at 20 images (client allows up to 30 in UI) |
| Image URL validation | `app/api/listings/submit/route.ts:57` | Must start with https://, must include Supabase URL, must include `/listing-images/` |
| Resubmission note required | `app/api/listings/[id]/route.ts:39` | When resubmitting a rejected listing, `resubmission_note` must be non-empty |
| Approved listing re-review | `app/api/listings/[id]/route.ts:45` | Editing an approved listing sends it back to pending |
| Suspension blocks messaging | `app/api/conversations/route.ts:20`, `/[id]/messages/route.ts:50` | Suspended users cannot start conversations or send messages |
| VIN standard year cutoff | `app/api/cars/verify-vin/route.ts:14` | VINs < 17 chars (pre-1981) accepted but not decoded via NHTSA |
| VIN character validation | `app/api/cars/verify-vin/route.ts:28` | Must match `/^[A-HJ-NPR-Z0-9]{17}$/` — no I, O, or Q |
| Watcher contact one-time | `app/api/dealer/message-watchers/route.ts:82` | `dealer_messaged_at` set after send; prevents future sends to same watcher for that car |
| Watchlist contact opt-in | `app/api/dealer/watcher-counts/route.ts:25` | Only counts watchers where `allow_dealer_contact=true AND dealer_contact_blocked=false AND dealer_messaged_at IS NULL` |
| View deduplication | `app/api/track-view/route.ts:23` | One view counted per hashed IP per listing per day |
| Orphan image age | `app/api/admin/cleanup-images/route.ts:8` | Only deletes orphans older than 24 hours; orphans can only occur if images upload successfully on submit but the subsequent listing insert fails (narrow window) |
| Dealer promotion source | `app/api/admin/users/route.ts:163` | Only superadmin can promote a seller to dealer; only sellers (not already dealers) can be promoted |
| Cannot remove yourself from admin | `app/api/admin/team/route.ts:59` | Superadmin cannot remove their own team record |
| Ownership cannot be reassigned | `app/api/admin/listings/route.ts:52` | `seller_id` is never updated via admin PATCH |
| Dealer listing bypasses review | `app/dealer/dashboard/page.tsx:163` | Dealer-added listings inserted directly with `status: 'approved'`; private seller listings require review |
| Rate limit notification | `lib/rateLimit.ts:40`, various routes | `firstBlock` flag used to send one-time admin email on first block in window |

---

## 6. Validation Rules

### Listing Submit (`POST /api/listings/submit`)

| Field | Required | Type | Rule |
|---|---|---|---|
| `cf-turnstile-response` | yes | string | Verified via Cloudflare Turnstile |
| `year` | yes | number | `Number()` coercion |
| `make` | yes | string | Sent as string |
| `model` | yes | string | Sent as string |
| `price` | yes | number | `Number() \|\| 0` |
| `mileage` | no | number | Null if absent |
| `city` | yes | string | |
| `state` | yes | string | |
| `condition` | yes | string | |
| `bodyStyle` | no | string | |
| `transmission` | no | string | |
| `engine` | no | string | Stored null if blank |
| `color` | no | string | Stored null if blank |
| `description` | yes | string | |
| `sellerName` | yes | string | |
| `sellerPhone` | yes | string | |
| `sellerEmail` | yes | string | |
| `imageUrls` | yes | JSON array | URLs validated: https, match supabaseUrl, contain /listing-images/; capped at 20 |

### Client-side form validation (SellForm)

| Field | Rule |
|---|---|
| `year` | type=number, required, min=1900, max=2030 |
| `make` | required dropdown |
| `model` | required text |
| `price` | required, type=number, min=0 |
| `condition` | required dropdown |
| `description` | required textarea |
| `city` | required text |
| `state` | required text, maxLength=2 |
| `sellerName` | required text |
| `sellerPhone` | required tel; formatted as (XXX) XXX-XXXX |
| `sellerEmail` | required email type |
| `vin` | optional; uppercased; max 17 chars; "Verify VIN" button triggers inline NHTSA check |

### Dealer Application (`POST /api/dealer/apply`)

| Field | Rule |
|---|---|
| `name` | required, non-empty |
| `email` | required, lowercased, trimmed |
| `phone` | required |
| `dealerName` | required |
| `location` | required |
| `state` | required, `.toUpperCase().slice(0,2)` |
| `description` | required |
| `specialties` | optional, split on comma |
| `captchaToken` | Turnstile verified |

### Alerts (`POST /api/alerts`)

| Rule | Detail |
|---|---|
| Count | Max 10 per user (pre-check before insert) |
| Criteria minimum | At least 2 of: make, model, yearMin, yearMax, priceMax, mileageMax, condition.length, bodyStyle, transmission, state |

### Offers (`POST /api/offers`)

| Field | Rule |
|---|---|
| `carId` | required |
| `amount` | required, > 0 |
| `buyerEmail` | required |

### Reviews (`POST /api/reviews`)

| Field | Rule |
|---|---|
| `dealerId` | required |
| `rating` | required, integer, 1–5 |
| One review per user per dealer | enforced in DB query + `UNIQUE(dealer_id, reviewer_id)` DB constraint (added 2026-07-02) |

### Conversations (`POST /api/conversations`)

| Field | Rule |
|---|---|
| `listingId` | required |
| `message` | required, `.trim()` non-empty |

### Message body (`POST /api/conversations/[id]/messages`)

| Field | Rule |
|---|---|
| `body` | required, `.trim()` non-empty |

### VIN (`POST /api/cars/verify-vin`)

| Rule | Detail |
|---|---|
| `vin` | required |
| Length | < 17 chars = pre-standard, accepted with note |
| Characters | 17-char VINs: `/^[A-HJ-NPR-Z0-9]{17}$/` — no I, O, Q |

### Password change (client-side only, not API-validated)

| Rule | Detail |
|---|---|
| Passwords match | `newPw !== confirmPw` → error |
| Minimum length | `newPw.length < 8` → error |

### Advertiser Signup (`POST /api/advertiser/signup`)

| Field | Rule |
|---|---|
| `email` | required |
| `password` | required |
| `businessName` | required |

---

## 7. Email Triggers

All emails sent via Resend. Sender domains: `no-reply@garagecherries.com`, `notifications@garagecherries.com`, `offers@garagecherries.com`, `noreply@garagecherries.com`.

| # | Trigger | From | To | Subject | File |
|---|---|---|---|---|---|
| 1 | Listing approved by admin | `no-reply@` | `listing.seller_email` | "Your listing is live — {title}" | `app/api/admin/listings/route.ts:112` |
| 2 | Listing rejected by admin | `no-reply@` | `listing.seller_email` | "Your listing needs attention — {title}" | `app/api/admin/listings/route.ts:142` |
| 3 | Dealer application rejected | `no-reply@` | `app.email` | "Your GarageCherries Dealer Application" | `app/api/admin/dealer-applications/route.ts:54` |
| 4 | Dealer application approved | `no-reply@` | `app.email` | "Your GarageCherries Dealer Account is Approved 🍒" | `app/api/admin/dealer-applications/route.ts:129` |
| 5 | Alert match found (new listing) | `notifications@` | Alert owner's email | "New match for your "{alertName}" — {price}" | `lib/matchAlerts.ts:152` |
| 6 | Price drop on watchlisted car (immediate) | `noreply@` | Watcher email (skipped if `price_drop_opt_out` in user_metadata) | "Price Drop: {title} is now {newPrice}" | `app/api/notify-watchers/route.ts:50` |
| 7 | Car sold (watcher notification) | `noreply@` | All watcher emails | "{title} has sold" | `app/api/cars/sold/route.ts:47` |
| 8 | New buyer inquiry | `noreply@` | Seller email | "New inquiry: {carTitle}" | `app/api/inquire/route.ts:90` |
| 9 | New offer placed — dealer notification | `offers@` | `dealer.email` | "New offer on {carTitle}: {amount}" | `app/api/offers/route.ts:47` |
| 10 | New offer placed — buyer confirmation | `offers@` | `buyerEmail` | "Your offer on {carTitle} has been sent" | `app/api/offers/route.ts:73` |
| 11 | Dealer message to watcher | `notifications@` | Watcher email | "Message from the seller — {car.title}" | `app/api/dealer/message-watchers/route.ts:45` |
| 12 | Weekly price-drop digest | `noreply@` | Per-watcher email | "Price drop on N cars you're watching" | `app/api/email/price-drops/route.ts:94` |
| 13 | Weekly new listings digest | `noreply@` | Watchlist users | "🚗 N new classic cars this week — GarageCherries" | `app/api/email/digest/route.ts:82` |
| 14 | Monthly dealer performance report | `noreply@` | Each dealer email (skipped if `report_opt_out = true` on dealers row) | "Your GarageCherries monthly report — {month year}" | `app/api/email/dealer-report/route.ts:104` |
| 15 | Listing expiry renewal reminder | `no-reply@` | Seller email | "Your listing "{title}" expires in N day(s) — renew now" | `app/api/email/expiring-listings/route.ts` |
| 15 | Admin rate-limit alert | `no-reply@ (Alerts)` | `ADMIN_EMAIL` env | "[GarageCherries Alert] Rate limit hit: {route}" | `lib/notifyAdmin.ts:12` (called from various routes) |

---

## 8. Feature Completeness

| Feature Area | Status | Notes |
|---|---|---|
| Public listing browse + search | **Complete** | Full filter support; DB-backed via `lib/db.ts:fetchCars` |
| Listing detail page | **Complete** | View tracking, inquiry form, watch button, offer form, VIN display |
| Private seller listing submit | **Complete** | CAPTCHA, rate limit, image upload, 10-listing cap, approval flow |
| Private seller listing edit/delete | **Complete** | Resubmission flow, price-drop notification |
| Listing approval workflow | **Complete** | Pending/approved/rejected states, email notifications both ways |
| Dealer application + approval | **Complete** | Form → admin review → auto account creation with 6-month beta |
| Dealer dashboard | **Complete** | Inventory CRUD, rich vehicle fields, metrics, inquiries, settings |
| Dealer inventory (bypass review) | **Complete** | Listings inserted as approved; alert matching triggered |
| Dealer beta expiry UI | **Complete** | Banner with days remaining, warning at ≤30 days |
| Beta expiry enforcement | **Complete** | Enforced at listing submit and listing edit; expired dealers redirected to `/dealer/expired` on dashboard load |
| Advertiser signup + ads | **Complete** | Tiers, trial, ad creation, serve, impression/click tracking |
| Ad geographic targeting | **Complete** | Haversine distance between state centroids used to filter by `radius_miles`; statewide tier still serves everywhere |
| Watchlist | **Complete** | Add/remove, price-at-add comparison, sold/removed indicators |
| Saved search alerts | **Complete** | Create/edit/delete/pause, score-based matching, email notifications, 24h cooldown |
| Buyer-seller messaging | **Complete** | In-page chat widget, Realtime push, unread state via localStorage |
| Message reporting | **Complete** | Report flag, admin Reported tab, dismiss |
| Offer system | **Complete** | Submit → email dealer + buyer; stored in `offers` table |
| Dealer reviews | **Complete** | Submit (1 per user per dealer), read (public) |
| VIN verification | **Complete** | NHTSA API, pre-1981 handling, fuzzy make/model/year matching; wired to sell form with inline result badge |
| Price history + drop notifications | **Complete** | Inserted on price drop; immediate + weekly batch emails |
| Mark as sold | **Complete** | Watcher notification email |
| Account profile + password change | **Complete** | `profiles` table; Supabase Auth for password |
| Admin panel | **Complete** | Full CRUD on listings, users, team, applications, reported messages |
| Image cleanup (orphan removal) | **Complete** | Superadmin-triggered, 24h grace period |
| Weekly email digest | **Complete** | Bearer-auth endpoint; uses watchlist users as subscriber list |
| Listing renewal reminder email | **Complete** | `POST /api/email/expiring-listings`; sends 3 days before `expires_at`; idempotent via `renewal_reminder_sent_at`; triggerable from `/admin/email` |
| Monthly dealer report | **Complete** | Bearer-auth endpoint; views/inquiries/top listings |
| Unsubscribe from digest | **Complete** | `/unsubscribe/digest` page; sets `digest_opt_out` in `user_metadata`; unsubscribe link in digest emails; UUID guard added (2026-07-03) |
| Unsubscribe from price drop notifications | **Complete** | `/unsubscribe/price-drops` page; sets `price_drop_opt_out` in `user_metadata`; unsubscribe link in price drop emails; opted-out users skipped in `POST /api/notify-watchers` (fixed 2026-07-03) |
| Unsubscribe from dealer monthly report | **Complete** | `/unsubscribe/dealer-report` page; sets `report_opt_out` on `dealers` row; unsubscribe link in dealer report emails; opted-out dealers skipped in `POST /api/email/dealer-report` (fixed 2026-07-03) |
| Unsubscribe from alerts | **Complete** | `/unsubscribe/alerts` page; sets `alerts_opt_out` in `user_metadata`; opted-out users skipped in `matchAndNotifyAlerts`; "Unsubscribe from all alerts" link added to alert email footer alongside existing pause/manage links |
| Dealer watcher messaging | **Complete** | One-time opt-in contact; blocked flag; count display |
| Market report (`/reports`) | **Complete** | Public page; live data from listings table; avg price by make, condition breakdown, most-viewed, sold count; not linked from main nav |
| 250th birthday promo campaign | **Complete** | `components/PromoModal.tsx` — homepage-only modal, shown once via `localStorage` key `gc_promo_250_seen`; date-gated (auto-hides after July 31 2026); CTA → `/account/signup?promo=250th`. `components/PromoBanner.tsx` — slim all-pages banner, dismissible per session via `sessionStorage` key `gc_promo_250_banner_dismissed`. Promo tracked via `raw_user_meta_data->>'promo' = '250th'` on `auth.users`. Signup with promo stores `promo_expires_at = 2026-10-31` on `profiles`. Dealer applications submitted before Aug 1 2026 get `beta_expires_at = 2026-10-31` instead of +6 months. Advertisers: same Oct 31 cutoff noted on pricing/advertiser pages. Promo image hosted at Supabase Storage `listing-images/promo/gc eagle.png`. |
| Google Analytics 4 | **Complete** | GA4 Measurement ID `G-B36QB0J7TX` added to `app/layout.tsx` via Next.js `Script` component (`strategy="afterInteractive"`). |
| Pricing page — advertiser tier | **Complete** | `/pricing` now includes advertiser section (banner ads, sponsored listings, newsletter sponsorships) with 250th promo callout and Stripe coming-soon note. |
| Homepage hero stats | **Updated 2026-07-06** | Replaced placeholder stats ("12,400+ listings · All 50 states") with honest copy: "Growing daily · Nationwide · Classic, Muscle, Sport & Supercar". |
| Dedicated watchlist page (`/account/watchlist`) | **Complete** | Standalone URL for watchlist; price-change indicators; mirrors `/account?tab=watchlist` |
| Import JSON / Sync Now buttons | **Missing** | UI buttons exist in dealer dashboard but click handlers are stubs — no API route or format defined; sample format saved at `docs/dealer-import-sample.json` |
| Export inventory | **Complete** | GET /api/dealer/export?format=csv\|json; dashboard has "Export CSV" and "Export JSON" buttons |
| Admin email tool (`/admin/email`) | **Complete** | Manual trigger panel for digest, price-drop, and dealer-report batch emails; requires `ADMIN_API_SECRET`; not linked from `/admin` nav |
| Payment / billing for dealer plans | **Missing** | No Stripe or payment routes; billing deferred to post-beta |
| Seller/buyer ratings | **Missing** | No rating system for buyers/sellers (only dealer reviews) |
| Search full-text | **Complete** | Basic keyword search via `q` param: `SearchFilters.tsx` adds a Search input at the top of the filter panel; `app/listings/page.tsx` applies `ilike` on `title` and `description` columns server-side. Enter key or Apply Filters submits. AI/tsvector full-text search deferred. |

---

## 9. Gap List

### API routes with no UI calling them

| Route | Notes |
|---|---|
| `POST /api/email/price-drops` | Intended as a cron job; no UI trigger |
| `POST /api/email/digest` | Intended as a cron job; no UI trigger |
| `POST /api/email/dealer-report` | Intended as a cron job; no UI trigger |
| `POST /api/admin/cleanup-images` | Triggered from "Cleanup Orphan Images" card in the Team tab (superadmin only); shows deleted count inline |
| `GET /api/makes` | Used in server components / sitemap; no explicit UI call visible — appears used by `sitemap.ts` |

### UI pages with no complete API backing

| Page | Issue |
|---|---|
| `/admin/email` | **Complete** — manual trigger panel for the three batch email jobs (Weekly Digest, Price Drops, Monthly Dealer Report). Requires `ADMIN_API_SECRET` entered on the page. Not linked from `/admin` — must know the URL. No admin session check on the page itself (secret still required to trigger anything). |
| `dealer/dashboard` — "Import JSON" button | No API route for bulk inventory import; format not yet defined |
| `dealer/dashboard` — "Sync now" button | No API route for inventory sync |
| ~~`dealer/dashboard` — "Export" button~~ | **Fixed (P1)** — `GET /api/dealer/export?format=csv\|json` implemented; buttons wired |
| `/account/watchlist` | **Complete** — dedicated watchlist page; shows saved listings with price-change indicators (green = dropped, orange = increased since saved); redirects to login if unauthenticated; duplicates the Watchlist tab at `/account?tab=watchlist` but at a cleaner standalone URL |
| `/reports` | **Complete** — public market report page; pulls live data from listings table; shows active count, median/average price, sold this month, average price by make (bar chart), inventory by condition breakdown, most-viewed listings, static market commentary; good SEO content page; not linked from main nav |

### Business rules with no enforcement or test coverage

| Rule | Gap |
|---|---|
| Dealer beta expiry | ~~Only enforced on listing submit~~ **Fixed (P5)** — now enforced on listing submit AND listing edit (`PATCH /api/listings/[id]`). Dashboard login, metrics, and settings still not blocked. |
| Advertiser trial expiry | ~~Only enforced on ad CREATE~~ **Fixed (P6)** — trial check now applies to both create and edit in `POST /api/advertiser/ads`. |
| ~~One review per user per dealer~~ | **Fixed (2026-07-02)** — `UNIQUE(dealer_id, reviewer_id)` constraint added to `dealer_reviews`; app-level check-then-insert now backed by a DB constraint, with the resulting `23505` unique-violation mapped to the same friendly 409 response |
| ~~Max 10 alerts~~ | **Fixed (2026-07-02)** — `count` query kept for a fast friendly error, but the cap is now also enforced atomically by a `BEFORE INSERT` trigger on `saved_searches` using `pg_advisory_xact_lock`, closing the race (`supabase/migrations/20260702_race_condition_fixes.sql`) |
| ~~Max 10 listings (private seller)~~ | **Fixed (2026-07-02)** — insert now goes through `insert_listing_with_limit()` RPC, which atomically re-checks the count (advisory-lock-guarded) and inserts in one DB call; app still resolves the dealer/BETA_MODE exemption before calling it |
| Image URL host validation | Simple string contains check — does not verify URL is a Supabase Storage URL for this project's bucket by subdomain |

### Validations that are missing but should exist

| Missing Validation | Location | Risk |
|---|---|---|
| ~~`state` field not validated against STATES enum in API~~ | `POST /api/listings/submit`, `POST /api/dealer/apply` | **Fixed (M8)** — validated against `US_STATES` in `lib/constants.ts` |
| ~~`condition` field not validated against CONDITIONS enum~~ | `POST /api/listings/submit` | **Fixed (2026-07-03)** — validated against `CONDITIONS` from `lib/types` (excluding 'All'); invalid values return 400 |
| ~~`email` format not validated server-side~~ | `POST /api/inquire`, `POST /api/offers` | **Fixed (2026-07-03)** — regex check `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` applied before any DB writes; invalid addresses return 400 |
| `price` clamped to ≥ 0 only on client | `POST /api/listings/submit` | `Number() \|\| 0` means price=0 accepted silently if non-numeric passed |
| `rating` validated 1–5 only in `POST /api/reviews` | Reviews API | Correct; only this route does it |
| `amount > 0` in `POST /api/offers` | Offers API | Validated; correct |
| `resubmission_note` only required client-side for rejections | `PATCH /api/listings/[id]` | API enforces it server-side (line 39); correct |
| No CAPTCHA on `POST /api/offers` | Offers API | Anonymous offer spam possible |
| No auth required on `POST /api/offers` | Offers API | Allows anonymous offers; intentional but enables spam |
| `phone` format not server-validated | Listings, dealer apply, offers | Any string accepted |
| ~~No rate limit on `POST /api/cars/verify-vin`~~ | VIN API | **Fixed (S6)** — 20/hr/IP |
| ~~No rate limit on `POST /api/offers`~~ | Offers API | **Fixed (S6)** — 10/hr/IP |
| ~~No rate limit on `POST /api/watchlist`~~ | Watchlist API | **Fixed (M1)** — 60/hr/IP |
| ~~No rate limit on `POST /api/conversations/[id]/messages`~~ | Messages API | **Fixed (M2)** — 60/hr/IP |
| ~~No rate limit on `POST /api/reviews`~~ | Reviews API | **Fixed (2026-07-02)** — 10/hr/IP |

---

## 10. Security Checklist

| Route | Auth Check | Input Validated | Rate Limited | Ownership Verified | Suspension Checked |
|---|:---:|:---:|:---:|:---:|:---:|
| `POST /api/listings/submit` | Optional (anon allowed) | ✓ (CAPTCHA + fields) | ✓ 5/hr | N/A | ✓ |
| `PATCH /api/listings/[id]` | ✓ | ✓ | ✗ | ✓ seller_id | ✓ |
| `DELETE /api/listings/[id]` | ✓ | ✓ (id in path) | ✗ | ✓ seller_id | ✗ |
| `GET /api/listings/my` | ✓ | N/A | ✗ | ✓ (filters by user.id) | ✗ |
| `POST /api/listings/upload-image` | ✓ | ✓ (fileName, contentType) | ✗ | N/A | ✗ |
| `GET /api/admin/listings` | ✓ min moderator | ✓ (page/limit clamped) | ✗ | N/A (admin) | N/A |
| `PATCH /api/admin/listings` | ✓ role-checked per action | ✓ | ✗ | N/A (admin) | N/A |
| `DELETE /api/admin/listings` | ✓ superadmin | ✓ | ✗ | N/A | N/A |
| `GET /api/admin/users` | ✓ min moderator | ✓ (page/limit clamped) | ✗ | N/A | N/A |
| `PATCH /api/admin/users` | ✓ role-checked per action | ✓ | ✗ | N/A | N/A |
| `DELETE /api/admin/users` | ✓ superadmin | ✓ | ✗ | N/A | N/A |
| `POST /api/admin/users` | ✓ superadmin | ✓ | ✗ | N/A | N/A |
| `GET /api/admin/dealer-applications` | ✓ any admin | N/A | ✗ | N/A | N/A |
| `PATCH /api/admin/dealer-applications` | ✓ min admin | ✓ | ✗ | N/A | N/A |
| `GET /api/admin/reported` | ✓ any admin | N/A | ✗ | N/A | N/A |
| `GET /api/admin/team` | ✓ superadmin only | N/A | ✗ | N/A | N/A |
| `POST /api/admin/team` | ✓ superadmin | ✓ (role allowlist) | ✗ | N/A | N/A |
| `DELETE /api/admin/team` | ✓ superadmin | ✓ (not self) | ✗ | N/A | N/A |
| `POST /api/admin/cleanup-images` | ✓ superadmin | N/A | ✗ | N/A | N/A |
| `POST /api/dealer/apply` | None | ✓ (CAPTCHA + required fields) | ✓ 3/hr | N/A | N/A |
| `POST /api/dealer/settings` | ✓ | ✓ | ✗ | ✓ dealer.id = user.id | ✗ |
| `GET /api/dealer/metrics` | ✓ | N/A | ✗ | ✓ dealer lookup by user.id | ✗ |
| `GET /api/dealer/export` | ✓ + dealer check | ✓ (format param) | ✗ | ✓ dealer.id = user.id | ✗ |
| `GET /api/dealer/watcher-counts` | ✓ | ✓ (carIds split) | ✗ | ✓ (carIds filtered to seller_id = user.id) | ✗ |
| `POST /api/dealer/message-watchers` | ✓ | ✓ (carId + message) | ✗ | ✓ car.seller_id = dealer.id | ✗ |
| `POST /api/advertiser/signup` | None | ✓ | ✗ | N/A | N/A |
| `GET /api/advertiser/ads` | ✓ + advertiser check | N/A | ✗ | ✓ advertiser.user_id = user.id | ✗ |
| `POST /api/advertiser/ads` | ✓ + advertiser check + trial check | ✓ | ✗ | ✓ eq advertiser_id on update | ✗ |
| `DELETE /api/advertiser/ads` | ✓ + advertiser check | ✓ (id required) | ✗ | ✓ eq advertiser_id | ✗ |
| `GET /api/ads/serve` | None | ✓ | ✗ | N/A | N/A |
| `POST /api/ads/track` | None | ✓ (adId required) | ✓ 60/hr/IP | ✗ (any caller can log clicks for any adId) | N/A |
| `GET /api/alerts` | ✓ | N/A | ✗ | ✓ (filters by user.id) | ✗ |
| `POST /api/alerts` | ✓ | ✓ (count, criteria min) | ✗ | N/A | ✗ |
| `PATCH /api/alerts` | ✓ | ✓ | ✗ | ✓ eq user_id | ✗ |
| `DELETE /api/alerts` | ✓ | ✓ (id required) | ✗ | ✓ eq user_id | ✗ |
| `POST /api/alerts/match` | ✓ Bearer INTERNAL_API_SECRET | ✓ (carId required) | ✗ | N/A (internal only) | N/A |
| `GET /api/alerts/matches` | ✓ | ✓ (alertId required) | ✗ | ✓ verifies alert ownership | ✗ |
| `POST /api/conversations` | ✓ | ✓ | ✓ 20/hr | N/A | ✓ |
| `GET /api/conversations` | ✓ | ✓ (page/limit) | ✗ | ✓ (buyer_id or seller via listings) | ✗ |
| `GET /api/conversations/[id]/messages` | ✓ | ✓ (id in path) | ✗ | ✓ (buyer or seller check) | ✗ |
| `POST /api/conversations/[id]/messages` | ✓ | ✓ (body non-empty) | ✓ 60/hr/IP | ✓ (buyer or seller check) | ✓ |
| `PATCH /api/messages/[id]/report` | ✓ | ✓ (id in path) | ✗ | ✓ (participant check) | ✗ |
| `DELETE /api/messages/[id]/report` | ✓ any admin | ✓ | ✗ | N/A | N/A |
| `POST /api/watchlist` | ✓ | ✓ (carId required) | ✓ 60/hr/IP | N/A | ✗ |
| `DELETE /api/watchlist` | ✓ | ✓ (carId required) | ✗ | ✓ (filters by user.id) | ✗ |
| `POST /api/inquire` | None | ✓ (CAPTCHA + fields) | ✓ 10/hr | N/A | ✗ |
| `POST /api/offers` | Optional | ✓ (required fields, amount > 0) | ✓ 10/hr/IP | N/A | ✗ |
| `GET /api/reviews` | None | ✓ (dealerId required) | ✗ | N/A | N/A |
| `POST /api/reviews` | ✓ | ✓ (rating 1–5, 1/user/dealer) | ✓ 10/hr/IP | N/A | ✗ |
| `POST /api/track-view` | None | ✓ (listingId + dealerId) | ✗ | N/A | N/A |
| `POST /api/notify-watchers` | ✓ (must be listing owner) | ✓ (carId, prices checked) | ✓ 30/hr/IP | ✓ seller_id = user.id | N/A |
| `POST /api/cars/sold` | ✓ | ✓ (carId required) | ✗ | ✓ seller_id = user.id | ✗ |
| `POST /api/listings/[id]/renew` | ✓ | ✓ (status=approved, not feed-managed) | ✗ | ✓ seller_id = user.id | ✗ |
| `POST /api/email/expiring-listings` | Bearer secret | N/A | ✗ | N/A | N/A |
| `POST /api/cars/verify-vin` | None | ✓ (VIN format) | ✓ 20/hr/IP | N/A | N/A |
| `GET /api/makes` | None | N/A | ✗ | N/A | N/A |
| `GET /api/account/profile` | ✓ | N/A | ✗ | ✓ (filters by user.id) | ✗ |
| `POST /api/account/profile` | ✓ | ✓ | ✗ | ✓ (upsert by user.id) | ✗ |
| `POST /api/email/price-drops` | Bearer secret | N/A | ✗ | N/A | N/A |
| `POST /api/email/digest` | Bearer secret | N/A | ✗ | N/A | N/A |
| `POST /api/email/dealer-report` | Bearer secret | N/A | ✗ | N/A | N/A |
| `price_history` table (Supabase) | RLS enabled | N/A | N/A | ✓ seller read own only | N/A |

### Notable Security Concerns

**Fixed (2026-07-02 — S1–S6):**

1. ~~`POST /api/alerts/match` had no auth~~ → **Fixed (S1)**: now requires `Bearer INTERNAL_API_SECRET`; only `PATCH /api/admin/listings` (approve action) passes the secret.
2. ~~`POST /api/notify-watchers` had no auth~~ → **Fixed (S2)**: now requires auth + seller ownership + 30/hr/IP rate limit.
3. ~~`POST /api/ads/track` had no rate limit~~ → **Fixed (S3)**: now rate limited to 60 clicks/hr/IP.
4. ~~Suspended users could still submit and edit listings~~ → **Fixed (S4)**: `POST /api/listings/submit` and `PATCH /api/listings/[id]` both check `suspended_users` table and return 403.
5. ~~`GET /api/dealer/watcher-counts` allowed any auth user to query watcher counts for any carIds~~ → **Fixed (S5)**: carIds now filtered to `seller_id = user.id` before querying watchlists.
6. ~~`POST /api/offers` and `POST /api/cars/verify-vin` had no rate limits~~ → **Fixed (S6)**: offers limited to 10/hr/IP; VIN lookups limited to 20/hr/IP.

**Remaining concerns:**

7. **Admin role scoping (support) in UI** — Fixed in `app/admin/page.tsx`: support role now lands on Reported tab, Listings/Messages/Users tabs are hidden. API-layer role checks (moderator+) were already correct. ✓ Resolved.
8. **`POST /api/ads/track`** — any caller can still log clicks for any `adId`; no ad ownership verified. Low risk (no data leak, only inflates counts), but could skew analytics.
9. ~~**`POST /api/admin/team` role allowlist**~~ — **Fixed (2026-07-03)**: API now accepts all 4 roles (`support`, `moderator`, `admin`, `superadmin`).
10. **No CAPTCHA on `POST /api/offers`** — anonymous offer submission is intentional (lowers friction for buyers) but enables spam. Rate limit (10/hr/IP) added in S6 as mitigation; CAPTCHA would be a stronger guard.

**Fixed in P2/P5/P6/P1 (2026-07-02):**
- ~~VIN verification not wired to sell form~~ → **Fixed (P2)** — VIN input + inline verify button on `/sell`; result badge shown; `vin`/`vin_verified` stored on submit
- ~~Dealer beta expiry not checked on listing edit~~ → **Fixed (P5)** — `PATCH /api/listings/[id]` now checks `beta_expires_at`
- ~~Advertiser trial not checked on ad edit~~ → **Fixed (P6)** — trial check now runs for both create and update in `POST /api/advertiser/ads`
- ~~Export inventory button was a stub~~ → **Fixed (P1-partial)** — `GET /api/dealer/export?format=csv|json` implemented and wired to dashboard

**Fixed in M1–M10 (2026-07-02):**
- ~~`POST /api/watchlist` had no rate limit~~ → **Fixed (M1)** — 60/hr/IP
- ~~`POST /api/conversations/[id]/messages` had no rate limit~~ → **Fixed (M2)** — 60/hr/IP
- ~~Ad `cta_url` accepted any scheme including `javascript:`~~ → **Fixed (M5)** — must be `http(s)://`
- ~~`state` field accepted any 2-char string~~ → **Fixed (M8)** — validated against `US_STATES` in `lib/constants.ts`
- ~~Ad serving ignored `radius_miles`~~ → **Fixed (M4)** — haversine distance against state centroids
- ~~`price_history` table had no RLS~~ → **Fixed (M10)** — RLS enabled; sellers read own only

**Fixed post-audit (2026-07-02):**
- ~~`dealer_reviews` had no unique constraint~~ → **Fixed** — `UNIQUE(dealer_id, reviewer_id)` added via `supabase/migrations/20260702_dealer_reviews_unique.sql`; closes the check-then-insert race in `POST /api/reviews`
- ~~`POST /api/reviews` had no rate limit~~ → **Fixed** — 10/hr/IP via `lib/rateLimit.ts`
- ~~Max 10 alerts race condition~~ → **Fixed** — `BEFORE INSERT` trigger on `saved_searches` (advisory-lock-guarded) via `supabase/migrations/20260702_race_condition_fixes.sql`
- ~~Max 10 listings race condition~~ → **Fixed** — `POST /api/listings/submit` now inserts via `insert_listing_with_limit()` RPC, which atomically re-checks the count under an advisory lock before inserting
