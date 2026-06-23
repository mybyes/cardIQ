// The ₹-normalization engine (production-grade).
// Reward earned in points/miles, converted to ₹ via the valuation engine.
// Crucially: separates STEADY value (repeatable: reward+offer-forex) from
// the ONE-TIME milestone push, and respects per-card cap consumption + already
// consumed milestones passed in via `ctx` (see state.mjs).

import { valuePerUnit, currencies } from "./valuation.mjs";

export const rupee = (n) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");

// OTAs where some travel cards do NOT give their accelerated travel rate
// (e.g. Axis Atlas accelerates only direct airline/hotel + Travel Edge portal).
const OTAS = ["makemytrip", "mmt", "goibibo", "yatra", "easemytrip", "ixigo", "cleartrip"];

// Resolve earn rate (units per ₹100). Precedence: merchant > portal > channel > category > base.
function resolveRate(card, txn) {
  const r = card.reward;
  const m = txn.merchant?.toLowerCase();
  if (m && r.merchants && r.merchants[m] != null) return { rate: r.merchants[m], src: `${txn.merchant} rate` };
  if (txn.viaPortal && card.portal && card.portal.category === txn.category)
    return { rate: card.portal.rate, src: `${card.portal.name} portal` };
  if (txn.channel && r.channels && r.channels[txn.channel] != null) return { rate: r.channels[txn.channel], src: `${txn.channel} rate` };
  if (r.categories && r.categories[txn.category] != null) {
    // travel accelerator restricted to direct bookings / portal for some cards
    if (txn.category === "travel" && card.reward.travelDirectOnly && !txn.viaPortal) {
      const mm = (txn.merchant || "").toLowerCase().replace(/[^a-z]/g, "");
      if (OTAS.some((o) => mm.includes(o))) return { rate: r.base, src: "base (OTA, not direct)" };
    }
    return { rate: r.categories[txn.category], src: `${txn.category} rate` };
  }
  return { rate: r.base, src: "base rate" };
}

function findOffer(offers, card, txn) {
  const m = txn.merchant?.toLowerCase();
  return (offers ?? []).find(
    (o) =>
      o.cards.includes(card.id) &&
      ((o.merchants && m && o.merchants.includes(m)) || (o.categories && o.categories.includes(txn.category)))
  );
}

