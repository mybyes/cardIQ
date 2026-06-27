// AI Concierge layer.
//
// Two modes:
//  • Deterministic (Pro)      — runs planJourney() on the user's real balances.
//  • AI / open-ended (Concierge, the top tier) — understands free-form requests.
//
// A real LLM call is metered and pricey, so it's reserved for the highest plan and
// goes through callLLM() below. For this demo we DON'T call the API — we play curated
// "scenario" results so users can see what the concierge does. Swap callLLM() for a
// real endpoint to go live.

import { planJourney } from "./transfers.mjs";

// ---- where the real model plugs in (server holds the key; model: claude-opus-4-8) ----
export async function callLLM(prompt, context) {
  // const r = await fetch("/api/concierge", { method: "POST", headers: { "content-type": "application/json" },
  //   body: JSON.stringify({ prompt, context }) });
  // if (!r.ok) throw new Error("concierge unavailable");
  // return (await r.json()).text; // server-side: Anthropic API, capped per Concierge seat
  throw new Error("LLM endpoint not configured (demo runs scenarios)");
}

const lc = (s) => String(s || "").toLowerCase();

// Open-ended "feels like an LLM" scenarios (demo). Real model would replace these.
export const SCENARIOS = [
  {
    id: "warm-dec",
    match: ["warm", "beach", "december", "winter sun", "somewhere sunny", "sun in"],
    reply: () => ({
      ai: true,
      lead: "Warm + December on points — three I'd shortlist for you:",
      blocks: [
        { t: "🏝 Phuket (via Bangkok)", b: "~30k KrisFlyer one-way economy — your HDFC points move 1:1, so it's reachable. December cash fares are ₹40k+, so points win big." },
        { t: "🏝 Bali", b: "Sweet via Singapore or KL, ~35–45k miles economy. Business shows up on SQ/Garuda if you stretch points." },
        { t: "🏜 Dubai in business", b: "55k Air India Maharaja miles = a lie-flat seat on a 3.5h hop. Huge saving vs ₹1.1L cash." },
      ],
      foot: "Want me to lock one in and show the exact transfer + shortfall? Just name it.",
    }),
  },
  {
    id: "honeymoon",
    match: ["honeymoon", "anniversary", "romantic", "couple", "partner and i", "wife", "husband"],
    reply: () => ({
      ai: true,
      lead: "A honeymoon on points — think one dreamy cabin + one standout hotel:",
      blocks: [
        { t: "✈ The flight", b: "Two business seats to the Maldives or Bali. Transfer to KrisFlyer/Air India; ~50–60k miles each one-way — start with your HDFC stack." },
        { t: "🏨 The stay", b: "5 nights on Marriott/Accor points at an overwater or beach resort — shoulder season stretches points furthest." },
        { t: "💡 The play", b: "Put the next few months of joint spend on Infinia to top up, and watch for a transfer-bonus window before you move points." },
      ],
      foot: "Tell me your dates and home airport and I'll turn this into an exact plan.",
    }),
  },
  {
    id: "new-card",
    match: ["which card should i get", "new card", "next card", "should i get", "apply for", "recommend a card"],
    reply: () => ({
      ai: true,
      lead: "Picking your next card depends on the gap in your wallet — quick read:",
      blocks: [
        { t: "If you fly a lot", b: "A premium miles card (Atlas / Infinia tier) pays back fastest — lounge access + transfer partners you'll actually use." },
        { t: "If you spend online", b: "A flat-cashback card (e.g. SBI Cashback) beats points for everyday online spend with zero thinking." },
        { t: "Watch the math", b: "A ₹12.5k fee only makes sense above ~₹6–8L annual spend. Below that, lifetime-free wins." },
      ],
      foot: "Open ‘Get a card’ for picks scored on your actual spend — or tell me your monthly spend and I'll rank them.",
    }),
  },
  {
    id: "maximise",
    match: ["maximise", "maximize", "make the most", "best strategy", "optimise everything", "what should i do"],
    reply: () => ({
      ai: true,
      lead: "Here's the 80/20 on your wallet right now:",
      blocks: [
        { t: "1 · Earn", b: "Route each spend to its best card — appliances/electronics to milestone cards, online to cashback, travel to Atlas direct (not OTAs)." },
        { t: "2 · Don't leak", b: "Use your included perks (lounge, golf, low forex) and don't let points expire — that's free value you've already paid for." },
        { t: "3 · Burn smart", b: "Hold points for transfer sweet spots (business seats) rather than cashing out at ₹0.20–0.30/pt." },
      ],
      foot: "Want me to turn this into a concrete month-by-month plan?",
    }),
  },
  {
    id: "maldives",
    match: ["maldives", "overwater", "luxury beach", "villa", "resort holiday"],
    reply: () => ({
      ai: true,
      lead: "Maldives on points — the classic high-value redemption:",
      blocks: [
        { t: "✈ Getting there", b: "Direct from DEL/BOM to MLE — ~25–35k miles each way in economy. Transfer HDFC/Axis points to a partner that flies it; business pops up on a few dates." },
        { t: "🏨 The villa", b: "Overwater villas are brutal in cash but bookable on Marriott/Accor/Hilton points — 5 nights can be worth ₹4–6L of value." },
        { t: "💡 Timing", b: "May–Nov shoulder season needs far fewer points/nights for the same villa." },
      ],
      foot: "Tell me your dates and I'll pin the cheapest points combo.",
    }),
  },
  {
    id: "europe",
    match: ["europe", "schengen", "paris", "italy", "switzerland", "spain", "amsterdam", "france"],
    reply: () => ({
      ai: true,
      lead: "Europe on points — here's how I'd approach it:",
      blocks: [
        { t: "✈ Best-value cabin", b: "Business to Europe is ~80–95k miles via Flying Blue or Qatar Avios. Watch Flying Blue Promo Rewards — they can knock 25–50% off select cities each month." },
        { t: "🛫 Route smart", b: "One-stop via DOH/IST/AUH usually opens more award space than nonstop — and Qsuite/Turkish business are excellent." },
        { t: "🏨 On the ground", b: "Accor & Marriott points stretch well outside peak summer; aim for May or September." },
      ],
      foot: "Give me a city + month and I'll find the cheapest points path.",
    }),
  },
  {
    id: "expiring",
    match: ["expir", "about to lapse", "lose my points", "points expiring", "running out"],
    reply: () => ({
      ai: true,
      lead: "Don't let them lapse — here's the rescue order:",
      blocks: [
        { t: "1 · Buy time", b: "Even a tiny transfer or redemption often resets the program's expiry clock — cheapest way to save the lot." },
        { t: "2 · Transfer, don't cash", b: "If you must move them, transfer to an airline partner (value held) rather than cashing out at ₹0.20–0.30/pt." },
        { t: "3 · Park for a goal", b: "Move to a partner where you already have a trip in mind, so they're working toward an award." },
      ],
      foot: "Tell me which points and how many, and I'll give you the exact save-it move.",
    }),
  },
  {
    id: "lounge",
    match: ["lounge", "airport lounge", "priority pass"],
    reply: () => ({
      ai: true,
      lead: "Lounge access across your wallet:",
      blocks: [
        { t: "Unlimited", b: "HDFC Infinia gives unlimited domestic + international lounge access (you + add-on) via the Priority Pass — your default for travel days." },
        { t: "Tiered", b: "Axis Atlas scales with tier (Silver→Gold→Platinum). Flipkart Axis gives 4 domestic visits/yr at ₹50k/quarter spend." },
        { t: "💡 Tip", b: "Carry the Infinia for guests too — most others cap guest visits or charge per visit." },
      ],
      foot: "Want me to flag which card to carry for a specific trip?",
    }),
  },
  {
    id: "forex",
    match: ["forex", "abroad", "international spend", "spending overseas", "markup", "foreign currency", "use abroad"],
    reply: () => ({
      ai: true,
      lead: "Spending abroad — minimise the markup:",
      blocks: [
        { t: "Lowest markup", b: "HDFC Infinia at ~2% beats most premium cards (3.5%). On a ₹2L overseas trip that's ₹3,000 saved — use it as your travel card." },
        { t: "Avoid", b: "Don't let the terminal bill you in INR (DCC) — always choose local currency to dodge a second 3–5% conversion." },
        { t: "Rewards too", b: "Infinia still earns on forex spend, so you save on markup AND earn points." },
      ],
      foot: "Heading somewhere specific? I'll tell you the best card + how to pay.",
    }),
  },
  {
    id: "first-class",
    match: ["first class", "first-class", "suites", "the residence"],
    reply: () => ({
      ai: true,
      lead: "First class is the single best use of points — here's the play:",
      blocks: [
        { t: "Aspirational sweet spots", b: "Singapore Suites and Emirates/Etihad First run ₹4–8L in cash but ~120–150k miles. The per-point value is unmatched." },
        { t: "Build the balance", b: "You'll need to pool: concentrate spend on one transferable currency (HDFC) rather than spreading thin." },
        { t: "Patience pays", b: "First-class award space opens ~330 days out or last-minute — set alerts and stay flexible on dates." },
      ],
      foot: "Pick a route and I'll estimate the miles + how far off you are.",
    }),
  },
];

