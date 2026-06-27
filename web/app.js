import { cards as seedCards, offers as rawOffers, user as seedUser } from "../data.mjs";
import { resolveOffers } from "../offers.mjs";
import { WalletState } from "../state.mjs";
import { valuePerUnit, currencies, redemptionPlan, DATA_VERIFIED } from "../valuation.mjs";
import { AWARDS, reachableAwards, planForGoal } from "../awards.mjs";

// Award-seat availability is gated (seats.aero bars commercial API use), so we optimise
// VALUE and link users out to check seats — routing around the hard data layer.
const SEAT_SEARCH = {
  "Singapore KrisFlyer": "https://seats.aero/singapore",
  "Air India Maharaja Club": "https://www.airindia.com/in/en/maharaja-club.html",
  "Air France-KLM Flying Blue": "https://seats.aero/search",
};
const seatLink = (program) => SEAT_SEARCH[program] || "https://seats.aero/search";
import { parseSMS, parseCSV } from "../ingestion.mjs";
import { parseQuery } from "../query.mjs";
import { planAllocation } from "../planner.mjs";
import { analyzeRange, isTravelOTA } from "../range.mjs";
import { profileFromMonthly, categorySummary, recommendNewCard } from "../advisor.mjs";
import { spendSummary, rewardsSummary, actionItems } from "../insights.mjs";
import { detectRecurring, optimizeRecurring } from "../recurring.mjs";
import * as store from "./store.mjs";
import * as api from "./api.mjs";

// Live data — defaults to bundled, swapped for platform data when the API is reachable.
let cards = seedCards;
let byId = Object.fromEntries(cards.map((c) => [c.id, c]));
let offers = resolveOffers(rawOffers).offers; // expiry + dedupe + conflict-resolved
let dataSource = "bundled";
const rupee = (n) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n || 0)).toLocaleString("en-IN");