// ctx = { spent, capUsed: {key:INR}, consumed: Set<threshold> } for THIS card.
export function evaluate(card, txn, ctx, offers, mode = "typical") {
  ctx = ctx ?? { spent: 0, capUsed: {}, consumed: new Set() };
  const breakdown = [];
  const warnings = [];
  const currency = card.reward.currency;
  const vpu = valuePerUnit(currency, mode);
  const unitName = currency === "CASHBACK" ? "cashback" : currencies[currency]?.name ?? "pts";

  // 1. Reward earn (exclusions + monthly cap consumption)
  const excluded = card.exclusions?.includes(txn.category);
  let { rate, src } = resolveRate(card, txn);
  if (excluded) {
    warnings.push(`${txn.category} excluded — earns base ${card.reward.base}/₹100 only`);
    rate = card.reward.base;
    src = "base (excluded)";
  }
  const units = (txn.amount * rate) / 100;
  let rewardINR = units * vpu;

  // monthly cap: how much of the cap is already used this month?
  let capKey = null;
  const mCap = txn.merchant?.toLowerCase();
  if (card.caps)
    capKey =
      card.caps[mCap] != null ? mCap : card.caps[txn.category] != null ? txn.category : card.caps[txn.channel] != null ? txn.channel : null;
  let capConsumeINR = rewardINR;
  if (capKey != null) {
    const used = ctx.capUsed?.[capKey] ?? 0;
    const remaining = Math.max(0, card.caps[capKey] - used);
    if (rewardINR > remaining) {
      warnings.push(`${capKey} cap: ${rupee(remaining)} of ${rupee(card.caps[capKey])}/mo left (would earn ${rupee(rewardINR)})`);
      rewardINR = remaining;
    }
    capConsumeINR = rewardINR;
  }
  const earnDesc =
    currency === "CASHBACK" ? `${rate}% ${src}` : `${Math.round(units).toLocaleString("en-IN")} ${unitName} @ ₹${vpu}/pt · ${src}`;
  breakdown.push(`+${rupee(rewardINR)} reward (${earnDesc})`);

  // 2. Instant offer / no-cost EMI
  let offerINR = 0;
  const offer = findOffer(offers, card, txn);
  if (offer && offer.type === "instant_discount") {
    offerINR = Math.min((txn.amount * offer.pct) / 100, offer.capINR);
    breakdown.push(`+${rupee(offerINR)} instant discount (${offer.pct}%, cap ${rupee(offer.capINR)})`);
    if (offer.noCostEMI) breakdown.push(`+ no-cost EMI eligible`);
  }

  // 3. Forex markup (international)
  let forexINR = 0;
  if (txn.isInternational) {
    forexINR = (txn.amount * card.forexMarkupPct) / 100;
    breakdown.push(`−${rupee(forexINR)} forex markup (${card.forexMarkupPct}%)`);
    if (card.forexMarkupPct <= 2) warnings.push(`low forex markup — good for international`);
  }

  // STEADY value = repeatable each time you spend here
  const steady = rewardINR + offerINR - forexINR;

  // 4. ONE-TIME milestone push (only if not already consumed and this crosses it)
  let milestoneINR = 0;
  const crossed = [];
  const spent = ctx.spent ?? 0;
  for (const ms of card.milestones ?? []) {
    if (ctx.consumed?.has?.(ms.threshold)) continue;
    if (spent < ms.threshold && spent + txn.amount >= ms.threshold) {
      const msINR = ms.rewardUnits * vpu;
      milestoneINR += msINR;
      crossed.push(ms.threshold);
      breakdown.push(`+${rupee(msINR)} ⭐ crosses ${ms.label} (+${ms.rewardUnits} ${unitName}, ${rupee(spent)}→${rupee(spent + txn.amount)})`);
    } else if (spent < ms.threshold && ms.threshold - (spent + txn.amount) <= 25000) {
      breakdown.push(`~ ${rupee(ms.threshold - (spent + txn.amount))} short of ${ms.label} after this`);
    }
  }

  const value = steady + milestoneINR;
  return {
    cardId: card.id,
    name: card.name,
    steady,
    milestoneINR,
    value,
    pct: (value / txn.amount) * 100,
    steadyPct: (steady / txn.amount) * 100,
    breakdown,
    warnings,
    capKey,
    capConsumeINR,
    crossed,
  };
}

// Pretty-print a ranking for the terminal surfaces.
export function render(txn, ranked) {
  const lines = [];
  const loc = txn.merchant ? ` @ ${txn.merchant}` : "";
  lines.push(`\n━━━ ${txn.label ?? "Transaction"}: ${rupee(txn.amount)} · ${txn.category}${loc}${txn.isInternational ? " · international" : ""} ━━━`);
  const best = ranked[0];
  const second = ranked[1];
  lines.push(`\n✅ USE: ${best.name}  →  effective ${rupee(best.value)} (${best.pct.toFixed(1)}%)`);
  if (best.milestoneINR > 0) lines.push(`     steady ${rupee(best.steady)} + ⭐ one-time milestone ${rupee(best.milestoneINR)}`);
  for (const b of best.breakdown) lines.push(`     ${b}`);
  for (const w of best.warnings) lines.push(`     ⚠️  ${w}`);
  if (second) lines.push(`\n   vs ${second.name}: ${rupee(second.value)} (${second.pct.toFixed(1)}%)  →  you'd lose ${rupee(best.value - second.value)}`);
  lines.push(`\n   full ranking:`);
  for (const r of ranked) {
    const star = r.milestoneINR > 0 ? " ⭐" : "";
    const flag = r.warnings.some((w) => w.includes("excluded")) ? " ⚠️excl" : "";
    lines.push(`     ${r.name.padEnd(20)} ${rupee(r.value).padStart(9)}  (${r.pct.toFixed(1)}%)${star}${flag}`);
  }
  return lines.join("\n");
}
