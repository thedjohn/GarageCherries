# GarageCherries — UAT Checklist

*Generated 2026-07-07 against `IMPLEMENTATION_STATUS.md` (commit `3d9a51c`+) and `SPEC.md`. Test against production (`garagecherries.com`) unless noted. Check off each item; note any failures with the URL and what happened.*

---

## 1. Public Browsing (no login required)

- [ ] Homepage (`/`) loads — hero, featured listings, recently listed section
- [ ] `/listings` loads and shows cars; filter sidebar present (make, year, price, condition, body style, transmission, state)
- [ ] Keyword search box on `/listings` returns relevant results for a text query (e.g. a make or model name)
- [ ] Filtering by make narrows results correctly
- [ ] `/cars/[make]` (e.g. `/cars/ford`) shows all cars for that make with model sub-nav
- [ ] `/cars/[make]/[model]` shows filtered results
- [ ] Listing detail page loads: photo gallery + thumbnails, full spec sheet, dealer info panel with map
- [ ] Listing detail page shows **Make an Offer** button (dealer listings) and the offer modal opens
- [ ] Listing detail page shows **Financing Calculator** (collapsible) and the math updates when inputs change
- [ ] Listing detail page shows an **ad** in the sidebar (`AdSlot`) — or confirm it gracefully shows nothing if no eligible advertiser, not a broken layout
- [ ] Listing detail page sidebar shows **"Get This Car Inspected"** card with a "Book an Inspection →" link; link URL contains `lemonsquad.com` with year/make/model pre-populated and `utm_source=garagecherries`; FTC referral disclosure visible below the button
- [ ] Listing detail page sidebar shows **Detail 360** sponsor card below the ad slot with logo, tagline ("Professional auto detailing…"), and "Book a Detail →" link to `detail360stl.com`
- [ ] Sold listing shows a "This vehicle has sold" banner + "View Similar Listings" link
- [ ] Dealer directory (`/dealers`) lists all dealers with listing counts
- [ ] Dealer profile page (`/dealers/[slug]`) shows logo, description, specialties, map, **tier badge** (Bronze/Silver/Gold), and **reviews** section
- [ ] Classic Car Encyclopedia (`/cars`) — browse index, open a model page, confirm history/specs/live listings render
- [ ] Buyer's Guides (`/guides`) — index and at least one article open
- [ ] Market Report (`/reports`) loads with live data
- [ ] Pricing page (`/pricing`) loads — plan tiers, advertiser section, promo banner
- [ ] About / Contact / Privacy / Terms pages all load with real content
- [ ] Sold archive (`/sold`) shows a gallery of sold vehicles with "Listed at $X" labeling
- [ ] Events calendar (`/events`) loads — shows upcoming/featured/past sections or empty state
- [ ] An individual event page (`/events/[slug]`) loads with date/location/"Add to Google Calendar" link
- [ ] Cookie consent banner appears on first visit
- [ ] 404 page shows for an unknown URL (not a crash)
- [ ] Spot-check mobile viewport (resize browser or use phone) on homepage, listings, and a listing detail page — no broken layout

---

## 2. Buyer Account

- [ ] Sign up for a new account (`/account/signup`)
- [ ] Log in / log out
- [ ] Forgot password → reset flow completes
- [ ] Profile management (`/account/profile`) — update name/phone, save succeeds
- [ ] Watch a listing (heart/save icon) — appears under Watchlist tab
- [ ] Unwatch a listing — disappears from Watchlist
- [ ] Create a saved search alert with at least 2 criteria — appears under Alerts tab
- [ ] Try creating an 11th alert (if you have 10) — blocked with a clear message
- [ ] Pause / edit / delete an alert
- [ ] Contact a seller from a listing page — message sends, appears in Messages
- [ ] Reply within an open conversation — real-time or near-real-time delivery; sender name label shows the other party's real name (not your own)
- [ ] Open the Messages tab — confirm conversations show "Private Seller" (for your own buyer conversations) and the buyer's name (for seller conversations), not "Buyer: Name" for everything
- [ ] Report a message — flag succeeds
- [ ] Leave a dealer review (rating + text) — appears on dealer profile
- [ ] Try leaving a **second** review for the same dealer — blocked with "already reviewed" message
- [ ] Submit a community event (logged in) — appears in admin's pending queue (see §5)
- [ ] Click an unsubscribe link from an email (digest/alerts/price-drop/dealer-report) — confirms opt-out without requiring login