// Card brand identity — a coloured initials chip per card.
const BRAND = { "hdfc-infinia": "#004C8F", "axis-atlas": "#97144D", "amazon-pay-icici": "#FF9900", "flipkart-axis": "#2874F0", "sbi-cashback": "#22409A" };
const initials = (name) => (name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const cardChip = (id) => byId[id] ? `<span class="chip" style="background:${BRAND[id] || "#5b6472"}">${initials(byId[id].name)}</span>` : "";

// Affiliate "Apply" links — the monetisation surface (card-signup commissions).
// REPLACE these with your affiliate-tagged URLs (GroMo / Cuelinks / INRDeals / bank
// affiliate programs). Defaults point to the official card pages so links still work.
const AFFILIATE = {
  "hdfc-infinia": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia",
  "axis-atlas": "https://www.axisbank.com/retail/cards/credit-card/axis-bank-atlas-credit-card",
  "amazon-pay-icici": "https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card",
  "flipkart-axis": "https://www.axisbank.com/retail/cards/credit-card/flipkart-axis-bank-credit-card",
  "sbi-cashback": "https://www.sbicard.com/en/personal/credit-cards/shopping/cashback-sbi-card.page",
};
const applyLink = (id) => AFFILIATE[id] || null;
const applyBtn = (id) => (applyLink(id) ? `<a class="apply" href="${applyLink(id)}" target="_blank" rel="noopener sponsored" data-nomove>Apply ↗</a>` : "");

// Premium two-stop gradients for rendered card faces.
const CARD_GRADIENT = {
  "hdfc-infinia": "linear-gradient(135deg,#0a2540,#05101d)",
  "axis-atlas": "linear-gradient(135deg,#7d1638,#3f0a1c)",
  "amazon-pay-icici": "linear-gradient(135deg,#ff9d20,#c0610a)",
  "flipkart-axis": "linear-gradient(135deg,#2874f0,#10336e)",
  "sbi-cashback": "linear-gradient(135deg,#2a4cae,#13245a)",
};
// A rendered credit-card mockup. opts.net → shows a value pill.
function cardFace(c, opts = {}) {
  const fee = c.annualFee ? "₹" + c.annualFee.toLocaleString("en-IN") + "/yr" : "Lifetime free";
  const netPill = opts.net != null ? `<span class="cf-net">${opts.net > 0 ? "+" : ""}${rupee(opts.net)}/yr</span>` : "";
  return `<div class="cardface" style="background:${CARD_GRADIENT[c.id] || "linear-gradient(135deg,#3a3f4a,#1d2027)"}" data-id="${c.id}">
      <span class="cf-shine"></span>
      <div class="cf-row"><span>${c.issuer}</span><span>${c.network}</span></div>
      <div class="cf-chip"></div>
      <div class="cf-name">${c.name}</div>
      <div class="cf-foot"><span class="cf-fee">${fee}</span>${netPill}</div>
    </div>`;
}

// Crisp inline line-icons (currentColor) — replace inconsistent emoji.
const ICONS = {
  spark: '<path d="M12 3v6m0 6v6m-9-9h6m6 0h6"/><path d="M5.6 5.6l3.5 3.5m5.8 5.8l3.5 3.5m0-12.8l-3.5 3.5m-5.8 5.8l-3.5 3.5"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
  trend: '<path d="M3 7l6 6 4-4 8 8"/><path d="M21 17v-6h-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  plane: '<path d="M10.2 14.5L3 13l-1 2 5 3 3 5 2-1-1.5-7.2L20 8a2 2 0 10-3-3l-6.8 6.5z"/>',
  hotel: '<path d="M3 21V8l9-5 9 5v13M3 21h18M9 21v-5h6v5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
};
const icon = (n) => (ICONS[n] ? `<svg class="ic" viewBox="0 0 24 24">${ICONS[n]}</svg>` : "");

// Loyalty / airline-hotel program chips.
const loyaltyChip = (p) => `<span class="loychip ${p.good === false ? "poor" : ""}">${icon(p.kind === "hotel" ? "hotel" : "plane")} ${p.program} <span class="meta">${p.ratio}</span>${p.good === false ? " ⚠️" : ""}</span>`;

// Mini card face for the drag picker — feels like dealing a real card.
const miniCard = (id) => `<div class="minicard" style="background:${CARD_GRADIENT[id] || "linear-gradient(135deg,#3a3f4a,#1d2027)"}"></div>`;
const routeChip = (a) => (a && a.route ? `<span class="routechip">${icon("plane")} ${a.route}</span>` : "");

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// 3D parallax tilt + shine that follows the cursor over card faces.
function attachCardTilt(root) {
  if (reduceMotion()) return;
  root.querySelectorAll(".cardface").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${px * 11}deg) rotateX(${-py * 11}deg) translateY(-4px)`;
      card.style.setProperty("--mx", (px + 0.5) * 100 + "%");
      card.style.setProperty("--my", (py + 0.5) * 100 + "%");
    });
    card.addEventListener("mouseleave", () => (card.style.transform = ""));
  });
}

// Count-up animation for KPI numbers (respects reduced motion).
function countUpAll(root) {
  if (reduceMotion()) return;
  root.querySelectorAll("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count);
    if (!isFinite(target)) return;
    const t0 = performance.now(), dur = 650;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = rupee(target * e);
      if (p < 1) requestAnimationFrame(tick);
      else node.textContent = rupee(target);
    };
    requestAnimationFrame(tick);
  });
}

// Operator-only data-platform tooling — hidden from end users. Enable with ?dev=1.
const DEV = new URLSearchParams(location.search).has("dev") || localStorage.getItem("cardiq-dev") === "1";

// Friendly labels for the point-value mode (avoid best/typical/floor jargon in the UI).
const MODE_LABEL = { best: "Optimistic", typical: "Realistic", floor: "Conservative" };

// Pull catalog + (already-resolved) offers from the data platform; fall back silently.
async function syncFromPlatform(opts = {}) {
  try {
    const [c, o] = await Promise.all([api.getCards(), api.getOffers()]);
    if (Array.isArray(c) && c.length) {
      cards = c;
      byId = Object.fromEntries(cards.map((x) => [x.id, x]));
    }
    if (Array.isArray(o)) offers = o;
    dataSource = "platform";
  } catch {
    dataSource = "bundled";
  }
  if (!opts.silent) render();
}
const el = (id) => document.getElementById(id);
const mode = () => store.get("mode");
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : fallback);

// Current user = seed data, but with the user's chosen cards / ledger / spend overlaid.
const appUser = () => ({
  ...seedUser,
  profile: store.activeProfile(),
  cards: store.get("selectedCards"),
  ledger: store.get("ledger"),
  spendToDate: store.get("spendToDate"),
  pointsBalance: store.get("pointsBalance"),
  expiring: store.get("expiring"),
});

const CATS = ["appliances", "electronics", "travel", "grocery", "dining", "shopping", "transport", "other"];
const tabs = ["home", "recommend", "plan", "wallet", "redeem", "coach", "getcard", "cards"];

// ---------- tab switching (grouped: fewer primary tabs + light sub-nav) ----------
const GROUP_OF = { home: "home", recommend: "use", plan: "use", wallet: "points", redeem: "points", coach: "review", getcard: "getcard", cards: "cards" };
const GROUP_CONTAINERS = { use: ["recommend", "plan"], points: ["wallet", "redeem"] };
const SUB_LABEL = { recommend: "Use a card", plan: "Plan ahead", wallet: "Cards & balances", redeem: "Redeem & goals" };

function renderSubnav(active) {
  const box = el("subnav");
  if (!box) return;
  const subs = GROUP_CONTAINERS[GROUP_OF[active]];
  box.innerHTML = subs ? subs.map((c) => `<button class="sub ${c === active ? "on" : ""}" data-sub="${c}">${SUB_LABEL[c]}</button>`).join("") : "";
  box.querySelectorAll("[data-sub]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.sub)));
}
function switchTab(name) {
  const grp = GROUP_OF[name];
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", GROUP_OF[x.dataset.tab] === grp));
  tabs.forEach((t) => (el(t).hidden = t !== name));
  renderSubnav(name);
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
el("nav-cards").addEventListener("click", () => switchTab("cards"));

// ---------- light / dark theme ----------
function applyTheme() {
  const dark = store.get("theme") === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "";
  const btn = el("theme-toggle");
  if (btn) btn.textContent = dark ? "☀️" : "🌙";
}
el("theme-toggle").addEventListener("click", () => {
  store.set("theme", store.get("theme") === "dark" ? "light" : "dark");
  applyTheme();
});
applyTheme();

// header valuation mode
el("mode").value = mode();
el("mode").addEventListener("change", (e) => {
  store.set("mode", e.target.value);
  render();
});

// header profile switcher (per-user: "You", "Spouse", …)
function renderProfileBar() {
  const bar = el("profilebar");
  if (!bar) return;
  const profiles = store.listProfiles();
  bar.innerHTML = `
    <label style="margin:0; color:var(--muted); font-size:12px">profile
      <select id="profile-sel" style="width:auto; display:inline-block; margin-left:6px">
        ${profiles.map((p) => `<option ${p === store.activeProfile() ? "selected" : ""}>${p}</option>`).join("")}
      </select>
    </label>
    <button id="profile-add" title="Add profile" style="background:var(--panel2); color:var(--text); border:1px solid var(--line); border-radius:8px; padding:3px 9px; cursor:pointer">＋</button>
    ${profiles.length > 1 ? `<button id="profile-del" title="Remove this profile" style="background:var(--panel2); color:var(--bad); border:1px solid var(--line); border-radius:8px; padding:3px 8px; cursor:pointer">✕</button>` : ""}`;
  el("profile-sel").addEventListener("change", (e) => {
    store.setActiveProfile(e.target.value);
    render();
  });
  el("profile-add").addEventListener("click", () => {
    const name = window.prompt("New profile name (e.g. Spouse):");
    if (name && name.trim()) {
      store.addProfile(name.trim());
      renderProfileBar();
      render();
    }
  });
  const del = el("profile-del");
  if (del)
    del.addEventListener("click", () => {
      if (window.confirm(`Remove profile "${store.activeProfile()}" and its data?`)) {
        store.deleteProfile(store.activeProfile());
        renderProfileBar();
        render();
      }
    });
}
renderProfileBar();

// ---------- empty state ----------
function emptyState(container) {
  el(container).innerHTML = `<div class="panel"><h2>No cards selected</h2>
    <div class="bd">Pick the cards you actually hold — the whole app works off that list.</div>
    <div style="margin-top:12px"><button class="go" id="es-go">Choose your cards</button></div></div>`;
  el("es-go").addEventListener("click", () => switchTab("cards"));
}

// ---------- Home (overview) ----------
function homeUI() {
  const U = appUser();
  const { total, byCat } = spendSummary(U.ledger);
  const rs = rewardsSummary(U, cards, offers, U.ledger, mode());
  const items = actionItems(U, cards, offers, U.ledger, new Date(), mode());

  const sevColor = (s) => (s >= 2 ? "var(--bad)" : "var(--accent)");
  const itemRows =
    items.length === 0
      ? `<div class="bd ok">All clear — nothing needs your attention right now.</div>`
      : items
          .map(
            (it) => `<div class="card" style="border-left:3px solid ${sevColor(it.sev)}; display:flex; justify-content:space-between; align-items:center; gap:10px">
              <div class="bd" style="margin:0">${it.icon} ${it.text}</div>
              <button data-tab="${it.tab}" style="background:var(--panel2); color:var(--accent); border:1px solid var(--line); border-radius:9px; padding:6px 12px; cursor:pointer; white-space:nowrap">Open →</button>
            </div>`
          )
          .join("");

  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, a]) => `<tr><td>${c}</td><td class="num">${rupee(a)}</td><td class="num meta">${total ? ((a / total) * 100).toFixed(0) : 0}%</td></tr>`)
    .join("");

  // visual spend chart (horizontal bars by share)
  const maxCat = Math.max(1, ...Object.values(byCat));
  const spendBars = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c, a]) => `<div class="hbar"><span>${c}</span><div class="track"><span style="width:${(a / maxCat) * 100}%"></span></div><b>${rupee(a)}</b></div>`)
    .join("");

  el("home").innerHTML = `
    <div class="hero">
      <h1>Earn more. <em>Burn smarter.</em></h1>
      <p>CardIQ tells you which card to swipe for every purchase — and turns your points into the most valuable flights and stays.</p>
      ${rs.leftOnTable > 0 ? `<div class="alert">💸 You left <b>${rupee(rs.leftOnTable)}</b> on the table on recent spends — let's fix that.</div>` : ""}
      <div class="cta">
        <button class="primary" data-tab="recommend">Which card should I use?</button>
        <button class="ghost" data-tab="redeem">What are my points worth?</button>
      </div>
      <div class="hero-art" aria-hidden="true">
        <svg class="route" viewBox="0 0 230 90" fill="none"><path d="M8 72 Q 96 -6 214 26" stroke="currentColor" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/><circle cx="8" cy="72" r="3.5" fill="currentColor"/><circle cx="214" cy="26" r="3.5" fill="currentColor"/></svg>
        <div class="fc fc2"><div class="hchip"></div></div>
        <div class="fc fc1"><div class="hchip"></div></div>
      </div>
    </div>

    <div class="grid grid-3">
      <div class="stat"><div class="l">${icon("chart")} Spend tracked</div><div class="v" data-count="${total}">${rupee(total)}</div></div>
      <div class="stat"><div class="l">${icon("spark")} Rewards earned</div><div class="v ok" data-count="${rs.earned}">${rupee(rs.earned)}</div></div>
      <div class="stat"><div class="l">${icon("trend")} Left on the table</div><div class="v ${rs.leftOnTable > 0 ? "leak" : "ok"}" data-count="${rs.leftOnTable}">${rupee(rs.leftOnTable)}</div></div>
    </div>

    <div class="grid grid-2">
      <div class="panel"><h2>Needs your attention <span class="meta">(${items.length})</span></h2>${itemRows}</div>
      <div class="panel"><h2>Where your money goes</h2>${spendBars || '<div class="bd">No spend tracked yet — import transactions in <b>Coach</b>.</div>'}</div>
    </div>

    ${recurringPanel(U)}

    <div class="panel"><h2>Quick actions</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button class="go" data-tab="recommend">Which card to use?</button>
        <button class="go" data-tab="plan" style="background:var(--panel2); color:var(--text); border:1px solid var(--line)">Plan spends</button>
        <button class="go" data-tab="getcard" style="background:var(--panel2); color:var(--text); border:1px solid var(--line)">Get a card</button>
        <button class="go" data-tab="redeem" style="background:var(--panel2); color:var(--text); border:1px solid var(--line)">Redeem points</button>
      </div>
    </div>`;

  el("home").querySelectorAll("button[data-tab]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  countUpAll(el("home"));
}


function recurringPanel(U) {
  const items = optimizeRecurring(detectRecurring(U.ledger), U, cards, offers, mode());
  if (!items.length) return "";
  const annualTotal = items.reduce((s, r) => s + r.annual, 0);
  const saving = items.reduce((s, r) => s + r.annualSaving, 0);
  const rows = items
    .map((r) => {
      const action = !r.hasUsed ? `use <b>${r.bestCard}</b>` : r.optimal ? `<span class="ok">✓ ${r.bestCard}</span>` : `${r.usedCardName} → <b>${r.bestCard}</b>`;
      const save = r.annualSaving > 0 ? `<span class="leak">+${rupee(r.annualSaving)}/yr</span>` : `<span class="meta">optimal</span>`;
      return `<tr><td>${r.merchant} <span class="meta">(${r.reason})</span></td><td class="num">${rupee(r.monthlyAmount)}/mo</td><td>${action}</td><td class="num">${save}</td></tr>`;
    })
    .join("");
  return `<div class="panel"><h2>Recurring & subscriptions <span class="meta">— set once, save every month</span></h2>
    <table><tr><th>Charge</th><th class="num">Amount</th><th>Best card</th><th class="num">If switched</th></tr>${rows}</table>
    <div class="bd" style="margin-top:10px">~${rupee(annualTotal)}/yr in recurring spend${saving > 0 ? ` · <span class="leak">switching saves ${rupee(saving)}/yr</span>` : ""}</div></div>`;
}

// ---------- Recommend ----------
function recommendUI() {
  el("recommend").innerHTML = `
    <div class="panel">
      <h2>🔍 Search — just type what you're buying</h2>
      <div style="display:flex; gap:8px">
        <input id="r-search" placeholder="e.g.  55k AC at croma offline   ·   1.5 lakh laptop on flipkart   ·   mmt flight to patna" />
        <button class="go" id="r-search-go" style="white-space:nowrap">Search</button>
      </div>
      <div id="r-parsed" class="hint"></div>
    </div>
    <div class="panel">
      <h2>…or pick the details</h2>
      <div class="row">
        <div><label>Amount (₹)</label><input id="r-amt" type="number" min="0" value="60000" /></div>
        <div><label>Category</label><select id="r-cat">${CATS.map((c) => `<option ${c === "appliances" ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div><label>Merchant</label><input id="r-merch" list="merchants" value="Croma" /></div>
      </div>
      <datalist id="merchants">${["Croma", "Flipkart", "Amazon", "Myntra", "SmartBuy", "BigBasket", "Swiggy", "MakeMyTrip", "Cleartrip"].map((m) => `<option>${m}</option>`).join("")}</datalist>
      <div class="chk">
        <label><input type="radio" name="chan" value="online" checked /> online</label>
        <label><input type="radio" name="chan" value="offline" /> offline</label>
        <label><input type="checkbox" id="r-portal" /> via bank portal</label>
        <label><input type="checkbox" id="r-intl" /> international</label>
      </div>
      <div class="chk">
        <label><input type="checkbox" id="r-unknown" /> 🤔 I don't know the final price yet</label>
        <span id="r-rangewrap" hidden style="display:flex; gap:8px; align-items:center">
          ₹<input id="r-lo" type="number" min="0" value="4000" style="width:90px" /> – ₹<input id="r-hi" type="number" min="0" value="9000" style="width:90px" />
        </span>
      </div>
      <button class="go" id="r-go">Recommend a card</button>
    </div>
    <div id="r-out"></div>`;

  el("r-go").addEventListener("click", runRecommend);
  el("r-unknown").addEventListener("change", (e) => {
    el("r-rangewrap").hidden = !e.target.checked;
    runRecommend();
  });
  const doSearch = () => {
    const q = parseQuery(el("r-search").value);
    if (!q) {
      el("r-parsed").textContent = "Type something like “55k AC at croma”.";
      return;
    }
    if (CATS.includes(q.category)) el("r-cat").value = q.category;
    el("r-merch").value = q.merchant || "";
    document.querySelector(`input[name="chan"][value="${q.channel}"]`).checked = true;
    el("r-portal").checked = q.viaPortal;
    el("r-intl").checked = q.isInternational;
    if (q.confident) {
      el("r-amt").value = q.amount;
      el("r-unknown").checked = false;
      el("r-rangewrap").hidden = true;
      el("r-parsed").innerHTML = `Understood: <b>${rupee(q.amount)}</b> · ${q.category}${q.merchant ? " @ " + q.merchant : ""} · ${q.channel}${q.viaPortal ? " · portal" : ""}${q.isInternational ? " · international" : ""}`;
    } else {
      el("r-unknown").checked = true;
      el("r-rangewrap").hidden = false;
      const travel = q.category === "travel";
      el("r-lo").value = travel ? 4000 : 1000;
      el("r-hi").value = travel ? 12000 : 50000;
      el("r-parsed").innerHTML = `No price yet — showing the best card across a fare range. Adjust the range if you like.`;
    }
    runRecommend();
  };
  el("r-search-go").addEventListener("click", doSearch);
  el("r-search").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  runRecommend();
}

function portalTip(txn) {
  return isTravelOTA(txn)
    ? `<div class="panel" style="border-color:var(--accent)"><div class="bd"><b>💡 Book via the bank portal, not ${txn.merchant} directly.</b> The same flight through SmartBuy / Travel Edge earns far more (tick “via bank portal” to compare).</div></div>`
    : "";
}

function runRecommend() {
  const U = appUser();
  const txn = {
    amount: num(el("r-amt").value),
    category: el("r-cat").value,
    merchant: el("r-merch").value.trim(),
    channel: document.querySelector('input[name="chan"]:checked').value,
    viaPortal: el("r-portal").checked,
    isInternational: el("r-intl").checked,
    label: "purchase",
  };

  if (el("r-unknown").checked) {
    const lo = num(el("r-lo").value);
    const hi = Math.max(lo, num(el("r-hi").value, lo));
    if (hi <= 0) {
      el("r-out").innerHTML = `<div class="panel"><div class="bd warn">Enter a price range to analyse.</div></div>`;
      return;
    }
    const res = analyzeRange(txn, cards, U, offers, mode(), lo, hi);
    const bands = res.bands.map((b) => `<tr><td>${rupee(b.from)} – ${rupee(b.to)}</td><td><b>${b.name}</b></td><td class="num">${b.pctLo.toFixed(1)}–${b.pctHi.toFixed(1)}%</td></tr>`).join("");
    el("r-out").innerHTML =
      portalTip(txn) +
      `<div class="panel">
        <h2>You don't need the final price</h2>
        <div class="card best"><div class="top"><div class="name">Use ${res.stable.name}</div><div class="val">${res.stable.steadyPct.toFixed(1)}% <small>value</small></div></div>
        <div class="bd">${res.priceIndependent ? "Same best card across the whole " + rupee(lo) + "–" + rupee(hi) + " range — the % doesn't depend on the exact fare." : "The winner changes by price — see the bands below."}</div></div>
        ${res.priceIndependent ? "" : `<h2 style="margin-top:8px">Winner by price band</h2><table><tr><th>Fare</th><th>Use</th><th class="num">value</th></tr>${bands}</table>`}
      </div>`;
    return;
  }

  if (txn.amount <= 0) {
    el("r-out").innerHTML = `<div class="panel"><div class="bd warn">Enter an amount above ₹0 (or tick “I don't know the final price”).</div></div>`;
    return;
  }

  const ranked = new WalletState(U).rank(cards, txn, offers, mode());
  el("r-out").innerHTML =
    portalTip(txn) +
    ranked
      .map((r, i) => {
        const bd = r.breakdown.map((b) => `<div>${b.replace("⭐", '<span class="star">⭐</span>')}</div>`).join("");
        const warn = r.warnings.map((w) => `<div class="warn">⚠️ ${w}</div>`).join("");
        const delta = i === 0 ? "" : ` · ${rupee(ranked[0].value - r.value)} less than best`;
        return `<div class="card ${i === 0 ? "best" : ""}">
          <div class="top">
            <div class="name" style="display:flex; align-items:center; gap:11px">${cardChip(r.cardId)}<span>${r.name}${i === 0 ? '<span class="badge">USE THIS</span>' : ""}${r.milestoneINR > 0 ? ' <span class="star">⭐</span>' : ""}</span></div>
            <div class="val">${rupee(r.value)} <small>(${r.pct.toFixed(1)}%)${delta}</small></div>
          </div>
          <div class="bd">${bd}${warn}</div>
        </div>`;
      })
      .join("");
}

// ---------- Plan ----------
function planUI() {
  el("plan").innerHTML = `
    <div class="panel">
      <h2>📅 Plan your upcoming spends — we route each to the best card</h2>
      <div id="p-rows"></div>
      <div style="display:flex; gap:8px; margin-top:10px">
        <button class="go" id="p-add" style="background:var(--panel2); color:var(--text); border:1px solid var(--line)">+ Add spend</button>
        <button class="go" id="p-go">Optimise plan</button>
      </div>
    </div>
    <div id="p-out"></div>`;
  drawPlanRows();
  el("p-add").addEventListener("click", () => {
    store.update("planRows", (r) => [...r, { category: "other", amount: 10000, merchant: "", channel: "online" }]);
    drawPlanRows();
  });
  el("p-go").addEventListener("click", planOptimize);
  planOptimize();
}
function drawPlanRows() {
  const rows = store.get("planRows");
  el("p-rows").innerHTML = rows
    .map(
      (r, i) => `<div class="row" style="margin-bottom:8px; align-items:end">
        <div><label>Category</label><select data-i="${i}" data-k="category">${CATS.map((c) => `<option ${c === r.category ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div><label>Amount (₹)</label><input data-i="${i}" data-k="amount" type="number" min="0" value="${r.amount}" /></div>
        <div><label>Merchant</label><input data-i="${i}" data-k="merchant" value="${r.merchant || ""}" /></div>
        <div><label>&nbsp;</label><button data-rm="${i}" style="background:var(--panel2); color:var(--bad); border:1px solid var(--line); border-radius:9px; padding:9px">✕</button></div>
      </div>`
    )
    .join("");
  el("p-rows").querySelectorAll("[data-k]").forEach((inp) =>
    inp.addEventListener("change", (e) => {
      const i = +e.target.dataset.i, k = e.target.dataset.k;
      store.update("planRows", (rs) => {
        rs[i][k] = k === "amount" ? num(e.target.value) : e.target.value;
        if (k === "merchant") rs[i].viaPortal = /smartbuy|edge/i.test(e.target.value);
        return rs;
      });
    })
  );
  el("p-rows").querySelectorAll("[data-rm]").forEach((b) =>
    b.addEventListener("click", (e) => {
      store.update("planRows", (rs) => (rs.splice(+e.target.dataset.rm, 1), rs));
      drawPlanRows();
    })
  );
}
function planOptimize() {
  const U = appUser();
  const items = store.get("planRows").filter((r) => num(r.amount) > 0);
  if (!items.length) {
    el("p-out").innerHTML = `<div class="panel"><div class="bd warn">Add at least one spend with an amount above ₹0.</div></div>`;
    return;
  }
  const plan = planAllocation(items, cards, U, offers, mode());

  // group by CARD (card-primary): "put these purchases on this card"
  const byCard = {};
  for (const a of plan.allocations) {
    const g = (byCard[a.cardId] ??= { name: a.card, cardId: a.cardId, items: [], total: 0, milestone: 0 });
    g.items.push(a);
    g.total += a.value;
    g.milestone += a.milestoneINR;
  }
  const cardCards = Object.values(byCard)
    .sort((x, y) => y.total - x.total)
    .map(
      (g) => `<div class="card">
        <div class="top">
          <div class="name" style="display:flex; align-items:center; gap:11px">${cardChip(g.cardId)}<span>${g.name}</span></div>
          <div class="val ok">${rupee(g.total)} <small>back</small></div>
        </div>
        <div class="bd">${g.items.map((a) => `<div>${rupee(a.item.amount)} · ${a.item.merchant || a.item.category}</div>`).join("")}</div>
        ${g.milestone > 0 ? `<div class="bd"><span class="star">⭐ includes ${rupee(g.milestone)} one-time milestone bonus</span></div>` : ""}
      </div>`
    )
    .join("");

  const plannedSpend = items.reduce((s, r) => s + num(r.amount), 0);
  const totalMilestone = plan.allocations.reduce((s, a) => s + a.milestoneINR, 0);
  const everydayRate = ((plan.totalValue - totalMilestone) / plannedSpend) * 100;
  const ms = plan.milestones.map((m) => `<div class="bd ok">⭐ ${m.card}: unlocks ${m.label} (~${rupee(m.valueINR)})</div>`).join("");
  const fw = plan.fees.map((f) => `<div class="bd ok">💳 ${f.card}: annual fee ₹${f.fee.toLocaleString("en-IN")} gets waived</div>`).join("");
  const nudge = plan.nudges.map((n) => `<div class="bd warn">↗ ${n.card}: add ${rupee(n.gap)} → ${n.label}${n.reward ? ` (+${n.reward} pts)` : ""}</div>`).join("");
  el("p-out").innerHTML = `
    <div class="panel"><h2>Put each purchase on the right card</h2>${cardCards}
      <div style="margin-top:14px; display:flex; gap:28px; flex-wrap:wrap">
        <div>Planned spend<br><span class="total">${rupee(plannedSpend)}</span></div>
        <div>Value back<br><span class="total ok">${rupee(plan.totalValue)}</span></div>
        <div>Everyday rate<br><span class="total">${everydayRate.toFixed(1)}%</span></div>
        ${totalMilestone > 0 ? `<div>One-time bonuses<br><span class="total star">${rupee(totalMilestone)}</span></div>` : ""}
      </div>
      ${totalMilestone > 0 ? `<div class="hint">"Everyday rate" excludes one-time milestone bonuses, so it's the repeatable return — not inflated by a single milestone.</div>` : ""}
    </div>
    ${ms || fw ? `<div class="panel"><h2>Unlocked by this plan</h2>${ms}${fw}</div>` : ""}
    ${nudge ? `<div class="panel"><h2>Push a little further</h2>${nudge}</div>` : ""}`;
}

// ---------- Wallet ----------
function walletUI() {
  const U = appUser();
  const valRows = Object.entries(currencies)
    .map(([code, c]) => `<tr><td>${c.name}</td><td class="num">₹${c.best.toFixed(2)}</td><td class="num">₹${c.typical.toFixed(2)}</td><td class="num">₹${c.floor.toFixed(2)}</td></tr>`)
    .join("");

  const cardRows = U.cards
    .map((id) => {
      const c = byId[id];
      const cur = c.reward.currency;
      const spent = U.spendToDate?.[id] ?? 0;
      const bal = U.pointsBalance?.[id];
      let html = `<div class="card"><div class="top"><div class="name" style="display:flex; align-items:center; gap:11px">${cardChip(id)}<span>${c.name}</span></div><div class="meta">${c.issuer} · ${c.network}</div></div>`;
      if (bal != null && cur !== "CASHBACK")
        html += `<div class="bd">Balance: <b>${bal.toLocaleString("en-IN")}</b> ${currencies[cur].name} ≈ <b>${rupee(bal * valuePerUnit(cur, mode()))}</b> <span class="meta">(${MODE_LABEL[mode()]} value)</span></div>`;
      const next = (c.milestones ?? []).find((m) => spent < m.threshold);
      if (next) {
        const pct = Math.min(100, (spent / next.threshold) * 100);
        html += `<div class="bd">Milestone → ${rupee(next.threshold - spent)} to ${next.label} (~${rupee(next.rewardUnits * valuePerUnit(cur, mode()))})<div class="bar"><span style="width:${pct}%"></span></div></div>`;
      } else if (c.milestones?.length) html += `<div class="bd ok">Milestones cleared 🎉</div>`;
      if (c.feeWaiverSpend > 0) {
        const pct = Math.min(100, (spent / c.feeWaiverSpend) * 100);
        const status = spent >= c.feeWaiverSpend ? '<span class="ok">fee waived ✓</span>' : `${rupee(c.feeWaiverSpend - spent)} more to waive ₹${c.annualFee.toLocaleString("en-IN")}`;
        html += `<div class="bd">Fee waiver → ${status}<div class="bar"><span style="width:${pct}%"></span></div></div>`;
      } else html += `<div class="bd">${c.annualFee ? "₹" + c.annualFee.toLocaleString("en-IN") + "/yr (no waiver)" : "lifetime free"}</div>`;
      const exp = U.expiring?.find((e) => e.card === id);
      if (exp) html += `<div class="bd warn">⚠️ ${exp.units.toLocaleString("en-IN")} ${currencies[cur].name} expire in ${exp.days} days</div>`;
      const benefits = [`forex ${c.forexMarkupPct}%`];
      if (c.lounge) benefits.push(`lounge: ${c.lounge.domestic} dom / ${c.lounge.international} intl`);
      html += `<div class="bd meta">Benefits: ${benefits.join(" · ")}</div>`;
      const bestPtVal = bal != null && cur !== "CASHBACK" ? bal * valuePerUnit(cur, mode()) : 0;
      let verdict;
      if (c.annualFee === 0) verdict = `<span class="ok">KEEP — lifetime free</span>`;
      else if (c.feeWaiverSpend > 0 && spent >= c.feeWaiverSpend) verdict = `<span class="ok">KEEP — fee already waived this year</span>`;
      else if (c.feeWaiverSpend > 0) verdict = `<span class="warn">SPEND ${rupee(c.feeWaiverSpend - spent)} more to break even on the ₹${c.annualFee.toLocaleString("en-IN")} fee</span>`;
      else verdict = bestPtVal >= c.annualFee ? `<span class="ok">KEEP — points on hand (${rupee(bestPtVal)}) exceed the ₹${c.annualFee.toLocaleString("en-IN")} fee</span>` : `<span class="warn">REVIEW — ₹${c.annualFee.toLocaleString("en-IN")} fee, no spend waiver</span>`;
      html += `<div class="bd">Verdict: ${verdict}</div>`;
      return html + `</div>`;
    })
    .join("");

  const catList = [
    { category: "travel", merchant: "smartbuy", channel: "online", viaPortal: true },
    { category: "electronics", merchant: "flipkart", channel: "online" },
    { category: "appliances", merchant: "croma", channel: "offline" },
    { category: "grocery", merchant: "bigbasket", channel: "online" },
    { category: "dining", merchant: "swiggy", channel: "online" },
  ];
  const catRows = catList
    .map((cat) => {
      const top = new WalletState(U).rank(cards, { ...cat, amount: 10000, label: cat.category }, offers, mode()).sort((a, b) => b.steady - a.steady)[0];
      return `<tr><td>${cat.category}</td><td>${top.name}</td><td class="num">${rupee(top.steady)} (${top.steadyPct.toFixed(1)}%)</td></tr>`;
    })
    .join("");

  const faces = U.cards.map((id) => byId[id] && cardFace(byId[id])).filter(Boolean).join("");
  el("wallet").innerHTML = `
    <div class="panel"><h2>${icon("card")} Your wallet <span class="meta">(${U.cards.length} cards)</span></h2>
      <div class="cardgrid">${faces || '<div class="bd">No cards yet — add some in ⚙ Cards.</div>'}</div></div>
    <div class="panel"><h2>₹/point valuation</h2>
      <table><tr><th>Currency</th><th class="num">best</th><th class="num">typical</th><th class="num">floor</th></tr>${valRows}</table></div>
    <div class="panel"><h2>Card details</h2>${cardRows}</div>
    <div class="panel"><h2>Best card by category <span class="meta">(everyday value per ₹10,000)</span></h2>
      <table><tr><th>Category</th><th>Use</th><th class="num">value</th></tr>${catRows}</table></div>`;
  attachCardTilt(el("wallet"));
}

// ---------- Redeem (burn optimiser) ----------
function redeemUI() {
  const U = appUser();
  const holdings = U.cards
    .map((id) => ({ id, bal: U.pointsBalance?.[id] }))
    .filter((x) => x.bal > 0 && byId[x.id] && byId[x.id].reward.currency !== "CASHBACK");

  if (!holdings.length) {
    el("redeem").innerHTML = `<div class="panel"><h2>Redeem points</h2>
      <div class="bd">No transferable point balances yet. (Cashback cards pay out directly at ₹1/pt — nothing to optimise.)</div>
      <div class="hint">Balances live per profile; the demo profile carries HDFC & Axis points.</div></div>`;
    return;
  }

  let bestTotal = 0, cashTotal = 0;
  const sections = holdings
    .map(({ id, bal }) => {
      const cur = byId[id].reward.currency;
      const plan = redemptionPlan(cur, bal);
      bestTotal += plan.best.inr;
      cashTotal += Math.round(bal * valuePerUnit(cur, "floor"));
      const pathRows = plan.paths
        .map((p, i) => `<tr><td>${p.path}</td><td class="num">₹${p.value.toFixed(2)}/pt</td><td class="num ${i === 0 ? "ok" : i === plan.paths.length - 1 ? "leak" : ""}">${rupee(p.inr)}</td></tr>`)
        .join("");
      const partners = plan.partners.length
        ? `<div class="bd" style="margin-top:6px">Transfer partners</div><div>${plan.partners.map(loyaltyChip).join("")}</div>`
        : "";

      // goal-based: what concrete awards these points can buy
      const goals = reachableAwards(bal, plan.partners);
      const reach = goals.filter((g) => g.count > 0).slice(0, 3);
      const near = goals.filter((g) => g.count === 0).sort((a, b) => a.gap - b.gap)[0];
      const goalHTML = `<div class="bd" style="margin-top:8px"><b>🎯 What you can actually get</b></div>` +
        (reach.length
          ? reach.map((g) => `<div class="bd" style="display:flex; align-items:center; gap:4px; flex-wrap:wrap">${routeChip(g.award)} ${g.award.name} via ${g.program}${g.count > 1 ? ` ×${g.count}` : ""} <span class="meta">— worth ~${rupee(g.award.cashINR * g.count)}</span></div>`).join("")
          : `<div class="bd meta">Not enough for a full award yet — keep earning.</div>`) +
        (near ? `<div class="bd meta">Almost: ${near.gap.toLocaleString("en-IN")} more ${near.program} miles → ${near.award.name}</div>` : "") +
        (reach[0] ? `<div class="hint" style="margin-top:4px"><a href="${seatLink(reach[0].program)}" target="_blank" rel="noopener">Check ${reach[0].program} award seats ↗</a></div>` : "");

      return `<div class="panel">
        <h2>${byId[id].name} — ${bal.toLocaleString("en-IN")} ${plan.name}</h2>
        <div class="card best"><div class="top"><div class="name">Best: ${plan.best.path}</div><div class="val ok">${rupee(plan.best.inr)}</div></div>
          <div class="bd leak">Avoid ${plan.worst.path} → only ${rupee(plan.worst.inr)} (you'd lose ${rupee(plan.best.inr - plan.worst.inr)}).</div></div>
        ${goalHTML}
        <table style="margin-top:8px"><tr><th>How you burn them</th><th class="num">₹/pt</th><th class="num">Value</th></tr>${pathRows}</table>
        ${partners}
      </div>`;
    })
    .join("");

  const spread = bestTotal - cashTotal;
  el("redeem").innerHTML = `
    <div class="panel"><h2>Your points, redeemed smartly</h2>
      <div style="display:flex; gap:28px; flex-wrap:wrap; margin-top:4px">
        <div>Best-case value<br><span class="total ok">${rupee(bestTotal)}</span></div>
        <div>If you cash out<br><span class="total">${rupee(cashTotal)}</span></div>
        <div>Spread to capture<br><span class="total leak">${rupee(spread)}</span></div>
      </div>
      <div class="hint" style="margin-top:6px">Same points — up to ${rupee(spread)} more value depending on <i>how</i> you burn them. Transfer to airline/hotel partners beats cashback.</div>
      <div class="hint">We rank by <b>value</b>, not live seat availability — confirm award seats before transferring. <span class="meta">Transfer data verified ${DATA_VERIFIED}.</span></div>
    </div>
    <div class="panel"><h2>🎯 Path to a goal</h2>
      <label>Pick a target award</label>
      <select id="goal-sel">${AWARDS.map((a, i) => `<option value="${i}">${a.name} — ${a.program} (${a.miles.toLocaleString("en-IN")} mi)</option>`).join("")}</select>
      <div id="goal-out" style="margin-top:10px"></div>
    </div>${sections}`;
  el("goal-sel").addEventListener("change", goalAnalyse);
  goalAnalyse();
}
function goalAnalyse() {
  const U = appUser();
  const award = AWARDS[Number(el("goal-sel").value) || 0];
  const plan = planForGoal(award, U, cards);
  const monthly = Object.values(store.get("monthlySpend") || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  let body;
  if (plan.reachableNow) {
    body = `<div class="card best"><div class="bd ok">✓ You can book this now — you hold ${plan.currentMiles.toLocaleString("en-IN")} ${award.program} miles (need ${award.miles.toLocaleString("en-IN")}). Worth ~${rupee(award.cashINR)}.</div></div>`;
  } else if (!plan.best) {
    body = `<div class="bd warn">None of your cards earn ${award.program} miles well. You have ${plan.currentMiles.toLocaleString("en-IN")} — a card that transfers to ${award.program} would unlock this.</div>`;
  } else {
    const months = monthly > 0 ? Math.ceil(plan.spendNeeded / monthly) : null;
    body = `
      <div class="bd">You already have <b>${plan.currentMiles.toLocaleString("en-IN")}</b> of ${award.miles.toLocaleString("en-IN")} ${award.program} miles · gap <b>${plan.gap.toLocaleString("en-IN")}</b>.</div>
      <div class="card best"><div class="bd">Fastest route: put spend on <b>${plan.best.cardName}</b> → earns ~${plan.best.milesPer100.toFixed(1)} ${award.program} miles per ₹100 (via ${plan.best.ratio} transfer).</div>
        <div class="bd ok">Spend <b>${rupee(plan.spendNeeded)}</b> more to unlock it${months ? ` — ≈ <b>${months} month${months > 1 ? "s" : ""}</b> at your ~${rupee(monthly)}/mo` : ""}. Award worth ~${rupee(award.cashINR)}.</div></div>`;
  }
  el("goal-out").innerHTML = `<div class="bd" style="margin-bottom:8px; display:flex; align-items:center; gap:6px; flex-wrap:wrap">${routeChip(award)} <b>${award.name}</b> · ${award.program}</div>` + body + `<div class="hint" style="margin-top:8px">Award seats are limited and not guaranteed — <a href="${seatLink(award.program)}" target="_blank" rel="noopener">check ${award.program} availability ↗</a> before you transfer.</div>`;
}

// ---------- Coach ----------
function coachUI() {
  el("coach").innerHTML = `
    <div class="panel"><h2>Import transactions (paste bank SMS)</h2>
      <textarea id="c-sms" placeholder="Rs.4200 spent on HDFC Bank Card x1234 at BIGBASKET on 02-06-26&#10;Spent Rs 38000 on ICICI Bank Card XX5678 at MAKEMYTRIP"></textarea>
      <div class="hint">Paste one or more real transaction SMS. We parse amount, merchant, category & card.</div>
      <div style="margin-top:10px; display:flex; gap:8px">
        <button class="go" id="c-import">Import & analyse</button>
        <button class="go" id="c-clear" style="background:var(--panel2); color:var(--bad); border:1px solid var(--line)">Clear imported</button>
      </div>
    </div>
    <div class="panel"><h2>Or upload a statement CSV</h2>
      <div class="row">
        <div><label>Statement is for</label><select id="c-csv-card">${appUser().cards.map((id) => `<option value="${id}">${byId[id].name}</option>`).join("")}</select></div>
        <div><label>CSV file</label><input type="file" id="c-csv-file" accept=".csv,text/csv" /></div>
      </div>
      <div class="hint">Columns: <code>date, amount, merchant</code> (category & channel optional). <a id="c-csv-sample" href="#">Download sample</a></div>
      <div id="c-csv-status" class="hint"></div>
    </div>
    <div id="c-out"></div>`;
  el("c-import").addEventListener("click", () => {
    const U = appUser();
    const parsed = parseSMS(el("c-sms").value).filter((t) => t.usedCard && U.cards.includes(t.usedCard) && t.amount > 0);
    if (!parsed.length) {
      el("c-out").innerHTML = `<div class="panel"><div class="bd warn">Couldn't parse any transactions for your selected cards. Check the SMS format / that you hold the card.</div></div>` + el("c-out").innerHTML;
      return;
    }
    store.update("ledger", (l) => [...l, ...parsed]);
    el("c-sms").value = "";
    coachAnalyse();
  });
  el("c-clear").addEventListener("click", () => {
    store.set("ledger", []);
    coachAnalyse();
  });

  // CSV statement upload — a statement is for ONE card, so we stamp the chosen card.
  el("c-csv-file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const cardId = el("c-csv-card").value;
        const rows = parseCSV(String(reader.result))
          .filter((t) => t.amount > 0)
          .map((t) => ({ ...t, usedCard: t.usedCard && appUser().cards.includes(t.usedCard) ? t.usedCard : cardId, source: "csv" }));
        if (!rows.length) {
          el("c-csv-status").innerHTML = `<span class="warn">No valid rows found — check the columns (date, amount, merchant).</span>`;
          return;
        }
        store.update("ledger", (l) => [...l, ...rows]);
        el("c-csv-status").innerHTML = `<span class="ok">Imported ${rows.length} transactions from statement.</span>`;
        el("c-csv-file").value = "";
        coachAnalyse();
      } catch (err) {
        el("c-csv-status").innerHTML = `<span class="warn">Couldn't parse CSV: ${String(err.message || err)}</span>`;
      }
    };
    reader.readAsText(file);
  });
  el("c-csv-sample").addEventListener("click", (e) => {
    e.preventDefault();
    const csv = "date,amount,merchant,channel\n2026-06-03,4200,BigBasket,online\n2026-06-07,1800,Swiggy,online\n2026-06-11,52000,Croma,offline\n2026-06-14,7500,Indigo,online";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "sample-statement.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  coachAnalyse();
}
function coachAnalyse() {
  const U = appUser();
  const m = mode();
  const sorted = [...U.ledger].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!sorted.length) {
    el("c-out").innerHTML = `<div class="panel"><div class="bd">No transactions yet. Paste some bank SMS above to see where you're leaving money on the table.</div></div>`;
    return;
  }
  const actual = new WalletState(U);
  const optimal = new WalletState(U);
  let totalRegret = 0;
  const byCat = {};
  const rows = sorted.map((t) => {
    const usable = byId[t.usedCard] && U.cards.includes(t.usedCard);
    const best = optimal.rank(cards, t, offers, m)[0];
    const used = usable ? actual.quote(byId[t.usedCard], t, offers, m) : { name: t.usedCard || "—", value: 0 };
    if (usable) {
      optimal.commit(byId[best.cardId], t, offers, m);
      actual.commit(byId[t.usedCard], t, offers, m);
    }
    const regret = best.value - used.value;
    const optimalUsed = best.cardId === t.usedCard || regret <= 0.5;
    if (!optimalUsed) {
      totalRegret += regret;
      byCat[t.category] = (byCat[t.category] ?? 0) + regret;
    }
    return `<tr><td>${t.date || "—"}</td><td>${rupee(t.amount)}</td><td>${t.merchant || t.category}</td><td>${used.name}</td><td>${optimalUsed ? '<span class="ok">✓ optimal</span>' : best.name + (best.milestoneINR > 0 ? " ⭐" : "")}</td><td class="num">${optimalUsed ? "—" : '<span class="leak">' + rupee(regret) + "</span>"}</td></tr>`;
  });
  const fixes = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const top = new WalletState(U).rank(cards, { category: cat, amount: 10000, channel: "online", label: cat }, offers, m).sort((a, b) => b.steady - a.steady)[0];
      return `<tr><td>${cat}</td><td>${top.name}</td><td class="num leak">${rupee(amt)}</td></tr>`;
    })
    .join("");
  const nudges = U.cards
    .map((id) => {
      const c = byId[id];
      const spent = U.spendToDate?.[id] ?? 0;
      const next = (c.milestones ?? []).find((mm) => spent < mm.threshold);
      return next ? `<div class="bd">• <b>${c.name}</b>: spend ${rupee(next.threshold - spent)} more → ${next.label} (+${next.rewardUnits} pts)</div>` : "";
    })
    .filter(Boolean)
    .join("");
  el("c-out").innerHTML = `
    <div class="panel"><h2>Transaction review (${sorted.length})</h2>
      <table><tr><th>Date</th><th>Amt</th><th>Where</th><th>Used</th><th>Best</th><th class="num">Lost</th></tr>${rows.join("")}</table>
      <div style="margin-top:14px">Money left on the table: <span class="total leak">${rupee(totalRegret)}</span></div>
    </div>
    ${fixes ? `<div class="panel"><h2>Fix your defaults</h2><table><tr><th>Category</th><th>Switch to</th><th class="num">Lost</th></tr>${fixes}</table></div>` : ""}
    ${nudges ? `<div class="panel"><h2>Milestone nudges</h2>${nudges}</div>` : ""}`;
}

