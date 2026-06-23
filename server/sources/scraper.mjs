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
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 CCAdvisorBot" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, offers: [], note: `HTTP ${res.status} (public pages often block bots — prefer official/affiliate feeds)` };
    return { ok: true, offers: parseOffersHTML(await res.text()), note: `fetched ${url}` };
  } catch (e) {
    return { ok: false, offers: [], note: String(e.message || e) };
  }
}
