/* ZAPWISE//OS cinematic.js v4.0.0 — full-screen neon holographic city.
   Scroll/swipe camera fly-through; glass HUD panels stay functional.
   Tiers: high (glow sprites), mid (no glow extras), lite = caller skips init. */
(function (global) {
  "use strict";
  var VERSION = "4.0.0";
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
  var STATIONS = [
    { id: "hero", sel: "#heroCard", label: "CLOCK", cam: { x: 0, y: 14, z: 28, tx: 0, ty: 3, tz: 0 } },
    { id: "music", sel: "#hPlay", label: "MUSIC", cam: { x: 10, y: 10, z: 22, tx: 4, ty: 2, tz: -2 } },
    { id: "weather", sel: "#hWx", label: "WEATHER", cam: { x: -14, y: 12, z: 18, tx: -6, ty: 2, tz: -4 } },
    { id: "map", sel: "#hMap", label: "MAP", cam: { x: 8, y: 16, z: 12, tx: 2, ty: 1, tz: -8 } },
    { id: "places", sel: "#placesRow", label: "PLACES", cam: { x: -6, y: 9, z: 14, tx: -2, ty: 1, tz: -6 } },
    { id: "markets", sel: "#hMk", label: "MARKETS", cam: { x: 16, y: 11, z: 16, tx: 8, ty: 2, tz: -4 } },
    { id: "focus", sel: "#mFocus", label: "FOCUS", cam: { x: -12, y: 10, z: 20, tx: -4, ty: 2, tz: -2 } },
    { id: "apps", sel: "#appsSection,#appsWrap,.apps-block,#apps", label: "APPS", cam: { x: 0, y: 18, z: 32, tx: 0, ty: 4, tz: -2 } }
  ];

  var state = {
    ready: false,
    tier: "mid", // high | mid
    paused: false,
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    city: null,
    orb: null,
    path: null,
    progress: 0, // 0..1
    targetProgress: 0,
    station: 0,
    raf: 0,
    glow: [],
    intro: true,
    introT: 0,
    dpr: 1,
    mainEl: null,
    rail: null,
    hint: null,
    backBtn: null,
    dockId: null,
    reduceMotion: false,
    pointer: { x: 0, y: 0 },
    clock: 0
  };

  function loadScript(url) {
    return new Promise(function (res, rej) {
      if (global.THREE) return res(global.THREE);
      var s = document.createElement("script");
      s.src = url; s.async = true; s.crossOrigin = "anonymous";
      s.onload = function () { res(global.THREE); };
      s.onerror = function () { rej(new Error("three")); };
      document.head.appendChild(s);
    });
  }

  function detectTier() {
    var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    state.reduceMotion = RM;
    if (state.ready && !RM) return state.tier || "mid";
    var mem = navigator.deviceMemory || 8;
    var cores = navigator.hardwareConcurrency || 4;
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var lite = !!(document.documentElement.classList.contains("fx-lite") ||
      (global.ZAPFX3D && global.ZAPFX3D.getTier && global.ZAPFX3D.getTier() === "lite"));
    if (lite || RM) return "lite";
    var low = mem <= 4 || cores <= 2 || saveData || /Android|iPhone|iPad/i.test(navigator.userAgent);
    return low ? "mid" : "high";
  }

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (e) { return false; }
  }

  function ensureDom() {
    var stage = document.getElementById("zwStage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "zwStage";
      stage.className = "zw-stage";
      stage.setAttribute("aria-hidden", "true");
      document.body.insertBefore(stage, document.body.firstChild);
    }
    var canvas = stage.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "zwCanvas";
      stage.appendChild(canvas);
    }
    if (!document.getElementById("zwRail")) {
      var rail = document.createElement("nav");
      rail.id = "zwRail";
      rail.className = "zw-rail";
      rail.setAttribute("aria-label", "City stations");
      STATIONS.forEach(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", s.label);
        b.dataset.i = String(i);
        if (i === 0) b.classList.add("on");
        rail.appendChild(b);
      });
      document.body.appendChild(rail);
      state.rail = rail;
    } else state.rail = document.getElementById("zwRail");

    if (!document.getElementById("zwHint")) {
      var hint = document.createElement("div");
      hint.id = "zwHint";
      hint.className = "zw-hint on";
      hint.innerHTML = "SCROLL TO FLY · <b>TAP</b> A PANEL";
      document.body.appendChild(hint);
      state.hint = hint;
      setTimeout(function () { if (state.hint) state.hint.classList.remove("on"); }, 5200);
    } else state.hint = document.getElementById("zwHint");

    if (!document.getElementById("zwBack")) {
      var back = document.createElement("button");
      back.type = "button";
      back.id = "zwBack";
      back.className = "zw-back";
      back.textContent = "← CITY";
      back.addEventListener("click", undock);
      document.body.appendChild(back);
      state.backBtn = back;
    } else state.backBtn = document.getElementById("zwBack");

    state.mainEl = document.querySelector("main");
    return canvas;
  }

  function buildCity(THREE) {
    var root = new THREE.Group();
    root.name = "city";

    // Ground grid
    var grid = new THREE.GridHelper(220, 44, 0x1a3a55, 0x0c1524);
    grid.position.y = 0.02;
    root.add(grid);

    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    // Instanced buildings
    var N = state.tier === "high" ? 160 : 96;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    var mat = new THREE.MeshBasicMaterial({ color: 0x0e1a2e });
    var mesh = new THREE.InstancedMesh(geo, mat, N);
    var dummy = new THREE.Object3D();
    var windowGroup = new THREE.Group();
    var rng = function (a, b) { return a + Math.random() * (b - a); };
    var i, x, z, w, d, h, col;
    for (i = 0; i < N; i++) {
      // ring city around origin, leave plaza clear
      var ang = rng(0, Math.PI * 2);
      var rad = rng(10, 70);
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
      if (Math.abs(x) < 6 && Math.abs(z) < 6) { x += 12; }
      w = rng(1.4, 4.2);
      d = rng(1.4, 4.2);
      h = rng(3, state.tier === "high" ? 28 : 18);
      dummy.position.set(x, 0, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = rng(0, Math.PI * 0.15);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // neon window strip (few per building)
      if (i % 2 === 0) {
        var hue = Math.random() > 0.55 ? 0x5ce1e6 : (Math.random() > 0.5 ? 0xff4fd8 : 0xf0a202);
        var win = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.7, Math.min(h * 0.55, 8)),
          new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
        );
        win.position.set(x, h * 0.45, z + d * 0.51);
        win.lookAt(x, h * 0.45, z + d * 0.51 + 1);
        windowGroup.add(win);
        if (state.tier === "high" && i % 5 === 0) {
          var glow = new THREE.Sprite(new THREE.SpriteMaterial({
            color: hue, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false
          }));
          glow.position.set(x, h * 0.7, z);
          glow.scale.set(w * 3, h * 0.8, 1);
          state.glow.push(glow);
          windowGroup.add(glow);
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
    root.add(windowGroup);

    // Neon ring roads
    for (var r = 18; r <= 54; r += 18) {
      var curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0);
      var pts = curve.getPoints(64).map(function (p) { return new THREE.Vector3(p.x, 0.08, p.y); });
      var road = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x5ce1e6, transparent: true, opacity: 0.35 })
      );
      root.add(road);
    }

    // Central plaza hologram pad
    var pad = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.5, 0.2, 48),
      new THREE.MeshBasicMaterial({ color: 0x122038, transparent: true, opacity: 0.9 })
    );
    pad.position.y = 0.12;
    root.add(pad);
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.6, 0.06, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    root.add(ring);

    // Floating data pillars
    for (i = 0; i < 8; i++) {
      ang = (i / 8) * Math.PI * 2;
      var pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, rng(4, 9), 0.35),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5ce1e6 : 0xff4fd8, transparent: true, opacity: 0.4 })
      );
      pillar.position.set(Math.cos(ang) * 7.5, pillar.geometry.parameters.height / 2, Math.sin(ang) * 7.5);
      root.add(pillar);
    }

    // Horizon fog planes
    var fogPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 80),
      new THREE.MeshBasicMaterial({ color: 0x070b18, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    fogPlane.position.set(0, 20, -90);
    root.add(fogPlane);

    state.city = root;
    return root;
  }

  function buildOrb(THREE) {
    var group = new THREE.Group();
    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0x3de7ff, wireframe: true, transparent: true, opacity: 0.55 })
    );
    group.add(sphere);
    var r1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.03, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.9 })
    );
    r1.rotation.x = Math.PI / 2.3;
    group.add(r1);
    var r2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x5ce1e6, transparent: true, opacity: 0.75 })
    );
    r2.rotation.x = Math.PI / 2; r2.rotation.y = 0.5;
    group.add(r2);

    // ZAP label sprite
    var tc = document.createElement("canvas"); tc.width = 256; tc.height = 128;
    var ctx = tc.getContext("2d");
    ctx.fillStyle = "#e8fbff"; ctx.font = "bold 72px ui-sans-serif,system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ZAP", 128, 70);
    var tex = new THREE.CanvasTexture(tc);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(2.2, 1.1, 1);
    group.add(spr);

    if (state.tier === "high") {
      var aura = new THREE.Sprite(new THREE.SpriteMaterial({
        color: 0x5ce1e6, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      aura.scale.set(6, 6, 1);
      group.add(aura);
    }

    group.position.set(0, 4.2, 0);
    state.orb = { group: group, sphere: sphere, r1: r1, r2: r2 };
    return group;
  }

  function buildPath(THREE) {
    var pts = STATIONS.map(function (s) {
      return new THREE.Vector3(s.cam.x, s.cam.y, s.cam.z);
    });
    // smooth path through station cameras
    state.path = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
    return state.path;
  }

  function stationEl(st) {
    if (!st) return null;
    var parts = st.sel.split(",");
    for (var i = 0; i < parts.length; i++) {
      var el = document.querySelector(parts[i].trim());
      if (el) return el;
    }
    return null;
  }

  function setStation(i, scrollTo) {
    i = Math.max(0, Math.min(STATIONS.length - 1, i | 0));
    state.station = i;
    state.targetProgress = STATIONS.length <= 1 ? 0 : i / (STATIONS.length - 1);
    if (state.rail) {
      Array.prototype.forEach.call(state.rail.children, function (b, j) {
        b.classList.toggle("on", j === i);
      });
    }
    if (scrollTo && state.mainEl) {
      var el = stationEl(STATIONS[i]);
      if (el) el.scrollIntoView({ behavior: state.reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }

  function updateCamera(THREE) {
    if (!state.camera || !state.path) return;
    var p = state.progress;
    // Intro: dive from high sky
    if (state.intro) {
      state.introT += 0.016;
      var k = Math.min(1, state.introT / 1.6);
      var e = 1 - Math.pow(1 - k, 3);
      var end = state.path.getPoint(0);
      state.camera.position.set(
        end.x * e,
        48 + (end.y - 48) * e,
        60 + (end.z - 60) * e
      );
      state.camera.lookAt(0, 3, 0);
      if (k >= 1) state.intro = false;
      return;
    }
    var pos = state.path.getPoint(p);
    var stIdx = Math.round(p * (STATIONS.length - 1));
    var st = STATIONS[stIdx] || STATIONS[0];
    var look = new THREE.Vector3(st.cam.tx, st.cam.ty, st.cam.tz);
    // subtle pointer parallax
    pos.x += state.pointer.x * 1.2;
    pos.y += state.pointer.y * 0.6;
    state.camera.position.lerp(pos, 0.08);
    var cur = new THREE.Vector3();
    state.camera.getWorldDirection(cur);
    var target = look.clone().sub(state.camera.position).normalize();
    // lookAt with damp
    var lookPos = new THREE.Vector3().copy(state.camera.position).add(look.clone().sub(state.camera.position).multiplyScalar(1));
    // simpler: lookAt station target with offset
    var lx = st.cam.tx + state.pointer.x * 0.8;
    var ly = st.cam.ty + state.pointer.y * 0.4;
    var lz = st.cam.tz;
    state.camera.lookAt(lx, ly, lz);
  }

  function syncProgressFromScroll() {
    if (!state.mainEl || state.dockId) return;
    var el = state.mainEl;
    var max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    var t = el.scrollTop / max;
    state.targetProgress = Math.max(0, Math.min(1, t));
    var idx = Math.round(t * (STATIONS.length - 1));
    if (idx !== state.station) {
      state.station = idx;
      if (state.rail) {
        Array.prototype.forEach.call(state.rail.children, function (b, j) {
          b.classList.toggle("on", j === idx);
        });
      }
    }
  }

  function loop() {
    state.raf = requestAnimationFrame(loop);
    if (state.paused || document.hidden) return;
    var THREE = state.THREE;
    state.clock += 0.016;
    // ease progress
    state.progress += (state.targetProgress - state.progress) * (state.reduceMotion ? 1 : 0.07);
    updateCamera(THREE);
    if (state.orb) {
      var o = state.orb;
      o.sphere.rotation.y += 0.01;
      o.sphere.rotation.x += 0.004;
      o.r1.rotation.z += 0.014;
      o.r2.rotation.z -= 0.011;
      var s = 1 + Math.sin(state.clock * 2.2) * 0.03;
      o.group.scale.set(s, s, s);
      o.group.position.y = 4.2 + Math.sin(state.clock * 1.4) * 0.15;
    }
    if (state.city) state.city.rotation.y = Math.sin(state.clock * 0.05) * 0.02;
    state.renderer.render(state.scene, state.camera);
  }

  function onResize() {
    if (!state.renderer || !state.camera) return;
    var w = window.innerWidth, h = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, state.tier === "high" ? 2 : 1.5);
    state.renderer.setPixelRatio(state.dpr);
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
  }

  function dock(el) {
    if (!el) return;
    undock();
    el.classList.add("zw-active", "zw-focus");
    state.dockId = el.id || el.className;
    document.documentElement.classList.add("zw-dock");
    // nudge camera in
    state.targetProgress = state.progress;
    state.intro = false;
  }

  function undock() {
    document.documentElement.classList.remove("zw-dock");
    var act = document.querySelectorAll(".zw-active");
    Array.prototype.forEach.call(act, function (el) { el.classList.remove("zw-active", "zw-focus"); });
    state.dockId = null;
  }

  function bindUi() {
    if (state.rail) {
      state.rail.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-i]");
        if (!b) return;
        undock();
        setStation(+b.dataset.i, true);
      });
    }
    if (state.mainEl) {
      state.mainEl.addEventListener("scroll", function () {
        syncProgressFromScroll();
        if (state.hint) state.hint.classList.remove("on");
      }, { passive: true });
    }
    // double-tap / long-ish click on panel to dock
    document.addEventListener("click", function (e) {
      if (!document.documentElement.classList.contains("zw-cine")) return;
      if (e.target.closest(".zw-rail,.zw-back,#zapFab,#zapSheet,.sheet,#menuBtn,[data-theme-btn],.map-tool,.mpc-go,a,input,button.np-play,button.np-pick")) return;
      var panel = e.target.closest("#v-home > .card, #v-home > button.card, #v-home > .places-row, #v-home > .apps-wrap, #heroCard, #hPlay, #hWx, #hMap, #placesRow, #hMk, #mFocus, #appsSection, #apps");
      if (!panel) return;
      // ignore if clicking interactive control inside that should just work
      if (e.target.closest("button,a,input,select,textarea,.map-v,.place-chip,.tile")) {
        // still allow docking via explicit data
        if (!e.target.closest("[data-zw-dock]")) return;
      }
      // single click docks only if panel has data-zw-dock or alt key — else rely on scroll snap
      // Tap empty chrome of panel to focus:
      if (e.target === panel || e.target.classList.contains("hud-h") || e.target.classList.contains("mk-h")) {
        dock(panel);
      }
    });
    window.addEventListener("pointermove", function (e) {
      state.pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      state.pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener("keydown", function (e) {
      if (!document.documentElement.classList.contains("zw-cine")) return;
      if (e.key === "Escape") undock();
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); setStation(state.station + 1, true); }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); setStation(state.station - 1, true); }
    });
  }

  function markAppsSection() {
    var apps = document.getElementById("apps");
    if (apps && apps.parentElement && !apps.parentElement.id) {
      apps.parentElement.id = "appsSection";
      apps.parentElement.classList.add("apps-wrap");
    }
  }

  function applyCineClass(on) {
    document.documentElement.classList.toggle("zw-cine", !!on);
    if (on) {
      document.documentElement.classList.toggle("zw-tier-high", state.tier === "high");
      document.documentElement.classList.toggle("zw-tier-mid", state.tier === "mid");
    } else {
      document.documentElement.classList.remove("zw-tier-high", "zw-tier-mid", "zw-dock");
    }
    var stage = document.getElementById("zwStage");
    if (stage) {
      if (on) { stage.removeAttribute("hidden"); stage.style.display = ""; }
      else { stage.setAttribute("hidden", ""); stage.style.display = "none"; }
    }
    if (state.rail) state.rail.style.display = on ? "" : "none";
  }

  function initScene(THREE, canvas) {
    state.THREE = THREE;
    var w = window.innerWidth, h = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: state.tier === "high", alpha: false, powerPreference: "high-performance" });
    state.dpr = Math.min(window.devicePixelRatio || 1, state.tier === "high" ? 2 : 1.4);
    renderer.setPixelRatio(state.dpr);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x03040a, 1);
    state.renderer = renderer;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03040a, state.tier === "high" ? 0.012 : 0.016);
    state.scene = scene;

    var camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
    camera.position.set(0, 48, 60);
    state.camera = camera;

    scene.add(buildCity(THREE));
    scene.add(buildOrb(THREE));
    buildPath(THREE);

    // ambient stars
    var starGeo = new THREE.BufferGeometry();
    var starN = state.tier === "high" ? 400 : 180;
    var positions = new Float32Array(starN * 3);
    for (var i = 0; i < starN; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = 20 + Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xa8e6ff, size: 0.15, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));

    window.addEventListener("resize", onResize, { passive: true });
    onResize();
    loop();
  }

  function start() {
    if (state.ready) return Promise.resolve(true);
    var tier = detectTier();
    state.tier = tier === "lite" ? "mid" : tier;
    if (tier === "lite" || !hasWebGL()) {
      applyCineClass(false);
      return Promise.resolve(false);
    }
    var canvas = ensureDom();
    markAppsSection();
    return loadScript(THREE_URL).then(function (THREE) {
      if (!THREE) throw new Error("no THREE");
      initScene(THREE, canvas);
      applyCineClass(true);
      bindUi();
      state.ready = true;
      // first paint already happened; cinematic streams in — kick intro
      state.intro = true;
      state.introT = 0;
      setStation(0, false);
      return true;
    }).catch(function (err) {
      applyCineClass(false);
      return false;
    });
  }

  function pause() { state.paused = true; }
  function resume() {
    state.paused = false;
    if (state.renderer) onResize();
  }
  function destroy() {
    pause();
    cancelAnimationFrame(state.raf);
    applyCineClass(false);
    undock();
    if (state.renderer) {
      try { state.renderer.dispose(); } catch (e) {}
    }
    state.ready = false;
  }

  function setEnabled(on) {
    if (!on) { destroy(); return Promise.resolve(false); }
    return start();
  }

  global.ZAPCINE = {
    version: VERSION,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy,
    setEnabled: setEnabled,
    setStation: setStation,
    undock: undock,
    dock: dock,
    getTier: function () { return detectTier(); },
    ready: function () { return state.ready; }
  };
})(typeof window !== "undefined" ? window : this);