// ---------- Get a card (acquisition advisor) ----------
function getCardUI() {
  const U = appUser();
  const monthly = store.get("monthlySpend");
  const inputs = Object.entries(monthly)
    .map(([cat, v]) => `<div><label>${cat} /month</label><input type="number" min="0" data-cat="${cat}" value="${v}" /></div>`)
    .join("");

  el("getcard").innerHTML = `
    <div class="panel">
      <h2>＋ Which card should you get next?</h2>
      <div class="bd">Set your rough monthly spend per category — we find the card that adds the most, net of its fee.</div>
      <div class="row" style="margin-top:10px">${inputs}</div>
      <div class="hint" id="gc-total"></div>
    </div>
    <div id="gc-out"></div>`;

  el("getcard").querySelectorAll("input[data-cat]").forEach((inp) =>
    inp.addEventListener("input", () => {
      store.update("monthlySpend", (m) => ({ ...m, [inp.dataset.cat]: num(inp.value) }));
      gcAnalyse();
    })
  );
  gcAnalyse();
}
function gcAnalyse() {
  const U = appUser();
  const monthly = store.get("monthlySpend");
  const annual = Object.values(monthly).reduce((s, v) => s + num(v), 0) * 12;
  el("gc-total").textContent = `Annual spend modelled: ${rupee(annual)} · you hold ${U.cards.length}/${cards.length} cards`;

  if (U.cards.length >= cards.length) {
    const cats = [
      { category: "travel", merchant: "smartbuy", channel: "online", viaPortal: true },
      { category: "electronics", merchant: "flipkart", channel: "online" },
      { category: "appliances", merchant: "croma", channel: "offline" },
      { category: "grocery", merchant: "bigbasket", channel: "online" },
      { category: "dining", merchant: "swiggy", channel: "online" },
      { category: "shopping", merchant: "myntra", channel: "online" },
    ];
    const leaders = cats
      .map((c) => {
        const top = new WalletState(U).rank(cards, { ...c, amount: 10000, label: c.category }, offers, mode()).sort((a, b) => b.steady - a.steady)[0];
        return `<div class="card"><div class="meta" style="text-transform:capitalize">${c.category}</div>
          <div style="display:flex; align-items:center; gap:9px; margin-top:6px">${cardChip(top.cardId)}<b>${top.name}</b></div>
          <div class="meta" style="margin-top:4px">${top.steadyPct.toFixed(1)}% value</div></div>`;
      })
      .join("");
    el("gc-out").innerHTML = `<div class="panel"><h2>Your wallet is complete 🎉</h2>
      <div class="bd">You hold every card we track. Here's the best card to swipe in each category:</div>
      <div class="grid grid-3" style="margin-top:14px">${leaders}</div></div>`;
    return;
  }
  const profile = profileFromMonthly(monthly);
  const ranked = recommendNewCard(profile, U, cards, offers, mode());
  const cardRows = ranked
    .map((r, i) => {
      const good = r.net > 0;
      const feeNote = r.feeWaiverSpend > 0 ? `₹${r.fee.toLocaleString("en-IN")} fee, waived at ${rupee(r.feeWaiverSpend)} spend` : r.fee ? `₹${r.fee.toLocaleString("en-IN")} fee` : "lifetime free";
      return `<div class="card ${i === 0 && good ? "best" : ""}">
        <div class="top">
          <div class="name" style="display:flex; align-items:center; gap:11px">${cardChip(r.card.id)}<span>${r.card.name}${i === 0 && good ? '<span class="badge">BEST ADD</span>' : ""}</span></div>
          <div class="val ${good ? "ok" : ""}">${good ? "+" : ""}${rupee(r.net)}/yr <small>net</small></div>
        </div>
        <div class="bd">+${rupee(r.incrementalReward)}/yr extra rewards · <span class="meta">${feeNote}</span></div>
        ${r.wins.length ? `<div class="bd meta">Wins your: ${r.wins.join(", ")}</div>` : `<div class="bd meta">Doesn't beat your current cards on this spend.</div>`}
        <div style="margin-top:10px; display:flex; align-items:center; gap:10px">${applyBtn(r.card.id)}${good ? "" : '<span class="meta">not recommended for your spend</span>'}</div>
      </div>`;
    })
    .join("");
  el("gc-out").innerHTML = `<div class="panel"><h2>Ranked by net annual gain (extra rewards − fee)</h2>${cardRows}
    <p class="hint">Net assumes you pay the full fee; many waive on spend (shown). Based on everyday category value (excludes one-off milestone bonuses) and a typical merchant per category.</p></div>`;
}

// ---------- Cards (ownership) ----------
function setMembership(id, inWallet) {
  const s = new Set(store.get("selectedCards"));
  inWallet ? s.add(id) : s.delete(id);
  store.set("selectedCards", [...s]);
  cardsUI(); // re-render; every other tab recomputes from the store when opened
}
function cardsUI() {
  const sel = new Set(store.get("selectedCards"));
  const have = cards.filter((c) => sel.has(c.id));
  const avail = cards.filter((c) => !sel.has(c.id));
  // "trying this card" preview — projected annual gain for cards you don't hold
  const netOf = {};
  try {
    recommendNewCard(profileFromMonthly(store.get("monthlySpend")), appUser(), cards, offers, mode()).forEach((a) => (netOf[a.card.id] = a.net));
  } catch {}
  const tile = (c, inWallet) => {
    const net = netOf[c.id];
    const netLine = !inWallet && net != null ? `<div class="t-meta" style="margin-top:2px">${net > 0 ? `<span class="ok">+${rupee(net)}/yr if you add it</span>` : `<span class="meta">${rupee(net)}/yr on your spend</span>`}</div>` : "";
    return `<div class="card-tile" draggable="true" data-id="${c.id}">
      ${miniCard(c.id)}
      <div><div class="t-name">${c.name}</div><div class="t-meta">${c.issuer} · ${c.annualFee ? "₹" + c.annualFee.toLocaleString("en-IN") + "/yr" : "lifetime free"}</div>${netLine}</div>
      ${inWallet ? `<span class="t-move" title="remove">×</span>` : applyBtn(c.id)}
    </div>`;
  };

  el("cards").innerHTML = `
    <div class="panel"><h2>Your cards</h2>
      <div class="bd" style="margin-bottom:14px">Drag a card between the lists — or just tap it — to add or remove it. Every calculation updates instantly.</div>
      <div class="dz-wrap">
        <div class="dz" id="dz-have" data-zone="have"><h3>💳 In your wallet (${have.length})</h3><div id="have-list">${have.map((c) => tile(c, true)).join("") || '<div class="bd meta">Drag or tap cards from the right →</div>'}</div></div>
        <div class="dz" id="dz-avail" data-zone="avail"><h3>＋ Available cards (${avail.length})</h3><div id="avail-list">${avail.map((c) => tile(c, false)).join("") || '<div class="bd meta">You hold every card we track 🎉</div>'}</div></div>
      </div>
      <div style="margin-top:16px; display:flex; gap:8px">
        <button class="go" id="card-done">Done</button>
        <button class="go" id="card-reset" style="background:var(--panel2); color:var(--bad); border:1px solid var(--line)">Reset all data</button>
      </div>
      <div class="hint" style="margin-top:8px">Saved on this device.</div>
    </div>
    ${DEV ? `<div class="panel"><h2>🛰 Data platform <span class="meta">(operator view)</span></h2><div id="platform-panel"><div class="bd meta">Checking…</div></div></div>` : ""}`;

  // tap to toggle + drag handlers
  el("cards").querySelectorAll(".card-tile").forEach((t) => {
    t.addEventListener("click", (e) => {
      if (e.target.closest("[data-nomove]")) return; // Apply link — open it, don't move the card
      setMembership(t.dataset.id, !new Set(store.get("selectedCards")).has(t.dataset.id));
    });
    t.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", t.dataset.id); t.classList.add("dragging"); });
    t.addEventListener("dragend", () => t.classList.remove("dragging"));
  });
  ["dz-have", "dz-avail"].forEach((zid) => {
    const z = el(zid);
    z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("over"); });
    z.addEventListener("dragleave", () => z.classList.remove("over"));
    z.addEventListener("drop", (e) => {
      e.preventDefault();
      z.classList.remove("over");
      const id = e.dataTransfer.getData("text/plain");
      if (id) setMembership(id, z.dataset.zone === "have");
    });
  });
  el("card-done").addEventListener("click", () => switchTab("recommend"));
  el("card-reset").addEventListener("click", () => { store.reset(); el("mode").value = mode(); applyTheme(); cardsUI(); });
  if (DEV) renderPlatform();
}

async function renderPlatform() {
  const box = el("platform-panel");
  if (!box) return;
  const h = await api.health();
  if (!h) {
    box.innerHTML = `<div class="bd warn">● API offline — the app runs fully on bundled data. To enable live pulls, start it: <code>node server/server.mjs</code> (port 4322).</div>`;
    return;
  }
  const s = await api.getSources();
  const rows = Object.entries(s.sources)
    .map(([k, v]) => `<tr><td>${k}</td><td><span class="meta">${v.kind}</span></td><td class="meta">${v.legal}</td></tr>`)
    .join("");
  const log = (s.recent || []).slice(0, 5).map((r) => `<div class="bd meta">${(r.at || "").slice(11, 19)} · <b>${r.id}</b> · ${JSON.stringify(r.result).slice(0, 70)}</div>`).join("");
  const os = h.offerStats;
  box.innerHTML = `
    <div class="bd ok">● API online — ${h.cards} cards, ${h.offers} offers in the platform DB</div>
    ${os ? `<div class="bd meta">Offer lifecycle: <b>${os.active}</b> active · ${os.expired} expired (filtered) · ${os.superseded} superseded by higher-priority source</div>` : ""}
    <div class="bd">This app is using: <b>${dataSource === "platform" ? "live platform data" : "bundled data"}</b> ${dataSource === "platform" ? '<span class="ok">●</span>' : ""} <button id="pf-sync" style="margin-left:8px; background:var(--panel2); color:var(--accent); border:1px solid var(--line); border-radius:8px; padding:3px 10px; cursor:pointer">Sync now</button></div>
    <div style="margin:10px 0; display:flex; gap:10px; align-items:center"><button class="go" id="pf-scrape">Run offer scraper</button><span id="pf-status" class="meta"></span></div>
    <table><tr><th>Source</th><th>Kind</th><th>Legal posture</th></tr>${rows}</table>
    <h2 style="margin-top:14px">Recent runs</h2>${log || '<div class="bd meta">none yet</div>'}`;
  el("pf-scrape").addEventListener("click", async () => {
    el("pf-status").textContent = "scraping…";
    try {
      const r = await api.runScraper();
      el("pf-status").textContent = r.ok ? `✓ added ${r.added}, updated ${r.updated} offers` : "failed: " + (r.note || "");
      await syncFromPlatform({ silent: true }); // pull the new offers into the app
    } catch {
      el("pf-status").textContent = "failed (API offline)";
    }
    renderPlatform();
  });
  const sync = el("pf-sync");
  if (sync) sync.addEventListener("click", () => syncFromPlatform());
}

// ---------- render dispatch (with error boundary + empty state) ----------
function render() {
  const active = tabs.find((t) => !el(t).hidden) || "recommend";
  try {
    if (active !== "cards" && appUser().cards.length === 0) return emptyState(active);
    ({ home: homeUI, recommend: recommendUI, plan: planUI, wallet: walletUI, redeem: redeemUI, coach: coachUI, getcard: getCardUI, cards: cardsUI }[active])();
  } catch (err) {
    console.error(err);
    el(active).innerHTML = `<div class="panel"><h2>Something went wrong</h2><div class="bd warn">${String(err.message || err)}</div><div style="margin-top:10px"><button class="go" id="err-reset" style="background:var(--panel2); color:var(--text); border:1px solid var(--line)">Reset app data</button></div></div>`;
    const b = el("err-reset");
    if (b) b.addEventListener("click", () => { store.reset(); location.reload(); });
  }
}
render();
syncFromPlatform(); // upgrade to live platform data if the API is reachable
