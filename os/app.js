/* ZAPWISE//OS web app v1.0 (Nov 2, 2026). Static, no build step, no API keys.
   Data: Open-Meteo (weather + city search), api-bdc.io (city name for GPS), CoinGecko (crypto + PAX Gold). */
(function () {
"use strict";
var VERSION = "1.0";
var PROMPT_RECAP = "Recap my day: ask me 3 quick questions about what I did today, then give me a 5-bullet recap, my biggest win, and one thing to fix tomorrow. Keep it short.";
var PROMPT_PLAN = "Plan my day: ask me my top 3 tasks and how much time I have, then give me a simple time-blocked plan with breaks, starting with one quick win. Keep it short.";
var BUILD_URL = "https://zapwiseai.com/ai-prompt-builder.html";
var DAY_START = 7, DAY_END = 23;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var Q = new URLSearchParams(location.search);
var FORCE_FX = Q.get("fx");

// ---------- storage ----------
function load(k, d) { try { var v = localStorage.getItem("zapos." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem("zapos." + k, JSON.stringify(v)); } catch (e) {} }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function t12(d) { var h = d.getHours(); return (h % 12 || 12) + ":" + pad2(d.getMinutes()) + (h < 12 ? "A" : "P"); }
function isoT12(iso) { var h = +iso.slice(11, 13), m = iso.slice(14, 16); return (h % 12 || 12) + ":" + m + (h < 12 ? "A" : "P"); }
function isoH(iso) { var h = +iso.slice(11, 13); return (h % 12 || 12) + (h < 12 ? "A" : "P"); }
function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.k); toast.k = setTimeout(function () { t.classList.remove("on"); }, 2600); }

// ---------- glyphs (original, simple shapes; no third-party logos) ----------
var G = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="#fff"/>',
  chat: '<path d="M4 5h16v10.5H9.5L4 19.5z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12 7.3l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#fff"/>',
  spark: '<g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3 3M15.4 15.4l3 3M5.6 18.4l3-3M15.4 8.6l3-3"/></g>',
  gem: '<path d="M7 4h10l4 5-9 11L3 9z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 9h18M9.5 4L12 20l2.5-16" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>',
  compass: '<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M16 8l-2.6 5.4L8 16l2.6-5.4z" fill="#fff"/>',
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v13.5M15 6.5V20" stroke="#fff" stroke-width="1.6"/>',
  note: '<path d="M9 17.5V6.2l10-2.2v11.5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="6.8" cy="17.6" r="2.6" fill="#fff"/><circle cx="16.8" cy="15.6" r="2.6" fill="#fff"/>',
  bars: '<g fill="#fff"><rect x="4" y="10" width="3" height="8" rx="1.3"/><rect x="8.7" y="5.5" width="3" height="12.5" rx="1.3"/><rect x="13.4" y="8" width="3" height="10" rx="1.3"/><rect x="18.1" y="12" width="3" height="6" rx="1.3"/></g>',
  bubble: '<path d="M12 4c5 0 9 3.1 9 7s-4 7-9 7c-1 0-2-.1-2.9-.4L5 19.5l1.2-3.4C4.2 14.8 3 13 3 11c0-3.9 4-7 9-7z" fill="#fff"/>',
  phone: '<path d="M6.6 3.5l2.6-.4 1.6 4-1.9 1.4a11 11 0 0 0 6 6l1.4-1.9 4 1.6-.4 2.6c-.2 1-1 1.7-2 1.7C10.5 18.5 5.5 13.5 5 5.5c0-1 .7-1.8 1.6-2z" fill="#fff"/>',
  mail: '<rect x="3" y="6" width="18" height="12.5" rx="2" fill="#fff"/><path d="M3.8 7.2l8.2 6 8.2-6" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.7" stroke-linejoin="round"/>',
  notes: '<path d="M6 7h12M6 11.5h12M6 16h8" stroke="#5a4500" stroke-width="2.2" stroke-linecap="round"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" fill="#fff"/>',
  heart: '<path d="M12 20s-7-4.4-8.6-9C2.3 7.7 4.4 5 7.3 5c1.9 0 3.2 1 4.7 2.7C13.5 6 14.8 5 16.7 5c2.9 0 5 2.7 3.9 6-1.6 4.6-8.6 9-8.6 9z" fill="#fff"/>',
  bolt: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6z" fill="#fff"/>',
  cart: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.7" fill="#fff"/><circle cx="17" cy="19" r="1.7" fill="#fff"/>',
  globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="#fff" stroke-width="1.5"/>'
};
var CUSTOM_GLYPHS = ["letter", "globe", "play", "chat", "spark", "note", "star", "heart", "bolt", "cart", "compass", "map"];
var CUSTOM_COLORS = ["#5ce1e6", "#f0a202", "#ff4fd8", "#3ddc84", "#ff4d5e", "#4f7cff", "#8b5cf6", "#111827"];

