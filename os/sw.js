/* ZAPWISE//OS service worker v4.13.3
   - Network-first for navigations + shell (index, app.js/css, catalog, sky, manifest).
   - Cache-first only for icons / images.
   - version.json is NEVER intercepted (always hits network for update checks).
   - skipWaiting on install; clients.claim + delete old caches on activate.
   Traffic tiles use network-first ≤2 min cache. OSM tiles stay longer offline cache. */
const VER = "zapos-v4.13.3";
const APP_VER = "4.13.3";
const SHELL = [
  "/os/",
  "/os/index.html",
  "/os/app.css?v=" + APP_VER,
  "/os/app.min.js?v=" + APP_VER,
  "/os/fonts/Rajdhani-Bold.woff2",
  "/os/fonts/Rajdhani-SemiBold.woff2",
  "/os/icon-maskable-192.png",
  "/os/icon-maskable-512.png",
  "/os/catalog.js?v=" + APP_VER,
  "/os/sky.js?v=" + APP_VER,
  "/os/access.js?v=" + APP_VER,
  "/os/manifest.webmanifest",
  "/os/icon-180.png",
  "/os/icon-192.png",
  "/os/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VER).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) {
        return k.indexOf("zapos-") === 0 && k !== VER && k !== TILE_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function put(req, r) {
  if (r && r.ok && r.type === "basic") {
    var cp = r.clone();
    caches.open(VER).then(function (c) { c.put(req, cp); }).catch(function () {});
  }
  return r;
}

function fromCache(req) {
  return caches.match(req).then(function (r) {
    return r || caches.match(req, { ignoreSearch: true });
  });
}

function networkFirst(req, fallbackUrl) {
  return new Promise(function (resolve) {
    var done = false;
    function finish(r) {
      if (!done && r) { done = true; resolve(r); return true; }
      return false;
    }
    function fallback() {
      fromCache(req).then(function (r) {
        if (r) { finish(r); return null; }
        if (fallbackUrl) return caches.match(fallbackUrl);
        return null;
      }).then(function (r2) {
        if (r2) finish(r2);
        else if (!done) { done = true; resolve(Response.error()); }
      });
    }
    var t = setTimeout(fallback, 4000);
    fetch(req).then(function (r) {
      clearTimeout(t);
      put(req, r);
      if (r && r.ok) {
        try {
          var u = new URL(req.url);
          if (u.pathname === "/os/" || /index\.html$/.test(u.pathname)) {
            caches.open(VER).then(function (c) {
              c.put("/os/", r.clone());
              c.put("/os/index.html", r.clone());
            }).catch(function () {});
          }
        } catch (e) {}
      }
      finish(r);
    }).catch(function () {
      clearTimeout(t);
      fallback();
    });
  });
}

function isShellPath(path) {
  if (path === "/os/" || path === "/os/index.html") return true;
  if (path === "/os/app.js" || path === "/os/app.min.js" || path === "/os/app.css") return true;
  if (path === "/os/catalog.js" || path === "/os/sky.js") return true;
  if (path === "/os/manifest.webmanifest") return true;
  return false;
}

function isIconPath(path) {
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path)) return true;
  if (path.indexOf("/os/icons/") === 0) return true;
  return false;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u;
  try { u = new URL(req.url); } catch (err) { return; }
  // v4.13.3: live traffic tiles — network-first, cache ≤2 min (never long-cache flow)
  if (u.hostname === "zapwise-traffic.zapwisehq.workers.dev") { e.respondWith(trafficFetch(req)); return; }
  // map tiles — keep a small offline cache (max ~600 tiles, refreshed after 7 days)
  if (/^tile\.openstreetmap\.(org|de)$/.test(u.hostname) && req.mode === "cors") { e.respondWith(tileFetch(req)); return; }
  if (u.origin !== self.location.origin || u.pathname.indexOf("/os/") !== 0) return;

  // Let the browser handle SW script + version.json (always network for updates).
  if (u.pathname === "/os/sw.js" || u.pathname === "/os/version.json") return;
  // v4.13.3: bank link + OAuth return pages always go straight to the network (never served from cache).
  if (u.pathname.indexOf("/os/link/") === 0) return;

  var isNav = req.mode === "navigate";
  if (isNav || isShellPath(u.pathname)) {
    e.respondWith(networkFirst(req, "/os/index.html"));
    return;
  }

  if (isIconPath(u.pathname)) {
    e.respondWith(fromCache(req).then(function (hit) {
      var net = fetch(req).then(function (r) { return put(req, r); }).catch(function () { return hit; });
      if (hit) {
        e.waitUntil(net.then(function () {}, function () {}));
        return hit;
      }
      return net.then(function (r) { return r || Response.error(); });
    }));
    return;
  }

  e.respondWith(networkFirst(req, null));
});

var TILE_CACHE = "zapos-tiles-v1", TILE_MAX = 600, TILE_AGE = 7 * 864e5;
var TRAF_CACHE = "zapos-traffic-v1", TRAF_AGE = 120000; /* 2 min */
function trafficFetch(req) {
  return caches.open(TRAF_CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      var aged = false;
      if (hit) {
        try {
          var t0 = hit.headers.get("sw-cached-at");
          if (t0 && (Date.now() - (+t0)) > TRAF_AGE) aged = true;
        } catch (e) { aged = true; }
      }
      var net = fetch(req).then(function (r) {
        if (r && r.ok && r.type !== "opaque") {
          try {
            var cp = r.clone();
            var h = new Headers(cp.headers);
            h.set("sw-cached-at", String(Date.now()));
            cp.blob().then(function (b) {
              c.put(req, new Response(b, { status: cp.status, statusText: cp.statusText, headers: h }));
            }).catch(function () {});
          } catch (e2) {}
        }
        return r;
      }).catch(function () { return (!aged && hit) ? hit : Response.error(); });
      if (hit && !aged) {
        /* network-first: still kick network to refresh, but return fresh-enough cache fast */
        net.catch(function () {});
        return hit;
      }
      return net;
    });
  }).catch(function () { return fetch(req); });
}
function tileFetch(req) {
  return caches.open(TILE_CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      var at = hit ? Date.parse(hit.headers.get("date") || "") || 0 : 0;
      var fresh = hit && Date.now() - at < TILE_AGE;
      var net = fetch(req).then(function (r) {
        if (r && r.ok) {
          c.put(req, r.clone()).then(function () { return c.keys(); }).then(function (ks) {
            if (ks.length > TILE_MAX) return Promise.all(ks.slice(0, ks.length - TILE_MAX).map(function (k) { return c.delete(k); }));
          }).catch(function () {});
        }
        return r;
      });
      if (fresh) return hit;
      return net.then(function (r) { return (r && r.ok) ? r : (hit || r); }).catch(function () { return hit || Response.error(); });
    });
  }).catch(function () { return fetch(req); });
}

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
