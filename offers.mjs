// Offer-lifecycle layer — the real ongoing core of an offers product.
// Turns the raw offer pile (multiple sources, overlaps, stale entries) into the
// clean, trustworthy set the engine should actually use:
//   1. EXPIRY   — drop offers past their expiry / before their validFrom
//   2. DEDUPE   — one winner per (card, merchant/category, type)
//   3. CONFLICT — winner chosen by source trust, then value, then recency

// Manual/verified data outranks scraped; scraped outranks the bootstrap seed.
export const SOURCE_PRIORITY = { curation: 100, affiliate: 80, scraper: 50, seed: 10 };

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// rough magnitude of an offer's value, for tie-breaking within the same source tier
const magnitude = (o) => (o.pct || 0) * 1000 + (o.capINR || 0);

function better(a, b) {
  const pa = SOURCE_PRIORITY[a.source] ?? 0;
  const pb = SOURCE_PRIORITY[b.source] ?? 0;
  if (pa !== pb) return pa > pb; // higher-trust source wins (curation overrides scraper)
  if (magnitude(a) !== magnitude(b)) return magnitude(a) > magnitude(b); // better deal wins
  return (a.fetchedAt || "") > (b.fetchedAt || ""); // freshest wins
}

// Returns { offers: <resolved list>, stats: {...} }.
export function resolveOffers(all, now = new Date()) {
  let expired = 0, future = 0;
  const live = all.filter((o) => {
    const vf = parseDate(o.validFrom);
    if (vf && vf > now) return (future++, false);
    const ex = parseDate(o.expiry);
    if (ex && ex < now) return (expired++, false);
    return true;
  });

  // pick a winner per key; one offer can cover several (card × merchant) keys
  const byKey = new Map();
  for (const o of live) {
    const merchants = o.merchants ?? (o.categories ? o.categories.map((c) => "cat:" + c) : ["*"]);
    for (const card of o.cards ?? []) {
      for (const m of merchants) {
        const key = `${card}|${m}|${o.type}`;
        const prev = byKey.get(key);
        if (!prev || better(o, prev)) byKey.set(key, o);
      }
    }
  }

  const chosen = new Map();
  for (const o of byKey.values()) chosen.set(o.id, o);
  const offers = [...chosen.values()];
  return {
    offers,
    stats: { total: all.length, active: offers.length, expired, future, superseded: Math.max(0, live.length - offers.length) },
  };
}
