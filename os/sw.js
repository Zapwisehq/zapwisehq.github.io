/* ZAPWISE//OS service worker v3.2.0
   - install: precaches the app shell + core icons only (catalog icons lazy-cache on first use).
   - pages (/os/, index.html): network first with a 3 s timeout, then the cached copy.
   - versioned assets (?v=), icons, images, manifest, catalog.js: cache first, refreshed in background.
   Live data (weather, markets, map) is never cached here. */
const VER = "zapos-v3.2.0";
const ICONS = ["amazon", "calendar", "canva", "capcut", "cashapp", "chatgpt", "claude", "copilot", "discord", "drive", "facebook", "gemini", "gmail", "gphotos", "grok", "instagram", "linkedin", "mail", "maps", "messages", "messenger", "music", "netflix", "notes", "pandora", "perplexity", "phone", "photos", "pinterest", "podcasts", "reddit", "snapchat", "soundcloud", "spotify", "telegram", "threads", "tiktok", "twitch", "uber", "venmo", "web", "whatsapp", "x", "youtube", "ytmusic"];
const SHELL = ["/os/", "/os/index.html", "/os/app.css?v=3.2.0", "/os/app.js?v=3.2.0", "/os/catalog.js?v=3.2.0", "/os/manifest.webmanifest",
  "/os/icon-180.png", "/os/icon-192.png", "/os/icon-512.png"].concat(ICONS.map(k => "/os/icons/" + k + ".jpg"));
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("zapos-") && k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function put(req, r) { if (r && r.ok && r.type === "basic") { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; }
function fromCache(req) { return caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })); }
self.addEventListener("fetch", e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith("/os/")) return;
  const isPage = req.mode === "navigate" || u.pathname === "/os/" || u.pathname.endsWith(".html");
  if (isPage) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => fromCache(req).then(r => r || caches.match("/os/index.html")).then(r => { if (!done && r) { done = true; resolve(r); } });
      const t = setTimeout(fallback, 3000);
      fetch(req).then(r => { clearTimeout(t); put(req, r); if (!done) { done = true; resolve(r); } })
        .catch(() => { clearTimeout(t); fallback().then(() => { if (!done) { done = true; resolve(Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(fromCache(req).then(hit => {
    const net = fetch(req).then(r => put(req, r)).catch(() => hit);
    if (hit) { e.waitUntil(net.then(() => {}, () => {})); return hit; }
    return net.then(r => r || Response.error());
  }));
});
