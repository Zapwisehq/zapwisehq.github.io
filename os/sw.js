/* ZAPWISE//OS service worker: keeps the app shell available offline. Live data (weather, markets) always comes
   from the network; the app keeps its own last-known copy in localStorage. */
const VER = "zapos-v1.0.1";
const SHELL = ["/os/", "/os/index.html", "/os/app.css", "/os/app.js", "/os/manifest.webmanifest",
  "/os/icon-180.png", "/os/icon-192.png", "/os/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("zapos-") && k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith("/os/")) return;
  // network first (so updates show up), cache fallback when offline
  e.respondWith(fetch(e.request).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("/os/index.html"))));
});
