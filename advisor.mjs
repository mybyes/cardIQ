// Card-acquisition advisor — "which card should I GET next?"
// Builds a spend profile from the user's transactions, then for each card they
// DON'T hold, computes the incremental annual reward of adding it (only crediting
// categories where it actually beats the current wallet), net of its annual fee.
import { evaluate } from "./engine.mjs";

const freshCtx = () => ({ spent: 0, capUsed: {}, consumed: new Set() });

// Aggregate a ledger into annualised (category, merchant, channel) spend buckets.
// annualize: the ledger is treated as one representative month by default (×12).
export function buildSpendProfile(ledger, annualize = 12) {
  const map = new Map();
  for (const t of ledger ?? []) {
    if (!(t.amount > 0)) continue;
    const key = `${t.category}|${(t.merchant || "").toLowerCase()}|${t.channel || "online"}`;
    const e = map.get(key) || { category: t.category, merchant: t.merchant, channel: t.channel || "online", amount: 0 };
    e.amount += t.amount;
    map.set(key, e);
  }
  return [...map.values()].map((e) => ({ ...e, amount: Math.round(e.amount * annualize) }));
}

// Representative merchant/channel per category — realistic places people spend,
// so co-brand cards get fair credit where they're actually used.
const REP = {
  grocery: { merchant: "BigBasket", channel: "online" },
  dining: { merchant: "Swiggy", channel: "online" },
  travel: { merchant: "MakeMyTrip", channel: "online" },
  electronics: { merchant: "Amazon", channel: "online" },
  shopping: { merchant: "Myntra", channel: "online" },
  appliances: { merchant: "Croma", channel: "offline" },
  fuel: { merchant: "", channel: "offline" },
  transport: { merchant: "Uber", channel: "online" },
  other: { merchant: "", channel: "online" },
};

// Build an annual profile from a {category: monthlyAmount} map.
export function profileFromMonthly(monthly) {
  return Object.entries(monthly)
    .filter(([, v]) => v > 0)
    .map(([category, v]) => ({ category, merchant: REP[category]?.merchant, channel: REP[category]?.channel ?? "online", amount: Math.round(v * 12) }));
}

export function categorySummary(profile) {
  const byCat = {};
  let total = 0;
  for (const p of profile) {
    byCat[p.category] = (byCat[p.category] ?? 0) + p.amount;
    total += p.amount;
  }
  return { byCat, total };
}

// Best steady value (and which card) for a single monthly transaction.
function entryBest(cardSet, txn, offers, mode) {
  let best = 0, bestCard = null;
  for (const c of cardSet) {
    const r = evaluate(c, txn, freshCtx(), offers, mode);
    if (r.steady > best) (best = r.steady), (bestCard = c);
  }
  return { best, bestCard };
}

// Rank cards the user doesn't hold by net annual gain on their spend profile.
export function recommendNewCard(profile, user, catalog, offers, mode = "typical") {
  const held = catalog.filter((c) => user.cards.includes(c.id));
  const candidates = catalog.filter((c) => !user.cards.includes(c.id));

  return candidates
    .map((cand) => {
      let incremental = 0;
      const wins = new Set();
      for (const p of profile) {
        // simulate monthly so monthly caps apply correctly, then annualise
        const monthlyTxn = { category: p.category, merchant: p.merchant, channel: p.channel, amount: p.amount / 12, label: "profile" };
        const base = entryBest(held, monthlyTxn, offers, mode);
        const withC = entryBest([...held, cand], monthlyTxn, offers, mode);
        const delta = (withC.best - base.best) * 12;
        if (delta > 0.5 && withC.bestCard?.id === cand.id) {
          incremental += delta;
          wins.add(p.category);
        }
      }
      return {
        card: cand,
        incrementalReward: Math.round(incremental),
        fee: cand.annualFee,
        feeWaiverSpend: cand.feeWaiverSpend,
        net: Math.round(incremental - cand.annualFee),
        wins: [...wins],
      };
    })
    .sort((a, b) => b.net - a.net);
}
