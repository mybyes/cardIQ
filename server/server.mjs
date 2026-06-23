// CC Advisor data-platform API (zero-dependency node:http).
// Data in the DB, engine on the server → thin clients. Run: node server/server.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDB, tx } from "./db.mjs";
import { seedIfEmpty } from "./seed.mjs";
import { SOURCES, runSource } from "./sources/index.mjs";
import { WalletState } from "../state.mjs";
import { planAllocation } from "../planner.mjs";
import { resolveOffers } from "../offers.mjs";

seedIfEmpty();
const PORT = process.env.PORT || 4322;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), ".."); // project root

const MIME = { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png" };

// Serve the static web app (so one Node process hosts API + UI — ideal for Railway).
async function serveStatic(res, pathname) {
  let rel = pathname === "/" ? "/web/index.html" : pathname;
  const filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error: "forbidden" }); // no traversal
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": (MIME[extname(filePath)] ?? "application/octet-stream") + "; charset=utf-8" });
    res.end(body);
  } catch {
    json(res, 404, { error: "not found", path: pathname });
  }
}

const json = (res, code, body) => {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
    });
  });

const userOf = (id = "demo") => {
  const u = getDB().users[id] ?? { id, selectedCards: [], spendToDate: {} };
  return { ...u, cards: u.selectedCards }; // engine expects `cards`
};
const liveOffers = () => resolveOffers(getDB().offers).offers; // expiry + dedupe + conflict-resolved
const ledgerOf = (id = "demo") => getDB().transactions.filter((t) => t.userId === id);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const q = url.searchParams;
  if (req.method === "OPTIONS") return json(res, 204, {});

  try {
    // ---- platform ----
    if (path === "/api/health") {
      const { stats } = resolveOffers(getDB().offers);
      return json(res, 200, { ok: true, cards: getDB().cards.length, offers: getDB().offers.length, offerStats: stats });
    }
    if (path === "/api/sources" && req.method === "GET")
      return json(res, 200, { sources: SOURCES, recent: getDB().sourceLog.slice(0, 10) });
    if (path.startsWith("/api/sources/") && path.endsWith("/run") && req.method === "POST") {
      const id = path.split("/")[3];
      return json(res, 200, await runSource(id, await readBody(req)));
    }

    // ---- catalog ----
    if (path === "/api/cards") return json(res, 200, getDB().cards);
    if (path === "/api/offers") return json(res, 200, q.get("all") === "1" ? getDB().offers : liveOffers());

    // ---- user ----
    if (path === "/api/me" && req.method === "GET")
      return json(res, 200, { user: userOf(), transactions: ledgerOf() });
    if (path === "/api/me/cards" && req.method === "PUT") {
      const body = await readBody(req);
      tx((d) => { if (d.users.demo) d.users.demo.selectedCards = body.cards ?? []; });
      return json(res, 200, { ok: true, selectedCards: userOf().selectedCards });
    }

    // ---- ingestion (user-consented) ----
    if (path === "/api/ingest/sms" && req.method === "POST")
      return json(res, 200, await runSource("sms", { ...(await readBody(req)), user: "demo" }));
    if (path === "/api/ingest/csv" && req.method === "POST")
      return json(res, 200, await runSource("csv", { ...(await readBody(req)), user: "demo" }));

    // ---- engine (server-side) ----
    if (path === "/api/recommend") {
      const u = userOf();
      const txn = {
        amount: Number(q.get("amount")) || 0,
        category: q.get("category") || "other",
        merchant: q.get("merchant") || undefined,
        channel: q.get("channel") || "online",
        viaPortal: q.get("portal") === "1",
        isInternational: q.get("intl") === "1",
        label: "api",
      };
      const ranked = new WalletState(u).rank(getDB().cards, txn, liveOffers(), q.get("mode") || "typical");
      return json(res, 200, { txn, ranked });
    }
    if (path === "/api/plan" && req.method === "POST") {
      const body = await readBody(req);
      return json(res, 200, planAllocation(body.items ?? [], getDB().cards, userOf(), liveOffers(), body.mode || "typical"));
    }

    // anything not under /api → static web app
    if (req.method === "GET" && !path.startsWith("/api/")) return serveStatic(res, path);
    return json(res, 404, { error: "not found", path });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => console.log(`CC Advisor API on http://localhost:${PORT}`));
