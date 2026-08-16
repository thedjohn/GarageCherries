# GarageCherries — Audit Update & Revenue Strategy
**Date:** 2026-08-16 · Builds on [docs/CODEBASE-AUDIT-2026-08-15.md](CODEBASE-AUDIT-2026-08-15.md) (the original 70-item audit). This document updates what's changed since, and adds a dedicated revenue-strategy analysis grounded in the site's actual current state.

---

## Part 1 — What's changed since the original audit

Seven commits landed since the 70-item audit was written (`b724c80..1868b23`). Everything else in the original audit is **still accurate** — no other code has changed. Here's what moved:

| Audit item | Was | Now |
|---|---|---|
| §7 / §63 — `/api/dealer/settings` mass assignment | A dealer could POST `plan`/`beta_expires_at` and self-write it, no allowlist | **Fixed.** Endpoint now only accepts the specific fields the app legitimately sends (`3359e05`) |
| §9 — Featured listings, free-for-all | Any dealer could feature unlimited listings for free via a client-side bypass | **Fixed.** Featured now goes through a server-side endpoint with an ownership check and a cap tiered to inventory size (≤5 listings → 0 featured, ≤25 → 3, unlimited → 10 — matching `/pricing`'s advertised tiers) (`3359e05`) |
| §1 — About/Pricing/Dealers stat inconsistencies | About page hardcoded wrong guide counts (54/6 vs real 156/10); Pricing and Dealers pages counted listings inconsistently with the rest of the site | **Fixed.** Real counts everywhere, same filters as the homepage (`c575f1a`) |
| §23, §35, §51, §52 — dead "similar vehicles" query, mislabeled "Most-Watched" | A same-make similar-cars query ran on every listing page and was never rendered; Market Report's "Most-Watched" was actually page-view data | **Fixed.** Similar Vehicles section now renders; heading renamed to "Most-Viewed" to match what it measures (`2e0a176`) |
| §54 — feed staleness only checked one of three protocols | HTTPS and outbound-SFTP dealer feeds had no staleness check at all; only the admin was ever told | **Fixed.** All three protocols now checked daily; affected dealers get a direct email, not just the admin (`9fc3b40`) |
| §20, §3 — `price_history.old_price` missing column; `listings` INSERT policy gap | Every price-drop history insert silently failed (missing column); nothing at the DB level stopped a private seller from inserting a listing as `status: 'approved'` directly, bypassing review | **Fixed.** Column added; RLS policy now requires a dealer account for an `'approved'` insert (`8844e77`) |
| §57, §59, §60 — zero GA4 custom events, zero UTM/campaign capture | GA4 only saw pageviews; no idea what a visitor actually did, or which campaign brought them | **Fixed.** 5 key actions (contact seller, make offer, newsletter signup, account signup, dealer phone/website click) now fire real GA4 events, each carrying first-touch campaign attribution (`1868b23`) |

**Still open from the original Top 10:**
- **#3** — the three "automated" emails (digest, price-drops, dealer-report) are still manual-trigger-only via `/admin/email`. Small, unblocked, available whenever.
- **#4** — Homepage Spotlight / Bold Search Result are still sold on `/pricing` with zero backing code. Deliberately on hold until Stripe is closer.
- **#5** — No payment processor exists anywhere on the site. The root blocker under every revenue path below that isn't already fully built.

Everything else the original 70-item audit found (advertiser system gaps, dealer-plan enforcement, newsletter send mechanism, affiliate-link gaps, admin tooling gaps, SEO items, etc.) is **unchanged** — none of that work has been touched this session.

---

## Part 2 — Possible ways to generate money

This is grounded in what's *actually built and working today*, not a wishlist. Ranked by how soon each could realistically produce a dollar.

### Tier 1 — Could start generating revenue with no new platform code

**1. Advertiser subscriptions — sell the tiers that already exist and already work.**
The advertiser system (`app/advertiser/*`, `app/api/ads/*`) is the most complete unmonetized product on the site: signup, login, ad creation, real geographic targeting (state-centroid radius, not just a label), impression/click tracking — all functional today, for free, during the trial. The only missing piece is *collecting payment* for the four tiers already priced on `/advertise` ($79–$349/mo). Until Stripe exists, nothing stops you from manually invoicing an advertiser once their trial ends and they want to continue — the product they'd be paying for already works. This is the single fastest path to real revenue because there's no build required to start the conversation.

**2. Affiliate/referral partnerships on existing guide traffic.**
Three buyer guides already name real companies with real audience intent behind them, and none of them have a working affiliate link:
- Financing calculator links to JJ Best and Woodside Credit — plain URLs, no affiliate ID, no tracking.
- The shipping guide mentions uShip, Montway, Intercity Lines, Reliable Carriers — prose only, no links at all.
- The insurance guide mentions Hagerty, Grundy, American Collectors Insurance — same, prose only.

None of this needs a platform rebuild — it needs a business conversation (does a partner agreement exist or can one be struck) and then a small, contained engineering task per partner (add the affiliate ID + a tracked link, reusing the click-tracking pattern already built for `/api/ads/track`). This is close to "free money on the table" if a partner relationship can be established, since the traffic already exists.

**3. Merch (already live, low-effort to expand).**
The footer already links to a Fourthwall shop. Worth checking what commission structure exists there and whether it's worth promoting harder — outside this session's scope to verify, but it's a channel that already exists without needing any app changes.

### Tier 2 — Small, contained builds once you're ready for *any* payment code

**4. A single-product Stripe Checkout for Featured Listing upgrades.**
This builds directly on the tiering work already shipped this session. Right now Featured is capped by inventory size but still entirely free — the natural next step, once you're ready to accept any payment at all, is letting a dealer buy an *extra* Featured slot beyond their free tier via one narrow Stripe Checkout flow. Small, scoped, and reuses the ownership/cap logic that already exists in `app/api/dealer/listings/[id]/featured/route.ts`.

**5. Advertiser billing via Stripe subscriptions.**
The natural next step after Tier 1's manual-invoice version — once you're building real billing, wire the four existing advertiser tiers to actual Stripe subscriptions instead of manual invoicing. This is a strong second Stripe integration to build (after or alongside Featured) because, again, the product itself needs zero further work.

### Tier 3 — Needs real product decisions, not just payment plumbing

**6. Newsletter sponsorship — blocked on a real prerequisite.**
The newsletter has genuine signup capture, but per the original audit (§44), it has **no working send mechanism at all** — the admin campaign buttons that exist all target different tables. You cannot sell newsletter sponsorship until the newsletter can actually be sent to its subscribers. This is a real fix-first item if sponsorship revenue matters to you.

**7. Dealer subscription plans (Starter/Pro/Unlimited).**
The advertised $49/$99/$199 tiers have no enforcement mechanism today, and — importantly — this would need a real decision about what a paid tier even offers now that Featured is already free (just capped by inventory size) for every dealer. Selling a paid plan whose main advertised perk (Featured slots) is already given away free needs to be resolved before this is worth building.

**8. Private-seller one-time listing fees ($49/$99).**
Currently unconditionally free, and you've already confirmed you want to honor "free through the promo" as advertised. This is a Jan 2027+ conversation, not a near-term one — revisit once the promo period actually ends.

**9. Homepage Spotlight / Bold Search Result.**
Already flagged as on hold. Real builds, real revenue potential, but need Stripe underneath them to be worth building at all — otherwise it's more unpaid inventory sitting on the pricing page.

**10. Event-adjacent monetization.**
The event system is fully built (calendar integration, dealer/inventory cross-links) but has zero monetization hooks — no event-targeted advertising, no real payment behind "Featured Events." Selling featured placement to event organizers or car clubs is a plausible, low-competition idea, but it's a from-scratch build on the advertising side, not a quick win.

---

## Recommended order, if generating revenue soon is the actual goal

1. **Start the advertiser-billing conversation now**, manually, off-platform — the product is real and working; nothing technical blocks a handshake deal or manual invoice today.
2. **Chase the three affiliate partnerships** (financing, shipping, insurance) in parallel — pure upside, no platform risk, small engineering cost per partner once a deal exists.
3. **When ready to write any payment code**, build Stripe scoped to one thing first: either the Featured-slot upgrade (smallest, builds on this session's work) or advertiser subscriptions (biggest existing product-market fit) — not both at once, and not the full dealer-plan system, which still needs a product decision about what it even sells now that Featured is free.
4. **Fix the newsletter send mechanism** before promising sponsorship revenue to anyone — right now there's no way to actually deliver on that promise.
5. **Leave dealer plans and private-seller fees alone** until the free-through-promo commitment naturally expires.
