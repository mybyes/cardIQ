// Source-adapter registry — THE mechanism to add real-world values.
// Each source declares its kind + legal posture. Adding a new app = adding an adapter.
import { getDB, tx } from "../db.mjs";
import { parseSMS, parseCSV, parseEmail } from "../../ingestion.mjs";
import { scrapeFixture, scrapeLive, fetchDirect, DIRECT_SOURCES } from "./scraper.mjs";

export const SOURCES = {
  curation: { kind: "public-card-data", desc: "Manual editorial add/update of cards & offers — the primary, reliable mechanism for catalog accuracy.", legal: "OK — public product info." },
  scraper: { kind: "public-card-data", desc: "Scrape public offer pages → offers. Fixture-backed demo + best-effort live fetch.", legal: "Grey — honour robots.txt/ToS; prefer official or affiliate feeds." },
  ota: { kind: "public-offer-feed", desc: "Pull OTA card offers (MakeMyTrip, Cleartrip, Goibibo, EaseMyTrip…) from an offers feed → offers. Adapter ready; needs a feed URL (affiliate/offers API or partner feed) via payload.url or OTA_FEED_URL.", legal: "OK with an authorised affiliate/offers feed; NEVER credential-scrape or breach ToS." },
  direct: { kind: "public-direct-fetch", desc: "Fetch a source's OWN public page directly (no aggregator) via the DIRECT_SOURCES registry — issuer offer pages, award charts, transfer pages. Public data only; robots.txt + rate-limit enforced. Fixture by default; payload.live=true to go live.", legal: "Public pages only — honour robots.txt/ToS; NEVER login-gated/credentialed data or bot-detection bypass." },
  sms: { kind: "user-consented", desc: "Parse user-pasted bank transaction SMS → transactions.", legal: "OK with user consent; data stays the user's." },
  csv: { kind: "user-consented", desc: "Parse user-uploaded statement CSV → transactions.", legal: "OK with user consent." },
  email: { kind: "user-consented", desc: "Parse FORWARDED statement/alert emails (free — no Gmail OAuth). Gmail auto-read would need a restricted-scope audit (~$15–75k).", legal: "OK with user consent (forwarded by the user)." },
  aa: { kind: "regulated", desc: "[stub] Account Aggregator pull of consented financial data.", legal: "Needs FIU registration + Sahamati onboarding (the sanctioned rail)." },
  portal_credentials: { kind: "FORBIDDEN", desc: "Logging into a user's bank portal with their credentials.", legal: "NEVER — ToS violation, RBI/DPDP breach, credential-theft risk. Not implemented by design." },
};

function upsertOffers(incoming) {
  return tx((d) => {
    let added = 0, updated = 0;
    for (const o of incoming) {
      const i = d.offers.findIndex((x) => x.id === o.id);
      if (i >= 0) (d.offers[i] = o), updated++;
      else (d.offers.push(o), added++);
    }
    return { added, updated };
  });
}

function logRun(id, result) {
  tx((d) => {
    d.sourceLog.unshift({ id, at: new Date().toISOString(), result });
    d.sourceLog = d.sourceLog.slice(0, 50);
  });
}

// Run a source adapter. payload shape depends on the source.
export async function runSource(id, payload = {}) {
  let result;
  switch (id) {
    case "curation": {
      result = tx((d) => {
        if (payload.card) {
          const i = d.cards.findIndex((c) => c.id === payload.card.id);
          i >= 0 ? (d.cards[i] = payload.card) : d.cards.push(payload.card);
          return { type: "card", id: payload.card.id };
        }
        if (payload.offer) {
          const o = { source: "curation", ...payload.offer };
          const i = d.offers.findIndex((x) => x.id === o.id);
          i >= 0 ? (d.offers[i] = o) : d.offers.push(o);
          return { type: "offer", id: o.id };
        }
        return { error: "provide {card} or {offer}" };
      });
      break;
    }
    case "scraper": {
      const scraped = payload.url ? await scrapeLive(payload.url) : scrapeFixture();
      const stamped = scraped.offers.map((o) => ({ ...o, fetchedAt: new Date().toISOString() }));
      const counts = scraped.ok ? upsertOffers(stamped) : { added: 0, updated: 0 };
      result = { ...counts, ok: scraped.ok, note: scraped.note };
      break;
    }
    case "direct": {
      // Direct-from-source fetch of a registered public page. payload.id selects the source.
      const id = payload.id || Object.keys(DIRECT_SOURCES)[0];
      const r = await fetchDirect(id, { live: !!payload.live });
      const counts = r.ok && r.kind === "offers" ? upsertOffers(r.records) : { added: 0, updated: 0 };
      result = { ...counts, ok: r.ok, source: id, note: r.note };
      break;
    }
    case "ota": {
      // OTA offers (MMT/Cleartrip/…). Real-time needs a licensed feed; the adapter normalises
      // it into our offer schema and tags source="ota". No feed → honest not-configured note.
      const feed = payload.url || process.env.OTA_FEED_URL;
      if (!feed) {
        result = { added: 0, updated: 0, ok: false, note: "no OTA feed configured — set payload.url or OTA_FEED_URL (affiliate/offers API)" };
        break;
      }
      const scraped = await scrapeLive(feed); // reuse the public-page parser; swap for a JSON adapter per feed
      const stamped = scraped.offers.map((o) => ({ ...o, source: "ota", platform: "ota", fetchedAt: new Date().toISOString() }));
      const counts = scraped.ok ? upsertOffers(stamped) : { added: 0, updated: 0 };
      result = { ...counts, ok: scraped.ok, note: scraped.ok ? `OTA feed parsed (${feed})` : scraped.note };
      break;
    }
    case "sms":
    case "csv":
    case "email": {
      const userId = payload.user || "demo";
      const held = new Set(getDB().users[userId]?.selectedCards ?? []);
      const fn = id === "sms" ? parseSMS : id === "csv" ? parseCSV : parseEmail;
      const parsed = fn(payload.text || "").filter((t) => t.amount > 0 && (!t.usedCard || held.has(t.usedCard)));
      tx((d) => d.transactions.push(...parsed.map((t) => ({ ...t, userId, source: id }))));
      result = { imported: parsed.length, transactions: parsed };
      break;
    }
    case "aa":
      result = { error: "aa not implemented", note: SOURCES.aa.legal };
      break;
    case "portal_credentials":
      result = { error: "refused by design", note: SOURCES[id].legal };
      break;
    default:
      result = { error: `unknown source '${id}'` };
  }
  logRun(id, result);
  return result;
}
