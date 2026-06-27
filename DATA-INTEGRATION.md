# CardIQ — Authentic & Real-Time Data Integration

How to move CardIQ from curated/demo data to **authentic, live data** — researched June 2026.
Principle throughout: **provenance + consent + official feeds**, never credential-scraping.

"Authentic" ≠ just "live". It means every number is **sourced, dated, and verifiable** (the
[review.html](web/review.html) console already enforces this) *and* refreshed at the right cadence.
Not everything can or should be real-time — match the cadence to how fast each thing actually changes.

---

## The six data domains — source, access, cadence

| Domain | Changes | Realistic source (2026) | Access model | Cadence |
|---|---|---|---|---|
| **Card reward rules / fees** | slow (months) | Curated DB from issuer **MITC**; cross-ref open dataset **ccreward.app** (OSS, MCC-based) | Manual + scheduled re-verify | Monthly review + change alerts |
| **Transfer ratios / timing** | occasional | Issuer transfer pages + airline pages, curated | Manual monitoring | Weekly check + alert on change |
| **Card / merchant offers** (MMT, Amazon…) | fast (daily) | **Coupon-aggregator APIs** — CouponAPI.org / Feedico / Coupomated (unify Admitad, Awin, Impact, CJ); **Admitad** strong in India | API key (affiliate) | Pull every few hours |
| **User spend / transactions** | real-time | **Account Aggregator** (RBI consent rail) via an AA/FIU partner (Setu etc.); or user import (SMS/CSV/email) | FIU registration *or* licensed intermediary | On-demand / streaming |
| **User points balances** | — | **No API** — AA covers bank/financial accounts, *not* loyalty balances. User import (statement/email/SMS) only | User-consented import | On import |
| **Award seat availability** | real-time | **seats.aero** Pro API | **Commercial use needs written approval**; Live Search = approved partners only; *may be region-restricted in India* | On-demand (if partnered) → else link-out |
| **Cash fares / hotel prices** | real-time | **Amadeus Self-Service** (400+ airlines, real-time price/availability) or **Travelpayouts/Aviasales** (affiliate, free, monetised) | API key; usage-based (Amadeus) / commission (Travelpayouts) | On user action, cached short TTL |

### Key research takeaways
- **Account Aggregator is real and huge** (2.88B accounts, 955 FIUs in 2026) but it gives **financial/transaction** data, not reward-point balances — and needs **FIU registration with RBI or a licensed intermediary**. Use it for *spend tracking*, not points.
- **Points balances have no official feed anywhere** — user import remains the only compliant path. CardIQ already has SMS/CSV/email-forward parsers for this.
- **Offers are the most "real-time-able" public data** — coupon-aggregator APIs normalise Admitad/Awin/Impact into one REST feed. This is the realistic MMT/Cleartrip "offers" source (and doubles as affiliate revenue).
- **Award availability is gated** (seats.aero commercial = approval + region limits) → keep the link-out, pursue a partner deal later.
- **Card rules have no API** → curation is the moat; the OSS `ccreward.app` dataset is a useful cross-check, not a replacement.
- **Cash fares**: Amadeus = authoritative real-time; Travelpayouts = free + monetised but affiliate-bound. Use on-demand only (cost), cache briefly.

---

## Architecture — build on the adapter registry you already have

CardIQ already has the right bones: a **source-adapter registry** ([server/sources/index.mjs](server/sources/index.mjs)) with `runSource(id, payload)`, plus per-record provenance. Extend it.

```
                ┌─────────── scheduler (cron) ───────────┐
                │  offers: hourly · ratios: weekly        │
                │  card-rules: monthly · fares: on-demand │
                └────────────────────┬────────────────────┘
                                     ▼
  Adapters (one per source) ── normalize ── provenance stamp ── change-detect ── store
  curation · coupons · flights · awards · aa · sms/csv/email      │                 │
                                                  diff vs snapshot ┘                 ▼
                                                  → high-stakes change? hold for     DB (Postgres/
                                                    human review → publish           Supabase)
                                                                                      │
                                              API (/api/cards /offers /routes) ◄──────┘
                                              + short-TTL cache for on-demand fares
```