var DEFAULT_APPS = [
  { id: "x", name: "X", url: "twitter://", fb: "https://x.com", glyph: "letter", letter: "X", bg: "#000" },
  { id: "youtube", name: "YouTube", url: "youtube://", fb: "https://youtube.com", glyph: "play", bg: "#ff0033" },
  { id: "chatgpt", name: "ChatGPT", url: "chatgpt://", fb: "https://chatgpt.com", glyph: "chat", bg: "#10a37f" },
  { id: "grok", name: "Grok", url: "https://grok.com", glyph: "spark", bg: "#16161d" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com", glyph: "gem", bg: "linear-gradient(135deg,#4f7cff,#a25cff)" },
  { id: "maps", name: "Maps", url: "maps://", fb: "https://maps.apple.com/", glyph: "map", bg: "linear-gradient(135deg,#3ddc84,#2a9df4)" },
  { id: "music", name: "Music", url: "music://", fb: "https://music.apple.com", glyph: "note", bg: "linear-gradient(180deg,#ff6277,#fa2d48)" },
  { id: "spotify", name: "Spotify", url: "spotify://", fb: "https://open.spotify.com", glyph: "bars", bg: "#1db954" },
  { id: "messages", name: "Messages", url: "sms:", glyph: "bubble", bg: "linear-gradient(180deg,#5af575,#16c13c)" },
  { id: "phone", name: "Phone", url: "tel:", glyph: "phone", bg: "linear-gradient(180deg,#5af575,#16c13c)" },
  { id: "mail", name: "Mail", url: "mailto:", glyph: "mail", bg: "linear-gradient(180deg,#1ea1ff,#1166dd)" },
  { id: "calendar", name: "Calendar", url: "calshow://", glyph: "cal", bg: "#fff" },
  { id: "notes", name: "Notes", url: "mobilenotes://", glyph: "notes", bg: "linear-gradient(180deg,#fff6c2 0 28%,#ffd23f 28%)" },
  { id: "web", name: "Web", url: "https://www.google.com", glyph: "compass", bg: "linear-gradient(180deg,#5ce1e6,#1a73e8)" }
];
DEFAULT_APPS.forEach(function (a) { a.on = true; });
var DEFAULT_COINS = [{ id: "bitcoin", sym: "BTC", name: "Bitcoin" }, { id: "pax-gold", sym: "GOLD", name: "Gold (PAX Gold)" }];
var DEFAULT_SET = { name: "", units: "F", play: "music" };

var S = Object.assign({}, DEFAULT_SET, load("settings", {}));
var APPS = load("apps", null) || JSON.parse(JSON.stringify(DEFAULT_APPS));
// new default apps added in a later version show up for existing users too
DEFAULT_APPS.forEach(function (d) { if (!APPS.some(function (a) { return a.id === d.id; })) APPS.push(JSON.parse(JSON.stringify(d))); });
var COINS = load("coins", null) || JSON.parse(JSON.stringify(DEFAULT_COINS));
var LOC = load("loc", { mode: "gps" });

function iconHTML(a) {
  var inner;
  if (a.glyph === "cal") {
    var d = new Date();
    inner = '<span class="cal"><i>' + d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + '</i><b>' + d.getDate() + '</b></span>';
  } else if (a.glyph === "letter" || !G[a.glyph]) {
    inner = '<span class="let" style="color:' + (a.fg || "#f4efe4") + '">' + esc((a.letter || a.name || "?").trim().charAt(0).toUpperCase()) + '</span>';
  } else inner = '<svg viewBox="0 0 24 24" aria-hidden="true">' + G[a.glyph] + '</svg>';
  return '<span class="ico" style="background:' + esc(a.bg) + '">' + inner + '</span>';
}

// ---------- opening apps ----------
function openLink(url, fb) {
  if (/^https?:/i.test(url)) {
    var w = window.open(url, "_blank", "noopener");
    if (!w) location.href = url;
    return;
  }
  if (!fb) { location.href = url; return; }
  var left = false;
  function gone() { left = true; }
  document.addEventListener("visibilitychange", gone, { once: true });
  window.addEventListener("pagehide", gone, { once: true });
  window.addEventListener("blur", gone, { once: true });
  location.href = url;
  setTimeout(function () {
    document.removeEventListener("visibilitychange", gone); window.removeEventListener("pagehide", gone); window.removeEventListener("blur", gone);
    if (!left && document.visibilityState === "visible") {
      var w = window.open(fb, "_blank", "noopener");
      if (!w) location.href = fb;
    }
  }, 1200);
}

function renderApps() {
  var box = $("#apps"); box.innerHTML = "";
  APPS.filter(function (a) { return a.on; }).forEach(function (a) {
    var b = document.createElement("a");
    b.className = "app"; b.href = "#"; b.setAttribute("role", "listitem"); b.setAttribute("aria-label", "Open " + a.name);
    b.innerHTML = iconHTML(a) + '<span class="nm">' + esc(a.name) + '</span>';
    b.addEventListener("click", function (e) { e.preventDefault(); openLink(a.url, a.fb); });
    box.appendChild(b);
  });
  if (!box.children.length) box.innerHTML = '<p class="note">No apps shown. Tap EDIT APPS to turn some on.</p>';
}

// ---------- clock + greeting ----------
function tick() {
  var d = new Date(), h = d.getHours();
  $("#clock").firstChild.nodeValue = (h % 12 || 12) + ":" + pad2(d.getMinutes());
  $("#sec").textContent = pad2(d.getSeconds());
  $("#ampm").textContent = h < 12 ? "AM" : "PM";
  $("#date").textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  if (d.getSeconds() === 0 || !tick.done) { tick.done = true; minute(d); }
}
function minute(d) {
  var h = d.getHours();
  var part = h < 5 ? "LATE NIGHT" : h < 12 ? "GOOD MORNING" : h < 17 ? "GOOD AFTERNOON" : h < 22 ? "GOOD EVENING" : "LATE NIGHT";
  var nm = (S.name || "").trim().toUpperCase();
  var hrs = h + d.getMinutes() / 60;
  var pct = Math.max(0, Math.min(1, (hrs - DAY_START) / (DAY_END - DAY_START)));
  var remain = Math.max(0, DAY_END - hrs), lh = Math.floor(remain), lm = Math.round((remain - lh) * 60);
  if (lm === 60) { lh++; lm = 0; }
  var tip = hrs < DAY_START ? "REST UP · PLAN TODAY WHEN YOU WAKE" : pct >= 1 ? "DAY COMPLETE · TAP RECAP DAY" : hrs < 15 ? "TAP PLAN TODAY TO START" : "FINISH STRONG, THEN RECAP";
  $("#greet").textContent = "> " + part + (nm ? ", " + nm : "") + " · " + tip;
  $("#dayFill").style.width = Math.round(pct * 100) + "%";
  $("#dayTxt").textContent = "DAY " + Math.round(pct * 100) + "% · " + (pct >= 1 || hrs < DAY_START ? "OFF HOURS" : lh + "H " + pad2(lm) + "M LEFT (7A–11P)");
  var planFirst = hrs < 15;
  $("#actPlan").classList.toggle("primary", planFirst);
  $("#actRecap").classList.toggle("primary", !planFirst);
  $$(".app .cal").forEach(function (c) { c.innerHTML = '<i>' + d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + '</i><b>' + d.getDate() + '</b>'; });
  updateStamps();
}

// ---------- actions ----------
function playTarget() { return S.play === "spotify" ? ["spotify://", "https://open.spotify.com"] : ["music://", "https://music.apple.com"]; }
$("#actions").addEventListener("click", function (e) {
  var a = e.target.closest("[data-act]"); if (!a) return; e.preventDefault();
  var k = a.getAttribute("data-act");
  if (k === "recap") openLink("https://chatgpt.com/?q=" + encodeURIComponent(PROMPT_RECAP));
  else if (k === "plan") openLink("https://chatgpt.com/?q=" + encodeURIComponent(PROMPT_PLAN));
  else if (k === "build") openLink(BUILD_URL);
  else if (k === "play") { var p = playTarget(); openLink(p[0], p[1]); }
});
function setPlaySub() { $("#playSub").textContent = S.play === "spotify" ? "Spotify" : "Apple Music"; }

// ---------- weather FX (canvas only) ----------
var FXS = [];
var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function FX(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.kind = "none"; this.p = []; this.flash = 0; this.bolt = null; this.t0 = performance.now(); this.w = 0; this.h = 0; FXS.push(this); }
FX.prototype.size = function () {
  var r = this.cv.getBoundingClientRect(), dp = Math.min(window.devicePixelRatio || 1, 2);
  if (!r.width || !r.height) return false;
  if (Math.abs(r.width - this.w) > 1 || Math.abs(r.height - this.h) > 1) {
    this.w = r.width; this.h = r.height; this.cv.width = r.width * dp | 0; this.cv.height = r.height * dp | 0;
    this.ctx.setTransform(dp, 0, 0, dp, 0, 0); this.seed();
  }
  return true;
};
FX.prototype.set = function (k) { if (k !== this.kind) { this.kind = k; this.seed(); this.drawn = false; } };
FX.prototype.seed = function () {
  var W = this.w, H = this.h, k = this.kind, n, i, p = [];
  var area = Math.max(1, W * H / 20000);
  if (k === "rain" || k === "storm") { n = Math.round(26 * area); for (i = 0; i < n; i++) p.push({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 12, v: 380 + Math.random() * 260, a: .25 + Math.random() * .45 }); }
  else if (k === "snow") { n = Math.round(18 * area); for (i = 0; i < n; i++) p.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.6, v: 20 + Math.random() * 40, s: Math.random() * 6.28 }); }
  else if (k === "night") { n = Math.round(16 * area); for (i = 0; i < n; i++) p.push({ x: Math.random() * W, y: Math.random() * H * .9, r: .5 + Math.random() * 1.3, s: Math.random() * 6.28, f: .6 + Math.random() * 1.8 }); }
  if (k === "cloud" || k === "storm") { this.c = []; for (i = 0; i < 5; i++) this.c.push({ x: Math.random() * W, y: H * (.08 + Math.random() * .45), r: 40 + Math.random() * 60, v: 6 + Math.random() * 12 }); }
  this.p = p;
};
FX.prototype.draw = function (now, dt) {
  var c = this.ctx, W = this.w, H = this.h, k = this.kind, t = (now - this.t0) / 1000, i, q;
  c.clearRect(0, 0, W, H);
  if (k === "none") return;
  if (k === "sun") {
    var cx = W * .82, cy = H * .22, pulse = 1 + Math.sin(t * 1.6) * .08, R = Math.min(W, H) * .55 * pulse;
    var g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, "rgba(255,210,63,.55)"); g.addColorStop(.25, "rgba(240,162,2,.28)"); g.addColorStop(1, "rgba(240,162,2,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.save(); c.translate(cx, cy); c.rotate(t * .15); c.strokeStyle = "rgba(255,210,63,.22)"; c.lineWidth = 2;
    for (i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(R * .32, 0); c.lineTo(R * .62, 0); c.stroke(); }
    c.restore();
    c.fillStyle = "rgba(255,226,120,.9)"; c.beginPath(); c.arc(cx, cy, Math.min(W, H) * .09 * pulse, 0, 6.283); c.fill();
  }
  if (k === "night") {
    c.fillStyle = "rgba(244,239,228,.85)"; c.beginPath(); c.arc(W * .84, H * .2, Math.min(W, H) * .08, 0, 6.283); c.fill();
    c.fillStyle = "#0d1226"; c.beginPath(); c.arc(W * .84 + Math.min(W, H) * .035, H * .2 - Math.min(W, H) * .02, Math.min(W, H) * .075, 0, 6.283); c.fill();
    for (i = 0; i < this.p.length; i++) { q = this.p[i]; c.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * q.f + q.s)); c.fillStyle = "#f4efe4"; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
    c.globalAlpha = 1;
  }
  if (k === "cloud" || k === "storm") {
    for (i = 0; i < this.c.length; i++) {
      q = this.c[i]; q.x += q.v * dt; if (q.x - q.r * 2 > W) q.x = -q.r * 2;
      var cg = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 1.6);
      var col = k === "storm" ? "60,70,100" : "150,165,200";
      cg.addColorStop(0, "rgba(" + col + ",.32)"); cg.addColorStop(1, "rgba(" + col + ",0)");
      c.fillStyle = cg; c.beginPath(); c.ellipse(q.x, q.y, q.r * 1.6, q.r * .9, 0, 0, 6.283); c.fill();
    }
  }
  if (k === "rain" || k === "storm") {
    c.strokeStyle = "rgba(92,225,230,.6)"; c.lineWidth = 1.2; c.lineCap = "round";
    for (i = 0; i < this.p.length; i++) {
      q = this.p[i]; q.y += q.v * dt; q.x -= q.v * dt * .18;
      if (q.y > H) { q.y = -q.l; q.x = Math.random() * (W + 40); }
      c.globalAlpha = q.a; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.l * .18, q.y + q.l); c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (k === "storm") {
    if (this.flash <= 0 && Math.random() < dt * .45) {
      this.flash = 1; var x = W * (.2 + Math.random() * .6), y = 0, pts = [[x, y]];
      while (y < H * .8) { y += 10 + Math.random() * 18; x += (Math.random() - .5) * 26; pts.push([x, y]); }
      this.bolt = pts;
    }
    if (this.flash > 0) {
      c.fillStyle = "rgba(220,235,255," + (this.flash * .35) + ")"; c.fillRect(0, 0, W, H);
      if (this.bolt) { c.strokeStyle = "rgba(255,255,255," + this.flash + ")"; c.lineWidth = 2.2; c.beginPath(); this.bolt.forEach(function (pt, j) { j ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1]); }); c.stroke(); }
      this.flash -= dt * 2.6;
    }
  }
  if (k === "snow") {
    c.fillStyle = "rgba(244,239,228,.85)";
    for (i = 0; i < this.p.length; i++) {
      q = this.p[i]; q.y += q.v * dt; q.x += Math.sin(t + q.s) * 12 * dt;
      if (q.y > H + 4) { q.y = -4; q.x = Math.random() * W; }
      c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill();
    }
  }
  if (k === "fog") {
    for (i = 0; i < 4; i++) {
      var y0 = H * (.2 + i * .2) + Math.sin(t * .4 + i) * 8, off = Math.sin(t * .25 + i * 1.7) * W * .15;
      var fg = c.createLinearGradient(0, y0 - 18, 0, y0 + 18);
      fg.addColorStop(0, "rgba(180,190,215,0)"); fg.addColorStop(.5, "rgba(180,190,215,.2)"); fg.addColorStop(1, "rgba(180,190,215,0)");
      c.fillStyle = fg; c.fillRect(off - W * .2, y0 - 18, W * 1.4, 36);
    }
  }
};
var lastT = performance.now();
function loop(now) {
  var dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (document.visibilityState === "visible") FXS.forEach(function (f) {
    if (!f.size()) return;
    if (RM) { if (!f.drawn) { f.draw(now, 0); f.drawn = true; } return; }
    f.draw(now, dt);
  });
  requestAnimationFrame(loop);
}
var fxMini = new FX($("#fxMini")), fxMain = new FX($("#fxMain"));
function fxKind(code, day) {
  if (code === 0 || code === 1) return day ? "sun" : "night";
  if (code <= 3) return "cloud";
  if (code <= 48) return "fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 77 || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}
function wxText(c) {
  if (c === 0) return "CLEAR"; if (c === 1) return "MOSTLY CLEAR"; if (c === 2) return "PARTLY CLOUDY"; if (c === 3) return "CLOUDY";
  if (c <= 48) return "FOG"; if (c <= 57) return "DRIZZLE"; if (c <= 67) return "RAIN"; if (c <= 77) return "SNOW";
  if (c <= 82) return "SHOWERS"; if (c <= 86) return "SNOW SHOWERS"; return "THUNDERSTORMS";
}
function wxEmoji(c, day) {
  if (c === 0) return day ? "☀️" : "🌙"; if (c === 1) return day ? "🌤️" : "🌙"; if (c === 2) return "⛅"; if (c === 3) return "☁️";
  if (c <= 48) return "🌫️"; if (c <= 57) return "🌦️"; if (c <= 67) return "🌧️"; if (c <= 77) return "🌨️";
  if (c <= 82) return "🌧️"; if (c <= 86) return "🌨️"; return "⛈️";
}
var FX_DEBUG = { rain: [63, 1], snow: [73, 1], sun: [0, 1], night: [0, 0], cloud: [3, 1], storm: [95, 1], fog: [45, 1] };

// ---------- weather data ----------
var WX = load("wx", null);
function unitQ() { return S.units === "C" ? "&temperature_unit=celsius&wind_speed_unit=kmh" : "&temperature_unit=fahrenheit&wind_speed_unit=mph"; }
function getJSON(url, ms) {
  var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, ms || 12000);
  return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}
