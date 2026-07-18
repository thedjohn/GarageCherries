# GarageCherries — UAT Checklist

*Generated 2026-07-07 against `IMPLEMENTATION_STATUS.md` (commit `3d9a51c`+) and `SPEC.md`. Test against production (`garagecherries.com`) unless noted. Check off each item; note any failures with the URL and what happened.*

*Updated 2026-07-10 (commit `022c1df`) — added items for the buyer signup Full Name fix and the password-reset redirect fix (both `/account/forgot-password` and the dealer self-serve flow on `/dealer/login`); the sign-off below predates these fixes and does not cover them.*

*Updated 2026-07-11 — added items for configurable free-account durations: the superadmin-only Trial & Promo Settings card (Team tab) and the per-account dealer/advertiser trial override (Users tab → Edit). The sign-off below predates this feature and does not cover it.*

*Updated 2026-07-14 — added items for: the sign-out button (§2), My Listings views/watching counts (§3), dealer Overview per-listing views/watching and Inventory tab Views/Watchers columns (§4), sold listings correctly excluded from a dealer's public profile grid (§1) and dashboard Overview panel (§4), VIN-first field order (§3, already present), and the `inquiries`→`conversations` rewire (§2/§4/§7/§8, already present). The sign-off below (2026-07-09) predates all of this session's work and does not cover any of it.*

