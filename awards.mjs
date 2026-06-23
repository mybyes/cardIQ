import { currencies } from "./valuation.mjs";

// Goal-based redemption — translate points into concrete loyalty outcomes.
// Illustrative, India-relevant award costs (one-way economy unless noted). Real award
// charts are dynamic/zone-based — these are representative saver levels for planning.
export const AWARDS = [
  { program: "Singapore KrisFlyer", name: "Short-haul regional (Economy)", miles: 7500, cashINR: 9000, kind: "flight" },
  { program: "Singapore KrisFlyer", name: "Delhi → Singapore (Economy)", miles: 22000, cashINR: 22000, kind: "flight" },
  { program: "Singapore KrisFlyer", name: "Delhi → Singapore (Business)", miles: 52000, cashINR: 90000, kind: "flight" },
  { program: "Air India Maharaja Club", name: "Domestic 1-way (Economy)", miles: 7500, cashINR: 6500, kind: "flight" },
  { program: "Air India Maharaja Club", name: "Delhi → London (Economy)", miles: 40000, cashINR: 55000, kind: "flight" },
  { program: "Flying Blue (AF-KLM)", name: "India → Europe (Economy, promo)", miles: 25000, cashINR: 45000, kind: "flight" },
];

// "1:2" → multiply points by 2; "2:1" → 0.5; "1:1" → 1.
const ratioMult = (r) => {
  const [a, b] = (r || "1:1").split(":").map(Number);
  return a ? b / a : 1;
};

// For a balance + its transfer partners, what concrete awards are reachable?
export function reachableAwards(balance, partners) {
  const out = [];
  for (const p of partners ?? []) {
    if (p.good === false) continue; // skip poor-value transfers for goal planning
    const transferred = Math.floor(balance * ratioMult(p.ratio));
    for (const a of AWARDS.filter((x) => x.program === p.program)) {
      out.push({ program: p.program, ratio: p.ratio, transferred, award: a, count: Math.floor(transferred / a.miles), gap: Math.max(0, a.miles - transferred) });
    }
  }
  // reachable (count ≥ 1) first, then by cash value
  return out.sort((x, y) => (y.count > 0) - (x.count > 0) || y.award.cashINR - x.award.cashINR);
}

// Path-to-a-goal: how to reach a target award fastest (earn + burn united).
// Returns current miles toward it, the gap, and the best card to spend on to close it.
export function planForGoal(award, user, cards) {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  let currentMiles = 0;
  let best = null; // { cardName, milesPer100, ratio, currency }
  for (const id of user.cards ?? []) {
    const c = byId[id];
    if (!c) continue;
    const cur = c.reward.currency;
    const partner = (currencies[cur]?.partners ?? []).find((p) => p.program === award.program && p.good !== false);
    if (!partner) continue; // this card's points can't reach the target program well
    const mult = ratioMult(partner.ratio);
    currentMiles += Math.floor((user.pointsBalance?.[id] ?? 0) * mult);
    const milesPer100 = c.reward.base * mult; // program miles per ₹100 spent at base rate
    if (!best || milesPer100 > best.milesPer100) best = { cardName: c.name, milesPer100, ratio: partner.ratio, currency: cur };
  }
  const gap = Math.max(0, award.miles - currentMiles);
  const spendNeeded = best && gap > 0 ? Math.ceil(gap / (best.milesPer100 / 100)) : 0;
  return { award, currentMiles, gap, best, spendNeeded, reachableNow: gap <= 0 };
}
