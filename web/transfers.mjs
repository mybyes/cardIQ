// Transfer-route directory — the data layer book1a's /tools/transfers is built on.
// Pure ESM, no deps; importable by the explorer page and (later) the Pro optimiser.
//
// Ratios, timing and caps change often. Every route carries a `verified` date and the
// app surfaces a "confirm with your issuer" note — accuracy here is the real moat, so
// treat this as a curated, point-in-time snapshot, not gospel.

export const VERIFIED = "2026-06-20";

// Source card-points currencies (what you earn).
export const PROGRAMS = [
  "HDFC Reward Points",
  "Amex Membership Rewards",
  "Axis EDGE Miles",
  "ICICI Reward Points",
  "SBI Reward Points",
  "Standard Chartered Rewards",
];

// type: "airline" | "hotel"
export const routes = [
  // ---- HDFC Reward Points (Infinia / Diners Black, via SmartBuy) ----
  { from: "HDFC Reward Points", to: "Singapore KrisFlyer", type: "airline", ratio: "1:1", time: "Up to 5 working days", instant: false, min: 1000, cap: "1,50,000 pts / yr", verified: VERIFIED, note: "Sweet spot: SQ Saver business DEL→SIN." },
  { from: "HDFC Reward Points", to: "Air India Maharaja Club", type: "airline", ratio: "1:1", time: "1–2 working days", instant: false, min: 1000, cap: "1,50,000 pts / yr", verified: VERIFIED, note: "Good domestic + Star Alliance access." },
  { from: "HDFC Reward Points", to: "Air France–KLM Flying Blue", type: "airline", ratio: "1:1", time: "Up to 3 working days", instant: false, min: 1000, cap: "1,50,000 pts / yr", verified: VERIFIED, note: "Monthly Promo Rewards can cut cost 25–50%." },
  { from: "HDFC Reward Points", to: "Etihad Guest", type: "airline", ratio: "1:1", time: "Up to 5 working days", instant: false, min: 1000, cap: "1,50,000 pts / yr", verified: VERIFIED, note: "" },
  { from: "HDFC Reward Points", to: "Qatar Privilege Club (Avios)", type: "airline", ratio: "1:1", time: "Up to 5 working days", instant: false, min: 1000, cap: "1,50,000 pts / yr", verified: VERIFIED, note: "Avios pools with BA/Iberia/Aer Lingus." },
  { from: "HDFC Reward Points", to: "Marriott Bonvoy", type: "hotel", ratio: "2:1", time: "Up to 7 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Weak value — prefer airline transfers." },
  { from: "HDFC Reward Points", to: "ITC (Club Itc)", type: "hotel", ratio: "1:1", time: "Up to 7 working days", instant: false, min: 1000, cap: "—", verified: VERIFIED, note: "" },
  { from: "HDFC Reward Points", to: "Accor Live Limitless", type: "hotel", ratio: "2:1", time: "Up to 7 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },

  // ---- Amex Membership Rewards (India) ----
  { from: "Amex Membership Rewards", to: "Marriott Bonvoy", type: "hotel", ratio: "1:1", time: "Up to 3–5 working days", instant: false, min: 1000, cap: "—", verified: VERIFIED, note: "Best when topping up for a category 4–5 night." },
  { from: "Amex Membership Rewards", to: "Singapore KrisFlyer", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Via select Amex cards only — check eligibility." },
  { from: "Amex Membership Rewards", to: "Air India Maharaja Club", type: "airline", ratio: "2:1", time: "1–2 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "Amex Membership Rewards", to: "Taj InnerCircle (Epicure)", type: "hotel", ratio: "1:1", time: "Up to 5 working days", instant: false, min: 1000, cap: "—", verified: VERIFIED, note: "Strong for Taj luxury stays." },

  // ---- Axis EDGE Miles (Atlas) ----
  { from: "Axis EDGE Miles", to: "Singapore KrisFlyer", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Atlas tiers can lift this toward 5:4 — check current." },
  { from: "Axis EDGE Miles", to: "Air India Maharaja Club", type: "airline", ratio: "2:1", time: "1–2 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "Axis EDGE Miles", to: "Qatar Privilege Club (Avios)", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "Axis EDGE Miles", to: "Etihad Guest", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "Axis EDGE Miles", to: "Turkish Miles&Smiles", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Sweet spot: Star Alliance long-haul." },
  { from: "Axis EDGE Miles", to: "Accor Live Limitless", type: "hotel", ratio: "5:1", time: "Up to 7 working days", instant: false, min: 5000, cap: "—", verified: VERIFIED, note: "Poor — avoid." },
  { from: "Axis EDGE Miles", to: "Wyndham Rewards", type: "hotel", ratio: "2:1", time: "Up to 7 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },

  // ---- ICICI Reward Points ----
  { from: "ICICI Reward Points", to: "Singapore KrisFlyer", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Emeralde/Sapphiro tiers vary." },
  { from: "ICICI Reward Points", to: "Air India Maharaja Club", type: "airline", ratio: "2:1", time: "1–2 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "ICICI Reward Points", to: "Marriott Bonvoy", type: "hotel", ratio: "2.5:1", time: "Up to 7 working days", instant: false, min: 2500, cap: "—", verified: VERIFIED, note: "Weak." },

  // ---- SBI Reward Points (Prime / Elite) ----
  { from: "SBI Reward Points", to: "Air India Maharaja Club", type: "airline", ratio: "2:1", time: "Up to 5 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "" },
  { from: "SBI Reward Points", to: "Club Vistara → Air India", type: "airline", ratio: "2:1", time: "Up to 7 working days", instant: false, min: 2000, cap: "—", verified: VERIFIED, note: "Vistara has merged into Air India." },

  // ---- Standard Chartered Rewards ----
  { from: "Standard Chartered Rewards", to: "Singapore KrisFlyer", type: "airline", ratio: "3:1", time: "Up to 7 working days", instant: false, min: 3000, cap: "—", verified: VERIFIED, note: "" },
  { from: "Standard Chartered Rewards", to: "Etihad Guest", type: "airline", ratio: "3:1", time: "Up to 7 working days", instant: false, min: 3000, cap: "—", verified: VERIFIED, note: "" },
];

export const PARTNERS = [...new Set(routes.map((r) => r.to))].sort();

// Headline counts for the explorer hero.
export const stats = () => ({
  routes: routes.length,
  partners: PARTNERS.length,
  programs: PROGRAMS.length,
  airlines: new Set(routes.filter((r) => r.type === "airline").map((r) => r.to)).size,
  hotels: new Set(routes.filter((r) => r.type === "hotel").map((r) => r.to)).size,
});

// Filter helper reused by the page (and later by the optimiser).
export function filterRoutes({ from = "all", to = "all", type = "all", q = "" } = {}) {
  const needle = q.trim().toLowerCase();
  return routes.filter(
    (r) =>
      (from === "all" || r.from === from) &&
      (to === "all" || r.to === to) &&
      (type === "all" || r.type === type) &&
      (!needle || (r.from + " " + r.to + " " + r.note).toLowerCase().includes(needle))
  );
}
