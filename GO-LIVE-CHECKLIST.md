# CardIQ — Go-Live: accounts, APIs & data you need

The single procurement list to take CardIQ live end-to-end. **You** sign up / get keys; **I** wire
each into the code (the seams already exist — [web/providers.mjs](web/providers.mjs),
[GOOGLE-SIGNIN-SETUP.md](GOOGLE-SIGNIN-SETUP.md), [DATA-SOURCING.md](DATA-SOURCING.md)).

Cost key: 🆓 free / free tier · 💳 paid (usage or subscription) · 🤝 partnership/approval · 🧾 KYC.

---

## Tier 0 — Minimum to be LIVE (thin MVP: curated data, no login/payments)
Everything works free + on-device; this is all you need to put it in front of users.

| Need | Provider (recommended) | Cost |
|---|---|---|
| **Domain** | any registrar — `cardiq.app` | 💳 ~₹1,000/yr |
| **Hosting** | **Railway** (runs the Node server = API + UI in one) — or Vercel for static-only | 🆓 free tier to start |

➡️ With just these two, the curated-data prototype is publicly live and SEO-indexed.

---

## Tier 1 — Real users & revenue

| # | Need | Provider | Cost | Notes |
|---|---|---|---|---|
| 1 | **Google sign-in** | Google Cloud OAuth Client ID | 🆓 | basic scopes only, no audit ([setup guide](GOOGLE-SIGNIN-SETUP.md)) |
| 2 | **Database** (multi-device wallets) | **Supabase** or Railway Postgres | 🆓 tier | users, wallets, balances |
| 3 | **Transactional email** (magic link, alerts) | **Resend** or AWS SES | 🆓 tier | passwordless login + notifications |
| 4 | **Payments** (Pro/Concierge) | **Razorpay** (India) | 🧾 KYC + ~2% fee | subscriptions + webhook |
| 5 | **Business entity** | — | 🧾 | required for Razorpay KYC + invoicing |

---

## Tier 2 — Live data feeds (the moat)
Match each to the [provider seam](web/providers.mjs). Some have **no API and can't** — noted.

| Data | Source to get | Cost | Reality |
|---|---|---|---|
| **Card offers** (MMT/Amazon/Cleartrip…) | **Cuelinks** or **CouponAPI.org** / Admitad coupons API | 🆓/💳 freemium | best real-time + compliant option |
| **Cash fares** (points-vs-cash) | **Amadeus Self-Service** (authoritative) or **Travelpayouts** (free, affiliate) | 💳 / 🆓 | on-demand, cache briefly |
| **Consented spend** (transactions) | **Account Aggregator** via an FIU/intermediary — **Setu** | 💳 + onboarding | RBI rail; gives txns, **not** points |
| **Award seat availability** | **seats.aero** commercial | 🤝 approval | partner-gated, may be India-restricted → keep link-out till then |
| **Card rules / transfer ratios** | issuer **MITC** pages (manual curate) + cross-ref `ccreward.app` | 🆓 | **no API exists** — curation is the moat |
| **Loyalty point balances** | — | — | **no API anywhere** (login-gated) → user import only (already built) |
| **FX rates** (forex markup) | exchangerate.host / RBI reference | 🆓 | simple |

---

## Tier 3 — AI, monetisation & ops

| Need | Provider | Cost | Notes |
|---|---|---|---|
| **AI concierge** (top tier) | **Anthropic** API key (Claude) | 💳 metered | `callLLM()` hook ready; cap per Concierge seat |
| **Affiliate revenue** (card applications, bookings) | **Cuelinks** / Admitad / direct bank affiliate programs | 🆓 (you earn) | the actual money; `?surface=` tracking ready to add |
| **Error monitoring** | **Sentry** | 🆓 tier | catch breakage |
| **Product analytics** | **Plausible** / PostHog / GA4 | 🆓 tier | signup→wallet→upgrade funnel |
| **Legal review** | a lawyer (DPDP, terms, disclaimer) | 💳 | not an API — do before wide promotion |

---

## The shortest path

1. **Tier 0** (domain + Railway) → you're **live** on the curated prototype. *Today, basically free.*
2. **Tier 1 #1–#3** (Google + Supabase + email, all free tiers) → real accounts, multi-device.
3. **Tier 1 #4–#5** (Razorpay + entity) → take money.
4. **Tier 3 affiliate** (free, you earn) → revenue even before paid data.
5. **Tier 2 feeds** (offers → fares → AA → seats) and **Tier 3 AI** → add as demand justifies the spend.

**Truly unavoidable spend to launch:** a **domain** (~₹1k/yr). Everything else has a free tier or
can wait. **The only data you can never buy:** loyalty point balances (user-import only) and live
award availability is partner-gated — both already handled in the product.
