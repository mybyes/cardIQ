// Indian-market card data — researched June 2026 (see SOURCES.md for citations).
// Reward `rate` = units per ₹100 spent. CASHBACK: 1 unit = ₹1. Points: see valuation.mjs.
// Values reflect 2026 devaluations (SBI Apr-2026 caps, Atlas partner cuts, Infinia 5X rollback).
// Still verify against issuer MITC before production use — these drift constantly.

export const cards = [
  {
    id: "hdfc-infinia",
    name: "HDFC Infinia",
    issuer: "HDFC",
    network: "Visa",
    annualFee: 12500,
    feeWaiverSpend: 1000000, // ₹10L
    reward: {
      currency: "HDFC_RP",
      base: 3.33, // 5 RP / ₹150
      categories: {}, // no network-category accelerators; all via SmartBuy portal
    },
    // SmartBuy: flights 5X, hotels 10X. Modeled at flights 5X. NOTE: 15,000 bonus-RP/mo
    // shared cap across SmartBuy — not strictly enforced here (known simplification).
    portal: { name: "SmartBuy", category: "travel", rate: 16.65, monthlyBonusCapUnits: 15000 },
    caps: {},
    exclusions: ["rent", "fuel", "wallet", "emi", "government", "education", "tax"],
    milestones: [{ threshold: 400000, rewardUnits: 10000, label: "quarterly ₹4L milestone" }],
    forexMarkupPct: 2.0,
    lounge: { domestic: "unlimited", international: "unlimited" },
  },
  {
    id: "axis-atlas",
    name: "Axis Atlas",
    issuer: "Axis",
    network: "Visa",
    annualFee: 5000,
    feeWaiverSpend: 0, // no spend-based fee waiver
    reward: {
      currency: "EDGE_MILE",
      base: 2.0,
      categories: { travel: 5.0 }, // direct airline/hotel + Travel Edge only
      travelDirectOnly: true, // OTAs (MMT/Goibibo/…) earn base, not the 5x accelerator
    },
    portal: { name: "Travel Edge", category: "travel", rate: 5.0, monthlyCapSpend: 200000 },
    caps: {},
    exclusions: ["rent", "fuel", "insurance", "utilities", "government", "wallet", "jewellery", "emi"],
    milestones: [
      { threshold: 300000, rewardUnits: 2500, label: "₹3L tier" },
      { threshold: 750000, rewardUnits: 2500, label: "₹7.5L tier" },
      { threshold: 1500000, rewardUnits: 5000, label: "₹15L tier" },
    ],
    forexMarkupPct: 3.5,
    lounge: { domestic: "8/yr (Silver)", international: "4/yr (Silver)" },
  },
  {
    id: "amazon-pay-icici",
    name: "Amazon Pay ICICI",
    issuer: "ICICI",
    network: "Visa",
    annualFee: 0, // lifetime free
    feeWaiverSpend: 0,
    reward: {
      currency: "CASHBACK",
      base: 1.0,
      merchants: { amazon: 5.0, swiggy: 2.0, bigbasket: 2.0, bookmyshow: 2.0 }, // amazon 5% Prime / 3% non-Prime
    },
    caps: {},
    exclusions: ["emi", "fuel", "rent", "education", "tax", "wallet"],
    forexMarkupPct: 3.5,
    milestones: [],
  },
  {
    id: "flipkart-axis",
    name: "Flipkart Axis",
    issuer: "Axis",
    network: "Mastercard",
    annualFee: 500,
    feeWaiverSpend: 350000,
    reward: {
      currency: "CASHBACK",
      base: 1.0,
      merchants: { myntra: 7.5, flipkart: 5.0, cleartrip: 5.0, swiggy: 4.0, uber: 4.0, pvr: 4.0, cultfit: 4.0 },
    },
    // ₹4,000/quarter PER MERCHANT cap on flipkart/myntra/cleartrip (modeled per-merchant).
    caps: { flipkart: 4000, myntra: 4000, cleartrip: 4000 },
    exclusions: ["utilities", "telecom", "fuel", "jewellery", "insurance", "rent", "wallet", "education", "government"],
    forexMarkupPct: 3.5,
    milestones: [],
  },
  {
    id: "sbi-cashback",
    name: "SBI Cashback",
    issuer: "SBI",
    network: "Visa",
    annualFee: 999,
    feeWaiverSpend: 200000,
    reward: {
      currency: "CASHBACK",
      base: 1.0,
      channels: { online: 5.0, offline: 1.0 },
    },
    caps: { online: 2000, offline: 2000 }, // ₹2,000 each / cycle (combined ₹4,000) — Apr 2026
    exclusions: ["fuel", "rent", "wallet", "utilities", "insurance", "education", "jewellery", "railways", "emi", "government", "gaming"],
    forexMarkupPct: 3.5,
    milestones: [],
  },
  {
    id: "amex-plat-travel",
    name: "Amex Platinum Travel",
    issuer: "Amex",
    network: "Amex",
    annualFee: 5000,
    feeWaiverSpend: 0, // value comes from milestone vouchers, not a spend-based fee waiver
    reward: {
      currency: "MR_POINT",
      base: 2.0, // 1 Membership Reward / ₹50 = ~2 MR per ₹100
      categories: {},
    },
    // Amex's edge isn't a SmartBuy-style multiplier — it's milestone vouchers + MR transfers.
    caps: {},
    exclusions: ["fuel", "rent", "wallet", "insurance", "utilities", "emi", "government", "cash"],
    milestones: [
      { threshold: 190000, rewardUnits: 15000, label: "₹1.9L — 15k bonus MR + Taj voucher" },
      { threshold: 400000, rewardUnits: 25000, label: "₹4L — 25k bonus MR + Taj stay voucher" },
    ],
    forexMarkupPct: 3.5,
    lounge: { domestic: "8/yr (Priority Pass)", international: "—" },
  },
];

