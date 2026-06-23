// Insights for the Home overview — aggregates spend, rewards, and prioritised
// action items from the user's data. All derived from the same engine, no new rules.
import { WalletState } from "./state.mjs";
import { rupee } from "./engine.mjs";

export function spendSummary(ledger) {
  let total = 0;
  const byCat = {};
  for (const t of ledger ?? []) {
    if (t.amount > 0) {
      total += t.amount;
      byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
    }
  }
  return { total, byCat };
}

// What you earned vs what you could have, over the recent ledger.
export function rewardsSummary(user, cards, offers, ledger, mode = "typical") {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const actual = new WalletState(user);
  const optimal = new WalletState(user);
  let earned = 0, potential = 0;
  for (const t of [...(ledger ?? [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""))) {
    if (!byId[t.usedCard] || !user.cards.includes(t.usedCard)) continue;
    const best = optimal.rank(cards, t, offers, mode)[0];
    const used = actual.quote(byId[t.usedCard], t, offers, mode);
    optimal.commit(byId[best.cardId], t, offers, mode);
    actual.commit(byId[t.usedCard], t, offers, mode);
    earned += used.value;
    potential += best.value;
  }
  return { earned, potential, leftOnTable: Math.max(0, potential - earned) };
}

const daysUntil = (s, now) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : Math.round((d - now) / 86400000);
};

// Prioritised action items (sev 2 = urgent, 1 = worth doing). Each links to a tab.
export function actionItems(user, cards, offers, ledger, now = new Date(), mode = "typical") {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const items = [];

  for (const e of user.expiring ?? []) {
    if (!user.cards.includes(e.card)) continue;
    items.push({ sev: e.days <= 14 ? 2 : 1, icon: "⏳", text: `${e.units.toLocaleString("en-IN")} ${byId[e.card].name} points expire in ${e.days} days`, tab: "wallet" });
  }

  for (const id of user.cards) {
    const c = byId[id];
    const spent = user.spendToDate?.[id] ?? 0;
    const ms = (c.milestones ?? []).find((m) => spent < m.threshold);
    if (ms && ms.threshold - spent <= 50000) items.push({ sev: 1, icon: "⭐", text: `Spend ${rupee(ms.threshold - spent)} more on ${c.name} → ${ms.label} (+${ms.rewardUnits} pts)`, tab: "plan" });
    if (c.feeWaiverSpend > 0 && spent < c.feeWaiverSpend && c.feeWaiverSpend - spent <= 50000)
      items.push({ sev: 1, icon: "💳", text: `Spend ${rupee(c.feeWaiverSpend - spent)} more on ${c.name} → waive ₹${c.annualFee.toLocaleString("en-IN")} fee`, tab: "plan" });
  }

  for (const o of offers) {
    if (!o.expiry) continue;
    const d = daysUntil(o.expiry, now);
    if (d == null || d < 0 || d > 14) continue;
    const held = (o.cards ?? []).find((cid) => user.cards.includes(cid));
    if (held) items.push({ sev: d <= 7 ? 2 : 1, icon: "🏷", text: `Offer expiring in ${d}d: ${o.pct}% on ${(o.merchants ?? []).join("/")} (${byId[held].name})`, tab: "recommend" });
  }

  const rs = rewardsSummary(user, cards, offers, ledger, mode);
  if (rs.leftOnTable > 50) items.push({ sev: rs.leftOnTable > 1000 ? 2 : 1, icon: "📉", text: `You left ${rupee(rs.leftOnTable)} on the table across recent spends`, tab: "coach" });

  return items.sort((a, b) => b.sev - a.sev);
}
