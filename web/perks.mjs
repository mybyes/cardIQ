// Hidden perks + rotating "offer of the week".
// Perks are the lesser-known benefits people forget they're paying for; offers are a
// curated weekly highlight. Both are curated/point-in-time — confirm on the issuer site.

export const PERKS_VERIFIED = "2026-06-20";

// tag: short category label. Keyed by card id (see data.mjs).
export const PERKS = {
  "hdfc-infinia": [
    { tag: "Forex", title: "Low 2% forex markup", detail: "Most premium cards charge 3.5%. On big overseas spends, Infinia quietly saves you 1.5% — use it abroad." },
    { tag: "Golf", title: "Complimentary golf games", detail: "Unlimited golf games & lessons at courses worldwide via the Visa/Diners programme — rarely used, genuinely free." },
    { tag: "Hotels", title: "SmartBuy 10X on hotels", detail: "Everyone remembers 5X flights; hotels earn 10X on SmartBuy. Book stays there, not direct." },
    { tag: "Dining", title: "Club Marriott membership", detail: "Free Club Marriott — up to 20% off dining and stays across Asia-Pacific. Worth ₹13k+ on its own." },
  ],
  "axis-atlas": [
    { tag: "Milestone", title: "Tiered milestone EDGE Miles", detail: "2,500 / 2,500 / 5,000 bonus miles at ₹3L, ₹7.5L and ₹15L annual spend — plan spends to cross a tier." },
    { tag: "Earn", title: "Direct-booking 5X only", detail: "The 5X travel rate is for DIRECT airline/hotel + Travel Edge — OTAs like MMT earn base. Book direct to triple your miles." },
    { tag: "Lounge", title: "Lounge access scales with tier", detail: "Silver→Gold→Platinum unlocks more visits. Hitting a spend tier upgrades your lounge allowance too." },
  ],
  "amazon-pay-icici": [
    { tag: "Cashback", title: "5% on Amazon, uncapped", detail: "Prime members get 5% back on Amazon with no cap and no annual fee — one of the best no-fee base cards in India." },
    { tag: "Everyday", title: "2% on Amazon Pay partners", detail: "Bharat Bill Pay, recharges and 100+ Amazon Pay merchants earn 2% — set your bills to autopay here." },
  ],
  "flipkart-axis": [
    { tag: "Partners", title: "4% on Swiggy, PVR, Uber, cult.fit", detail: "Beyond 5% on Flipkart/Cleartrip, preferred partners earn 4% — route food, movies and rides here." },
    { tag: "Lounge", title: "4 free lounge visits / year", detail: "Spend ₹50k a quarter to unlock complimentary domestic lounge access — easy to miss on a 'shopping' card." },
  ],
  "sbi-cashback": [
    { tag: "Cashback", title: "5% online, any merchant", detail: "No merchant restriction online (capped ₹5,000/mo). Auto-credited — no points, no redemption, no thinking." },
    { tag: "Fee", title: "Fee waiver at ₹2L spend", detail: "The ₹999 annual fee is reversed on ₹2L annual spend — easy to hit if it's your default online card." },
  ],
  "amex-plat-travel": [
    { tag: "Milestone", title: "Taj vouchers at ₹1.9L & ₹4L", detail: "Hitting the spend milestones unlocks Taj/IHCL stay vouchers + bonus Membership Rewards — usually the bulk of this card's value." },
    { tag: "Transfer", title: "Membership Rewards transfers", detail: "Move MR to Marriott Bonvoy 1:1 and select airlines — far better value than the rewards catalog or Pay-with-Points." },
    { tag: "Lounge", title: "Priority Pass lounge access", detail: "Complimentary domestic lounge visits via Priority Pass — keep it in your bag on travel days." },
  ],
  "hdfc-diners-black": [
    { tag: "Hotels", title: "SmartBuy 10X on hotels", detail: "Like Infinia, hotels earn 10X on SmartBuy — book stays there for outsized HDFC Reward Points." },
    { tag: "Memberships", title: "Bundled lifestyle memberships", detail: "Complimentary Swiggy One, Times Prime, Amazon Prime, MMT Black & more at milestones — easily worth the fee." },
    { tag: "Forex", title: "Low 2% forex markup", detail: "Same 2% markup as Infinia — a strong overseas card if Diners is accepted." },
  ],
  "amex-mrcc": [
    { tag: "Bonus", title: "1,000 bonus MR per 4 transactions", detail: "Make 4 spends of ≥ ₹1,500 in a statement cycle for 1,000 bonus MR — the classic trick that lifts the effective rate well above base." },
    { tag: "Transfer", title: "Same MR transfer partners", detail: "Pools into Membership Rewards — Marriott 1:1 and select airlines — at a low ₹1,500 fee." },
  ],
  "icici-sapphiro": [
    { tag: "Movies", title: "Buy-one-get-one on BookMyShow", detail: "Up to 2 free movie tickets a month (capped) — a recurring perk that quietly pays for a chunk of the fee." },
    { tag: "Dining", title: "Culinary Treats dining discounts", detail: "Up to 15% off at partner restaurants via the ICICI dining programme." },
    { tag: "Lounge", title: "Domestic + international lounge", detail: "Complimentary lounge visits (spend-linked) at Indian and select overseas airports." },
  ],
};

// Flatten the held cards' perks into a render-ready list.
export function perksForCards(ids = [], nameOf = (id) => id) {
  return ids.flatMap((id) => (PERKS[id] || []).map((p) => ({ cardId: id, cardName: nameOf(id), ...p })));
}

// Rotating curated highlight. `tab` deep-links inside the app; `link` opens out.
export const DEALS = [
  { tag: "Transfer bonus", title: "Flying Blue Promo Rewards", detail: "Air France-KLM runs monthly award discounts of 25–50% on select routes — check before you transfer HDFC/SmartBuy points.", tab: "redeem", cta: "See redemptions" },
  { tag: "Shopping", title: "Amazon Great Indian Festival", detail: "Put festival electronics on Amazon Pay ICICI for 5% back (Prime) — stack with no-cost EMI.", tab: "recommend", cta: "Best card to use" },
  { tag: "Travel", title: "Axis Travel Edge hotel bonus", detail: "Book hotels DIRECT or via Travel Edge to earn the full 5X EDGE Miles — OTAs only pay base.", tab: "recommend", cta: "Plan a booking" },
  { tag: "Milestone", title: "Push to your next Atlas tier", detail: "Closing in on ₹3L / ₹7.5L / ₹15L? A planned spend can unlock 2,500–5,000 bonus EDGE Miles.", tab: "plan", cta: "Plan spends" },
  { tag: "Redeem", title: "Singapore KrisFlyer sweet spot", detail: "SQ Saver business DEL→SIN is ~51k miles vs ₹1.5L cash — one of the best uses of HDFC/Axis points right now.", tab: "redeem", cta: "What are my points worth?" },
  { tag: "Cashback", title: "SBI Cashback weekend", detail: "Front-load online spends to hit the ₹5,000/mo 5% cashback cap before month-end.", tab: "recommend", cta: "Best card to use" },
];

export function offerOfTheWeek(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.floor((date - start) / (7 * 86400000));
  return { ...DEALS[week % DEALS.length], week: week + 1 };
}
