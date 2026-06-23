# Data platform — how real-world values get in

This is the "working model" of the data layer: a zero-dependency Node service
(`server/`) with a persistent store, a **source-adapter registry**, the engine
running server-side, and a REST API the web app talks to.

```
scrape / curate / ingest  →  source adapters  →  DB  →  engine  →  API  →  app
```

## Run it

```bash
node server/server.mjs        # API on :4322  (seeds the DB on first run)
npx serve . -l 4321           # web app on :4321/web/  (Cards tab → Data platform)
```

## The two kinds of "scraping" — and why they're different

The single most important design decision. Conflating these is how a fintech dies.

| | Public card/offer data (domains A & B) | User's private transactions/points (domain C) |
|---|---|---|
| Examples | reward rates, milestones, offers, T&Cs | your statement, points balance, spends |
| How we get it | **curation + careful scraping of public pages** | **user-consented rails only** |
| Legal | OK / grey (honour ToS, robots.txt) | OK *only* with explicit consent (DPDP Act) |

**We never log into a user's bank portal with their credentials.** That's a ToS
violation, an RBI/DPDP breach, and credential-theft risk all at once. It's the
`portal_credentials` source — present in the registry only to be marked
`FORBIDDEN` and refused by design.

## Source registry — the mechanism to add real-world values

Adding an "app"/source = adding one adapter in `server/sources/`. Each declares its
kind + legal posture (`GET /api/sources`):

| Source | Kind | Status | Legal |
|---|---|---|---|
| `curation` | public-card-data | ✅ built | OK — public product info (the **primary, reliable** mechanism for catalog accuracy) |
| `scraper` | public-card-data | ✅ built | Grey — fixture-backed + best-effort live fetch; prefer official/affiliate feeds |
| `sms` | user-consented | ✅ built | OK with consent — parses pasted bank SMS |
| `csv` | user-consented | ✅ built | OK with consent — parses statement CSV export |
| `email` | user-consented | 🟡 stub | Needs Gmail OAuth + Google restricted-scope audit (~$15–75k) |
| `aa` | regulated | 🟡 stub | Needs FIU registration + Sahamati onboarding (the **sanctioned** rail) |
| `portal_credentials` | FORBIDDEN | ⛔ refused | NEVER — by design |

## The "few apps", built end-to-end

Per the brief — limited scope, full depth:

- **Catalog (5 cards):** HDFC Infinia, Axis Atlas, Amazon Pay ICICI, Flipkart Axis, SBI Cashback — seeded from researched data, editable via `curation`, augmentable via `scraper`.
- **Offers:** scraped from a public offers page (fixture proves the parser; live fetch is best-effort) → normalised → DB → flows straight into recommendations.
- **User transactions:** `sms` and `csv` ingestion, consent-based, attributed to the user's held cards.

Verified end-to-end: a scraped *“MakeMyTrip 12% on Axis Atlas”* offer immediately
changed the server-side recommendation for an ₹8,000 MMT flight (Axis → ₹1,440 / 18%).

## Offer lifecycle (`offers.mjs`) — the ongoing core

The raw offer pile (multiple sources, overlaps, stale entries) is never used
directly. `resolveOffers()` turns it into the clean set the engine sees:

1. **Expiry** — drop offers past `expiry` or before `validFrom`.
2. **Dedupe** — one winner per `(card, merchant, type)` key.
3. **Conflict resolution** — winner by **source trust** (`curation > affiliate > scraper > seed`), then better value, then recency. So verified/manual data overrides scraped, and scraped overrides the bootstrap seed.

Verified end-to-end: after scraping, a *Croma 12%/₹7,000* (scraper) **superseded** the
seed *Croma 10%/₹6,000*, and an expired *Reliance 9%* was **filtered out** — both
reflected in the live recommendation. Stats are exposed on `/api/health.offerStats`
and shown in the app's Data-platform panel (`5 active · 1 expired · 1 superseded`).

Both the server and the web app run the *same* resolver, so what you test in one
matches the other.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | platform status |
| GET | `/api/sources` | registry + recent runs |
| POST | `/api/sources/:id/run` | run an adapter (`curation`/`scraper`/…) |
| GET | `/api/cards`, `/api/offers` | catalog |
| GET | `/api/me` · PUT `/api/me/cards` | user profile |
| POST | `/api/ingest/sms` · `/api/ingest/csv` | consented ingestion |
| GET | `/api/recommend?amount&category&merchant&channel&portal&intl&mode` | **engine on server** |
| POST | `/api/plan` | optimise a basket |

## Production swaps (what this model fakes)

- **Store**: JSON file → SQLite/Postgres (only `db.mjs` changes).
- **Auth**: single `demo` user → real auth + per-user isolation + encryption at rest.
- **email/aa**: stubs → real Gmail OAuth and Account Aggregator (FIU) integrations — the licensed work.
- **scraper**: per-source parsers + scheduling + robots/ToS compliance, or replace with official/affiliate feeds.
- **Offer freshness**: the hardest *ongoing* job — expiry, dedupe, conflict resolution across sources.
