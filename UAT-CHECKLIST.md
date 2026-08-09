# GarageCherries — UAT Checklist

*Generated 2026-07-07 against `IMPLEMENTATION_STATUS.md` (commit `3d9a51c`+) and `SPEC.md`. Test against production (`garagecherries.com`) unless noted. Check off each item; note any failures with the URL and what happened.*

*Updated 2026-07-10 (commit `022c1df`) — added items for the buyer signup Full Name fix and the password-reset redirect fix (both `/account/forgot-password` and the dealer self-serve flow on `/dealer/login`); the sign-off below predates these fixes and does not cover them.*

*Updated 2026-07-11 — added items for configurable free-account durations: the superadmin-only Trial & Promo Settings card (Team tab) and the per-account dealer/advertiser trial override (Users tab → Edit). The sign-off below predates this feature and does not cover it.*

*Updated 2026-07-14 — added items for: the sign-out button (§2), My Listings views/watching counts (§3), dealer Overview per-listing views/watching and Inventory tab Views/Watchers columns (§4), sold listings correctly excluded from a dealer's public profile grid (§1) and dashboard Overview panel (§4), VIN-first field order (§3, already present), and the `inquiries`→`conversations` rewire (§2/§4/§7/§8, already present). The sign-off below (2026-07-09) predates all of this session's work and does not cover any of it.*

*Updated 2026-07-17 — added items for: the Car Guide "Live Inventory" model-matching fix and the new Dodge SRT brand-overview page (§1); admin Listings tab filtering/sorting/pagination, per-listing view/watcher counts, and the manual "Post to Facebook"/"Repost to Facebook" action (§6). The sign-off below predates all of this session's work and does not cover any of it.*

*Updated 2026-07-22 — added items for: dealer multi-location support and the "Our Locations" section on a dealer's public page (§1); dealer self-service Feed Sync settings and a now-functional "Sync now" button, replacing the old "Import JSON"/"Sync Now — Coming soon" line, which is no longer accurate (§4); public-facing pagination on `/listings` and every `/cars` listings grid, and the `/listings` sort dropdown (§1); `$0`-priced listings showing "Call For Price" (§1). The sign-off below predates all of this and does not cover any of it.*

*Updated 2026-07-23 — added items for: dealer Feed Sync gaining a "Feed Type" choice between the existing direct URL and a new SFTP option (host/port/username/password/remote path), for dealers whose inventory platform only exports via FTP/SFTP rather than a hosted pull URL (§4); the site nav (desktop + mobile) and footer gaining a "Shop"/"Shop Merch" link to the GarageCherries merch storefront (§1); the pricing page's 250th Promo banner and advertiser-section promo text now correctly showing the real configured promo dates instead of stale hardcoded ones, and the homepage promo popup's copy and its show/hide behavior both now driven by that same setting instead of a separate hardcoded date (§1). The sign-off below predates all of this and does not cover any of it.*

*Updated 2026-07-29 (commit `4fe4714`) — added an item for the new "SFTP — we host" Feed Sync option (dealers push a file to us via SFTP, instead of only the two existing pull-based options); already live-verified end-to-end with a real dealer account and real credentials, not just written from the code.*

*Updated 2026-08-08 — added items for: the homepage stats bar showing real Active Listings/Dealers/Cars Sold counts (§1); the new `/dmca` and `/affiliate-disclosure` pages and their footer links (§1); the Financing Calculator's strengthened disclaimer text (§1, existing item); the "car sold" watcher email now including a leave-a-review link, firing for feed-sync-marked-sold listings (not just manually-marked ones), and including a working unsubscribe link (§7); a fixed Oldsmobile 4-4-2 Live Inventory bug, 20 new Classic Car Encyclopedia model pages across five batches (Chevrolet/Ford/GMC trucks, Dodge/Jeep, then Mercedes), a one-off "Classic"→"Glassic" make correction, matchModel/matchMake fixes so several pages catch real listings sellers spelled or categorized differently, 2 new entries in the site's `MAKES` filter list (Austin, Subaru), durable feed-sync-level fixes so "Mercedes-Benz" always normalizes to "Mercedes" and "Classic"+Glassic-giveaway normalizes to "Glassic" on import, and removing the `MAKES`-list dependency from the `/listings/[make]/[model]` browse route entirely so any real make in inventory works without needing to be added to a list; a new `/cars/muscle-cars` SEO landing page with real matching inventory, a `/cars` featured card, a footer link, and a sitemap entry; and new real per-state event pages (`/events/state/ohio`, etc.) with a "Browse by State" section, proper canonicals, and sitemap entries for all 16 states with real events (§1, §4). The sign-off below predates all of this and does not cover any of it.*