function getPos() {
  return new Promise(function (res, rej) {
    if (!navigator.geolocation) return rej(new Error("no geo"));
    navigator.geolocation.getCurrentPosition(function (p) { res({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); }, rej, { timeout: 12000, maximumAge: 600000, enableHighAccuracy: false });
  });
}
function placeName(lat, lon) {
  return getJSON("https://api-bdc.io/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=en", 8000)
    .then(function (j) { var c = j.city || j.locality || ""; var s = (j.principalSubdivisionCode || "").split("-").pop() || j.countryCode || ""; return (c ? c + (s ? ", " + s : "") : "MY LOCATION"); })
    .catch(function () { return "MY LOCATION"; });
}
var wxBusy = false;
function refreshWeather(force) {
  if (wxBusy) return; if (!force && WX && WX.at && Date.now() - WX.at < 10 * 60000 && WX.units === S.units && WX.key === locKey()) { renderWeather(); return; }
  wxBusy = true;
  var p = LOC.mode === "city" && LOC.lat != null ? Promise.resolve(LOC) :
    getPos().then(function (pos) {
      var same = LOC.mode === "gps" && LOC.lat === pos.lat && LOC.lon === pos.lon && LOC.name;
      return (same ? Promise.resolve(LOC.name) : placeName(pos.lat, pos.lon)).then(function (nm) { LOC = { mode: "gps", lat: pos.lat, lon: pos.lon, name: nm }; save("loc", LOC); return LOC; });
    }, function (err) { if (LOC.lat != null) return LOC; throw { geo: true, err: err }; });
  p.then(function (L) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + L.lat + "&longitude=" + L.lon +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
      "&hourly=temperature_2m,weather_code,is_day,precipitation_probability" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset" +
      unitQ() + "&timezone=auto&forecast_days=6";
    return getJSON(url).then(function (j) { WX = { at: Date.now(), units: S.units, key: locKey(), place: L.name || "MY LOCATION", j: j }; save("wx", WX); $("#wxNote").textContent = ""; });
  }).catch(function (e) {
    if (e && e.geo) $("#wxNote").innerHTML = "Location is off for this app. Tap <b>◎ CHANGE</b> above to type your city instead.";
    else $("#wxNote").textContent = navigator.onLine === false ? "You're offline. Showing the last weather we saved." : "Weather service didn't answer. We'll retry in a few minutes.";
    if (e && e.geo && !WX) { $("#wxPlace").textContent = "LOCATION OFF"; $("#wxMiniC").textContent = "TAP TO SET CITY"; $("#wxCond").textContent = "SET YOUR CITY"; }
  }).then(function () { wxBusy = false; renderWeather(); });
}
function locKey() { return LOC.mode + ":" + LOC.lat + "," + LOC.lon; }
function renderWeather() {
  var fk = FORCE_FX && FX_DEBUG[FORCE_FX];
  if (!WX || !WX.j) { if (fk) { fxMini.set(FORCE_FX); fxMain.set(FORCE_FX); } return; }
  var j = WX.j, cu = j.current, u = S.units === "C" ? "C" : "F", wu = S.units === "C" ? "km/h" : "mph";
  var code = fk ? fk[0] : cu.weather_code, day = fk ? fk[1] === 1 : cu.is_day === 1;
  var kind = fk ? FORCE_FX : fxKind(code, day);
  fxMini.set(kind); fxMain.set(kind);
  $("#wxPlace").textContent = "➤ " + WX.place.toUpperCase() + (fk ? " · FX TEST: " + FORCE_FX.toUpperCase() : "");
  $("#wxTemp").textContent = Math.round(cu.temperature_2m) + "°";
  $("#wxIcon").textContent = wxEmoji(code, day);
  $("#wxCond").textContent = wxText(code);
  $("#wxHL").textContent = "H " + Math.round(j.daily.temperature_2m_max[0]) + "° · L " + Math.round(j.daily.temperature_2m_min[0]) + "°";
  $("#wxFeels").textContent = Math.round(cu.apparent_temperature) + "°";
  $("#wxRain").textContent = (j.daily.precipitation_probability_max[0] || 0) + "%";
  $("#wxWind").textContent = Math.round(cu.wind_speed_10m) + " " + wu;
  $("#wxSun").textContent = j.daily.sunset[0] ? isoT12(j.daily.sunset[0]) : "--";
  $("#wxMiniT").textContent = Math.round(cu.temperature_2m) + "°" + u;
  $("#wxMiniC").textContent = wxEmoji(code, day) + " " + wxText(code) + " · H" + Math.round(j.daily.temperature_2m_max[0]) + " L" + Math.round(j.daily.temperature_2m_min[0]);
  // hourly: NOW + next 11 hours
  var key = cu.time.slice(0, 13), idx = j.hourly.time.findIndex(function (t) { return t.slice(0, 13) === key; }); if (idx < 0) idx = 0;
  var hs = "";
  for (var k = 0; k < 12 && idx + k < j.hourly.time.length; k++) {
    var i = idx + k, rp = j.hourly.precipitation_probability[i] || 0;
    hs += '<div class="hr"><small>' + (k ? isoH(j.hourly.time[i]) : "NOW") + '</small><span>' + wxEmoji(j.hourly.weather_code[i], j.hourly.is_day[i] === 1) + '</span><b>' + Math.round(j.hourly.temperature_2m[i]) + '°</b><em>' + (rp >= 20 ? rp + "%" : "") + '</em></div>';
  }
  $("#wxHours").innerHTML = hs;
  var ds = "";
  for (var d = 0; d < 5 && d < j.daily.time.length; d++) {
    var dt = new Date(j.daily.time[d] + "T12:00:00"), nm = d === 0 ? "TODAY" : dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    var dc = j.daily.weather_code[d];
    ds += '<div class="day"><span class="d">' + nm + '</span><span>' + wxEmoji(dc, true) + '</span><span class="c">' + wxText(dc) + '</span><span class="r">' + (j.daily.precipitation_probability_max[d] || 0) + '%</span><span class="t">' + Math.round(j.daily.temperature_2m_max[d]) + '° <span>/ ' + Math.round(j.daily.temperature_2m_min[d]) + '°</span></span></div>';
  }
  $("#wxDays").innerHTML = ds;
  updateStamps();
}

