/* ZAPWISE//OS v4.9.1 — neon-city live wallpaper (no flicker / no strobe) */
(function (global) {
  "use strict";
  var MODE = "neon";
  var canvas, ctx, raf = 0, last = 0, running = false, dpr = 1, W = 0, H = 0;
  var buildings = [], signs = [], fog = [], stars = [];
  var t0 = performance.now();
  var parallaxX = 0, parallaxY = 0, scrollPar = 0;
  var targetPX = 0, targetPY = 0;
  var resizeTimer = 0, seeded = false;
  var lastCW = 0, lastCH = 0, lastDpr = 0;

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
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return "rgba(5,217,232," + a + ")";
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function accent() { return cssVar("--magenta", cssVar("--amber", "#ff2a6d")); }
  function secondary() { return cssVar("--cyan", "#05d9e8"); }

  /* Soft pulse: periodSec >= 8, amplitude small — never hard on/off blink */
  function softPulse(t, periodSec, phase, amp) {
    var p = Math.max(8, periodSec || 10);
    var a = amp == null ? 0.08 : amp;
    return 1 + a * Math.sin((t * Math.PI * 2) / p + (phase || 0));
  }

  function seedBuildings(force) {
    if (seeded && !force) return;
    seeded = true;
    buildings = [];
    var x = -30;
    var dens = lite() ? 0.72 : 1;
    var rnd = 0.37; /* deterministic-ish layout from size so resize doesn't reshuffle wildly */
    function r() { rnd = (rnd * 16807 + 0.5) % 1; return rnd; }
    while (x < W + 50) {
      var bw = (16 + r() * 48) * dens;
      var bh = H * (0.22 + r() * 0.48);
      var wins = [];
      var cols = Math.max(2, Math.floor(bw / 6));
      var rows = Math.max(4, Math.floor(bh / 9));
      for (var row = 0; row < rows; row++) for (var c = 0; c < cols; c++) {
        if (r() > 0.38) wins.push({ c: c, r: row, on: r() > 0.22, ph: r() * Math.PI * 2, period: 8 + r() * 6 });
      }
      buildings.push({ x: x, w: bw, h: bh, wins: wins, cols: cols, rows: rows, shade: 0.55 + r() * 0.35 });
      x += bw + 3 + r() * 8;
    }
    signs = [];
    var nSign = lite() ? 5 : 9;
    for (var i = 0; i < nSign; i++) {
      signs.push({
        x: (r() * W), y: H * (0.22 + r() * 0.4),
        w: 14 + r() * 36, h: 5 + r() * 14,
        hue: r() > 0.45 ? "cyan" : "mag",
        ph: r() * Math.PI * 2,
        period: 8 + r() * 6 /* 8–14s soft pulse only — never on/off */
      });
    }
    fog = [];
    for (var f = 0; f < (lite() ? 3 : 5); f++) {
      fog.push({
        x: r() * W, y: H * (0.4 + r() * 0.4),
        w: W * (0.35 + r() * 0.55), h: H * 0.14,
        vx: 4 + r() * 8, a: 0.05 + r() * 0.06
      });
    }
    stars = [];
    for (var s = 0; s < (lite() ? 40 : 70); s++) {
      stars.push({
        x: r() * W, y: r() * H * 0.55,
        r: 0.5 + r() * 1.4, a: 0.3 + r() * 0.5,
        ph: r() * Math.PI * 2, period: 8 + r() * 6
      });
    }
  }

  function applyCanvasSize(nw, nh, ndpr) {
    var cw = Math.floor(nw * ndpr);
    var ch = Math.floor(nh * ndpr);
    /* Only touch canvas.width/height when size actually changes — setting them clears the buffer (flash). */
    if (cw !== lastCW || ch !== lastCH || ndpr !== lastDpr) {
      canvas.width = cw;
      canvas.height = ch;
      lastCW = cw; lastCH = ch; lastDpr = ndpr;
      ctx.setTransform(ndpr, 0, 0, ndpr, 0, 0);
    }
    canvas.style.width = nw + "px";
    canvas.style.height = nh + "px";
  }

  function resize(forceSeed) {
    if (!canvas || !ctx) return;
    var ndpr = Math.min(lite() ? 1.5 : 2, window.devicePixelRatio || 1);
    var nw = Math.max(1, window.innerWidth || 390);
    var nh = Math.max(1, window.innerHeight || 844);
    var sizeJump = !seeded || Math.abs(nw - W) > 40 || Math.abs(nh - H) > 60;
    W = nw; H = nh; dpr = ndpr;
    applyCanvasSize(nw, nh, ndpr);
    if (forceSeed || sizeJump) seedBuildings(true);
  }

  function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = 0;
      resize(false);
      if (!running && MODE !== "off") {
        if (MODE === "neon") drawNeon(performance.now());
        else drawStars(performance.now());
      }
    }, 280); /* debounce iOS URL-bar / visualViewport chatter */
  }

  function drawNeon(now) {
    var t = (now - t0) / 1000;
    var cyan = secondary();
    var mag = accent();
    parallaxX += (targetPX + scrollPar - parallaxX) * 0.05;
    parallaxY += (targetPY - parallaxY) * 0.05;
    ctx.clearRect(0, 0, W, H);

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(18,10,32,0.75)");
    g.addColorStop(0.4, "rgba(10,8,24,0.55)");
    g.addColorStop(1, "rgba(5,6,14,0.7)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = hexToRgba(cyan, 0.07);
    ctx.fillRect(0, H * 0.28, W, H * 0.22);
    ctx.fillStyle = hexToRgba(mag, 0.05);
    ctx.fillRect(0, H * 0.5, W, H * 0.18);

    var basePar = Math.sin(t * 0.05) * 6 + parallaxX;
    ctx.save();
    ctx.translate(basePar * 0.45 + parallaxY * 0.1, parallaxY * 0.35);
    buildings.forEach(function (b, bi) {
      var baseY = H * 0.76;
      var x = b.x;
      var y = baseY - b.h * (bi % 3 === 0 ? 0.82 : 1);
      var h = b.h * (bi % 3 === 0 ? 0.82 : 1);
      ctx.fillStyle = "rgba(6,8,20," + b.shade + ")";
      ctx.fillRect(x, y, b.w, h + (H - baseY) + 4);
      ctx.fillStyle = hexToRgba(cyan, 0.12);
      ctx.fillRect(x, y, b.w, 2);
      var cw = Math.max(2, (b.w - 6) / b.cols - 1.5);
      var ch = Math.max(2, (h - 8) / b.rows - 1.5);
      b.wins.forEach(function (w) {
        if (!w.on) return; /* steady lit set — no on/off blink */
        var pulse = softPulse(t, w.period, w.ph, 0.08); /* ±8% brightness, ≥8s — never off */
        var bright = 0.55 * pulse;
        ctx.fillStyle = (w.ph % 1 > 0.55)
          ? hexToRgba(mag, 0.42 + bright * 0.14)
          : hexToRgba(cyan, 0.40 + bright * 0.16);
        ctx.fillRect(x + 3 + w.c * (cw + 1.5), y + 4 + w.r * (ch + 1.5), cw, ch);
      });
    });
    ctx.restore();

    /* Neon sign blocks — steady with very slow soft pulse (never blink off) */
    signs.forEach(function (s) {
      var pulse = softPulse(t, s.period, s.ph, 0.07); /* base ~1, ±7%, ≥8s */
      var col = s.hue === "cyan" ? cyan : mag;
      /* Floor alpha so cyan/magenta blocks stay visibly lit — no blink off */
      var a = Math.max(0.40, Math.min(0.58, 0.48 * pulse));
      ctx.fillStyle = hexToRgba(col, a);
      var sx = (s.x + basePar * 0.9 + W) % (W + 50) - 25;
      var sy = s.y + parallaxY * 0.2;
      ctx.shadowColor = hexToRgba(col, 0.35);
      ctx.shadowBlur = 10;
      ctx.fillRect(sx, sy, s.w, s.h);
      ctx.shadowBlur = 0;
      if (s.w > 18) {
        ctx.fillStyle = "rgba(5,6,14,0.35)";
        ctx.fillRect(sx + 2, sy + 1, s.w - 4, Math.max(1, s.h - 2));
      }
    });

    fog.forEach(function (f) {
      f.x = (f.x + f.vx * 0.016) % (W + f.w) - f.w * 0.3;
      var fg = ctx.createRadialGradient(f.x + f.w / 2, f.y, 0, f.x + f.w / 2, f.y, f.w / 2);
      fg.addColorStop(0, "rgba(200,210,240," + f.a + ")");
      fg.addColorStop(1, "rgba(200,210,240,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(f.x, f.y - f.h / 2, f.w, f.h);
    });

    /* Light sweep — ≥8s across viewport, low peak alpha (no strobe) */
    var span = W + 200;
    var sweepPeriod = Math.max(8, span / 55); /* ~8–12s */
    var sweep = ((t % sweepPeriod) / sweepPeriod) * span - 100;
    var sg = ctx.createLinearGradient(sweep - 120, 0, sweep + 120, 0);
    sg.addColorStop(0, hexToRgba(cyan, 0));
    sg.addColorStop(0.5, hexToRgba(cyan, 0.045));
    sg.addColorStop(0.7, hexToRgba(mag, 0.03));
    sg.addColorStop(1, hexToRgba(mag, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

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
      var pulse = softPulse(t, s.period, s.ph, 0.08);
      var a = Math.max(0.22, Math.min(0.75, s.a * pulse * 0.9));
      ctx.fillStyle = "rgba(244,239,228," + a + ")";
      ctx.beginPath();
      ctx.arc(s.x + parallaxX * 0.2, s.y + parallaxY * 0.15, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame(now) {
    if (!running) return;
    if (now - last < 33) { raf = requestAnimationFrame(frame); return; } /* ~30fps */
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
        if (ctx) ctx.clearRect(0, 0, W, H);
        canvas.hidden = true;
      } else {
        canvas.hidden = false;
        resize(false);
        stop();
        start();
      }
    }
    return MODE;
  }

  function onTilt(e) {
    if (!e || reduced()) return;
    var b = e.beta, g = e.gamma;
    if (typeof b !== "number" || typeof g !== "number") return;
    targetPX = Math.max(-14, Math.min(14, g * 0.35));
    targetPY = Math.max(-10, Math.min(10, (b - 45) * 0.2));
  }

  function onScroll() {
    try {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      scrollPar = Math.max(-16, Math.min(16, y * 0.035));
    } catch (e) {}
  }

  function regionLuma(rx, ry, rw, rh) {
    if (!canvas || !ctx || !W) return null;
    try {
      var x = Math.max(0, Math.floor(rx));
      var y = Math.max(0, Math.floor(ry));
      var w = Math.max(1, Math.min(Math.floor(rw), Math.floor(W) - x));
      var h = Math.max(1, Math.min(Math.floor(rh), Math.floor(H) - y));
      var data = ctx.getImageData(x, y, w, h).data;
      var sum = 0, n = w * h;
      for (var i = 0; i < data.length; i += 4) {
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      return sum / n / 255;
    } catch (e) { return null; }
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
    resize(true);
    window.addEventListener("resize", scheduleResize, { passive: true });
    try {
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", scheduleResize, { passive: true });
      }
    } catch (e0) {}
    /* Pause when hidden — do NOT re-seed or resize on show (avoids flash). */
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
    resize: function () { resize(false); },
    sample: function () {
      if (!canvas || !ctx) return null;
      try {
        var img = ctx.getImageData(Math.floor(W / 2), Math.floor(H * 0.55), 1, 1).data;
        return [img[0], img[1], img[2], img[3]];
      } catch (e) { return null; }
    },
    regionLuma: regionLuma,
    dims: function () { return { w: W, h: H, dpr: dpr, running: running, mode: MODE }; }
  };
})(window);
