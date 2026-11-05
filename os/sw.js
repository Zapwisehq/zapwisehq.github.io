/* ZAPWISE//OS service worker v4.9.1
   - Network-first for navigations + shell (index, app.js/css, catalog, sky, manifest).
   - Cache-first only for icons / images.
   - version.json is NEVER intercepted (always hits network for update checks).
   - skipWaiting on install; clients.claim + delete old caches on activate.
   Live data (weather, markets, cross-origin tiles) is not handled here. */
const VER = "zapos-v4.9.1";
const APP_VER = "4.9.1";
const SHELL = [
  "/os/",
  "/os/index.html",
  "/os/app.css?v=" + APP_VER,
  "/os/app.js?v=" + APP_VER,
  "/os/catalog.js?v=" + APP_VER,
  "/os/sky.js?v=" + APP_VER,
  "/os/fx3d.js?v=" + APP_VER,
  "/os/cinematic.js?v=" + APP_VER,
  "/os/cinematic.css?v=" + APP_VER,
  "/os/wallpaper.js?v=" + APP_VER,
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
        return k.indexOf("zapos-") === 0 && k !== VER;
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
  if (path === "/os/app.js" || path === "/os/app.css") return true;
  if (path === "/os/catalog.js" || path === "/os/sky.js") return true;
  if (path === "/os/wallpaper.js" || path === "/os/cinematic.js" || path === "/os/cinematic.css") return true;
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
  if (u.origin !== self.location.origin || u.pathname.indexOf("/os/") !== 0) return;

  // Let the browser handle SW script + version.json (always network for updates).
  if (u.pathname === "/os/sw.js" || u.pathname === "/os/version.json") return;

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

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
