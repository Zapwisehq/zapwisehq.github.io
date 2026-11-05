/* ZAPWISE//OS v4.9.0 — original neon-city live wallpaper (no third-party IP) */
(function (global) {
  "use strict";
  var MODE = "neon";
  var canvas, ctx, raf = 0, last = 0, running = false, dpr = 1, W = 0, H = 0;
  var buildings = [], signs = [], fog = [], stars = [];
  var sweep = 0, t0 = performance.now();
  var parallaxX = 0, parallaxY = 0, scrollPar = 0;
  var targetPX = 0, targetPY = 0;

  function reduced() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function lite() {
    try { return document.documentElement.classList.contains("fx-lite"); } catch (e) { return false; }
  }
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function hexToRgba(hex, a) {
    hex = (hex || "#05d9e8").replace("#", "");
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return "rgba(5,217,232," + a + ")";
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function accent() { return cssVar("--magenta", cssVar("--amber", "#ff2a6d")); }
  function secondary() { return cssVar("--cyan", "#05d9e8"); }

  function seedBuildings() {
    buildings = [];
    var x = -30;
    var dens = lite() ? 0.72 : 1;
    while (x < W + 50) {
      var bw = (16 + Math.random() * 48) * dens;
      var bh = H * (0.22 + Math.random() * 0.48);
      var wins = [];
      var cols = Math.max(2, Math.floor(bw / 6));
      var rows = Math.max(4, Math.floor(bh / 9));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        if (Math.random() > 0.42) wins.push({ c: c, r: r, on: Math.random() > 0.28, flicker: Math.random() });
      }
      buildings.push({ x: x, w: bw, h: bh, wins: wins, cols: cols, rows: rows, shade: 0.55 + Math.random() * 0.35 });
      x += bw + 3 + Math.random() * 8;
    }
    signs = [];
    var nSign = lite() ? 5 : 9;
    for (var i = 0; i < nSign; i++) {
      signs.push({
        x: Math.random() * W, y: H * (0.22 + Math.random() * 0.4),
        w: 14 + Math.random() * 36, h: 5 + Math.random() * 14,
        hue: Math.random() > 0.45 ? "cyan" : "mag",
        ph: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 1.4
      });
    }
    fog = [];
    for (var f = 0; f < (lite() ? 3 : 5); f++) {
      fog.push({ x: Math.random() * W, y: H * (0.4 + Math.random() * 0.4), w: W * (0.35 + Math.random() * 0.55), h: H * 0.14, vx: 6 + Math.random() * 14, a: 0.06 + Math.random() * 0.08 });
    }
    stars = [];
    for (var s = 0; s < (lite() ? 40 : 70); s++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: 0.5 + Math.random() * 1.4, a: 0.25 + Math.random() * 0.65, tw: Math.random() * Math.PI * 2 });
    }
  }
  function resize() {
    if (!canvas) return;
    dpr = Math.min(lite() ? 1.5 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth || 390;
    H = window.innerHeight || 844;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedBuildings();
  }
  function drawNeon(now) {
    var t = (now - t0) / 1000;
    var cyan = secondary();
    var mag = accent();
    parallaxX += (targetPX + scrollPar - parallaxX) * 0.06;
    parallaxY += (targetPY - parallaxY) * 0.06;
    ctx.clearRect(0, 0, W, H);

    // brighter sky
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(18,10,32,0.75)");
    g.addColorStop(0.4, "rgba(10,8,24,0.55)");
    g.addColorStop(1, "rgba(5,6,14,0.7)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // upper haze wash in theme cyan
    ctx.fillStyle = hexToRgba(cyan, 0.07);
    ctx.fillRect(0, H * 0.28, W, H * 0.22);
    ctx.fillStyle = hexToRgba(mag, 0.05);
    ctx.fillRect(0, H * 0.5, W, H * 0.18);

    var basePar = Math.sin(t * 0.06) * 8 + parallaxX;
    ctx.save();
    ctx.translate(basePar * 0.45 + parallaxY * 0.1, parallaxY * 0.35);
    buildings.forEach(function (b, bi) {
      var baseY = H * 0.76;
      var x = b.x;
      var y = baseY - b.h * (bi % 3 === 0 ? 0.82 : 1);
      var h = b.h * (bi % 3 === 0 ? 0.82 : 1);
      ctx.fillStyle = "rgba(6,8,20," + b.shade + ")";
      ctx.fillRect(x, y, b.w, h + (H - baseY) + 4);
      // roof lip
      ctx.fillStyle = hexToRgba(cyan, 0.12);
      ctx.fillRect(x, y, b.w, 2);
      var cw = Math.max(2, (b.w - 6) / b.cols - 1.5);
      var ch = Math.max(2, (h - 8) / b.rows - 1.5);
      b.wins.forEach(function (w) {
        var on = w.on;
        if (w.flicker > 0.8 && Math.sin(t * 2.2 + w.flicker * 10) > 0.9) on = !on;
        if (!on) return;
        var bright = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + w.flicker * 4));
        ctx.fillStyle = w.flicker > 0.65 ? hexToRgba(mag, 0.35 + bright * 0.25) : hexToRgba(cyan, 0.32 + bright * 0.28);
        ctx.fillRect(x + 3 + w.c * (cw + 1.5), y + 4 + w.r * (ch + 1.5), cw, ch);
      });
    });
    ctx.restore();

    // neon accent light blocks
    signs.forEach(function (s) {
      var pulse = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      var col = s.hue === "cyan" ? cyan : mag;
      ctx.fillStyle = hexToRgba(col, pulse * 0.55);
      var sx = (s.x + basePar * 0.9 + W) % (W + 50) - 25;
      var sy = s.y + parallaxY * 0.2;
      ctx.shadowColor = hexToRgba(col, 0.55);
      ctx.shadowBlur = 12;
      ctx.fillRect(sx, sy, s.w, s.h);
      ctx.shadowBlur = 0;
      if (s.w > 18) {
        ctx.fillStyle = "rgba(5,6,14,0.4)";
        ctx.fillRect(sx + 2, sy + 1, s.w - 4, Math.max(1, s.h - 2));
      }
    });

    // drifting haze
    fog.forEach(function (f) {
      f.x = (f.x + f.vx * 0.016) % (W + f.w) - f.w * 0.3;
      var fg = ctx.createRadialGradient(f.x + f.w / 2, f.y, 0, f.x + f.w / 2, f.y, f.w / 2);
      fg.addColorStop(0, "rgba(200,210,240," + f.a + ")");
      fg.addColorStop(1, "rgba(200,210,240,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(f.x, f.y - f.h / 2, f.w, f.h);
    });

    // light sweep
    sweep = (t * 22) % (W + 160);
    var sg = ctx.createLinearGradient(sweep - 100, 0, sweep + 100, 0);
    sg.addColorStop(0, hexToRgba(cyan, 0));
    sg.addColorStop(0.5, hexToRgba(cyan, 0.09));
    sg.addColorStop(0.7, hexToRgba(mag, 0.06));
    sg.addColorStop(1, hexToRgba(mag, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

    // ground glow
    ctx.strokeStyle = hexToRgba(cyan, 0.28);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.76);
    ctx.lineTo(W, H * 0.76);
    ctx.stroke();
    var gg = ctx.createLinearGradient(0, H * 0.76, 0, H);
    gg.addColorStop(0, hexToRgba(mag, 0.12));
    gg.addColorStop(1, "rgba(5,6,14,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, H * 0.76, W, H * 0.24);

    // soft vignette so cards stay readable
    var vg = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.15, W * 0.5, H * 0.5, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.65, "rgba(0,0,0,0.12)");
    vg.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  function drawStars(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(5,6,16,0.85)");
    g.addColorStop(1, "rgba(7,8,20,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) {
      var a = s.a * (0.55 + 0.45 * Math.sin(t * 1.2 + s.tw));
      ctx.fillStyle = "rgba(244,239,228," + a + ")";
      ctx.beginPath();
      ctx.arc(s.x + parallaxX * 0.2, s.y + parallaxY * 0.15, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function frame(now) {
    if (!running) return;
    if (now - last < 32) { raf = requestAnimationFrame(frame); return; }
    last = now;
    if (MODE === "neon") drawNeon(now);
    else if (MODE === "stars") drawStars(now);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (MODE === "off" || !canvas || !ctx) return;
    if (reduced()) {
      canvas.classList.add("wp-static");
      running = false;
      if (MODE === "neon") drawNeon(performance.now());
      else if (MODE === "stars") drawStars(performance.now());
      return;
    }
    // v4.9: lite still animates at 30fps (fewer buildings) — do NOT freeze wallpaper
    canvas.classList.remove("wp-static");
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function setMode(m) {
    MODE = (m === "stars" || m === "off" || m === "neon") ? m : "neon";
    try { document.documentElement.setAttribute("data-wallpaper", MODE); } catch (e) {}
    if (canvas) {
      if (MODE === "off") {
        stop();
        ctx && ctx.clearRect(0, 0, W, H);
        canvas.hidden = true;
      } else {
        canvas.hidden = false;
        resize();
        stop();
        start();
      }
    }
    return MODE;
  }
  function onTilt(e) {
    if (!e) return;
    var b = e.beta, g = e.gamma;
    if (typeof b !== "number" || typeof g !== "number") return;
    targetPX = Math.max(-18, Math.min(18, g * 0.45));
    targetPY = Math.max(-12, Math.min(12, (b - 45) * 0.25));
  }
  function onScroll() {
    try {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      scrollPar = Math.max(-20, Math.min(20, y * 0.04));
    } catch (e) {}
  }
  function init(el) {
    canvas = el || document.getElementById("wpCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "wpCanvas";
      canvas.className = "wp-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    ctx = canvas.getContext("2d", { alpha: true });
    resize();
    window.addEventListener("resize", function () {
      resize();
      if (!running && MODE !== "off") {
        if (MODE === "neon") drawNeon(performance.now());
        else drawStars(performance.now());
      }
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (MODE !== "off") start();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    try {
      if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", onTilt, { passive: true });
      }
    } catch (e) {}
    return true;
  }
  global.ZAPWALL = {
    init: init,
    setMode: setMode,
    getMode: function () { return MODE; },
    start: start,
    stop: stop,
    resize: resize,
    sample: function () {
      if (!canvas || !ctx) return null;
      try {
        var img = ctx.getImageData(Math.floor(W / 2), Math.floor(H * 0.55), 1, 1).data;
        return [img[0], img[1], img[2], img[3]];
      } catch (e) { return null; }
    }
  };
})(window);
