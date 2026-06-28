# CardIQ — Project Context & Handoff

Single entry point for picking this up later (new session, new laptop, or a teammate). Captures
the **what, why, and where** that isn't obvious from code alone. Last updated 2026-06-28.

> TL;DR: CardIQ is an **India-first credit-card reward-points optimiser** — *which card to swipe
> (earn), what your points are worth in ₹, and the best way to redeem/transfer them (burn)* — in
> one flow with a chat concierge. The **prototype is complete & hardened**; it runs on **curated
> data, a simulated AI tier, and demo auth/payments**. The next real step is **deploy** (Tier 0).

## What it is / the vision
- One app for the full loop: **earn → value (₹/point) → burn → transfer → book**.
- India market (HDFC, Axis, Amex, ICICI, SBI + airline/hotel transfer partners).
- Free to start, optional login, monetised via **affiliate** (card applications) + **Pro/Concierge**
  subscription tiers.
- Inspiration: book1a.com (transfers/concierge) + The Points Guy model; differentiated by being
  **earn+burn end-to-end, India-first, with a concierge**.

## Non-negotiable principles (decided in-conversation)
1. **Never scrape user credentials / log into bank or loyalty portals.** Loyalty *balances* have no
   API anywhere → **user-import only** (SMS/CSV/email parsers, built). Spend → Account Aggregator
   (consented) or import.
2. **Free-first / near-zero cost to run** the prototype. Curated data + on-device; no paid API until
   justified.
3. **Honesty / provenance** — every number is dated + sourced + "confirm with issuer / not financial
   advice". Accuracy is the moat (and the biggest risk).
4. **Provider seam** — all external data flows through [web/providers.mjs](web/providers.mjs); local
   today, one-line swap to an API later. Buy decisions deferred.
5. **Repo discipline** — this is the `cc-advisor` dir → `github.com/mybyes/cardIQ` `master`. A
   *separate* project (`cricketfast` = "Cricketline") lives next door; **never commit CardIQ work
   there**. Always use `git -C <path>`.

## How it's built (architecture)
- **Pure-ESM core** (no DOM/Node deps), imported by both the browser app and the Node server:
  `valuation.mjs` (₹/point), `awards.mjs`, `state.mjs` (WalletState), `offers.mjs` (resolveOffers),
  `advisor.mjs`, `planner.mjs`, `insights.mjs`, `recurring.mjs`, `data.mjs` (catalog + provenance).
- **Web app** (`web/`): `index.html` + `app.js` (the SPA: tabs, tiering/gating, concierge),
  `login.html` (landing/SEO homepage), `transfers.html` (explorer + chat), `legal.html`,
  `review.html` (data console + API roadmap), `embed.html` (B2B widget), generated SEO pages
  (`web/c/*`, `web/p/*`, `cards.html`), `sw.js` (offline/cache), self-hosted `fonts/`.
- **Server** (`server/server.mjs`): zero-dep `node:http`, serves the web app **and** the API
  (`/api/recommend`, `/api/plan`, `/api/points`, `/api/cards`, `/api/offers`, `/api/health`,
  source adapters). JSON-file DB (ephemeral). Run: `npm start`.
- **Key engines:** `concierge.mjs` (AI scenarios + `callLLM()` hook), `providers.mjs` (integration
  seam), `transfers.mjs` (route directory + chat `planJourney`), `perks.mjs`, `seo/generate.mjs`,
  `seo/build-fonts.mjs`.

## Build journey (what happened, why)
- **Foundation (Jun 23–24):** earn/burn engine, deployable single-server, CardIQ rename, next-gen UI,
  light/dark, drag-drop card picker, 5 grouped tabs, honest rates.
- **Redesign (Jun 27):** "Concierge" direction (warm paper + ink + champagne gold + Fraunces serif),
  book1a-inspired landing, premium login, **Google sign-in** (free OIDC, demo chooser — real account
  list needs a Client ID, see [GOOGLE-SIGNIN-SETUP.md](GOOGLE-SIGNIN-SETUP.md)), free email
  magic-link path, About/FAQ/Contact, real footer + legal pages.
- **Monetisation (Jun 28):** **pricing tiers** (Free/Pro/Concierge) → **feature gating + upgrade
  flow** in-app; **transfers explorer**; **in-app AI concierge** (deterministic on real balances for
  Pro; open-ended scenarios for the Concierge tier; LLM kept top-tier-only for cost); **offer of the
  week + hidden perks**.
