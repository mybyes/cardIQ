// Seed the platform DB from the bundled researched data on first run.
import { getDB, tx } from "./db.mjs";
import { cards, offers, user } from "../data.mjs";

export function seedIfEmpty() {
  const db = getDB();
  tx((d) => {
    if (d.cards.length === 0) d.cards = structuredClone(cards);
    if (d.offers.length === 0) d.offers = structuredClone(offers).map((o) => ({ ...o, source: "seed" }));
    if (!d.users.demo) {
      d.users.demo = {
        id: "demo",
        selectedCards: [...user.cards],
        spendToDate: { ...user.spendToDate },
        pointsBalance: { ...user.pointsBalance },
        expiring: user.expiring ?? [],
      };
      d.transactions = (d.transactions ?? []).concat(user.ledger.map((t) => ({ ...t, userId: "demo", source: "seed" })));
    }
  });
}
