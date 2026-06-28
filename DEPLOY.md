# CardIQ — Deploy (Tier 0: go live, free)

One Node process serves **both the API and the web app** ([server/server.mjs](server/server.mjs)),
so a single Railway service hosts everything. ~5 minutes, free tier.

## Railway (recommended — full-stack)

1. **Push to GitHub** — already on `github.com/mybyes/cardIQ` (`master`).
2. **railway.com → New Project → Deploy from GitHub repo → `mybyes/cardIQ`.**
3. Railway auto-detects Node (Nixpacks) and uses [railway.json](railway.json):
   - start: `npm start` (→ `node server/server.mjs`)
   - healthcheck: `/api/health`
   - `PORT` is injected automatically (the server reads `process.env.PORT`).
   No build step, no config needed.
4. **Generate a domain** — Settings → Networking → *Generate Domain* (a `*.up.railway.app` URL)
   to test immediately.
5. **Custom domain** (`cardiq.app`) — Settings → Networking → add domain → create the
   **CNAME** it shows at your DNS registrar. SEO canonicals already point at `https://cardiq.app`.
6. Visit the domain → lands on the marketing page (`/` → `/web/login.html`).

That's it — the curated-data prototype is live and SEO-indexable.

### After it's live
- **Submit the sitemap** in Google Search Console: `https://cardiq.app/web/sitemap.xml`.
- Optionally set env vars (Variables tab) from [.env.example](.env.example) — none required for Tier 0.

## Vercel (alternative — static front only)
[vercel.json](vercel.json) is configured (root → landing, font cache headers). Use this only if you
host the **static** site separately; the dynamic `/api/*` (live data, server engine) needs the Node
server, so Railway is preferred for full-stack.

## Notes / caveats
- **Data persistence:** the JSON DB ([server/db.mjs](server/db.mjs)) is **ephemeral** on Railway —
  it reseeds on each deploy. Fine for the curated prototype; add a Railway Postgres/volume when you
  introduce real user data (Tier 1, see [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md)).
- **Auto-deploy:** Railway redeploys on every push to `master`.
- **Updates roll out cleanly:** HTML/JS are `no-cache`; bump `CACHE` in [web/sw.js](web/sw.js) on a
  release so the service worker refreshes cached assets.
