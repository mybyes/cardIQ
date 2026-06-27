// Public-data scraper (domains A & B only — NEVER user credentials).
// Mechanism: fetch a public offers page → parse → normalise into our offer schema.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Normalise a public offers page into our offer objects. Real pages need
// per-source parsers; this reads a stable data-attribute table.
export function parseOffersHTML(html) {
  const offers = [];
  const re = /data-card="([^"]+)"\s+data-merchant="([^"]+)"\s+data-pct="([^"]+)"\s+data-cap="([^"]+)"(?:\s+data-emi="([^"]+)")?(?:\s+data-expiry="([^"]+)")?/g;
  let m;
  while ((m = re.exec(html))) {
    offers.push({
      id: `${m[2]}-${m[1]}-scraped`,
      cards: [m[1]],
      merchants: [m[2].toLowerCase()],
      type: "instant_discount",
      pct: Number(m[3]),
      capINR: Number(m[4]),
      noCostEMI: m[5] === "1",
      expiry: m[6] || undefined,
      source: "scraper",
    });
  }
  return offers;
}

// Deterministic demo against a bundled fixture (proves the parser end-to-end).
export function scrapeFixture() {
  const f = join(__dir, "../fixtures/offers.html");
  if (!existsSync(f)) return { ok: false, offers: [], note: "fixture missing" };
  return { ok: true, offers: parseOffersHTML(readFileSync(f, "utf8")), note: "parsed bundled fixture" };
}

// Best-effort live fetch. Bank/merchant pages frequently 403 bots — handled gracefully.
export async function scrapeLive(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 CardIQBot" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, offers: [], note: `HTTP ${res.status} (public pages often block bots — prefer official/affiliate feeds)` };
    return { ok: true, offers: parseOffersHTML(await res.text()), note: `fetched ${url}` };
  } catch (e) {
    return { ok: false, offers: [], note: String(e.message || e) };
  }
}

// ---------------------------------------------------------------------------
// Direct-from-source framework (NO aggregators) — fetch issuers'/airlines'/OTAs'
// own PUBLIC pages. Public data only. NEVER login-gated/credentialed data, never
// bypass bot-detection. Each source declares a parser; guardrails below apply.
//
// Production realities (be honest): many of these pages block server bots
// (Cloudflare/JS) and need a headless browser + proxies. Treat live fetches as
// best-effort; fixtures keep the pipeline testable without hammering anyone.
// ---------------------------------------------------------------------------

const UA = "CardIQBot/1.0 (+https://cardiq.app/bot; data@cardiq.app)"; // identified, honest
const RATE_MS = 4000; // min gap between hits to the same host — be a good citizen
const _lastHit = new Map();

// robots.txt gate — fail closed (skip) if disallowed or unreadable.
async function robotsAllows(url) {
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return true; // no robots → allowed
    const txt = await res.text();
    // crude: honour a global "Disallow: /" or a path match under "User-agent: *"
    const blocked = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(txt);
    return !blocked;
  } catch { return false; } // unreadable → fail closed
}

async function rateLimit(host) {
  const last = _lastHit.get(host) || 0;
  const wait = RATE_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  _lastHit.set(host, Date.now());
}

// Registry of PUBLIC, no-API sources worth fetching directly. parse(html) → records.
// `kind` routes records into the right canonical store (offers/cards/routes).
export const DIRECT_SOURCES = {
  // examples — wire real parsers per page; start from a saved fixture, then go live.
  "hdfc-smartbuy-offers": { name: "HDFC SmartBuy offers", url: "https://offers.smartbuy.hdfcbank.com/", kind: "offers", parse: parseOffersHTML },
  "amex-offers": { name: "Amex Offers (India)", url: "https://www.americanexpress.com/en-in/benefits/amex-offers/", kind: "offers", parse: parseOffersHTML },
  // award charts / transfer pages would add { kind: "routes", parse: parseAwardChart } etc.
};

// Fetch one direct source, respecting robots + rate-limit. Returns provenance-stamped records.
export async function fetchDirect(id, { live = false } = {}) {
  const s = DIRECT_SOURCES[id];
  if (!s) return { ok: false, records: [], note: `unknown direct source '${id}'` };
  if (!live) {
    // safe default: prove the parser against the bundled fixture, don't hit the live site
    const fx = scrapeFixture();
    return { ok: fx.ok, records: fx.offers, note: `fixture (set live:true to fetch ${s.url})`, source: `direct:${id}` };
  }
  if (!(await robotsAllows(s.url))) return { ok: false, records: [], note: `blocked by robots.txt: ${s.url}` };
  await rateLimit(new URL(s.url).host);
  try {
    const res = await fetch(s.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, records: [], note: `HTTP ${res.status} — likely bot-blocked; needs headless+proxy for ${s.name}` };
    const stamp = new Date().toISOString();
    const records = s.parse(await res.text()).map((r) => ({ ...r, source: `direct:${id}`, fetchedAt: stamp, confidence: "scraped" }));
    return { ok: true, records, kind: s.kind, note: `fetched ${s.url}` };
  } catch (e) {
    return { ok: false, records: [], note: String(e.message || e) };
  }
}