export const offers = [
  {
    id: "croma-axis-appliance",
    cards: ["axis-atlas"],
    merchants: ["croma"],
    type: "instant_discount",
    pct: 10,
    capINR: 6000,
    noCostEMI: true,
    expiry: "2026-07-31",
  },
  {
    id: "flipkart-bigbillion",
    cards: ["flipkart-axis", "sbi-cashback"],
    merchants: ["flipkart"],
    type: "instant_discount",
    pct: 10,
    capINR: 1500,
    noCostEMI: true,
    expiry: "2026-07-15",
  },
];

// Domain C — private user data (regulated; faked here, or built from ingestion.mjs).
export const user = {
  cards: ["hdfc-infinia", "axis-atlas", "amazon-pay-icici", "flipkart-axis", "sbi-cashback"],
  spendToDate: {
    "axis-atlas": 290000,
    "hdfc-infinia": 380000, // close to ₹4L quarterly milestone
    "flipkart-axis": 180000,
    "sbi-cashback": 95000,
  },
  pointsBalance: { "hdfc-infinia": 12400, "axis-atlas": 8600 },
  expiring: [{ card: "hdfc-infinia", units: 2000, days: 21 }],
  ledger: [
    { date: "2026-06-02", amount: 4200, category: "grocery", merchant: "BigBasket", channel: "online", usedCard: "hdfc-infinia" },
    { date: "2026-06-05", amount: 38000, category: "travel", merchant: "MakeMyTrip", channel: "online", usedCard: "axis-atlas" },
    { date: "2026-06-09", amount: 25000, category: "electronics", merchant: "Amazon", channel: "online", usedCard: "sbi-cashback" },
    { date: "2026-06-12", amount: 1500, category: "dining", merchant: "Swiggy", channel: "online", usedCard: "hdfc-infinia" },
    { date: "2026-06-15", amount: 9000, category: "grocery", merchant: "BigBasket", channel: "online", usedCard: "axis-atlas" },
    { date: "2026-06-18", amount: 60000, category: "appliances", merchant: "Croma", channel: "offline", usedCard: "hdfc-infinia" },
    { date: "2026-06-04", amount: 649, category: "entertainment", merchant: "Netflix", channel: "online", usedCard: "hdfc-infinia" },
    { date: "2026-06-07", amount: 2500, category: "fitness", merchant: "CultFit", channel: "online", usedCard: "hdfc-infinia" },
    { date: "2026-06-10", amount: 149, category: "entertainment", merchant: "Spotify", channel: "online", usedCard: "hdfc-infinia" },
  ],
};

// ---- Data provenance (the moat): when each card's rules were last checked + the source ----
// Surfaced in the data-review console and next to card details. Confirm against issuer MITC.
export const CARDS_VERIFIED = "2026-06-15";
export const CARD_SOURCES = {
  "hdfc-infinia": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card",
  "axis-atlas": "https://www.axisbank.com/retail/cards/credit-card/axis-bank-atlas-credit-card",
  "amazon-pay-icici": "https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card",
  "flipkart-axis": "https://www.axisbank.com/retail/cards/credit-card/flipkart-axis-bank-credit-card",
  "sbi-cashback": "https://www.sbicard.com/en/personal/credit-cards/shopping/cashback-sbi-card.page",
  "amex-plat-travel": "https://www.americanexpress.com/en-in/credit-cards/platinum-travel-credit-card/",
};
