// Transfer-route directory — the data layer book1a's /tools/transfers is built on.
// Pure ESM, no deps; importable by the explorer page and (later) the Pro optimiser.
//
// Ratios, timing and caps change often. Every route carries a `verified` date and the
// app surfaces a "confirm with your issuer" note — accuracy here is the real moat, so
// treat this as a curated, point-in-time snapshot, not gospel.

export const VERIFIED = "2026-06-20";

// Official reference per source program — shown next to each route's verified date so
// users (and we) can trace every number back to the issuer. Transparency = trust = moat.
export const SOURCES = {
  "HDFC Reward Points": { name: "HDFC SmartBuy", url: "https://offers.smartbuy.hdfcbank.com/" },
  "Amex Membership Rewards": { name: "Amex Membership Rewards", url: "https://www.americanexpress.com/in/rewards/membership-rewards/" },
  "Axis EDGE Miles": { name: "Axis EDGE / Atlas", url: "https://www.axisbank.com/retail/cards/credit-card/axis-bank-atlas-credit-card" },
  "ICICI Reward Points": { name: "ICICI Rewards", url: "https://www.icicibank.com/personal-banking/cards/credit-card/rewards" },
  "SBI Reward Points": { name: "SBI Card Rewards", url: "https://www.sbicard.com/en/personal/rewards.page" },
  "Standard Chartered Rewards": { name: "StanChart Rewards", url: "https://www.sc.com/in/rewards/" },
};
export const sourceFor = (program) => SOURCES[program] || null;

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

// ---------------------------------------------------------------------------
// Chat journey engine — turns a plain-language goal into an end-to-end plan:
// award cost → which of your points → best transfer route → shortfall & how to
// earn it → where to book. All numbers are illustrative estimates (award charts
// and fares move constantly); confirm live before booking.
// ---------------------------------------------------------------------------

// A demo wallet so the concierge works before sign-in (mirrors the landing dashboard).
export const SAMPLE_WALLET = [
  { program: "HDFC Reward Points", card: "HDFC Infinia", balance: 500000 },
  { program: "Amex Membership Rewards", card: "Amex Platinum", balance: 240000 },
  { program: "Axis EDGE Miles", card: "Axis Atlas", balance: 85000 },
];

// Award targets (the "flight search"): partner program + miles + cash benchmark.
export const GOALS = [
  { id: "sin-biz", label: "Business class to Singapore", match: ["singapore", "sin", "krisflyer"], cabin: "Business", route: "Delhi → Singapore", air: "Singapore Airlines · SQ Saver business (Star Alliance)", partner: "Singapore KrisFlyer", miles: 51000, taxes: 6000, cash: 155000, seat: "https://seats.aero/search" },
  { id: "dxb-biz", label: "Business class to Dubai", match: ["dubai", "dxb"], cabin: "Business", route: "Delhi → Dubai", air: "Air India · nonstop business", partner: "Air India Maharaja Club", miles: 55000, taxes: 8000, cash: 110000, seat: "https://www.airindia.com" },
  { id: "lhr-biz", label: "Business class to London", match: ["london", "lhr", "uk", "england"], cabin: "Business", route: "Delhi → London", air: "Qatar Airways · Qsuite via Doha (Avios)", partner: "Qatar Privilege Club (Avios)", miles: 80000, taxes: 25000, cash: 240000, seat: "https://seats.aero/search" },
  { id: "dom", label: "A free domestic flight", match: ["domestic", "goa", "mumbai", "bengaluru", "bangalore", "within india", "free flight"], cabin: "Economy", route: "Any domestic", air: "Air India / partners", partner: "Air India Maharaja Club", miles: 10000, taxes: 1200, cash: 6500, seat: "https://www.airindia.com" },
];

const EARN_PER_100 = { "HDFC Reward Points": 3.3, "Amex Membership Rewards": 1.5, "Axis EDGE Miles": 2, "ICICI Reward Points": 2, "SBI Reward Points": 2, "Standard Chartered Rewards": 1 };