// ---------- markets ----------
var MK = load("mk", null), mkErr = false;
function money(n) {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1000) return "$" + Math.round(n).toLocaleString("en-US");
  if (n >= 1) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "$" + n.toPrecision(3);
}
function refreshMarkets() {
  if (!COINS.length) { renderMarkets(); return; }
  var ids = COINS.map(function (c) { return c.id; }).join(",");
  getJSON("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(ids) + "&vs_currencies=usd&include_24hr_change=true")
    .then(function (j) { MK = { at: Date.now(), d: Object.assign({}, MK && MK.d, j) }; save("mk", MK); mkErr = false; })
    .catch(function () { mkErr = true; })
    .then(renderMarkets);
}
function chHTML(ch) { if (ch == null || isNaN(ch)) return '<span class="dim">--</span>'; return '<span class="' + (ch >= 0 ? "up" : "dn") + '">' + (ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(2) + "%</span>"; }
function renderMarkets() {
  var d = MK && MK.d || {}, list = "", mini = "";
  COINS.forEach(function (c, i) {
    var q = d[c.id];
    list += '<div class="mkr"><span class="sym">' + esc(c.sym) + '</span><span class="nm2">' + esc(c.name) + '</span><span class="px">' + (q ? money(q.usd) : "--") + '</span><span class="ch">' + (q ? chHTML(q.usd_24h_change) : "") + "</span></div>";
    if (i < 3) mini += '<span class="mkrow"><span>' + esc(c.sym) + " " + (q ? money(q.usd) : "--") + "</span>" + (q ? chHTML(q.usd_24h_change) : "") + "</span>";
  });
  if (!COINS.length) { list = '<p class="offline">Your watchlist is empty. Tap ✎ EDIT to add a coin.</p>'; mini = '<span class="sub">TAP TO ADD COINS</span>'; }
  if (mkErr && !(MK && MK.at)) { list = '<p class="offline">Markets offline. We\'ll retry in 2 minutes.</p>'; mini = '<span class="sub">MARKETS OFFLINE</span>'; }
  else if (mkErr) list += '<p class="offline">Couldn\'t refresh. Showing the last prices we saved.</p>';
  $("#mkList").innerHTML = list; $("#mkMiniList").innerHTML = mini;
  updateStamps();
}
function updateStamps() {
  var st = function (el, at) { if (!el) return; if (!at) { el.textContent = "UPDATED --"; el.classList.add("old"); return; } el.textContent = "UPDATED " + t12(new Date(at)); el.classList.toggle("old", Date.now() - at > 30 * 60000); };
  st($("#wxStamp"), WX && WX.at); st($("#mkStamp"), MK && MK.at);
}

// ---------- tabs ----------
function show(tab) {
  if (tab === "menu") { openMenu(); return; }
  ["home", "weather", "markets"].forEach(function (t) { $("#v-" + t).hidden = t !== tab; });
  $$(".tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
}
$$(".tab").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-tab")); }); });
$("#wxMini").addEventListener("click", function () { show("weather"); });
$("#mkMini").addEventListener("click", function () { show("markets"); });

// ---------- sheet ----------
var sheetStack = [];
function sheet(title, html, bind, push) {
  if (!push) sheetStack = [];
  sheetStack.push([title, html, bind]);
  $("#sheetTitle").textContent = title; $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; $("#scrim").hidden = false;
  $("#sheetBody").scrollTop = 0;
  if (bind) bind($("#sheetBody"));
}
function closeSheet() { $("#sheet").hidden = true; $("#scrim").hidden = true; sheetStack = []; }
$("#sheetClose").addEventListener("click", closeSheet);
$("#scrim").addEventListener("click", closeSheet);
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
$("#menuBtn").addEventListener("click", openMenu);
$("#editAppsBtn").addEventListener("click", function () { openEditApps(); });
$("#editMkBtn").addEventListener("click", function () { openEditCoins(); });
$("#cityBtn").addEventListener("click", function () { openCity(); });

function row(icon, label, sub, act) { return '<button class="mrow" data-go="' + act + '"><span class="mi" aria-hidden="true">' + icon + '</span><span class="grow">' + label + "<small>" + sub + '</small></span><span aria-hidden="true">›</span></button>'; }
function openMenu() {
  sheet("☰ MENU",
    "<h3>APPS</h3>" + row("▦", "Edit apps", "Show, hide, reorder, or add your own", "apps") +
    "<h3>WEATHER</h3>" + row("☁", "Weather location", LOC.mode === "city" ? "City: " + esc(LOC.name) : "Using my location", "city") +
    "<h3>MARKETS</h3>" + row("₿", "Edit watchlist", COINS.map(function (c) { return esc(c.sym); }).join(" · ") || "Empty", "coins") +
    "<h3>SETTINGS</h3>" + row("⚙", "Settings", "Your name, °F / °C, PLAY button, reset", "settings") +
    "<h3>HELP</h3>" + row("?", "Add to Home Screen", "3 steps to open it like a real app", "help") +
    '<p class="note" style="margin-top:12px">ZAPWISE//OS v' + VERSION + " · Everything you change is saved on this device only.</p>",
    function (b) {
      b.addEventListener("click", function (e) {
        var g = e.target.closest("[data-go]"); if (!g) return; var k = g.getAttribute("data-go");
        if (k === "apps") openEditApps(true); else if (k === "city") openCity(true); else if (k === "coins") openEditCoins(true); else if (k === "settings") openSettings(true); else openHelp(true);
      });
    });
}

// ----- edit apps -----
function openEditApps(push) {
  var html = '<p class="note" style="margin-bottom:10px">Switch an app on or off, and use ▲ ▼ to move it.</p><div id="eList"></div>' +
    '<h3>ADD YOUR OWN APP</h3>' +
    '<label class="field">NAME<input id="caName" maxlength="14" placeholder="e.g. Instagram" autocomplete="off"></label>' +
    '<label class="field">LINK OR APP LINK<input id="caUrl" placeholder="e.g. instagram.com or instagram://" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="field">ICON</div><div class="glyphs" id="caG"></div>' +
    '<div class="field">COLOR</div><div class="colors" id="caC"></div>' +
    '<button class="btn" id="caAdd">＋ ADD APP</button>' +
    '<button class="btn alt" id="appsReset" style="margin-top:12px">Reset apps to default</button>';
  sheet("▦ EDIT APPS", html, function (b) {
    var gSel = "letter", cSel = CUSTOM_COLORS[0];
    function drawList() {
      var L = b.querySelector("#eList"); L.innerHTML = "";
      APPS.forEach(function (a, i) {
        var r = document.createElement("div"); r.className = "erow" + (a.on ? "" : " off");
        r.innerHTML = iconHTML(a) + '<span class="en">' + esc(a.name) + '</span>' +
          '<button class="sq" data-m="up" aria-label="Move ' + esc(a.name) + ' up"' + (i ? "" : " disabled") + '>▲</button>' +
          '<button class="sq" data-m="dn" aria-label="Move ' + esc(a.name) + ' down"' + (i < APPS.length - 1 ? "" : " disabled") + '>▼</button>' +
          (a.custom ? '<button class="sq" data-m="del" aria-label="Delete ' + esc(a.name) + '" style="color:#ff4d5e">✕</button>' : "") +
          '<button class="sw" role="switch" aria-checked="' + a.on + '" aria-label="Show ' + esc(a.name) + '" data-m="tog"></button>';
        r.addEventListener("click", function (e) {
          var m = e.target.closest("[data-m]"); if (!m) return; m = m.getAttribute("data-m");
          if (m === "tog") a.on = !a.on;
          else if (m === "up" && i) { APPS.splice(i, 1); APPS.splice(i - 1, 0, a); }
          else if (m === "dn" && i < APPS.length - 1) { APPS.splice(i, 1); APPS.splice(i + 1, 0, a); }
          else if (m === "del") { if (!confirm("Delete " + a.name + "?")) return; APPS.splice(i, 1); }
          save("apps", APPS); renderApps(); drawList();
        });
        L.appendChild(r);
      });
    }
    function drawPick() {
      b.querySelector("#caG").innerHTML = CUSTOM_GLYPHS.map(function (g) {
        return '<button data-g="' + g + '" class="' + (g === gSel ? "on" : "") + '" aria-label="Icon ' + g + '" style="background:' + cSel + '">' + (g === "letter" ? '<span style="font-weight:800;font-size:18px;color:#fff">' + esc((b.querySelector("#caName").value || "A").charAt(0).toUpperCase()) + "</span>" : '<svg viewBox="0 0 24 24">' + G[g] + "</svg>") + "</button>";
      }).join("");
      b.querySelector("#caC").innerHTML = CUSTOM_COLORS.map(function (c) { return '<button data-c="' + c + '" class="' + (c === cSel ? "on" : "") + '" aria-label="Color ' + c + '" style="background:' + c + '"></button>'; }).join("");
    }
    b.querySelector("#caG").addEventListener("click", function (e) { var x = e.target.closest("[data-g]"); if (x) { gSel = x.getAttribute("data-g"); drawPick(); } });
    b.querySelector("#caC").addEventListener("click", function (e) { var x = e.target.closest("[data-c]"); if (x) { cSel = x.getAttribute("data-c"); drawPick(); } });
    b.querySelector("#caName").addEventListener("input", drawPick);
    b.querySelector("#caAdd").addEventListener("click", function () {
      var nm = b.querySelector("#caName").value.trim(), u = b.querySelector("#caUrl").value.trim();
      if (!nm) { toast("Type a name for the app"); return; }
      if (!u) { toast("Type a link, like instagram.com"); return; }
      if (/^javascript:|^data:/i.test(u)) { toast("That link type isn't allowed"); return; }
      if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u.replace(/^\/+/, "");
      APPS.push({ id: "c" + Date.now(), name: nm, url: u, glyph: gSel, letter: nm, bg: cSel, on: true, custom: true });
      save("apps", APPS); renderApps(); drawList();
      b.querySelector("#caName").value = ""; b.querySelector("#caUrl").value = ""; drawPick();
      toast(nm + " added to your apps");
    });
    b.querySelector("#appsReset").addEventListener("click", function () {
      if (!confirm("Reset apps to the default list? Your own apps will be removed.")) return;
      APPS = JSON.parse(JSON.stringify(DEFAULT_APPS)); save("apps", APPS); renderApps(); drawList(); toast("Apps reset");
    });
    drawList(); drawPick();
  }, push);
}

// ----- weather location -----
function openCity(push) {
  sheet("☁ WEATHER LOCATION",
    '<button class="btn alt" id="useGps">◎ Use my location</button>' +
    '<h3>OR TYPE A CITY</h3><label class="field">CITY<input id="cityQ" placeholder="e.g. Chicago" autocomplete="off"></label><div id="cityRes"></div>',
    function (b) {
      b.querySelector("#useGps").addEventListener("click", function () { LOC = { mode: "gps" }; save("loc", LOC); WX = null; closeSheet(); toast("Using your location"); refreshWeather(true); });
      var tm;
      b.querySelector("#cityQ").addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 2) { b.querySelector("#cityRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          getJSON("https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + encodeURIComponent(q)).then(function (j) {
            var R = j.results || [];
            b.querySelector("#cityRes").innerHTML = R.length ? R.map(function (r, i) { return '<button class="res" data-i="' + i + '">' + esc(r.name) + ' <small>' + esc([r.admin1, r.country_code].filter(Boolean).join(", ")) + '</small><span class="add">USE</span></button>'; }).join("") : '<p class="note">No city found. Check the spelling.</p>';
            $$("[data-i]", b.querySelector("#cityRes")).forEach(function (x) {
              x.addEventListener("click", function () {
                var r = R[+x.getAttribute("data-i")]; var st = r.admin1_code && r.country_code === "US" ? r.admin1_code : r.country_code;
                LOC = { mode: "city", lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3), name: r.name + (r.admin1 ? ", " + (r.country_code === "US" ? r.admin1 : r.country_code) : "") };
                save("loc", LOC); WX = null; closeSheet(); toast("Weather set to " + r.name); refreshWeather(true);
              });
            });
          }).catch(function () { b.querySelector("#cityRes").innerHTML = '<p class="note">Search is offline. Try again in a moment.</p>'; });
        }, 350);
      });
      setTimeout(function () { var i = b.querySelector("#cityQ"); i && i.focus && i.focus({ preventScroll: true }); }, 50);
    }, push);
}

