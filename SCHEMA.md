# Card-catalog schema — the foundation

Every category (appliances → travel → grocery) runs through ONE engine.
New categories become **data**, not code. The schema is the product.

All numbers in `data.mjs` are **illustrative** — verify against issuer T&Cs before
using anything real. The point of the prototype is the *shape*, not the values.

---

## 1. Card (domain A — static catalog, served to everyone)

```jsonc
{
  "id": "hdfc-infinia",
  "name": "HDFC Infinia",
  "issuer": "HDFC",
  "network": "Visa",

  "annualFee": 12500,
  "feeWaiverSpend": 800000,        // spend ≥ this in a year → fee waived

  "reward": {
    "base": 3.3,                   // effective reward %, already net of ₹/point
    "categories": { "dining": 3.3, "travel": 3.3, "grocery": 3.3 },
    "merchants":  { "amazon": 3.3 },     // merchant-specific overrides category
    "channels":   { "online": 3.3 }      // channel-specific (e.g. SBI 5% online)
  },

  "portal": {                      // bank travel/shopping portal accelerator
    "name": "SmartBuy",
    "category": "travel",
    "effectivePct": 16.5,          // 5X on portal
    "monthlyRewardCapINR": 15000
  },

  "caps":       { "grocery": 500 },          // max reward ₹ per month for category
  "exclusions": ["rent", "fuel", "wallet"],  // earn 0 (or base) here

  "milestones": [                  // marginal value the user never computes
    { "threshold": 300000, "rewardINR": 2500, "label": "₹3L milestone" }
  ],

  "forexMarkupPct": 2.0,           // lower = better for international spend
  "fuelSurchargeWaiver": true,
  "lounge": { "domestic": "unlimited", "international": "unlimited" },

  "pointValueINR": 1.0             // for dashboard display ("12,400 pts ≈ ₹12,400")
}
```

### Why these exact fields
The effective-value engine needs all of them to compute one number:

| Field | Powers |
|---|---|
| `reward.{categories,merchants,channels}` | category-aware earn (the core differentiator) |
| `portal` | travel — the most mis-played category in India |
| `caps` | the hidden trap that kills grocery/online value |
| `exclusions` | the ⚠️ warnings that build trust |
| `milestones` + user spend | the "hindsight" upside users miss |
| `forexMarkupPct` | international travel |
| `feeWaiverSpend` | "should I keep this card?" |

## 2. Offer (domain B — dynamic, merchant × bank)

```jsonc
{
  "id": "croma-axis-appliance",
  "cards": ["axis-atlas"],          // which cards qualify
  "merchants": ["croma"],           // or "categories": ["appliances"]
  "type": "instant_discount",
  "pct": 10,
  "capINR": 6000,
  "noCostEMI": true,
  "expiry": "2026-07-31"
}
```

## 3. User state (domain C — private, regulated)

```jsonc
{
  "cards": ["hdfc-infinia", "axis-atlas", "sbi-cashback"],
  "spendToDate": { "axis-atlas": 290000 },   // YTD, drives milestone math
  "pointsBalance": { "hdfc-infinia": 12400 }
}
```

This is the only regulated, hard-to-get domain. The MVP works **without live
balances** — the user just lists their cards; milestone tracking improves once
you can read spend (statement upload → Account Aggregator → email parsing).
