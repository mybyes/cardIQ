// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER LAYER — the single integration seam for every external-data domain.
//
// Design goal: every flow works TODAY on local/curated data, and going live later
// is the ONLY change needed — implement the marked "── API SEAM ──" in one place
// and flip that domain's `source` to "api". No call site changes.
//
// Each domain documents its future API + whether it's paid/free/partner, so the
// buy-or-not decision is a later phase (see DATA-INTEGRATION.md). Nothing here
// calls a paid API yet; accessors always return a usable value so nothing breaks.
// ─────────────────────────────────────────────────────────────────────────────

import { cards as localCards, offers as localOffers } from "../data.mjs";
import { routes as localRoutes } from "./transfers.mjs";

// cost: "free" | "freemium" | "paid" | "partner" | "n/a"
// status: "live-local" (works now on local data) | "planned" (API seam ready) | "unavailable"
export const PROVIDERS = {
  cards: { domain: "Card catalog & rules", now: "Curated (data.mjs)", api: { name: "Curated DB + ccreward.app cross-ref / direct MITC", cost: "free", url: "https://github.com/aashishvanand/ccreward-web" }, status: "live-local" },
  offers: { domain: "Card / merchant offers", now: "Curated + fixtures", api: { name: "Coupon API (CouponAPI/Admitad) or direct issuer pages", cost: "freemium", url: "https://couponapi.org/" }, status: "live-local" },
  routes: { domain: "Transfer routes (ratio/time/cap)", now: "Curated (transfers.mjs)", api: { name: "Direct issuer transfer pages", cost: "free", url: "" }, status: "live-local" },
  valuation: { domain: "₹/point valuation", now: "Curated model (valuation.mjs)", api: { name: "Derived from routes + fares — no external API", cost: "n/a", url: "" }, status: "live-local" },
  perks: { domain: "Hidden card perks", now: "Curated (perks.mjs)", api: { name: "Direct issuer benefit pages", cost: "free", url: "" }, status: "live-local" },
  fares: { domain: "Cash flight / hotel price", now: "Estimate", api: { name: "Amadeus Self-Service / Travelpayouts", cost: "paid", url: "https://developers.amadeus.com/self-service" }, status: "planned" },
  awardSeats: { domain: "Award seat availability", now: "Link-out", api: { name: "seats.aero (commercial — partner approval)", cost: "partner", url: "https://docs.seats.aero/" }, status: "planned" },
  spend: { domain: "User spend / transactions", now: "User import (SMS/CSV/email)", api: { name: "Account Aggregator via FIU/intermediary", cost: "paid", url: "https://setu.co/data/financial-data-apis/account-aggregator/" }, status: "live-local" },
  balances: { domain: "Loyalty point balances", now: "User import only", api: { name: "None — login-gated, no compliant API", cost: "n/a", url: "" }, status: "unavailable" },
  aiConcierge: { domain: "AI concierge (open-ended)", now: "Scenario player", api: { name: "Anthropic Claude (metered, top tier)", cost: "paid", url: "https://docs.anthropic.com/" }, status: "planned" },
};

const isApi = (k) => PROVIDERS[k]?.source === "api";

// ── Catalog accessors — return local data now; one-line swap to the platform/API later.
export function getCards() {
  // ── API SEAM ──  if (isApi("cards")) return await api.getCards();
  return localCards;
}
export function getOffers() {
  // ── API SEAM ──  if (isApi("offers")) return await fetchCouponFeed();   // coupons API / direct
  return localOffers;
}
export function getRoutes() {
  // ── API SEAM ──  if (isApi("routes")) return await fetchDirectRoutes();
  return localRoutes;
}

// ── On-demand accessors — always return a usable shape so every flow works now.
// Cash price: estimate today, Amadeus/Travelpayouts later. `fallback` keeps flows alive.
export async function getFare(route, fallback = 0) {
  // ── API SEAM ──  if (isApi("fares")) return { inr: await amadeusPrice(route), estimate: false, source: "amadeus" };
  return { inr: fallback, estimate: true, source: "estimate" };
}
// Award availability: link-out today, seats.aero (partner) later.
export async function getAwardSeats(program, route, link) {
  // ── API SEAM ──  if (isApi("awardSeats")) return await seatsAero(program, route);
  return { available: null, link, source: "linkout" };
}
// Consented spend: user import today, Account Aggregator later.
export async function getSpend(userId) {
  // ── API SEAM ──  if (isApi("spend")) return await accountAggregatorPull(userId);
  return { source: "import", transactions: [] }; // app overlays its own imported ledger
}

// Status feed for the data-review console + docs.
export function integrationStatus() {
  return Object.entries(PROVIDERS).map(([key, v]) => ({ key, ...v }));
}
