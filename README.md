# CardIQ

A platform to **optimise earning *and* burning of points** across cards, loyalty
programs and websites.
- **Earn**: normalises instant discount + rewards + milestones + forex into one
  **effective ₹** to answer "which card should I use / get?"
- **Burn**: ranks every redemption path (transfer partners, portals, cashback) to show
  the **best vs worst way to spend your points** and the value spread you can capture.

Indian-market cards, researched June 2026 (see [SOURCES.md](./SOURCES.md)).
Verify against issuer T&Cs before any financial decision.

## Run

```bash
node server/server.mjs   # data-platform API on :4322 (optional — app degrades gracefully without it)
npx serve . -l 4321      # web app → http://localhost:4321/web/
```

The data platform (real-data pull/scrape/ingest mechanism, source registry, legal
stance, server-side engine) is documented in [DATA-PLATFORM.md](./DATA-PLATFORM.md).
When the API is up, the app **pulls its catalog + (resolved) offers from the platform**
on load — so scraped/curated offers flow straight into recommendations. If the API is
down it falls back to bundled data; the Cards → Data-platform panel shows which is active.

Tabs:
- **Home** — at-a-glance snapshot (spend tracked, rewards earned, left on the table),
  prioritised action items (expiring points, milestones near, fees, expiring offers) that deep-link
  into the right tab, a **recurring/subscriptions** optimiser (set-and-forget charges → best card → annual saving),
  and a one-click **exportable rewards report** (self-contained, shareable HTML).
- **Recommend** — **free-text search** ("55k AC at croma offline", "1.5 lakh laptop on flipkart")
  or pick details; get ranked cards with full breakdown + warnings.
- **Plan** — list upcoming spends; the planner routes each to the best card (stateful, so it
  deliberately captures milestones), and shows total value, milestones/fees unlocked, and
  "push a little further" nudges.
- **Wallet** — points-in-₹, milestone & fee-waiver progress, expiring points, **card benefits
  (forex/lounge), a keep/cancel verdict**, and best card per category.
- **Redeem** (burn optimiser) — your actual point balances, ranked across every redemption
  path (transfer partners, portals, cashback): best vs worst, the value **spread to capture**,
  good vs poor transfer partners, and **goal-based redemption** — what concrete award flights /
  hotel nights those points buy ("✈️ Delhi→Singapore economy", "9,600 miles short of…").
  Includes a **Path-to-a-goal planner** (earn ↔ burn united): pick a target award and it sums
  miles across all your cards, shows the gap, and tells you which card to spend on to get there
  fastest ("spend ₹5.6L more on Axis Atlas ≈ 14 months → Delhi→Singapore business").
- **Coach** — reviews your transactions, quantifies money left on the table, and re-sets
  your category defaults. **Paste bank SMS** or **upload a statement CSV** to import live
  (dates are normalised across formats so the timeline sorts correctly).
- **Get a card** — set your monthly spend per category; ranks the cards you *don't* hold
  by net annual gain (extra rewards − fee), flagging when a premium card's fee isn't worth it.
- **Cards** — pick which cards you hold + the data-platform panel.

## CLI

```bash
node run.mjs                                   # 5 scenarios
node wallet.mjs                                # dashboard
node coach.mjs                                 # post-purchase coaching
node ask.mjs 60000 appliances croma --offline  # ask anything
node ask.mjs 50000 travel --intl --mode=floor  # toggle valuation: best|typical|floor
```

## Architecture

| File | Role |
|---|---|
| `valuation.mjs` | **₹/point engine** — best/typical/floor by redemption path (the IP) |
| `engine.mjs` | ₹-normalization core; separates **steady** value from **one-time milestone** |
| `state.mjs` | **stateful wallet** — milestone counted once, monthly cap accumulation |
| `query.mjs` | **free-text search** — natural language ("55k AC at croma") → transaction |
| `planner.mjs` | **spend planner** — greedy stateful allocation of a basket across cards |
| `advisor.mjs` | **acquisition advisor** — best new card to add for a spend profile, net of fee |
| `insights.mjs` | **home overview** — spend/rewards summary + prioritised action items |
| `recurring.mjs` | **subscription detector** — finds recurring charges, routes each to its best card |
| `offers.mjs` | **offer lifecycle** — expiry + dedupe + source-priority conflict resolution |
| `ingestion.mjs` | **real data ingestion** — Indian bank SMS parser + CSV import (+ AA stub) |
| `data.mjs` | 5 researched cards, offers, user state, ledger |
| `web/` | the browser app (pure ES modules, no build step) |
| `SCHEMA.md` / `SOURCES.md` | the catalog schema and data citations |

## Multi-profile

A header **profile switcher** ("You", "Spouse", …) keeps separate cards / transactions /
spend per person, all persisted on-device. `mode` (valuation) stays global. New profiles
start blank. This is local-only; production swaps it for real per-user accounts on the server.

## What's real vs still faked

**Real:** the normalization math, stateful milestone/cap accounting, researched 2026
card data, working SMS/CSV ingestion, multi-profile state, a usable web UI.

**Still faked / next:** live balances (needs Account Aggregator — FIU licensing), the
merchant×bank offer feed (hardcoded; keeping it fresh is the real ops job), date
normalization across sources, and the soft caps noted in [SOURCES.md](./SOURCES.md).