- **Data moat (Jun 28):** provenance (sources + verified dates), **review console** (health + API
  roadmap), added **Amex + ICICI** programs (9 cards / 5 currencies), researched real/live data
  options ([DATA-INTEGRATION.md](DATA-INTEGRATION.md), [DATA-SOURCING.md](DATA-SOURCING.md)),
  **direct-from-source fetch framework** + **provider seam**.
- **Growth/quality (Jun 28):** **SEO** (programmatic card/program pages, structured data, sitemap),
  **performance/low-bandwidth** (self-hosted+non-blocking fonts, modulepreload, service worker,
  offline page, PWA, cache headers), real Google account chooser.
- **Strategy + B2B (Jun 28):** roadmap refresh, **go-live checklist**, deploy prep (Railway),
  postmortem → **two-door strategy** ([STRATEGY.md](STRATEGY.md)), **B2B "CardIQ Engine"**
  (`/api/points` + embeddable widget + [B2B-ENGINE.md](B2B-ENGINE.md)).

Full commit-by-commit history: `git log` (50+ commits, all dated).

## Strategy (the thinking)
- **Postmortem found the real risks:** distribution/CAC, wrong TAM, incumbent (CRED), data treadmill,
  monetisation, frequency — *not* the product.
- **Two doors, one engine:** **Activator** (mass — holds idle points, doesn't know how to use them)
  + **Optimizer** (experts — stop them tab-hopping; they evangelise + drive affiliate). Daily loop =
  **search + chat + alerts** (alerts = retention engine). See [STRATEGY.md](STRATEGY.md).
- **B2B2C bet:** issuer rewards-infra is taken (**Ascenda**, powers Axis's transfer program), so
  CardIQ's wedge is **neutral cross-card optimization** sold to **neobanks/PFM/OTAs** as an API
  ("Plaid for points"). See [B2B-ENGINE.md](B2B-ENGINE.md).

## Current state
- ✅ Prototype complete, stable, **zero console errors** (full flow sanity-reviewed).
- ✅ Performance/PWA/SEO/data-provenance done. B2B API + widget live.
- ⏳ **Not deployed** (runs locally). Curated data, simulated AI, demo auth/payments.
- Verdict: **MVP-fit.** Ship thin (deploy curated version, no login/payments needed) and validate.

## Pointers (all docs)
| Doc | Purpose |
|---|---|
| [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) | roadmap: shipped / needs-accounts / buildable-locally |
| [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) | every account/API/data to procure, tiered |
| [DEPLOY.md](DEPLOY.md) | Railway go-live (Tier 0) |
| [STRATEGY.md](STRATEGY.md) | two-door audience + GTM + postmortem |
| [B2B-ENGINE.md](B2B-ENGINE.md) | B2B pitch + Points Intelligence API spec |
| [DATA-INTEGRATION.md](DATA-INTEGRATION.md) / [DATA-SOURCING.md](DATA-SOURCING.md) | how to get live data |
| [GOOGLE-SIGNIN-SETUP.md](GOOGLE-SIGNIN-SETUP.md) | enable real Google sign-in |
| [README.md](README.md) / [SCHEMA.md](SCHEMA.md) / [SOURCES.md](SOURCES.md) / [DATA-PLATFORM.md](DATA-PLATFORM.md) | engine + data-platform reference |
| [web/review.html](web/review.html) | live data-health + API integration roadmap |

## Run it
```bash
npm start                 # Node server (API + web) → http://localhost:4322
node run.mjs              # engine smoke test
node seo/generate.mjs     # regenerate SEO pages + sitemap
node seo/build-fonts.mjs  # refresh self-hosted fonts
```
Deploy: push to `master` → Railway (see [DEPLOY.md](DEPLOY.md)). Repo: `github.com/mybyes/cardIQ`.

## What a future session should do first
1. Read this + [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) + [STRATEGY.md](STRATEGY.md).
2. If the user has accounts ready → wire the matching seam (auth / DB / payments / data API).
3. Else → build a 🟢 local item (DPDP consent+delete, a11y, analytics, alerts) or refine strategy.
4. Honour the principles above (esp. no credential scraping, correct repo, provenance).
