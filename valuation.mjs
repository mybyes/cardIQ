// ₹/point valuation engine — the single most important number in the system.
// Values researched June 2026 (cardexpert, technofino, milesahead, magnify, cardmaven).
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
    partners: [
      { program: "Air India Maharaja Club", ratio: "1:1", kind: "airline", good: true },
      { program: "Singapore KrisFlyer", ratio: "1:1", kind: "airline", good: true },
      { program: "Flying Blue (AF-KLM)", ratio: "1:1", kind: "airline", good: true },
      { program: "Marriott Bonvoy", ratio: "2:1", kind: "hotel", good: false },
    ],
  },
  EDGE_MILE: {
    name: "Axis EDGE Miles",
    best: 2.0,
    typical: 1.2,
    floor: 0.2,
    paths: [
      { path: "1:2 airline transfer, well-redeemed", value: 2.0 },
      { path: "Travel Edge portal", value: 1.0 },
      { path: "inverted 2:1 partner (BA/Vietnam/Finnair — avoid)", value: 0.4 },
      { path: "vouchers / cashback", value: 0.2 },
    ],
    partners: [
      { program: "Singapore KrisFlyer", ratio: "1:2", kind: "airline", good: true },
      { program: "Air India Maharaja Club", ratio: "1:2", kind: "airline", good: true },
      { program: "British Airways Avios", ratio: "2:1", kind: "airline", good: false },
      { program: "Vietnam / Finnair", ratio: "2:1", kind: "airline", good: false },
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
