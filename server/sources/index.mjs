// Source-adapter registry — THE mechanism to add real-world values.
// Each source declares its kind + legal posture. Adding a new app = adding an adapter.
import { getDB, tx } from "../db.mjs";
import { parseSMS, parseCSV } from "../../ingestion.mjs";
import { scrapeFixture, scrapeLive } from "./scraper.mjs";

export const SOURCES = {
  curation: { kind: "public-card-data", desc: "Manual editorial add/update of cards & offers — the primary, reliable mechanism for catalog accuracy.", legal: "OK — public product info." },
  scraper: { kind: "public-card-data", desc: "Scrape public offer pages → offers. Fixture-backed demo + best-effort live fetch.", legal: "Grey — honour robots.txt/ToS; prefer official or affiliate feeds." },
  sms: { kind: "user-consented", desc: "Parse user-pasted bank transaction SMS → transactions.", legal: "OK with user consent; data stays the user's." },
  csv: { kind: "user-consented", desc: "Parse user-uploaded statement CSV → transactions.", legal: "OK with user consent." },
  email: { kind: "user-consented", desc: "[stub] Gmail API parse of statement/alert emails.", legal: "Needs OAuth + Google restricted-scope security audit (~$15–75k)." },
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
    case "sms":
    case "csv": {
      const userId = payload.user || "demo";
      const held = new Set(getDB().users[userId]?.selectedCards ?? []);
      const parsed = (id === "sms" ? parseSMS(payload.text || "") : parseCSV(payload.text || ""))
        .filter((t) => t.amount > 0 && (!t.usedCard || held.has(t.usedCard)));
      tx((d) => d.transactions.push(...parsed.map((t) => ({ ...t, userId, source: id }))));
      result = { imported: parsed.length, transactions: parsed };
      break;
    }
    case "email":
    case "aa":
      result = { error: `${id} not implemented`, note: SOURCES[id].legal };
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
