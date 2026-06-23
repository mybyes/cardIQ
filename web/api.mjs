// Thin client for the data-platform API. Degrades gracefully when the server is down
// (the app still works fully off bundled data + localStorage).
// - Local split-server dev (static on :4321, API on :4322) → talk to :4322.
// - Served by the Node server itself (Railway, or local :4322) → same-origin "/api".
const API = location.port === "4321" ? "http://localhost:4322" : "";
export const API_URL = API || location.origin;

async function call(path, opts) {
  const r = await fetch(API + path, opts);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export async function health() {
  try { return await call("/api/health"); } catch { return null; }
}
export const getCards = () => call("/api/cards");
export const getOffers = () => call("/api/offers"); // server returns expiry+dedupe-resolved offers
export const getSources = () => call("/api/sources");
export const runScraper = () => call("/api/sources/scraper/run", { method: "POST" });
export const ingestSMS = (text) =>
  call("/api/ingest/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
