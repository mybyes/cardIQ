# CardIQ Engine — B2B "Points Intelligence" (pitch + API spec)

> **The cross-card optimization layer. "Plaid for credit-card points."**
> Your users hold cards and points across issuers and don't know what they're worth or how to use
> them. CardIQ Engine tells them — embeddable in your app in weeks, not quarters.

## The pitch (for neobanks / multi-card aggregators / PFM)

- **Problem:** users' reward points sit idle, expire, or get cashed out at ₹0.20 — and "my points
  are useless" is a top churn/CSAT complaint. Building cross-card rewards intelligence in-house
  means a data team + a constantly-maintained transfer/award dataset.
- **Solution:** drop in CardIQ Engine — *what your users' points are worth, the best way to use
  them, and which card to swipe* — across **all** their cards, neutrally.
- **Why it's a fit for you (not for an issuer):** a bank wants lock-in to *its* program (that's
  what [Ascenda](http://www.ascendaloyalty.com/) powers — single-program infra, e.g. Axis's
  transfer program). You hold the **multi-card** relationship, so **neutral cross-card advice** is
  yours to give — the white space incumbents are structurally disincentivized to build.
- **Why now:** premium-card penetration is rising in India; breakage is huge; nobody owns
  cross-card optimization for the mass "Activator" who holds points but doesn't use them.
- **Why us:** a curated, sourced, dated India transfer/valuation dataset + a mature engine +
  speed-to-ship. You get the feature in weeks; we keep the data fresh.

**Outcomes you can pitch internally:** ↑ engagement & DAU (the "idle ₹ value" hook + alerts),
↑ card spend (right-card nudges), ↓ "useless points" churn, new rev-share (transfers/card-apps).

---

## What you embed

1. **Points Intelligence API** — `POST /api/points` (below). Stateless, you send holdings, we
   return value + best use. Pair with `/api/recommend` (which card for a txn) and `/api/plan`.
2. **Drop-in widget** — `web/embed.html`, brandable via query params. Live demo of the value hook.

### API — `POST /api/points`
Stateless, CORS-open. Map your users' cards to currency codes: `HDFC_RP`, `EDGE_MILE`, `MR_POINT`,
`ICICI_RP`, `CASHBACK` (extensible).

**Request**
```json
{ "holdings": [
  { "currency": "HDFC_RP",   "balance": 500000 },
  { "currency": "MR_POINT",  "balance": 240000 },
  { "currency": "EDGE_MILE", "balance": 85000 }
] }
```

**Response**
```json
{
  "total": { "best": 825000, "typical": 695000, "floor": 227000 },
  "holdings": [
    { "currency": "HDFC_RP", "name": "HDFC Reward Points", "balance": 500000,
      "value": { "best": 500000, "typical": 500000, "floor": 150000 },
      "best": { "path": "SmartBuy flights & hotels (70:30)", "inr": 500000 },
      "partners": [ { "program": "Singapore KrisFlyer", "ratio": "1:1", "kind": "airline", "good": true } ] }
  ],
  "topAction": {
    "currency": "HDFC_RP",
    "headline": "Your HDFC Reward Points is worth up to ₹5,00,000",
    "detail": "via SmartBuy flights & hotels — vs only ₹1,50,000 if cashed out. Don't leave ₹3,50,000 on the table."
  },
  "dataVersion": "curated",
  "note": "Estimates — confirm with issuer."
}
```

Companion endpoints (already live): `GET /api/cards`, `GET /api/offers`, `GET /api/recommend`
(txn → best card), `POST /api/plan` (spends → allocation), `GET /api/health`.

### Widget embed
```html
<iframe src="https://cardiq.app/web/embed.html?brand=Jupiter&accent=2a4cae&h=HDFC_RP:500000,MR_POINT:240000"
        style="border:0;width:400px;height:340px" title="Your points value"></iframe>
```
Params: `brand`, `accent` (hex), `cta` (link), `h` (`CURRENCY:balance` comma-separated). Computes
client-side for the demo; point it at `/api/points` for live/SSR.

---

## Business model
- **SaaS** — per-MAU or per-call licence of the API/SDK.
- **Rev-share** — on affiliate card-applications + transfers/bookings the engine drives.
- Bigger, recurring contracts vs ₹199 D2C subs → faster, sturdier revenue.

## Who to target (and who to avoid)
1. **Neobanks / multi-card apps** — Fi, Jupiter, OneCard, Slice, CRED-adjacent. *Best fit.*
2. **PFM / wealth** — INDmoney, ET Money ("points as an asset + how to realize it").
3. **OTAs** — MMT/Cleartrip ("pay with the right points").
4. ⚠️ **Issuers** — avoid as lead: conflict of interest + Ascenda owns single-program infra.

## Risks (honest) & defenses
- **Build-vs-buy** → defense: data freshness + engine maturity + speed; the curated India dataset.
- **Incumbent (Ascenda) creep** → defense: own the *neutral cross-card* angle they can't (it
  competes with their bank clients' lock-in).
- **Enterprise sales cycle** → start with fast-moving neobanks, not banks.
- **Accuracy = their brand** → SLAs + the review-console + "report a correction" moat.
- **Brand invisibility / platform dependency** → keep the D2C brand alive in parallel.

## Pilot path
1. Warm intro to 2–3 neobanks (Fi / Jupiter / OneCard).
2. Free embed of the widget + `/api/points` → prove engagement lift on a cohort.
3. Convert to paid licence + rev-share.

**D2C and B2B reinforce:** the D2C product earns expert trust (the data moat); that credibility is
the B2B sales asset — *"the cross-card optimizer the experts trust, embeddable in your app."*
