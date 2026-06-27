// ₹/point valuation engine — the single most important number in the system.
// Transfer-partner ratios verified against issuer + airline primary sources, June 2026
// (axis.bank.in/miles-transfer, americanexpress.com/en-in, Air India per-bank pages),
// cross-checked vs pointsmath/milesahead/magnify. India ratios change often — re-verify.
export const DATA_VERIFIED = "June 2026";
// Three modes:
//   best     = engaged optimizer, ideal redemption (e.g. 1:2 airline transfer)
//   typical  = realistic engaged user (portal travel / modest transfer)  [DEFAULT]
//   floor    = casual user who redeems to cashback/vouchers

export const currencies = {
  CASHBACK: {
    name: "Cashback",
    best: 1.0,
    typical: 1.0,
    floor: 1.0,
    paths: [{ path: "statement credit / Amazon Pay balance", value: 1.0 }],
  },
  HDFC_RP: {
    name: "HDFC Reward Points",
    best: 1.0,
    typical: 1.0,
    floor: 0.3,
    paths: [
      { path: "SmartBuy flights & hotels (70:30)", value: 1.0 },
      { path: "1:1 airline transfer (KrisFlyer/Flying Blue)", value: 1.0 },
      { path: "Gyftr vouchers (net of fee)", value: 0.9 },
      { path: "cashback / statement credit", value: 0.3 },
      { path: "product catalog", value: 0.25 },
    ],
    // Ratios kept in sync with the canonical route directory (web/transfers.mjs).
    partners: [
      { program: "Air India Maharaja Club", ratio: "1:1", kind: "airline", good: true },
      { program: "Singapore KrisFlyer", ratio: "1:1", kind: "airline", good: true },
      { program: "Flying Blue (AF-KLM)", ratio: "1:1", kind: "airline", good: true },
      { program: "Etihad Guest", ratio: "1:1", kind: "airline", good: true },
      { program: "Qatar Privilege Club (Avios)", ratio: "1:1", kind: "airline", good: true },
      { program: "ITC (Club Itc)", ratio: "1:1", kind: "hotel", good: true },
      { program: "Marriott Bonvoy", ratio: "2:1", kind: "hotel", good: false },
      { program: "Accor Live Limitless", ratio: "2:1", kind: "hotel", good: false },
    ],
  },
  EDGE_MILE: {
    name: "Axis EDGE Miles",
    // Post-devaluation most partners transfer 2:1 (2 EDGE = 1 mile), so a mile worth ~₹1
    // makes an EDGE Mile worth ~₹0.5–1.0 — not ₹2. Corrected to match transfers.mjs.
    best: 1.0,
    typical: 0.6,
    floor: 0.2,
    paths: [
      { path: "2:1 airline transfer, well-redeemed (KrisFlyer/Air India)", value: 1.0 },
      { path: "Travel Edge portal", value: 0.6 },
      { path: "5:1 hotel transfer (Accor — avoid)", value: 0.2 },
      { path: "vouchers / cashback", value: 0.2 },
    ],
    partners: [
      { program: "Singapore KrisFlyer", ratio: "2:1", kind: "airline", good: true },
      { program: "Air India Maharaja Club", ratio: "2:1", kind: "airline", good: true },
      { program: "Qatar Privilege Club (Avios)", ratio: "2:1", kind: "airline", good: true },
      { program: "Etihad Guest", ratio: "2:1", kind: "airline", good: true },
      { program: "Turkish Miles&Smiles", ratio: "2:1", kind: "airline", good: true },
      { program: "Accor Live Limitless", ratio: "5:1", kind: "hotel", good: false },
    ],
  },
  MR_POINT: {
    name: "Amex Membership Rewards",
    best: 1.0,
    typical: 0.6,
    floor: 0.25,
    paths: [
      { path: "1:1 Marriott Bonvoy / hotel sweet spot", value: 1.0 },
      { path: "Taj / Gold Collection redemptions", value: 0.7 },
      { path: "select airline transfer (2:1)", value: 0.6 },
      { path: "Pay with Points / vouchers", value: 0.25 },
    ],
    partners: [
      { program: "Marriott Bonvoy", ratio: "1:1", kind: "hotel", good: true },
      { program: "Taj InnerCircle", ratio: "1:1", kind: "hotel", good: true },
      { program: "Singapore KrisFlyer", ratio: "2:1", kind: "airline", good: false },
      { program: "Air India Maharaja Club", ratio: "2:1", kind: "airline", good: false },
    ],
  },
};

// Redemption paths for a currency, ranked best → worst, with ₹ value for a balance.
export function redemptionPlan(currency, balance) {
  const c = currencies[currency];
  if (!c) return null;
  const paths = c.paths.map((p) => ({ ...p, inr: Math.round(balance * p.value) })).sort((a, b) => b.value - a.value);
  return { name: c.name, balance, paths, best: paths[0], worst: paths[paths.length - 1], partners: c.partners ?? [] };
}

export function valuePerUnit(currency, mode = "typical") {
  const c = currencies[currency];
  if (!c) return 1.0;
  return c[mode] ?? c.typical;
}

export function bestPath(currency) {
  const c = currencies[currency];
  if (!c) return null;
  return c.paths.reduce((a, b) => (b.value > a.value ? b : a));
}

export function valuationReport() {
  const r = (n) => "₹" + n.toFixed(2);
  const lines = ["  ₹/point valuation (best / typical / floor):"];
  for (const [code, c] of Object.entries(currencies)) {
    lines.push(`    ${c.name.padEnd(22)} ${r(c.best)} / ${r(c.typical)} / ${r(c.floor)}   best via: ${bestPath(code).path}`);
  }
  return lines.join("\n");
}
