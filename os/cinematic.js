/* ZAPWISE//OS cinematic.js v4.1.0 — calm neon city BACKGROUND only (no fly-nav). */
(function (global) {
  "use strict";
  var VERSION = "4.1.0";
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";

  var state = {
    ready: false,
    tier: "mid",
    paused: false,
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    city: null,
    
    raf: 0,
    dpr: 1,
    reduceMotion: false,
    clock: 0,
    tab: 0,
    tabEase: 0,
    glow: []
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
      /* v4.6.3: NEVER insert an in-flow full-viewport node before #app.
         Always fixed + append at end of body so a missing stylesheet cannot push the header down. */
      try {
        stage.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;margin:0;padding:0;width:100%;height:100%;max-height:100%;";
      } catch (eS) {}
      document.body.appendChild(stage);
    } else {
      try {
        stage.style.position = "fixed";
        stage.style.inset = "0";
        stage.style.zIndex = "0";
        stage.style.pointerEvents = "none";
        stage.style.width = "100%";
        stage.style.height = "100%";
        stage.style.margin = "0";
        if (stage.parentNode !== document.body) document.body.appendChild(stage);
      } catch (eF) {}
    }
    var canvas = stage.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "zwCanvas";
      try { canvas.style.cssText = "display:block;width:100%;height:100%;"; } catch (eC) {}
      stage.appendChild(canvas);
    }
    return canvas;
  }

  function applyCineClass(on) {
    document.documentElement.classList.toggle("zw-cine", !!on);
    if (on) {
      document.documentElement.classList.toggle("zw-tier-high", state.tier === "high");
      document.documentElement.classList.toggle("zw-tier-mid", state.tier === "mid");
    } else {
      document.documentElement.classList.remove("zw-tier-high", "zw-tier-mid");
    }
    var stage = document.getElementById("zwStage");
    if (stage) {
      if (on) { stage.removeAttribute("hidden"); stage.style.display = ""; }
      else { stage.setAttribute("hidden", ""); stage.style.display = "none"; }
    }
  }

  function buildCity(THREE) {
    var group = new THREE.Group();
    var geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    var mat = new THREE.MeshBasicMaterial({ color: 0x0a1228 });
    var edgeMat = new THREE.LineBasicMaterial({ color: 0x5ce1e6, transparent: true, opacity: 0.35 });
    var N = state.tier === "high" ? 160 : 90;
    var mesh = new THREE.InstancedMesh(geo, mat, N);
    var dummy = new THREE.Object3D();
    var i = 0;
    for (var z = -40; z <= 40 && i < N; z += 6) {
      for (var x = -40; x <= 40 && i < N; x += 6) {
        if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
        var h = 2 + Math.random() * (state.tier === "high" ? 18 : 12);
        dummy.position.set(x + (Math.random() - 0.5) * 2, 0, z + (Math.random() - 0.5) * 2);
        dummy.scale.set(1.2 + Math.random() * 1.6, h, 1.2 + Math.random() * 1.6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);

    // neon edge strips (cheap)
    var lineGeo = new THREE.BufferGeometry();
    var pts = [];
    for (var k = 0; k < (state.tier === "high" ? 40 : 18); k++) {
      var lx = (Math.random() - 0.5) * 70;
      var lz = (Math.random() - 0.5) * 70;
      var lh = 4 + Math.random() * 16;
      pts.push(lx, 0, lz, lx, lh, lz);
    }
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineSegments(lineGeo, edgeMat));

    // magenta accents
    var m2 = new THREE.LineBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.28 });
    var g2 = lineGeo.clone();
    group.add(new THREE.LineSegments(g2, m2));

    // soft ground
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ color: 0x05070f, transparent: true, opacity: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    group.add(ground);
    state.city = group;
    return group;
  }


  function onResize() {
    if (!state.renderer || !state.camera) return;
    var w = window.innerWidth, h = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, state.tier === "high" ? 1.75 : 1.25);
    state.renderer.setPixelRatio(state.dpr);
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
  }

  function loop() {
    state.raf = requestAnimationFrame(loop);
    if (state.paused || document.hidden) return;
    var THREE = state.THREE;
    if (!THREE || !state.renderer) return;
    state.clock += 0.008;
    state.tabEase += (state.tab - state.tabEase) * 0.04;

    var t = state.clock;
    var baseY = 14 + Math.sin(t * 0.35) * 0.6;
    var baseZ = 28 + Math.cos(t * 0.22) * 1.2;
    var yaw = state.tabEase * 0.18;
    state.camera.position.set(Math.sin(yaw) * 6, baseY, baseZ);
    state.camera.lookAt(Math.sin(yaw) * 2, 4, -4 + Math.cos(t * 0.15));

    if (state.city) state.city.rotation.y = Math.sin(t * 0.05) * 0.02;
    state.renderer.render(state.scene, state.camera);
  }

  function initScene(THREE, canvas) {
    state.THREE = THREE;
    var w = window.innerWidth, h = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: state.tier === "high", alpha: false, powerPreference: "high-performance" });
    state.dpr = Math.min(window.devicePixelRatio || 1, state.tier === "high" ? 1.75 : 1.25);
    renderer.setPixelRatio(state.dpr);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x03040a, 1);
    state.renderer = renderer;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03040a, state.tier === "high" ? 0.018 : 0.022);
    state.scene = scene;

    var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    camera.position.set(0, 14, 28);
    state.camera = camera;

    scene.add(buildCity(THREE));

    var starGeo = new THREE.BufferGeometry();
    var starN = state.tier === "high" ? 220 : 100;
    var positions = new Float32Array(starN * 3);
    for (var i = 0; i < starN; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 180;
      positions[i * 3 + 1] = 10 + Math.random() * 70;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xa8e6ff, size: 0.12, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));

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
    return loadScript(THREE_URL).then(function (THREE) {
      if (!THREE) throw new Error("no THREE");
      initScene(THREE, canvas);
      applyCineClass(true);
      state.ready = true;
      return true;
    }).catch(function () {
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
    if (state.renderer) {
      try { state.renderer.dispose(); } catch (e) {}
    }
    state.ready = false;
  }
  function setEnabled(on) {
    if (!on) { destroy(); return Promise.resolve(false); }
    return start();
  }
  function setTab(i) {
    state.tab = (i | 0);
  }

  global.ZAPCINE = {
    version: VERSION,
    start: start,
    pause: pause,
    resume: resume,
    destroy: destroy,
    setEnabled: setEnabled,
    setTab: setTab,
    setStation: setTab, // back-compat
    undock: function () {},
    dock: function () {},
    getTier: function () { return detectTier(); },
    ready: function () { return state.ready; }
  };
})(typeof window !== "undefined" ? window : this);
