// node coach.mjs — post-purchase coaching with CORRECT stateful accounting.
// Two parallel ledgers advance in date order: what you actually did vs the optimal
// path. Milestones are counted once in each track, so regret no longer double-counts.
import { cards, offers as rawOffers, user } from "./data.mjs";
import { resolveOffers } from "./offers.mjs";
const offers = resolveOffers(rawOffers).offers; // align CLI with offer-lifecycle (expiry+dedupe+conflict)
import { WalletState } from "./state.mjs";
import { rupee } from "./engine.mjs";

const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const mode = "typical";

const actual = new WalletState(user);
const optimal = new WalletState(user);

console.log("\n═══════════ POST-PURCHASE COACHING ═══════════\n");
console.log(`  Reviewing ${user.ledger.length} transactions in date order (mode: ${mode})…\n`);

let totalRegret = 0;
const regretByCategory = {};
const ledger = [...user.ledger].sort((a, b) => a.date.localeCompare(b.date));

for (const t of ledger) {
  const best = optimal.rank(cards, t, offers, mode)[0];
  const usedRes = actual.quote(byId[t.usedCard], t, offers, mode);

  // advance both worlds
  optimal.commit(byId[best.cardId], t, offers, mode);
  actual.commit(byId[t.usedCard], t, offers, mode);

  const regret = best.value - usedRes.value;
  if (best.cardId === t.usedCard || regret <= 0.5) {
    console.log(`  ✓ ${t.date}  ${rupee(t.amount)} ${t.category} @ ${t.merchant} — used ${usedRes.name} (optimal)`);
  } else {
    totalRegret += regret;
    regretByCategory[t.category] = (regretByCategory[t.category] ?? 0) + regret;
    console.log(`  ✗ ${t.date}  ${rupee(t.amount)} ${t.category} @ ${t.merchant}`);
    console.log(`      used ${usedRes.name} (${rupee(usedRes.value)}) — ${best.name} better by ${rupee(regret)}`);
    console.log(`      → ${best.breakdown[0]}${best.milestoneINR > 0 ? "  (+⭐ milestone)" : ""}`);
  }
}

console.log(`\n  ──────────────────────────────────────────`);
console.log(`  Money left on the table: ${rupee(totalRegret)}`);

if (Object.keys(regretByCategory).length) {
  console.log(`\n  Fix your defaults (biggest leaks first):`);
  for (const [cat, amt] of Object.entries(regretByCategory).sort((a, b) => b[1] - a[1])) {
    // steady-state best for the category (milestone excluded → fresh state, base merchant)
    const probe = { category: cat, amount: 10000, channel: "online", label: cat };
    const top = new WalletState(user).rank(cards, probe, offers, mode).sort((a, b) => b.steady - a.steady)[0];
    console.log(`    • ${cat.padEnd(12)} → ${top.name}  (lost ${rupee(amt)})`);
  }
}

console.log(`\n  ──────────────────────────────────────────`);
console.log(`  Milestone nudges:`);
let any = false;
for (const id of user.cards) {
  const c = byId[id];
  const spent = user.spendToDate?.[id] ?? 0;
  const next = (c.milestones ?? []).find((m) => spent < m.threshold);
  if (next) {
    any = true;
    console.log(`    • ${c.name}: spend ${rupee(next.threshold - spent)} more → ${next.label} (+${next.rewardUnits} pts)`);
  }
}
if (!any) console.log(`    (none active)`);
console.log();
