// Spend Planner — allocate a basket of planned purchases across cards to maximise
// total value, using the STATEFUL engine so milestones and caps accrue across the
// whole plan (greedy: each item routed to the best card given the running state).
import { WalletState } from "./state.mjs";
import { valuePerUnit } from "./valuation.mjs";

export function planAllocation(items, cards, user, offers, mode = "typical") {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const state = new WalletState(user);

  // Big-ticket first: lets large purchases capture milestone crossings deliberately.
  const ordered = [...items].map((it, i) => ({ ...it, _i: i })).sort((a, b) => b.amount - a.amount);

  const allocations = [];
  let totalValue = 0;
  for (const it of ordered) {
    const txn = {
      amount: it.amount,
      category: it.category,
      merchant: it.merchant,
      channel: it.channel || "online",
      viaPortal: it.viaPortal,
      isInternational: it.isInternational,
      label: it.label || it.category,
    };
    const ranked = state.rank(cards, txn, offers, mode);
    const best = ranked[0];
    const second = ranked[1];
    state.commit(byId[best.cardId], txn, offers, mode);
    totalValue += best.value;
    allocations.push({
      item: it,
      txn,
      card: best.name,
      cardId: best.cardId,
      value: best.value,
      pct: best.pct,
      milestoneINR: best.milestoneINR,
      reason: best.breakdown[0],
      deltaOverSecond: second ? best.value - second.value : 0,
    });
  }
  allocations.sort((a, b) => a.item._i - b.item._i); // restore entry order for display

  // Per-card rollup + milestones unlocked + fees waived
  const perCard = {};
  const milestones = [];
  const fees = [];
  const nudges = [];
  for (const id of user.cards) {
    const c = byId[id];
    const init = user.spendToDate?.[id] ?? 0;
    const final = state.spent[id] ?? init;
    const planned = final - init;
    if (planned > 0) perCard[c.name] = (perCard[c.name] ?? 0) + planned;

    for (const ms of c.milestones ?? []) {
      if (init < ms.threshold && final >= ms.threshold)
        milestones.push({ card: c.name, label: ms.label, valueINR: ms.rewardUnits * valuePerUnit(c.reward.currency, mode) });
    }
    if (c.feeWaiverSpend > 0 && init < c.feeWaiverSpend && final >= c.feeWaiverSpend)
      fees.push({ card: c.name, fee: c.annualFee });

    const nextMs = (c.milestones ?? []).find((m) => final < m.threshold);
    if (nextMs && nextMs.threshold - final <= 50000)
      nudges.push({ card: c.name, gap: nextMs.threshold - final, label: nextMs.label, reward: nextMs.rewardUnits });
    if (c.feeWaiverSpend > 0 && final < c.feeWaiverSpend && c.feeWaiverSpend - final <= 50000)
      nudges.push({ card: c.name, gap: c.feeWaiverSpend - final, label: `fee waiver (₹${c.annualFee})`, reward: 0 });
  }

  return { allocations, totalValue, perCard, milestones, fees, nudges };
}