// Normalise planJourney output into the concierge reply shape the UI renders.
function planToReply(p) {
  if (!p || p.kind === "unknown")
    return { ai: false, lead: "I can plan a specific trip on your points — try a destination + cabin (e.g. “business class to Singapore”) or name a card (“use my HDFC points”).", blocks: [] };
  if (p.kind === "goal-noroute")
    return { ai: false, lead: `Your cards don't transfer to ${p.goal.partner} directly. Try “business class to Singapore”, or tell me which points you hold.`, blocks: [] };

  if (p.kind === "points") {
    const blocks = [
      { t: "What you hold", b: `${p.fmt.balance} points on your ${p.card}.` },
      { t: "Best transfer", b: `→ ${p.best.to} at ${p.best.ratio} (${p.best.time}) ≈ ${p.fmt.partnerMiles} miles.${p.best.note ? " " + p.best.note : ""}` },
    ];
    if (p.goal && p.seats) blocks.push({ t: "That gets you", b: `≈ ${p.seats} ${p.goal.cabin.toLowerCase()} seat${p.seats > 1 ? "s" : ""} ${p.goal.route}.`, seat: p.goal.seat });
    return { ai: false, lead: `Best use of your ${p.program}:`, blocks };
  }

  // goal
  const { goal: g, pick, earn, fmt, alternatives } = p;
  const cover = pick.covered ? `✓ you have ${fmt.balance} — enough` : `you have ${fmt.balance}, short by ${fmt.shortfall}`;
  const blocks = [
    { t: "The award", b: `${g.air} — about ${fmt.miles} ${g.partner} miles + ${fmt.taxes} taxes (cash ≈ ${fmt.cash}).` },
    { t: "Best points to use", b: `Transfer from ${pick.card} at ${pick.ratio} → need ${fmt.sourceNeeded} ${pick.program} (${cover}). Transfer time: ${pick.time}.` },
  ];
  if (earn) blocks.push({ t: "Earn the shortfall", b: `Put about ${fmt.spend} of spend on your ${earn.card} to top up the ${fmt.shortfall} points you need.` });
  blocks.push({ t: "Book it", b: `Transfer, then book ${g.air}.`, seat: g.seat });
  return {
    ai: false,
    lead: `Here's ${g.route} in ${g.cabin} on your points:`,
    blocks,
    value: `About ${fmt.saved} of value vs paying cash.`,
    foot: alternatives && alternatives.length ? `Other routes to ${g.partner}: ${alternatives.map((a) => `${a.program.split(" ")[0]} (${a.ratio}${a.covered ? " ✓" : ""})`).join(" · ")}` : "",
  };
}