### Adapter contract (extends the current pattern)
```js
// server/sources/<name>.mjs
export async function fetchData(payload) {
  const raw = await getFromProvider(payload);      // API call / feed pull
  return raw.map(normalize);                        // → canonical schema
}
// each record carries provenance:
{ ...fields, source: "coupons:admitad", fetchedAt: ISO, verifiedAt: ISO, confidence: "feed"|"curated" }
```

### The five things that make it "authentic" (not just live)
1. **Provenance on every record** — source + fetchedAt + verifiedAt (already modelled).
2. **Change detection** — diff each pull vs the last snapshot; a changed transfer ratio or fee is a *flagged event*, not a silent overwrite.
3. **Human-in-the-loop for high-stakes data** — auto-publish offers; **hold ratio/fee changes for review** (one wrong ratio = lost trust + liability).
4. **Freshness SLAs + the review console** — [review.html](web/review.html) already flags >90-day-stale; wire its thresholds per-domain.
5. **Graceful degradation** — if a feed is down, serve last-known-good + show its age (the app already falls back bundled→platform).

---

## Build phases

**Phase 0 — backend (prerequisite).** Postgres/Supabase + the existing API server (this is P0 #2 in [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md)). Real-time needs a store + scheduler; localStorage can't do it.

**Phase 1 — offers, live (highest ROI, lowest friction).**
- Sign up for a **coupon-aggregator API** (CouponAPI.org or Admitad direct). Get the key.
- Build `server/sources/coupons.mjs` → normalise into the offer schema → wire into the `ota`/`offers` flow already scaffolded.
- Schedule hourly pulls; dedupe via the existing `resolveOffers`.
- Bonus: same network = **affiliate revenue** on "Apply / Book".

**Phase 2 — cash fares (points-vs-cash, on demand).**
- Amadeus Self-Service *or* Travelpayouts key. Build `server/sources/flights.mjs`.
- Call **only on user action** in the concierge ("what's the cash price?"), cache 15 min. Keeps cost bounded.

**Phase 3 — consented spend (Account Aggregator).**
- Partner with a licensed AA/intermediary (Setu) — avoids direct RBI FIU registration initially.
- Build `server/sources/aa.mjs` (the registry already has the `aa` stub). Pulls consented transactions → spend tracking → better "which card to use".
- DPDP consent flow required (P0 #5).

**Phase 4 — award availability (optional, partner-gated).**
- Apply for **seats.aero commercial** access (company email). If approved + region OK, build `server/sources/awards.mjs`. Until then, keep the link-out.

**Always-on — card rules & ratios.**
- Keep curating from MITC; add a **weekly diff job** against issuer pages that *alerts* on change → human verifies → publish. Cross-check against `ccreward.app` OSS data.

---

## Recommended first move
**Phase 1 (offers via a coupon API)** — it's the only domain that is genuinely real-time-able from a public, compliant source, it's the user-visible "live offers" you asked for, and the same account monetises via affiliate. Everything else is either slow-changing (curate) or needs a partner/licence (AA, seats.aero).

To start, you provide: a **coupon-aggregator API key** (CouponAPI.org or Admitad) + the **backend decision** (Supabase vs Railway Postgres). I wire the adapter, normaliser, scheduler, and change-detection.

---

## Sources
- Account Aggregator: [Setu AA](https://setu.co/data/financial-data-apis/account-aggregator/) · [Sahamati FIP/FIU](https://sahamati.org.in/fip-fiu-in-account-aggregators-ecosystem/) · [State of AA 2026](https://casparser.in/blog/state-of-account-aggregator-2026/)
- Award availability: [seats.aero Pro API docs](https://docs.seats.aero/article/68-seatsaero-pro-api-access-limits-and-usage)
- Flights: [Amadeus Self-Service](https://developers.amadeus.com/self-service) · [Travelpayouts API](https://support.travelpayouts.com/hc/en-us/categories/200358578-API-and-data)
- Offers/coupons: [CouponAPI.org](https://couponapi.org/) · [Feedico](https://feedico.io/best-coupon-apis-for-affiliate-publishers) · [Cuelinks (affiliate)](https://www.cuelinks.com/blog/best-affiliate-marketing-platform-india/)
- Card rules: [ccreward.app (OSS dataset)](https://github.com/aashishvanand/ccreward-web) · issuer MITC pages
