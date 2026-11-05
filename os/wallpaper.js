/* ZAPWISE//OS v4.8.0 — original neon-city live wallpaper (no third-party IP) */
(function (global) {
  "use strict";
  var MODE = "neon"; // neon | stars | off
  var canvas, ctx, raf = 0, last = 0, running = false, dpr = 1, W = 0, H = 0;
  var buildings = [], signs = [], fog = [], stars = [];
  var sweep = 0, t0 = performance.now();

  function reduced() {
    try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function lite() {
    try { return document.documentElement.classList.contains("fx-lite"); } catch (e) { return false; }
  }
  function seedBuildings() {
    buildings = [];
    var x = -20;
    while (x < W + 40) {
      var bw = 18 + Math.random() * 42;
      var bh = H * (0.18 + Math.random() * 0.38);
      var wins = [];
      var cols = Math.max(2, Math.floor(bw / 7));
      var rows = Math.max(3, Math.floor(bh / 10));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        if (Math.random() > 0.55) wins.push({ c: c, r: r, on: Math.random() > 0.35, flicker: Math.random() });
      }
      buildings.push({ x: x, w: bw, h: bh, wins: wins, cols: cols, rows: rows, shade: 0.35 + Math.random() * 0.35 });
      x += bw + 4 + Math.random() * 10;
    }
    signs = [];
    for (var i = 0; i < 7; i++) {
      signs.push({
        x: Math.random() * W, y: H * (0.25 + Math.random() * 0.35),
        w: 10 + Math.random() * 28, h: 4 + Math.random() * 10,
        hue: Math.random() > 0.5 ? "cyan" : "amber",
        ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 1.2
      });
    }
    fog = [];
    for (var f = 0; f < 4; f++) {
      fog.push({ x: Math.random() * W, y: H * (0.45 + Math.random() * 0.35), w: W * (0.4 + Math.random() * 0.5), h: H * 0.12, vx: 4 + Math.random() * 10, a: 0.04 + Math.random() * 0.05 });
    }
    stars = [];
    for (var s = 0; s < 60; s++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: 0.4 + Math.random() * 1.2, a: 0.2 + Math.random() * 0.6, tw: Math.random() * Math.PI * 2 });
    }
  }
  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
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
    ctx.clearRect(0, 0, W, H);
    // sky gradient — low contrast
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(10,12,28,0.55)");
    g.addColorStop(0.45, "rgba(7,8,20,0.35)");
    g.addColorStop(1, "rgba(5,6,14,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // distant haze
    ctx.fillStyle = "rgba(92,225,230,0.03)";
    ctx.fillRect(0, H * 0.35, W, H * 0.2);

    // parallax skyline (far)
    var parallax = Math.sin(t * 0.05) * 6;
    ctx.save();
    ctx.translate(parallax * 0.4, 0);
    buildings.forEach(function (b, bi) {
      var baseY = H * 0.78;
      var x = b.x;
      var y = baseY - b.h * (bi % 3 === 0 ? 0.85 : 1);
      var h = b.h * (bi % 3 === 0 ? 0.85 : 1);
      ctx.fillStyle = "rgba(8,10,22," + b.shade + ")";
      ctx.fillRect(x, y, b.w, h + (H - baseY));
      // lit windows
      var cw = Math.max(2, (b.w - 6) / b.cols - 2);
      var ch = Math.max(2, (h - 8) / b.rows - 2);
      b.wins.forEach(function (w) {
        var on = w.on;
        if (w.flicker > 0.82 && Math.sin(t * 2 + w.flicker * 10) > 0.92) on = !on;
        if (!on) return;
        ctx.fillStyle = w.flicker > 0.7 ? "rgba(240,162,2,0.28)" : "rgba(92,225,230,0.22)";
        ctx.fillRect(x + 3 + w.c * (cw + 2), y + 4 + w.r * (ch + 2), cw, ch);
      });
    });
    ctx.restore();

    // abstract signage blocks (no text/brands)
    signs.forEach(function (s) {
      var pulse = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      ctx.fillStyle = s.hue === "cyan" ? ("rgba(92,225,230," + pulse * 0.35 + ")") : ("rgba(240,162,2," + pulse * 0.3 + ")");
      var sx = (s.x + parallax * 0.8 + W) % (W + 40) - 20;
      ctx.fillRect(sx, s.y, s.w, s.h);
      if (s.w > 16) {
        ctx.fillStyle = "rgba(7,8,20,0.35)";
        ctx.fillRect(sx + 2, s.y + 1, s.w - 4, Math.max(1, s.h - 2));
      }
    });

    // drifting fog
    fog.forEach(function (f) {
      f.x = (f.x + f.vx * 0.016) % (W + f.w) - f.w * 0.3;
      var fg = ctx.createRadialGradient(f.x + f.w / 2, f.y, 0, f.x + f.w / 2, f.y, f.w / 2);
      fg.addColorStop(0, "rgba(180,200,220," + f.a + ")");
      fg.addColorStop(1, "rgba(180,200,220,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(f.x, f.y - f.h / 2, f.w, f.h);
    });

    // slow light sweep
    sweep = (t * 18) % (W + 120);
    var sg = ctx.createLinearGradient(sweep - 80, 0, sweep + 80, 0);
    sg.addColorStop(0, "rgba(92,225,230,0)");
    sg.addColorStop(0.5, "rgba(92,225,230,0.045)");
    sg.addColorStop(1, "rgba(240,162,2,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

    // ground glow line
    ctx.strokeStyle = "rgba(92,225,230,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78);
    ctx.lineTo(W, H * 0.78);
    ctx.stroke();
  }
  function drawStars(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(5,6,16,0.7)");
    g.addColorStop(1, "rgba(7,8,20,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) {
      var a = s.a * (0.55 + 0.45 * Math.sin(t * 1.2 + s.tw));
      ctx.fillStyle = "rgba(244,239,228," + a + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function frame(now) {
    if (!running) return;
    if (now - last < 32) { raf = requestAnimationFrame(frame); return; } // ~30fps
    last = now;
    if (MODE === "neon") drawNeon(now);
    else if (MODE === "stars") drawStars(now);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (MODE === "off" || !canvas || !ctx) return;
    if (reduced() || lite()) {
      canvas.classList.add("wp-static");
      running = false;
      if (MODE === "neon") drawNeon(performance.now());
      else if (MODE === "stars") drawStars(performance.now());
      return;
    }
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
  function init(el) {
    canvas = el || document.getElementById("wpCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "wpCanvas";
      canvas.className = "wp-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    ctx = canvas.getContext("2d", { alpha: true });
    resize();
    window.addEventListener("resize", function () { resize(); if (!running && MODE !== "off") { if (MODE === "neon") drawNeon(performance.now()); else drawStars(performance.now()); } }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (MODE !== "off") start();
    });
    return true;
  }
  global.ZAPWALL = {
    init: init,
    setMode: setMode,
    getMode: function () { return MODE; },
    start: start,
    stop: stop,
    resize: resize
  };
})(window);
