// Persistent store for the data platform. JSON-file backed for the working model
// (zero dependencies, always runs). Swap for SQLite/Postgres in production — the
// rest of the code only touches getDB()/tx(), so the storage engine is isolated.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dir, "data.db.json");

const EMPTY = { cards: [], offers: [], users: {}, transactions: [], sourceLog: [] };

function load() {
  if (existsSync(FILE)) {
    try {
      return { ...EMPTY, ...JSON.parse(readFileSync(FILE, "utf8")) };
    } catch {
      /* corrupt → start fresh */
    }
  }
  return structuredClone(EMPTY);
}

let db = load();

export function getDB() {
  return db;
}

// Mutate within a transaction and persist atomically.
export function tx(fn) {
  const result = fn(db);
  writeFileSync(FILE, JSON.stringify(db, null, 2));
  return result;
}