// ----- markets edit -----
function openEditCoins(push) {
  sheet("₿ EDIT WATCHLIST",
    '<div id="cList"></div><h3>ADD A COIN</h3><label class="field">SEARCH<input id="coinQ" placeholder="e.g. Ethereum, SOL, Dogecoin" autocomplete="off" autocapitalize="off"></label><div id="coinRes"></div>' +
    '<p class="note" style="margin-top:10px">Prices come from CoinGecko. Stock tickers aren\'t available here: there\'s no free stock price feed a web page can use without a key.</p>' +
    '<button class="btn alt" id="coinReset" style="margin-top:12px">Reset to BTC + Gold</button>',
    function (b) {
      function drawList() {
        var L = b.querySelector("#cList"); L.innerHTML = COINS.length ? "" : '<p class="note">Empty. Search below to add a coin.</p>';
        COINS.forEach(function (c, i) {
          var r = document.createElement("div"); r.className = "erow";
          r.innerHTML = '<span class="en"><b style="color:#5ce1e6">' + esc(c.sym) + '</b> <small style="color:#6b7896">' + esc(c.name) + '</small></span>' +
            '<button class="sq" data-m="up" aria-label="Move up"' + (i ? "" : " disabled") + '>▲</button><button class="sq" data-m="dn" aria-label="Move down"' + (i < COINS.length - 1 ? "" : " disabled") + '>▼</button><button class="sq" data-m="del" aria-label="Remove ' + esc(c.sym) + '" style="color:#ff4d5e">✕</button>';
          r.addEventListener("click", function (e) {
            var m = e.target.closest("[data-m]"); if (!m) return; m = m.getAttribute("data-m");
            if (m === "up" && i) { COINS.splice(i, 1); COINS.splice(i - 1, 0, c); }
            else if (m === "dn" && i < COINS.length - 1) { COINS.splice(i, 1); COINS.splice(i + 1, 0, c); }
            else if (m === "del") COINS.splice(i, 1);
            save("coins", COINS); renderMarkets(); drawList();
          });
          L.appendChild(r);
        });
      }
      var tm;
      b.querySelector("#coinQ").addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 2) { b.querySelector("#coinRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          getJSON("https://api.coingecko.com/api/v3/search?query=" + encodeURIComponent(q)).then(function (j) {
            var R = (j.coins || []).slice(0, 8);
            b.querySelector("#coinRes").innerHTML = R.length ? R.map(function (r, i) { return '<button class="res" data-i="' + i + '"><b>' + esc(r.symbol) + '</b> <small>' + esc(r.name) + (r.market_cap_rank ? " · #" + r.market_cap_rank : "") + '</small><span class="add">＋ ADD</span></button>'; }).join("") : '<p class="note">No coin found.</p>';
            $$("[data-i]", b.querySelector("#coinRes")).forEach(function (x) {
              x.addEventListener("click", function () {
                var r = R[+x.getAttribute("data-i")];
                if (COINS.some(function (c) { return c.id === r.id; })) { toast(r.symbol + " is already on your list"); return; }
                if (COINS.length >= 8) { toast("Up to 8 coins. Remove one first."); return; }
                COINS.push({ id: r.id, sym: String(r.symbol).toUpperCase().slice(0, 8), name: r.name }); save("coins", COINS); drawList(); renderMarkets(); refreshMarkets(); toast(r.symbol + " added");
              });
            });
          }).catch(function () { b.querySelector("#coinRes").innerHTML = '<p class="note">Search is busy or offline. Try again in a moment.</p>'; });
        }, 450);
      });
      b.querySelector("#coinReset").addEventListener("click", function () { COINS = JSON.parse(JSON.stringify(DEFAULT_COINS)); save("coins", COINS); drawList(); refreshMarkets(); toast("Watchlist reset"); });
      drawList();
    }, push);
}

