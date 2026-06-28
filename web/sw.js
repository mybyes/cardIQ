// CardIQ service worker — faster repeat visits + tolerance of flaky / low-bandwidth networks.
// Bulletproof: every handler resolves to a real Response (never undefined → no nav errors).
//   • navigations (HTML)        → network-first, fall back to cache, then offline page.
//   • Google Fonts              → cache-first (immutable, the heaviest external payload).
//   • same-origin static assets → stale-while-revalidate (instant from cache, refresh behind).
//   • /api/*                    → bypass (always network, never cached).
const CACHE = "cardiq-v4";
const SHELL = ["/web/login.html", "/web/index.html", "/web/transfers.html", "/web/app.js", "/web/offline.html", "/web/fonts.css"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navigations (page loads) → network-first, cache fallback, then a graceful offline page.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return (await c.match(req)) || (await c.match("/web/offline.html")) || (await c.match("/web/login.html")) || new Response("<h1>Offline</h1>", { status: 503, headers: { "Content-Type": "text/html" } });
      }
    })());
    return;
  }

  // Google Fonts → cache-first.
  if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
      catch { return new Response("", { status: 504 }); }
    })());
    return;
  }

  if (url.origin !== location.origin) return;   // other cross-origin → browser default
  if (url.pathname.startsWith("/api/")) return; // dynamic data → always network

  // Same-origin static asset → stale-while-revalidate (always returns a Response).
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) { e.waitUntil(fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); }).catch(() => {})); return hit; }
    try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
    catch { return new Response("", { status: 504 }); }
  })());
});
