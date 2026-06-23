// "I don't know the final price yet" — analyse a purchase across a price RANGE.
// Card choice is mostly %-based (price-independent); only caps, offer min-spends and
// milestone crossings create price BREAKPOINTS. This finds the stable pick + the bands.
import { WalletState } from "./state.mjs";

const OTA = ["makemytrip", "mmt", "goibibo", "yatra", "easemytrip", "ixigo", "cleartrip"];

export function isTravelOTA(txn) {
  const m = (txn.merchant || "").toLowerCase().replace(/[^a-z]/g, "");
  return txn.category === "travel" && OTA.some((o) => m.includes(o)) && !txn.viaPortal;
}

export function analyzeRange(base, cards, user, offers, mode = "typical", lo = 4000, hi = 9000, steps = 50) {
  const amts = [];
  for (let i = 0; i <= steps; i++) amts.push(Math.round(lo + ((hi - lo) * i) / steps));

  // winner per sampled amount → collapse into contiguous bands
  const bands = [];
  for (const amount of amts) {
    const best = new WalletState(user).rank(cards, { ...base, amount }, offers, mode)[0];
    const last = bands[bands.length - 1];
    if (last && last.cardId === best.cardId) {
      last.to = amount;
      last.pctHi = best.pct;
    } else bands.push({ cardId: best.cardId, name: best.name, from: amount, to: amount, pctLo: best.pct, pctHi: best.pct });
  }

  // stable pick by STEADY % (truly price-independent — ignores one-off milestone)
  const mid = Math.round((lo + hi) / 2);
  const stable = new WalletState(user)
    .rank(cards, { ...base, amount: mid }, offers, mode)
    .sort((a, b) => b.steadyPct - a.steadyPct)[0];

  // price-sensitive notes
  const notes = [];
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  for (const id of user.cards) {
    const c = byId[id];
    const spent = user.spendToDate?.[id] ?? 0;
    for (const ms of c.milestones ?? []) {
      const cross = ms.threshold - spent;
      if (cross > lo && cross <= hi) notes.push(`At ₹${cross.toLocaleString("en-IN")}+, ${c.name} also crosses ${ms.label} (+${ms.rewardUnits} pts) — pick it if the fare reaches that.`);
    }
  }
  for (const o of offers) {
    const m = (base.merchant || "").toLowerCase();
    if ((o.merchants?.includes(m) || o.categories?.includes(base.category)) && o.capINR && o.pct) {
      const sat = Math.round((o.capINR / o.pct) * 100);
      if (sat > lo && sat < hi) notes.push(`Instant discount on ${base.merchant} saturates at ₹${sat.toLocaleString("en-IN")} (${o.pct}% capped at ₹${o.capINR.toLocaleString("en-IN")}).`);
    }
  }

  return { bands, stable, priceIndependent: bands.length === 1, lo, hi };
}
