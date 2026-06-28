// Self-host fonts — removes the cross-origin Google round-trip on first load (and the
// privacy/GDPR exposure). Fetches Google's CSS, keeps only the latin + latin-ext subsets
// (English + ₹ etc.), downloads the woff2 to web/fonts/, and emits web/fonts.css.
// Re-run to refresh: node seo/build-fonts.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "../web");
const FONTS = join(WEB, "fonts");
mkdirSync(FONTS, { recursive: true });

// Only the weights actually used in the app (trimmed for payload).
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=JetBrains+Mono:wght@400;500&display=swap";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext"]); // English + ₹; drop greek/cyrillic/vietnamese

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

// Blocks look like:  /* latin */ @font-face { ... src: url(...woff2) ...; unicode-range: ...; }
const blockRe = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
const grab = (body, prop) => (body.match(new RegExp(prop + ":\\s*([^;]+);")) || [])[1]?.trim();
const out = [];
let kept = 0, m;
while ((m = blockRe.exec(css))) {
  const subset = m[1], body = m[2];
  if (!KEEP.has(subset)) continue;
  const family = grab(body, "font-family").replace(/['"]/g, "");
  const style = grab(body, "font-style");
  const weight = grab(body, "font-weight");
  const range = grab(body, "unicode-range");
  const url = (body.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  if (!url) continue;
  const fn = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}-${style === "italic" ? "i-" : ""}${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  writeFileSync(join(FONTS, fn), buf);
  out.push(`@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(/web/fonts/${fn}) format('woff2');unicode-range:${range}}`);
  kept++;
}
writeFileSync(join(WEB, "fonts.css"), out.join("\n") + "\n");
console.log(`self-hosted ${kept} font files → web/fonts/, wrote web/fonts.css`);
