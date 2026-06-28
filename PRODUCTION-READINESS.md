# CardIQ — Product Roadmap & Production Readiness

Status: **prototype complete and hardened.** The full earn → value → burn → transfer → book loop
works end to end, with a tiered business model, a chat concierge, SEO content, and a
low-bandwidth-optimised, installable PWA. It still runs on **curated data, a simulated AI tier,
and demo auth/payments** — those are the remaining gaps to a real, paying-user launch.

Legend — Effort: **S** ≤1 day · **M** few days · **L** 1–2+ weeks.
Owner: **🔑 You** = needs an account / credential / decision only you can make · **🟢 Build** = I can do it locally, no accounts.

---

## ✅ Shipped (this build)

- **Product flow** — Home (offer-of-week, hidden perks, AI glimpse, spend insights), Use-a-card
  (recommend/plan), Points (wallet/redeem), ✦ Concierge (tiered chat), Review, Get-a-card, Cards
  (drag-drop). Free/Pro/Concierge **tiering + feature gating + upgrade flow**.
- **Concierge** — spend→seat chat on real balances (Pro), open-ended **AI scenario** tier
  (Concierge), `callLLM()` hook ready ([web/concierge.mjs](web/concierge.mjs)).
- **Data-accuracy moat (foundation)** — provenance on every record (source + verified date),
  unified card/route/perk data, the [Data & sources console](web/review.html) (health, source
  coverage, staleness, **API roadmap**). 9 cards · 5 currencies · 26 routes, 100% sourced.
- **Provider seam** — every domain flows through [web/providers.mjs](web/providers.mjs); local
  today, one-line swap to an API later. Documented in [DATA-INTEGRATION.md](DATA-INTEGRATION.md)
  + [DATA-SOURCING.md](DATA-SOURCING.md).
- **SEO** — programmatic per-card & per-program pages + hub ([seo/generate.mjs](seo/generate.mjs)),
  meta/OG, JSON-LD (Organization/WebSite/FAQ/Product/Breadcrumb), sitemap + robots.
- **Performance / low-bandwidth** — self-hosted + non-blocking fonts, modulepreload, no doomed
  fetches, **service worker** (offline page + cached shell), installable **PWA**, server **cache
  headers** (immutable fonts).
- **Auth UX** — Google account-chooser + inline validated email (demo), session gate with
  return-to-intended-page.

---

## 🔑 Needs your accounts / keys (the real launch blockers)

These can't be done locally — they need an account, KYC, or a paid key. I wire each once you provide it.

| # | Item | Now | You provide | Effort |
|---|---|---|---|---|
| 1 | **Real Google auth** | demo chooser; `GOOGLE_CLIENT_ID` hook ready | Google Cloud OAuth Client ID ([GOOGLE-SIGNIN-SETUP.md](GOOGLE-SIGNIN-SETUP.md)) | M |
| 2 | **Backend + DB** | per-device localStorage only | Supabase / Railway Postgres | L |
| 3 | **Payments** (Pro/Concierge) | demo plan flips | Razorpay KYC + keys | M |
| 4 | **Deploy + domain** | repo on `mybyes/cardIQ`; live status unconfirmed | Railway/Vercel + DNS for `cardiq.app` | S–M |
| 5 | **Legal review** | Privacy/Terms/Disclaimer drafted | a lawyer for your entity/jurisdiction | M |
| 6 | **Real LLM concierge** | simulated scenarios (top tier) | Anthropic API key + cost cap | M |
| 7 | **Real affiliate links** | placeholder apply links | affiliate sign-ups (Cuelinks/Admitad/direct) | S–M |
| 8 | **Monitoring/analytics SaaS** | none | Sentry + analytics account | S |
| 9 | **Paid data APIs** | estimate / link-out | Amadeus/Travelpayouts (fares), Account Aggregator (spend), seats.aero (award seats) | M each |

**Fastest path to a real launch:** 4 (deploy) → 1 (auth) → 2 (DB) → 3 (payments) → 5 (legal).

---

## 🟢 Buildable locally now (no accounts — I can do these anytime)

| Item | What | Effort |
|---|---|---|
| **DPDP consent + delete-my-data** | first-run consent + working local data wipe (seamed to a delete API later) — the client half of legal compliance | S |
| **Accessibility pass** | keyboard nav (tabs/drag-drop/modals), focus-visible, aria, skip-link, contrast — quality + Lighthouse/SEO | S–M |
| **Analytics + affiliate-surface tracking** | local event tracker (signup→wallet→upgrade funnel) + outbound `?surface=` click tracking, ready to point at a real endpoint | S |
| **More content** | more cards/programs, AI scenarios, hotel-award charts, points-expiry rules | M (ongoing) |
| **Onboarding + alerts** | empty-state polish, guided first-run, a points-expiry / transfer-bonus alerts surface (uses existing data) | S–M |
| **Engine tests** | lock in correctness of valuation/awards/state/offers (today: `run.mjs` smoke only) | S |
| **Data verification cadence** | keep curating from issuer MITC + re-stamp verified dates (the moat is freshness) | ongoing |

---

## Suggested sequence

1. **Go live (thin):** Deploy (#4) on `cardiq.app` — SEO/canonicals already point there; ship the
   curated-data prototype so it's indexable and shareable. *(needs your hosting/DNS)*
2. **Real accounts:** Auth (#1) + Backend/DB (#2) — multi-device, real users.
3. **Monetise:** Payments (#3) + affiliate links (#7) + legal review (#5).
4. **Trust & observe:** data verification cadence + monitoring (#8); keep the review console green.
5. **Differentiate:** real LLM (#6) + paid data APIs (#9) as demand/justification appears.

**Meanwhile (no dependencies):** the 🟢 local items — DPDP consent, a11y, analytics scaffold,
more content — can land anytime to raise quality and compliance before launch.

**Single highest leverage:** keep the **data accurate** (the moat) and **deploy** so it's real and
indexed. Everything else compounds on those two.
