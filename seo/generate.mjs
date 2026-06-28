// Programmatic SEO generator — emits static, crawlable pages from the data modules so
// CardIQ ranks for "<card> rewards/transfer partners/value" and "<program> transfer partners".
// JS-rendered app content is invisible to crawlers; these pages put the data in HTML.
//
// Run: node seo/generate.mjs   → writes web/c/<card>.html, web/p/<program>.html,
// web/cards.html (hub), web/sitemap.xml, web/robots.txt.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cards, CARD_SOURCES, CARDS_VERIFIED } from "../data.mjs";
import { currencies, valuePerUnit } from "../valuation.mjs";
import { routes, PROGRAMS, sourceFor } from "../web/transfers.mjs";
import { PERKS } from "../web/perks.mjs";

const BASE = "https://cardiq.app"; // canonical/prod domain
const WEB = join(dirname(fileURLToPath(import.meta.url)), "../web");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const rupee2 = (n) => "₹" + Number(n).toFixed(2);
const nameToCurrency = Object.fromEntries(Object.entries(currencies).map(([code, c]) => [c.name, code]));

const HEAD = (title, desc, canonical, jsonld) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" /><meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" /><meta property="og:url" content="${canonical}" />
<meta property="og:site_name" content="CardIQ" /><meta name="twitter:card" content="summary" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
<style>
*{box-sizing:border-box;margin:0}:root{--paper:#ece4d4;--panel:#fbf8f1;--line:#ddd1ba;--text:#1a160d;--muted:#736a57;--gold:#a8822e;--green:#2f6b4f;--serif:"Fraunces",Georgia,serif;--mono:"JetBrains Mono",monospace}
body{font-family:Inter,sans-serif;color:var(--text);background:var(--paper);line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:0 26px}
nav{display:flex;gap:16px;align-items:center;padding:22px 0;font-size:14px}
.brand{font:600 21px var(--serif);text-decoration:none;color:var(--text)}.brand b{color:var(--gold)}
nav a{color:var(--text);text-decoration:none}nav a:hover{color:var(--gold)}nav .sp{margin-left:auto}
.crumb{color:var(--muted);font-size:13px;padding:6px 0}.crumb a{color:var(--gold);text-decoration:none}
h1{font:600 36px var(--serif);letter-spacing:-.02em;margin:8px 0 6px}
.lede{color:var(--muted);font-size:17px;margin-bottom:8px}
h2{font:500 23px var(--serif);margin:28px 0 8px}
p,li{font-size:15px}ul{margin:8px 0 8px 18px}li{margin:5px 0}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:10px 0}
th,td{text-align:left;padding:10px 13px;border-bottom:1px solid var(--line);font-size:13.5px}th{font:600 11px Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:#f3ecdd}
tr:last-child td{border-bottom:0}.mono{font-family:var(--mono)}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.k{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:12px 14px}.k .l{color:var(--muted);font:600 11px Inter;letter-spacing:.05em;text-transform:uppercase}.k .v{font:500 20px var(--serif);margin-top:2px}
.cta{display:inline-block;background:var(--text);color:var(--paper);border-radius:10px;padding:11px 18px;text-decoration:none;font-weight:600;margin:14px 8px 0 0}
.cta.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
.src{font-size:13px;color:var(--muted);margin-top:10px}.src a{color:var(--gold)}
.grid-links{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:12px 0}
.gl{display:block;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:13px 15px;text-decoration:none;color:var(--text)}.gl:hover{border-color:var(--gold)}.gl b{display:block}.gl span{color:var(--muted);font-size:13px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:22px 0 40px;color:var(--muted);font-size:13px}footer a{color:var(--text);text-decoration:none}
.note{color:var(--muted);font-size:12.5px;margin-top:16px}
</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body><div class="wrap">
<nav><a class="brand" href="/web/login.html">Card<b>IQ</b></a><span class="sp"></span><a href="/web/cards.html">All cards</a><a href="/web/transfers.html">Transfers</a><a href="/web/login.html#pricing">Pricing</a><a href="/web/login.html">Sign in</a></nav>`;

const FOOT = `<footer>© 2026 CardIQ · Curated, point-in-time data — confirm with your issuer before deciding. · <a href="/web/review.html">Data &amp; sources</a> · <a href="/web/legal.html#disclaimer">Disclaimer</a></footer></div></body></html>`;

mkdirSync(join(WEB, "c"), { recursive: true });
mkdirSync(join(WEB, "p"), { recursive: true });

const urls = ["/web/login.html", "/web/transfers.html", "/web/cards.html", "/web/legal.html", "/web/review.html"];

// ---------- per-card pages ----------
for (const card of cards) {
  const cur = currencies[card.reward.currency];
  const partners = cur?.partners || [];
  const perks = PERKS[card.id] || [];
  const rate = card.reward.base ? `${card.reward.base} pts/₹100` : card.reward.channels ? `${card.reward.channels.online}% online` : "—";
  const feeStr = card.annualFee ? inr(card.annualFee) + "/yr" : "lifetime free";
  const valStr = cur && card.reward.currency !== "CASHBACK" ? `${rupee2(valuePerUnit(card.reward.currency, "best"))} best / ${rupee2(valuePerUnit(card.reward.currency, "typical"))} typical` : "₹1 = ₹1";
  const title = `${card.name} — rewards, fees, transfer partners & value (2026) | CardIQ`;
  const desc = `${card.name} (${card.issuer}): ${rate} base reward, fee ${feeStr}, points worth ${valStr}. Best use, hidden perks${partners.length ? ", and " + partners.length + " transfer partners" : ""} — India 2026.`;
  const canonical = `${BASE}/web/c/${card.id}.html`;
  const faq = [
    { q: `What is the reward rate on the ${card.name}?`, a: `The ${card.name} earns ${rate}${card.portal ? ` and up to ${card.portal.rate} pts/₹100 via ${card.portal.name}` : ""}.` },
    { q: `What are ${card.name} points worth?`, a: `Around ${valStr} per point depending on how you redeem.` },
    partners.length ? { q: `Which transfer partners does the ${card.name} support?`, a: `${partners.map((p) => `${p.program} (${p.ratio})`).join(", ")}.` } : null,
  ].filter(Boolean);
  const jsonld = [
    { "@context": "https://schema.org", "@type": "Product", name: card.name, brand: { "@type": "Brand", name: card.issuer }, category: "Credit card", description: desc, url: canonical },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Cards", item: `${BASE}/web/cards.html` }, { "@type": "ListItem", position: 2, name: card.name, item: canonical }] },
  ];
  const partnerTable = partners.length
    ? `<h2>Transfer partners</h2><table><tr><th>Partner</th><th>Ratio</th><th>Type</th><th>Value</th></tr>${partners.map((p) => `<tr><td>${esc(p.program)}</td><td class="mono">${esc(p.ratio)}</td><td>${p.kind}</td><td>${p.good ? "✓ strong" : "weak"}</td></tr>`).join("")}</table>`
    : "";
  const perkList = perks.length ? `<h2>Hidden perks people forget</h2><ul>${perks.map((p) => `<li><b>${esc(p.title)}</b> — ${esc(p.detail)}</li>`).join("")}</ul>` : "";
  const milestones = (card.milestones || []).length ? `<h2>Milestone benefits</h2><ul>${card.milestones.map((m) => `<li>${esc(m.label)}</li>`).join("")}</ul>` : "";
  const src = CARD_SOURCES[card.id];
  const html = HEAD(title, desc, canonical, jsonld) + `
<div class="crumb"><a href="/web/cards.html">Cards</a> › ${esc(card.name)}</div>
<h1>${esc(card.name)}</h1>
<p class="lede">${esc(card.issuer)} · ${esc(card.network)} — rewards, fees, transfer partners and the best way to use the points, for the Indian market (verified ${CARDS_VERIFIED}).</p>
<div class="kv">
  <div class="k"><div class="l">Reward rate</div><div class="v">${esc(rate)}</div></div>
  <div class="k"><div class="l">Annual fee</div><div class="v">${esc(feeStr)}</div></div>
  <div class="k"><div class="l">Point value</div><div class="v" style="font-size:15px">${esc(valStr)}</div></div>
  <div class="k"><div class="l">Forex markup</div><div class="v">${card.forexMarkupPct ?? "—"}%</div></div>
</div>
${card.portal ? `<h2>Bonus portal</h2><p>Earn up to <b>${card.portal.rate} pts/₹100</b> on ${esc(card.portal.category)} via <b>${esc(card.portal.name)}</b>.</p>` : ""}
${milestones}
${perkList}
${partnerTable}
<h2>Plan the best use of your ${esc(card.name)} points</h2>
<p>CardIQ turns these points into the most valuable flights and hotels — which card to swipe, what your points are worth in ₹, and the best transfer route.</p>
<a class="cta" href="/web/transfers.html">Plan a trip on points →</a><a class="cta ghost" href="/web/login.html">Open CardIQ</a>
${src ? `<div class="src">Source: <a href="${src}" target="_blank" rel="noopener nofollow">${esc(card.issuer)} official ↗</a> · verified ${CARDS_VERIFIED}</div>` : ""}
<div class="note">Reward rules, fees and ratios change often — confirm with the issuer before applying.</div>
` + FOOT;
  writeFileSync(join(WEB, "c", `${card.id}.html`), html);
  urls.push(`/web/c/${card.id}.html`);
}

// ---------- per-program (transfer) pages ----------
for (const program of PROGRAMS) {
  const progRoutes = routes.filter((r) => r.from === program);
  if (!progRoutes.length) continue;
  const code = nameToCurrency[program];
  const valStr = code && code !== "CASHBACK" ? `${rupee2(valuePerUnit(code, "best"))} best / ${rupee2(valuePerUnit(code, "typical"))} typical` : "";
  const sl = slug(program);
  const title = `${program} transfer partners — ratios, time & caps (2026) | CardIQ`;
  const desc = `${program} transfers to ${progRoutes.length} airline & hotel partners. Ratios, transfer time and caps${valStr ? `, plus ₹/point value (${valStr})` : ""} — India 2026.`;
  const canonical = `${BASE}/web/p/${sl}.html`;
  const faq = [
    { q: `What can ${program} transfer to?`, a: `${[...new Set(progRoutes.map((r) => r.to))].join(", ")}.` },
    { q: `How long do ${program} transfers take?`, a: `Typically ${[...new Set(progRoutes.map((r) => r.time))].slice(0, 3).join("; ")}.` },
  ];
  const jsonld = [
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Transfers", item: `${BASE}/web/transfers.html` }, { "@type": "ListItem", position: 2, name: program, item: canonical }] },
  ];
  const s = sourceFor(program);
  const html = HEAD(title, desc, canonical, jsonld) + `
<div class="crumb"><a href="/web/transfers.html">Transfers</a> › ${esc(program)}</div>
<h1>${esc(program)} transfer partners</h1>
<p class="lede">Every airline & hotel ${esc(program)} transfers to — with the ratio, transfer time and cap.${valStr ? ` Points worth ~${esc(valStr)}.` : ""}</p>
<table><tr><th>Partner</th><th>Ratio</th><th>Type</th><th>Transfer time</th><th>Cap/yr</th></tr>
${progRoutes.map((r) => `<tr><td>${esc(r.to)}</td><td class="mono">${esc(r.ratio)}</td><td>${r.type}</td><td>${esc(r.time)}</td><td class="mono">${esc(r.cap)}</td></tr>`).join("")}</table>
<a class="cta" href="/web/transfers.html">Plan a transfer on your points →</a>
${s ? `<div class="src">Source: <a href="${s.url}" target="_blank" rel="noopener nofollow">${esc(s.name)} ↗</a></div>` : ""}
<div class="note">Ratios and timing change often — confirm with the issuer before transferring.</div>
` + FOOT;
  writeFileSync(join(WEB, "p", `${sl}.html`), html);
  urls.push(`/web/p/${sl}.html`);
}

// ---------- cards hub ----------
{
  const title = "All Indian credit cards — rewards, points value & transfer partners | CardIQ";
  const desc = "Compare Indian credit cards: reward rates, fees, point values and transfer partners. HDFC, Axis, Amex, ICICI, SBI and more — find the best card to earn and burn points.";
  const canonical = `${BASE}/web/cards.html`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: "All credit cards", url: canonical };
  const cardLinks = cards.map((c) => `<a class="gl" href="/web/c/${c.id}.html"><b>${esc(c.name)}</b><span>${esc(c.issuer)} · ${c.annualFee ? inr(c.annualFee) + "/yr" : "lifetime free"}</span></a>`).join("");
  const progLinks = PROGRAMS.filter((p) => routes.some((r) => r.from === p)).map((p) => `<a class="gl" href="/web/p/${slug(p)}.html"><b>${esc(p)}</b><span>transfer partners & ratios</span></a>`).join("");
  const html = HEAD(title, desc, canonical, jsonld) + `
<div class="crumb"><a href="/web/login.html">Home</a> › Cards</div>
<h1>Every card &amp; points program</h1>
<p class="lede">Reward rates, fees, point values and transfer partners for India's top cards — and the loyalty programs they move points to.</p>
<h2>Credit cards</h2><div class="grid-links">${cardLinks}</div>
<h2>Points programs &amp; transfer partners</h2><div class="grid-links">${progLinks}</div>
<a class="cta" href="/web/login.html">Build my wallet — free →</a>
` + FOOT;
  writeFileSync(join(WEB, "cards.html"), html);
}

// ---------- sitemap + robots ----------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
writeFileSync(join(WEB, "sitemap.xml"), sitemap);
writeFileSync(join(WEB, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /web/index.html\nSitemap: ${BASE}/web/sitemap.xml\n`);

console.log(`generated ${cards.length} card pages, ${urls.filter((u) => u.includes("/p/")).length} program pages, hub, sitemap (${urls.length} urls), robots.txt`);
