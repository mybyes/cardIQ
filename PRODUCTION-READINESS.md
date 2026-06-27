# CardIQ — Production Readiness

Status: **prototype complete** — the full earn → value → burn → transfer → book loop works
end to end, with a tiered business model and a chat concierge. It runs on **curated data,
simulated AI, and demo auth/payments**. This doc lists what stands between the prototype and
a real, paying-user launch, prioritised.

Legend — Effort: **S** ≤1 day · **M** few days · **L** 1–2+ weeks.
Owner: **You** = needs an account/credential/decision only you can make · **Build** = I can implement.

---

## P0 — launch blockers (do before any real user touches it)

### 1. Real authentication
- **Now:** Google sign-in is a styled demo sheet; email "magic link" doesn't send; session = a localStorage flag.
- **Do:** Real Google OAuth (Client ID) + a passwordless email link via a backend; real session/JWT.
- **Effort:** M · **Owner:** You (Google Cloud OAuth consent screen + a transactional email provider e.g. Resend/SES) → then **Build** wires it. Hook already exists (`GOOGLE_CLIENT_ID` in [web/login.html](web/login.html)).

### 2. A real user/data backend
- **Now:** all state is per-device localStorage ([web/store.mjs](web/store.mjs)); nothing persists across devices.
- **Do:** Auth'd API + DB (Supabase/Postgres) for users, wallets, balances. There's already a zero-dep server + source registry to build on.
- **Effort:** L · **Owner:** You (pick Supabase/Railway) · **Build:** schema + endpoints.

### 3. Payments for Pro / Concierge
- **Now:** upgrades are demo flips (`setPlan`).
- **Do:** Razorpay subscriptions (India) → webhook sets the plan server-side; gate features off the server, not the client.
- **Effort:** M · **Owner:** You (Razorpay KYC + keys) · **Build:** checkout + webhook + entitlement check.
- ⚠️ I cannot create accounts or process payments — you do KYC/keys; I wire the integration.

### 4. Data accuracy & freshness (**the real moat**)
- **Now:** card rules, transfer ratios/timing/caps, award miles, perks, offers are **curated/illustrative** with "verified" dates ([data.mjs](data.mjs), [web/transfers.mjs](web/transfers.mjs), [web/perks.mjs](web/perks.mjs), [valuation.mjs](valuation.mjs)).
- **Do:** A verification pipeline — sourced from issuer MITC/T&Cs, dated, with a review cadence. Decide: manual curation first (defensible, accurate) vs scraping (ToS risk).
- **Effort:** L (ongoing) · **Owner:** You (data policy) · **Build:** ingestion + admin review UI (the `?dev=1` platform panel is a start).
- This is what makes the advice trustworthy — wrong numbers = lost user trust + liability.

### 5. Legal & compliance review
- **Now:** Privacy/Terms/Disclaimer drafted ([web/legal.html](web/legal.html)) but not lawyer-reviewed; affiliate disclosure present.
- **Do:** Lawyer review for your entity/jurisdiction; DPDP Act consent + data-deletion flow that actually deletes; confirm "not financial advice" framing.
- **Effort:** M · **Owner:** You (counsel) · **Build:** consent UI + delete endpoint.

---

## P1 — needed soon after launch

### 6. Real LLM concierge (top tier)
- **Now:** simulated scenario player ([web/concierge.mjs](web/concierge.mjs)); `callLLM()` hook ready.
- **Do:** `/api/concierge` → server-side Claude, **metered per Concierge seat**, with caps + prompt caching to control cost. Feed it the user's real wallet + the transfer/award data as context.
- **Effort:** M · **Owner:** You (Anthropic API key + cost cap decision) · **Build:** endpoint + cost guardrails.
- Deferred by you for now (cost). Gating already restricts it to the top tier.

### 7. Affiliate revenue plumbing
- **Do:** Real affiliate links per card + click/conversion tracking (book1a's `?surface=` pattern), so "Get a card" actually earns.
- **Effort:** S–M · **Owner:** You (affiliate sign-ups) · **Build:** link config + tracking.

### 8. Error monitoring & analytics
- **Do:** Sentry (errors) + privacy-respecting product analytics (funnel: signup → wallet → upgrade). Currently none.
- **Effort:** S · **Build.**

### 9. Deploy + domain + CI
- **Do:** Confirm CardIQ is live (Railway backend + Vercel/static front), custom domain, auto-deploy from `master`, env secrets set. (Repo is on `mybyes/cardIQ`; live status unconfirmed.)
- **Effort:** S–M · **Owner:** You (domain/DNS) · **Build:** deploy config (there's `vercel.json` + `server.mjs`).

---

## P2 — post-launch polish

- **Award seat availability** — integrate or formalise the link-out (seats.aero bars commercial API). M.
- **Ingestion at scale** — SMS/CSV/email-forward already parse; add an inbound-email webhook for `import@cardiq.app`. M.
- **More cards/programs** — expand the catalog beyond the seed set. Ongoing.
- **Mobile** — the web app is responsive; consider PWA/install. M.
- **A11y + perf pass** — keyboard nav, contrast, Lighthouse. S.

---

## Suggested sequence (4 phases)

1. **Foundation:** Auth (#1) + backend/DB (#2) + deploy (#9). Now it's a real multi-device app.
2. **Monetise:** Payments (#3) + affiliate (#7) + legal review (#5). Now it can take money, legally.
3. **Trust:** Data pipeline (#4) + monitoring/analytics (#8). Now the advice is defensible and observable.
4. **Differentiate:** Real LLM concierge (#6) + award/ingestion polish (P2). Now the top tier is genuinely AI.

**Highest single leverage if you do just one next:** #4 (data accuracy) — it's what the entire product's credibility rests on. **Fastest path to revenue:** #1 → #3 → #7.