// ----- settings -----
function openSettings(push) {
  sheet("⚙ SETTINGS",
    '<label class="field">YOUR NAME (FOR THE GREETING)<input id="stName" maxlength="20" placeholder="e.g. Sam" value="' + esc(S.name) + '" autocomplete="off"></label>' +
    '<div class="field">TEMPERATURE</div><div class="seg" id="stU"><button data-v="F">°F · mph</button><button data-v="C">°C · km/h</button></div>' +
    '<div class="field">PLAY BUTTON OPENS</div><div class="seg" id="stP"><button data-v="music">Apple Music</button><button data-v="spotify">Spotify</button></div>' +
    '<button class="btn" id="stSave">SAVE</button>' +
    '<h3>RESET</h3><button class="btn warn" id="stReset">Reset everything to defaults</button>',
    function (b) {
      var u = S.units, p = S.play;
      function seg() { $$("#stU button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === u); }); $$("#stP button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === p); }); }
      b.querySelector("#stU").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { u = x.getAttribute("data-v"); seg(); } });
      b.querySelector("#stP").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { p = x.getAttribute("data-v"); seg(); } });
      b.querySelector("#stSave").addEventListener("click", function () {
        var uc = u !== S.units; S.name = b.querySelector("#stName").value.trim().slice(0, 20); S.units = u; S.play = p; save("settings", S);
        minute(new Date()); setPlaySub(); closeSheet(); toast("Saved"); if (uc) refreshWeather(true);
      });
      b.querySelector("#stReset").addEventListener("click", function () {
        if (!confirm("Reset apps, watchlist, weather city and settings to the defaults?")) return;
        ["settings", "apps", "coins", "loc", "wx", "mk"].forEach(function (k) { try { localStorage.removeItem("zapos." + k); } catch (e) {} });
        location.reload();
      });
      seg();
    }, push);
}

