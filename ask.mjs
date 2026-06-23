// node ask.mjs <amount> <category> [merchant] [--online|--offline] [--portal] [--intl] [--mode=best|typical|floor]
import { cards, offers as rawOffers, user } from "./data.mjs";
import { resolveOffers } from "./offers.mjs";
const offers = resolveOffers(rawOffers).offers; // align CLI with offer-lifecycle (expiry+dedupe+conflict)
import { WalletState } from "./state.mjs";
import { render } from "./engine.mjs";

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const pos = argv.filter((a) => !a.startsWith("--"));

if (pos.length < 2) {
  console.log(`\nUsage: node ask.mjs <amount> <category> [merchant] [--online|--offline] [--portal] [--intl] [--mode=best|typical|floor]`);
  console.log(`Categories: appliances electronics travel grocery dining\n`);
  process.exit(0);
}

const modeFlag = flags.find((f) => f.startsWith("--mode="));
const mode = modeFlag ? modeFlag.split("=")[1] : "typical";
const txn = {
  label: "Your transaction",
  amount: Number(pos[0]),
  category: pos[1],
  merchant: pos[2],
  channel: flags.includes("--offline") ? "offline" : "online",
  viaPortal: flags.includes("--portal"),
  isInternational: flags.includes("--intl"),
};

const state = new WalletState(user);
console.log(`\n  (valuation mode: ${mode})`);
console.log(render(txn, state.rank(cards, txn, offers, mode)));
console.log();