// Main entry. allowAI=true (Concierge tier) tries open-ended scenarios first.
export function aiReply(text, wallet, allowAI = true) {
  if (allowAI) {
    const s = SCENARIOS.find((x) => x.match.some((m) => lc(text).includes(m)));
    if (s) return s.reply(wallet);
  }
  const r = planToReply(planJourney(text, wallet));
  if (!allowAI && !r.blocks.length) r.upsell = true; // Pro hit an open-ended ask → nudge to Concierge
  return r;
}

// Auto-played teaser so Free/Pro users see what the AI Concierge does.
export const GLIMPSE = {
  question: "We want 10 days in Japan for our anniversary — what can our points actually get us?",
  lines: [
    "Reading your wallet — HDFC + Axis points, ✓.",
    "Best play: move HDFC points to a Star Alliance partner for a business seat DEL → Tokyo.",
    "You're ~40% of the way — I'd put your next ₹1.8L of spend on Infinia to close the gap.",
    "Stay: 5 nights on Marriott points in Kyoto, shoulder-season sweet spot.",
    "Net: ~₹3.2L of travel for points + ~₹22k taxes. Want the full step-by-step?",
  ],
};

export const CONCIERGE_CHIPS = ["Somewhere warm in December", "Honeymoon ideas on points", "Which card should I get next?", "How do I maximise my wallet?"];