---

## 3. Private Seller Flow

- [ ] Visit `/sell` while logged out — see sign-in/sign-up gate, not the form
- [ ] Log in, land on `/sell` — full form appears (vehicle info, VIN, location, photos)
- [ ] Try submitting with **zero photos** — blocked with a clear message
- [ ] Enter a VIN and click "Verify VIN" — color-coded result badge appears (verified/partial/pre-1981/invalid)
- [ ] Submit a complete listing — confirmation screen shown, CAPTCHA required
- [ ] New listing shows as **pending** under `/account?tab=listings` (not publicly visible yet)
- [ ] After admin approval (see §5), listing appears in public search
- [ ] Edit your own approved listing — all vehicle fields editable (year, make, model, body style, condition, fuel type, engine, transmission, color, interior color, seat material, city, state, price, mileage, description, photos); status reverts to pending for re-review
- [ ] Drag photos to reorder in the edit form — numbers update live; new order saves correctly
- [ ] Add new photos in edit form — upload completes before reorder, reorder after upload both work
- [ ] Reopen edit form after saving — all changed values appear pre-populated (not reverted to old values)
- [ ] Delete your own listing — removed from account and public listings
- [ ] Listing shows a days-remaining countdown as it approaches 30-day expiry (amber warning at ≤7 days) — check on an older test listing if available
- [ ] "Renew listing" button extends the expiry date
- [ ] Mark listing as Sold — badge immediately changes to "Sold", Mark as Sold and Renew buttons disappear; badge still shows "Sold" after page refresh

---

## 4. Dealer Flow

- [ ] Submit a dealer application (`/dealer/apply`) — CAPTCHA required, confirmation shown
- [ ] After admin approval (see §5), receive password-reset email; reset link works (`/dealer/reset-password`)
- [ ] Dealer login (`/dealer/login`) works with new password
- [ ] Dashboard loads with tabs: Overview, Inventory, Inquiries, Settings
- [ ] Overview tab shows real stats (active listings, views, inquiries, avg. days on market)
- [ ] Add a vehicle via "+ Add vehicle" modal — appears **immediately** as approved (no review wait)
- [ ] Edit a vehicle's price — price history updates, watcher notification fires (spot-check via a watching test account/email)
- [ ] Mark a listing as **Sold** — confirmation modal, badge changes to "Sold", Mark Sold/Renew buttons disappear
- [ ] Toggle "Featured" on a listing — badge appears on the listing card
- [ ] Export inventory as CSV and as JSON — both downloads work and contain real data including seat_material and seating_type columns
- [ ] Mark a listing as Sold in dealer dashboard — Edit button and "Expires in Xd" text disappear; only View remains
- [ ] Settings tab — update dealer profile fields, upload a logo (JPG/PNG/WebP), preview updates immediately
- [ ] "Message watchers" on a listing with watchers — compose modal sends, "Messaged" label appears after
- [ ] Confirm **Import JSON** and **Sync Now** buttons are visibly disabled with a "Coming soon" tooltip — this is expected, not a bug
- [ ] (If a test dealer account has an expired beta) — confirm redirect to `/dealer/expired` on dashboard load

---

## 5. Advertiser Flow

- [ ] `/advertise` marketing page loads
- [ ] Advertiser signup (`/advertiser/signup`) — CAPTCHA required, trial starts, redirected to dashboard
- [ ] Advertiser login/logout works
- [ ] Create an ad (headline, body, CTA, phone, logo, photo) — saves successfully
- [ ] Edit an existing ad
- [ ] **Confirm the ad actually appears** in a listing page's `AdSlot` for a matching state — this is the most important check given past history of this being broken
- [ ] Advertiser public directory (`/advertisers`) lists active advertisers grouped by category
- [ ] Advertiser public profile (`/advertisers/[slug]`) shows business info and current ads