*Updated 2026-07-17 — added items for: the Car Guide "Live Inventory" model-matching fix and the new Dodge SRT brand-overview page (§1); admin Listings tab filtering/sorting/pagination, per-listing view/watcher counts, and the manual "Post to Facebook"/"Repost to Facebook" action (§6). The sign-off below predates all of this session's work and does not cover any of it.*

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
- [ ] Sold listing shows a "This vehicle has sold" banner + "View Similar Listings" link
- [ ] Dealer directory (`/dealers`) lists all dealers with listing counts
- [ ] Dealer profile page (`/dealers/[slug]`) shows logo, description, specialties, map, **tier badge** (Bronze/Silver/Gold), and **reviews** section
- [ ] Dealer profile page inventory grid does NOT show a listing the dealer has marked Sold (mark one sold via dashboard, refresh the public profile page)
- [ ] Classic Car Encyclopedia (`/cars`) — browse index, open a model page, confirm history/specs/live listings render
- [x] A Car Guide model page's "Live Inventory" section shows a matching live listing whose actual model name is more specific than the page's general model family (e.g. `/cars/dodge/challenger` showing a listing titled "...Challenger SRT Hellcat") — was exact-matching and silently showed "No listings currently available" for almost every page; fixed 2026-07-17, confirmed live for Dodge Challenger and Mazda Miata
- [ ] Dodge SRT brand-overview page (`/cars/srt`) loads — history, model lineup, notable special editions, buying tips, and a working "View SRT Listings" CTA; also check the "Featured Guide" card appears on `/cars` and on `/cars/dodge` specifically (confirm absent on another make's page, e.g. `/cars/ford`)
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

- [ ] Sign up for a new account (`/account/signup`) — **Full Name is now a required field**; submitting without it is blocked by the browser before the form submits
- [x] After signup, confirm the name entered appears in Supabase Auth (Display Name / `user_metadata.full_name`) and on `/account/profile` — previously silently failed to save for every signup (fixed 2026-07-10, commit `98fc3c8`). Confirmed 2026-07-12: test signup "GC Test" (rhythmlibrarysystem@gmail.com) shows correct name in Admin → Users tab, proving it reached `profiles.full_name`.
- [ ] Log in / log out
- [ ] "Sign out" button in the breadcrumb bar on `/account` and `/messages` — signs out and returns to the homepage
- [x] Forgot password (`/account/forgot-password`) → click the emailed link → lands on the **"Set new password" form**, not the homepage. Wildcard Redirect URLs did not actually work; fixed for real 2026-07-11 by using exact literal entries instead (see IMPLEMENTATION_STATUS.md). Confirmed working live by Derek 2026-07-11. Email is now a branded GarageCherries template rather than Supabase's generic default.
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
- [ ] Log in, land on `/sell` — full form appears, VIN field first, then vehicle info, location, photos
- [ ] Try submitting with **zero photos** — blocked with a clear message
- [ ] Enter a VIN and click "Verify VIN" — with Year/Make/Model still blank, a clean decode shows "✓ VIN Decoded" and auto-fills those three fields; re-checking after editing them shows the color-coded match result instead (verified/partial/pre-1981/invalid)
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
- [ ] Each card under `/account?tab=listings` shows a "N views · N watching" line with real counts

---

## 4. Dealer Flow

- [ ] Submit a dealer application (`/dealer/apply`) — CAPTCHA required, confirmation shown
- [ ] After admin approval (see §5), receive password-reset email; reset link works (`/dealer/reset-password`)
- [ ] Dealer login (`/dealer/login`) works with new password
- [ ] Existing dealer clicks "Forgot password" on `/dealer/login` → emailed link lands on the password-set form at `/dealer/login`, not the homepage (same underlying bug as the buyer flow above; exact literal Redirect URL entries for `/dealer/login` were added 2026-07-11 alongside the buyer-flow fix, but this specific dealer path has not yet been re-tested live — only the buyer `/account/forgot-password` flow was confirmed)
- [ ] Dashboard loads with tabs: Overview, Inventory, Inquiries, Settings
- [ ] Overview tab shows real stats (active listings, views, inquiries, avg. days on market)
- [ ] Overview tab "Your listings" panel shows a "N views · N watching" line per card, and does NOT include any listing marked Sold
- [ ] Add a vehicle via "+ Add vehicle" modal — appears **immediately** as approved (no review wait)
- [ ] Edit a vehicle's price — price history updates, watcher notification fires (spot-check via a watching test account/email)
- [ ] Mark a listing as **Sold** — confirmation modal, badge changes to "Sold", Mark Sold/Renew buttons disappear
- [ ] Toggle "Featured" on a listing — badge appears on the listing card
- [ ] Export inventory as CSV and as JSON — both downloads work and contain real data including seat_material and seating_type columns
- [ ] Inventory tab table has Views and Watchers columns showing real counts per listing
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
- [ ] **Listings tab**: each listing card shows a "X views · Y watching" line (added 2026-07-17, mirrors the seller-facing count on `/account`)
- [ ] **Listings tab**: filter bar — make, model, year range, price range, status, resubmissions-only, featured-only, dealer-vs-private-seller, and Facebook posted/not-posted all narrow the list correctly; "Clear all" resets every filter and reloads the full list (added 2026-07-17)
- [ ] **Listings tab**: default sort is Year (newest first) → Make → Model; pagination controls (Previous/Next) appear and work once there are more listings than one page (page size 20) (added 2026-07-17)
- [ ] **Listings tab**: the "X pending · Y approved · Z rejected" summary stays accurate after approving/rejecting/editing/deleting a listing, and after applying a filter — it should never reflect just the current filtered/paginated page (added 2026-07-17)
- [ ] **Listings tab**: click "Post to Facebook" on a never-posted approved listing — posts immediately, button changes to "Repost to Facebook"; clicking it again prompts a confirmation warning about creating a duplicate post before proceeding (added 2026-07-17)
- [ ] **Reported tab**: open a reported message — full conversation thread expands, reported message highlighted
- [ ] **Reported tab**: Dismiss a report — clears the flag
- [ ] **Reported tab**: Warn a user — warning email sends; amber "⚠️ Warning sent to [name]" banner appears on the card; banner persists until admin clicks the Dismiss link
- [ ] **Reported tab**: Suspend a user (with reason) — user can no longer submit listings or message
- [ ] **Users tab**: search/filter users, view a seller's listings
- [ ] **Users tab**: promote a seller to dealer
- [ ] **Users tab → Edit**: on a dealer or advertiser account, confirm a "Dealer Beta Expires" or "Advertiser Trial Ends" date field appears (only for the role(s) that account actually has); change the date, save, reopen the same account's Edit modal and confirm it persisted
- [ ] **Applications tab**: approve a dealer application — auth user + dealer row created, welcome email sent
- [ ] **Applications tab**: reject an application with a note
- [ ] **Events tab**: approve a pending community-submitted event — appears live on `/events`
- [ ] **Events tab**: add/edit/delete an event directly — goes straight to approved
- [ ] **Team tab**: add a team member by email + role, then remove them
- [ ] **Team tab → Trial & Promo Settings** (superadmin only): change one value (e.g., Advertiser Trial Days), save, confirm it persists on reload; sign up a fresh test advertiser and confirm their `trial_ends_at` reflects the new value, not the old default
- [ ] **Team tab → Trial & Promo Settings**: confirm a non-superadmin admin/moderator account does not see this card at all
- [ ] **Team tab → Cleanup Orphan Images** button — runs, shows a deleted count
- [ ] `/admin/email` — trigger the weekly digest, price-drop, dealer-report, and renewal-reminder jobs manually; confirm each returns a success response

---

## 7. Email Verification

*(Requires access to a real inbox for a test account — dealer, buyer, and advertiser test emails recommended.)*

- [ ] Buyer sends first message on a listing → seller receives email with buyer name, listing title, message preview, and "Reply to Message" link
- [ ] Buyer sends a second message in the same conversation → seller does NOT receive a second email (first contact only)
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
- [ ] Rapidly submitting the same form many times in a row eventually gets rate-limited with a 429 — verified on `/dealer/apply` (3/hr), `/api/listings/submit` (5/hr), `/api/conversations` (20/hr), `/advertiser/signup` (3/hr)

---

## Sign-off

| Tester | Date | Sections Covered | Result |
|---|---|---|---|
| Derek Johnson | 2026-07-09 | All sections (1–8) | ✅ Pass — 181/196 E2E automated; 15 credential-gated tests verified manually |

*This sign-off predates all work shipped 2026-07-13/14 — see the "Updated 2026-07-14" note above for the list of items still needing a first pass.*