// ----- help -----
function openHelp(push) {
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  sheet("? ADD TO HOME SCREEN",
    (standalone ? '<p class="note" style="color:#3ddc84;margin-bottom:10px">✓ You\'re already using it from your Home Screen.</p>' : "") +
    '<ol class="steps"><li>Open <b>zapwiseai.com/os</b> in <b>Safari</b> and tap the <b>Share</b> button (the square with an arrow ↑).</li>' +
    '<li>Scroll down and tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>' +
    '<li>Open <b>ZAP//OS</b> from the new icon on your Home Screen. It opens full screen, like an app.</li></ol>' +
    '<h3>GOOD TO KNOW</h3><p class="note">App tiles open the app if it\'s installed. If it isn\'t, the website opens instead after about a second. Weather asks for your location once; tap Allow, or set a city in the menu. Your choices are saved on this phone only.</p>',
    null, push);
}

// ---------- boot ----------
renderApps(); setPlaySub(); tick(); setInterval(tick, 1000);
renderWeather(); renderMarkets();
requestAnimationFrame(loop);
var t = Q.get("tab"); if (t === "weather" || t === "markets" || t === "home") show(t);
refreshWeather(); refreshMarkets();
setInterval(function () { if (document.visibilityState === "visible") refreshWeather(); }, 5 * 60000);
setInterval(function () { if (document.visibilityState === "visible") refreshMarkets(); }, 2 * 60000);
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { tick(); refreshWeather(); if (!MK || Date.now() - MK.at > 120000) refreshMarkets(); } });
window.addEventListener("online", function () { refreshWeather(true); refreshMarkets(); });
if ("serviceWorker" in navigator && location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/os/sw.js", { scope: "/os/" }).catch(function () {});
}
if (!load("seenHelp", false) && !(window.navigator.standalone === true)) { save("seenHelp", true); setTimeout(function () { toast("Tip: MENU → Help shows how to add this to your Home Screen"); }, 1500); }
})();