const ratioFactor = (r) => { const [a, b] = r.split(":").map(Number); return a / (b || 1); }; // source points per 1 partner mile
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function findGoal(t) { const s = t.toLowerCase(); return GOALS.find((g) => g.match.some((m) => s.includes(m))); }
function findProgram(t) {
  const s = t.toLowerCase();
  const map = [["hdfc", "HDFC Reward Points"], ["infinia", "HDFC Reward Points"], ["diners", "HDFC Reward Points"], ["amex", "Amex Membership Rewards"], ["membership reward", "Amex Membership Rewards"], ["platinum", "Amex Membership Rewards"], ["axis", "Axis EDGE Miles"], ["atlas", "Axis EDGE Miles"], ["edge", "Axis EDGE Miles"], ["icici", "ICICI Reward Points"], ["sbi", "SBI Reward Points"], ["standard chartered", "Standard Chartered Rewards"]];
  const hit = map.find(([k]) => s.includes(k));
  return hit ? hit[1] : null;
}

// Main entry: returns a structured plan the chat UI renders.
export function planJourney(text, wallet = SAMPLE_WALLET) {
  const goal = findGoal(text);
  const prog = findProgram(text);
  if (goal) return planForAward(goal, wallet, prog);
  if (prog) return planForPoints(prog, wallet);
  return { kind: "unknown" };
}

function planForAward(goal, wallet, prefProg) {
  const cands = wallet
    .map((w) => {
      const route = routes.find((r) => r.from === w.program && r.to === goal.partner);
      if (!route) return null;
      const factor = ratioFactor(route.ratio);
      const sourceNeeded = Math.round(goal.miles * factor);
      return { program: w.program, card: w.card, balance: w.balance, ratio: route.ratio, time: route.time, cap: route.cap, factor, sourceNeeded, covered: w.balance >= sourceNeeded };
    })
    .filter(Boolean);

  if (!cands.length) return { kind: "goal-noroute", goal };

  cands.sort((a, b) => b.covered - a.covered || (a.covered ? a.sourceNeeded - b.sourceNeeded : a.sourceNeeded - a.balance - (b.sourceNeeded - b.balance)));
  if (prefProg) { const i = cands.findIndex((c) => c.program === prefProg); if (i > 0) cands.unshift(cands.splice(i, 1)[0]); }

  const pick = cands[0];
  const shortfall = Math.max(0, pick.sourceNeeded - pick.balance);
  const earn = shortfall ? { shortfall, spend: Math.round((shortfall * 100) / (EARN_PER_100[pick.program] || 1)), card: pick.card } : null;
  const saved = goal.cash - goal.taxes;

  return {
    kind: "goal",
    goal,
    pick,
    alternatives: cands.slice(1, 3),
    earn,
    value: { cash: goal.cash, taxes: goal.taxes, saved },
    fmt: { sourceNeeded: pick.sourceNeeded.toLocaleString("en-IN"), balance: pick.balance.toLocaleString("en-IN"), miles: goal.miles.toLocaleString("en-IN"), taxes: inr(goal.taxes), cash: inr(goal.cash), saved: inr(saved), shortfall: shortfall.toLocaleString("en-IN"), spend: earn ? inr(earn.spend) : "" },
  };
}

function planForPoints(prog, wallet) {
  const w = wallet.find((x) => x.program === prog) || { program: prog, card: prog, balance: 0 };
  const opts = routes.filter((r) => r.from === prog).map((r) => ({ ...r, factor: ratioFactor(r.ratio) }));
  if (!opts.length) return { kind: "unknown" };
  opts.sort((a, b) => a.factor - b.factor || (a.type === "airline" ? -1 : 1) - (b.type === "airline" ? -1 : 1));
  const best = opts[0];
  const partnerMiles = Math.floor(w.balance / best.factor);
  const g = GOALS.find((x) => x.partner === best.to);
  const seats = g ? Math.floor(partnerMiles / g.miles) : null;
  return {
    kind: "points",
    program: prog,
    card: w.card,
    balance: w.balance,
    best,
    partnerMiles,
    goal: g,
    seats,
    fmt: { balance: w.balance.toLocaleString("en-IN"), partnerMiles: partnerMiles.toLocaleString("en-IN") },
  };
}

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
