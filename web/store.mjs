// Single source of truth + localStorage persistence, now PROFILE-AWARE.
// Each profile (e.g. "You", "Spouse") has its own cards / transactions / spend.
// Valuation `mode` is global. Profile-scoped keys read/write the active profile,
// so the rest of the app keeps calling store.get('selectedCards') unchanged.
import { user as seed } from "../data.mjs";

const KEY = "cardiq-v1";
const PROFILE_KEYS = new Set(["selectedCards", "ledger", "planRows", "spendToDate", "monthlySpend", "pointsBalance", "expiring"]);

const DEFAULT_PLAN = [
  { category: "appliances", amount: 60000, merchant: "Croma", channel: "offline" },
  { category: "travel", amount: 45000, merchant: "SmartBuy", channel: "online", viaPortal: true },
  { category: "electronics", amount: 35000, merchant: "Flipkart", channel: "online" },
  { category: "grocery", amount: 8000, merchant: "BigBasket", channel: "online" },
];
const DEFAULT_MONTHLY = { grocery: 8000, dining: 5000, travel: 10000, electronics: 6000, shopping: 4000, appliances: 5000, fuel: 4000 };

// Seeded profile (the demo "You"); blank profile for newly added members.
const seedProfile = () => ({ selectedCards: [...seed.cards], ledger: [...seed.ledger], planRows: structuredClone(DEFAULT_PLAN), spendToDate: { ...seed.spendToDate }, monthlySpend: { ...DEFAULT_MONTHLY }, pointsBalance: { ...seed.pointsBalance }, expiring: structuredClone(seed.expiring ?? []) });
const blankProfile = () => ({ selectedCards: [...seed.cards], ledger: [], planRows: structuredClone(DEFAULT_PLAN), spendToDate: {}, monthlySpend: { ...DEFAULT_MONTHLY }, pointsBalance: {}, expiring: [] });

const defaults = () => ({ mode: "typical", theme: "light", plan: "free", activeProfile: "You", profiles: { You: seedProfile() } });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.profiles) return { ...defaults(), ...raw };
  } catch {
    /* ignore */
  }
  return defaults();
}

let state = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage disabled / full */
  }
}

function active() {
  if (!state.profiles[state.activeProfile]) state.profiles[state.activeProfile] = seedProfile();
  return state.profiles[state.activeProfile];
}

export function get(k) {
  return PROFILE_KEYS.has(k) ? active()[k] : state[k];
}
export function set(k, v) {
  if (PROFILE_KEYS.has(k)) active()[k] = v;
  else state[k] = v;
  persist();
}
export function update(k, fn) {
  set(k, fn(get(k)));
}
export function reset() {
  state = defaults();
  persist();
}

// ---- profile management ----
export const listProfiles = () => Object.keys(state.profiles);
export const activeProfile = () => state.activeProfile;
export function setActiveProfile(name) {
  if (state.profiles[name]) (state.activeProfile = name), persist();
}
export function addProfile(name) {
  name = (name || "").trim();
  if (name && !state.profiles[name]) {
    state.profiles[name] = blankProfile();
    state.activeProfile = name;
    persist();
  }
}
export function deleteProfile(name) {
  if (state.profiles[name] && Object.keys(state.profiles).length > 1) {
    delete state.profiles[name];
    if (state.activeProfile === name) state.activeProfile = Object.keys(state.profiles)[0];
    persist();
  }
}
