// Real data ingestion (domain C) — turn raw transaction sources into a ledger.
// Two working parsers: Indian bank transaction SMS, and CSV statement export.
// This is the most accessible, lowest-friction real source (RBI mandates txn SMS).
//
// NOT a regulated rail — for live, consented data use Account Aggregator (stubbed
// at the bottom). But SMS/CSV parsing genuinely works today and needs no licensing.

// ---- merchant → category mapping (extend freely; this is curation, not code) ----
export const MERCHANT_CATEGORY = {
  bigbasket: "grocery", blinkit: "grocery", zepto: "grocery", dmart: "grocery", jiomart: "grocery",
  swiggy: "dining", zomato: "dining", dominos: "dining", mcdonald: "dining",
  amazon: "electronics", flipkart: "electronics", croma: "appliances", reliancedigital: "appliances", vijaysales: "appliances",
  makemytrip: "travel", mmt: "travel", goibibo: "travel", yatra: "travel", easemytrip: "travel", cleartrip: "travel", ixigo: "travel", indigo: "travel", airindia: "travel", vistara: "travel",
  smartbuy: "travel", traveledge: "travel",
  myntra: "shopping", ajio: "shopping", uber: "transport", ola: "transport",
  bookmyshow: "entertainment", pvr: "entertainment", cultfit: "fitness",
};

const ISSUER_HINTS = {
  hdfc: "hdfc-infinia",
  icici: "amazon-pay-icici",
  sbi: "sbi-cashback",
  axis: "axis-atlas", // ambiguous if user holds 2 Axis cards — resolve by last4 (see note)
  flipkart: "flipkart-axis",
};

// Normalise mixed Indian date formats → ISO YYYY-MM-DD so the ledger sorts correctly.
// Handles 02-06-26, 02/06/2026, 05-Jun-26, and passes through ISO. Assumes DD-MM (Indian).
const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
export function normalizeDate(s) {
  if (!s) return s;
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m;
  if ((m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{2,4})$/))) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${mo}-${m[1].padStart(2, "0")}`;
  }
  if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)))
    return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export function categorize(merchant) {
  if (!merchant) return "other";
  const key = merchant.toLowerCase().replace(/[^a-z]/g, "");
  for (const [m, cat] of Object.entries(MERCHANT_CATEGORY)) if (key.includes(m)) return cat;
  return "other";
}

// Parse one or many transaction SMS lines into ledger entries.
// Handles the common Indian formats, e.g.:
//   "Rs.4200.00 spent on HDFC Bank Card x1234 at BIGBASKET on 02-06-26"
//   "INR 1,500.00 spent on Axis Bank Credit Card no. XX1234 at SWIGGY"
//   "Spent Rs 38000 on ICICI Bank Card XX5678 at MAKEMYTRIP on 05-Jun-26"
//   "Your SBI Credit Card ending 4321 used for Rs.25000 at AMAZON"
export function parseSMS(text) {
  const out = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;

    const amtMatch = line.match(/(?:rs|inr)\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const merchMatch = line.match(/\bat\s+([A-Za-z0-9&._ -]+?)(?:\s+on\b|\.|$)/i);
    const issuerMatch = line.match(/\b(hdfc|icici|sbi|axis|flipkart)\b/i);
    const last4Match = line.match(/(?:x{1,2}|ending|no\.?\s*x{0,2})\s*(\d{4})/i);
    const dateMatch = line.match(/\bon\s+(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4})/i);

    if (!amtMatch) continue;
    const amount = Number(amtMatch[1].replace(/,/g, ""));
    const merchant = merchMatch ? merchMatch[1].trim() : undefined;
    const issuer = issuerMatch ? issuerMatch[1].toLowerCase() : undefined;

    out.push({
      amount,
      merchant,
      category: categorize(merchant),
      channel: "online", // SMS rarely says; default online (overridable)
      date: dateMatch ? normalizeDate(dateMatch[1]) : undefined,
      cardHint: { issuer, last4: last4Match ? last4Match[1] : undefined },
      usedCard: issuer ? ISSUER_HINTS[issuer] : undefined,
    });
  }
  return out;
}

// Parse a CSV statement export. Expected header (flexible order):
//   date,amount,merchant,category,channel,card
export function parseCSV(text) {
  const rows = text.trim().split(/\n+/);
  const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  return rows.slice(1).map((r) => {
    const c = r.split(",").map((x) => x.trim());
    const merchant = c[idx("merchant")];
    return {
      date: normalizeDate(c[idx("date")]),
      amount: Number(c[idx("amount")]?.replace(/[₹,]/g, "")),
      merchant,
      category: idx("category") >= 0 && c[idx("category")] ? c[idx("category")] : categorize(merchant),
      channel: idx("channel") >= 0 && c[idx("channel")] ? c[idx("channel")] : "online",
      usedCard: idx("card") >= 0 ? c[idx("card")] : undefined,
    };
  });
}

// Parse a bank statement / alert EMAIL (the free "forward your statements" path).
// Strips HTML, puts each amount on its own line, then reuses the SMS extractor.
// No Gmail OAuth / restricted-scope audit — user forwards or pastes the email.
export function parseEmail(raw) {
  const text = String(raw || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(rs\.?|inr)/gi, "\n$1"); // one transaction per line for parseSMS
  return parseSMS(text);
}

// ---- Account Aggregator adapter (stub) — the regulated, licensed rail ----
// Real impl: register as an FIU, obtain user consent via an AA app, pull FI data.
export async function fetchViaAccountAggregator(/* consentHandle */) {
  throw new Error("AA integration requires FIU registration + Sahamati onboarding — not available in prototype.");
}
