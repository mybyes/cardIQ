# CardIQ — Data Sourcing Playbook

How we acquire each data type — *what we need, where it comes from (paid/unpaid), how it plugs
into the provider seam, and the consent/legal rules*. Companion to
[DATA-INTEGRATION.md](DATA-INTEGRATION.md) (architecture) and [web/providers.mjs](web/providers.mjs)
(the seam). Status is mirrored live in the [Data & sources console](web/review.html).

**Two ground rules, everywhere:**
- **Consent-first** — anything personal is pulled only with explicit user consent (DPDP Act).
- **No credentials, ever** — we never log into a user's bank/card/loyalty portal. That rule is
  absolute and shapes every option below.

---

## 1) Loyalty points balances

**What we need:** per holding — program/card, point balance, currency, `asOf` date.

**Where it comes from:** ⚠️ **There is no compliant API for this — anywhere.**
- Loyalty balances sit **behind the program login**. Account Aggregator does **not** cover them
  (it's bank/financial accounts only). Fetching them "directly" = credentials = forbidden.
- **Only path = user-consented import:**
  - **SMS** — many programs/banks text balance + earn alerts → `parseSMS` ([ingestion.mjs](ingestion.mjs)).
  - **Email-forward** — forward statement/program emails to `import@cardiq.app` → `parseEmail`.
  - **CSV / statement upload** → `parseCSV`.
  - **Manual entry** — the wallet UI (always available).

**How it integrates:** parsers → `store.pointsBalance` → `providers.balances` (status: **unavailable** API).
**Cadence:** on import (user-triggered). **Cost:** free. **This stays user-import permanently.**

---

## 2) User credit-card transactions (spend)

**What we need:** per txn — date, amount, merchant, **MCC/category**, card used.

**Where it comes from:**
| Source | Real-time? | Cost | Notes |
|---|---|---|---|
| **Account Aggregator** (RBI rail) | ✅ consented stream | **paid** | The compliant "live" path. Needs **FIU registration** *or* a licensed intermediary ([Setu](https://setu.co/data/financial-data-apis/account-aggregator/)). Gives bank/card transactions, **not** reward points. |
| **SMS txn alerts** | near-real-time | free | `parseSMS` — user pastes/forwards bank SMS. |
| **CSV statement** | batch | free | `parseCSV`. |
| **Email-forward** | batch | free | `parseEmail`. |
| ❌ Net-banking / card-portal login | — | — | **Forbidden** (credentials). |

**How it integrates:** import parsers → `store.ledger`; AA → the `aa` adapter
([server/sources/index.mjs](server/sources/index.mjs), stub) → `providers.spend` (`── API SEAM ──`).
**Consent:** explicit; AA adds its own consent + revocation. **Cadence:** AA streaming / import on demand.

---

## 3) Award flight details

Two separate things — don't conflate:

**3a) Award *cost* (miles needed for a route/cabin)** — *what a redemption costs.*
- **Source:** airline **award charts** (mostly published / semi-public). Curated today
  (`GOALS` in [transfers.mjs](web/transfers.mjs), [awards.mjs](awards.mjs)); can direct-fetch
  airline award pages later. **Cost:** free. ✅ works now.

**3b) Award *availability* (is a seat actually open)** — *the hard part.*
- **Source:** [seats.aero](https://docs.seats.aero/) (best coverage) / AwardFares / point.me.
- **Reality:** seats.aero **commercial use needs written partner approval** and **may be
  region-blocked in India**. Direct-scraping airline availability = JS + bot-walls + ToS. **Cost:** partner.
- **Now:** we **link out** to check seats (`providers.awardSeats` → `linkout`); pursue a seats.aero
  partnership before integrating.

**3c) Cash price (for points-vs-cash)** — [Amadeus Self-Service](https://developers.amadeus.com/self-service)
(authoritative) or [Travelpayouts](https://support.travelpayouts.com) (free + affiliate). **Cost: paid.**
On-demand only (per user action), cache ~15 min. Seam: `providers.getFare`.

---

## 4) Real-time card offers — multiple sources

**What we need:** per offer — card(s), merchant/platform, %/cap, no-cost-EMI, expiry, source, `fetchedAt`.

**Sources (use several; merge):**
| Source | What | Cost | Adapter |
|---|---|---|---|
| **Coupon-aggregator API** | MMT/Amazon/Cleartrip… across networks in one feed ([CouponAPI](https://couponapi.org/), Feedico, Admitad) | freemium | `ota` |
| **Direct issuer pages** | HDFC SmartBuy, Amex Offers, Axis offers (public) | free | `direct` ([DIRECT_SOURCES](server/sources/scraper.mjs)) |
| **Direct OTA pages** | MMT/Cleartrip "card offers" (public) | free | `direct` |
| **Manual curation** | editor-added, always reliable | free | `curation` |

**Multi-source merge (already built):** every adapter writes the same offer schema with a `source`;
[offers.mjs](offers.mjs) `resolveOffers` handles **dedupe + expiry + source-priority conflict
resolution**, and the [review console](web/review.html) shows provenance. Add a source = add an adapter.
**Cadence:** aggregator hourly; direct best-effort + change-detect. **Seam:** `providers.getOffers`.
**Legal:** aggregator feeds OK; direct = public pages only (robots.txt/ToS honoured); never login-gated.

---

## 5) Also needed for the product

| Data | Why | Source | Cost |
|---|---|---|---|
| **Card catalog & reward rules** | the core engine | curated from issuer **MITC** + cross-ref [ccreward.app](https://github.com/aashishvanand/ccreward-web) | free |
| **MCC / merchant→category map** | route each spend to the best card | ISO MCC list (free) + merchant-name inference (have `category` on txns) | free |
| **FX / forex rates** | forex-markup math, overseas spend | exchangerate.host / RBI reference rates | free |
| **Hotel award & loyalty charts** | "burn" beyond flights (Marriott/Accor/ITC) | curated / direct program pages | free |
| **Points-expiry rules** | expiry alerts (the "don't leak" value) | curated per program | free |
| **Transfer-bonus calendar** | the highest-value alerts (e.g. +30% windows) | curated + program emails/announcements | free |
| **Notifications delivery** | offer-of-week, expiry & bonus alerts | email (Resend/SES) · push (FCM/web-push) | freemium |
| **Identity / auth** | real accounts, multi-device | Google OAuth (OIDC) + AA KYC where needed | free/paid |
| **Analytics & error monitoring** | observe funnel + catch breakage | Sentry + privacy-respecting analytics | freemium |

---

## Summary — what's free vs needs money/partnership
- **Free / already-works (curate + user-import):** loyalty balances, transactions (import), award
  *cost*, offers (curation + direct), card rules, MCC, FX, hotel charts, expiry, transfer bonuses.
- **Paid (decide later):** cash fares (Amadeus/Travelpayouts), AA spend stream, AI concierge (Claude),
  coupon-aggregator feed (freemium), notifications/monitoring (freemium).
- **Partner-gated:** award seat availability (seats.aero).
- **Impossible / never:** loyalty balances via API, anything via user credentials.

Each maps to a provider seam in [web/providers.mjs](web/providers.mjs); the buy decision is a later
phase once flows are reviewed.
