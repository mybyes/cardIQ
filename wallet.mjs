// node wallet.mjs — the "one place" dashboard.
import { cards, offers as rawOffers, user } from "./data.mjs";
import { resolveOffers } from "./offers.mjs";
const offers = resolveOffers(rawOffers).offers; // align CLI with offer-lifecycle (expiry+dedupe+conflict)
import { valuePerUnit, currencies, valuationReport } from "./valuation.mjs";
import { WalletState } from "./state.mjs";
import { rupee } from "./engine.mjs";

const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const bar = (pct, w = 20) => "[" + "#".repeat(Math.max(0, Math.min(w, Math.round((pct / 100) * w)))) + "-".repeat(w - Math.max(0, Math.min(w, Math.round((pct / 100) * w)))) + "]";

console.log("\n══════════════════ YOUR WALLET ══════════════════\n");
console.log(valuationReport());

for (const id of user.cards) {
  const c = byId[id];
  const cur = c.reward.currency;
  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`  ${c.name}  (${c.issuer} · ${c.network})`);

  const bal = user.pointsBalance?.[id];
  if (bal != null && cur !== "CASHBACK") {
    console.log(`    Balance:   ${bal.toLocaleString("en-IN")} ${currencies[cur].name}  ≈  ${rupee(bal * valuePerUnit(cur, "best"))} best / ${rupee(bal * valuePerUnit(cur, "typical"))} typical / ${rupee(bal * valuePerUnit(cur, "floor"))} floor`);
  }

  const spent = user.spendToDate?.[id] ?? 0;
  const next = (c.milestones ?? []).find((m) => spent < m.threshold);
  if (next) {
    const pct = (spent / next.threshold) * 100;
    console.log(`    Milestone: ${bar(pct)} ${pct.toFixed(0)}%  →  ${rupee(next.threshold - spent)} to ${next.label} (~${rupee(next.rewardUnits * valuePerUnit(cur, "typical"))})`);
  } else if (c.milestones?.length) {
    console.log(`    Milestone: all tiers cleared 🎉`);
  }

  if (c.feeWaiverSpend > 0) {
    const pct = Math.min(100, (spent / c.feeWaiverSpend) * 100);
    const status = spent >= c.feeWaiverSpend ? "WAIVED ✓" : `${rupee(c.feeWaiverSpend - spent)} more to waive ₹${c.annualFee.toLocaleString("en-IN")} fee`;
    console.log(`    Fee:       ${bar(pct)} ${pct.toFixed(0)}%  →  ${status}`);
  } else if (c.annualFee > 0) {
    console.log(`    Fee:       ₹${c.annualFee.toLocaleString("en-IN")}/yr (no spend waiver)`);
  } else {
    console.log(`    Fee:       lifetime free`);
  }

  const exp = user.expiring?.find((e) => e.card === id);
  if (exp) console.log(`    ⚠️ Expiring: ${exp.units.toLocaleString("en-IN")} ${currencies[cur].name} in ${exp.days} days`);
}

console.log(`\n──────────────────────────────────────────────────`);
console.log(`  BEST CARD BY CATEGORY (steady value, ₹10,000 spend, milestone excluded)\n`);
const cats = [
  { category: "travel", merchant: "smartbuy", channel: "online", viaPortal: true },
  { category: "electronics", merchant: "flipkart", channel: "online" },
  { category: "appliances", merchant: "croma", channel: "offline" },
  { category: "grocery", merchant: "bigbasket", channel: "online" },
  { category: "dining", merchant: "swiggy", channel: "online" },
];
for (const cat of cats) {
  const ranked = new WalletState(user).rank(cards, { ...cat, amount: 10000, label: cat.category }, offers, "typical").sort((a, b) => b.steady - a.steady);
  const top = ranked[0];
  console.log(`    ${cat.category.padEnd(13)} →  ${top.name.padEnd(18)} ${rupee(top.steady)} (${top.steadyPct.toFixed(1)}%)`);
}
console.log();
