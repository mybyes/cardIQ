// Stateful wallet — fixes the milestone double-counting + cap-accumulation bugs.
// Tracks, per card: cumulative spend, monthly cap consumption, and which milestone
// tiers have already been consumed. A milestone is credited exactly ONCE — to the
// transaction that actually crosses it.

import { evaluate } from "./engine.mjs";

export class WalletState {
  constructor(user) {
    this.user = user;
    this.spent = { ...(user.spendToDate ?? {}) };
    this.capUsed = {}; // cardId -> { key: INR }
    this.consumed = {}; // cardId -> Set<threshold>
  }

  ctxFor(card) {
    return {
      spent: this.spent[card.id] ?? 0,
      capUsed: this.capUsed[card.id] ?? {},
      consumed: this.consumed[card.id] ?? new Set(),
    };
  }

  // Prospective evaluation — does NOT mutate state.
  quote(card, txn, offers, mode) {
    return evaluate(card, txn, this.ctxFor(card), offers, mode);
  }

  // Rank all held cards for a prospective transaction.
  rank(cards, txn, offers, mode) {
    return cards
      .filter((c) => this.user.cards.includes(c.id))
      .map((c) => this.quote(c, txn, offers, mode))
      .sort((a, b) => b.value - a.value);
  }

  // Commit a real spend on a specific card — advances spend, caps, milestones.
  commit(card, txn, offers, mode) {
    const r = this.quote(card, txn, offers, mode);
    this.spent[card.id] = (this.spent[card.id] ?? 0) + txn.amount;
    if (r.capKey) {
      const cu = (this.capUsed[card.id] ??= {});
      cu[r.capKey] = (cu[r.capKey] ?? 0) + r.capConsumeINR;
    }
    if (r.crossed?.length) {
      const s = (this.consumed[card.id] ??= new Set());
      for (const t of r.crossed) s.add(t);
    }
    return r;
  }
}
