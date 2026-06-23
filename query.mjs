// Free-text search → transaction. Lets users type naturally:
//   "55k AC at croma offline"      "flight 45000 via smartbuy"
//   "1.5 lakh laptop on flipkart"  "₹3000 groceries bigbasket"
//   "hotel 50000 abroad"
import { MERCHANT_CATEGORY, categorize } from "./ingestion.mjs";

const KEYWORD_CATEGORY = {
  "air conditioner": "appliances", ac: "appliances", fridge: "appliances", refrigerator: "appliances",
  "washing machine": "appliances", tv: "appliances", television: "appliances", microwave: "appliances", appliance: "appliances",
  laptop: "electronics", phone: "electronics", mobile: "electronics", iphone: "electronics", headphone: "electronics",
  earbuds: "electronics", camera: "electronics", tablet: "electronics", ipad: "electronics", console: "electronics", gadget: "electronics",
  flight: "travel", flights: "travel", hotel: "travel", trip: "travel", airfare: "travel", vacation: "travel", holiday: "travel", travel: "travel",
  grocery: "grocery", groceries: "grocery", vegetables: "grocery",
  food: "dining", dinner: "dining", lunch: "dining", restaurant: "dining", meal: "dining", dining: "dining",
  petrol: "fuel", diesel: "fuel", fuel: "fuel",
  clothes: "shopping", fashion: "shopping", apparel: "shopping", shoes: "shopping", shopping: "shopping",
  movie: "entertainment", cab: "transport", ride: "transport",
};

const MERCHANTS = Object.keys(MERCHANT_CATEGORY);

function parseAmount(t) {
  // ₹1.5 lakh / 55k / 55,000 / 2cr
  const m = t.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*\.?\d*)\s*(k|lakh|lac|lacs|l|cr|crore)?\b/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") n *= 1e3;
  else if (["lakh", "lac", "lacs", "l"].includes(unit)) n *= 1e5;
  else if (["cr", "crore"].includes(unit)) n *= 1e7;
  return Math.round(n);
}

export function parseQuery(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;

  const amount = parseAmount(t);

  // merchant: first known merchant token appearing in the text
  let merchant;
  for (const m of MERCHANTS) if (t.replace(/[^a-z]/g, "").includes(m)) { merchant = m; break; }

  // category: explicit keyword wins, else infer from merchant
  let category;
  for (const [kw, cat] of Object.entries(KEYWORD_CATEGORY)) if (t.includes(kw)) { category = cat; break; }
  if (!category) category = merchant ? categorize(merchant) : "other";

  const channel = /\boffline\b|in[- ]?store|\bstore\b|\bpos\b|\bshop\b/.test(t) ? "offline" : "online";
  const viaPortal = /smartbuy|travel ?edge|\bportal\b/.test(t);
  const isInternational = /\binternational\b|\bintl\b|abroad|overseas|foreign|forex/.test(t);

  return {
    amount: amount ?? 0,
    category,
    merchant: merchant ? merchant[0].toUpperCase() + merchant.slice(1) : undefined,
    channel,
    viaPortal,
    isInternational,
    label: "search",
    raw: text,
    confident: amount != null,
  };
}
