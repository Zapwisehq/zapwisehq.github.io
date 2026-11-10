/* ZAPWISE mini orbit (homepage hero). Original design. Each destination links into the live demo.
   Drag to spin, arrow keys to turn, Enter to open. Respects reduced motion. No network calls. */
(function () {
  var host = document.getElementById("zwOrbit"); if (!host) return;
  var items = [].slice.call(host.querySelectorAll(".zo-item")), N = items.length; if (!N) return;
  host.classList.add("js");
  var step = Math.PI * 2 / N, rot = 0, cur = 0, raf = 0, dr = null, suppress = 0, idle = 0;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function near() { return ((Math.round(-rot / step) % N) + N) % N; }
  function layout() {
    var W = host.clientWidth, H = host.clientHeight; if (!W || !H) return;
    var iw = items[0].offsetWidth, ih = items[0].offsetHeight, rx = W / 2 - iw / 2 - 2, ry = Math.min(H / 2 - ih / 2 - 2, rx * 0.62), f = near();
    items.forEach(function (it, i) {
      var a = i * step + rot, dep = (Math.cos(a) + 1) / 2;
      it.style.transform = "translate(" + (W / 2 + Math.sin(a) * rx - iw / 2).toFixed(1) + "px," + (H / 2 + Math.cos(a) * ry - ih / 2).toFixed(1) + "px)";
      it.style.zIndex = String(10 + Math.round(dep * 20));
      it.style.setProperty("--sc", (0.76 + 0.3 * dep).toFixed(3));
      it.classList.toggle("front", i === f);
    });
    host.style.setProperty("--spin", (-rot * 57.2958).toFixed(1) + "deg");
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function to(target) {
    stop(); if (reduce) { rot = target; layout(); return; }
    var from = rot, t0 = performance.now();
    (function f(t) { var k = Math.min(1, (t - t0) / 320), e = 1 - Math.pow(1 - k, 3); rot = from + (target - from) * e; layout(); if (k < 1) raf = requestAnimationFrame(f); else raf = 0; })(t0);
  }
  function setCur(i, focus) {
    cur = ((i % N) + N) % N; items.forEach(function (it, k) { it.tabIndex = k === cur ? 0 : -1; });
    var d = -cur * step - rot; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; to(rot + d);
    if (focus) items[cur].focus({ preventScroll: true });
  }
  host.addEventListener("keydown", function (e) {
    var i = items.indexOf(document.activeElement); if (i < 0) return;
    var k = e.key, nx = k === "ArrowRight" || k === "ArrowDown" ? i + 1 : k === "ArrowLeft" || k === "ArrowUp" ? i - 1 : k === "Home" ? 0 : k === "End" ? N - 1 : null;
    if (nx == null) return; e.preventDefault(); idle = Date.now(); setCur(nx, true);
  });
  host.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse" && e.button !== 0) return; stop(); idle = Date.now(); dr = { x: e.clientX, r: rot, m: false, id: e.pointerId }; });
  host.addEventListener("pointermove", function (e) {
    if (!dr) return; var dx = e.clientX - dr.x; if (!dr.m && Math.abs(dx) < 8) return;
    if (!dr.m) { dr.m = true; try { host.setPointerCapture(dr.id); } catch (x) {} }
    rot = dr.r + dx * 1.5 / Math.max(120, host.clientWidth / 2); layout();
  });
  function end() { if (!dr) return; var m = dr.m; dr = null; idle = Date.now(); if (m) { suppress = Date.now(); setCur(near(), false); } }
  host.addEventListener("pointerup", end); host.addEventListener("pointercancel", end);
  host.addEventListener("click", function (e) { if (Date.now() - suppress < 350 && e.target.closest(".zo-item")) e.preventDefault(); }, true);
  host.addEventListener("focusin", function (e) { var i = items.indexOf(e.target); if (i >= 0 && i !== cur) setCur(i, false); });
  /* gentle auto-turn every few seconds while nobody is using it (off with reduced motion) */
  if (!reduce) setInterval(function () { if (document.hidden || dr || Date.now() - idle < 6000 || host.contains(document.activeElement) || host.matches(":hover")) return; setCur(cur + 1, false); }, 3200);
  layout();
  try { new ResizeObserver(layout).observe(host); } catch (x) { addEventListener("resize", layout); }
})();