*Updated 2026-08-09 — a wrong-priced social video (Atomic Motors LeBaron) was corrected at its source and re-posted with the right price after Derek deleted the old Facebook/Instagram posts; 16 more events added across two batches (North Carolina, now 17 total) using a new fuzzy-name-matching dedup check alongside the existing exact match; a first South Carolina batch (13 events, new 17th state) caught and fixed a real false-positive bug in that same fuzzy matcher (generic words like "car"/"show"/"church" were counted as meaningful overlap); a first Georgia batch (12 events, new 18th state) added a same-date-and-city review check alongside name-similarity matching; a first Florida batch (10 events, new 19th state) upgraded that into a real venue-comparison check; a first Alabama batch (11 events, new 20th state) reused it unchanged; first Alaska (5 events, new 21st state), Arizona (19 events, new 22nd state), Arkansas (11 events, new 23rd state), a New England batch spanning MA/NH/CT (13 events, 3 new states), and a first Delaware batch (20 events across DE and PA, DE a new 27th state), a first Hawaii batch (5 events, new 28th state), a first Louisiana batch (19 events, new 29th state), a first Maine batch (7 events, new 30th state) also reused it unchanged, and a first DMV-area batch (15 events: 1 Maryland, new 31st state, and 14 Virginia) surfaced a real dedup-script gap — 2 duplicates with a full venue address in their `location` field weren't caught by the location-comparing checks, but both were caught by the database's own slug-uniqueness constraint before anything bad was written, with a 3rd caught normally. 12 of 15 net-new. A 14-event batch across six states (Mississippi, Montana, Nebraska, New Jersey new — 32nd–35th states) applied the fix, flagging same-date/same-state name matches with non-overlapping city text for manual review instead of silently passing them through; nothing flagged, all 14 net-new. A first New Mexico and first New York batch (10 events, both new — 36th/37th states) also reused it unchanged, nothing flagged, followed by a second New York batch (8 more events, Long Island area, no overlap with the first) also unchanged, and a first North Dakota batch (15 events, new 38th state) also unchanged — two recurring series each appeared twice on different dates within the batch, correctly kept separate. A first Oklahoma batch (21 events, largest single batch so far, new 39th state) also unchanged, with Oklahoma City appearing 5 times across different dates and nothing flagged. A Pacific Northwest batch (15 events: Washington already covered, Oregon new — 40th state) also unchanged, nothing flagged. A first Rhode Island batch (10 events, new 41st state) also unchanged — Newport and Warwick each appeared multiple times on different dates, correctly kept separate. A first South Dakota batch (14 events, new 42nd state) also unchanged — Sturgis and a recurring market show each appeared multiple times on different dates, correctly kept separate. A first Tennessee batch (27 events, largest single batch so far, new 43rd state) also unchanged, with several cities recurring across different dates and nothing flagged. A first Texas batch (15 events, new 44th state) also unchanged, nothing flagged. A first Utah batch (14 events, new 45th state) also unchanged — Salt Lake City and Midvale each appeared twice on different dates, correctly kept separate. A first Vermont batch (12 events, new 46th state) also unchanged — two recurring series each appeared multiple times on different dates, correctly kept separate. A first West Virginia batch (25 events, new 47th state) also unchanged — three recurring series each appeared twice on different dates, correctly kept separate. A first Wisconsin batch (25 events, new 48th state) also unchanged — one same-city/same-date pre-existing event logged for visibility but confirmed genuinely unrelated, not skipped. A first Wyoming batch (8 events, new 49th state) also unchanged, followed by a first Idaho batch (10 events) that completes real event coverage for all 50 states. The Delaware batch's venue check flagged one real same-city/same-date collision, checked and confirmed genuinely distinct, not skipped. All 50 states now covered. Separately, a real bug Derek found was fixed: the admin dashboard's "View ↗" link on a pending/rejected listing 404'd because the public listing page's anon Supabase client is blocked by RLS from seeing non-approved listings — added an admin-only fallback that retries with the service-role client only for a verified logged-in admin. New checklist item added to §6 (Admin Panel). A second Maryland batch (33 events) and a second Minnesota batch (19 events) both reused the unchanged dedup pipeline, with several recurring series in each correctly kept separate across different dates. A second Kansas batch (36 events) also reused it unchanged and caught one real duplicate via fuzzy name matching, verified genuine before skipping. A second Indiana batch (24 events) also reused it unchanged, nothing flagged. A second Kentucky batch (14 events) also reused it unchanged — Bowling Green and a recurring cruise-in series each appeared multiple times on different dates, correctly kept separate. A second Colorado batch (19 events, CO the last remaining thin state) also reused it unchanged and caught one real duplicate (a national Goodguys event matching an existing thinner record) via fuzzy name matching, verified genuine before skipping without overwriting the existing row. No new testable UI surface from any of this — covered by the existing generic per-state-page checklist item. Separately, an SEO strategy audit led to Phase 1 (internal linking) fixes — new checklist items added to §1 for the listing→Encyclopedia link, event-page state/dealer CTAs, corrected footer body-style links, and the guide's Encyclopedia link.*

