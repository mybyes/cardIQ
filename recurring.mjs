// Recurring / subscription detection + optimisation.
// Subscriptions are "set and forget" — on the wrong card they leak every month,
// compounded. We flag them and recommend the best card for each recurring charge.
import { WalletState } from "./state.mjs";

const norm = (m) => (m || "").toLowerCase().replace(/[^a-z]/g, "");

// Known subscription merchants — flagged even from a single charge.
const SUBS = ["netflix", "spotify", "hotstar", "primevideo", "amazonprime", "youtube", "disney", "sonyliv", "zee5", "audible", "cultfit", "gym", "googleone", "icloud", "adobe", "linkedin", "jio", "airtel"];

// Group the ledger by merchant; flag known subscriptions or merchants seen 2+ times.
export function detectRecurring(ledger) {
  const groups = new Map();
  for (const t of ledger ?? []) {
    if (!(t.amount > 0)) continue;
    const key = norm(t.merchant);
    if (!key) continue;
    const g = groups.get(key) ?? { merchant: t.merchant, category: t.category, channel: t.channel || "online", amounts: [], usedCard: t.usedCard, count: 0 };
    g.amounts.push(t.amount);
    g.count++;
    groups.set(key, g);
  }
  const out = [];
  for (const [key, g] of groups) {
    const knownSub = SUBS.some((s) => key.includes(norm(s)));
    if (!knownSub && g.count < 2) continue;
    const typical = Math.round(g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length);
    out.push({ merchant: g.merchant, category: g.category, channel: g.channel, monthlyAmount: typical, annual: typical * 12, count: g.count, usedCard: g.usedCard, reason: knownSub ? "subscription" : "repeated charge" });
  }
  return out.sort((a, b) => b.annual - a.annual);
}

// For each recurring charge, find the best card and the annual saving vs the card used.
export function optimizeRecurring(items, user, cards, offers, mode = "typical") {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  return items
    .map((it) => {
      const txn = { category: it.category, merchant: it.merchant, channel: it.channel, amount: it.monthlyAmount, label: "sub" };
      const best = new WalletState(user).rank(cards, txn, offers, mode)[0];
      const usedCard = it.usedCard && user.cards.includes(it.usedCard) ? byId[it.usedCard] : null;
      const usedVal = usedCard ? new WalletState(user).quote(usedCard, txn, offers, mode).steady : 0;
      const hasUsed = usedCard != null;
      return {
        ...it,
        bestCard: best.name,
        bestCardId: best.cardId,
        usedCardName: usedCard ? usedCard.name : it.usedCard || "—",
        hasUsed,
        optimal: hasUsed && best.cardId === it.usedCard,
        annualSaving: hasUsed ? Math.max(0, (best.steady - usedVal) * 12) : 0,
      };
    })
    .sort((a, b) => b.annualSaving - a.annualSaving);
}
