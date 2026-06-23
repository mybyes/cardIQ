// node run.mjs  — 6 day-to-day scenarios, ranked with the stateful engine.
import { cards, offers as rawOffers, user } from "./data.mjs";
import { resolveOffers } from "./offers.mjs";
const offers = resolveOffers(rawOffers).offers; // align CLI with offer-lifecycle (expiry+dedupe+conflict)
import { WalletState } from "./state.mjs";
import { render } from "./engine.mjs";
import { valuationReport } from "./valuation.mjs";

const scenarios = [
  { label: "APPLIANCE — AC", amount: 60000, category: "appliances", merchant: "Croma", channel: "offline" },
  { label: "ELECTRONICS — laptop", amount: 80000, category: "electronics", merchant: "Flipkart", channel: "online" },
  { label: "TRAVEL — flight via portal", amount: 45000, category: "travel", merchant: "SmartBuy", channel: "online", viaPortal: true },
  { label: "GROCERY — weekly", amount: 3000, category: "grocery", merchant: "BigBasket", channel: "online" },
  { label: "TRAVEL — intl hotel", amount: 50000, category: "travel", channel: "online", isInternational: true },
];

console.log("\n  CC ADVISOR — effective-value engine (researched 2026 data)\n");
console.log(valuationReport());
console.log("\n  HDFC YTD ₹3.8L (near ₹4L milestone) · Axis YTD ₹2.9L (near ₹3L tier)");

for (const txn of scenarios) {
  const state = new WalletState(user); // fresh prospective evaluation each time
  console.log(render(txn, state.rank(cards, txn, offers, "typical")));
  console.log();
}
