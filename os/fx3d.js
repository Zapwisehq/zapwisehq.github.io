/* ZAPWISE//OS fx3d.js — lazy 3D layer (Three.js orb, MapLibre city, tilt, boot particles).
   Loaded after first paint. Falls back silently when Lite / no WebGL / Reduce Motion. */
(function (global) {
  "use strict";
  var VERSION = "3.12.0";
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
  var ML_JS = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js";
  var ML_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css";
  var OFM_STYLE = "https://tiles.openfreemap.org/styles/liberty";

  var state = {
    tier: "full", // full | lite
    liteForced: false,
    ready: false,
    scripts: {},
    orb: null,
    map: null,
    mapOk: false,
    tiltOn: false,
    motionOn: false,
    paused: false,
    bootDone: false
  };

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (e) { return false; }
  }

  function detectTier() {
    var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mem = navigator.deviceMemory || 8;
    var cores = navigator.hardwareConcurrency || 4;
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var low = RM || !hasWebGL() || mem <= 2 || cores <= 2 || saveData || state.liteForced;
    // battery saver hint (async — apply later)
    try {
      if (navigator.getBattery) {
        navigator.getBattery().then(function (b) {
          if (b && !b.charging && b.level <= 0.15) {
            state.liteForced = true;
            applyTier();
          }
        }).catch(function () {});
      }
    } catch (e) {}
    state.tier = low ? "lite" : "full";
    return state.tier;
  }

  function applyTier() {
    detectTier();
    var lite = state.tier === "lite" || state.liteForced;
    document.documentElement.classList.toggle("fx-lite", !!lite);
    document.documentElement.classList.toggle("fx-3d", !lite);
    if (lite) {
      pauseAll();
      teardownMap(false);
      teardownOrb(false);
    }
    return !lite;
  }

  function loadScript(url) {
    if (state.scripts[url] === "ok") return Promise.resolve();
    if (state.scripts[url] && state.scripts[url].then) return state.scripts[url];
    state.scripts[url] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = url; s.async = true; s.crossOrigin = "anonymous";
      s.onload = function () { state.scripts[url] = "ok"; res(); };
      s.onerror = function () { delete state.scripts[url]; rej(new Error("load fail " + url)); };
      document.head.appendChild(s);
    });
    return state.scripts[url];
  }

  function loadCss(url) {
    if (document.querySelector('link[data-fx3d="' + url + '"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = url; l.setAttribute("data-fx3d", url);
    document.head.appendChild(l);
  }

  /* ---------- Particle boot (canvas 2d — light) ---------- */
  function runParticleBoot(opts) {
    opts = opts || {};
    if (state.bootDone || state.tier === "lite" || state.liteForced) {
      if (opts.onDone) opts.onDone();
      return;
    }
    var host = document.getElementById("boot");
    if (!host || host.classList.contains("go")) {
      state.bootDone = true;
      if (opts.onDone) opts.onDone();
      return;
    }
    var cv = document.getElementById("bootFx");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = "bootFx";
      cv.className = "boot-fx";
      cv.setAttribute("aria-hidden", "true");
      host.insertBefore(cv, host.firstChild);
    }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = host.clientWidth || window.innerWidth;
    var H = host.clientHeight || window.innerHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    var ctx = cv.getContext("2d");
    if (!ctx) { if (opts.onDone) opts.onDone(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var text = "ZAPWISE//OS";
    var parts = [];
    var t0 = performance.now();
    var DUR = 1400;
    // seed particles into letter shapes via offscreen measure
    ctx.font = "700 28px ui-sans-serif,system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var tw = ctx.measureText(text).width;
    var ox = W / 2 - tw / 2, oy = H * 0.42;
    // sample along text width
    for (var i = 0; i < 90; i++) {
      var px = ox + (i / 89) * tw + (Math.random() - 0.5) * 6;
      var py = oy + (Math.random() - 0.5) * 22;
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        tx: px, ty: py,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        c: i % 3 === 0 ? "#f0a202" : "#3de7ff"
      });
    }
    var logo = host.querySelector(".boot-logo");
    if (logo) logo.style.opacity = "0";

    var raf = 0;
    function frame(now) {
      if (document.hidden || state.paused) { raf = requestAnimationFrame(frame); return; }
      var t = Math.min(1, (now - t0) / DUR);
      var form = t < 0.55 ? (t / 0.55) : 1;
      var disperse = t > 0.7 ? (t - 0.7) / 0.3 : 0;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var x = p.x + (p.tx - p.x) * form;
        var y = p.y + (p.ty - p.y) * form;
        if (disperse > 0) {
          x += p.vx * disperse * 80;
          y += p.vy * disperse * 80 + disperse * 40;
        }
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 1 - disperse * 0.85;
        ctx.fillRect(x, y, 2.2, 2.2);
      }
      ctx.globalAlpha = Math.min(1, form * 1.2) * (1 - disperse);
      ctx.fillStyle = "#e8fbff";
      ctx.font = "700 28px ui-sans-serif,system-ui,sans-serif";
      ctx.fillText(text, W / 2, oy);
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        state.bootDone = true;
        if (logo) logo.style.opacity = "";
        cv.remove();
        if (opts.onDone) opts.onDone();
      }
    }
    raf = requestAnimationFrame(frame);
    return function cancel() { cancelAnimationFrame(raf); state.bootDone = true; if (logo) logo.style.opacity = ""; try { cv.remove(); } catch (e) {} };
  }

  /* ---------- Card tilt + neon edge ---------- */
  var tiltBound = false;
  function bindTilt() {
    if (tiltBound || state.tier === "lite" || state.liteForced) return;
    tiltBound = true;
    var cards = document.querySelectorAll(".card.br.hud-panel");
    function setTilt(el, rx, ry) {
      el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateZ(0)";
      el.style.setProperty("--tilt-x", (ry / 8).toFixed(3));
      el.style.setProperty("--tilt-y", (-rx / 8).toFixed(3));
      el.classList.add("tilt-live");
    }
    function clearTilt(el) {
      el.style.transform = "";
      el.classList.remove("tilt-live");
    }
    cards.forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        if (state.tier === "lite" || state.liteForced || state.paused) return;
        if (!state.tiltOn) return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        setTilt(card, (-py * 7), (px * 9));
      }, { passive: true });
      card.addEventListener("pointerleave", function () { clearTilt(card); }, { passive: true });
    });
    // device orientation — only after explicit enable
    window.addEventListener("deviceorientation", function (e) {
      if (!state.motionOn || state.tier === "lite" || state.liteForced || state.paused) return;
      var beta = e.beta || 0, gamma = e.gamma || 0;
      var rx = Math.max(-8, Math.min(8, (beta - 45) * 0.15));
      var ry = Math.max(-10, Math.min(10, gamma * 0.2));
      cards.forEach(function (c) { setTilt(c, rx, ry); });
    });
  }

  function setTiltEnabled(on) { state.tiltOn = !!on; }
  function setMotionEnabled(on) {
    state.motionOn = !!on;
    if (!on) {
      document.querySelectorAll(".card.br.hud-panel").forEach(function (c) {
        c.style.transform = ""; c.classList.remove("tilt-live");
      });
    }
  }
  function requestMotionPermission() {
    return new Promise(function (res) {
      try {
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
          DeviceOrientationEvent.requestPermission().then(function (r) {
            var ok = r === "granted";
            setMotionEnabled(ok);
            res(ok);
          }).catch(function () { res(false); });
        } else {
          setMotionEnabled(true);
          res(true);
        }
      } catch (e) { res(false); }
    });
  }

  /* ---------- Parallax skyline ---------- */
  function enhanceSkyline() {
    var el = document.getElementById("skyline");
    if (!el || el.querySelector(".sky-parallax")) return;
    if (state.tier === "lite" || state.liteForced) return;
    var layer = document.createElement("div");
    layer.className = "sky-parallax";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<i class="sky-p far"></i><i class="sky-p mid"></i><i class="sky-p near"></i>';
    el.appendChild(layer);
    var ticking = false;
    window.addEventListener("pointermove", function (e) {
      if (state.tier === "lite" || state.paused || document.hidden) return;
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var cx = (e.clientX / window.innerWidth - 0.5);
        var cy = (e.clientY / window.innerHeight - 0.5);
        var far = el.querySelector(".sky-p.far");
        var mid = el.querySelector(".sky-p.mid");
        var near = el.querySelector(".sky-p.near");
        if (far) far.style.transform = "translate3d(" + (cx * -6) + "px," + (cy * -3) + "px,0)";
        if (mid) mid.style.transform = "translate3d(" + (cx * -12) + "px," + (cy * -6) + "px,0)";
        if (near) near.style.transform = "translate3d(" + (cx * -20) + "px," + (cy * -10) + "px,0)";
      });
    }, { passive: true });
  }

  /* ---------- Three.js hologram orb ---------- */
  function teardownOrb(keepHost) {
    if (state.orb) {
      try { cancelAnimationFrame(state.orb.raf); } catch (e) {}
      try { state.orb.renderer.dispose(); } catch (e) {}
      if (state.orb.canvas && state.orb.canvas.parentNode && !keepHost) {
        try { state.orb.canvas.remove(); } catch (e) {}
      }
      state.orb = null;
    }
  }

  function setOrbMood(mood) {
    if (state.orb) state.orb.mood = mood || "idle";
  }
  function setOrbLevel(n) {
    if (state.orb) state.orb.level = Math.max(0, Math.min(1, +n || 0));
  }

  function mountOrb(host) {
    if (!host || state.tier === "lite" || state.liteForced || !hasWebGL()) return Promise.resolve(false);
    if (state.orb) return Promise.resolve(true);
    return loadScript(THREE_URL).then(function () {
      if (!global.THREE) throw new Error("no THREE");
      var THREE = global.THREE;
      var wrap = host.querySelector(".zap-orb3d") || document.createElement("div");
      wrap.className = "zap-orb3d";
      wrap.setAttribute("aria-hidden", "true");
      if (!wrap.parentNode) host.insertBefore(wrap, host.firstChild);
      var w = 72, h = 72;
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      wrap.appendChild(renderer.domElement);
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.z = 3.2;
      var group = new THREE.Group();
      scene.add(group);

      var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 24, 18),
        new THREE.MeshBasicMaterial({ color: 0x3de7ff, wireframe: true, transparent: true, opacity: 0.55 })
      );
      group.add(sphere);

      var ringGeo = new THREE.TorusGeometry(1.15, 0.02, 8, 64);
      var ringMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.85 });
      var ring1 = new THREE.Mesh(ringGeo, ringMat);
      ring1.rotation.x = Math.PI / 2.4;
      group.add(ring1);
      var ring2 = new THREE.Mesh(ringGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x3de7ff, transparent: true, opacity: 0.7 }));
      ring2.rotation.x = Math.PI / 2; ring2.rotation.y = 0.4;
      ring2.scale.set(0.92, 0.92, 0.92);
      group.add(ring2);

      var verts = [];
      for (var i = 0; i < 48; i++) {
        var u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
        var r = 1.35 + Math.random() * 0.35;
        verts.push(r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v));
      }
      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x7af0ff, size: 0.045, transparent: true, opacity: 0.9 }));
      group.add(pts);

      // canvas text sprite "ZAP"
      var tc = document.createElement("canvas"); tc.width = 128; tc.height = 64;
      var tctx = tc.getContext("2d");
      tctx.fillStyle = "#ffffff"; tctx.font = "bold 36px ui-sans-serif,system-ui,sans-serif";
      tctx.textAlign = "center"; tctx.textBaseline = "middle"; tctx.fillText("ZAP", 64, 34);
      var tex = new THREE.CanvasTexture(tc);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(1.1, 0.55, 1);
      group.add(sprite);

      var orb = {
        renderer: renderer, scene: scene, camera: camera, group: group,
        sphere: sphere, ring1: ring1, ring2: ring2, pts: pts,
        canvas: renderer.domElement, wrap: wrap,
        mood: "idle", level: 0, raf: 0, t: 0
      };
      state.orb = orb;

      function loop() {
        orb.raf = requestAnimationFrame(loop);
        if (state.paused || document.hidden || state.tier === "lite") return;
        orb.t += 0.016;
        var boost = orb.mood === "speak" ? 1.8 : orb.mood === "think" ? 1.3 : orb.mood === "listen" ? 1.5 : 1;
        boost += orb.level * 1.2;
        sphere.rotation.y += 0.008 * boost;
        sphere.rotation.x += 0.003 * boost;
        ring1.rotation.z += 0.012 * boost;
        ring2.rotation.z -= 0.01 * boost;
        pts.rotation.y += 0.006 * boost;
        var s = 1 + Math.sin(orb.t * 3) * 0.02 * boost + orb.level * 0.08;
        group.scale.set(s, s, s);
        renderer.render(scene, camera);
      }
      loop();
      return true;
    }).catch(function () { return false; });
  }

  /* ---------- MapLibre 3D city ---------- */
  function teardownMap(show2d) {
    if (state.map) {
      try { state.map.remove(); } catch (e) {}
      state.map = null;
    }
    state.mapOk = false;
    var gl = document.getElementById("mapGl");
    if (gl) gl.hidden = true;
    var stage = document.getElementById("mapStage");
    if (stage && show2d !== false) stage.style.visibility = "";
    var mv = document.getElementById("mapV");
    if (mv) mv.classList.remove("map-3d");
  }

  function initMap3d() {
    if (state.mapOk || state.tier === "lite" || state.liteForced || !hasWebGL()) return Promise.resolve(false);
    var mv = document.getElementById("mapV");
    if (!mv) return Promise.resolve(false);
    var gl = document.getElementById("mapGl");
    if (!gl) {
      gl = document.createElement("div");
      gl.id = "mapGl";
      gl.className = "map-gl";
      gl.setAttribute("aria-hidden", "true");
      mv.insertBefore(gl, mv.firstChild);
    }
    loadCss(ML_CSS);
    return loadScript(ML_JS).then(function () {
      if (!global.maplibregl) throw new Error("no maplibre");
      var center = [-87.63, 41.88];
      try {
        if (global.ZAPOS && global.ZAPOS.store) {
          var g = global.ZAPOS.store.getLocal("gps", null);
          if (g && g.lat != null) center = [g.lon, g.lat];
        }
      } catch (e) {}
      var map = new global.maplibregl.Map({
        container: gl,
        style: OFM_STYLE,
        center: center,
        zoom: 15.2,
        pitch: 58,
        bearing: -18,
        attributionControl: false,
        interactive: true,
        fadeDuration: 0,
        maxPitch: 65,
        transformRequest: function (url, resType) {
          // Identify app per OpenFreeMap ToS (unique User-Agent via URL flag not possible; header limited in browser)
          return { url: url };
        }
      });
      state.map = map;
      map.on("load", function () {
        try {
          if (map.getLayer("building-3d")) {
            map.setPaintProperty("building-3d", "fill-extrusion-color", "#1a3a55");
            map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.92);
          }
          // neon accent on buildings if possible
          map.setLight({ anchor: "viewport", color: "#7af0ff", intensity: 0.35, position: [1.2, -0.4, 0.6] });
        } catch (e) {}
        state.mapOk = true;
        gl.hidden = false;
        mv.classList.add("map-3d");
        var stage = document.getElementById("mapStage");
        if (stage) stage.style.visibility = "hidden";
        // keep HTML markers on top for pins/dot
        var markers = document.getElementById("mapMarkers");
        if (markers) { markers.style.zIndex = "5"; }
      });
      map.on("error", function () { /* keep going; tiles may 404 some regions */ });
      // wire tools
      var zin = document.getElementById("mapIn");
      var zout = document.getElementById("mapOut");
      var rec = document.getElementById("mapRec");
      if (zin) zin.addEventListener("click", function () { if (state.mapOk) map.zoomIn({ duration: 300 }); });
      if (zout) zout.addEventListener("click", function () { if (state.mapOk) map.zoomOut({ duration: 300 }); });
      if (rec) rec.addEventListener("click", function () {
        try {
          var g = global.ZAPOS && global.ZAPOS.store && global.ZAPOS.store.getLocal("gps", null);
          if (g && g.lat != null) map.easeTo({ center: [g.lon, g.lat], zoom: Math.max(map.getZoom(), 15), pitch: 58, duration: 500 });
        } catch (e) {}
      });
      // attribution note
      var attr = mv.querySelector(".map-attr");
      if (attr) {
        attr.innerHTML = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OSM</a>';
      }
      return true;
    }).catch(function (err) {
      teardownMap(true);
      return false;
    });
  }

  function syncMap(opts) {
    opts = opts || {};
    if (!state.mapOk || !state.map) return false;
    if (state.paused || document.hidden) return true;
    try {
      if (opts.lat != null && opts.lon != null && opts.follow !== false) {
        var z = opts.z != null ? opts.z : state.map.getZoom();
        // MapLibre zoom roughly aligns with OSM z at street level
        state.map.easeTo({
          center: [opts.lon, opts.lat],
          zoom: typeof z === "number" ? Math.min(18, Math.max(12, z - 0.2)) : state.map.getZoom(),
          duration: opts.snap ? 0 : 400,
          pitch: 58
        });
      }
    } catch (e) {}
    return true;
  }

  function pauseAll() {
    state.paused = true;
    if (state.map) {
      try { state.map.stop(); } catch (e) {}
    }
  }
  function resumeAll() {
    state.paused = false;
    if (state.map && state.mapOk) {
      try { state.map.resize(); } catch (e) {}
    }
  }

  function setLite(on) {
    state.liteForced = !!on;
    applyTier();
    if (!state.liteForced && state.tier === "full") {
      // re-init deferred pieces
      enhanceSkyline();
      bindTilt();
      initMap3d();
    }
  }

  function init(opts) {
    opts = opts || {};
    if (opts.lite != null) state.liteForced = !!opts.lite;
    if (opts.tilt != null) state.tiltOn = !!opts.tilt;
    applyTier();
    state.ready = true;
    if (state.tier === "lite" || state.liteForced) return Promise.resolve({ tier: "lite" });
    enhanceSkyline();
    bindTilt();
    // Map after idle
    var mapP = new Promise(function (res) {
      var run = function () { initMap3d().then(res); };
      if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2200 });
      else setTimeout(run, 900);
    });
    return mapP.then(function (ok) { return { tier: state.tier, map: !!ok }; });
  }

  global.ZAPFX3D = {
    version: VERSION,
    init: init,
    detectTier: detectTier,
    applyTier: applyTier,
    setLite: setLite,
    isLite: function () { return state.tier === "lite" || state.liteForced; },
    runParticleBoot: runParticleBoot,
    mountOrb: mountOrb,
    setOrbMood: setOrbMood,
    setOrbLevel: setOrbLevel,
    setTiltEnabled: setTiltEnabled,
    setMotionEnabled: setMotionEnabled,
    requestMotionPermission: requestMotionPermission,
    initMap3d: initMap3d,
    syncMap: syncMap,
    mapReady: function () { return !!state.mapOk; },
    pause: pauseAll,
    resume: resumeAll,
    enhanceSkyline: enhanceSkyline,
    _state: state
  };
})(window);
