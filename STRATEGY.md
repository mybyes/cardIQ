# CardIQ — Strategy & Go-to-Market

Living strategy doc. Companion to [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) (build) and
[GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) (procurement).

## The thesis
Most card tools die on **distribution + TAM + frequency** (see the postmortem below), not product.
CardIQ's answer: **two doors into one engine**, with **search + chat + alerts** as the daily loop.

## Two doors, one engine

| | **The Activator** (mass — growth engine) | **The Optimizer** (expert — credibility + revenue) |
|---|---|---|
| Who | Holds premium cards + points, **doesn't know how to use them** | Already optimizes across CardExpert / Telegram / seats.aero / spreadsheets |
| Pain | Points sit idle, expire, or cashed out at ₹0.20 | **Tab-hopping** — fragmented, manual, slow |
| Job | "Tell me what I have + the one thing to do" | "Everything in one place, accurate, fast" |
| Size | **Millions** (every Infinia/Diners/Atlas/Amex holder) | Tens of thousands — but high-LTV + they evangelise |
| We win with | idle-₹ wake-up + one clear action + alerts | omni-search + accurate sourced data + bonus calendar + watchlists |

Reframes the TAM: not "fly-on-points nerds" (a few hundred thousand) but **anyone holding idle
points** (Activator, millions) + the Optimizer as the authority/affiliate/word-of-mouth tier.

## The daily loop (the frequency/retention answer)
- **Search** — "which card for [merchant/category]" + lookup any card/route/program. *Frequent, pre-purchase.*
- **Chat** — open-ended "what do I do with my points / plan this trip."
- **Alerts (the engine)** — *points expiring* · *transfer-bonus live* · *"left ₹X on the table"* ·
  *milestone close*. The recurring pull that turns a once-in-a-while tool into a weekly habit.

## Build priorities (serve both, alerts = retention)
**Activator (first — bigger segment + hook):** idle-value home hero ("₹X doing nothing · ₹Y
expiring · 1 move →") · alerts feed · one-tap "best move now."
**Optimizer:** universal omni-search · transfer-bonus calendar + watchlists · **"report a
correction"** (crowd-sources accuracy → turns the data-moat weakness into a community asset).

## Messaging
- ~~"Fly on points"~~ → **"Your points are worth ₹X. Don't waste them."** (Activator)
- **"Every card, every route — one place."** (Optimizer)

---

## Go-to-market: seed Optimizers → convert Activators

**Why Optimizers first:** they validate accuracy (the moat), produce reviews/content, drive
affiliate card-applications, and their endorsement is what converts Activators — *"the tool the
experts use."* You can't buy that credibility; you earn it in their communities.

### Where the Optimizers already are (India)
- **TechnoFino** (forum + YouTube) — the biggest India card community.
- **r/CreditCardsIndia**, **r/IndiaInvestments** — high-intent, tool-friendly.
- **Telegram** miles/points & deal groups; **Desidime**.
- **CardExpert / Card Maven / Live From A Lounge** — comment sections + creator partnerships.
- **Twitter/X** #CreditCardIndia / miles community.

### How to seed (earn, don't spam)
1. **Lead with the free tools as shareable artifacts** — the transfer explorer, ₹/point
   valuation, and per-card SEO pages answer questions these communities ask daily. Show up and
   *answer with the tool*, don't advertise.
2. **"Report a correction" / contribute** — make Optimizers co-owners of the data. Credit
   contributors. This is the flywheel: better data → more trust → more experts → better data.
3. **Programmatic SEO** captures the long-tail they Google ("HDFC Infinia transfer partners",
   "Axis EDGE value") → organic, compounding, zero CAC.
4. **Creator partnership** — one respected voice (TechnoFino/Card Maven) cross-promo + affiliate
   share beats any ad spend.
5. **Build-in-public on X** — sharp "your 5L HDFC points = a ₹1.5L business seat" threads.

### Then convert Activators (scale)
- Optimizer endorsement + SEO bring them in; the **"idle value" hook** is the share trigger
  ("I had ₹2L in points I didn't know about").
- **Alerts** retain them (expiry/bonus/left-on-table).
- Frictionless: works free, on-device, no login needed.

### Growth loops to engineer
- **Content loop:** programmatic pages → organic traffic → tool use.
- **Community loop:** free tool answers a question → shared in forum → traffic.
- **Contribution loop:** corrections → better data → trust → more experts.
- **Share loop:** "your points are worth ₹X" = a screenshot people post.

### Sequence
1. **Deploy + index** (Tier 0) so the free tools + SEO pages are live.
2. **Seed 3 communities** (TechnoFino, r/CreditCardsIndia, one Telegram) by being useful.
3. **Ship "report a correction"** → convert lurkers into contributors.
4. **Ship alerts** → retention.
5. **One creator partnership** → step-change in reach.
6. **Then** paid data/LLM/payments as traction justifies.

### Metrics that matter
- **Activation:** % who add ≥1 card and see their ₹ value.
- **Frequency:** weekly opens / alert click-through (the postmortem's real test).
- **Trust:** corrections submitted, data-freshness (review-console health).
- **Revenue:** affiliate card-apps; later, Pro/Concierge conversion.

---

## Parallel bet: B2B2C — "CardIQ Engine" (sidesteps the community grind)

Full pitch + API spec in [B2B-ENGINE.md](B2B-ENGINE.md). The thesis:

- **The category exists and has a strong incumbent already in India.** Ascenda powers
  *single-program* rewards infra for banks (incl. **Axis's points & miles transfer program**),
  clients like HSBC/Amex/Capital One. So "be the transfer infra for an issuer" is **taken**.
- **CardIQ's defensible B2B wedge is different: neutral, cross-card optimization** — "which of
  *all* your cards to use; what your points *across issuers* are worth." A bank can't offer that
  (it wants lock-in); the buyer is the **neutral multi-card holder**:
  1. **Neobanks / multi-card apps** (Fi, Jupiter, OneCard, Slice) — best fit, fast-moving, unconflicted.
  2. **PFM / wealth** (INDmoney, ET Money) — "points as an asset + how to realize it."
  3. **OTAs** (MMT/Cleartrip) — "pay with the right points." ⚠️ Avoid issuers as lead (conflict + Ascenda).
- **The product is the engine, exposed:** `POST /api/points` (Points Intelligence — value + best
  use, stateless) + an embeddable widget ([web/embed.html](web/embed.html)) + `/api/recommend`
  (which card) + `/api/plan`. Both shipped & working.
- **Model:** SaaS (per-MAU/call) + rev-share on card-apps/transfers — bigger & recurring vs D2C subs.
- **Why it de-risks the postmortem:** partner's users = distribution (no CAC), B2B contracts =
  monetization, whole base = TAM. **New risks:** build-vs-buy, sales cycle, brand invisibility,
  accuracy SLAs (defenses in B2B-ENGINE.md).
- **D2C + B2B reinforce:** D2C earns expert trust + builds the data moat → that credibility is the
  B2B sales asset ("the cross-card optimizer the experts trust, embeddable").

## How this addresses the postmortem
| Cause of death | Mitigation here |
|---|---|
| Distribution / CAC | community seeding + programmatic SEO + share loop (zero-CAC) |
| Wrong TAM | Activator (millions of idle-points holders), not just travel nerds |
| Incumbent (CRED) | depth CRED won't build (accurate transfer/award data, concierge); + B2B2C option |
| Data treadmill | "report a correction" turns experts into the freshness engine |
| Monetization | affiliate (Optimizers apply for cards) first; subscription later |
| Low frequency | **alerts** (expiry/bonus/left-on-table) = recurring reason to open |