---

## 6. Admin Panel (`/admin`)

- [ ] Log in as a non-admin user and confirm `/admin` denies access
- [ ] Log in as admin — panel loads with tabs per role (support sees only Reported; moderator+ sees more)
- [ ] **Listings tab**: approve a pending listing — goes live, seller gets an email
- [ ] **Listings tab**: reject a pending listing with a reason — seller gets an email with the reason
- [ ] Reject → seller resubmits with a note → listing returns to pending
- [ ] **Reported tab**: open a reported message — full conversation thread expands, reported message highlighted
- [ ] **Reported tab**: Dismiss a report — clears the flag
- [ ] **Reported tab**: Warn a user — warning email sends; amber "⚠️ Warning sent to [name]" banner appears on the card; banner persists until admin clicks the Dismiss link
- [ ] **Reported tab**: Suspend a user (with reason) — user can no longer submit listings or message
- [ ] **Users tab**: search/filter users, view a seller's listings
- [ ] **Users tab**: promote a seller to dealer
- [ ] **Applications tab**: approve a dealer application — auth user + dealer row created, welcome email sent
- [ ] **Applications tab**: reject an application with a note
- [ ] **Events tab**: approve a pending community-submitted event — appears live on `/events`
- [ ] **Events tab**: add/edit/delete an event directly — goes straight to approved
- [ ] **Team tab**: add a team member by email + role, then remove them
- [ ] **Team tab → Cleanup Orphan Images** button — runs, shows a deleted count
- [ ] `/admin/email` — trigger the weekly digest, price-drop, dealer-report, and renewal-reminder jobs manually; confirm each returns a success response

---

## 7. Email Verification

*(Requires access to a real inbox for a test account — dealer, buyer, and advertiser test emails recommended.)*

- [ ] Buyer sends first message on a listing → seller receives email with buyer name, listing title, message preview, and "Reply to Message" link
- [ ] Buyer sends a second message in the same conversation → seller does NOT receive a second email (first contact only)
- [ ] Buyer inquiry → seller/dealer receives email with buyer's message
- [ ] Listing approved → seller gets "your listing is live" email
- [ ] Listing rejected → seller gets email with rejection reason
- [ ] Dealer application approved → applicant gets password-reset email
- [ ] Saved search match → subscriber gets alert email with an "unsubscribe from all alerts" link
- [ ] Price drop on a watched listing → watcher gets immediate notification
- [ ] Listing marked sold → watchers get "this car has sold" email
- [ ] Listing nearing 30-day expiry → seller gets renewal reminder ~3 days before
- [ ] Admin "Warn User" action → target user receives the warning email

---

## 8. Security / Access Control Spot-Checks

- [ ] Logged-out user visiting `/account`, `/dealer/dashboard`, or `/advertiser/dashboard` is redirected to the relevant login page
- [ ] A suspended test user cannot submit a listing or send a message (clear error shown)
- [ ] Submitting the sell form, dealer apply form, advertiser signup, or contact-seller form without solving the CAPTCHA is blocked with a 400 error
- [ ] `/account/signup` — submitting before CAPTCHA completes shows inline "Please complete the CAPTCHA." error
- [ ] Rapidly submitting the same form many times in a row eventually gets rate-limited with a 429 — verified on `/dealer/apply` (3/hr), `/api/listings/submit` (5/hr), `/api/inquire` (10/hr), `/advertiser/signup` (3/hr)

---

## Sign-off

| Tester | Date | Sections Covered | Result |
|---|---|---|---|
| Derek Johnson | 2026-07-09 | All sections (1–8) | ✅ Pass — 181/196 E2E automated; 15 credential-gated tests verified manually |