---

## 1. Public Browsing (no login required)

- [ ] Homepage (`/`) loads — hero, featured listings, recently listed section
- [ ] Homepage stats bar (between hero and "Browse by Body Style") shows real, non-zero Active Listings / Dealers / Cars Sold numbers
- [ ] `/listings` loads and shows cars; filter sidebar present (make, year, price, condition, body style, transmission, state)
- [ ] Keyword search box on `/listings` returns relevant results for a text query (e.g. a make or model name)
- [ ] Filtering by make narrows results correctly
- [ ] `/listings` shows numbered pagination at the bottom (1, 2, 3 … Next →) once there are more than 9 matching results; page 2+ shows different cars than page 1 (no duplicates or repeats across pages); "N listings found" reflects the true total, not just the current page's count; the control disappears entirely when everything fits on one page
- [ ] `/listings` "Sort by" dropdown (Newest / Price: Low to High / Price: High to Low / Featured First) actually reorders results; Featured First shows featured listings first without hiding the rest; changing sort resets back to page 1
- [ ] A listing priced at `$0` shows "Call For Price" instead of "$0" everywhere it appears (listing card, listing detail page)
- [ ] `/cars/[make]` (e.g. `/cars/ford`) shows all cars for that make with model sub-nav
- [ ] `/cars/[make]/[model]` shows filtered results, paginated 3 at a time (1 row) once there are more than 3 matching listings
- [ ] `/cars/[decade]`, a body-style page (e.g. `/cars/convertibles`), and a price-tier page (e.g. `/cars/under-10k`) each paginate their live-listings section the same way (3/page), with a real total count in the section heading
- [ ] Listing detail page loads: photo gallery + thumbnails, full spec sheet, dealer info panel with map
- [ ] Listing detail page shows **Make an Offer** button (dealer listings) and the offer modal opens
- [ ] Listing detail page shows **Financing Calculator** (collapsible) and the math updates when inputs change; disclaimer text states this is an estimate only, not an offer of credit, and that GarageCherries is not a lender
- [ ] Listing detail page shows an **ad** in the sidebar (`AdSlot`) — or confirm it gracefully shows nothing if no eligible advertiser, not a broken layout
- [ ] Sold listing shows a "This vehicle has sold" banner + "View Similar Listings" link
- [ ] Listing detail page shows a "Read our full buying guide →" link to the matching Encyclopedia entry when one exists for that make/model (added 2026-08-09; e.g. a Chevrolet Camaro listing links to `/cars/chevrolet/camaro`); a listing whose model has no Encyclopedia entry correctly shows no such link
- [ ] Dealer directory (`/dealers`) lists all dealers with listing counts
- [ ] Dealer profile page (`/dealers/[slug]`) shows logo, description, specialties, map, **tier badge** (Bronze/Silver/Gold), and **reviews** section
- [ ] Dealer profile page inventory grid does NOT show a listing the dealer has marked Sold (mark one sold via dashboard, refresh the public profile page)
- [ ] A dealer with 2+ locations added (Settings → Locations) shows an "Our Locations" section on their public profile page, with the primary location badged; a dealer with only 1 location (the default) shows no such section
- [ ] Classic Car Encyclopedia (`/cars`) — browse index, open a model page, confirm history/specs/live listings render
- [x] `/cars/oldsmobile/4-4-2` shows real Live Inventory listings — was invisible due to a `442`-vs-`4-4-2` naming mismatch; fixed 2026-08-08, confirmed live (4+ real listings render)
- [ ] New model pages render with real Live Inventory listings: `/cars/chevrolet/c10`, `/cars/chevrolet/3100`, `/cars/chevrolet/suburban`, `/cars/chevrolet/210`, `/cars/ford/f-100`, `/cars/ford/model-a`, `/cars/ford/f-250`, `/cars/gmc/100`, `/cars/gmc/sierra` (added 2026-08-08); confirm `/cars/gmc/suburban` still renders correctly too (same model name, different make)
- [ ] `/cars/ford/f-150` (added 2026-08-08) loads correctly and shows "No listings currently available" — correct empty state, not a bug, since there's no F-150 in real inventory yet
- [ ] New model pages render with real Live Inventory listings: `/cars/dodge/power-wagon`, `/cars/dodge/ramcharger`, `/cars/dodge/ram`, `/cars/jeep/cj-7`, `/cars/jeep/wrangler`, `/cars/jeep/commando` (added 2026-08-08)
- [ ] `/cars/chevrolet/c10` shows real inventory listed under alternate names too — "C/K 10," "K5 Blazer," "Apache," "Silverado" (extended 2026-08-08); `/cars/chevrolet/3100` similarly includes "3600"-titled listings
- [ ] New Mercedes pages render with real Live Inventory listings: `/cars/mercedes/250sl`, `/cars/mercedes/sl500`, `/cars/mercedes/clk`, `/cars/mercedes/gl-class` (added 2026-08-08) — GL Class in particular should show 2 listings, since it matches both "GL Class" and "AMG GL43 Studio Edition" real listings
- [ ] Mercedes pages pick up real listings stored under `make: "Mercedes-Benz"` as well as `make: "Mercedes"` (added 2026-08-08 via `matchMake`) — spot-check `/cars/mercedes/clk` (real listing is stored as Mercedes-Benz)
- [ ] `/listings` make filter dropdown includes "Austin" and "Subaru" (added 2026-08-08); does NOT include "Mercedes-Benz," "Harley Davidson," or "IR" — deliberate
- [ ] `/listings/mercedes/clk350` (2-segment browse page) loads correctly, doesn't 404 — this route validates against the `MAKES` list, a different code path than the listing detail page
- [ ] `/listings/glassic` and `/listings/glassic/glassic-replica` both load correctly, no 404 (added 2026-08-08 — `/listings/[make]/[model]` no longer gates on the hardcoded `MAKES` list, resolves against real listings instead); spot-check `/listings/ford/mustang` (an already-working page) still renders correctly too, as a regression check
- [x] A Car Guide model page's "Live Inventory" section shows a matching live listing whose actual model name is more specific than the page's general model family (e.g. `/cars/dodge/challenger` showing a listing titled "...Challenger SRT Hellcat") — was exact-matching and silently showed "No listings currently available" for almost every page; fixed 2026-07-17, confirmed live for Dodge Challenger and Mazda Miata
- [ ] Dodge SRT brand-overview page (`/cars/srt`) loads — history, model lineup, notable special editions, buying tips, and a working "View SRT Listings" CTA; also check the "Featured Guide" card appears on `/cars` and on `/cars/dodge` specifically (confirm absent on another make's page, e.g. `/cars/ford`)
- [ ] `/cars/muscle-cars` (added 2026-08-08) loads — history, notable models, buying tips, and real matching listings (should show 80+ real cars: Camaro, Chevelle, GTO, Charger, Challenger, Mustang, etc.); pagination works past page 1; "Featured Guide" card appears on `/cars` above the SRT card; Footer "Muscle Cars" link (Browse column) points to this page; confirm `/sitemap.xml` includes it
- [ ] Buyer's Guides (`/guides`) — index and at least one article open
- [ ] Market Report (`/reports`) loads with live data
- [ ] Pricing page (`/pricing`) loads — plan tiers, advertiser section, promo banner
- [ ] About / Contact / Privacy / Terms pages all load with real content
- [ ] `/dmca` page loads — copyright infringement notice requirements, designated agent contact, counter-notification process
- [ ] `/affiliate-disclosure` page loads — footer has both "DMCA Policy" and "Affiliate Disclosure" links (Company column)
- [ ] Sold archive (`/sold`) shows a gallery of sold vehicles with "Listed at $X" labeling
- [ ] Events calendar (`/events`) loads — shows upcoming/featured/past sections or empty state
- [ ] `/events` shows a "Browse by State" section (added 2026-08-08) with real states/counts, sorted highest-first (e.g. Virginia, Missouri, Ohio); each link goes to `/events/state/[state]`
- [ ] `/events/state/ohio` (added 2026-08-08) loads with a real, state-specific title ("Ohio Car Shows & Events 2026") and real Ohio events; an invalid state (`/events/state/not-a-real-state`) 404s; `/events?state=OH` still works exactly as before but its canonical now points to `/events/state/ohio`
- [ ] An individual event page (`/events/[slug]`) loads with date/location/"Add to Google Calendar" link
- [ ] An individual event page shows "Browse Cars For Sale in {State} →" (links to `/listings?state=XX`) and "Find a Dealer →" CTAs (added 2026-08-09); a state events page (`/events/state/ohio`) shows a "Browse cars for sale in {State} →" link under the intro copy
- [ ] Footer Browse column: "Dodge SRT" and "Market Report" links present (added 2026-08-09, previously mobile-nav-only); "Convertibles"/"Classic Trucks"/"Coupes" link to `/cars/convertibles`/`/cars/pickup-trucks`/`/cars/coupes` (the long-form guide pages), not `/listings?bodyStyle=...` filtered search
- [ ] Guides (`/guides/how-to-buy-a-classic-car-online`): the "GarageCherries Encyclopedia" mention in the first section is a real link to `/cars` (added 2026-08-09, was plain text before)
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
- [ ] Settings → **Locations** — add a second location, mark it primary; confirm the dealer's own phone/address/city/state/zip/email update to match, and the public dealer page's "Our Locations" section appears (see §1); edit and delete a location
- [ ] Settings → **Feed Sync** — enter a feed URL and pick a daily sync hour, save succeeds; "Sync now" button in the Overview header runs an immediate sync and shows a result summary (e.g. "3 inserted, 1 updated, 0 sold, 0 skipped"); button is disabled with a tooltip if no feed URL is configured yet. **Import JSON** no longer exists (removed — this vendor format never offered a JSON/API option, only a CSV/XML feed URL)
- [ ] Settings → **Feed Sync → Feed Type: SFTP** — switching from "Direct URL (HTTPS)" swaps the URL field for Host/Port/Username/Password/Remote File Path; saving with SFTP configured (no Feed URL) still enables the "Sync now" button in the Overview header
- [ ] Settings → **Feed Sync → Feed Type: SFTP — we host** (added 2026-07-29) — selecting it shows a "Generate SFTP Credentials" button instead of input fields; clicking it displays a one-time Host/Port/Username/Password box (password never shown again); once provisioned, the section instead shows the username, "Last file received" status, and "Generate New Password"/"Remove SFTP Access" buttons. Live-verified end-to-end with a real dealer account: generated credentials, uploaded `inventory.csv` via a real SFTP client to `video.garagecherries.com:2022`, ran "Sync now", listing appeared correctly
- [ ] (If a test dealer account has an expired beta) — confirm redirect to `/dealer/expired` on dashboard load
- [ ] A dealer feed row with `Make: "Mercedes-Benz"` syncs in as `make: "Mercedes"` (added 2026-08-08, `normalizeMake()` in `dealer-feed-sync/route.ts`) — verified via automated test with real sample feed data; not yet manually re-verified against a live dealer feed since the fix shipped
- [ ] A dealer feed row with `Make: "Classic"` AND "Glassic" somewhere in Sub-Model or the VDP URL syncs in as `make: "Glassic"`; an unrelated `Make: "Classic"` row with no Glassic giveaway anywhere stays "Classic" (added 2026-08-08) — verified via automated tests, not yet against a live feed

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
- [ ] **Users tab → Seller Listings modal**: click "View ↗" on a pending or rejected listing while logged in as admin — opens the real public listing page (not a 404); log out (or open in a private window) and hit the same URL directly — confirms a real "Page not found," since non-approved listings must stay non-public (added 2026-08-09, fixes a real bug — see IMPLEMENTATION_STATUS.md item #77)
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
- [ ] Listing marked sold → watchers get "this car has sold" email, including a link to leave a dealer review and a working unsubscribe link; verify this fires both when marked sold manually (dealer dashboard) AND via an automated feed sync (dealer's feed no longer lists the car)
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
