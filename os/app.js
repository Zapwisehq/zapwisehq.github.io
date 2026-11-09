/* ZAPWISE//OS web app v4.13.2 (Nov 5, 2026). Equal-height desktop Focus/Phone. Plaid-only Bank. Motion toggle. No tabs. Source: edit app.js → build.sh → app.min.js. */
(function () {
"use strict";
var VERSION = '4.25.0';
var APP_VERSION = VERSION;

// v4.5: default Lite on coarse/mobile unless user already chose
(function seedLiteDefault() {
  try {
    var raw = localStorage.getItem("zapos.device");
    var j = raw ? JSON.parse(raw) : {};
    if (!j || typeof j !== "object") j = {};
    if (Object.prototype.hasOwnProperty.call(j, "liteMode")) return;
    var mobile = false;
    try {
      mobile = (window.matchMedia && (matchMedia("(pointer: coarse)").matches || matchMedia("(max-width: 900px)").matches))
        || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "")
        || window.navigator.standalone === true;
    } catch (e) {}
    if (mobile) {
      j.liteMode = true;
      localStorage.setItem("zapos.device", JSON.stringify(j));
      try { document.documentElement.classList.add("fx-lite"); } catch (e2) {}
    }
  } catch (e) {}
})();

// ========== v3.12 3D FX (lazy) ==========
var _fx3dLoading = null;
function fx3dWanted() {
  return false; /* v4.9.2: wallpaper + 3D removed (iOS scroll flicker) */
  try {
    if (Store.getLocal("liteMode", false)) return false;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch (e) {}
  return true;
}
function loadFx3d() {
  if (!fx3dWanted()) return Promise.resolve(null); /* v4.9.4: still mode — 3D layer removed */
  if (window.ZAPFX3D) return Promise.resolve(window.ZAPFX3D);
  if (_fx3dLoading) return _fx3dLoading;
  _fx3dLoading = new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = "/os/fx3d.js?v=" + VERSION;
    s.async = true;
    s.onload = function () { res(window.ZAPFX3D); };
    s.onerror = function () { _fx3dLoading = null; rej(new Error("fx3d")); };
    document.head.appendChild(s);
  });
  return _fx3dLoading;
}

// ========== v4 cinematic city (lazy, after first paint) ==========
var _cineLoading = null;
function loadCinematic() {
  if (!fx3dWanted()) return Promise.resolve(null);
  if (window.ZAPCINE) return Promise.resolve(window.ZAPCINE);
  if (_cineLoading) return _cineLoading;
  _cineLoading = new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = "/os/cinematic.js?v=" + VERSION;
    s.async = true;
    s.onload = function () { res(window.ZAPCINE); };
    s.onerror = function () { _cineLoading = null; rej(new Error("cine")); };
    document.head.appendChild(s);
  });
  return _cineLoading;
}
function initCinematic() {
  if (!fx3dWanted()) return Promise.resolve(null);
  return loadCinematic().then(function (cine) {
    if (!cine) return null;
    return cine.start().then(function (ok) {
      if (ok) {
        try {
          document.documentElement.classList.add("fx-3d");
          document.documentElement.classList.remove("fx-lite");
        } catch (e) {}
      }
      return cine;
    });
  }).catch(function () { return null; });
}


// ========== v4.2 one-page HUD (scroll to section; no tab bar) ==========
var HUD_TABS = ["home","weather","markets","map","music","phone","focus","apps","settings"];
var HUD_TAB = "home";
var HUD_SEC = { home:"heroCard", weather:"hWx", markets:"hMk", map:"hMap", music:"hPlay", phone:"phoneMount", focus:"mFocus", apps:"appsSection", settings:"appsSection" };
function hudScreen(id) { return document.getElementById(HUD_SEC[id] || ("sec-" + id)) || document.getElementById("screen-" + id); }
function setHudTab(id, opts) {
  opts = opts || {};
  if (HUD_TABS.indexOf(id) < 0) id = "home";
  HUD_TAB = id;
  try { if (typeof closeZapAssistant === "function") closeZapAssistant(true); } catch (e0) {}
  try { if (window.ZAPCINE && window.ZAPCINE.setTab) window.ZAPCINE.setTab(HUD_TABS.indexOf(id)); } catch (e) {}
  try { Store.setUI({ view: "hud:" + id }); } catch (e1) {}
  if (id === "phone") { try { mountPhoneScreen(); } catch (e) {} }
  if (id === "settings") { try { openSettings(); } catch (e) {} return; }
  if (id === "map") { try { setTimeout(function () { renderMap(true); window.dispatchEvent(new Event("resize")); }, 60); } catch (e) {} }
  if (id === "weather") { try { if (typeof renderConditions === "function") renderConditions(); } catch (e) {} }
  if (id === "markets") { try { if (typeof renderMarkets === "function") renderMarkets(); } catch (e) {} }
  if (opts.silent || opts.noScroll) return;
  /* Never window.scrollTo(0) — missing anchors used to yank the page to the top (first Markets tap). */
  var el = hudScreen(id);
  if (el && el.scrollIntoView) {
    try { el.scrollIntoView({ behavior: "auto", block: "nearest" }); } catch (e) {}
  }
  try { if (typeof sfxTap === "function") sfxTap(); } catch (e3) {}
}
function bindHudTabs() {
  // No tab bar in v4.2 — keep data-go-tab as in-page scroll anchors
  if (document.documentElement._hudGoBound) return;
  document.documentElement._hudGoBound = true;
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go-tab]");
    if (!go) return;
    e.preventDefault();
    setHudTab(go.getAttribute("data-go-tab"));
  });
}
function forceCardsVisible() {
  /* v4.6.1: NEVER leave the home screen blank. Cards must not wait on IO/opacity. */
  try {
    document.documentElement.classList.remove("detail-open");
    /* only clear detail-open if no detail is actually open */
    if (typeof isCardDetailOpen === "function" && isCardDetailOpen()) document.documentElement.classList.add("detail-open");
  } catch (e0) {}
  $$(".card").forEach(function (el) {
    el.classList.add("in");
    el.classList.remove("reveal");
    try {
      if (el.style.opacity && el.style.opacity !== "1") el.style.opacity = "";
      if (el.style.transform && el.style.transform.indexOf("translateY") >= 0) el.style.transform = "";
      if (el.style.visibility === "hidden") el.style.visibility = "";
    } catch (e1) {}
  });
  /* body/html scroll-lock leftovers from a stuck sheet — v4.6.3 also clears position/top/sheet-open */
  try {
    var overlayUp = false;
    try {
      overlayUp = (typeof anyOverlayOpen === "function" && anyOverlayOpen())
        || (typeof isCardDetailOpen === "function" && isCardDetailOpen())
        || document.documentElement.classList.contains("map-fs-open");
    } catch (eO) {}
    if (!overlayUp) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.documentElement.classList.remove("sheet-open");
      document.body.classList.remove("sheet-open");
      document.documentElement.classList.remove("detail-open");
      try { if (typeof SCROLL_LOCK !== "undefined") { SCROLL_LOCK.locked = false; SCROLL_LOCK.y = 0; } } catch (eL) {}
      try { if (typeof ensurePageScrollable === "function") ensurePageScrollable(); } catch (eE) {}
    }
  } catch (e2) {}
}
function ensurePanelsVisible() {
  // v4.4: one-page calm layout — keep expand panels (xpWx/xpMk) collapsed until tapped
  ["phoneMount","appsSection","today","hMap","hWx","hMk","mFocus"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.hasAttribute("hidden") && id.indexOf("xp") !== 0) { /* leave intentional hidden alone */ }
  });
  var openKind = (typeof CARD_DETAIL !== "undefined" && CARD_DETAIL && CARD_DETAIL.kind) ? CARD_DETAIL.kind : null;
  var xpWx = document.getElementById("xpWx"); if (xpWx && openKind !== "wx") { xpWx.hidden = true; xpWx.classList.remove("as-detail"); xpWx.style.transform = ""; }
  var xpMk = document.getElementById("xpMk"); if (xpMk && openKind !== "mk") { xpMk.hidden = true; xpMk.classList.remove("as-detail"); xpMk.style.transform = ""; }
  try { forceCardsVisible(); } catch (eF) {}
  try { mountPhoneScreen(); } catch (e) {}
}

function initFx3dLayer() {
  if (!fx3dWanted()) {
    document.documentElement.classList.add("fx-lite");
    document.documentElement.classList.remove("fx-3d");
    return Promise.resolve(null);
  }
  return loadFx3d().then(function (fx) {
    if (!fx) return null;
    var lite = false; try { lite = !!Store.getLocal("liteMode", false); } catch (e) {}
    var tilt = false; try { var tv = Store.getLocal("tiltCards", null); tilt = tv == null ? false : !!tv; } catch (e) {}
    return fx.init({ lite: lite, tilt: tilt }).then(function (info) {
      try {
        if (Store.getLocal("motionTilt", false)) fx.setMotionEnabled(true);
      } catch (e) {}
      return info;
    });
  }).catch(function () {
    document.documentElement.classList.add("fx-lite");
    return null;
  });
}

var STATUS_MSGS = ["> SHORTCUTS ARMED", "> NET SECURE", "> AI LINK STABLE", "> SIGNAL CLEAN", "> APPS READY"];
var FOCUS_MS = 25 * 60000;
function focusMs() {
  var m = (FOC && FOC.mins) ? +FOC.mins : 25;
  if (!(m > 0)) m = 25;
  return m * 60000;
}
function focusDayKey() {
  var d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function focusSessionsToday() {
  var s = Store.getLocal("focusStats", null) || {};
  if (s.day !== focusDayKey()) return 0;
  return +s.count || 0;
}
function focusStreak() {
  var s = Store.getLocal("focusStats", null) || {};
  var day = focusDayKey();
  if (s.day === day || s.day === ydayKeyFromFocus()) return +s.streak || 0;
  return 0;
}
function ydayKeyFromFocus() {
  var d = new Date(); d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function bumpFocusSession(mins) {
  var day = focusDayKey();
  var s = Store.getLocal("focusStats", null) || {};
  var yday = ydayKeyFromFocus();
  if (s.day !== day) {
    var cont = (s.day === yday);
    s = { day: day, count: 0, streak: cont ? ((+s.streak || 0) + 1) : 1 };
  }
  s.count = (+s.count || 0) + 1;
  s.mins = (+s.mins || 0) + (+mins > 0 ? +mins : 0);
  if (!(+s.streak > 0)) s.streak = 1;
  Store.setLocal("focusStats", s);
  return s.count;
}
var DAY_START = 7, DAY_END = 23;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var Q = new URLSearchParams(location.search);
var FORCE_FX = Q.get("fx");
function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

// ========== 2. STATE: one versioned object + one save/load layer ==========
var Store = (function () {
  var STATE_KEY = "zapos.state", DEVICE_KEY = "zapos.device", VER = 1;
  var PREF_KEYS = ["settings", "theme", "apps", "coins", "loc", "favs", "places", "holdings", "broker", "wallets", "accounts", "assistant"];                     // shared state (sync-ready)
  var DEVICE_KEYS = ["gps", "place", "wx", "mk", "focus", "seenHelp", "gpsLoc", "themeCss", "mediaKey", "skipBoot", "bootDay", "uiSounds", "recentPins", "wxDay", "wxMode", "wxMode2", "portHist", "acctMigrated", "liteMode", "tiltCards", "motionTilt", "callLog", "zapChat", "focusStats", "wallpaper", "zapNotes", "zapReminders", "uiMotion", "welcomeSeen", "bankPrivacy", "mapTraffic", "bankManualCleared_v413", "searchProv", "focusCustom", "v5AppsOpen", "quickActions", "sugState", "v6lists", "v6List", "v6ha", "v6compare", "v6cal", "zaLog", "dash", "v7car", "v7tv", "v25days"]; // this device only
  function read(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function write(k, v) { if (dead) return false; try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var state = read(STATE_KEY), dev = read(DEVICE_KEY), subs = [], uiT = null, dead = false; // dead: after a reset, write nothing more
  if (!state || typeof state !== "object" || !state.prefs) {
    // v0 -> v1: gather the old one-key-per-setting values (zapos.apps, zapos.theme, ...) into the single object.
    // The old keys are left untouched so nothing is lost if an older version ever loads.
    state = { v: VER, updatedAt: 0, prefs: {}, ui: {} };
    PREF_KEYS.forEach(function (k) { var v = read("zapos." + k); if (v != null) { state.prefs[k] = v; state.updatedAt = Date.now(); } });
  }
  if (!dev || typeof dev !== "object") { dev = {}; DEVICE_KEYS.forEach(function (k) { var v = read("zapos." + k); if (v != null) dev[k] = v; }); }
  // live GPS position never stays in the shared state: split it into the device store
  var L = state.prefs.loc;
  if (L && L.mode !== "city") { if (L.lat != null) dev.gpsLoc = { lat: L.lat, lon: L.lon, name: L.name }; state.prefs.loc = { mode: "gps" }; }
  if (state.prefs.settings) delete state.prefs.settings.play; // left over from the old PLAY setting
  if (!state.ui || typeof state.ui !== "object") state.ui = {};
  state.v = VER;
  write(STATE_KEY, state); write(DEVICE_KEY, dev);
  function persist() { write(STATE_KEY, state); }
  return {
    get: function (k, d) { var v = state.prefs[k]; return v == null ? d : clone(v); },
    set: function (k, v) {
      if (PREF_KEYS.indexOf(k) < 0) throw new Error("unknown pref " + k);
      state.prefs[k] = clone(v); state.updatedAt = Date.now(); persist();
      subs.forEach(function (f) { try { f(k, clone(v), "local"); } catch (e) {} });
    },
    getLocal: function (k, d) { var v = dev[k]; return v == null ? d : v; },
    setLocal: function (k, v) { if (DEVICE_KEYS.indexOf(k) < 0) throw new Error("unknown device key " + k); dev[k] = v; write(DEVICE_KEY, dev); },
    ui: function () { return state.ui; },
    setUI: function (patch, now) { Object.assign(state.ui, patch); clearTimeout(uiT); if (now) persist(); else uiT = setTimeout(persist, 300); },
    flush: function () { clearTimeout(uiT); persist(); },
    onChange: function (f) { subs.push(f); },
    snapshot: function () { return { v: state.v, updatedAt: state.updatedAt, prefs: clone(state.prefs) }; },
    // stage 2 entry point: apply prefs that came from another device (newer wins), then the app re-renders
    applyRemote: function (snap) {
      if (!snap || !snap.prefs || (snap.updatedAt || 0) <= (state.updatedAt || 0)) return false;
      PREF_KEYS.forEach(function (k) { if (snap.prefs[k] !== undefined) state.prefs[k] = clone(snap.prefs[k]); });
      state.updatedAt = snap.updatedAt; persist();
      subs.forEach(function (f) { try { f("*", null, "remote"); } catch (e) {} });
      return true;
    },
    reset: function () {
      dead = true; clearTimeout(uiT);
      try { localStorage.removeItem(STATE_KEY); localStorage.removeItem(DEVICE_KEY); } catch (e) {}
      PREF_KEYS.concat(DEVICE_KEYS).forEach(function (k) { try { localStorage.removeItem("zapos." + k); } catch (e) {} });
    }
  };
})();

// ========== 3. themes: applied instantly from the THEME button ==========
var THEMES = [
  { id: "zapwise", name: "ZAPWISE NEON PINK", sub: "Hot pink + cyan on deep void · default", v: { void: "#070814", panel: "#12081a", panel2: "#1a0c24", cream: "#f7f0e8", amber: "#ff2a6d", cyan: "#05d9e8", magenta: "#ff2a6d", dim: "#8a7a96", on: "#070814" } },
  { id: "amber-cyan", name: "AMBER / CYAN", sub: "Classic neon-city amber + cyan", v: { void: "#070814", panel: "#0d1226", panel2: "#111833", cream: "#f4efe4", amber: "#f0a202", cyan: "#5ce1e6", magenta: "#ff4fd8", dim: "#6b7896", on: "#070814" } },
  { id: "acid", name: "ACID YELLOW", sub: "Acid #fcee0a on pure black", v: { void: "#050505", panel: "#10100a", panel2: "#18180c", cream: "#f6f6e8", amber: "#fcee0a", cyan: "#a8ff3e", magenta: "#fcee0a", dim: "#7a7a4a", on: "#050505" } },
  { id: "ice", name: "ICE BLUE", sub: "Ice blue + white on midnight", v: { void: "#030b14", panel: "#071824", panel2: "#0c2233", cream: "#eaf6ff", amber: "#7ec8ff", cyan: "#47e0ff", magenta: "#b8d4ff", dim: "#6d88a3", on: "#030b14" } }
];
function hexRgb(h) { var n = parseInt(h.slice(1), 16); return (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255); }
var THEME = THEMES[0];
function applyTheme(id) {
  var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0], st = document.documentElement.style;
  Object.keys(t.v).forEach(function (k) { st.setProperty("--" + k, t.v[k]); st.setProperty("--" + k + "-rgb", hexRgb(t.v[k])); });
  // v3.1 layout tokens
  st.setProperty("--bg", t.v.void); st.setProperty("--ink", t.v.cream);
  // Readable secondary text — neon/purple especially needs stronger muted/dim
  var muteA = (t.id === "zapwise" || t.id === "acid") ? .78 : .62, dimA = (t.id === "zapwise" || t.id === "acid") ? .55 : .42;
  st.setProperty("--muted", "rgba(" + hexRgb(t.v.cream) + "," + muteA + ")");
  st.setProperty("--dim", t.v.dim || ("rgba(" + hexRgb(t.v.cream) + "," + dimA + ")"));
  document.documentElement.classList.toggle("light", !!t.light);
  if (document.body) document.body.classList.toggle("light", !!t.light);
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t.v.void);
  THEME = t;
  var css = ":root{" + Object.keys(t.v).map(function (k) { return "--" + k + ":" + t.v[k] + ";--" + k + "-rgb:" + hexRgb(t.v[k]); }).join(";") +
    ";--bg:" + t.v.void + ";--ink:" + t.v.cream + "}";
  Store.setLocal("themeCss", { light: !!t.light, css: css, meta: t.v.void });
  try {
    if (document.body) {
      document.body.classList.toggle("theme-zapwise", t.id === "zapwise");
      document.body.classList.toggle("theme-amber-cyan", t.id === "amber-cyan");
      document.body.classList.toggle("theme-acid", t.id === "acid");
      document.body.classList.toggle("theme-ice", t.id === "ice");
      document.body.classList.add("pack-cyber");
    }
  } catch (e) {}
}
(function migrateThemeId() {
  var tid = Store.get("theme", "zapwise");
  var map = { neon: "zapwise", "neon-night": "zapwise", "amber-ops": "amber-cyan", arctic: "ice", terminal: "acid", sunset: "amber-cyan", mono: "ice", light: "ice", "ghost-white": "ice" };
  if (map[tid]) { tid = map[tid]; try { Store.set("theme", tid); } catch (e) {} }
  applyTheme(tid);
})();
try {
  if (window.ZAPWALL) {
    window.ZAPWALL.init(document.getElementById("wpCanvas"));
    applyWallpaper(wallpaperMode());
  }
} catch (eWp0) {}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function t12(d) { var h = d.getHours(); return (h % 12 || 12) + ":" + pad2(d.getMinutes()) + (h < 12 ? "A" : "P"); }
function isoT12(iso) { var h = +iso.slice(11, 13), m = iso.slice(14, 16); return (h % 12 || 12) + ":" + m + (h < 12 ? "A" : "P"); }
function isoH(iso) { var h = +iso.slice(11, 13); return (h % 12 || 12) + (h < 12 ? "A" : "P"); }
function toast(msg) {
  var t = $("#toast"); if (!t) return;
  try { portalToBody(t); } catch (eP) {}
  t.textContent = msg;
  t.classList.add("on");
  try { t.style.backdropFilter = "none"; t.style.webkitBackdropFilter = "none"; t.style.filter = "none"; } catch (e) {}
  clearTimeout(toast.k);
  toast.k = setTimeout(function () { t.classList.remove("on"); }, 2600);
}

// ========== 4. apps: data + migration ==========
// glyphs (original, simple shapes) for custom apps that have no icon
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

// url = app link (scheme) or https; web = website (phone fallback + desktop); desk/mac = desktop override; ios = iPhone override
// icon = real app icon, App Store artwork from the iTunes Lookup API, served from /os/icons (Nov 2, 2026)
var DEFAULT_APPS = [
  { id: "x", name: "X", url: "twitter://", icon: "/os/icons/x.jpg", web: "https://x.com", glyph: "letter", letter: "X", bg: "#000", accent: "#f4efe4" },
  { id: "youtube", name: "YouTube", url: "youtube://", icon: "/os/icons/youtube.jpg", web: "https://www.youtube.com", glyph: "play", bg: "#ff0033", accent: "#ff4d5e" },
  { id: "grok", name: "Grok", url: "xai-grok://", icon: "/os/icons/grok.jpg", web: "https://grok.com", glyph: "spark", bg: "#16161d", accent: "#f0a202" },
  { id: "chatgpt", name: "ChatGPT", url: "chatgpt://", icon: "/os/icons/chatgpt.jpg", web: "https://chatgpt.com", glyph: "chat", bg: "#10a37f", accent: "#3ddc84" },
  { id: "web", name: "Web", url: "https://www.google.com", icon: "/os/icons/web.jpg", glyph: "compass", bg: "linear-gradient(180deg,#5ce1e6,#1a73e8)", accent: "#5ce1e6" },
  { id: "phone", name: "Phone", url: "tel:", icon: "/os/icons/phone.jpg", dial: true, glyph: "phone", bg: "linear-gradient(180deg,#5af575,#16c13c)", accent: "#3ddc84" },
  { id: "messages", name: "Messages", url: "sms:", icon: "/os/icons/messages.jpg", mac: "sms:", desk: "https://messages.google.com/web", glyph: "bubble", bg: "linear-gradient(180deg,#5af575,#16c13c)", accent: "#3ddc84" },
  { id: "maps", name: "Maps", url: "maps://", icon: "/os/icons/maps.jpg", web: "https://www.google.com/maps", glyph: "map", bg: "linear-gradient(135deg,#3ddc84,#2a9df4)", accent: "#3ddc84" },
  { id: "mail", name: "Mail", url: "mailto:", icon: "/os/icons/mail.jpg", web: "https://mail.google.com", glyph: "mail", bg: "linear-gradient(180deg,#1ea1ff,#1166dd)", accent: "#1ea1ff" },
  { id: "calendar", name: "Calendar", url: "calshow://", icon: "/os/icons/calendar.jpg", web: "https://calendar.google.com", glyph: "cal", bg: "#fff", accent: "#ff4d5e" },
  { id: "notes", name: "Notes", url: "mobilenotes://", icon: "/os/icons/notes.jpg", web: "https://keep.google.com", glyph: "notes", bg: "linear-gradient(180deg,#fff6c2 0 28%,#ffd23f 28%)", accent: "#ffd23f" },
  { id: "photos", name: "Photos", url: "photos-redirect://", icon: "/os/icons/photos.jpg", web: "https://photos.google.com", glyph: "letter", letter: "P", bg: "#111827", accent: "#f4efe4" },
  { id: "gemini", name: "Gemini", url: "googlegemini://", icon: "/os/icons/gemini.jpg", web: "https://gemini.google.com", glyph: "gem", bg: "linear-gradient(135deg,#4f7cff,#a25cff)", accent: "#8b9dff" },
  /* v4.6.1: Shopping + Lifestyle defaults — open app/web, never App Store */
  { id: "amazon", name: "Amazon", url: "https://www.amazon.com", icon: "/os/icons/amazon.jpg", web: "https://www.amazon.com", glyph: "letter", letter: "A", bg: "#111", accent: "#ff9900" },
  { id: "walmart", name: "Walmart", url: "walmart://", icon: "/os/icons/walmart.jpg", web: "https://www.walmart.com", glyph: "letter", letter: "W", bg: "#0071ce", accent: "#ffc220" },
  { id: "target", name: "Target", url: "target://", icon: "/os/icons/target.jpg", web: "https://www.target.com", glyph: "letter", letter: "T", bg: "#cc0000", accent: "#fff" },
  { id: "uber", name: "Uber", url: "uber://", icon: "/os/icons/uber.jpg", web: "https://m.uber.com", glyph: "letter", letter: "U", bg: "#000", accent: "#fff" },
  { id: "doordash", name: "DoorDash", url: "doordash://", icon: "/os/icons/doordash.jpg", web: "https://www.doordash.com", glyph: "letter", letter: "D", bg: "#ff3008", accent: "#fff" },
  { id: "strava", name: "Strava", url: "strava://", icon: "/os/icons/strava.jpg", web: "https://www.strava.com", glyph: "letter", letter: "S", bg: "#fc4c02", accent: "#fff" },
  { id: "fitbit", name: "Fitbit", url: "fitbit://", icon: "/os/icons/fitbit.jpg", web: "https://www.fitbit.com", glyph: "letter", letter: "F", bg: "#00b0b9", accent: "#fff" }
];
DEFAULT_APPS.forEach(function (a) { a.on = true; });
// music apps live in the PLAY hub only (not duplicated into the apps grid)
var MEDIA = {
  music: { name: "Apple Music", url: "music://", pkg: "com.apple.android.music", web: "https://music.apple.com", icon: "/os/icons/music.jpg" },
  spotify: { name: "Spotify", url: "spotify://", pkg: "com.spotify.music", web: "https://open.spotify.com", icon: "/os/icons/spotify.jpg" },
  ytmusic: { name: "YouTube Music", url: "youtubemusic://", pkg: "com.google.android.apps.youtube.music", web: "https://music.youtube.com", icon: "/os/icons/ytmusic.jpg" },
  amazonmusic: { name: "Amazon Music", url: "amznmp3://", pkg: "com.amazon.mp3", web: "https://music.amazon.com", icon: "/os/icons/amazonmusic.jpg" },
  soundcloud: { name: "SoundCloud", url: "soundcloud://", pkg: "com.soundcloud.android", web: "https://soundcloud.com", icon: "/os/icons/soundcloud.jpg" },
  pandora: { name: "Pandora", url: "pandora://", pkg: "com.pandora.android", web: "https://www.pandora.com", icon: "/os/icons/pandora.jpg" },
  tidal: { name: "TIDAL", url: "tidal://", pkg: "com.aspiro.tidal", web: "https://tidal.com", icon: "/os/icons/tidal.jpg" },
  deezer: { name: "Deezer", url: "deezer://", pkg: "deezer.android.app", web: "https://www.deezer.com", icon: "/os/icons/deezer.jpg" }
};
var HUB = ["music", "spotify", "ytmusic", "amazonmusic", "soundcloud", "pandora", "tidal", "deezer"];
function defaultMediaKey() {
  var ua = (navigator.userAgent || "").toLowerCase();
  var isiOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /android/.test(ua);
  if (isiOS) return "music";
  if (isAndroid) return "spotify";
  return "ytmusic";
}
// + ADD APP / live search: large bundled catalog (v3.2). Icons at /os/icons/<id>.jpg. Never App Store.
var CATALOG = (typeof window !== "undefined" && Array.isArray(window.ZAPOS_CATALOG) && window.ZAPOS_CATALOG.length)
  ? window.ZAPOS_CATALOG.map(function (c) {
      return {
        id: c.id, name: c.name, aliases: c.aliases || [],
        url: c.url || c.ios || c.web || "",
        pkg: c.pkg || c.android || "",
        web: c.web || "",
        icon: c.icon || ("/os/icons/" + c.id + ".jpg")
      };
    })
  : [];
CATALOG.forEach(function (c) { if (!c.icon) c.icon = "/os/icons/" + c.id + ".jpg"; });
var DEFAULT_COINS = [{ id: "bitcoin", sym: "BTC", name: "Bitcoin" }, { id: "pax-gold", sym: "GOLD", name: "Gold (PAX Gold)" }];
var DEFAULT_SET = { name: "", units: "F" };

var S = Object.assign({}, DEFAULT_SET, Store.get("settings", {}));
var APPS = Store.get("apps", null);
// keeps saved built-in apps up to date with the latest links/icons and adds any new defaults
function migrateApps() {
  if (!APPS || !APPS.length) { APPS = clone(DEFAULT_APPS); return; }
  var OLD_ORDER = "x,youtube,chatgpt,grok,gemini,maps,messages,phone,mail,calendar,notes,web";
  var OLD_ORDER2 = "x,youtube,grok,chatgpt,web,gemini,maps,messages,phone,mail,calendar,notes";
  var OLD_ORDER3 = APPS.map(function (a) { return a.id; }).join(",");
  APPS = APPS.filter(function (a) { return a.custom || (a.id !== "music" && a.id !== "spotify"); }); // now in the PLAY hub
  APPS.forEach(function (a) { var d = DEFAULT_APPS.filter(function (x) { return x.id === a.id; })[0]; if (d && !a.custom) { var on = a.on; delete a.ios; delete a.mac; delete a.desk; Object.keys(d).forEach(function (k) { a[k] = d[k]; }); delete a.fb; delete a.store; a.on = on; } });
  var curOrder = APPS.map(function (a) { return a.id; }).join(",");
  if (curOrder === OLD_ORDER || curOrder === OLD_ORDER2 || curOrder.indexOf("photos") < 0) {
    // pull photos in and sort built-ins toward the concept grid order once
    APPS.sort(function (p, q) {
      var pi = DEFAULT_APPS.findIndex(function (d) { return d.id === p.id; });
      var qi = DEFAULT_APPS.findIndex(function (d) { return d.id === q.id; });
      if (pi < 0 && qi < 0) return 0; if (pi < 0) return 1; if (qi < 0) return -1; return pi - qi;
    });
  }
  // picked apps follow the catalog's current links (v2.1.1: TikTok / Cash App went website-only: their app links
  // aren't officially documented for opening, and an unknown link makes iPhone say "invalid address")
  APPS.forEach(function (a) { if (!a.pick || String(a.id).indexOf("p-") !== 0) return; var c = CATALOG.filter(function (x) { return "p-" + x.id === a.id; })[0]; if (c) { a.url = c.url; if (c.web) a.web = c.web; else delete a.web; if (c.pkg) a.pkg = c.pkg; if (c.icon) a.icon = c.icon; } });
  DEFAULT_APPS.forEach(function (d) { if (!APPS.some(function (a) { return a.id === d.id; })) APPS.push(clone(d)); });
}
migrateApps(); if (JSON.stringify(APPS) !== JSON.stringify(Store.get("apps", null))) Store.set("apps", APPS);
var COINS = Store.get("coins", null) || clone(DEFAULT_COINS);
// LOC: weather location. Shared state keeps only the choice (GPS, or a typed city); the live GPS fix is device-local.
function readLoc() { var l = Store.get("loc", { mode: "gps" }); return l.mode === "city" ? l : Object.assign({ mode: "gps" }, Store.getLocal("gpsLoc", {})); }
function saveLoc() { if (LOC.mode === "city") Store.set("loc", LOC); else { Store.set("loc", { mode: "gps" }); Store.setLocal("gpsLoc", { lat: LOC.lat, lon: LOC.lon, name: LOC.name }); } }
var LOC = readLoc();
function saveApps() { Store.set("apps", APPS); }
function saveCoins() { Store.set("coins", COINS); }

// light custom colors (cyan, amber, green…) get a dark letter/glyph so it stays readable
function lightHex(c) { var m = /^#([0-9a-f]{6})$/i.exec(c || ""); if (!m) return false; var n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) > 150; }
function iconHTML(a) {
  var inner, dark = !a.fg && lightHex(a.bg);
  if (a.glyph === "cal") {
    var d = new Date();
    inner = '<span class="cal"><i>' + d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + '</i><b>' + d.getDate() + '</b></span>';
  } else if (a.icon) {
    return '<span class="ico img"><img src="' + esc(a.icon) + '" alt="" loading="lazy" decoding="async"></span>';
  } else if (a.glyph === "letter" || !G[a.glyph]) {
    inner = '<span class="let" style="color:' + (a.fg || (dark ? "#0b0f1e" : "#f4efe4")) + '">' + esc((a.letter || a.name || "?").trim().charAt(0).toUpperCase()) + '</span>';
  } else inner = '<svg viewBox="0 0 24 24" aria-hidden="true"' + (dark ? ' style="filter:brightness(0);opacity:.85"' : "") + '>' + G[a.glyph] + '</svg>';
  return '<span class="ico" style="background:' + esc(a.bg) + '">' + inner + '</span>';
}

// ========== 5. apps: open + render ==========
// One tap, no App Store detours. Phone: try the app link; if the page is still showing ~1.2 s later the app
// isn't installed, so open its website instead. Computer: open the website straight away (Mac uses Messages/FaceTime for sms/phone).
var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
var MOBILE = IOS || /Android|Mobi/i.test(navigator.userAgent);
var MAC = !MOBILE && /Mac/i.test(navigator.platform || navigator.userAgent);
// new tab for websites. (window.open with "noopener" always returns null, which used to ALSO send this page away.)
function isStandalonePwa() {
  try {
    return window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  } catch (e) { return false; }
}
// Open https/schemes without navigating the standalone PWA document (iOS black-flash/reload).
function go(u) {
  if (!u) return;
  var w = null;
  try { w = window.open(u, "_blank"); } catch (e) {}
  if (w) { try { w.opener = null; } catch (e) {} return; }
  try {
    var a = document.createElement("a");
    a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { a.remove(); } catch (e2) {} }, 0);
    return;
  } catch (e) {}
  // Last resort: never assign https location.href inside a home-screen PWA (replaces the app).
  if (isStandalonePwa() && /^https?:/i.test(u)) return;
  try { location.href = u; } catch (e3) {}
}
function openApp(a) {
  if (a.dial || a.id === "phone") { openDial(); return; }
  var url = a.url || "";
  var ANDROID = /Android/i.test(navigator.userAgent);
  // Maps: pin exact coords shown (ll + readable q). geo: on Android, maps:// on iOS, Google elsewhere.
  if (a.id === "maps" || a.mapsHere) {
    var ll = a.ll || "";
    var q = a.q || (ll ? ll : "You are here");
    if (ANDROID) {
      url = ll ? ("geo:" + ll + "?q=" + encodeURIComponent(q)) : "geo:0,0?q=";
      a = Object.assign({}, a, { url: url, web: ll ? ("https://www.google.com/maps?q=" + encodeURIComponent(ll) + "&query=" + encodeURIComponent(q)) : "https://www.google.com/maps" });
    } else if (IOS) {
      url = ll ? ("maps://?ll=" + ll + "&q=" + encodeURIComponent(q)) : "maps://";
      a = Object.assign({}, a, { url: url, web: ll ? ("https://maps.apple.com/?ll=" + ll + "&q=" + encodeURIComponent(q)) : "https://maps.apple.com/" });
    } else {
      go(ll ? ("https://www.google.com/maps?q=" + encodeURIComponent(ll)) : "https://www.google.com/maps");
      return;
    }
    url = a.url;
  }
  if (/^https?:/i.test(url)) { go(url); return; }
  if (!MOBILE) {
    var d = (MAC && a.mac) || a.desk || a.web || url;
    if (/^https?:/i.test(d)) go(d); else location.href = d;
    return;
  }
  if (IOS && a.ios) url = a.ios;
  var fb = a.web;
  if (!fb) { if (/^https?:/i.test(url)) go(url); else try { location.href = url; } catch (e) {} return; }
  // Android intent with browser fallback baked in (no second timer needed)
  if (ANDROID && !/^https?:/i.test(url) && !/^tel:|^sms:|^mailto:/i.test(url)) {
    try {
      var scheme = (url.match(/^([a-z][a-z0-9+.-]*):/i) || [])[1];
      var path = url.replace(/^[a-z][a-z0-9+.-]*:(\/\/)?/i, "");
      if (scheme) {
        var intent = "intent://" + path + "#Intent;scheme=" + scheme;
        if (a.pkg) intent += ";package=" + a.pkg;
        intent += ";S.browser_fallback_url=" + encodeURIComponent(fb) + ";end";
        location.href = intent;
        return;
      }
    } catch (e) {}
  }
  if (ANDROID && a.pkg && /^https?:/i.test(url)) {
    try {
      location.href = "intent://#Intent;package=" + a.pkg + ";S.browser_fallback_url=" + encodeURIComponent(fb || url) + ";end";
      return;
    } catch (e) {}
  }
  // Deep-link with cancelable web fallback. Only fall back if we stayed visible ~1.5s
  // with no blur/hide. Cancel on hide/blur/pagehide; reset on pageshow / visibility return.
  if (openApp._fbTimer) { clearTimeout(openApp._fbTimer); openApp._fbTimer = null; }
  if (openApp._cleanup) { try { openApp._cleanup(); } catch (e) {} openApp._cleanup = null; }
  var left = false, token = (openApp._tok = (openApp._tok || 0) + 1);
  function markLeft() { left = true; }
  function onVis() {
    if (document.visibilityState === "hidden") markLeft();
  }
  function onPageHide() { markLeft(); }
  function onBlur() { markLeft(); }
  function onPageShow() {
    // Returning to the page: drop any pending fallback from a prior launch.
    if (openApp._fbTimer && openApp._tok === token) { clearTimeout(openApp._fbTimer); openApp._fbTimer = null; }
  }
  function cleanup() {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pageshow", onPageShow);
  }
  openApp._cleanup = cleanup;
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pageshow", onPageShow);
  // Launch scheme without permanently navigating the PWA shell when possible.
  try {
    var la = document.createElement("a");
    la.href = url; la.rel = "noopener"; la.style.cssText = "position:fixed;left:-9999px;opacity:0";
    document.body.appendChild(la); la.click();
    setTimeout(function () { try { la.remove(); } catch (e0) {} }, 0);
  } catch (e) {
    try { location.href = url; } catch (e2) { left = false; }
  }
  openApp._fbTimer = setTimeout(function () {
    openApp._fbTimer = null;
    cleanup(); openApp._cleanup = null;
    if (openApp._tok !== token) return;
    // Soft launch: only fall back if still fully visible and never blurred.
    if (!left && document.visibilityState === "visible" && document.hasFocus && document.hasFocus()) {
      // Never location.href https inside standalone — that black-flashes and reloads the PWA.
      go(fb);
    }
  }, 1500);
}
function accentOf(a) {
  if (a.accent) return a.accent;
  var m = /#[0-9a-f]{6}/i.exec(a.bg || ""); if (!m) return "#f4efe4";
  var h = m[0], l = parseInt(h.slice(1, 3), 16) * .3 + parseInt(h.slice(3, 5), 16) * .59 + parseInt(h.slice(5, 7), 16) * .11;
  return l < 60 ? "#f4efe4" : h;
}
var APPS_CAT = "all";
function renderApps() {
  var on = APPS.filter(function (a) { return a.on; });
  function mkTile(a) {
    var b = document.createElement("button");
    b.className = "tile"; b.type = "button"; b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "Open " + a.name); b.title = a.name;
    b.innerHTML = '<span class="ic">' + iconHTML(a) + '</span><span class="lb">' + esc(a.name) + '</span>';
    b.addEventListener("click", function () { try { sfxTap(); } catch (e) {} openApp(a); });
    return b;
  }
  var cats = document.getElementById("appsCats");
  if (cats && !cats._bound) {
    cats._bound = true;
    cats.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cat]"); if (!c) return;
      APPS_CAT = c.getAttribute("data-cat") || "all";
      renderApps();
      try { sfxTap(); } catch (e2) {}
    });
  }
  if (cats) {
    var present = {};
    on.forEach(function (a) { try { present[appCatOf(a)] = true; } catch (eP) {} });
    var list = [{ id: "all", name: "All", icon: "▦" }].concat(
      (typeof APP_CATS !== "undefined" ? APP_CATS : []).filter(function (c) { return !!present[c.id]; })
    );
    if (APPS_CAT !== "all" && !present[APPS_CAT]) APPS_CAT = "all";
    cats.innerHTML = list.map(function (c) {
      var onC = c.id === APPS_CAT;
      return '<button type="button" class="cat-chip' + (onC ? " on" : "") + '" data-cat="' + c.id + '" role="tab" aria-selected="' + onC + '">' + (c.icon ? ('<span class="ci">' + c.icon + "</span>") : "") + esc(c.name) + "</button>";
    }).join("");
  }
  var filtered = on;
  if (APPS_CAT && APPS_CAT !== "all") {
    filtered = on.filter(function (a) { return appCatOf(a) === APPS_CAT; });
  }
  var box = $("#apps"); if (!box) return; box.innerHTML = "";
  filtered.forEach(function (a) { box.appendChild(mkTile(a)); });
  var ad = document.createElement("button");
  ad.className = "tile add"; ad.type = "button"; ad.id = "addApp"; ad.setAttribute("role", "listitem"); ad.setAttribute("aria-label", "Add an app");
  ad.innerHTML = '<span class="ic" aria-hidden="true">＋</span><span class="lb">Add</span>';
  ad.addEventListener("click", function () { openAddApp({ focusSearch: true }); });
  box.appendChild(ad);
}

// ========== 6. clock, date, status, meters, focus ==========
var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function segs(el) { if (!el.children.length) el.innerHTML = new Array(17).join("<i></i>"); return el.children; }
function setSegs(el, pct, cls) { var c = segs(el), n = Math.round(Math.max(0, Math.min(1, pct)) * 16); for (var i = 0; i < 16; i++) c[i].className = i < n ? cls : ""; }
function ensureHudClock() {
  var host = $("#hClock"); if (!host) return null;
  if (host.dataset.hud === "1") return host;
  host.dataset.hud = "1";
  host.classList.add("hud-clock");
  host.innerHTML =
    '<div class="hc-sweep" aria-hidden="true"></div>' +
    '<div class="hc-time"><span class="hc-hm" id="hcHm">--:--</span><span class="hc-ampm" id="hAmpm">--</span></div>' +
    '<div class="hc-sec" id="hcSec" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
    '<div class="hc-tags" id="hDate">' +
      '<span class="hc-tag" id="hcDow">---</span>' +
      '<span class="hc-tag" id="hcMon">---</span>' +
      '<span class="hc-tag" id="hcDom">--</span>' +
    '</div>' +
    '<div class="hc-bar" aria-hidden="true"><i></i></div>';
  return host;
}
function tick() {
  ensureHudClock();
  var d = new Date(), h = d.getHours(), sec = d.getSeconds();
  var hm = $("#hcHm"), hmv = (h % 12 || 12) + ":" + pad2(d.getMinutes()); if (hm && hm.textContent !== hmv) hm.textContent = hmv;
  var am = $("#hAmpm"), amv = h < 12 ? "AM" : "PM"; if (am && am.textContent !== amv) am.textContent = amv;
  var secEl = $("#hcSec");
  if (secEl) {
    var kids = secEl.children;
    var n = Math.round((sec / 59) * (kids.length || 12));
    for (var i = 0; i < kids.length; i++) { var want = i < n ? "on" : ""; if (kids[i].className !== want) kids[i].className = want; }
  }
  if (sec === 0 || !tick.done) { tick.done = true; minute(d); }
  renderFocus();
}
function minute(d) {
  ensureHudClock();
  var dow = $("#hcDow"), mon = $("#hcMon"), dom = $("#hcDom");
  if (dow) dow.textContent = DOW[d.getDay()];
  if (mon) mon.textContent = MON[d.getMonth()];
  if (dom) dom.textContent = pad2(d.getDate());
  /* legacy single-line fallback if tags missing */
  var hd = $("#hDate");
  if (hd && !hd.classList.contains("hc-tags") && !document.getElementById("hcDow")) {
    hd.textContent = DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate();
  }
  var nm = (S.name || "").trim();
  var gre = $("#greet"); if (gre) gre.textContent = nm ? ("Hello, " + nm) : "";
  try { updateSkyline(); } catch (e) {}
  var td = $("#tdDay"); if (td) td.textContent = pad2(d.getDate());
  $$(".ico .cal").forEach(function (c) { var hh = '<i>' + DOW[d.getDay()] + '</i><b>' + d.getDate() + '</b>'; if (c._h !== hh) { c._h = hh; c.innerHTML = hh; } });
  updateStamps();
  renderNowPlaying();
}
// FOCUS: a 25-minute sprint timer (the web can't read battery on iPhone, so focus time is the main meter)
var FOC = Store.getLocal("focus", { st: "idle", mins: 25 });
if (!FOC || typeof FOC !== "object") FOC = { st: "idle", mins: 25 };
if (!FOC.mins) FOC.mins = 25;
var FOCUS_HTML =
  '<div class="mk-h fz-h v5h"><b>FOCUS MODE</b> <span class="foc-sess" id="focSess">0 TODAY</span></div>' +
  '<div class="fz-presets" id="focPresets" role="group" aria-label="Focus length">' +
    '<button type="button" class="fz-p" data-foc-min="15">15m</button>' +
    '<button type="button" class="fz-p" data-foc-min="25">25m</button>' +
    '<button type="button" class="fz-p" data-foc-min="50">50m</button>' +
    '<button type="button" class="fz-p fz-custom" id="focCustom" hidden>--</button>' +
    '<button type="button" class="fz-p fz-edit" id="focEdit" aria-label="Set a custom focus length">✎</button>' +
  '</div>' +
  '<button type="button" class="fz-dial" id="focTap" aria-label="Start or pause focus">' +
    '<svg class="fz-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<circle class="fz-track" cx="60" cy="60" r="52"/>' +
      '<circle class="fz-ring" id="focRing" cx="60" cy="60" r="52" transform="rotate(-90 60 60)"/>' +
    '</svg>' +
    '<span class="fz-mid"><span class="fz-time" id="mFocV">25:00</span><span class="fz-status" id="mFocL">READY</span></span>' +
  '</button>' +
  '<div class="fz-stats" id="focStats" aria-label="Focus stats">' +
    '<div class="fz-stat"><b id="focStatSessions">0</b><span>SESSIONS</span></div>' +
    '<div class="fz-stat"><b id="focStatStreak">0</b><span>STREAK</span></div>' +
    '<div class="fz-stat"><b id="focStatLen">25m</b><span>LENGTH</span></div>' +
  '</div>' +
  '<div class="fz-acts">' +
    '<button type="button" class="fz-btn" id="focToggle">START</button>' +
    '<button type="button" class="fz-btn alt" id="focReset">RESET</button>' +
  '</div>';
function ensureFocusDom() {
  /* v4.9.2: self-heal — if anything ever wipes the Focus card, rebuild it from the template */
  var card = $("#mFocus"); if (!card) return null;
  if (!card.querySelector("#mFocV") || !card.querySelector("#focToggle") || !card.querySelector("#focRing") || !card.querySelector("#focPresets") || !card.querySelector("#focStats")) {
    card.innerHTML = FOCUS_HTML;
  }
  return card;
}
var FOC_DONE_UNTIL = 0;
function renderFocus() {
  var card = ensureFocusDom(); if (!card) return;
  var now = Date.now(), total = focusMs(), left = total;
  if (FOC.st === "run") {
    left = FOC.end - now;
    if (left <= 0) {
      FOC = { st: "idle", mins: FOC.mins || 25 };
      Store.setLocal("focus", FOC);
      left = focusMs();
      FOC_DONE_UNTIL = now + 6000;
      try { bumpFocusSession(FOC.mins || 25); } catch (e0) {}
      toast("Focus done. Take 5.");
      try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch (e) {}
    }
  } else if (FOC.st === "pause") left = Math.max(0, Math.min(total, FOC.left || 0));
  else { if (FOC.st !== "idle") { FOC = { st: "idle", mins: FOC.mins || 25 }; Store.setLocal("focus", FOC); } left = total; }
  var pct = FOC.st === "idle" ? 0 : Math.max(0, Math.min(1, 1 - left / total));
  var sec = Math.max(0, Math.ceil(left / 1000));
  var C = 326.73;
  var ring = card.querySelector("#focRing");
  if (ring) {
    var off = (C * (1 - pct)).toFixed(2);
    if (ring.getAttribute("stroke-dasharray") !== String(C)) ring.setAttribute("stroke-dasharray", String(C));
    if (ring.getAttribute("stroke-dashoffset") !== off) ring.setAttribute("stroke-dashoffset", off);
  }
  function txt(sel, v) { var el = card.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; }
  txt("#mFocV", Math.floor(sec / 60) + ":" + pad2(sec % 60));
  var done = FOC.st === "idle" && now < FOC_DONE_UNTIL;
  txt("#mFocL", FOC.st === "run" ? "FOCUSING" : FOC.st === "pause" ? "PAUSED" : done ? "DONE ✓" : "TAP TO START");
  var sessN = focusSessionsToday();
  var streakN = 0; try { streakN = focusStreak(); } catch (eSt) {}
  var _fm = 0; try { var _fs = Store.getLocal("focusStats", null) || {}; if (_fs.day === focusDayKey()) _fm = +_fs.mins || 0; } catch (eFm) {}
  txt("#focSess", sessN + " TODAY · " + _fm + " MIN");
  txt("#focStatSessions", String(sessN));
  txt("#focStatStreak", String(streakN));
  txt("#focStatLen", String(FOC.mins || 25) + "m");
  txt("#focToggle", FOC.st === "run" ? "PAUSE" : (FOC.st === "pause" ? "RESUME" : "START"));
  card.classList.toggle("running", FOC.st === "run");
  card.classList.toggle("paused", FOC.st === "pause");
  card.classList.toggle("done", done);
  var locked = FOC.st === "run" || FOC.st === "pause";
  $$("#mFocus [data-foc-min]").forEach(function (b) {
    var on = +b.getAttribute("data-foc-min") === +(FOC.mins || 25);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("locked", locked);
  });
}
function focusToggle() {
  var now = Date.now();
  if (FOC.st === "run") FOC = { st: "pause", left: Math.max(0, FOC.end - now), mins: FOC.mins || 25 };
  else if (FOC.st === "pause") FOC = { st: "run", end: now + Math.max(1000, FOC.left || 0), mins: FOC.mins || 25 };
  else FOC = { st: "run", end: now + focusMs(), mins: FOC.mins || 25 };
  FOC_DONE_UNTIL = 0;
  Store.setLocal("focus", FOC); renderFocus();
}
function focusReset() {
  FOC = { st: "idle", mins: FOC.mins || 25 }; FOC_DONE_UNTIL = 0;
  Store.setLocal("focus", FOC); renderFocus(); toast("Focus reset");
}
function focusSetMins(m) {
  m = +m; if (!(m > 0)) return;
  if (FOC.st === "run" || FOC.st === "pause") { toast("Reset first to change length"); return; }
  FOC = { st: "idle", mins: m }; FOC_DONE_UNTIL = 0; Store.setLocal("focus", FOC); renderFocus();
}
(function bindFocus() {
  /* v4.9.2: ONE delegated handler on document (survives any re-render / sheet open-close).
     touchend fires instantly on iPhone; the follow-up click is deduped. */
  var lastAt = 0, sx = 0, sy = 0, moved = false;
  function act(e) {
    var t = e.target; if (t && t.nodeType === 3) t = t.parentElement;
    var b = t && t.closest ? t.closest("#mFocus #focToggle,#mFocus #focReset,#mFocus #focTap,#mFocus [data-foc-min]") : null;
    if (!b) return false;
    try { if (anyOverlayOpen()) return false; } catch (eO) {}
    if (e.type === "touchend" && moved) return false;
    try { e.stopPropagation(); } catch (eS) {}
    var now = Date.now();
    /* dedupe only the compat click that follows a handled touchend — never a second real tap */
    if (e.type === "click" && now - lastAt < 700) { try { e.preventDefault(); } catch (eP) {} return true; }
    if (e.type === "touchend") { lastAt = now; try { e.preventDefault(); } catch (eP2) {} }
    if (b.id === "focToggle" || b.id === "focTap") focusToggle();
    else if (b.id === "focReset") focusReset();
    else focusSetMins(+b.getAttribute("data-foc-min"));
    return true;
  }
  document.addEventListener("touchstart", function (e) {
    moved = false; var p = e.touches && e.touches[0]; if (p) { sx = p.clientX; sy = p.clientY; }
  }, { capture: true, passive: true });
  document.addEventListener("touchmove", function (e) {
    var p = e.touches && e.touches[0]; if (p && (Math.abs(p.clientX - sx) > 10 || Math.abs(p.clientY - sy) > 10)) moved = true;
  }, { capture: true, passive: true });
  document.addEventListener("touchend", act, { capture: true, passive: false });
  document.addEventListener("click", act, true);
  document.addEventListener("visibilitychange", function () { try { renderFocus(); } catch (e) {} });
  window.addEventListener("pageshow", function () { try { renderFocus(); } catch (e) {} });
  renderFocus();
})();

function updateGpsLockChip() {
  var el = $("#hGpsLock"); if (!el) return;
  var live = !!(GPS && GPS.lat != null && !GEO_OFF);
  el.setAttribute("data-lock", live ? "1" : "0");
  el.innerHTML = live ? '<i aria-hidden="true"></i>GPS LOCK' : '<i aria-hidden="true"></i>GPS —';
}
function initBatteryHud() {
  var chip = $("#hBat"); if (!chip || !navigator.getBattery) return;
  navigator.getBattery().then(function (b) {
    if (!b || typeof b.level !== "number" || isNaN(b.level)) return;
    chip.hidden = false;
    function paint() {
      var pct = Math.round((b.level || 0) * 100);
      chip.classList.toggle("charging", !!b.charging);
      var n = Math.max(0, Math.min(5, Math.ceil(pct / 20)));
      var meter = $("#hBatMeter");
      if (meter) {
        meter.classList.toggle("low", pct <= 20 && !b.charging);
        var cells = meter.querySelectorAll("i");
        for (var i = 0; i < cells.length; i++) cells[i].classList.toggle("on", i < n);
      }
      var lbl = $("#hBatPct"); if (lbl) lbl.textContent = (b.charging ? "⚡" : "") + pct + "%";
      chip.title = "Battery " + pct + "%" + (b.charging ? " charging" : "");
    }
    paint();
    b.addEventListener("levelchange", paint);
    b.addEventListener("chargingchange", paint);
  }).catch(function () {});
}
function buildClockTicks() {
  var g = document.querySelector(".clock-ticks"); if (!g || g.childNodes.length) return;
  var ns = "http://www.w3.org/2000/svg";
  for (var i = 0; i < 60; i++) {
    var major = i % 5 === 0;
    var ang = (i / 60) * Math.PI * 2 - Math.PI / 2;
    var r1 = major ? 46 : 50, r2 = 54;
    var line = document.createElementNS(ns, "line");
    line.setAttribute("x1", (60 + Math.cos(ang) * r1).toFixed(2));
    line.setAttribute("y1", (60 + Math.sin(ang) * r1).toFixed(2));
    line.setAttribute("x2", (60 + Math.cos(ang) * r2).toFixed(2));
    line.setAttribute("y2", (60 + Math.sin(ang) * r2).toFixed(2));
    if (major) line.setAttribute("class", "major");
    g.appendChild(line);
  }
}
function ensureHudTicks() {
  $$(".card.br.hud-panel").forEach(function (card) {
    var kids = card.children;
    var has = false;
    for (var i = 0; i < kids.length; i++) { if (kids[i].classList && kids[i].classList.contains("hud-ticks")) { has = true; break; } }
    if (!has) {
      var d = document.createElement("div");
      d.className = "hud-ticks";
      d.setAttribute("aria-hidden", "true");
      card.insertBefore(d, card.firstChild);
    }
  });
}
function startZapWave() {
  return; /* v4.9.2: no rAF loops */
  var poly = $("#zapWaveLine"); if (!poly || poly._zapWave) return;
  poly._zapWave = true;
  var pts = [], N = 32;
  for (var i = 0; i < N; i++) pts.push(0);
  var t0 = 0;
  function frame(now) {
    if (document.hidden || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      requestAnimationFrame(frame); return;
    }
    t0 = now * 0.004;
    var listening = !!_zapListening;
    try {
      if (window.ZAPFX3D) {
        window.ZAPFX3D.setOrbMood(listening ? "listen" : "idle");
        window.ZAPFX3D.setOrbLevel(listening ? 0.55 : 0.08);
      }
    } catch (e) {}
    var s = "";
    for (var i = 0; i < N; i++) {
      var x = (i / (N - 1)) * 64;
      var amp = listening ? 8 : 3.2;
      var y = 12 + Math.sin(t0 + i * 0.55) * amp * (0.4 + 0.6 * Math.sin(t0 * 0.7 + i * 0.2));
      s += (i ? " " : "") + x.toFixed(1) + "," + y.toFixed(1);
    }
    poly.setAttribute("points", s);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderNet() {
  var on = navigator.onLine !== false;
  var el = $("#hSync");
  if (el) {
    el.classList.toggle("off", !on);
    el.innerHTML = on ? "<i aria-hidden=\"true\"></i>LIVE" : "<i aria-hidden=\"true\"></i>OFFLINE";
  }
}

// NOW PLAYING hub: honest music-app launcher (no fake track audio in a browser)
var _savedMedia = Store.getLocal("mediaKey", null);
var MEDIA_KEY = (_savedMedia && MEDIA[_savedMedia]) ? _savedMedia : defaultMediaKey();
try { if (!_savedMedia || !MEDIA[_savedMedia]) Store.setLocal("mediaKey", MEDIA_KEY); } catch (e) {}
function currentMedia() { return MEDIA[MEDIA_KEY] || MEDIA[defaultMediaKey()] || MEDIA.spotify; }
function renderNowPlaying() {
  var m = currentMedia();
  var art = $("#npArt"), title = $("#npTitle"), artist = $("#npArtist"), live = $("#npLive");
  if (art) { var asrc = m.icon || "/os/icons/music.jpg"; if (art.getAttribute("src") !== asrc) art.src = asrc; art.alt = m.name; }
  if (title) title.textContent = m.name;
  if (artist) artist.textContent = "Tap to open " + m.name;
  if (live) { live.textContent = "MORE ▾"; live.setAttribute("aria-label", "More music apps"); }
  /* v4.15.0 inline provider switch (honest launcher: no fake track or progress) */
  var list = $("#npList");
  if (list) {
    var keys = ["ytmusic", "spotify", "music", "soundcloud"];
    if (keys.indexOf(MEDIA_KEY) < 0) keys = [MEDIA_KEY].concat(keys.slice(0, 3));
    var html = keys.map(function (k) {
      var mm = MEDIA[k]; if (!mm) return "";
      var on = k === MEDIA_KEY;
      var nm = k === "ytmusic" ? "YouTube" : mm.name;
      return '<button type="button" class="np-opt' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-media-act="set" data-m="' + k + '">' +
        '<img src="' + esc(mm.icon) + '" alt="" width="22" height="22"><span>' + esc(nm) + '</span><i class="np-chk" aria-hidden="true">' + (on ? "✓" : "") + "</i></button>";
    }).join("");
    html += '<button type="button" class="np-opt np-more" data-media-act="pick" aria-label="More music apps"><span>More apps ▾</span></button>';
    if (list._h !== html) { list._h = html; list.innerHTML = html; }
  }
}
function setMediaKey(k, open) {
  if (!MEDIA[k]) return;
  MEDIA_KEY = k;
  try { Store.setLocal("mediaKey", MEDIA_KEY); } catch (e) {}
  renderNowPlaying();
  toast(MEDIA[k].name);
  if (open) openApp(MEDIA[k]);
}
$("#hPlay").addEventListener("click", function (e) {
  if (tapShieldActive()) { e.preventDefault(); e.stopPropagation(); return; }
  if (e.target.closest("#mapOpen,#hMap,#hWx,#hMk")) return;
  var b = e.target.closest("[data-media-act]");
  if (!b) {
    // Tap empty music card chrome → open chosen app
    if (e.target.closest("#hPlay")) { e.preventDefault(); openApp(currentMedia()); }
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  var act = b.getAttribute("data-media-act");
  if (act === "play") openApp(currentMedia());
  else if (act === "pick") openMedia();
  else if (act === "set") setMediaKey(b.getAttribute("data-m"), false);
});
function openMedia() {
  var html = '<p class="note" style="margin-bottom:10px">Pick your music app</p>' +
    HUB.map(function (k) {
      var on = k === MEDIA_KEY ? " on" : "";
      var mark = k === MEDIA_KEY ? '<span class="mcheck" aria-hidden="true">✓</span>' : '<span aria-hidden="true">↗</span>';
      return '<button class="mrow' + on + '" data-m="' + k + '" type="button"><img class="mimg" src="' + esc(MEDIA[k].icon) + '" alt=""><span class="grow">' + esc(MEDIA[k].name) + "</span>" + mark + "</button>";
    }).join("");
  sheet("♪ MUSIC APPS", html, function (b) {
    b.addEventListener("click", function (e) {
      var x = e.target.closest("[data-m]"); if (!x) return;
      setMediaKey(x.getAttribute("data-m"), true);
      closeSheet();
    });
  });
}

// ========== 7. weather FX (canvas only) ==========
var FXS = [];
var RMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null, RM = !!(RMQ && RMQ.matches);
if (RMQ) { var rmf = function (e) { RM = e.matches; FXS.forEach(function (f) { f.drawn = false; }); }; RMQ.addEventListener ? RMQ.addEventListener("change", rmf) : RMQ.addListener && RMQ.addListener(rmf); }
// pause a canvas while it's scrolled off screen (and the whole loop while the page is hidden)
var FX_IO = window.IntersectionObserver ? new IntersectionObserver(function (es) { es.forEach(function (e) { FXS.forEach(function (f) { if (f.cv === e.target) f.vis = e.isIntersecting; }); }); }) : null;
function FX(cv) { this.cv = cv; this.ctx = cv.getContext("2d"); this.kind = "none"; this.p = []; this.flash = 0; this.bolt = null; this.t0 = performance.now(); this.w = 0; this.h = 0; this.vis = true; FXS.push(this); if (FX_IO) FX_IO.observe(cv); }
FX.prototype.size = function () {
  var r = this.cv.getBoundingClientRect(), dp = Math.min(window.devicePixelRatio || 1, 2);
  if (!r.width || !r.height) return false;
  if (Math.abs(r.width - this.w) > 1 || Math.abs(r.height - this.h) > 1) {
    this.w = r.width; this.h = r.height; this.cv.width = r.width * dp | 0; this.cv.height = r.height * dp | 0;
    this.ctx.setTransform(dp, 0, 0, dp, 0, 0); this.seed();
  }
  return true;
};
FX.prototype.set = function (k) { if (k !== this.kind) { this.kind = k; this.seed(); this.drawn = false; } fxPaintSoon(); };
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
  // Real sky wash (sun altitude / period) + single sun or moon + constellations (no duplicate moons)
  if (k === "sun" || k === "night" || k === "cloud" || k === "fog" || k === "rain" || k === "storm" || k === "snow") {
    paintCelestialSky(this, c, W, H, t, k);
  }
  if (k === "sun") {
    /* sun disc drawn inside paintCelestialSky when above horizon */
  }
  if (k === "night") {
    /* stars/constellations/moon drawn in paintCelestialSky; keep light rain of field stars as fallback if sky lib missing */
    if (!(window.ZAPOS_SKY && this._sky)) {
      for (i = 0; i < this.p.length; i++) { q = this.p[i]; c.globalAlpha = .25 + .75 * Math.abs(Math.sin(t * q.f + q.s)); c.fillStyle = "#f4efe4"; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); }
      c.globalAlpha = 1;
    }
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
    c.strokeStyle = "rgba(" + hexRgb(THEME.v.cyan) + ",.6)"; c.lineWidth = 1.2; c.lineCap = "round";
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
/* v4.9.2: weather art paints ONCE per change (no requestAnimationFrame loop = no flicker, no battery drain) */
var _fxPaintT = 0;
function loop() {
  FXS.forEach(function (f) {
    try { if (!f.size()) return; f.draw(performance.now(), 0); f.drawn = true; } catch (e) {}
  });
}
function fxPaintSoon() { clearTimeout(_fxPaintT); _fxPaintT = setTimeout(loop, 40); }
window.addEventListener("resize", fxPaintSoon);
var fxHud = new FX($("#fxHud")), fxMain = new FX($("#fxMain"));
try { fxHud._noBodies = true; } catch (eNB) {}
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
  if (c === 0) return day ? "☀️" : "✦"; if (c === 1) return day ? "🌤️" : "✦"; if (c === 2) return "⛅"; if (c === 3) return "☁️";
  if (c <= 48) return "🌫️"; if (c <= 57) return "🌦️"; if (c <= 67) return "🌧️"; if (c <= 77) return "🌨️";
  if (c <= 82) return "🌧️"; if (c <= 86) return "🌨️"; return "⛈️";
}
var FX_DEBUG = { rain: [63, 1], snow: [73, 1], sun: [0, 1], night: [0, 0], cloud: [3, 1], storm: [95, 1], fog: [45, 1] };


// ========== 7b. real sky (sun / moon / constellations) ==========
var SKY_CACHE = { at: 0, data: null, key: "" };
function skyLatLon() {
  if (LOC && LOC.lat != null) return { lat: LOC.lat, lon: LOC.lon };
  if (GPS) return { lat: GPS.lat, lon: GPS.lon };
  return { lat: 29.56, lon: -98.27 }; // Schertz-ish fallback until GPS arrives
}
function paintCelestialSky(fx, c, W, H, t, kind) {
  var ll = skyLatLon(), now = new Date();
  var Sky = window.ZAPOS_SKY;
  var sun = Sky ? Sky.sunAltAz(now, ll.lat, ll.lon) : { alt: kind === "sun" ? 40 : -30, az: 220 };
  var period = Sky ? Sky.skyPeriod(sun.alt) : (kind === "sun" ? "day" : "night");
  // sky gradient by solar altitude
  var g = c.createLinearGradient(0, 0, 0, H);
  if (period === "day") {
    g.addColorStop(0, "rgba(90,160,255,.35)"); g.addColorStop(.55, "rgba(120,190,255,.12)"); g.addColorStop(1, "rgba(240,200,120,.08)");
  } else if (period === "golden") {
    g.addColorStop(0, "rgba(255,170,70,.45)"); g.addColorStop(.5, "rgba(255,120,80,.22)"); g.addColorStop(1, "rgba(40,20,60,.35)");
  } else if (period === "sunset") {
    g.addColorStop(0, "rgba(255,110,60,.5)"); g.addColorStop(.45, "rgba(180,60,90,.28)"); g.addColorStop(1, "rgba(20,10,40,.55)");
  } else if (period === "dusk" || period === "twilight") {
    g.addColorStop(0, "rgba(60,40,110,.55)"); g.addColorStop(.5, "rgba(20,20,50,.45)"); g.addColorStop(1, "rgba(5,8,20,.7)");
  } else {
    g.addColorStop(0, "rgba(8,12,40,.55)"); g.addColorStop(1, "rgba(2,4,14,.25)");
  }
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  if (!Sky) return;
  var key = ll.lat.toFixed(2) + "," + ll.lon.toFixed(2) + ":" + (now.getMinutes());
  if (SKY_CACHE.key !== key || !SKY_CACHE.data) {
    SKY_CACHE = { key: key, at: Date.now(), data: Sky.visible(now, ll.lat, ll.lon, W, H) };
  }
  var sky = SKY_CACHE.data; fx._sky = sky;

  // constellation lines
  if (period === "night" || period === "twilight" || period === "dusk") {
    c.lineWidth = 1; c.strokeStyle = "rgba(244,239,228,.22)";
    var skyCut = H * 0.55;
    sky.lines.forEach(function (ln) {
      // Skip strokes that live entirely in the hourly-forecast band
      var maxY = 0; ln.pts.forEach(function (pt) { if (pt.y > maxY) maxY = pt.y; });
      if (maxY > skyCut) c.strokeStyle = "rgba(244,239,228,.08)";
      else c.strokeStyle = "rgba(244,239,228,.18)";
      c.beginPath();
      ln.pts.forEach(function (pt, i) { if (i) c.lineTo(pt.x, pt.y); else c.moveTo(pt.x, pt.y); });
      c.stroke();
    });
    sky.stars.forEach(function (s) {
      var r = Math.max(0.6, 2.4 - (s.mag + 1) * 0.45);
      c.globalAlpha = RM ? 0.85 : (0.45 + 0.55 * Math.abs(Math.sin(t * (1.2 + r) + s.x)));
      c.fillStyle = "#f4efe4";
      c.beginPath(); c.arc(s.x, s.y, r, 0, 6.283); c.fill();
    });
    c.globalAlpha = 1;
    // v4.4.1: keep labels in the upper sky only so they never cover hourly forecast text
    var labelMaxY = H * 0.38;
    c.fillStyle = "rgba(92,225,230,.42)"; c.font = "600 10px ui-sans-serif,system-ui,sans-serif";
    sky.labels.forEach(function (lb) {
      if (lb.y > labelMaxY) return;
      c.fillText(lb.name, lb.x, Math.min(lb.y, labelMaxY - 2));
    });
  }

  // Weather HUD: no sun/moon bodies (they overlapped temperature text). Soft wash only.
  if (fx && fx._noBodies) return;

  // ONE sun
  if (sky.sun && sky.sun.on && sun.alt > -3) {
    var sx = sky.sun.x, sy = sky.sun.y, pulse = RM ? 1 : (1 + Math.sin(t * 1.2) * .05);
    var R = Math.min(W, H) * (.12 + Math.max(0, sun.alt) / 90 * .2) * pulse;
    var sg = c.createRadialGradient(sx, sy, 0, sx, sy, R * 2.2);
    if (period === "day") { sg.addColorStop(0, "rgba(255,230,120,.7)"); sg.addColorStop(.35, "rgba(255,190,60,.28)"); sg.addColorStop(1, "rgba(255,180,40,0)"); }
    else { sg.addColorStop(0, "rgba(255,160,70,.75)"); sg.addColorStop(.4, "rgba(255,90,50,.3)"); sg.addColorStop(1, "rgba(255,80,40,0)"); }
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, R * 2.2, 0, 6.283); c.fill();
    c.fillStyle = period === "day" ? "rgba(255,236,150,.95)" : "rgba(255,190,110,.95)";
    c.beginPath(); c.arc(sx, sy, Math.min(W, H) * .07 * pulse, 0, 6.283); c.fill();
  }

  // ONE moon with real phase (never a second decorative moon)
  if (sky.moon && sky.moon.on && (period !== "day" || sky.moon.alt > 15)) {
    var mx = sky.moon.x, my = sky.moon.y, mr = Math.min(W, H) * .075;
    c.save();
    c.beginPath(); c.arc(mx, my, mr, 0, 6.283); c.clip();
    c.fillStyle = "rgba(244,239,228,.92)"; c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    // shadow for phase: waxing → shadow from left, waning from right
    var ill = sky.moon.illum, wax = sky.moon.waxing;
    c.fillStyle = "rgba(7,8,20,.88)";
    if (ill < 0.02) {
      c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    } else if (ill < 0.98) {
      // approximate terminator as offset circle
      var off = (1 - ill * 2) * mr * (wax ? 1 : -1);
      if (ill <= 0.5) {
        c.beginPath(); c.arc(mx + (wax ? off : -off), my, mr * 0.98, 0, 6.283); c.fill();
        // dark half
        c.fillRect(wax ? mx : mx - mr, my - mr, mr, mr * 2);
      } else {
        // gibbous: dark crescent
        c.beginPath();
        c.arc(mx, my, mr + 1, -Math.PI / 2, Math.PI / 2, !wax);
        c.arc(mx + (wax ? -1 : 1) * (ill - 0.5) * 2 * mr, my, mr * 0.95, Math.PI / 2, -Math.PI / 2, wax);
        c.fill();
      }
    }
    c.restore();
    c.strokeStyle = "rgba(244,239,228,.25)"; c.lineWidth = 1;
    c.beginPath(); c.arc(mx, my, mr, 0, 6.283); c.stroke();
  }
}

var WX_DAY = 0, WX_MODE = "actual";
try { WX_DAY = +Store.getLocal("wxDay", 0) || 0; } catch (e) {}
try { WX_MODE = Store.getLocal("wxMode2", "actual") === "feels" ? "feels" : "actual"; } catch (e) {} /* v4.9.3: new key → everyone starts on Actual once */

/* Local calendar helpers — avoid UTC shift from date-only / T12 strings across TZ */
function parseLocalYMD(s) {
  var p = String(s || "").slice(0, 10).split("-");
  var y = +p[0], m = +p[1], d = +p[2];
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}
function localYMD(dt) {
  dt = dt || new Date();
  var m = dt.getMonth() + 1, d = dt.getDate();
  return dt.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}
/** Open-Meteo daily[0] = today (timezone=auto). Clamp stale stored day. */
function syncWxDayIndex(j) {
  if (!j || !j.daily || !j.daily.time || !j.daily.time.length) { WX_DAY = 0; return 0; }
  WX_DAY = Math.max(0, Math.min(+WX_DAY || 0, j.daily.time.length - 1));
  return WX_DAY;
}
function currentFeels(j) {
  if (j && j.current && j.current.apparent_temperature != null && !isNaN(+j.current.apparent_temperature)) {
    return +j.current.apparent_temperature;
  }
  return null;
}

function hoursForDay(j, dayIdx) {
  var day = j.daily.time[dayIdx];
  if (!day) return [];
  var out = [], i;
  for (i = 0; i < j.hourly.time.length; i++) {
    if (j.hourly.time[i].slice(0, 10) === day) out.push(i);
  }
  return out;
}
function drawTempChart(cv, j, dayIdx, mode) {
  if (!cv || !j) return;
  var idxs = hoursForDay(j, dayIdx); if (!idxs.length) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cssW = cv.clientWidth || 360, cssH = Math.round(cssW * 220 / 720);
  cv.width = cssW * dpr; cv.height = cssH * dpr;
  var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  var padL = 8, padR = 36, padT = 18, padB = 18;
  var W = cssW, H = cssH;
  var feels = mode === "feels";
  var at = j.hourly.apparent_temperature || [];
  var t2 = j.hourly.temperature_2m || [];
  var vals = idxs.map(function (i) {
    var v = feels ? at[i] : t2[i];
    if (v == null || isNaN(v)) v = t2[i];
    return +v;
  });
  var hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
  if (!isFinite(hi) || !isFinite(lo)) return;
  var yMax = Math.ceil((hi + 4) / 8) * 8, yMin = Math.floor((lo - 4) / 8) * 8;
  if (yMax === yMin) yMax += 8;
  function X(i) { return padL + (i / Math.max(1, idxs.length - 1)) * (W - padL - padR); }
  function Y(v) { return padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB); }
  c.clearRect(0, 0, W, H);
  c.fillStyle = "rgba(244,239,228,.35)"; c.font = "10px ui-sans-serif,system-ui"; c.textAlign = "left";
  for (var tick = yMin; tick <= yMax; tick += 8) {
    var yy = Y(tick);
    c.strokeStyle = "rgba(244,239,228,.08)"; c.beginPath(); c.moveTo(padL, yy); c.lineTo(W - padR, yy); c.stroke();
    c.fillText(tick + "°", W - padR + 4, yy + 3);
  }
  c.beginPath();
  idxs.forEach(function (_, i) { var x = X(i), y = Y(vals[i]); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  var lastX = X(idxs.length - 1);
  c.lineTo(lastX, H - padB); c.lineTo(padL, H - padB); c.closePath();
  var ag = c.createLinearGradient(0, padT, 0, H - padB);
  if (feels) {
    ag.addColorStop(0, "rgba(196,120,255,.55)"); ag.addColorStop(0.55, "rgba(232,121,249,.22)"); ag.addColorStop(1, "rgba(196,120,255,0)");
  } else {
    ag.addColorStop(0, "rgba(240,162,2,.45)"); ag.addColorStop(0.55, "rgba(92,225,230,.2)"); ag.addColorStop(1, "rgba(92,225,230,0)");
  }
  c.fillStyle = ag; c.fill();
  c.beginPath();
  idxs.forEach(function (_, i) { var x = X(i), y = Y(vals[i]); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  c.strokeStyle = feels ? "rgba(232,180,255,.98)" : "rgba(5,217,232,.95)";
  c.lineWidth = feels ? 2.6 : 2; c.lineJoin = "round"; c.stroke();
  // H / L markers with degree labels
  var iHi = vals.indexOf(hi), iLo = vals.indexOf(lo);
  [[iHi, "H", hi, feels ? "#e9c6ff" : "#7ff3fb"], [iLo, "L", lo, feels ? "#c9a0ff" : "#05d9e8"]].forEach(function (m) {
    var x = X(m[0]), y = Y(m[2]);
    c.fillStyle = m[3]; c.beginPath(); c.arc(x, y, 3.6, 0, 6.283); c.fill();
    c.font = "700 11px ui-sans-serif,system-ui";
    c.fillText(m[1] + " " + Math.round(m[2]) + "°", Math.max(padL, Math.min(W - padR - 42, x - 18)), y - 9);
  });
  // store geometry for scrubber
  cv._wx = { idxs: idxs, vals: vals, X: null, padL: padL, padR: padR, W: W, feels: feels, dayIdx: dayIdx };
}
function drawPrecipChart(cv, j, dayIdx) {
  if (!cv || !j) return;
  var idxs = hoursForDay(j, dayIdx); if (!idxs.length) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cssW = cv.clientWidth || 360, cssH = Math.round(cssW * 120 / 720);
  cv.width = cssW * dpr; cv.height = cssH * dpr;
  var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  var padL = 8, padR = 36, padT = 10, padB = 8, W = cssW, H = cssH;
  function X(i) { return padL + (i / Math.max(1, idxs.length - 1)) * (W - padL - padR); }
  c.clearRect(0, 0, W, H);
  [0, 20, 40, 60, 80, 100].forEach(function (p) {
    var yy = padT + (1 - p / 100) * (H - padT - padB);
    c.strokeStyle = "rgba(244,239,228,.08)"; c.beginPath(); c.moveTo(padL, yy); c.lineTo(W - padR, yy); c.stroke();
    if (p === 80 || p === 100) { c.fillStyle = "rgba(244,239,228,.35)"; c.font = "10px ui-sans-serif,system-ui"; c.fillText(p + "%", W - padR + 2, yy + 3); }
  });
  var bw = Math.max(2, (W - padL - padR) / idxs.length * 0.55);
  idxs.forEach(function (hi, i) {
    var p = (j.hourly.precipitation_probability && j.hourly.precipitation_probability[hi]) || 0;
    var bh = (p / 100) * (H - padT - padB);
    var x = X(i) - bw / 2, y = H - padB - bh;
    c.fillStyle = p >= 60 ? "rgba(92,225,230,.85)" : "rgba(92,225,230,.4)";
    c.fillRect(x, y, bw, bh);
  });
}
function windDirLabel(deg) {
  if (deg == null || isNaN(deg)) return "—";
  var dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(((+deg) % 360) / 22.5) % 16];
}
function uvBand(u) {
  if (u == null || isNaN(u)) return { lab: "—", cls: "" };
  u = +u;
  if (u < 3) return { lab: "Low", cls: "ok" };
  if (u < 6) return { lab: "Moderate", cls: "" };
  if (u < 8) return { lab: "High", cls: "warn" };
  return { lab: "Very high", cls: "bad" };
}
function fmtVis(m, units) {
  if (m == null || isNaN(m)) return "—";
  if (units === "C") return (m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m");
  var mi = m / 1609.34;
  return (mi >= 10 ? Math.round(mi) : mi.toFixed(1)) + " mi";
}
function rainTiming(j, dayIdx) {
  var idxs = hoursForDay(j, dayIdx); if (!idxs.length) return "";
  var wet = [];
  idxs.forEach(function (hi) {
    var p = (j.hourly.precipitation_probability && j.hourly.precipitation_probability[hi]) || 0;
    var amt = (j.hourly.precipitation && j.hourly.precipitation[hi]) || 0;
    if (p >= 40 || amt > 0.05) wet.push(j.hourly.time[hi]);
  });
  if (!wet.length) return "No rain expected";
  function h12(iso) {
    var h = +iso.slice(11, 13), ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (!h) h = 12;
    return h + " " + ap;
  }
  var a = h12(wet[0]), b = h12(wet[wet.length - 1]);
  return a === b ? ("Rain likely around " + a) : ("Rain likely " + a + "–" + b);
}
function daylightStr(rise, set) {
  if (!rise || !set) return "—";
  var a = new Date(rise).getTime(), b = new Date(set).getTime();
  if (!isFinite(a) || !isFinite(b) || b <= a) return "—";
  var m = Math.round((b - a) / 60000), h = Math.floor(m / 60), mm = m % 60;
  return h + "h " + mm + "m";
}
function hourVals(j, hi) {
  var H = j.hourly || {};
  function g(k) { return H[k] && H[k][hi] != null ? H[k][hi] : null; }
  return {
    t: g("temperature_2m"), feels: g("apparent_temperature"),
    wind: g("wind_speed_10m"), gust: g("wind_gusts_10m"), dir: g("wind_direction_10m"),
    hum: g("relative_humidity_2m"), uv: g("uv_index"), vis: g("visibility"),
    press: g("pressure_msl"), dew: g("dew_point_2m"), cloud: g("cloud_cover"),
    rain: g("precipitation"), pop: g("precipitation_probability"),
    code: g("weather_code"), isDay: g("is_day")
  };
}
function wxCell(k, v, s) {
  return '<div class="wx-cell"><span class="k">' + k + '</span><span class="v">' + v + "</span>" + (s ? '<span class="s">' + s + "</span>" : "") + "</div>";
}
var WX_SCRUB = -1;
function renderWxDetails(hourIdx) {
  if (!WX || !WX.j) return;
  var j = WX.j, u = S.units === "C" ? "C" : "F";
  var wu = u === "C" ? "km/h" : "mph";
  var pu = u === "C" ? "hPa" : "inHg";
  var idxs = hoursForDay(j, WX_DAY);
  var hi;
  if (hourIdx != null && hourIdx >= 0) hi = hourIdx;
  else {
    // default: current hour if today, else noon
    if (WX_DAY === 0 && j.current && j.current.time) {
      var key = j.current.time.slice(0, 13);
      hi = j.hourly.time.findIndex(function (t) { return t.slice(0, 13) === key; });
    }
    if (hi == null || hi < 0) hi = idxs[Math.min(12, idxs.length - 1)] || idxs[0];
  }
  var v = hourVals(j, hi);
  var uv = uvBand(v.uv);
  var rainAmt = v.rain == null ? "—" : (u === "C" ? ((+v.rain).toFixed(1) + " mm") : ((+v.rain / 25.4).toFixed(2) + " in"));
  var press = v.press == null ? "—" : (u === "C" ? Math.round(v.press) + " hPa" : ((v.press * 0.02953).toFixed(2) + " inHg"));
  var grid = $("#wxGrid");
  if (grid) {
    grid.innerHTML =
      wxCell("WIND", (v.wind == null ? "—" : Math.round(v.wind) + " " + wu), windDirLabel(v.dir) + (v.gust != null ? " · gusts " + Math.round(v.gust) : "")) +
      wxCell("HUMIDITY", v.hum == null ? "—" : Math.round(v.hum) + "%", "") +
      wxCell("UV INDEX", v.uv == null ? "—" : (+v.uv).toFixed(1), uv.lab) +
      wxCell("VISIBILITY", fmtVis(v.vis, u), "") +
      wxCell("PRESSURE", press, "") +
      wxCell("DEW POINT", v.dew == null ? "—" : Math.round(v.dew) + "°", "") +
      wxCell("CLOUD COVER", v.cloud == null ? "—" : Math.round(v.cloud) + "%", "") +
      wxCell("RAIN", rainAmt, (v.pop != null ? Math.round(v.pop) + "% chance" : ""));
  }
  var rise = j.daily.sunrise && j.daily.sunrise[WX_DAY], set = j.daily.sunset && j.daily.sunset[WX_DAY];
  var sum = $("#wxSummary");
  if (sum) {
    var tip = rainTiming(j, WX_DAY);
    var sun = "Sunrise " + (rise ? isoT12(rise) : "—") + " · Sunset " + (set ? isoT12(set) : "—") + " · Daylight " + daylightStr(rise, set);
    /* One source of truth: current.apparent_temperature for live "now"; never daily max */
    var feelN = null;
    if (hourIdx == null && WX_DAY === 0) feelN = currentFeels(j);
    if (feelN == null) feelN = v.feels;
    var feel = feelN != null && !isNaN(+feelN) ? ("Feels " + Math.round(+feelN) + "°. ") : "";
    var cond = v.code != null ? (wxText(v.code).replace(/_/g, " ") + ". ") : "";
    sum.textContent = cond + feel + tip + ". " + sun;
  }
}
function scrubFromEvent(cv, e) {
  if (!cv || !cv._wx || !WX || !WX.j) return;
  var rect = cv.getBoundingClientRect();
  var clientX = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
  var x = clientX - rect.left;
  var meta = cv._wx;
  var frac = (x - meta.padL) / Math.max(1, meta.W - meta.padL - meta.padR);
  frac = Math.max(0, Math.min(1, frac));
  var i = Math.round(frac * Math.max(0, meta.idxs.length - 1));
  var hi = meta.idxs[i];
  WX_SCRUB = hi;
  var t = WX.j.hourly.time[hi];
  var val = meta.vals[i];
  var scrub = $("#wxScrub"); if (scrub) scrub.hidden = false;
  var st = $("#wxScrubT"); if (st) st.textContent = isoT12(t);
  var sv = $("#wxScrubV"); if (sv) sv.textContent = (meta.feels ? "Feels " : "") + Math.round(val) + "°";
  renderWxDetails(hi);
}
function renderWxNow() {
  var host = $("#wxNow"); if (!host || !WX || !WX.j) return;
  var j = WX.j, cu = j.current || {}, d = j.daily || {}, u = S.units === "C" ? "C" : "F";
  var wu = u === "C" ? "km/h" : "mph";
  function r(x) { return (x == null || isNaN(+x)) ? "—" : Math.round(+x); }
  var code = cu.weather_code, day = cu.is_day === 1;
  var cond = code == null ? "—" : wxText(code).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  var feels = currentFeels(j); if (feels == null) feels = cu.apparent_temperature;
  var uvv = cu.uv_index != null ? cu.uv_index : (d.uv_index_max && d.uv_index_max[0]);
  var uvb = uvBand(uvv);
  var pop = d.precipitation_probability_max ? (d.precipitation_probability_max[0] || 0) : null;
  var press = cu.pressure_msl == null ? "—" : (u === "C" ? Math.round(cu.pressure_msl) + " hPa" : ((cu.pressure_msl * 0.02953).toFixed(2) + " inHg"));
  var rise = d.sunrise && d.sunrise[0], set = d.sunset && d.sunset[0];
  function cell(k, v, sub) { return '<div class="now-c"><span class="k">' + k + '</span><b>' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  var html =
    '<div class="now-k">NOW · ' + esc(String(WX.place || "").toUpperCase()) + '</div>' +
    '<div class="now-hero"><span class="now-t">' + r(cu.temperature_2m) + '°</span>' +
      '<span class="now-r"><span class="now-ic" aria-hidden="true">' + (code == null ? "" : ((code <= 1 && !day) ? "✦" : wxEmoji(code, day))) + '</span>' +
      '<b class="now-cond">' + esc(cond) + '</b>' +
      '<span class="now-f">Feels like ' + r(feels) + '° · H ' + r(d.temperature_2m_max && d.temperature_2m_max[0]) + '° L ' + r(d.temperature_2m_min && d.temperature_2m_min[0]) + '°</span></span></div>' +
    '<div class="now-grid">' +
      cell("HUMIDITY", r(cu.relative_humidity_2m) + "%", "") +
      cell("WIND", r(cu.wind_speed_10m) + " " + wu, windDirLabel(cu.wind_direction_10m) + (cu.wind_gusts_10m != null ? " · gusts " + r(cu.wind_gusts_10m) : "")) +
      cell("UV", uvv == null ? "—" : (+uvv).toFixed(1), uvb && uvb.lab ? uvb.lab : "") +
      cell("RAIN TODAY", pop == null ? "—" : pop + "%", "chance") +
      cell("SUNRISE", rise ? isoT12(rise) : "—", "") +
      cell("SUNSET", set ? isoT12(set) : "—", "") +
      cell("VISIBILITY", fmtVis(cu.visibility, u), "") +
      cell("PRESSURE", press, "") +
    '</div>';
  if (host._h !== html) { host._h = html; host.innerHTML = html; }
}
function renderConditions() {
  if (!WX || !WX.j) return;
  try { renderWxNow(); } catch (eNow) {}
  var j = WX.j, pick = $("#wxDayPick");
  if (!pick) return;
  WX_DAY = Math.max(0, Math.min(WX_DAY, j.daily.time.length - 1));
  var letters = ["S", "M", "T", "W", "T", "F", "S"];
  var html = "";
  for (var d = 0; d < j.daily.time.length; d++) {
    var dt = parseLocalYMD(j.daily.time[d]);
    var wd = letters[dt.getDay()], dom = dt.getDate();
    var isToday = d === 0;
    html += '<button type="button" class="wx-day' + (d === WX_DAY ? " on" : "") + (isToday ? " today" : "") + '" data-d="' + d + '" role="tab" aria-selected="' + (d === WX_DAY) + '"><span class="wd">' + wd + '</span><span class="wn">' + dom + "</span></button>";
  }
  pick.innerHTML = html;
  syncWxDayIndex(j);
  var sel = parseLocalYMD(j.daily.time[WX_DAY]);
  var lab = sel.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  var dl = $("#wxDayLabel"); if (dl) dl.textContent = lab;
  var idxs = hoursForDay(j, WX_DAY);
  var at = j.hourly.apparent_temperature || [], t2 = j.hourly.temperature_2m || [];
  var series = idxs.map(function (i) {
    var v = WX_MODE === "feels" ? at[i] : t2[i];
    if (v == null || isNaN(v)) v = t2[i];
    return +v;
  });
  var hi = Math.round(Math.max.apply(null, series)), lo = Math.round(Math.min.apply(null, series));
  var hl = $("#wxChartHL"); if (hl) hl.textContent = hi + "°  " + lo + "°";
  var ul = $("#wxUnitLbl");
  if (ul) {
    if (WX_MODE === "feels" && WX_DAY === 0) {
      var cf = currentFeels(j);
      ul.textContent = (cf != null ? ("Feels like " + Math.round(cf) + "° · ") : "Feels like · ") + (S.units === "C" ? "Celsius (°C)" : "Fahrenheit (°F)");
    } else {
      ul.textContent = (WX_MODE === "feels" ? "Feels like · " : "Actual temp · ") + (S.units === "C" ? "Celsius (°C)" : "Fahrenheit (°F)");
    }
  }
  var icons = $("#wxHourIcons");
  if (icons) {
    var step = Math.max(1, Math.floor(idxs.length / 8));
    var bits = [];
    for (var i = 0; i < idxs.length; i += step) {
      var ii = idxs[i];
      bits.push("<span>" + wxEmoji(j.hourly.weather_code[ii], j.hourly.is_day[ii] === 1) + "</span>");
    }
    icons.innerHTML = bits.join("");
  }
  $$(".wx-tog-b").forEach(function (b) { var on = b.getAttribute("data-wxmode") === WX_MODE; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  var sw = $("#wxModeSw"); if (sw) { sw.classList.toggle("is-feels", WX_MODE === "feels"); sw.setAttribute("aria-checked", WX_MODE === "feels" ? "true" : "false"); }
  var cap = $("#wxModeCap"); if (cap) cap.textContent = WX_MODE === "feels"
    ? "FEELS LIKE (apparent temp, wind + humidity) — violet line · H " + hi + "° / L " + lo + "°"
    : "ACTUAL air temperature — cyan line · H " + hi + "° / L " + lo + "°";
  var cm = $("#wxChartMode"); if (cm) { cm.textContent = WX_MODE === "feels" ? "FEELS LIKE" : "ACTUAL"; cm.classList.toggle("feels", WX_MODE === "feels"); }
  var rain = j.daily.precipitation_probability_max[WX_DAY] || 0;
  var dayName = sel.toLocaleDateString("en-US", { weekday: "long" });
  var ps = $("#wxPrecipSum"); if (ps) ps.textContent = dayName + "'s chance: " + rain + "% · " + rainTiming(j, WX_DAY);
  var anim = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var tc = $("#wxTempChart"), pc = $("#wxPrecipChart");
  function drawAll() {
    drawTempChart(tc, j, WX_DAY, WX_MODE);
    drawPrecipChart(pc, j, WX_DAY);
  }
  if (anim && tc) { /* v4.9.1: no opacity dip — redrawing at 0.35 looked like a flash over wallpaper */ drawAll(); if (pc) { pc.style.opacity = "1"; } }
  else drawAll();
  WX_SCRUB = -1;
  var scrub = $("#wxScrub"); if (scrub) scrub.hidden = true;
  renderWxDetails(null);
}
(function bindWxCond() {
  var pick = $("#wxDayPick");
  if (pick) pick.addEventListener("click", function (e) {
    var b = e.target.closest("[data-d]"); if (!b) return;
    WX_DAY = +b.getAttribute("data-d"); try { Store.setLocal("wxDay", WX_DAY); } catch (err) {}
    renderConditions();
  });
  /* v4.9.3: Actual | Feels Like = slide switch. Tap a side or swipe the pill left/right. */
  function setWxMode(m) {
    m = m === "feels" ? "feels" : "actual";
    WX_MODE = m; try { Store.setLocal("wxMode2", m); } catch (err) {}
    renderConditions();
  }
  window.setWxMode = setWxMode;
  var swLast = 0, swX = 0, swY = 0, swDown = false;
  function swPick(e, x) {
    var sw = $("#wxModeSw"); if (!sw) return;
    var r = sw.getBoundingClientRect();
    var dx = x - swX;
    if (Math.abs(dx) > 24) setWxMode(dx > 0 ? "feels" : "actual");
    else setWxMode(x > r.left + r.width / 2 ? "feels" : "actual");
  }
  document.addEventListener("touchstart", function (e) {
    var sw = e.target.closest && e.target.closest("#wxModeSw"); if (!sw) { swDown = false; return; }
    var t = e.touches[0]; swX = t.clientX; swY = t.clientY; swDown = true;
  }, { capture: true, passive: true });
  document.addEventListener("touchend", function (e) {
    if (!swDown) return; swDown = false;
    var t = e.changedTouches && e.changedTouches[0]; if (!t) return;
    if (Math.abs(t.clientY - swY) > 30 && Math.abs(t.clientY - swY) > Math.abs(t.clientX - swX)) return; /* vertical scroll */
    try { if (e.cancelable) e.preventDefault(); } catch (err) {}
    swLast = Date.now(); swPick(e, t.clientX);
  }, { capture: true, passive: false });
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") return;
    var sw = e.target.closest && e.target.closest("#wxModeSw"); if (!sw) return;
    swX = e.clientX; swY = e.clientY; swDown = true;
  }, true);
  document.addEventListener("pointerup", function (e) {
    if (e.pointerType === "touch" || !swDown) return; swDown = false;
    swLast = Date.now(); swPick(e, e.clientX);
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#wxModeSw,[data-wxmode]"); if (!b) return;
    if (Date.now() - swLast < 700) return;
    var m = e.target.closest("[data-wxmode]");
    if (m) setWxMode(m.getAttribute("data-wxmode"));
  });
  document.addEventListener("keydown", function (e) {
    if (!e.target.closest || !e.target.closest("#wxModeSw")) return;
    if (e.key === "ArrowRight") setWxMode("feels"); else if (e.key === "ArrowLeft") setWxMode("actual");
  });
  window.addEventListener("resize", function () { clearTimeout(renderConditions._t); renderConditions._t = setTimeout(function () { renderConditions(); }, 120); });
  var tc = $("#wxTempChart");
  if (tc) {
    var dragging = false;
    function onPtr(e) { if (e.cancelable) e.preventDefault(); scrubFromEvent(tc, e); }
    tc.addEventListener("pointerdown", function (e) { dragging = true; try { tc.setPointerCapture(e.pointerId); } catch (err) {} onPtr(e); });
    tc.addEventListener("pointermove", function (e) { if (dragging) onPtr(e); });
    tc.addEventListener("pointerup", function () { dragging = false; });
    tc.addEventListener("pointercancel", function () { dragging = false; });
  }
})();

// ========== 8. weather data ==========
var WX = Store.getLocal("wx", null);
function unitQ() { return S.units === "C" ? "&temperature_unit=celsius&wind_speed_unit=kmh" : "&temperature_unit=fahrenheit&wind_speed_unit=mph"; }
/* v4.9.5: place search — cache answers on this device and keep to 1 request per second (OpenStreetMap search rules) */
var NOM = { last: 0, mem: {}, q: Promise.resolve() };
function nomJSON(url, ms) {
  var key = url.replace(/^https:\/\/nominatim\.openstreetmap\.org\//, "");
  var hit = NOM.mem[key];
  if (!hit) { try { var ss = sessionStorage.getItem("zapnom:" + key); if (ss) hit = NOM.mem[key] = JSON.parse(ss); } catch (e) {} }
  if (hit && Date.now() - hit.t < 7 * 864e5) return Promise.resolve(hit.v);
  var p = NOM.q.then(function () {
    var wait = Math.max(0, NOM.last + 1100 - Date.now());
    return new Promise(function (r) { setTimeout(r, wait); });
  }).then(function () {
    NOM.last = Date.now();
    return getJSON(url, ms).catch(function (e) {
      if (/HTTP (429|503)/.test(String(e && e.message))) { NOM.last = Date.now() + 4000; try { toast("Map search is busy — try again in a few seconds"); } catch (e2) {} }
      throw e;
    });
  }).then(function (v) {
    NOM.mem[key] = { t: Date.now(), v: v };
    try { sessionStorage.setItem("zapnom:" + key, JSON.stringify(NOM.mem[key])); } catch (e) {}
    return v;
  });
  NOM.q = p.catch(function () {});
  return p;
}
function getJSON(url, ms) {
  var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, ms || 12000);
  return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}
function postJSON(url, body, ms) {
  var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, ms || 12000);
  var opts = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  if (ctl) opts.signal = ctl.signal;
  return fetch(url, opts).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}
function getPos() {
  return new Promise(function (res, rej) {
    if (!navigator.geolocation) return rej(new Error("no geo"));
    navigator.geolocation.getCurrentPosition(function (p) { setGPS(p.coords.latitude, p.coords.longitude); res({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); }, function (e) { GEO_OFF = !!(e && e.code === 1); renderMap(true); rej(e); }, { timeout: 15000, maximumAge: 120000, enableHighAccuracy: true });
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
      return (same ? Promise.resolve(LOC.name) : placeName(pos.lat, pos.lon)).then(function (nm) { LOC = { mode: "gps", lat: pos.lat, lon: pos.lon, name: nm }; saveLoc(); return LOC; });
    }, function (err) { if (LOC.lat != null) return LOC; throw { geo: true, err: err }; });
  p.then(function (L) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + L.lat + "&longitude=" + L.lon +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,uv_index,visibility,pressure_msl,dew_point_2m,cloud_cover,precipitation" +
      "&hourly=temperature_2m,apparent_temperature,weather_code,is_day,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,uv_index,visibility,pressure_msl,dew_point_2m,cloud_cover" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max" +
      unitQ() + "&timezone=auto&forecast_days=7";
    return getJSON(url).then(function (j) { WX = { at: Date.now(), units: S.units, key: locKey(), place: L.name || "MY LOCATION", j: j }; syncWxDayIndex(j); Store.setLocal("wx", WX); try { Store.setLocal("wxDay", WX_DAY); } catch (eD) {} $("#wxNote").textContent = ""; });
  }).catch(function (e) {
    if (e && e.geo) $("#wxNote").innerHTML = "Location is off for this app. Tap <b>◎ CHANGE</b> above to type your city instead.";
    else $("#wxNote").textContent = navigator.onLine === false ? "You're offline. Showing the last weather we saved." : "Weather service didn't answer. We'll retry in a few minutes.";
    var xn = $("#xpNote"); if (xn) xn.textContent = $("#wxNote").textContent;
    if (e && e.geo && !WX) {
      $("#wxPlace").textContent = "LOCATION OFF";
      $("#hwNow").textContent = "LOCATION OFF · TAP TO SET A CITY";
      $("#wxCond").textContent = "SET YOUR CITY";
      var adv = $("#hwAdvice"); if (adv) adv.textContent = "Turn on location or tap to pick a city";
      var ht = $("#hwTemp"); if (ht) ht.textContent = "—";
    } else if (!WX) {
      $("#hwNow").textContent = navigator.onLine === false ? "OFFLINE · NO WEATHER SAVED YET" : "WEATHER BUSY · RETRYING SOON";
      var adv2 = $("#hwAdvice"); if (adv2) adv2.textContent = navigator.onLine === false ? "Showing last saved weather when available" : "Retrying live forecast…";
    }
  }).then(function () { wxBusy = false; renderWeather(); });
}
function locKey() { return LOC.mode + ":" + LOC.lat + "," + LOC.lon; }
function renderWeather() {
  var fk = FORCE_FX && FX_DEBUG[FORCE_FX];
  if (!WX || !WX.j) { if (fk) { fxHud.set(FORCE_FX); fxMain.set(FORCE_FX); } try { updateSkyline(); } catch (e) {} return; }
  var j = WX.j, cu = j.current, u = S.units === "C" ? "C" : "F", wu = S.units === "C" ? "km/h" : "mph";
  var code = fk ? fk[0] : cu.weather_code, day = fk ? fk[1] === 1 : cu.is_day === 1;
  var kind = fk ? FORCE_FX : fxKind(code, day);
  fxHud.set(kind); fxMain.set(kind);
  $("#wxPlace").textContent = "➤ " + WX.place.toUpperCase() + (fk ? " · FX TEST: " + FORCE_FX.toUpperCase() : "");
  $("#wxTemp").textContent = Math.round(cu.temperature_2m) + "°";
  $("#wxIcon").textContent = wxEmoji(code, day);
  $("#wxCond").textContent = wxText(code);
  $("#wxHL").textContent = "H " + Math.round(j.daily.temperature_2m_max[0]) + "° · L " + Math.round(j.daily.temperature_2m_min[0]) + "°";
  $("#wxFeels").textContent = Math.round(cu.apparent_temperature) + "°";
  $("#wxRain").textContent = (j.daily.precipitation_probability_max[0] || 0) + "%";
  $("#wxWind").textContent = Math.round(cu.wind_speed_10m) + " " + wu;
  $("#wxSun").textContent = j.daily.sunset[0] ? isoT12(j.daily.sunset[0]) : "--";
  // Concept weather card: big temp + advice + 5-hour strip (NOW + next 4)
  var hi = Math.round(j.daily.temperature_2m_max[0]), lo = Math.round(j.daily.temperature_2m_min[0]), rain = j.daily.precipitation_probability_max[0] || 0;
  var tempEl = $("#hwTemp"); if (tempEl) tempEl.textContent = Math.round(cu.temperature_2m) + "°";
  $("#hwIc").textContent = (code <= 1 && !day) ? "✦" : wxEmoji(code, day);
  $("#hwNow").textContent = wxText(code).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  // friendly one-line advice from rain / conditions (no fake clock claims)
  var advice = $("#hwAdvice");
  if (advice) {
    var tip = "Live forecast · tap for more";
    if (rain >= 60 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) tip = "Rain likely — grab a jacket.";
    else if (code <= 77 && code >= 71) tip = "Snow in the forecast — dress warm.";
    else if (code === 0 || code === 1) tip = day ? "Clear skies — nice window to get outside." : "Clear night — good focus weather.";
    else if (code <= 3) tip = "Clouds hanging around — still a solid day.";
    else if (code <= 48) tip = "Foggy — give yourself extra time.";
    advice.textContent = tip;
  }
  $("#hwHL").textContent = "H " + hi + "° L " + lo + "°";
  $("#hwFeels").textContent = "FEELS " + Math.round(cu.apparent_temperature) + "°";
  $("#hwRain").textContent = "RAIN " + rain + "%";
  var hsEl = $("#hSunset"); if (hsEl) hsEl.textContent = "SUNSET " + (j.daily.sunset[0] ? isoT12(j.daily.sunset[0]).replace(/ ?([AP])M$/, "$1") : "--");
  var hwEl = $("#hWind"); if (hwEl) hwEl.textContent = Math.round(cu.wind_speed_10m) + " " + wu.toUpperCase().replace("KM/H", "KM/H");
  var key = cu.time.slice(0, 13), idx = j.hourly.time.findIndex(function (t) { return t.slice(0, 13) === key; }); if (idx < 0) idx = 0;
  var h4 = "";
  for (var q = 0; q < 5 && idx + q < j.hourly.time.length; q++) {
    var iq = idx + q, rq = j.hourly.precipitation_probability[iq] || 0;
    h4 += '<span class="hh' + (rq >= 40 ? " wet" : "") + '" role="listitem"><small>' + (q ? isoH(j.hourly.time[iq]) : "NOW") + '</small><span class="i">' + wxEmoji(j.hourly.weather_code[iq], j.hourly.is_day[iq] === 1) + "</span><b>" + Math.round(j.hourly.temperature_2m[iq]) + "°</b></span>";
  }
  $("#hwHrs").innerHTML = h4;
  var hs = "";
  for (var k = 0; k < 12 && idx + k < j.hourly.time.length; k++) {
    var i = idx + k, rp = j.hourly.precipitation_probability[i] || 0;
    hs += '<div class="hr"><small>' + (k ? isoH(j.hourly.time[i]) : "NOW") + '</small><span>' + wxEmoji(j.hourly.weather_code[i], j.hourly.is_day[i] === 1) + '</span><b>' + Math.round(j.hourly.temperature_2m[i]) + '°</b><em>' + (rp >= 20 ? rp + "%" : "") + '</em></div>';
  }
  var _wxH=$("#wxHours"); if(_wxH) _wxH.innerHTML = hs;
  var ds = "";
  for (var d = 0; d < 5 && d < j.daily.time.length; d++) {
    var dt = parseLocalYMD(j.daily.time[d]), nm = d === 0 ? "TODAY" : dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    var dc = j.daily.weather_code[d];
    ds += '<div class="day"><span class="d">' + nm + '</span><span>' + wxEmoji(dc, true) + '</span><span class="c">' + wxText(dc) + '</span><span class="r">' + (j.daily.precipitation_probability_max[d] || 0) + '%</span><span class="t">' + Math.round(j.daily.temperature_2m_max[d]) + '° <span>/ ' + Math.round(j.daily.temperature_2m_min[d]) + '°</span></span></div>';
  }
  var _wxD=$("#wxDays"); if(_wxD) _wxD.innerHTML = ds;
  $("#xpPlace").textContent = "➤ " + WX.place.toUpperCase();
  $("#xpNote").textContent = $("#wxNote").textContent;
  try { renderConditions(); } catch (e) {}
  updateStamps();
}

// ========== 9. markets ==========
var MK = Store.getLocal("mk", null), mkErr = false, mkPage = 0;
function money(n) {
  if (n == null || isNaN(n)) return "--";
  var x = +n;
  if (Math.abs(x) >= 1000) return "$" + Math.round(x).toLocaleString("en-US");
  if (Math.abs(x) >= 1) return "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(x) >= 0.01) return "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(x) > 0) return "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return "$0.00";
}
var _mkFailStreak = 0, _mkRetryT = 0;
function mkApplyPrices(j) {
  if (!j || typeof j !== "object") return false;
  MK = { at: Date.now(), d: Object.assign({}, MK && MK.d, j) }; Store.setLocal("mk", MK); mkErr = false; _mkFailStreak = 0;
  return true;
}
function mkFetchCoinGecko(idList) {
  return getJSON("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(idList.join(",")) + "&vs_currencies=usd&include_24hr_change=true");
}
function mkFetchBinance(idList) {
  var map = { bitcoin: "BTCUSDT", ethereum: "ETHUSDT", solana: "SOLUSDT", dogecoin: "DOGEUSDT", ripple: "XRPUSDT" };
  var want = idList.filter(function (id) { return map[id]; });
  if (!want.length) return Promise.reject(new Error("no binance ids"));
  return Promise.all(want.map(function (id) {
    return getJSON("https://api.binance.com/api/v3/ticker/24hr?symbol=" + map[id]).then(function (t) {
      var o = {}; o[id] = { usd: +t.lastPrice, usd_24h_change: +t.priceChangePercent }; return o;
    });
  })).then(function (arr) {
    var out = {}; arr.forEach(function (x) { Object.assign(out, x); }); return out;
  });
}
function scheduleMkRetry() {
  clearTimeout(_mkRetryT);
  var delay = Math.min(120000, 4000 * Math.pow(2, Math.min(5, _mkFailStreak)));
  _mkRetryT = setTimeout(function () { try { refreshMarkets(); } catch (e) {} }, delay);
}
function refreshMarkets() {
  var ids = { bitcoin: 1, ethereum: 1, solana: 1 };
  COINS.forEach(function (c) { if (c.id) ids[c.id] = 1; });
  loadHoldings().forEach(function (h) { if (h.kind !== "stock" && h.id) ids[h.id] = 1; });
  QUICK_PICKS.forEach(function (c) { if (c.id) ids[c.id] = 1; });
  var idList = Object.keys(ids);
  if (!idList.length) { renderMarkets(); try { refreshWallets(false); } catch (e) {} return; }
  mkFetchCoinGecko(idList)
    .then(function (j) { if (!mkApplyPrices(j)) throw new Error("empty"); })
    .catch(function () {
      return mkFetchBinance(idList).then(function (j) { if (!mkApplyPrices(j)) throw new Error("empty2"); });
    })
    .catch(function () { mkErr = true; _mkFailStreak++; scheduleMkRetry(); })
    .then(function () { renderMarkets(); try { refreshWallets(false); } catch (e) {} try { renderMkTicker(); } catch (e2) {} });
}
function chHTML(ch) { if (ch == null || isNaN(ch)) return '<span class="dim">--</span>'; return '<span class="' + (ch >= 0 ? "up" : "dn") + '">' + (ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(2) + "%</span>"; }
function sparkSVG(ch, seed) {
  /* v4.17: honest 24h direction glyph (a straight line), not an invented price path */
  if (ch == null || isNaN(ch)) return '<svg class="mk-spark" viewBox="0 0 56 22" aria-hidden="true"></svg>';
  var y1 = ch >= 0 ? 6 : 16, y0 = ch >= 0 ? 16 : 6;
  return '<svg class="mk-spark" viewBox="0 0 56 22" aria-hidden="true"><path d="M2,' + y0 + ' L54,' + y1 + '" stroke="' + (ch >= 0 ? "#3ddc97" : "#ff5c7a") + '"/></svg>';
}
function sparkSVG_old(ch, seed) {
  var up = (ch == null || isNaN(ch)) ? true : ch >= 0;
  var col = up ? "#3ddc97" : "#ff5c7a";
  var pts = [], n = 12, base = 14, amp = Math.min(10, 2 + Math.abs(ch || 0) * 0.6);
  var rnd = (seed || 1) * 9301 + 49297;
  for (var i = 0; i < n; i++) {
    rnd = (rnd * 49297 + 233280) % 233280;
    var wave = Math.sin(i / (n - 1) * Math.PI * (up ? 1.1 : 1.4) + (seed || 0)) * amp;
    var jit = ((rnd / 233280) - 0.5) * 3;
    var y = base + (up ? -wave : wave) + jit;
    pts.push((i / (n - 1) * 54 + 1).toFixed(1) + "," + Math.max(2, Math.min(20, y)).toFixed(1));
  }
  return '<svg class="mk-spark" viewBox="0 0 56 22" aria-hidden="true"><path d="M' + pts.join(" L") + '" stroke="' + col + '"/></svg>';
}
function loadHoldings() {
  var h = Store.get("holdings", null);
  return Array.isArray(h) ? h : [];
}
function saveHoldings(list) { Store.set("holdings", list); }
function holdingPrice(h) {
  if (h.kind === "stock") return h.manualPrice != null ? +h.manualPrice : null;
  var q = MK && MK.d && MK.d[h.id];
  return q && q.usd != null ? +q.usd : null;
}
function holdingChange(h) {
  if (h.kind === "stock") return null;
  var q = MK && MK.d && MK.d[h.id];
  return q ? q.usd_24h_change : null;
}
var QUICK_PICKS = [
  { id: "bitcoin", sym: "BTC", name: "Bitcoin", kind: "crypto" },
  { id: "ethereum", sym: "ETH", name: "Ethereum", kind: "crypto" },
  { id: "solana", sym: "SOL", name: "Solana", kind: "crypto" },
  { id: "dogecoin", sym: "DOGE", name: "Dogecoin", kind: "crypto" },
  { id: "ripple", sym: "XRP", name: "XRP", kind: "crypto" },
  { id: "pax-gold", sym: "GOLD", name: "Gold (PAX)", kind: "gold" }
];
var _dispTotal = null, _animRaf = 0, _lastTickDir = 0;
function signedMoney(n) {
  if (n == null || isNaN(n)) return "—";
  return (n >= 0 ? "+" : "-") + money(Math.abs(n));
}
function portfolioStats() {
  var list = loadHoldings(), total = 0, cost = 0, day = 0, priced = 0;
  list.forEach(function (h) {
    var px = holdingPrice(h), qty = +h.qty || 0;
    if (px == null || isNaN(px)) return;
    priced++;
    var val = px * qty;
    total += val;
    if (h.cost != null && !isNaN(+h.cost)) cost += (+h.cost) * qty;
    var ch = holdingChange(h);
    if (ch != null && !isNaN(ch)) day += val * (ch / (100 + ch)); // approx day $ from %
  });
  // include live wallet-account USD in the big net-worth total / day move
  loadAccounts().forEach(function (a) {
    if (a.kind === "bank") { if (a.inTotal !== false && a.bal != null && !isNaN(a.bal)) { total += +a.bal; priced++; } return; }
    if (a.kind !== "wallet") return;
    var usd = walletUsd(a);
    if (usd == null || isNaN(usd)) return;
    total += usd; priced++;
    var ch = walletChange(a);
    if (ch != null && !isNaN(ch)) day += usd * (ch / (100 + ch));
  });
  return { total: total, cost: cost, gl: cost > 0 ? total - cost : null, day: day, n: list.length, priced: priced, dayPct: total > 0 ? (day / (total - day || total)) * 100 : null };
}
function pushPortHist(total) {
  var h = Store.getLocal("portHist", null);
  if (!Array.isArray(h)) h = [];
  var now = Date.now(), last = h.length ? h[h.length - 1] : null;
  if (last && now - last.t < 8000) last.v = total;
  else h.push({ t: now, v: total });
  if (h.length > 48) h = h.slice(-48);
  Store.setLocal("portHist", h);
  return h;
}
function animateHoldTotal(to) {
  var tv = $("#holdTotalV"); if (!tv) return;
  if (_dispTotal == null || isNaN(_dispTotal)) { _dispTotal = to; tv.textContent = money(to); return; }
  var prev = _dispTotal;
  var target = to;
  if (_animRaf) cancelAnimationFrame(_animRaf);
  function step() {
    var d = target - _dispTotal;
    if (Math.abs(d) < 0.005 + Math.abs(target) * 0.00001) {
      _dispTotal = target; _animRaf = 0; tv.textContent = money(target);
      tv.classList.remove("tick-up", "tick-dn");
      return;
    }
    _dispTotal += d * 0.22;
    tv.textContent = money(_dispTotal);
    _animRaf = requestAnimationFrame(step);
  }
  /* v4.9.2: no count-up animation — set the number once */
  _dispTotal = target; _animRaf = 0; tv.textContent = money(target); return;
  if (target > prev + 0.01) { tv.classList.add("tick-up", "pulse"); tv.classList.remove("tick-dn"); }
  else if (target < prev - 0.01) { tv.classList.add("tick-dn", "pulse"); tv.classList.remove("tick-up"); }
  clearTimeout(animateHoldTotal._pk);
  animateHoldTotal._pk = setTimeout(function () { tv.classList.remove("pulse"); }, 700);
  _animRaf = requestAnimationFrame(step);
}
function drawHoldChart(cv, stats) {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = cv.clientWidth || 280, H = 72;
  cv.width = W * dpr; cv.height = H * dpr;
  var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  var hist = Store.getLocal("portHist", null);
  var vals = Array.isArray(hist) ? hist.map(function (x) { return +x.v; }).filter(function (v) { return !isNaN(v); }) : [];
  if (vals.length < 2) { return; } /* v4.17: no invented chart until real history exists */
  if (false) {
    // (old soft placeholder)
    var up0 = !(stats.day < 0);
    var col0 = up0 ? "#3ddc97" : "#ff5c7a";
    var pts0 = [], n0 = 24, base0 = H * 0.55, amp0 = H * 0.22;
    for (var i0 = 0; i0 < n0; i0++) {
      var wave0 = Math.sin(i0 / (n0 - 1) * Math.PI * 1.15) * amp0 * (up0 ? 1 : -1);
      pts0.push([2 + i0 / (n0 - 1) * (W - 4), Math.max(4, Math.min(H - 4, base0 - wave0 * (i0 / (n0 - 1))))]);
    }
    c.beginPath(); pts0.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.lineTo(pts0[pts0.length - 1][0], H); c.lineTo(pts0[0][0], H); c.closePath();
    var g0 = c.createLinearGradient(0, 0, 0, H);
    g0.addColorStop(0, up0 ? "rgba(61,220,151,.28)" : "rgba(255,92,122,.28)"); g0.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g0; c.fill();
    c.beginPath(); pts0.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.strokeStyle = col0; c.lineWidth = 2; c.stroke();
    return;
  }
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (max === min) { max = min + 1; min = min - 1; }
  var up = vals[vals.length - 1] >= vals[0];
  var col = up ? "#3ddc97" : "#ff5c7a";
  var pts = vals.map(function (v, i) {
    var x = 2 + i / (vals.length - 1) * (W - 4);
    var y = H - 4 - ((v - min) / (max - min)) * (H - 8);
    return [x, y];
  });
  c.beginPath();
  pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
  c.lineTo(pts[pts.length - 1][0], H); c.lineTo(pts[0][0], H); c.closePath();
  var g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, up ? "rgba(61,220,151,.35)" : "rgba(255,92,122,.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.fill();
  c.beginPath();
  pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
  c.strokeStyle = col; c.lineWidth = 2; c.stroke();
}
function renderQuickPicks() {
  var host = $("#qaPicks"); if (!host) return;
  var have = {};
  loadHoldings().forEach(function (h) { if (h.id) have[h.id] = 1; if (h.sym) have[String(h.sym).toUpperCase()] = 1; });
  host.innerHTML = QUICK_PICKS.map(function (p) {
    var on = !!(have[p.id] || have[p.sym]);
    return '<button type="button" class="chip' + (on ? " on" : "") + '" data-qa="' + esc(p.id) + '"' + (on ? " disabled" : "") + ">" + esc(p.sym) + (on ? " ✓" : " ＋") + "</button>";
  }).join("");
}
function quickAddHolding(pick) {
  if (!pick) return;
  sheet("＋ ADD " + pick.sym,
    '<p class="note" style="margin-bottom:8px">Live price via CoinGecko. Enter how much you hold.</p>' +
    '<label class="field">QUANTITY<input id="qaQty" type="number" step="any" min="0" value="1" placeholder="e.g. 0.5"></label>' +
    '<label class="field">COST BASIS / UNIT (OPTIONAL)<input id="qaCost" type="number" step="any" min="0" placeholder="What you paid"></label>' +
    '<label class="field">ACCOUNT<select id="qaAcct"><option value="">Unassigned</option></select></label>' +
    '<button class="btn" id="qaSave" style="margin-top:12px">ADD ' + esc(pick.sym) + "</button>",
    function (b) {
      var sel = b.querySelector("#qaAcct");
      if (sel) loadAccounts().filter(function (a) { return a.kind !== "wallet"; }).forEach(function (a) {
        var o = document.createElement("option"); o.value = a.id; o.textContent = a.name; sel.appendChild(o);
      });
      setTimeout(function () { var i = b.querySelector("#qaQty"); i && i.focus && i.focus({ preventScroll: true }); }, 40);
      b.querySelector("#qaSave").addEventListener("click", function () {
        var qty = parseFloat(b.querySelector("#qaQty").value);
        var costRaw = b.querySelector("#qaCost").value;
        var cost = costRaw === "" ? null : parseFloat(costRaw);
        if (!(qty > 0)) { toast("Enter a quantity"); return; }
        var list = loadHoldings();
        var existing = -1;
        list.forEach(function (h, i) { if (h.id === pick.id) existing = i; });
        var row = { id: pick.id, sym: pick.sym, name: pick.name, kind: pick.kind, qty: qty, cost: cost };
        var acctId = sel && sel.value;
        if (acctId) row.accountId = acctId;
        if (existing >= 0) list[existing] = row; else {
          if (list.length >= 20) { toast("Up to 20 holdings"); return; }
          list.push(row);
        }
        saveHoldings(list); closeSheet(); renderMarkets(); refreshMarkets(); toast(pick.sym + " added");
      });
    });
}

function drawMkMiniSpark(cv, stats) {
  if (!cv) return;
  try {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.clientWidth || 240, H = cv.clientHeight || 36;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var hist = Store.getLocal("portHist", null);
    var vals = Array.isArray(hist) ? hist.map(function (x) { return +x.v; }).filter(function (v) { return !isNaN(v); }) : [];
    cv.style.display = vals.length < 2 ? "none" : "";
    if (vals.length < 2) { return; } /* v4.17: no invented sparkline */
    if (false) {
      var up0 = !(stats && stats.day < 0);
      var col0 = up0 ? "#3ddc97" : "#ff5c7a";
      c.beginPath();
      for (var i = 0; i < 24; i++) {
        var x = 2 + i / 23 * (W - 4);
        var y = H * 0.55 - Math.sin(i / 23 * Math.PI) * H * 0.28 * (up0 ? 1 : -1);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.strokeStyle = col0; c.lineWidth = 1.6; c.stroke();
      return;
    }
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max = min + 1; min = min - 1; }
    var up = vals[vals.length - 1] >= vals[0];
    var col = up ? "#3ddc97" : "#ff5c7a";
    c.beginPath();
    vals.forEach(function (v, i) {
      var x = 2 + i / (vals.length - 1) * (W - 4);
      var y = H - 3 - ((v - min) / (max - min)) * (H - 6);
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    });
    c.strokeStyle = col; c.lineWidth = 1.7; c.stroke();
  } catch (e) {}
}
function renderHomeMarkets(stats, accts) {
  stats = stats || portfolioStats();
  accts = accts || loadAccounts();
  var port = $("#hMkPort"), quotes = $("#hMkQuotes"), body = $("#hMkBody");
  var hasAcct = (accts && accts.length) || loadHoldings().length;
  var totalEl = $("#hMkTotal"), dayEl = $("#hMkDay");
  if (port) port.hidden = false;
  if (!hasAcct) {
    if (totalEl) totalEl.textContent = "—";
    if (dayEl) { dayEl.textContent = "Nothing tracked yet · tap ＋ Add"; dayEl.className = "hmk-day dim empty-state"; dayEl.setAttribute("role","status"); }
    if (port && !totalEl) port.innerHTML = '<span class="hmk-day dim empty-state" role="status">No accounts yet</span>';
  } else {
    if (totalEl) totalEl.textContent = stats.priced ? money(stats.total) : "—";
    else if (port) {
      var dayHtml = stats.priced
        ? ('<span class="hmk-day ' + (stats.day >= 0 ? "up" : "dn") + '">' + signedMoney(stats.day) + (stats.dayPct != null ? " · " + ((stats.dayPct >= 0 ? "+" : "") + stats.dayPct.toFixed(2) + "%") : "") + "</span>")
        : '<span class="hmk-day">—</span>';
      port.innerHTML = '<b class="hmk-total" data-hmk-port="1">' + money(stats.total) + "</b>" + dayHtml;
    }
    if (dayEl) {
      if (!stats.priced) { dayEl.textContent = "—"; dayEl.className = "hmk-day"; }
      else {
        dayEl.textContent = signedMoney(stats.day) + (stats.dayPct != null ? " · " + ((stats.dayPct >= 0 ? "+" : "") + stats.dayPct.toFixed(2) + "%") : "");
        dayEl.className = "hmk-day " + (stats.day >= 0 ? "up" : "dn");
      }
    }
  }
  drawMkMiniSpark($("#hMkSpark"), stats);
  if (quotes) quotes.innerHTML = "";
  if (body) body.hidden = true;
}

function renderHoldings() {
  var list = loadHoldings(), stats = portfolioStats(), accts = loadAccounts();
  /* v4.17: never show $0 as if it were a real portfolio — "—" until a priced holding exists */
  var _hasPort = list.length > 0;
  if (_hasPort && stats.priced) { pushPortHist(stats.total); animateHoldTotal(stats.total); }
  else { var _tv0 = $("#holdTotalV"); if (_tv0) _tv0.textContent = "—"; _dispTotal = null; }
  try { var _kk = document.querySelector("#portHero .ph-kicker"); if (_kk) _kk.textContent = !_hasPort ? "PORTFOLIO · NOTHING ADDED YET" : (stats.priced ? (mkErr ? "PORTFOLIO · LAST SAVED PRICES" : "PORTFOLIO · PRICES LIVE") : "PORTFOLIO · PRICES UNAVAILABLE"); } catch (eKk) {}
  var dv = $("#holdDayV");
  if (dv) {
    if (!stats.priced) { dv.textContent = "—"; dv.className = ""; }
    else { dv.textContent = signedMoney(stats.day); dv.className = stats.day >= 0 ? "up" : "dn"; }
  }
  var dp = $("#holdDayPct");
  if (dp) {
    if (stats.dayPct == null || !stats.priced) dp.textContent = "";
    else { dp.textContent = (stats.dayPct >= 0 ? "+" : "") + stats.dayPct.toFixed(2) + "%"; dp.className = stats.dayPct >= 0 ? "up" : "dn"; }
  }
  var gv = $("#holdGlV");
  if (gv) {
    if (stats.gl == null) { gv.textContent = "—"; gv.className = ""; }
    else { gv.textContent = signedMoney(stats.gl); gv.className = stats.gl >= 0 ? "up" : "dn"; }
  }
  drawHoldChart($("#holdChart"), stats);
  try { var qa = $("#quickAdd"); if (qa) qa.hidden = true; } catch (e0) {}
  try { renderAccounts(); } catch (e) {}
  var byAcct = {};
  accts.forEach(function (a) { byAcct[a.id] = a; });
  var host = $("#holdList");
  if (host) {
    if (!list.length) host.innerHTML = '<div class="hold-empty"><p class="v6-empty"><b>No holdings yet.</b> Add a coin or stock you own to track it here. Crypto prices come live from CoinGecko; stocks use a price you type. Nothing is added for you and nothing leaves this device.</p><p class="v6-empty dim">Brokerage sign-in (Fidelity, Schwab, Robinhood…) needs a secure connection provider and isn’t switched on.</p><button type="button" class="chip accent" id="holdEmptyAdd">＋ Add holding</button></div>';
    else host.innerHTML = list.map(function (h, i) {
      var px = holdingPrice(h), ch = holdingChange(h), qty = +h.qty || 0;
      var val = px != null ? px * qty : null;
      var acct = h.accountId && byAcct[h.accountId];
      var tag = acct ? '<span class="acct-tag">' + esc(acct.name) + "</span>" : "";
      var sub = (h.kind === "stock" ? "Stock · manual price" : (h.kind === "gold" ? "Gold" : "Crypto")) + " · qty " + qty;
      if (h.cost != null) sub += " · basis " + money(+h.cost);
      return '<div class="hold-row" data-hi="' + i + '"><div><div class="sym">' + esc(h.sym) + tag + '</div><div class="sub">' + esc(h.name || "") + " · " + esc(sub) + '</div></div>' +
        '<div><div class="px">' + (val != null ? money(val) : "--") + '</div><div class="ch">' + (px != null ? money(px) : "--") + (ch != null ? " · " + ((ch >= 0 ? "+" : "") + ch.toFixed(2) + "%") : "") + '</div></div>' +
        '<div class="acts"><button type="button" class="chip" data-hold-edit="' + i + '">Edit</button><button type="button" class="chip" data-hold-del="' + i + '">Remove</button></div></div>';
    }).join("");
  }
  try { renderHomeMarkets(stats, accts); } catch (e) {}
  try { renderBanks(); } catch (eB) {}
}

function renderMkTicker() {
  /* v4.9.5: market tape — one CSS translateX loop on a duplicated track; prices update in place (no DOM rebuild per tick) */
  var host = $("#mkTicker"), track = $("#mkTickerTrack");
  if (!host || !track) return;
  var d = MK && MK.d || {};
  var items = [], seen = {};
  function add(id, sym, force) {
    if (!id || seen[id] || items.length >= 10) return;
    if (!force && !d[id]) return;
    seen[id] = 1; items.push({ id: id, sym: String(sym || id).toUpperCase().slice(0, 6) });
  }
  add("bitcoin", "BTC", true); add("ethereum", "ETH", true); add("solana", "SOL", true); add("pax-gold", "GOLD", true);
  try { COINS.forEach(function (c) { add(c.id, c.sym); }); } catch (e) {}
  try { loadHoldings().forEach(function (h) { if (h.kind !== "stock") add(h.id, h.sym); }); } catch (e) {}
  try { QUICK_PICKS.forEach(function (c) { add(c.id, c.sym); }); } catch (e) {}
  var key = items.map(function (it) { return it.id; }).join(",");
  if (track._key !== key) {
    track._key = key;
    var seg = items.map(function (it) {
      return '<span class="tk" data-tk="' + esc(it.id) + '"><b>' + esc(it.sym) + '</b> <i class="tk-px">--</i> <em class="tk-ch"></em></span>';
    }).join("");
    track.innerHTML = '<div class="tape-seg">' + seg + '</div><div class="tape-seg" aria-hidden="true">' + seg + "</div>";
    track._w = 0;
    bindTickerPause(host);
  }
  items.forEach(function (it) {
    var q = d[it.id], ch = q ? q.usd_24h_change : null;
    var px = q ? money(q.usd) : "--";
    var cls = (ch == null || isNaN(ch)) ? "" : (ch >= 0 ? "up" : "dn");
    var cht = (ch == null || isNaN(ch)) ? "" : ((ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(1) + "%");
    $$('[data-tk="' + it.id + '"]', track).forEach(function (el) {
      var p = el.querySelector(".tk-px"), c = el.querySelector(".tk-ch");
      if (p.textContent !== px) p.textContent = px;
      if (c.textContent !== cht) c.textContent = cht;
      if (c.className !== "tk-ch " + cls) c.className = "tk-ch " + cls;
    });
  });
  host.hidden = false;
  setTimeout(function () {
    var s0 = track.querySelector(".tape-seg"); if (!s0) return;
    var w = s0.offsetWidth; if (!w) return;
    if (track._w && Math.abs(w - track._w) < 40) return;
    track._w = w;
    track.style.setProperty("--tape-dur", Math.max(10, Math.round(w / 48)) + "s"); /* ≈48px/s */
  }, 60);
}
function bindTickerPause(host) {
  if (host._tp) return; host._tp = true;
  var t = 0;
  function pause() { clearTimeout(t); host.classList.add("paused"); }
  function resume() { clearTimeout(t); t = setTimeout(function () { host.classList.remove("paused"); }, 1500); }
  host.addEventListener("pointerdown", pause, { passive: true });
  host.addEventListener("touchstart", pause, { passive: true });
  host.addEventListener("pointerup", resume, { passive: true });
  host.addEventListener("pointercancel", resume, { passive: true });
  host.addEventListener("touchend", resume, { passive: true });
  host.addEventListener("touchcancel", resume, { passive: true });
}

function renderMarkets() {
  var d = MK && MK.d || {}, list = "", mini = "";
  var seen = {};
  COINS.forEach(function (c) {
    if (!c || !c.id || seen[c.id]) return; seen[c.id] = 1;
    var q = d[c.id];
    list += '<div class="row"><span class="sym">' + esc(c.sym) + '</span><span class="grow">' + esc(c.name) + '</span><span class="px">' + (q ? money(q.usd) : "--") + '</span><span class="ch">' + (q ? chHTML(q.usd_24h_change) : "") + "</span></div>";
  });
  // Compact home rows: unique BTC + GOLD only (no duplicates / no paging flicker)
  var homePairs = [
    { id: "bitcoin", sym: "BTC", name: "Bitcoin" },
    { id: "pax-gold", sym: "GOLD", name: "Gold" }
  ];
  mini += '<div class="mk-sec" data-hmk-port="1">WATCHLIST</div>';
  var _anyQ = homePairs.some(function (c) { return d[c.id]; });
  if (mkErr) mini += '<div class="v6-mkerr" role="status">' + (_anyQ ? ("Prices may be stale · saved " + (MK && MK.at ? short12(MK.at) : "--")) : (navigator.onLine === false ? "Offline · no saved prices yet" : "Price service didn’t answer")) + ' <button type="button" class="chip" data-mk-retry="1">↻ Retry</button></div>';
  else if (!_anyQ) mini += '<div class="v6-mkerr dim" role="status">Loading live prices…</div>';
  homePairs.forEach(function (c, i) {
    var q = d[c.id], ch = q ? q.usd_24h_change : null;
    mini += '<div class="mk-row" data-hmk-port="1"><span class="sym">' + esc(c.sym) + '</span><span>' + sparkSVG(ch, (c.id || "").length + i) +
      '<div class="px">' + (q ? money(q.usd) : "--") + '</div></span><span class="ch ' + ((ch == null || isNaN(ch)) ? "" : (ch >= 0 ? "up" : "dn")) + '">' +
      ((ch == null || isNaN(ch)) ? "--" : ((ch >= 0 ? "+" : "") + ch.toFixed(2) + "%")) + "</span></div>";
  });
  try {
    var wN = loadAccounts().filter(function (a) { return a.kind === "wallet"; }).length;
    var hN = loadHoldings().length;
    if (wN || hN) mini += '<div class="mk-sec" data-hmk-port="1">' + (wN ? (wN + " wallet" + (wN === 1 ? "" : "s")) : "") + (wN && hN ? " · " : "") + (hN ? (hN + " holding" + (hN === 1 ? "" : "s")) : "") + "</div>";
  } catch (eSec) {}
  if (!COINS.length) { list = '<p class="offline">Your watchlist is empty. Tap ✎ WATCHLIST to add a coin.</p>'; }
  /* v4.9.2: only touch the DOM when content actually changed (no 12s repaint) */
  function setH(el, h) { if (el && el._h !== h) { el._h = h; el.innerHTML = h; } }
  setH($("#mkList"), list); setH($("#hMkList"), mini); setH($("#xpMkList"), list);
  try { renderHoldings(); } catch (e) {}
  try { renderHomeMarkets(); } catch (e) {}
  try { renderMkTicker(); } catch (e3) {}
  try { renderBanks(); } catch (eB) {}
  updateStamps();
}

function updateStamps() {
  var st = function (el, at) { if (!el) return; if (!at) { el.textContent = "UPDATED --"; el.classList.add("old"); return; } el.textContent = "UPDATED " + t12(new Date(at)); el.classList.toggle("old", Date.now() - at > 30 * 60000); };
  st($("#wxStamp"), WX && WX.at); st($("#mkStamp"), MK && MK.at); st($("#xpMkStamp"), MK && MK.at);
  var sh = function (el, at, pre) { if (!el) return; el.textContent = pre + (at ? short12(at) : "--"); el.classList.toggle("old", !at || Date.now() - at > 30 * 60000); };
  sh($("#hwUpd"), WX && WX.at, "UPD ");
  try { updateSkyline(); } catch (e) {} // after wx
  var hMkT = $("#hMkT");
  if (hMkT) {
    if (MK && MK.at) hMkT.textContent = short12(MK.at);
    else hMkT.textContent = "";
    hMkT.classList.add("tiny");
    hMkT.classList.toggle("old", !(MK && MK.at) || Date.now() - MK.at > 30 * 60000);
  }
  var last = Math.max(WX && WX.at || 0, MK && MK.at || 0);
  var sync = $("#hSync");
  if (sync) {
    var syncH = navigator.onLine === false ? '<i aria-hidden="true"></i>OFFLINE' : '<i aria-hidden="true"></i>LIVE';
    if (sync._h !== syncH) { sync._h = syncH; sync.innerHTML = syncH; }
    sync.title = last ? ("Last live update " + short12(last)) : "Waiting for live data";
  }
  if (GPS) sh($("#hGps"), GPS.at, "GPS "); else { var g = $("#hGps"); if (g) g.textContent = GEO_OFF ? "GPS OFF" : "GPS --"; }
}
function short12(at) { return t12(new Date(at)).replace(/ ?([AP])M$/, "$1"); }

// ========== 10. map — OSM standard tiles (keyless) + dark filter, pan/zoom/recenter ==========
// Attribution: © OpenStreetMap contributors. No API key. CARTO basemaps removed (watermarked).
/* ========== v4.9.5 Motion (hologram accents + market tape) — one switch, default on ========== */
function motionWanted() {
  if (Store.getLocal("uiMotion", true) === false) return false;
  try { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return false; } catch (e) {}
  return true;
}
function applyMotion() {
  try { document.documentElement.classList.toggle("motion-on", motionWanted()); } catch (e) {}
  try { ensureCardHolos(); } catch (eH) {}
}
var HOLO_IO = null;
function ensureCardHolos() {
  var sel = ".card.br, .panel-group.card";
  var nodes = document.querySelectorAll(sel);
  if (!motionWanted()) {
    if (HOLO_IO) { try { HOLO_IO.disconnect(); } catch (e) {} HOLO_IO = null; }
    Array.prototype.forEach.call(nodes, function (el) {
      el.classList.remove("is-live");
      var h = null; for (var c = el.firstChild; c; c = c.nextSibling) { if (c.nodeType === 1 && c.classList && c.classList.contains("card-holo")) { h = c; break; } } if (h) try { h.remove(); } catch (e2) {}
    });
    return;
  }
  if (!HOLO_IO && typeof IntersectionObserver === "function") {
    HOLO_IO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) en.target.classList.add("is-live");
        else en.target.classList.remove("is-live");
      });
    }, { root: null, rootMargin: "40px 0px", threshold: 0.08 });
  }
  Array.prototype.forEach.call(nodes, function (el, i) {
    var h = null;
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && c.classList && c.classList.contains("card-holo")) { h = c; break; }
    }
    if (!h) {
      h = document.createElement("i");
      h.className = "card-holo";
      h.setAttribute("aria-hidden", "true");
      h.innerHTML = '<i class="card-holo-foil"></i><i class="card-holo-tint"></i><i class="card-holo-sweep"></i><i class="card-holo-glow"></i>';
      el.insertBefore(h, el.firstChild);
    } else if (!h.querySelector(".card-holo-foil") || !h.querySelector(".card-holo-glow") || !h.querySelector(".card-holo-sweep")) {
      h.innerHTML = '<i class="card-holo-foil"></i><i class="card-holo-tint"></i><i class="card-holo-sweep"></i><i class="card-holo-glow"></i>';
    }
    var delay = (-(i % 11) * 0.55) + "s";
    el.style.setProperty("--holo-delay", delay);
    h.style.setProperty("--holo-delay", delay);
    if (HOLO_IO) { try { HOLO_IO.observe(el); } catch (e3) {} }
    else el.classList.add("is-live");
  });
}
applyMotion();
try { var _rmq = matchMedia("(prefers-reduced-motion: reduce)"); if (_rmq.addEventListener) _rmq.addEventListener("change", applyMotion); } catch (e) {}

/* ========== v4.11.0 gentle holo tilt (pointer / orientation; motion-on only) ========== */
var HOLO_TILT = { on: false, raf: 0, tx: 0, ty: 0, mx: 0, my: 0 };
function holoTiltWanted() {
  if (!motionWanted()) return false;
  try { if (Store.getLocal("tiltCards", null) === false) return false; } catch (e) {}
  return true;
}
function applyHoloTiltFrame() {
  HOLO_TILT.raf = 0;
  if (!holoTiltWanted()) return;
  var nodes = document.querySelectorAll(".card.br.is-live, .panel-group.card.is-live");
  var tx = HOLO_TILT.tx, ty = HOLO_TILT.ty;
  Array.prototype.forEach.call(nodes, function (el) {
    el.classList.add("holo-tilt");
    el.style.setProperty("--tilt-x", (tx * 0.9).toFixed(2) + "deg");
    el.style.setProperty("--tilt-y", (ty * 0.9).toFixed(2) + "deg");
  });
}
function queueHoloTilt(nx, ny) {
  /* nx/ny in -1..1 */
  HOLO_TILT.tx = Math.max(-4, Math.min(4, -ny * 4));
  HOLO_TILT.ty = Math.max(-5, Math.min(5, nx * 5));
  if (!HOLO_TILT.raf) HOLO_TILT.raf = requestAnimationFrame(applyHoloTiltFrame);
}
function clearHoloTilt() {
  HOLO_TILT.tx = 0; HOLO_TILT.ty = 0;
  if (!HOLO_TILT.raf) HOLO_TILT.raf = requestAnimationFrame(function () {
    HOLO_TILT.raf = 0;
    document.querySelectorAll(".holo-tilt").forEach(function (el) {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    });
  });
}
function bindHoloTilt() {
  if (HOLO_TILT.on) return; HOLO_TILT.on = true;
  var last = 0;
  window.addEventListener("pointermove", function (e) {
    if (!holoTiltWanted()) return;
    if (e.pointerType === "touch") return; /* avoid fighting scroll */
    var now = Date.now(); if (now - last < 32) return; last = now;
    var w = window.innerWidth || 1, h = window.innerHeight || 1;
    queueHoloTilt((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  }, { passive: true });
  window.addEventListener("pointerleave", function () { if (holoTiltWanted()) clearHoloTilt(); }, { passive: true });
  window.addEventListener("deviceorientation", function (e) {
    if (!holoTiltWanted()) return;
    if (e.beta == null || e.gamma == null) return;
    var nx = Math.max(-1, Math.min(1, e.gamma / 30));
    var ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    queueHoloTilt(nx, ny);
  }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) clearHoloTilt();
  });
}
bindHoloTilt();
try { window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.qa = window.ZAPOS.qa || {}; window.ZAPOS.qa.holo = function () {
  return { motion: motionWanted(), live: document.querySelectorAll(".card.br.is-live .card-holo-foil").length, foil: !!document.querySelector(".card-holo-foil") };
}; } catch (eHoloQa) {}


/* ========== v4.9.5 compass heading (only real data; iOS needs a tap to allow) ========== */
var COMPASS = { deg: null, at: 0, on: false, t: 0 };
function currentHeading() {
  if (COMPASS.deg != null && Date.now() - COMPASS.at < 4000) return COMPASS.deg;
  if (GPS && GPS.heading != null && !isNaN(GPS.heading) && GPS.headingAt && Date.now() - GPS.headingAt < 20000) return GPS.heading;
  return null;
}
function onCompass(e) {
  var deg = null;
  if (e && e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) deg = +e.webkitCompassHeading;
  else if (e && e.absolute && e.alpha != null && !isNaN(e.alpha)) deg = (360 - e.alpha) % 360;
  if (deg == null) return;
  var prev = COMPASS.deg; COMPASS.deg = deg; COMPASS.at = Date.now();
  var now = Date.now();
  if (prev != null && Math.abs(((deg - prev + 540) % 360) - 180) < 3 && now - COMPASS.t < 1000) return;
  if (now - COMPASS.t < 120) return;
  COMPASS.t = now;
  var h = document.querySelector("#mapV .map-heading"); if (!h || !(GPS && GPS.lat != null)) return;
  h.hidden = false;
  h.style.transform = "translate(-50%, -50%) rotate(" + Math.round(deg) + "deg)";
}
function attachCompass() {
  if (COMPASS.on) return; COMPASS.on = true;
  /* listening is harmless: iOS sends nothing until the user allows it */
  if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", onCompass, { passive: true });
  window.addEventListener("deviceorientation", onCompass, { passive: true });
}
function startCompass(fromGesture) {
  var D = window.DeviceOrientationEvent; if (!D) return;
  attachCompass();
  if (fromGesture && typeof D.requestPermission === "function" && !COMPASS.asked) {
    COMPASS.asked = true; /* iOS: ask once, only from a tap; denied = cone stays hidden */
    try { D.requestPermission().catch(function () {}); } catch (e) {}
  }
}

var TOUR = { on: false, i: 0, steps: [], root: null, t: 0 };
var GPS = Store.getLocal("gps", null), PLACE = Store.getLocal("place", null), GEO_OFF = false, nomBusy = false, nomLast = 0;
var MAP = { z: 16, offX: 0, offY: 0, dragging: false, moved: false, last: null, follow: true, smoothZ: 16 };
var _gpsWatch = null, _gpsLastWx = null, _tileCache = {};
function meters(a, b) { if (!a || !b || a.lat == null || b.lat == null) return Infinity; var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function setGPS(lat, lon, meta) {
  meta = meta || {};
  var prev = GPS ? { lat: GPS.lat, lon: GPS.lon } : null;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  // When not following, keep the map view geographically fixed as GPS moves
  if (prev && !MAP.follow) {
    var oldW = lonLatToWorld(prev.lon, prev.lat, z);
    var newW = lonLatToWorld(lon, lat, z);
    MAP.offX += (newW.x - oldW.x);
    MAP.offY += (newW.y - oldW.y);
  }
  if (MAP.follow) { MAP.offX = 0; MAP.offY = 0; }
  /* v4.9.5: GPS heading counts only when the browser reports one while moving */
  var _hOk = meta.heading != null && !isNaN(+meta.heading) && +meta.heading >= 0 && (meta.speed == null || +meta.speed > 0.6);
  GPS = {
    lat: lat, lon: lon, at: Date.now(),
    acc: meta.accuracy != null ? +meta.accuracy : (GPS && GPS.acc),
    heading: _hOk ? +meta.heading : ((GPS && GPS.headingAt && Date.now() - GPS.headingAt < 20000) ? GPS.heading : null),
    headingAt: _hOk ? Date.now() : (GPS && GPS.headingAt),
    speed: meta.speed != null ? +meta.speed : (GPS && GPS.speed)
  };
  Store.setLocal("gps", { lat: GPS.lat, lon: GPS.lon, at: GPS.at, acc: GPS.acc });
  GEO_OFF = false;
  try { updateGpsLockChip(); } catch (e) {}
  renderMap(true);
  updateStamps();
  geocode();
  // Refresh weather after a big move (>5 km)
  try {
    if (_gpsLastWx && meters(_gpsLastWx, GPS) > 5000) {
      _gpsLastWx = { lat: GPS.lat, lon: GPS.lon };
      refreshWeather(true);
    } else if (!_gpsLastWx) {
      _gpsLastWx = { lat: GPS.lat, lon: GPS.lon };
    }
  } catch (e) {}
}
function geocode() {
  if (!GPS || nomBusy || navigator.onLine === false) return;
  // Throttle: re-query when moved >=200 m OR at least 60 s since last query
  var moved = !PLACE || meters(PLACE, GPS) >= 200;
  var aged = Date.now() - nomLast >= 60000;
  if (!moved && !aged) return;
  if (Date.now() - nomLast < 10000) return; // hard floor
  nomBusy = true; nomLast = Date.now();
  nomJSON("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=" + GPS.lat.toFixed(5) + "&lon=" + GPS.lon.toFixed(5), 10000)
    .then(function (j) {
      var a = j && j.address || {};
      var road = a.road || a.pedestrian || a.footway || a.path || a.residential || a.neighbourhood || a.hamlet || "";
      var city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || "";
      PLACE = { road: road.toUpperCase(), city: city.toUpperCase(), lat: GPS.lat, lon: GPS.lon, at: Date.now() }; Store.setLocal("place", PLACE);
    }).catch(function () {}).then(function () { nomBusy = false; renderPlace(); try { refreshPlaceEtas(); } catch (e) {} });
}
function startGpsWatch() {
  if (!navigator.geolocation) { GEO_OFF = true; renderMap(true); return; }
  if (_gpsWatch != null) return;
  var opts = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };
  _gpsWatch = navigator.geolocation.watchPosition(
    function (p) {
      setGPS(p.coords.latitude, p.coords.longitude, {
        accuracy: p.coords.accuracy,
        heading: p.coords.heading,
        speed: p.coords.speed
      });
    },
    function (e) {
      GEO_OFF = !!(e && e.code === 1);
      if (!GPS) renderMap(true);
      updateStamps();
    },
    opts
  );
}
function stopGpsWatch() {
  if (_gpsWatch != null && navigator.geolocation) {
    try { navigator.geolocation.clearWatch(_gpsWatch); } catch (e) {}
  }
  _gpsWatch = null;
}

function renderPlace() {
  var t = "> " + (GEO_OFF && !GPS ? "LOCATION OFF" : PLACE && (PLACE.road || PLACE.city) ? [PLACE.road, PLACE.city].filter(Boolean).join(" · ") : "LOCATING…");
  var el = $("#hPlace"); if (el) el.textContent = t;
}
function lonLatToWorld(lon, lat, z) {
  var n = Math.pow(2, z), la = lat * Math.PI / 180;
  return { x: (lon + 180) / 360 * n * 256, y: (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n * 256, n: n };
}
function tileUrlFallback(z, x, y) {
  /* v4.9.5: community mirror of the same OpenStreetMap style, used only when the main server fails or throttles */
  return "https://tile.openstreetmap.de/" + z + "/" + x + "/" + y + ".png";
}
function tileUrl(z, x, y) {
  // OSM standard raster tiles — free, no key. v4.9.4: single HTTP/2 host (OSM retired a/b/c subdomains).
  return "https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
}
/* ===== v4.9.7 live traffic (TomTom flow via zapwise worker — no client API key) ===== */
var TRAFFIC = { fails: 0, dead: false, lastOk: 0 };
var TRAFFIC_URL = "https://zapwise-traffic.zapwisehq.workers.dev/flow";
function trafficWanted() {
  try { return Store.getLocal("mapTraffic", true) !== false; } catch (e) { return true; }
}
function setTrafficWanted(on) {
  try { Store.setLocal("mapTraffic", !!on); } catch (e) {}
  TRAFFIC.dead = false; TRAFFIC.fails = 0;
  syncTrafficUi();
  try { MAP._trafKey = null; renderMap(true); } catch (e2) {}
}
function trafficUrl(z, x, y) {
  return TRAFFIC_URL + "/" + z + "/" + x + "/" + y + ".png";
}
function syncTrafficUi() {
  var on = trafficWanted() && !TRAFFIC.dead;
  var chip = document.getElementById("mapTrafChip");
  var ui = document.getElementById("mapTrafUi");
  var leg = document.getElementById("mapTrafLeg");
  if (chip) {
    chip.classList.toggle("on", trafficWanted());
    chip.setAttribute("aria-pressed", trafficWanted() ? "true" : "false");
  }
  if (ui) ui.classList.toggle("is-off", !trafficWanted());
  if (leg) leg.hidden = !trafficWanted();
}
function hideTrafficLayerQuiet() {
  var host = document.getElementById("mapTraffic");
  if (host) { host.hidden = true; host.setAttribute("aria-hidden", "true"); host.innerHTML = ""; }
  TRAFFIC.dead = true;
}
function renderTrafficTiles(needed, z) {
  var host = document.getElementById("mapTraffic");
  if (!host) return;
  var show = trafficWanted() && !TRAFFIC.dead && z >= 6 && z <= 18 && navigator.onLine !== false;
  if (!show) {
    host.hidden = true; host.setAttribute("aria-hidden", "true");
    if (!trafficWanted() || z < 6 || z > 18) { try { host.innerHTML = ""; } catch (e) {} }
    return;
  }
  host.hidden = false; host.setAttribute("aria-hidden", "false");
  var existing = {};
  Array.prototype.forEach.call(host.querySelectorAll("img[data-tid]"), function (img) {
    existing[img.getAttribute("data-tid")] = img;
  });
  Object.keys(needed).forEach(function (id) {
    var info = needed[id];
    var img = existing[id];
    if (!img) {
      img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.setAttribute("data-tid", id);
      img.className = "map-traf-tile";
      img.loading = "eager";
      img.referrerPolicy = "origin";
      /* CORS so SW can cache on zapwiseai.com; worker allows that Origin */
      img.crossOrigin = "anonymous";
      img.onload = function () {
        img.classList.add("on");
        TRAFFIC.fails = 0; TRAFFIC.lastOk = Date.now(); TRAFFIC.dead = false;
      };
      img.onerror = function () {
        /* quiet: hide broken tile; if many fail, drop the whole layer */
        try { img.remove(); } catch (e0) {}
        TRAFFIC.fails++;
        if (TRAFFIC.fails >= 6) hideTrafficLayerQuiet();
      };
      img.src = trafficUrl(info.z, info.x, info.y);
      if (img.complete && img.naturalWidth) img.classList.add("on");
      host.appendChild(img);
    } else {
      delete existing[id];
    }
    img.style.transform = "translate(" + info.left + "px," + info.top + "px)";
  });
  Object.keys(existing).forEach(function (id) {
    try { existing[id].remove(); } catch (e) {}
  });
}

function metersToPixels(m, lat, z) {
  // Web Mercator: meters per pixel at equator ~ 156543.03 / 2^z ; adjust by cos(lat)
  var mpp = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);
  return mpp > 0 ? (m / mpp) : 0;
}
function ensureMapOverlay(v) {
  // Geo layers live inside #mapMarkers (map pane) so they share tile coordinates and never stick to the viewport.
  var stage = v.querySelector("#mapStage") || v;
  var host = v.querySelector("#mapMarkers");
  if (!host) {
    host = document.createElement("div");
    host.id = "mapMarkers";
    host.className = "map-markers";
    host.setAttribute("aria-hidden", "true");
    stage.appendChild(host);
  }
  function ensure(cls, beforeDot) {
    var el = host.querySelector("." + cls) || v.querySelector("." + cls);
    if (!el) {
      el = document.createElement("i");
      el.className = cls;
      el.setAttribute("aria-hidden", "true");
    }
    if (el.parentNode !== host) {
      var dot = host.querySelector("#mapDot") || $("#mapDot");
      if (beforeDot && dot && dot.parentNode === host) host.insertBefore(el, dot);
      else host.appendChild(el);
    }
    return el;
  }
  var acc = ensure("map-acc", true);
  var radar = ensure("map-radar", true);
  var head = ensure("map-heading", true);
  var holo = ensure("map-holo", true);
  if (head.getAttribute("data-init") !== "1") { head.hidden = true; head.setAttribute("data-init", "1"); }
  var dot = $("#mapDot");
  if (dot && dot.parentNode !== host) host.appendChild(dot);
  return { host: host, acc: acc, radar: radar, head: head, holo: holo };
}
function placeUserLayers(v, W, H, ox, oy, z) {
  var layers = ensureMapOverlay(v);
  var gw = lonLatToWorld(GPS.lon, GPS.lat, z);
  var dx = gw.x - ox, dy = gw.y - oy;
  function put(el, x, y) {
    if (!el) return;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.transform = "translate(-50%, -50%)";
  }
  var dot = $("#mapDot");
  if (dot) {
    dot.hidden = false;
    put(dot, dx, dy);
    dot.style.marginLeft = "0";
    dot.style.marginTop = "0";
    dot.classList.toggle("follow", !!MAP.follow);
  }
  put(layers.radar, dx, dy);
  put(layers.acc, dx, dy);
  put(layers.head, dx, dy);
  put(layers.holo, dx, dy); if (layers.holo) layers.holo.hidden = false;
  // accuracy circle (v4.9.5: small, tidy)
  if (layers.acc) {
    var accM = (GPS.acc != null && GPS.acc > 0) ? GPS.acc : 25;
    var px = Math.max(12, Math.min(44, metersToPixels(accM, GPS.lat, z)));
    layers.acc.style.width = px * 2 + "px";
    layers.acc.style.height = px * 2 + "px";
  }
  if (layers.head) {
    var hd = currentHeading();
    if (hd != null) {
      layers.head.hidden = false;
      layers.head.style.transform = "translate(-50%, -50%) rotate(" + Math.round(hd) + "deg)";
    } else layers.head.hidden = true;
  }
  try {
    ensureMapNeon(v);
    placeNeonRing(v, dx, dy);
    $$(".map-place-pin", v).forEach(function (pin) { pin.classList.add("neon-lit"); });
  } catch (e) {}
}
function mapViewLL() {
  /* Center map without requiring a live GPS fix: GPS → last gpsLoc → city LOC → SF default */
  if (GPS && GPS.lat != null && GPS.lon != null) return { lat: +GPS.lat, lon: +GPS.lon, src: "gps" };
  try {
    var last = Store.getLocal("gpsLoc", null);
    if (last && last.lat != null && last.lon != null) return { lat: +last.lat, lon: +last.lon, src: "last" };
  } catch (e) {}
  if (LOC && LOC.lat != null && LOC.lon != null) return { lat: +LOC.lat, lon: +LOC.lon, src: "city" };
  if (PLACE && PLACE.lat != null && PLACE.lon != null) return { lat: +PLACE.lat, lon: +PLACE.lon, src: "place" };
  return { lat: 37.7749, lon: -122.4194, src: "default" };
}
function renderMap(force) {
  renderPlace();
  var v = $("#mapV"), tl = $("#mapTiles"), msg = $("#mapMsg");
  if (!v || !tl) return;
  try { ensureMapNeon(v); } catch (e) {}
  var view = mapViewLL();
  /* v4.9.4: when the user has panned/searched, keep the view anchored — GPS updates move only the dot */
  if (MAP.follow || !MAP.anchor) MAP.anchor = { lat: view.lat, lon: view.lon };
  else view = { lat: MAP.anchor.lat, lon: MAP.anchor.lon, src: view.src };
  var liveGps = !!(GPS && GPS.lat != null);
  if (!liveGps) {
    if ($("#mapDot")) $("#mapDot").hidden = true;
    $$(".map-holo,.map-heading", v).forEach(function (x) { x.hidden = true; });
    var rad0 = v.querySelector(".map-radar"); if (rad0) rad0.style.opacity = "0";
    if (msg) {
      msg.hidden = false;
      msg.textContent = GEO_OFF ? (view.src === "default" ? "LOCATION OFF · DEFAULT AREA (NOT YOU) · SET A CITY" : "LOCATION OFF · SHOWING YOUR CITY / LAST MAP") : (navigator.geolocation ? (view.src === "default" ? "FINDING YOU… · DEFAULT AREA FOR NOW" : "FINDING YOU… · SHOWING SAVED / CITY MAP") : "GPS NOT AVAILABLE ON THIS DEVICE");
    }
  }
  var W = v.clientWidth, H = v.clientHeight; if (!W || !H) return;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  var world = lonLatToWorld(view.lon, view.lat, z);
  var cx = world.x + MAP.offX, cy = world.y + MAP.offY;
  var ox = cx - W / 2, oy = cy - H / 2;
  var key = z + ":" + Math.round(ox) + ":" + Math.round(oy) + ":" + W + "x" + H + ":" + (MAP.follow ? "F" : "P");
  // Always update user layers even if tiles unchanged
  if (liveGps) {
    placeUserLayers(v, W, H, ox, oy, z);
    if (msg) msg.hidden = true;
    var rad = v.querySelector(".map-radar"); if (rad) rad.style.opacity = "1";
  }
  if (msg && navigator.onLine === false) { msg.hidden = false; msg.textContent = "OFFLINE · MAP WILL REFRESH WHEN BACK ONLINE"; }

  var map3dLive = false;
  try { map3dLive = !!(window.ZAPFX3D && window.ZAPFX3D.mapReady()); } catch (e) {}
  if (map3dLive) {
    try { window.ZAPFX3D.syncMap({ lat: view.lat, lon: view.lon, z: z, follow: MAP.follow && liveGps, snap: !!force && !!MAP.follow && liveGps }); } catch (e) {}
    try { hideTrafficLayerQuiet(); TRAFFIC.dead = false; } catch (e3d) {}
  }
  if (!map3dLive && !force && MAP._key === key) {
    // tiles unchanged — still refresh traffic transforms
    try {
      if (trafficWanted() && !TRAFFIC.dead && z >= 6 && z <= 18) {
        var n2 = Math.pow(2, z), x0b = Math.floor(ox / 256) - 1, x1b = Math.floor((ox + W) / 256) + 1;
        var y0b = Math.floor(oy / 256) - 1, y1b = Math.floor((oy + H) / 256) + 1, need2 = {};
        for (var tyb = y0b; tyb <= y1b; tyb++) {
          if (tyb < 0 || tyb >= n2) continue;
          for (var txb = x0b; txb <= x1b; txb++) {
            var xxb = ((txb % n2) + n2) % n2;
            var idb = z + "/" + xxb + "/" + tyb;
            need2[idb] = { z: z, x: xxb, y: tyb, left: Math.round(txb * 256 - ox), top: Math.round(tyb * 256 - oy) };
          }
        }
        renderTrafficTiles(need2, z);
      } else {
        renderTrafficTiles({}, z);
      }
    } catch (eT0) { try { hideTrafficLayerQuiet(); } catch (eT01) {} }
  } else if (!map3dLive) {
    MAP._key = key;
    var n = world.n;
    var x0 = Math.floor(ox / 256) - 1, x1 = Math.floor((ox + W) / 256) + 1;
    var y0 = Math.floor(oy / 256) - 1, y1 = Math.floor((oy + H) / 256) + 1;
    var needed = {};
    for (var ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (var tx = x0; tx <= x1; tx++) {
        var xx = ((tx % n) + n) % n;
        var id = z + "/" + xx + "/" + ty;
        needed[id] = { z: z, x: xx, y: ty, left: Math.round(tx * 256 - ox), top: Math.round(ty * 256 - oy) };
      }
    }
    // Reuse existing imgs — no blank flash
    var existing = {};
    Array.prototype.forEach.call(tl.querySelectorAll("img[data-tid]"), function (img) {
      existing[img.getAttribute("data-tid")] = img;
    });
    Object.keys(needed).forEach(function (id) {
      var info = needed[id];
      var img = existing[id];
      if (!img) {
        img = document.createElement("img");
        img.alt = "";
        img.decoding = "async";
        img.draggable = false;
        img.setAttribute("data-tid", id);
        img.className = "map-tile";
        img.loading = "eager";
        img.style.background = "#f2efe8"; /* inverts to dark — no gray unload flash */
        img.onload = function () { img.classList.add("on"); };
        img.crossOrigin = "anonymous"; /* CORS tiles can be cached by the service worker (works offline) */
        img.onerror = function () {
          /* v4.9.5: one quiet retry, then the backup tile server, then the dark base (never a gray hole) */
          if (!img._retry && navigator.onLine !== false) {
            img._retry = 1;
            setTimeout(function () { if (img.isConnected) img.src = tileUrl(info.z, info.x, info.y) + "?r=1"; }, 1200);
            return;
          }
          if (img._retry === 1 && navigator.onLine !== false) {
            img._retry = 2;
            setTimeout(function () { if (img.isConnected) img.src = tileUrlFallback(info.z, info.x, info.y); }, 300);
            return;
          }
          img.classList.add("err"); img.style.opacity = "0";
        };
        img.src = tileUrl(info.z, info.x, info.y);
        // if cached by browser it may already be complete
        if (img.complete && img.naturalWidth) img.classList.add("on");
        tl.appendChild(img);
      } else {
        delete existing[id];
      }
      img.style.transform = "translate(" + info.left + "px," + info.top + "px)";
    });
    // Remove tiles no longer in view (keep a small grace by not removing off-by-one — already padded)
    Object.keys(existing).forEach(function (id) {
      try { existing[id].remove(); } catch (e) {}
    });
    try { renderTrafficTiles(needed, z); } catch (eT) { try { hideTrafficLayerQuiet(); } catch (eT2) {} }
  }
  // Saved place pins
  var pinHost = v.querySelector(".map-pins");
  if (!pinHost) { pinHost = document.createElement("div"); pinHost.className = "map-pins"; pinHost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5"; v.appendChild(pinHost); }
  var places = loadPlaces();
  if (MAP.search) places = places.concat([MAP.search]);
  var pinHtml = places.map(function (pl) {
    if (pl.lat == null) return "";
    var pw = lonLatToWorld(pl.lon, pl.lat, z);
    var px = pw.x - ox, py = pw.y - oy;
    if (px < -48 || py < -48 || px > W + 48 || py > H + 48) return "";
    return '<button type="button" class="map-place-pin neon-lit' + (pl.id === "__search" ? " is-search" : "") + '" data-place-go="' + esc(pl.id) + '" aria-label="' + esc(pl.name) + ' — tap for directions, hold to edit" style="left:' + Math.round(px) + "px;top:" + Math.round(py) + 'px;pointer-events:auto"><span class="pin-dot" style="background:' + (pl.color || "#5dade2") + '">' + (pl.icon || "📍") + '</span><span class="pin-lab">' + esc(pl.name) + "</span></button>";
  }).join("");
  /* v4.9.4: only rebuild pins when they change — a GPS tick mid-tap used to swap the button and eat the tap */
  if (pinHost._html !== pinHtml) { pinHost.innerHTML = pinHtml; pinHost._html = pinHtml; }
  bindMapPins(pinHost);
  // Recenter: visible only after pan/pinch breaks follow; tap re-enables follow
  var rec = $("#mapRec");
  if (rec) {
    rec.hidden = !!MAP.follow;
    rec.classList.toggle("on", !MAP.follow);
    rec.setAttribute("aria-label", MAP.follow ? "Following your location" : "Recenter on me");
  }
}
function findMapPlace(id) {
  if (MAP.search && id === "__search") return MAP.search;
  return loadPlaces().filter(function (x) { return x.id === id; })[0] || null;
}
function bindMapPins(host) {
  if (!host || host._zapPins) return; host._zapPins = true;
  var holdT = null, held = false, sx = 0, sy = 0;
  function clear() { clearTimeout(holdT); holdT = null; }
  host.addEventListener("pointerdown", function (e) {
    var g = e.target.closest("[data-place-go]"); if (!g) return;
    held = false; clear(); sx = e.clientX; sy = e.clientY;
    var id = g.getAttribute("data-place-go");
    if (id === "__search") return;
    holdT = setTimeout(function () {
      held = true;
      var pl = findMapPlace(id);
      if (pl) { try { hideMapPlaceCard(); } catch (e0) {} openEditPlace(pl); }
      try { navigator.vibrate && navigator.vibrate(30); } catch (err) {}
    }, 550);
  });
  host.addEventListener("pointermove", function (e) { if (holdT && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) clear(); });
  host.addEventListener("pointerup", clear);
  host.addEventListener("pointercancel", clear);
  host.addEventListener("contextmenu", function (e) { if (e.target.closest("[data-place-go]")) e.preventDefault(); });
  host.addEventListener("click", function (e) {
    var g = e.target.closest("[data-place-go]"); if (!g) return;
    e.stopPropagation();
    if (held) { held = false; return; }
    var pl = findMapPlace(g.getAttribute("data-place-go"));
    if (pl) showMapPlaceCard(pl);
  });
}
function mapShowSearchResult(r) {
  var lat = +r.lat, lon = +r.lon; if (isNaN(lat) || isNaN(lon)) return;
  var nm = (r.name || (r.display_name || "").split(",")[0] || "Place").slice(0, 24);
  MAP.search = { id: "__search", name: nm, label: r.display_name || nm, icon: "📍", color: "#ff2a6d", lat: lat, lon: lon };
  MAP.follow = false; MAP.anchor = { lat: lat, lon: lon }; MAP.offX = 0; MAP.offY = 0; MAP.z = 16; MAP._key = null;
  var origin = (GPS && GPS.lat != null) ? GPS : null;
  if (origin) {
    PLACE_ETA.__search = { km: haversineKm(origin, { lat: lat, lon: lon }), sec: null };
    getJSON("https://router.project-osrm.org/route/v1/driving/" + origin.lon + "," + origin.lat + ";" + lon + "," + lat + "?overview=false", 8000).then(function (j) {
      var rt = j && j.routes && j.routes[0];
      if (rt) PLACE_ETA.__search = { km: (rt.distance || 0) / 1000, sec: rt.duration };
      if (_mapCardPl && _mapCardPl.id === "__search") showMapPlaceCard(MAP.search);
    }).catch(function () {});
  } else delete PLACE_ETA.__search;
  renderMap(true);
  showMapPlaceCard(MAP.search);
}
function ensureMapSearch(card) {
  var box = $("#mapSearch");
  if (box) return box;
  box = document.createElement("div");
  box.id = "mapSearch"; box.className = "map-search";
  box.innerHTML = '<input id="mapQ" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search a place or address" aria-label="Search places"><div id="mapQRes" class="map-q-res" hidden></div>';
  var head = card.querySelector(".map-h");
  if (head && head.nextSibling) card.insertBefore(box, head.nextSibling); else card.appendChild(box);
  var inp = box.querySelector("#mapQ"), res = box.querySelector("#mapQRes"), tm = null, seq = 0;
  function run(q) {
    var my = ++seq;
    if (navigator.onLine === false) { res.hidden = false; res.innerHTML = '<p class="note">Offline — search needs a connection.</p>'; return; }
    var c = MAP.anchor || mapViewLL(), vb = "";
    if (c && c.lat != null) vb = "&viewbox=" + (c.lon - 1.5) + "," + (c.lat + 1) + "," + (c.lon + 1.5) + "," + (c.lat - 1);
    res.hidden = false; res.innerHTML = '<p class="note">Searching…</p>';
    nomJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=en" + vb + "&q=" + encodeURIComponent(q), 10000).then(function (R) {
      if (my !== seq) return;
      R = R || [];
      res.innerHTML = R.length ? R.map(function (r, i) {
        return '<button type="button" class="res" data-mq="' + i + '">' + esc(r.display_name) + '</button>';
      }).join("") : '<p class="note">No matches — try a street and city.</p>';
      $$("[data-mq]", res).forEach(function (x) {
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          var r = R[+x.getAttribute("data-mq")];
          res.hidden = true; res.innerHTML = ""; inp.value = ""; try { inp.blur(); } catch (eB) {}
          mapShowSearchResult(r);
        });
      });
    }).catch(function () { if (my === seq) res.innerHTML = '<p class="note">Search unavailable — try again.</p>'; });
  }
  inp.addEventListener("input", function () {
    clearTimeout(tm); var q = inp.value.trim();
    if (q.length < 3) { res.hidden = true; res.innerHTML = ""; return; }
    tm = setTimeout(function () { run(q); }, 450);
  });
  inp.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); clearTimeout(tm); var q = inp.value.trim(); if (q.length >= 2) run(q); }
  });
  return box;
}
function showMapFollowBadge() {
  var b = $("#mapFollowBadge");
  if (!b) {
    var tools = document.querySelector("#mapV .map-tools");
    if (!tools) return;
    b = document.createElement("span");
    b.id = "mapFollowBadge";
    b.className = "map-follow-badge";
    b.setAttribute("role", "status");
    b.textContent = "Following you";
    tools.appendChild(b);
  }
  b.hidden = false;
  b.classList.add("on");
  clearTimeout(showMapFollowBadge._t);
  showMapFollowBadge._t = setTimeout(function () {
    b.classList.remove("on");
    b.hidden = true;
  }, 1600);
}
function mapRecenter() {
  if (GEO_OFF && !(GPS && GPS.lat != null)) { try { toast("Location is off — allow it for this site in Settings"); } catch (eT) {} }
  MAP.search = null;
  MAP.follow = true; MAP.offX = 0; MAP.offY = 0; MAP.z = 16; MAP._key = null;
  var rec = $("#mapRec"); if (rec) { rec.hidden = true; rec.classList.remove("on"); }
  renderMap(true);
  showMapFollowBadge();
  try { startGpsWatch(); } catch (e) {}
}
function mapZoom(d) {
  var next = Math.max(3, Math.min(19, (MAP.z | 0) + d));
  if (next === MAP.z) return;
  var f = Math.pow(2, next - MAP.z);
  MAP.offX *= f; MAP.offY *= f; MAP.z = next; MAP._key = null; renderMap(true);
}
(function bindMapGestures() {
  /* v4.3: one-finger page scroll passes through; pan with 2 fingers or after tap-to-arm */
  var v = $("#mapV"); if (!v) return;
  var startX = 0, startY = 0, baseOffX = 0, baseOffY = 0, pin0 = null;
  var armed = false, armTimer = null, downOnMap = false, isTouch = false;
  function setArmed(on) {
    armed = !!on;
    v.classList.toggle("map-armed", armed);
    clearTimeout(armTimer);
    if (armed) armTimer = setTimeout(function () { setArmed(false); }, 12000);
  }
  function pt(e) { var t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
  function canPan(e) {
    if (e.pointerType === "mouse" || (e.type && e.type.indexOf("mouse") === 0)) return true;
    if (e.touches && e.touches.length >= 2) return true;
    return armed;
  }
  function onDown(e) {
    if (e.target.closest(".map-tool,.map-attr,.map-open,.map-place-pin,.map-place-card,.mpc-go,.mpc-x")) return;
    isTouch = !!(e.touches || e.pointerType === "touch");
    downOnMap = true; MAP.moved = false;
    var p = pt(e); startX = p.x; startY = p.y; baseOffX = MAP.offX; baseOffY = MAP.offY;
    if (e.touches && e.touches.length === 2) {
      var a = e.touches[0], b = e.touches[1];
      pin0 = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: MAP.z };
      MAP.dragging = true;
    } else {
      pin0 = null;
      /* only claim drag when armed or mouse — otherwise let the page scroll */
      MAP.dragging = canPan(e);
    }
  }
  function onMove(e) {
    if (!downOnMap) return;
    if (e.touches && e.touches.length === 2) {
      if (!pin0) {
        var a0 = e.touches[0], b0 = e.touches[1];
        pin0 = { dist: Math.hypot(a0.clientX - b0.clientX, a0.clientY - b0.clientY), z: MAP.z };
      }
      MAP.dragging = true;
      if (e.cancelable) e.preventDefault();
      var a = e.touches[0], b = e.touches[1];
      var dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      var dz = Math.round(Math.log2(dist / Math.max(1, pin0.dist)));
      var nz = Math.max(3, Math.min(19, pin0.z + dz));
      if (nz !== MAP.z) { var f = Math.pow(2, nz - MAP.z); MAP.offX *= f; MAP.offY *= f; MAP.z = nz; pin0.dist = dist; pin0.z = nz; MAP._key = null; renderMap(true); }
      MAP.moved = true; MAP.follow = false; return;
    }
    var p = pt(e);
    var dx = p.x - startX, dy = p.y - startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) MAP.moved = true;
    if (!MAP.dragging) return; /* one-finger unarmed: do NOT preventDefault — page scrolls */
    if (MAP.moved) {
      if (e.cancelable) e.preventDefault();
      MAP.follow = false;
      try { hideMapPlaceCard(); } catch (err) {}
      MAP.offX = baseOffX - dx; MAP.offY = baseOffY - dy; renderMap(true);
    }
  }
  function onUp(e) {
    if (downOnMap && !MAP.moved && isTouch && !(e.touches && e.touches.length)) {
      /* tap arms map for one-finger pan */
      setArmed(!armed);
      if (armed) try { toast("Map pan on · tap again to scroll page"); } catch (err) {}
    }
    MAP.dragging = false; pin0 = null; downOnMap = false;
  }
  v.addEventListener("pointerdown", onDown);
  v.addEventListener("pointermove", onMove, { passive: false });
  v.addEventListener("pointerup", onUp);
  v.addEventListener("pointercancel", onUp);
  v.addEventListener("touchstart", onDown, { passive: true });
  v.addEventListener("touchmove", onMove, { passive: false });
  v.addEventListener("touchend", onUp);
  v.addEventListener("touchcancel", onUp);
  /* wheel zoom only when armed or with ctrl/meta — else let page scroll */
  v.addEventListener("wheel", function (e) {
    if (!(armed || e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    mapZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  document.addEventListener("pointerdown", function (e) {
    if (armed && !v.contains(e.target)) setArmed(false);
  }, { capture: true, passive: true });
})();
window.addEventListener("online", function () { MAP._key = null; renderMap(true); });
function refreshGPS() { try { startGpsWatch(); } catch (e) { getPos().catch(function () {}); } }
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") stopGpsWatch();
  else { startGpsWatch(); try { renderMap(true); } catch (e) {} }
});
function worldToLonLat(x, y, z) {
  var n = Math.pow(2, z), lon = x / (n * 256) * 360 - 180;
  var m = Math.PI - 2 * Math.PI * y / (n * 256);
  var lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(m) - Math.exp(-m)));
  return { lat: lat, lon: lon };
}
function mapCenterLL() {
  var c0 = MAP.anchor || (GPS && GPS.lat != null ? GPS : null);
  if (!c0) return null;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  var world = lonLatToWorld(c0.lon, c0.lat, z);
  return worldToLonLat(world.x + MAP.offX, world.y + MAP.offY, z);
}
function closeMapOverlay() {
  var card = $("#hMap");
  if (!card) return;
  var wasOpen = card.classList.contains("map-fs");
  try { hideMapPlaceCard(); } catch (eH) {}
  var qr = $("#mapQRes"); if (qr) { qr.hidden = true; qr.innerHTML = ""; }
  var qi = $("#mapQ"); if (qi) { try { qi.blur(); } catch (eB) {} }
  card.classList.remove("map-fs");
  document.documentElement.classList.remove("map-fs-open");
  var xb = $("#mapFsClose"); if (xb) xb.hidden = true;
  var ext = $("#mapFsExt"); if (ext) ext.hidden = true;
  MAP._key = null;
  try { renderMap(true); } catch (e) {}
  try { portalHome(card); } catch (eP) {}
  var ph = $("#mapPh"); if (ph) ph.remove();
  try { unlockPageScroll(); } catch (eU) {}
  if (wasOpen) { try { overlayClearHistory(); } catch (eHi) {} }
  try { armTapShield(450); } catch (e2) {}
}
function openMapOverlay() {
  var card = $("#hMap"); if (!card) return;
  if (card.classList.contains("map-fs")) return;
  /* v4.9.4: hold the card's space in the page so opening/closing never shifts or jumps the scroll */
  if (!$("#mapPh") && card.parentNode && card.parentNode !== document.body) {
    var ph = document.createElement("div"), cs = getComputedStyle(card);
    ph.id = "mapPh"; ph.className = "map-ph"; ph.setAttribute("aria-hidden", "true");
    ph.style.height = card.offsetHeight + "px"; ph.style.marginTop = cs.marginTop; ph.style.marginBottom = cs.marginBottom;
    card.parentNode.insertBefore(ph, card);
  }
  try { portalToBody(card); } catch (eP) {}
  card.classList.add("map-fs");
  try { ensureMapSearch(card); } catch (eS) {}
  document.documentElement.classList.add("map-fs-open");
  lockPageScroll();
  crispifyOverlay(card);
  var head = card.querySelector(".map-h-r");
  var xb = $("#mapFsClose");
  if (!xb && head) {
    xb = document.createElement("button");
    xb.type = "button"; xb.id = "mapFsClose"; xb.className = "map-open map-fs-close";
    xb.setAttribute("aria-label", "Close map"); xb.textContent = "CLOSE";
    head.appendChild(xb);
    xb.addEventListener("click", function (e) { e.stopPropagation(); closeMapOverlay(); });
  }
  if (xb) xb.hidden = false;
  var ext = $("#mapFsExt");
  if (!ext && head) {
    ext = document.createElement("button");
    ext.type = "button"; ext.id = "mapFsExt"; ext.className = "map-open map-fs-ext";
    ext.setAttribute("aria-label", "Open in Apple Maps"); ext.textContent = "MAPS";
    head.appendChild(ext);
    ext.addEventListener("click", function (e) {
      e.stopPropagation();
      openMapsExternal();
    });
  }
  if (ext) ext.hidden = false;
  MAP._key = null;
  try { renderMap(true); } catch (e) {}
  try { overlayPushHistory(); } catch (eHi) {}
  try { startCompass(true); } catch (eC) {}
  /* v4.6.1: no scrollIntoView — it was shifting layout and letting ghost clicks hit Weather/Music */
}
function openMapsExternal() {
  var c = mapCenterLL();
  if (!c) { toast(GEO_OFF ? "Turn on Location for this app to see where you are" : "Still finding you…"); return; }
  var ll = (+c.lat).toFixed(6) + "," + (+c.lon).toFixed(6);
  var q = (PLACE && (PLACE.road || PLACE.city)) ? [PLACE.road, PLACE.city].filter(Boolean).join(", ") : ll;
  if (IOS) {
    var mapsUrl = "maps://?ll=" + ll + "&q=" + encodeURIComponent(q);
    var web = "https://maps.apple.com/?ll=" + ll + "&q=" + encodeURIComponent(q);
    try {
      var a = document.createElement("a");
      a.href = mapsUrl; a.rel = "noopener"; a.style.cssText = "position:fixed;left:-9999px;opacity:0";
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { a.remove(); } catch (e0) {} }, 0);
    } catch (e) {}
    setTimeout(function () {
      if (document.visibilityState === "visible") go(web);
    }, 900);
    return;
  }
  openApp({ id: "maps", mapsHere: true, ll: ll, q: q, name: "Maps" });
}
function openMapsHere() {
  // v4.4.1/v4.5: in-page large map — never navigate the standalone PWA away
  if (document.documentElement.classList.contains("map-fs-open")) { closeMapOverlay(); return; }
  openMapOverlay();
}
(function bindMapOpenExclusive() {
  /* v4.9.4: ONE toggle per tap. It used to toggle on pointerdown+pointerup+touchend+click
     (open→close→open→close), so OPEN looked dead and the page jumped. */
  var mapOpen = $("#mapOpen"); if (!mapOpen) return;
  var lastAct = 0, sx = 0, sy = 0, moved = false;
  function swallow(e) { try { e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (err) {} }
  function act() {
    var now = Date.now();
    if (now - lastAct < 700) return;
    lastAct = now;
    openMapsHere();
  }
  mapOpen.addEventListener("touchstart", function (e) {
    swallow(e); moved = false; var t = e.touches && e.touches[0]; if (t) { sx = t.clientX; sy = t.clientY; }
  }, { capture: true, passive: true });
  mapOpen.addEventListener("touchmove", function (e) {
    var t = e.touches && e.touches[0]; if (t && Math.abs(t.clientX - sx) + Math.abs(t.clientY - sy) > 10) moved = true;
  }, { capture: true, passive: true });
  mapOpen.addEventListener("pointerdown", swallow, { capture: true });
  mapOpen.addEventListener("pointerup", swallow, { capture: true });
  mapOpen.addEventListener("touchend", function (e) {
    swallow(e);
    if (moved) return;
    try { e.preventDefault(); } catch (err) {} /* kill the compat click so it cannot toggle again */
    act();
  }, { capture: true, passive: false });
  mapOpen.addEventListener("click", function (e) {
    swallow(e); try { e.preventDefault(); } catch (err) {}
    act();
  }, { capture: true });
})();
document.addEventListener("keydown", function (e) {
  /* v4.9.5: Escape on the map is handled by the global one-layer-at-a-time handler (dismissTopOverlay) */
  return;
});
var mapIn = $("#mapIn"); if (mapIn) mapIn.addEventListener("click", function (e) { e.stopPropagation(); mapZoom(1); });
var mapOut = $("#mapOut"); if (mapOut) mapOut.addEventListener("click", function (e) { e.stopPropagation(); mapZoom(-1); });
var mapRec = $("#mapRec"); if (mapRec) mapRec.addEventListener("click", function (e) { e.stopPropagation(); try { startCompass(true); } catch (eC) {} mapRecenter(); });
(function () {
  var chip = document.getElementById("mapTrafChip");
  if (!chip || chip._trafBound) return;
  chip._trafBound = true;
  syncTrafficUi();
  chip.addEventListener("click", function (e) {
    e.stopPropagation(); e.preventDefault();
    setTrafficWanted(!trafficWanted());
  });
})();
// avoid opening Maps when the user just panned
$("#hMap").addEventListener("click", function (e) {
  if (e.target.closest(".map-tool,.map-attr,.map-open,.map-v,.map-fs-close,.map-fs-ext,.map-place-card,.map-place-pin")) return;
  if (document.documentElement.classList.contains("map-fs-open")) return;
  openMapOverlay();
});
window.addEventListener("resize", function () { clearTimeout(renderMap.t); renderMap.t = setTimeout(function () { MAP._key = null; renderMap(true); }, 150); });

// ----- tabs -----

// ========== 10b. Saved Places (Home / Work / School / custom) ==========
// v4.9.7: live traffic colors via zapwise-traffic worker (TomTom flow raster). ETA remains an estimate.
var PLACE_PRESETS = [
  { id: "home", name: "Home", icon: "🏠", color: "#5dade2" },
  { id: "work", name: "Work", icon: "💼", color: "#a0785a" },
  { id: "school", name: "School", icon: "🎓", color: "#c4a574" }
];
function loadPlaces() {
  var p = Store.get("places", null);
  if (!Array.isArray(p)) p = [];
  return p;
}
function savePlaces(list) { Store.set("places", list); }
function haversineKm(a, b) {
  var R = 6371, toR = Math.PI / 180;
  var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  var la1 = a.lat * toR, la2 = b.lat * toR;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function formatEta(sec, km) {
  if (sec != null && !isNaN(sec)) {
    var m = Math.round(sec / 60);
    if (m < 1) return "Close by";
    if (m < 60) return m + " min";
    return Math.floor(m / 60) + " hr " + (m % 60) + " min";
  }
  if (km != null) {
    if (km < 0.3) return "Close by";
    var mi = km * 0.621371;
    return (S.units === "C" ? (km < 10 ? km.toFixed(1) + " km" : Math.round(km) + " km") : (mi < 10 ? mi.toFixed(1) + " mi" : Math.round(mi) + " mi"));
  }
  return "—";
}
var PLACE_ETA = {};
function refreshPlaceEtas() {
  var list = loadPlaces(); if (!list.length) { renderPlacesRow(); return; }
  var origin = (GPS && GPS.lat != null) ? GPS : null;
  if (!origin) { try { origin = Store.getLocal("gpsLoc", null); } catch (e) {} }
  if (!origin || origin.lat == null) {
    if (LOC && LOC.lat != null) origin = { lat: LOC.lat, lon: LOC.lon };
  }
  if (!origin || origin.lat == null) { renderPlacesRow(); return; }
  list.forEach(function (pl) {
    if (pl.lat == null) return;
    var km = haversineKm(origin, { lat: pl.lat, lon: pl.lon });
    PLACE_ETA[pl.id] = { km: km, sec: null };
    // OSRM public demo — light use only
    var url = "https://router.project-osrm.org/route/v1/driving/" + origin.lon + "," + origin.lat + ";" + pl.lon + "," + pl.lat + "?overview=false";
    getJSON(url, 8000).then(function (j) {
      var r = j && j.routes && j.routes[0];
      if (r) PLACE_ETA[pl.id] = { km: (r.distance || 0) / 1000, sec: r.duration };
      renderPlacesRow();
      renderMap(true);
    }).catch(function () { renderPlacesRow(); });
  });
  renderPlacesRow();
}
function renderPlacesRow() {
  var host = $("#placesList"); if (!host) return;
  var list = loadPlaces();
  var row = $("#placesRow"); if (row) row.classList.toggle("has-places", list.length > 0);
  if (!list.length) {
    host.innerHTML = PLACE_PRESETS.map(function (p) {
      return '<button type="button" class="place-chip" data-place-new="' + p.id + '" role="listitem"><span class="pc-ico" style="background:' + p.color + '">' + p.icon + '</span><span class="pc-name">' + esc(p.name) + '</span><span class="pc-eta">Set up</span></button>';
    }).join(""); /* v4.9.5: one Add button (＋ ADD in the header) */
    return;
  }
  /* sticky nearest first */
  list = list.slice().sort(function (a, b) {
    var ea = PLACE_ETA[a.id], eb = PLACE_ETA[b.id];
    var ka = ea && ea.km != null ? ea.km : 1e9, kb = eb && eb.km != null ? eb.km : 1e9;
    return ka - kb;
  });
  host.innerHTML = list.map(function (pl, i) {
    var eta = PLACE_ETA[pl.id];
    var sub = eta ? formatEta(eta.sec, eta.km) : "…";
    if (eta && eta.sec != null && /min/.test(sub)) sub = "~" + sub; /* estimate — traffic colors are live, ETA is not */
    if (i === 0 && eta) sub = "GO · " + sub;
    var col = pl.color || "#5dade2";
    return '<button type="button" class="place-chip' + (i === 0 ? " nearest" : "") + '" data-place-go="' + esc(pl.id) + '" role="listitem"><span class="pc-ico" style="background:' + col + '">' + (pl.icon || "📍") + '</span><span class="pc-name">' + esc(pl.name) + '</span><span class="pc-eta">' + esc(sub) + "</span></button>";
  }).join(""); /* v4.9.5: one Add button (＋ ADD in the header) */
}
function placeLL(pl) {
  if (!pl) return null;
  var lat = pl.lat != null ? +pl.lat : (pl.latitude != null ? +pl.latitude : null);
  var lon = pl.lon != null ? +pl.lon : (pl.lng != null ? +pl.lng : (pl.longitude != null ? +pl.longitude : null));
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;
  return { lat: lat, lon: lon };
}
function openDirectionsTo(pl) {
  var llObj = placeLL(pl);
  if (!llObj) { toast("This place needs coordinates — long-press to edit"); return; }
  var ll = llObj.lat.toFixed(6) + "," + llObj.lon.toFixed(6);
  var gDir = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ll) + "&travelmode=driving";
  var apple = "https://maps.apple.com/?daddr=" + encodeURIComponent(ll) + "&dirflg=d";
  // Avoid the Maps-app id so openApp does not swap directions for a "you are here" pin.
  if (IOS) {
    openApp({ id: "nav-" + (pl.id || "place"), name: "Directions", url: "maps://?daddr=" + ll + "&dirflg=d", web: apple });
  } else if (/Android/i.test(navigator.userAgent)) {
    openApp({
      id: "nav-" + (pl.id || "place"),
      name: "Directions",
      url: "google.navigation:q=" + ll,
      pkg: "com.google.android.apps.maps",
      web: gDir
    });
  } else {
    go(gDir);
  }
}
function migratePlacesCoords() {
  var list = loadPlaces(), changed = false, pending = [];
  list.forEach(function (pl, i) {
    if (placeLL(pl)) {
      if (pl.lat == null && pl.latitude != null) { pl.lat = +pl.latitude; changed = true; }
      if (pl.lon == null && (pl.lng != null || pl.longitude != null)) { pl.lon = +(pl.lng != null ? pl.lng : pl.longitude); changed = true; }
      return;
    }
    var q = pl.label || pl.address || pl.name;
    if (!q) return;
    pending.push({ i: i, q: q });
  });
  if (changed) savePlaces(list);
  pending.slice(0, 5).forEach(function (job) {
    nomJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(job.q), 10000).then(function (R) {
      if (!R || !R[0]) return;
      var cur = loadPlaces();
      if (!cur[job.i]) return;
      cur[job.i] = Object.assign({}, cur[job.i], { lat: +R[0].lat, lon: +R[0].lon });
      savePlaces(cur); refreshPlaceEtas(); try { renderMap(true); } catch (e) {}
    }).catch(function () {});
  });
}
var _mapCardPl = null;
(function bindMapCardOutside() {
  document.addEventListener("pointerdown", function (e) {
    var card = $("#mapPlaceCard");
    if (!card || card.hidden) return;
    if (card.contains(e.target)) return;
    /* v4.9.5: only when the card is the top layer — taps on a sheet/assistant/detail above it never close it */
    if (e.target.closest && e.target.closest("#sheet,#zapSheet,.xp.as-detail,#scrim,.toast")) return;
    var _sh = $("#sheet"), _zp = $("#zapSheet");
    if ((_sh && !_sh.hidden) || (_zp && !_zp.hidden) || isCardDetailOpen()) return;
    if (e.target.closest && e.target.closest(".map-place-pin")) return;
    hideMapPlaceCard();
  }, { capture: true, passive: true });
})();
function hideMapPlaceCard() {
  _mapCardPl = null;
  var card = $("#mapPlaceCard"); if (card) { card.hidden = true; try { card.style.transform = ""; } catch (e) {} }
  try { overlayClearHistory(); } catch (e) {}
}
function bindPlaceCardSwipe(el) {
  if (!el || el._zapSwipe) return; el._zapSwipe = true;
  var y0 = 0, active = false;
  el.addEventListener("touchstart", function (e) {
    if (!e.touches || e.touches.length !== 1) return;
    y0 = e.touches[0].clientY; active = true;
  }, { passive: true });
  el.addEventListener("touchmove", function (e) {
    if (!active || !e.touches || !e.touches.length) return;
    var dy = e.touches[0].clientY - y0;
    if (dy > 0) el.style.transform = "translateY(" + Math.round(Math.min(dy, 160)) + "px)";
  }, { passive: true });
  el.addEventListener("touchend", function (e) {
    if (!active) return; active = false;
    var dy = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : y0) - y0;
    el.style.transform = "";
    if (dy > 56) hideMapPlaceCard();
  }, { passive: true });
}
function showMapPlaceCard(pl) {
  if (!pl) return;
  _mapCardPl = pl;
  var v = $("#mapV"); if (!v) { openDirectionsTo(pl); return; }
  var card = $("#mapPlaceCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "mapPlaceCard"; card.className = "map-place-card"; card.hidden = true;
    card.innerHTML = '<div class="mpc-meta"><b id="mpcName"></b><small id="mpcEta"></small></div><button type="button" class="mpc-go" id="mpcGo" aria-label="Start directions">GO</button><button type="button" class="mpc-ed" id="mpcEd">EDIT</button><button type="button" class="mpc-x" id="mpcX" aria-label="Close">✕</button>';
    v.appendChild(card);
    card.querySelector("#mpcGo").addEventListener("click", function (e) {
      e.stopPropagation();
      if (_mapCardPl) openDirectionsTo(_mapCardPl);
    });
    card.querySelector("#mpcX").addEventListener("click", function (e) { e.stopPropagation(); hideMapPlaceCard(); });
    card.querySelector("#mpcEd").addEventListener("click", function (e) {
      e.stopPropagation();
      var cur = _mapCardPl; if (!cur) return;
      if (cur.id === "__search") {
        var list = loadPlaces();
        var np = { id: "p" + Date.now(), name: cur.name, icon: "📍", color: "#8b5cf6", lat: cur.lat, lon: cur.lon, label: cur.label || cur.name };
        list.push(np); savePlaces(list);
        PLACE_ETA[np.id] = PLACE_ETA.__search; MAP.search = null;
        hideMapPlaceCard(); refreshPlaceEtas(); renderMap(true); toast(np.name + " saved to Places");
        return;
      }
      /* v4.9.5: keep the pin card under the edit sheet so Back closes one layer at a time */
      openEditPlace(cur);
    });
  }
  var eta = PLACE_ETA[pl.id];
  card.querySelector("#mpcName").textContent = pl.name || "Place";
  card.querySelector("#mpcEd").textContent = pl.id === "__search" ? "SAVE" : "EDIT";
  card.querySelector("#mpcEd").setAttribute("aria-label", pl.id === "__search" ? "Save to Places" : "Edit place");
  card.querySelector("#mpcEta").textContent = eta ? ((eta.sec != null ? "≈ " + formatEta(eta.sec, eta.km) + " drive" : formatEta(null, eta.km) + " away") + " · Traffic colors live from TomTom; ETA is an estimate.") : "Tap GO for turn-by-turn";
  card.hidden = false;
  try { overlayPushHistory(); } catch (e) {}
  try { bindPlaceCardSwipe(card); } catch (e) {}
}
function openEditPlace(pl) {
  if (!pl) return;
  sheet("✎ EDIT PLACE",
    '<label class="field">NAME<input id="plName" maxlength="24" value="' + esc(pl.name || "") + '"></label>' +
    '<label class="field">ADDRESS / NOTE<input id="plLabel" maxlength="80" value="' + esc(pl.label || "") + '" placeholder="Optional"></label>' +
    '<p class="note">Coords: ' + (placeLL(pl) ? (placeLL(pl).lat.toFixed(5) + ", " + placeLL(pl).lon.toFixed(5)) : "missing — use Search or current location") + '</p>' +
    '<label class="field">SEARCH TO MOVE<input id="plQ" placeholder="Street, city…" autocomplete="off"></label><div id="plRes"></div>' +
    '<button class="btn alt" id="plHere" style="margin-top:8px">◎ Use current location</button>' +
    '<button class="btn" id="plSave" style="margin-top:12px">SAVE</button>' +
    '<button class="btn warn" id="plDel" style="margin-top:8px">Remove place</button>',
    function (b) {
      var chosen = placeLL(pl) ? { lat: placeLL(pl).lat, lon: placeLL(pl).lon, label: pl.label || "" } : null;
      function pick(lat, lon, label) { chosen = { lat: lat, lon: lon, label: label || "" }; toast("Location updated — tap Save"); }
      b.querySelector("#plHere").addEventListener("click", function () {
        if (!GPS) { toast("Still locating you…"); return; }
        pick(GPS.lat, GPS.lon, "Current location");
      });
      var tm;
      b.querySelector("#plQ").addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 3) { b.querySelector("#plRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          nomJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=" + encodeURIComponent(q), 10000).then(function (R) {
            R = R || [];
            b.querySelector("#plRes").innerHTML = R.length ? R.map(function (r, i) {
              return '<button class="res" data-i="' + i + '">' + esc(r.display_name) + '<span class="add">USE</span></button>';
            }).join("") : '<p class="note">No matches.</p>';
            $$("[data-i]", b.querySelector("#plRes")).forEach(function (x) {
              x.addEventListener("click", function () {
                var r = R[+x.getAttribute("data-i")];
                pick(+r.lat, +r.lon, r.display_name);
              });
            });
          }).catch(function () { b.querySelector("#plRes").innerHTML = '<p class="note">Search offline.</p>'; });
        }, 400);
      });
      b.querySelector("#plSave").addEventListener("click", function () {
        var nm = (b.querySelector("#plName").value || "").trim() || pl.name || "Place";
        if (!chosen) { toast("Pick a location first"); return; }
        var list = loadPlaces().map(function (x) {
          if (x.id !== pl.id) return x;
          return Object.assign({}, x, { name: nm, label: (b.querySelector("#plLabel").value || "").trim() || chosen.label || nm, lat: chosen.lat, lon: chosen.lon });
        });
        savePlaces(list); closeSheet(); hideMapPlaceCard(); refreshPlaceEtas(); renderMap(true); toast(nm + " updated");
      });
      b.querySelector("#plDel").addEventListener("click", function () {
        if (!confirm("Remove " + (pl.name || "this place") + "?")) return;
        savePlaces(loadPlaces().filter(function (x) { return x.id !== pl.id; }));
        closeSheet(); hideMapPlaceCard(); refreshPlaceEtas(); renderMap(true); toast("Place removed");
      });
    });
}
function openPlaceEditor(presetId) {
  var preset = PLACE_PRESETS.filter(function (p) { return p.id === presetId; })[0];
  var isCustom = !preset || presetId === "custom";
  var title = isCustom ? "＋ CUSTOM PLACE" : ("SET " + preset.name.toUpperCase());
  sheet(title,
    '<label class="field">NAME<input id="plName" maxlength="24" value="' + esc(preset && !isCustom ? preset.name : "") + '" placeholder="e.g. Dad\'s" autocomplete="off"></label>' +
    '<label class="field">SEARCH ADDRESS<input id="plQ" placeholder="Street, city…" autocomplete="off"></label><div id="plRes"></div>' +
    '<button class="btn alt" id="plHere" style="margin-top:8px">◎ Use current location</button>' +
    '<button class="btn alt" id="plMap" style="margin-top:8px">📍 Use map center</button>' +
    (isCustom ? "" : '<p class="note" style="margin-top:10px">Saves as ' + esc(preset.name) + '. Tap the place later for directions.</p>'),
    function (b) {
      var chosen = null;
      function pick(lat, lon, label) {
        chosen = { lat: lat, lon: lon, label: label || "" };
        toast("Location set — tap Save");
        if (!b.querySelector("#plSave")) {
          var btn = document.createElement("button"); btn.className = "btn"; btn.id = "plSave"; btn.textContent = "SAVE PLACE"; btn.style.marginTop = "12px";
          b.appendChild(btn);
          btn.addEventListener("click", function () {
            var nm = (b.querySelector("#plName").value || "").trim() || (preset ? preset.name : "Place");
            if (!chosen) { toast("Pick an address or location first"); return; }
            var list = loadPlaces().filter(function (x) { return x.id !== (preset && !isCustom ? preset.id : null); });
            // replace same preset id
            if (preset && !isCustom) list = loadPlaces().filter(function (x) { return x.id !== preset.id; });
            var id = (preset && !isCustom) ? preset.id : ("p" + Date.now());
            list.push({ id: id, name: nm, icon: preset && !isCustom ? preset.icon : "📍", color: preset && !isCustom ? preset.color : "#8b5cf6", lat: chosen.lat, lon: chosen.lon, label: chosen.label || nm });
            savePlaces(list); closeSheet(); refreshPlaceEtas(); renderMap(true); toast(nm + " saved");
          });
        }
      }
      b.querySelector("#plHere").addEventListener("click", function () {
        if (!GPS) { toast("Still locating you…"); return; }
        pick(GPS.lat, GPS.lon, "Current location");
      });
      b.querySelector("#plMap").addEventListener("click", function () {
        var mc = mapCenterLL();
        if (!mc) { toast("Map needs your location first"); return; }
        pick(mc.lat, mc.lon, "Map center");
      });
      var tm;
      b.querySelector("#plQ").addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 3) { b.querySelector("#plRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          nomJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&accept-language=en&q=" + encodeURIComponent(q), 10000).then(function (R) {
            R = R || [];
            b.querySelector("#plRes").innerHTML = R.length ? R.map(function (r, i) {
              return '<button class="res" data-i="' + i + '">' + esc(r.display_name) + '<span class="add">USE</span></button>';
            }).join("") : '<p class="note">No matches.</p>';
            $$("[data-i]", b.querySelector("#plRes")).forEach(function (x) {
              x.addEventListener("click", function () {
                var r = R[+x.getAttribute("data-i")];
                pick(+r.lat, +r.lon, r.display_name);
                b.querySelector("#plName").value = b.querySelector("#plName").value || (r.namedetails && r.namedetails.name) || r.display_name.split(",")[0];
              });
            });
          }).catch(function () { b.querySelector("#plRes").innerHTML = '<p class="note">Search offline — try again.</p>'; });
        }, 400);
      });
    });
}
(function bindPlaces() {
  var row = $("#placesRow"); if (!row) return;
  var holdT = null, held = false;
  function clearHold() { clearTimeout(holdT); holdT = null; }
  row.addEventListener("pointerdown", function (e) {
    var go = e.target.closest("[data-place-go]"); if (!go) return;
    held = false; clearHold();
    holdT = setTimeout(function () {
      held = true;
      go.classList.add("held");
      var pl = loadPlaces().filter(function (x) { return x.id === go.getAttribute("data-place-go"); })[0];
      if (pl) openEditPlace(pl);
      try { navigator.vibrate && navigator.vibrate(30); } catch (err) {}
    }, 550);
  });
  var hsx = 0, hsy = 0;
  row.addEventListener("pointerdown", function (e) { hsx = e.clientX; hsy = e.clientY; }, true);
  row.addEventListener("pointermove", function (e) { if (holdT && Math.abs(e.clientX - hsx) + Math.abs(e.clientY - hsy) > 10) clearHold(); });
  row.addEventListener("pointerup", clearHold);
  row.addEventListener("pointerleave", clearHold);
  row.addEventListener("pointercancel", clearHold);
  row.addEventListener("contextmenu", function (e) {
    var go = e.target.closest("[data-place-go]");
    if (go) { e.preventDefault(); var pl = loadPlaces().filter(function (x) { return x.id === go.getAttribute("data-place-go"); })[0]; if (pl) openEditPlace(pl); }
  });
  row.addEventListener("click", function (e) {
    var go = e.target.closest("[data-place-go]");
    if (go) {
      if (held) { held = false; go.classList.remove("held"); return; }
      var pl = loadPlaces().filter(function (x) { return x.id === go.getAttribute("data-place-go"); })[0];
      if (pl) openDirectionsTo(pl);
      return;
    }
    var nw = e.target.closest("[data-place-new]");
    if (nw) openPlaceEditor(nw.getAttribute("data-place-new"));
  });
  var add = $("#placeAdd"); if (add) add.addEventListener("click", function () { openPlaceEditor("custom"); });
  try { migratePlacesCoords(); } catch (e) {}
  renderPlacesRow();
})();


var VIEWS = ["home", "weather", "markets"], VIEW = "home";
function show(tab) {
  if (tab === "menu") { openMenu(); return; }
  // v4.1: weather/markets/phone/settings are HUD screens
  if (typeof setHudTab === "function") {
    if (tab === "weather" || tab === "markets" || tab === "phone" || tab === "settings" || tab === "apps" || tab === "map" || tab === "music") {
      setHudTab(tab); return;
    }
    if (tab === "home") { setHudTab("home"); }
  }
  if (VIEWS.indexOf(tab) < 0) tab = "home";
  VIEW = tab;
  VIEWS.forEach(function (t) { var el = $("#v-" + t); if (el) el.hidden = t !== tab; });
  document.body.classList.toggle("on-home", tab === "home");
  try { Store.setUI({ view: "hud:" + (HUD_TAB || tab) }); } catch (e) { Store.setUI({ view: tab }); }
  restoreScroll();
  $$(".tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
}
$$(".tab").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-tab")); }); });
(function bindHomeWeatherCard() {
  /* Entire card surface opens detail. Hourly row: tap unless real horizontal move >10px. */
  var wx = $("#hWx"); if (!wx || wx._wxTapFull) return; wx._wxTapFull = true;
  var sx = 0, sy = 0, active = false, openedAt = 0;
  function pt(e) {
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function openWx(e) {
    if (Date.now() - openedAt < 420) {
      try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (err) {}
      return;
    }
    openedAt = Date.now();
    clearTapShieldNow();
    try { if (e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } } catch (err2) {}
    /* Always land on today (daily index 0) when opening from the home card */
    WX_DAY = 0;
    try { Store.setLocal("wxDay", 0); } catch (e3) {}
    openCardDetail("wx", { fromUser: true });
  }
  function onDown(e) {
    if (e.pointerType === "mouse" && e.button != null && e.button !== 0) return;
    active = true;
    wx.classList.add("is-pressed"); clearTimeout(wx._pressT); wx._pressT = setTimeout(function () { wx.classList.remove("is-pressed"); }, 450);
    var p = pt(e); sx = p.x; sy = p.y;
  }
  function onUp(e) {
    setTimeout(function () { wx.classList.remove("is-pressed"); }, 90);
    if (!active) return;
    active = false;
    var p = pt(e);
    var dx = Math.abs(p.x - sx), dy = Math.abs(p.y - sy);
    /* Real horizontal scroll on hourly strip — do not open */
    if (dx > 10 || dy > 10) return;
    openWx(e);
  }
  wx.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  wx.addEventListener("pointerup", function (e) {
    if (e.pointerType === "mouse") return; /* mouse uses click */
    onUp(e);
    if (e.pointerType === "touch" || e.pointerType === "pen") wx._zapPtrWx = Date.now();
  }, { capture: true, passive: false });
  wx.addEventListener("touchstart", onDown, { capture: true, passive: true });
  wx.addEventListener("touchend", function (e) {
    if (wx._zapPtrWx && Date.now() - wx._zapPtrWx < 400) return;
    onUp(e);
  }, { capture: true, passive: false });
  wx.addEventListener("click", function (e) {
    if (Date.now() - openedAt < 420) { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} return; }
    /* click / keyboard activation — still open whole card */
    openWx(e);
  }, { capture: true });
  wx.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWx(e); }
  });
})();
(function bindHomeMarketsCard() {
  var card = $("#hMk"); if (!card) return;
  var suppressUntil = 0, addLast = 0;
  function openPort() {
    if (Date.now() < suppressUntil) return;
    openCardDetail("mk", { fromUser: true });
  }
  function isAddTarget(e) {
    if (!e) return false;
    try {
      var t = e.target;
      if (t && t.nodeType === 3) t = t.parentElement; /* text node inside + Add */
      if (t && t.closest && t.closest("#hMkAct,[data-hmk-add]")) return true;
      if (e.composedPath) {
        var path = e.composedPath();
        for (var i = 0; i < path.length; i++) {
          var n = path[i];
          if (!n || !n.getAttribute) continue;
          if (n.id === "hMkAct" || (n.getAttribute && n.getAttribute("data-hmk-add"))) return true;
        }
      }
    } catch (err) {}
    return false;
  }
  function openAdd(e) {
    var now = Date.now();
    if (now - addLast < 420) {
      try { if (e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } } catch (err0) {}
      return;
    }
    addLast = now;
    suppressUntil = now + 700; /* card open-detail must not also fire */
    clearTapShieldNow();
    try { if (e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } } catch (err1) {}
    try { openAddAccount(); } catch (err) { suppressUntil = 0; openPort(); }
  }
  /* Capture-phase on + Add so card bubble / sibling pointer+touch never stacks PORTFOLIO under ADD ACCOUNT */
  var act = $("#hMkAct");
  function bindAddEl(el) {
    if (!el || el._mkAddBound) return; el._mkAddBound = true;
    ["pointerdown", "touchstart"].forEach(function (ev) {
      el.addEventListener(ev, function (e) {
        try { e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (err) {}
      }, { capture: true, passive: false });
    });
    ["pointerup", "touchend", "click"].forEach(function (ev) {
      el.addEventListener(ev, function (e) {
        if (ev === "pointerup" && e.pointerType === "mouse") return;
        if (ev === "touchend" && el._zapPtrAdd && Date.now() - el._zapPtrAdd < 400) return;
        if (ev === "pointerup" && (e.pointerType === "touch" || e.pointerType === "pen")) el._zapPtrAdd = Date.now();
        openAdd(e);
      }, { capture: true, passive: false });
    });
  }
  bindAddEl(act);
  /* Dynamic empty-state CTA [data-hmk-add] inside card */
  card.addEventListener("pointerdown", function (e) {
    if (isAddTarget(e)) {
      try { e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (err) {}
    }
  }, { capture: true, passive: false });
  card.addEventListener("click", function (e) {
    if (!isAddTarget(e)) return;
    /* only fire openAdd here if the dedicated act binding didn't (e.g. span.hmk-cta) */
    if (e.target && e.target.closest && e.target.closest("#hMkAct")) return;
    openAdd(e);
  }, true);
  bindUserTap(card, function (e) {
    if (Date.now() < suppressUntil || isAddTarget(e)) return;
    openPort();
  }, { ignore: function (e) {
    return Date.now() < suppressUntil || isAddTarget(e);
  }});
})();

/* Audit: inner card controls stop bubble to parent open-detail (bubble phase so their own handlers still run) */
(function auditCardInnerControls() {
  function stopBubble(e) {
    try { e.stopPropagation(); } catch (err) {}
  }
  function bindStop(sel) {
    var el = $(sel); if (!el || el._innerStopBound) return; el._innerStopBound = true;
    ["pointerup", "touchend", "click"].forEach(function (ev) {
      el.addEventListener(ev, stopBubble, false);
    });
  }
  ["#placeAdd", "#mapOpen", "#focToggle", "#focReset", "#focTap", "#mapIn", "#mapOut", "#mapRec", "#mapTrafChip"].forEach(bindStop);
  /* Focus presets live inside #mFocus — stop bubble after their click handler via delegation */
  var foc = $("#mFocus");
  if (foc && !foc._focBubbleStop) {
    foc._focBubbleStop = true;
    foc.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-foc-min],#focToggle,#focReset,#focTap")) stopBubble(e);
    }, false);
  }
})();
/* Clear shield as soon as the user touches any home card (prevents ghost-block) */
document.addEventListener("pointerdown", function (e) {
  var t = e.target;
  if (!t || !t.closest) return;
  if (t.closest("#hWx,#hMk,#hMkAct,#hMap,#mapOpen,#mFocus,#heroCard,.tile,[data-hmk-add]")) clearTapShieldNow();
}, { capture: true, passive: true });

/* ===== v4.6.2/v4.6.3: iOS-safe scroll lock + portal sheets into body ===== */
var SCROLL_LOCK = { y: 0, locked: false };
function lockPageScroll() {
  /* v4.9.2: NO body position:fixed. On iPhone that shifted the page under the finger after the
     keyboard/sheet closed (taps hit the wrong spot, Focus text vanished). Overlays scroll themselves. */
  if (SCROLL_LOCK.locked) return;
  SCROLL_LOCK.y = window.scrollY || document.documentElement.scrollTop || 0;
  SCROLL_LOCK.locked = true;
  try {
    document.documentElement.classList.add("sheet-open");
    document.body.classList.add("sheet-open");
  } catch (e) {}
}
function unlockPageScroll() {
  if (!SCROLL_LOCK.locked) return;
  /* v4.9.4: the small map place card is not a page lock — only real sheets/details/full map */
  var sh = $("#sheet"), zap = $("#zapSheet");
  if ((sh && !sh.hidden) || (zap && !zap.hidden) || isCardDetailOpen() || document.documentElement.classList.contains("map-fs-open")) return;
  SCROLL_LOCK.locked = false;
  var keepY = SCROLL_LOCK.y;
  try {
    document.documentElement.classList.remove("sheet-open");
    document.body.classList.remove("sheet-open");
    document.body.style.position = ""; document.body.style.top = "";
    document.body.style.overflow = ""; document.documentElement.style.overflow = "";
    if (keepY && Math.abs((window.scrollY || 0) - keepY) > 2) window.scrollTo(0, keepY);
  } catch (e) {}
}
/* v4.6.3: force-clear scroll lock on boot / pageshow / resume (ignore locked flag) */
function clearScrollLockHard() {
  try {
    SCROLL_LOCK.locked = false;
    SCROLL_LOCK.y = 0;
    document.documentElement.classList.remove("sheet-open");
    document.body.classList.remove("sheet-open");
    document.documentElement.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  } catch (e) {}
}
function ensurePageScrollable() {
  /* v4.13.1: desktop wheel/trackpad must always reach the document scroller when no overlay is open */
  try {
    var overlayUp = false;
    try {
      overlayUp = (typeof anyOverlayOpen === "function" && anyOverlayOpen())
        || (typeof isCardDetailOpen === "function" && isCardDetailOpen())
        || document.documentElement.classList.contains("map-fs-open")
        || document.documentElement.classList.contains("sheet-open")
        || document.documentElement.classList.contains("detail-open")
        || document.body.classList.contains("sheet-open");
    } catch (eO) {}
    if (overlayUp) return;
    clearScrollLockHard();
    try {
      document.documentElement.style.overflowX = "hidden";
      document.documentElement.style.overflowY = "scroll";
      document.body.style.overflowX = "hidden";
      document.body.style.overflowY = "visible";
      document.body.style.position = "";
      document.body.style.height = "";
      document.body.style.maxHeight = "";
      document.documentElement.style.height = "";
      document.documentElement.style.maxHeight = "";
    } catch (eS) {}
  } catch (e) {}
}
(function bindDesktopScrollInsurance() {
  if (document.documentElement._zapScrollIns) return;
  document.documentElement._zapScrollIns = true;
  function kick() { try { ensurePageScrollable(); } catch (e) {} }
  kick();
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") setTimeout(kick, 50); });
  window.addEventListener("pageshow", function () { setTimeout(kick, 50); });
  window.addEventListener("focus", function () { setTimeout(kick, 50); });
  /* if a sheet/detail closes, unlock immediately */
  document.addEventListener("click", function () { setTimeout(kick, 0); }, true);
  setInterval(function () {
    try {
      if (document.visibilityState !== "visible") return;
      var locked = document.documentElement.classList.contains("sheet-open")
        || document.body.classList.contains("sheet-open")
        || document.documentElement.classList.contains("detail-open");
      if (!locked) return;
      var sh = document.getElementById("sheet");
      var zap = document.getElementById("zapSheet");
      var sheetUp = (sh && !sh.hidden) || (zap && !zap.hidden);
      var detailUp = typeof isCardDetailOpen === "function" && isCardDetailOpen();
      var mapUp = document.documentElement.classList.contains("map-fs-open");
      if (!sheetUp && !detailUp && !mapUp) ensurePageScrollable();
    } catch (e) {}
  }, 2000);
})();

function portalToBody(el) {
  if (!el) return;
  if (!el._zapHome && el.parentNode) {
    el._zapHome = { parent: el.parentNode, next: el.nextSibling };
  }
  /* Always append at END of body — never insertBefore #app (in-flow risk if position fails) */
  try { document.body.appendChild(el); } catch (e) {}
}
function portalHome(el) {
  if (!el || !el._zapHome) return;
  var h = el._zapHome;
  el._zapHome = null;
  try {
    if (h.parent && h.parent.isConnected) {
      if (h.next && h.next.parentNode === h.parent) h.parent.insertBefore(el, h.next);
      else h.parent.appendChild(el);
    } else if (el.parentNode) {
      /* home gone — leave on body but ensure hidden + not as-detail */
    }
  } catch (e) {
    try { if (h.parent) h.parent.appendChild(el); } catch (e2) {}
  }
}
/* v4.6.3: if header is pushed down by a leftover spacer / bad lock, snap it back */
function fixHeaderGap() {
  try {
    var topEl = document.getElementById("top") || document.querySelector(".top");
    if (!topEl) return false;
    var safe = 0;
    try {
      var raw = getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-top)");
      /* env() in getPropertyValue often empty — use padding on .top as proxy */
      safe = parseFloat(getComputedStyle(topEl).paddingTop) || 0;
    } catch (eS) { safe = 0; }
    if (!safe) safe = 12;
    var rect = topEl.getBoundingClientRect();
    if (rect.top <= safe + 20) return false;
    /* Header too far down — clear locks, kill in-flow stage, scroll to 0 */
    clearScrollLockHard();
    try {
      var stage = document.getElementById("zwStage");
      if (stage) {
        stage.style.position = "fixed";
        stage.style.inset = "0";
        stage.style.height = "100%";
        stage.style.width = "100%";
        stage.style.pointerEvents = "none";
        stage.style.zIndex = "0";
        if (stage.parentNode !== document.body) document.body.appendChild(stage);
        var cs = getComputedStyle(stage);
        if (cs.position !== "fixed" || stage.getBoundingClientRect().height > window.innerHeight * 0.5 && stage.compareDocumentPosition(document.getElementById("app")) & Node.DOCUMENT_POSITION_FOLLOWING) {
          /* still contributing? force out of flow via display if fx-lite, else fixed already set */
          if (document.documentElement.classList.contains("fx-lite")) {
            stage.setAttribute("hidden", "");
            stage.style.display = "none";
          }
        }
      }
    } catch (eSt) {}
    try {
      ["sheet", "zapSheet", "scrim", "xpWx", "xpMk"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var open = false;
        try { open = typeof anyOverlayOpen === "function" && anyOverlayOpen(); } catch (eA) {}
        if (!open) {
          if (id === "xpWx" || id === "xpMk") {
            if (!el.classList.contains("as-detail")) {
              el.hidden = true;
              /* v4.8.0: do NOT set el.style.display="none" — that stuck after open and blocked Weather */
              try { el.style.display = ""; } catch (eDsp) {}
            }
          }
        }
      });
    } catch (eOv) {}
    try { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (eSc) {}
    /* If still low, translate #app up is too aggressive — instead zero any body padding/margin */
    try {
      document.body.style.paddingTop = "";
      document.body.style.marginTop = "";
      var app = document.getElementById("app");
      if (app) { app.style.marginTop = ""; app.style.paddingTop = ""; app.style.transform = ""; }
    } catch (eApp) {}
    return true;
  } catch (e) { return false; }
}
function guardHeaderTop() {
  try {
    fixHeaderGap();
    requestAnimationFrame(function () {
      fixHeaderGap();
      setTimeout(fixHeaderGap, 120);
      setTimeout(fixHeaderGap, 400);
      setTimeout(fixHeaderGap, 900);
    });
  } catch (e) {}
}
function crispifyOverlay(el) {
  if (!el) return;
  try {
    el.style.backdropFilter = "none";
    el.style.webkitBackdropFilter = "none";
    el.style.filter = "none";
    el.style.transform = "none";
    el.style.willChange = "auto";
  } catch (e) {}
  try {
    el.querySelectorAll("*").forEach(function (n) {
      var st = n.style; if (!st) return;
      /* do not wipe intentional inline transforms on map pins etc inside overlays that need them —
         only strip backdrop filters that blur text */
      if (st.backdropFilter) st.backdropFilter = "none";
      if (st.webkitBackdropFilter) st.webkitBackdropFilter = "none";
    });
  } catch (e2) {}
}

/* v4.6: card detail sheets — restore v3.7.1 expand content in a slide-up sheet */
var CARD_DETAIL = { kind: null, scrollY: 0 };
function detailPanel(k) { return $(k === "wx" ? "#xpWx" : "#xpMk"); }
function detailBtn(k) { return $(k === "wx" ? "#hWx" : "#hMk"); }
function isCardDetailOpen() {
  if (!CARD_DETAIL.kind) return false;
  var el = detailPanel(CARD_DETAIL.kind);
  return !!(el && !el.hidden && el.classList.contains("as-detail"));
}
function closeCardDetail(skipHist) {
  var k = CARD_DETAIL.kind;
  if (!k) return;
  var el = detailPanel(k), btn = detailBtn(k);
  if (el) {
    el.hidden = true;
    el.classList.remove("as-detail");
    try { document.documentElement.classList.remove("detail-open"); } catch (eD2) {}
    el.style.transform = "";
    el.style.top = ""; el.style.bottom = ""; el.style.left = ""; el.style.right = "";
    /* never leave a sticky inline display:none — [hidden] CSS handles closed state */
    try { el.style.display = ""; el.style.visibility = ""; el.style.opacity = ""; el.style.pointerEvents = ""; el.style.height = ""; el.style.minHeight = ""; } catch (eClr) {}
    try { el.removeAttribute("role"); } catch (e0) {}
    try { portalHome(el); } catch (eP) {}
  }
  if (btn) btn.setAttribute("aria-expanded", "false");
  CARD_DETAIL.kind = null;
  hideScrimIfIdle();
  overlayClearHistory();
  try { unlockPageScroll(); } catch (eU) {}
  try { armTapShield(320); } catch (e3) {}
}
function openCardDetail(k, opts) {
  if (k !== "wx" && k !== "mk") return;
  opts = opts || {};
  /* v4.8.0: explicit user taps bypass a lingering tap-shield (root cause of Weather first-tap miss after close). */
  if (tapShieldActive() && !opts.fromUser) return;
  if (opts.fromUser) { try { clearTapShieldNow(); } catch (eClr) {} }
  var el = detailPanel(k), btn = detailBtn(k);
  if (!el) return;
  /* toggle closed if same detail already open and actually visible */
  var already = CARD_DETAIL.kind === k && !el.hidden && el.classList.contains("as-detail");
  if (already) {
    if (overlayGuardActive()) return; /* ghost click must not toggle-close a just-opened detail */
    closeCardDetail(false); return;
  }
  /* If a prior detail kind is stale (DOM already hidden) just clear state — a full closeCardDetail
     + leftover OVERLAY.hist was racing popstate and dismissing the panel we are about to open. */
  if (CARD_DETAIL.kind && CARD_DETAIL.kind !== k) {
    if (isCardDetailOpen()) closeCardDetail(true);
    else CARD_DETAIL.kind = null;
  }
  try { reconcileOverlayHistory(); } catch (eRec) {}
  CARD_DETAIL.kind = k;
  CARD_DETAIL.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (eB) {}
  try { closeZapAssistant(true); } catch (eZ) {}
  try { closeSheet(true); } catch (eS) {}
  try { hideMapPlaceCard(); } catch (eM) {}
  try { if (document.documentElement.classList.contains("map-fs-open")) closeMapOverlay(); } catch (eMo) {}
  try { portalToBody(el); } catch (ePort) {}
  /* v4.8.0 ROOT CAUSE FIX: fixHeaderGap() used to set el.style.display="none" while closed.
     Removing [hidden] alone left the inline display:none, so Weather looked like it never opened. */
  try {
    el.style.display = "";
    el.style.visibility = "";
    el.style.opacity = "";
    el.style.pointerEvents = "";
    el.style.transform = "";
    el.style.height = "";
    el.style.minHeight = "";
    el.removeAttribute("aria-hidden");
  } catch (eSt) {}
  el.hidden = false;
  el.classList.add("as-detail");
  crispifyOverlay(el);
  try { document.documentElement.classList.add("detail-open"); } catch (eD) {}
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  if (btn) btn.setAttribute("aria-expanded", "true");
  lockPageScroll();
  showScrim("detail");
  armOverlayGuard(480);
  overlayPushHistory();
  requestAnimationFrame(function () {
    try { el.scrollTop = 0; } catch (eT) {}
    try {
      if (k === "wx") { renderWeather(); renderConditions(); try { renderWxNow(); } catch (eN) {} }
      else { renderMarkets(); try { renderHoldings(); } catch (eH) {} try { renderAccounts(); } catch (eA) {} }
    } catch (eR) {}
    try { el.scrollTop = 0; } catch (eT2) {}
    /* force a paint in case iOS still had display:none cached */
    try { void el.offsetHeight; } catch (eRf) {}
  });
}
function toggleXp(k) {
  if (k === "wx" || k === "mk") { openCardDetail(k, { fromUser: true }); return; }
}
$("#xpCity").addEventListener("click", function (e) { e.stopPropagation(); openCity(); });
(function bindDetailInner() {
  ["#xpWx", "#xpMk"].forEach(function (sel) {
    var el = $(sel); if (!el || el._detailInner) return; el._detailInner = true;
    el.addEventListener("click", function (e) {
      if (e.target.closest("button,a,input,select,label,[data-acct],[data-hold-del],[data-m]")) e.stopPropagation();
    });
  });
})();
(function ensureDetailClose() {
  function ensure(sel) {
    var el = $(sel); if (!el) return;
    var h = el.querySelector(".xp-h"); if (!h) return;
    if (h.querySelector(".detail-close")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip detail-close"; b.setAttribute("aria-label", "Close");
    b.textContent = "✕ CLOSE";
    b.addEventListener("click", function (e) { e.stopPropagation(); closeCardDetail(false); });
    h.appendChild(b);
  }
  ensure("#xpWx"); ensure("#xpMk");
})();
$("#xpMkEdit").addEventListener("click", function () { openEditCoins(); });
var _xpHoldAdd = $("#xpHoldAdd"); if (_xpHoldAdd) bindUserTap(_xpHoldAdd, function () { openAddHolding(); });
var _xpAcctAdd = $("#xpAcctAdd"); if (_xpAcctAdd) bindUserTap(_xpAcctAdd, function () { openAddAccount(); });
(function bindAccounts() {
  var host = $("#acctGrid"); if (!host) return;
  var holdT = null, held = false, heldId = null;
  function clearHold() { clearTimeout(holdT); holdT = null; }
  host.addEventListener("pointerdown", function (e) {
    var tile = e.target.closest("[data-acct]"); if (!tile) return;
    held = false; heldId = tile.getAttribute("data-acct"); clearHold();
    holdT = setTimeout(function () {
      held = true;
      openEditAccount(heldId);
      try { navigator.vibrate && navigator.vibrate(30); } catch (err) {}
    }, 550);
  });
  host.addEventListener("pointerup", clearHold);
  host.addEventListener("pointerleave", clearHold);
  host.addEventListener("pointercancel", clearHold);
  host.addEventListener("contextmenu", function (e) {
    var tile = e.target.closest("[data-acct]");
    if (tile) { e.preventDefault(); openEditAccount(tile.getAttribute("data-acct")); }
  });
  host.addEventListener("click", function (e) {
    if (e.target.closest("[data-acct-add]")) { openAddAccount(); return; }
    var tile = e.target.closest("[data-acct]"); if (!tile) return;
    if (held) { held = false; return; }
    var a = loadAccounts().filter(function (x) { return x.id === tile.getAttribute("data-acct"); })[0];
    if (a) openAccountApp(a);
  });
})();
document.addEventListener("click", function (e) {
  if (e.target.closest("#holdEmptyAdd")) { e.preventDefault(); openAddHolding(); return; }
  var qa = e.target.closest("[data-qa]"); if (qa) {
    e.preventDefault();
    var id = qa.getAttribute("data-qa");
    var pick = QUICK_PICKS.filter(function (p) { return p.id === id; })[0];
    if (pick) quickAddHolding(pick);
    return;
  }
  var ed = e.target.closest("[data-hold-edit]"); if (ed) { e.preventDefault(); openEditHolding(+ed.getAttribute("data-hold-edit")); return; }
  var del = e.target.closest("[data-hold-del]"); if (del) {
    e.preventDefault();
    var list = loadHoldings(), i = +del.getAttribute("data-hold-del");
    if (!list[i]) return;
    if (!confirm("Remove " + list[i].sym + " from holdings?")) return;
    list.splice(i, 1); saveHoldings(list); renderMarkets(); toast("Removed");
  }
});

// ========== 11. sheets ==========

/* v4.6.1: block tap-through for a beat after any overlay closes */

/* v4.9.1: real touch taps for iOS Safari / standalone PWA.
   Nested <button> controls and click-only listeners miss touches; also clear tap-shield. */
function clearTapShieldNow() {
  try {
    TAP_SHIELD_UNTIL = 0;
    var sh = document.getElementById("tapShield");
    if (sh) { sh.classList.remove("on"); sh.style.display = "none"; sh.style.pointerEvents = "none"; }
    clearTimeout(armTapShield._t);
  } catch (e) {}
}
function bindUserTap(el, fn, opts) {
  if (!el || el._zapUserTap) return;
  el._zapUserTap = true;
  opts = opts || {};
  var last = 0;
  function fire(e) {
    if (opts.ignore && opts.ignore(e)) {
      try { e.stopPropagation(); } catch (err0) {}
      return;
    }
    var now = Date.now();
    if (now - last < 380) { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} return; }
    last = now;
    clearTapShieldNow();
    try { if (e && e.preventDefault && e.type !== "click") e.preventDefault(); } catch (e0) {}
    try { if (e && e.stopPropagation) e.stopPropagation(); } catch (e1) {}
    try { fn(e); } catch (err) { console.warn("bindUserTap", err); }
  }
  el.addEventListener("pointerup", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* prefer pointerup for touch/pen; mouse uses click to avoid double */
    if (e.pointerType === "mouse") return;
    fire(e);
  }, { passive: false });
  el.addEventListener("touchend", function (e) {
    /* Safari sometimes skips pointer events on nested controls */
    if (el._zapPtrHandled && Date.now() - el._zapPtrHandled < 400) return;
    fire(e);
  }, { passive: false });
  el.addEventListener("pointerup", function (e) {
    if (e.pointerType === "touch" || e.pointerType === "pen") el._zapPtrHandled = Date.now();
  }, { passive: true });
  el.addEventListener("click", function (e) { fire(e); });
  el.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(e); }
  });
}

var TAP_SHIELD_UNTIL = 0;
function armTapShield(ms) {
  /* v4.9: time-gate only — never put a full-screen capture layer over the UI.
     The old #tapShield.on (z-index 2147483000) ate Weather/Markets taps on iPhone. */
  TAP_SHIELD_UNTIL = Date.now() + Math.min(ms || 220, 280);
  var sh = document.getElementById("tapShield");
  if (sh) {
    sh.classList.remove("on");
    sh.style.display = "none";
    sh.style.pointerEvents = "none";
  }
  clearTimeout(armTapShield._t);
  armTapShield._t = setTimeout(function () {
    TAP_SHIELD_UNTIL = 0;
  }, Math.min(ms || 220, 280));
}
function tapShieldActive() { return Date.now() < TAP_SHIELD_UNTIL; }

/* ========== Overlay dismiss (v4.3): outside tap, swipe down, Esc, history back ========== */
var OVERLAY = { hist: false, closingFromPop: false, swipeY0: 0, swipeEl: null, expectPops: 0, openedAt: 0 };
function anyOverlayOpen() {
  var sh = $("#sheet"), zap = $("#zapSheet"), card = $("#mapPlaceCard");
  return (typeof TOUR !== "undefined" && TOUR.on) || (sh && !sh.hidden) || (zap && !zap.hidden) || (card && !card.hidden) || isCardDetailOpen() || !!(document.documentElement.classList.contains("map-fs-open"));
}
var SCRIM_IGNORE_UNTIL = 0;
/* v4.9: after a touch opens a sheet/detail, the browser still synthesizes a click at the same
   coordinates. That ghost click was landing on the first .pk tile in ADD ACCOUNT (or scrim)
   and instantly closing/committing. Block UI activation for a beat. */
var OVERLAY_GUARD_UNTIL = 0;
function armOverlayGuard(ms) {
  var until = Date.now() + (ms || 450);
  if (until > OVERLAY_GUARD_UNTIL) OVERLAY_GUARD_UNTIL = until;
  if (until > SCRIM_IGNORE_UNTIL) SCRIM_IGNORE_UNTIL = until;
}
function overlayGuardActive() { return Date.now() < OVERLAY_GUARD_UNTIL; }
function showScrim(kind) {
  var sc = $("#scrim"); if (!sc) return;
  try { portalToBody(sc); } catch (eP) {}
  sc.hidden = false;
  sc.classList.toggle("zap-open", kind === "zap");
  armOverlayGuard(480);
  try {
    sc.style.backdropFilter = "none";
    sc.style.webkitBackdropFilter = "none";
    sc.style.filter = "none";
  } catch (e) {}
}
function hideScrimIfIdle() {
  var sc = $("#scrim"); if (!sc) return;
  var sh = $("#sheet"), zap = $("#zapSheet");
  if ((sh && !sh.hidden) || (zap && !zap.hidden) || isCardDetailOpen()) return;
  sc.hidden = true; sc.classList.remove("zap-open");
}
/* ========== v4.9.5 history stack: one history entry per open layer, one layer per Back ==========
   Layers (bottom→top): full-screen map, map pin card, weather/markets detail, sheet, ZAP AI.
   HIST.depth = how many of our entries sit above the base page entry (history.state.d).
   Every open/close just calls syncOverlayHistory(), which pushes or pops so depth === open layers.
   X / outside tap / Escape closes → we pop the matching entries ourselves (expected pops are ignored).
   Back press → popstate lands on depth d → close (depth - d) layers, top first. */
var HIST = { depth: 0, expect: 0, fb: 0, sched: false };
try { if (history.state && history.state.zaposOverlay) HIST.depth = history.state.d || 1; } catch (eH0) {}
function overlayLayers() {
  var L = [], de = document.documentElement;
  var sh = $("#sheet"), zap = $("#zapSheet"), card = $("#mapPlaceCard");
  if (de.classList.contains("map-fs-open")) L.push("map");
  if (card && !card.hidden) L.push("card");
  if (isCardDetailOpen()) L.push("detail");
  if (sh && !sh.hidden) L.push("sheet");
  if (zap && !zap.hidden) L.push("zap");
  if (TOUR.on) L.push("tour");
  return L;
}
function syncOverlayHistory() {
  if (HIST.expect > 0) return; /* a pop we issued is still in flight — resync when it lands */
  var want = overlayLayers().length;
  try {
    while (HIST.depth < want) { HIST.depth++; history.pushState({ zaposOverlay: 1, d: HIST.depth }, ""); }
    if (HIST.depth > want) {
      var n = HIST.depth - want;
      HIST.depth = want; HIST.expect++;
      clearTimeout(HIST.fb);
      HIST.fb = setTimeout(function () { /* pop never arrived — trust history.state */
        if (HIST.expect <= 0) return;
        HIST.expect = 0;
        try { HIST.depth = (history.state && history.state.zaposOverlay) ? (history.state.d || 1) : 0; } catch (e) {}
        syncOverlayHistory();
      }, 1200);
      history.go(-n);
    }
  } catch (e) {}
  OVERLAY.hist = HIST.depth > 0;
}
function scheduleHistSync() {
  if (HIST.sched) return; HIST.sched = true;
  setTimeout(function () { HIST.sched = false; syncOverlayHistory(); }, 0);
}
function overlayPushHistory() { OVERLAY.openedAt = Date.now(); scheduleHistSync(); }
function reconcileOverlayHistory() { scheduleHistSync(); }
function overlayClearHistory() { scheduleHistSync(); }
function closeTopLayer() {
  var L = overlayLayers(), top = L[L.length - 1];
  if (!top) return false;
  if (top === "tour") { try { endTour(); } catch (e) {} }
  else if (top === "zap") { try { closeZapAssistant(true); } catch (e) {} }
  else if (top === "sheet") { try { closeSheet(true); } catch (e) {} }
  else if (top === "detail") { try { closeCardDetail(true); } catch (e) {} }
  else if (top === "card") { try { hideMapPlaceCard(); } catch (e) {} }
  else if (top === "map") { try { closeMapOverlay(); } catch (e) {} }
  hideScrimIfIdle();
  return true;
}
function dismissTopOverlay(fromPop) {
  closeTopLayer();
  scheduleHistSync();
  try { armTapShield(450); } catch (eS) {}
}
function dismissAllOverlays(fromPop) {
  OVERLAY.closingFromPop = !!fromPop;
  try { closeZapAssistant(); } catch (e) {}
  try { closeSheet(true); } catch (e) {}
  try { closeCardDetail(true); } catch (e) {}
  try { closeMapOverlay(); } catch (e) {}
  try { hideMapPlaceCard(); } catch (e) {}
  hideScrimIfIdle();
  if (!fromPop) overlayClearHistory();
  else OVERLAY.hist = false;
  OVERLAY.closingFromPop = false;
}
function sheet(title, html, bind) {
  // fresh body each time: listeners bound by the previous sheet must not fire here (the music list's
  // [data-m] handler used to close Edit Apps when you tapped ↑/↓/toggle, which also use data-m)
  try { closeCardDetail(true); } catch (eCd) {}
  var old = $("#sheetBody"), nb = old.cloneNode(false); old.parentNode.replaceChild(nb, old);
  var sh = $("#sheet");
  $("#sheetTitle").textContent = title; nb.innerHTML = html;
  if (sh) {
    try { portalToBody(sh); } catch (eP) {}
    /* clear any stale inline display/pointer-events (QA dismiss or prior close paths) */
    try {
      sh.style.display = "";
      sh.style.visibility = "";
      sh.style.opacity = "";
      sh.style.pointerEvents = "";
      sh.style.transform = "";
      sh.removeAttribute("aria-hidden");
    } catch (eSt) {}
    sh.hidden = false;
    sh.scrollTop = 0;
    crispifyOverlay(sh);
  }
  lockPageScroll();
  showScrim("sheet");
  armOverlayGuard(480);
  overlayPushHistory();
  if (bind) bind($("#sheetBody"));
  try { if (sh) sh.scrollTop = 0; } catch (eS) {}
}
/* Eat the ghost click that follows the opening gesture so it cannot activate sheet/detail controls
   (Markets: ghost click was landing on #holdChart / .pk and dismissing or committing). */
(function bindOverlayGhostGuard() {
  function bind(el) {
    if (!el || el._ghostGuard) return; el._ghostGuard = true;
    function guard(e) {
      if (el.hidden) return;
      if (!overlayGuardActive()) return;
      try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } catch (err) {}
    }
    el.addEventListener("click", guard, true);
    el.addEventListener("pointerup", guard, true);
    el.addEventListener("touchend", guard, true);
  }
  bind($("#sheet"));
  bind($("#xpMk"));
  bind($("#xpWx"));
  bind($("#zapSheet"));
})();
function closeSheet(skipHist) {
  try { var ae0 = document.activeElement; if (ae0 && ae0 !== document.body && ae0.blur && ae0.closest && ae0.closest("#sheet,#zapSheet,.xp")) ae0.blur(); } catch (eBl) {}
  var sh = $("#sheet"); if (sh) { sh.hidden = true; try { sh.classList.remove("finder-sheet"); sh.style.transform = ""; } catch (e) {} }
  hideScrimIfIdle();
  overlayClearHistory();
  try { unlockPageScroll(); } catch (eU) {}
  try { armTapShield(450); } catch (e2) {}
}
$("#sheetClose").addEventListener("click", function () { dismissTopOverlay(false); });
/* Scrim: pointerdown closes and blocks the tap from hitting content underneath */
(function bindScrimDismiss() {
  var sc = $("#scrim"); if (!sc) return;
  function eat(e) {
    if (sc.hidden) return;
    if (Date.now() < SCRIM_IGNORE_UNTIL) {
      try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      return;
    }
    e.preventDefault(); e.stopPropagation();
    dismissTopOverlay(false);
  }
  sc.addEventListener("pointerdown", eat, { capture: true });
  sc.addEventListener("click", eat, { capture: true });
  sc.addEventListener("touchend", function (e) {
    if (sc.hidden) return;
    if (Date.now() < SCRIM_IGNORE_UNTIL) {
      try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      return;
    }
    e.preventDefault(); e.stopPropagation();
    dismissTopOverlay(false);
  }, { capture: true, passive: false });
})();
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if (!anyOverlayOpen()) return;
  e.preventDefault();
  dismissTopOverlay(false);
});
window.addEventListener("popstate", function (ev) {
  var st = ev && ev.state, d = (st && st.zaposOverlay) ? (st.d || 1) : 0;
  if (HIST.expect > 0) { HIST.expect--; if (!HIST.expect) clearTimeout(HIST.fb); HIST.depth = d; syncOverlayHistory(); return; }
  if (d >= HIST.depth) { HIST.depth = d; syncOverlayHistory(); return; } /* forward / no-op */
  var n = HIST.depth - d; HIST.depth = d;
  /* v4.9.2 guard kept: a Back within 900ms of opening never closes the layer just opened —
     its entry is restored instead so history stays in sync */
  if (Date.now() - (OVERLAY.openedAt || 0) < 900) { syncOverlayHistory(); return; }
  for (var i = 0; i < n; i++) { if (!closeTopLayer()) break; }
  try { armTapShield(450); } catch (eS) {}
  syncOverlayHistory();
});
/* Swipe down on sheet / assistant to close (phones) */
(function bindOverlaySwipe() {
  function bindSwipe(el) {
    if (!el || el._zapSwipe) return; el._zapSwipe = true;
    var y0 = 0, active = false;
    el.addEventListener("touchstart", function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      var t = e.target;
      /* v4.8.0: never hijack touches inside form fields (iOS wallet paste / caret) */
      if (t && t.closest && t.closest("input,textarea,select,[contenteditable=true],.field")) return;
      if (!(t.closest && (t.closest(".sheet-h") || t.closest(".zap-h") || t.closest(".xp-h") || t === el))) {
        var rect = el.getBoundingClientRect();
        if (e.touches[0].clientY > rect.top + 56) return;
      }
      y0 = e.touches[0].clientY; active = true;
    }, { passive: true });
    el.addEventListener("touchmove", function (e) {
      if (!active || !e.touches || !e.touches.length) return;
      var dy = e.touches[0].clientY - y0;
      if (dy > 0) el.style.transform = "translateY(" + Math.round(Math.min(dy, 220)) + "px)";
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (!active) return; active = false;
      var dy = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : y0) - y0;
      el.style.transform = "";
      if (dy > 72) dismissTopOverlay(false);
    }, { passive: true });
  }
  bindSwipe($("#sheet"));
  bindSwipe($("#zapSheet"));
  bindSwipe($("#xpWx"));
  bindSwipe($("#xpMk"));
})();
$("#dEdit").addEventListener("click", function () { openEditApps(); });
$("#editMkBtn").addEventListener("click", function () { openEditCoins(); });
$("#cityBtn").addEventListener("click", function () { openCity(); });

function row(icon, label, sub, act) { return '<button class="mrow" data-go="' + act + '"><span class="mi" aria-hidden="true">' + icon + '</span><span class="grow">' + label + "<small>" + sub + '</small></span><span aria-hidden="true">›</span></button>'; }
function openMenu() {
  sheet("☰ MENU",
    "<h3>CONNECT</h3>" + row("⇄", "ZAP Connect", "Services, permissions, what’s shared, turn things off", "connect") +
    "<h3>DASHBOARD</h3>" + row("⚙", "Customize dashboard", "Show, hide or reorder cards", "dash") +
    "<h3>VIEW</h3>" + row("🚗", "Car view", document.documentElement.classList.contains("car-mode") ? "On · tap to turn off" : "Big navigation, voice and audio buttons", "car") + row("📺", "TV view", document.documentElement.classList.contains("tv-mode") ? "On · tap to turn off" : "Discover screen for a big screen and remote", "tv") +
    "<h3>APPS</h3>" + row("▦", "Edit apps", "Add, remove, show, hide or reorder apps", "apps") +
    "<h3>WEATHER</h3>" + row("☁", "Weather location", LOC.mode === "city" ? "City: " + esc(LOC.name) : "Using my location", "city") +
    "<h3>MARKETS</h3>" + row("₿", "Edit watchlist", COINS.map(function (c) { return esc(c.sym); }).join(" · ") || "Empty", "coins") +
    "<h3>SETTINGS</h3>" + row("⚙", "Settings", "Name, units, Motion on/off", "settings") +
    row("↻", "Check for updates", "Now running v" + VERSION, "update") +
    "<h3>HELP</h3>" + row("➜", "Page tour", "A quick walk through every card", "tour") + row("?", "Add to Home Screen", "3 steps to open it like a real app", "help") +
    '<p class="note" style="margin-top:12px">ZAPWISE//OS v' + VERSION + " · Everything you change is saved on this device only.</p>",
    function (b) {
      b.addEventListener("click", function (e) {
        var g = e.target.closest("[data-go]"); if (!g) return; var k = g.getAttribute("data-go");
        if (k === "connect") openConnect();
        else if (k === "dash") openDashEdit();
        else if (k === "car") { closeSheet(); v7SetCar(!document.documentElement.classList.contains("car-mode")); }
        else if (k === "tv") { closeSheet(); v7SetTv(!document.documentElement.classList.contains("tv-mode")); }
        else if (k === "apps") openEditApps();
        else if (k === "city") openCity();
        else if (k === "coins") openEditCoins();
        else if (k === "settings") openSettings();
        else if (k === "tour") { closeSheet(); setTimeout(startTour, 350); }
        else if (k === "update") { closeSheet(); checkForAppUpdate(true); }
        else openHelp();
      });
    });
}

// ----- edit apps -----
function openEditApps() {
  var html = '<button class="btn" id="eAdd" style="margin-bottom:12px">＋ ADD APP</button>' +
    '<p class="note" style="margin-bottom:10px">Switch an app on or off, use ▲ ▼ to move it, and ✕ to remove an app you added. Turn apps on or off and reorder them — they all show in the APPS grid. Music apps live in the NOW PLAYING card.</p><div id="eList"></div>' +
    '<button class="btn alt" id="appsReset" style="margin-top:12px">Reset apps to default</button>';
  sheet("▦ EDIT APPS", html, function (b) {
    function drawList() {
      var L = b.querySelector("#eList"); L.innerHTML = "";
      APPS.forEach(function (a, i) {
        var r = document.createElement("div"); r.className = "erow" + (a.on ? "" : " off");
        r.innerHTML = iconHTML(a) + '<span class="en">' + esc(a.name) + '</span>' +
          '<button class="sq" data-m="up" aria-label="Move ' + esc(a.name) + ' up"' + (i ? "" : " disabled") + '>▲</button>' +
          '<button class="sq" data-m="dn" aria-label="Move ' + esc(a.name) + ' down"' + (i < APPS.length - 1 ? "" : " disabled") + '>▼</button>' +
          (a.custom ? '<button class="sq" data-m="del" aria-label="Remove ' + esc(a.name) + '" style="color:var(--red)">✕</button>' : "") +
          '<button class="sw" role="switch" aria-checked="' + a.on + '" aria-label="Show ' + esc(a.name) + '" data-m="tog"></button>';
        r.addEventListener("click", function (e) {
          var m = e.target.closest("[data-m]"); if (!m) return; m = m.getAttribute("data-m");
          if (m === "tog") a.on = !a.on;
          else if (m === "up" && i) { APPS.splice(i, 1); APPS.splice(i - 1, 0, a); }
          else if (m === "dn" && i < APPS.length - 1) { APPS.splice(i, 1); APPS.splice(i + 1, 0, a); }
          else if (m === "del") { if (!confirm("Remove " + a.name + "?")) return; APPS.splice(i, 1); }
          saveApps(); renderApps(); drawList();
        });
        L.appendChild(r);
      });
    }
    b.querySelector("#eAdd").addEventListener("click", function () { openAddApp(); });
    b.querySelector("#appsReset").addEventListener("click", function () {
      if (!confirm("Reset apps to the default list? Apps you added will be removed.")) return;
      APPS = clone(DEFAULT_APPS); saveApps(); renderApps(); drawList(); toast("Apps reset");
    });
    drawList();
  });
}

// ----- + add app: categories + search (v3.3) -----
var APP_CATS = [
  { id: "social", name: "Social", icon: "💬", match: /instagram|tiktok|facebook|snapchat|threads|reddit|linkedin|pinterest|bluesky|mastodon|tumblr|lemon8|bereal|vsco|\bx\b|twitter|apollo|redditisfun/i },
  { id: "entertainment", name: "Fun", icon: "🎬", match: /youtube|netflix|twitch|hulu|disney|\bmax\b|peacock|paramount|primevideo|tubi|crunchyroll|vimeo|roku|appletv|plex|imdb|letterboxd|capcut|canva|adobe|lightroom|photoshop|davinci|descript/i },
  { id: "lifestyle", name: "Lifestyle", icon: "🌿", match: /fitness|strava|myfitnesspal|fitbit|calm|headspace|duolingo|kindle|goodreads|news|cnn|nytimes|bbc|wikipedia|ring|nest|alexa|findmy|photos|gphotos|camera|clock|weather|translate|health|uber(?!eats)|doordash/i },
  { id: "music", name: "Music", icon: "🎵", match: /spotify|(^|[^a-z])music([^a-z]|$)|pandora|soundcloud|deezer|tidal|shazam|bandcamp|audible|podcast|ytmusic|amazonmusic|applemusic/i },
  { id: "shop", name: "Shopping", icon: "🛍️", match: /amazon(?!music)|ebay|etsy|walmart|target|costco|shein|temu|poshmark|bestbuy|shopify|aliexpress|nike/i },
  { id: "money", name: "Money", icon: "💸", match: /venmo|cash|paypal|zelle|coinbase|binance|robinhood|chase|bank|amex|capital|chime|stripe|mint|creditkarma|wells|quickbooks|applepay|googlepay/i },
  { id: "food", name: "Food", icon: "🍔", match: /doordash|ubereats|grubhub|instacart|starbucks|mcdonald|chipotle|opentable|resy|yelp|toast/i },
  { id: "travel", name: "Travel", icon: "✈️", match: /\buber\b|lyft|maps|waze|airbnb|booking|expedia|kayak|tripadvisor|delta|united|southwest|american|flightradar|citymapper|tesla|gasbuddy|googlemaps|applemaps/i },
  { id: "work", name: "Work", icon: "💼", match: /gmail|outlook|drive|docs|sheets|slides|notion|trello|asana|todoist|evernote|dropbox|onedrive|github|gitlab|figma|word|excel|powerpoint|calendar|mail|zoom|meet|slack|teams|keep|chrome|safari|edge|icloud|finder|shortcuts|notes|reminders|stackoverflow/i },
  { id: "ai", name: "AI", icon: "✨", match: /chatgpt|claude|gemini|grok|perplexity|copilot|character|midjourney|runway|eleven|poe|openai|chatgptalt/i },
  { id: "games", name: "Games", icon: "🎮", match: /fortnite|roblox|minecraft|steam|xbox|playstation|twitchigdb|spotifykids/i },
  { id: "utilities", name: "Utilities", icon: "🛠️", match: /settings|calculator|authenticator|lastpass|bitwarden|1password|phone|messages|whatsapp|messenger|telegram|discord|signal|skype|line|wechat|viber|groupme|zapwise|web\b/i }
];
/* Explicit one-category map — each catalog/default id appears in exactly one bucket */
var APP_CAT_BY_ID = {
  x: "social", twitter: "social", instagram: "social", tiktok: "social", facebook: "social", snapchat: "social",
  threads: "social", reddit: "social", linkedin: "social", pinterest: "social",
  youtube: "entertainment", netflix: "entertainment", twitch: "entertainment", hulu: "entertainment",
  disney: "entertainment", disneyplus: "entertainment", max: "entertainment", hbomax: "entertainment",
  peacock: "entertainment", paramount: "entertainment", primevideo: "entertainment", tubi: "entertainment",
  photos: "lifestyle", gphotos: "lifestyle", camera: "lifestyle", weather: "lifestyle", clock: "lifestyle",
  strava: "lifestyle", fitbit: "lifestyle", myfitnesspal: "lifestyle", calm: "lifestyle", headspace: "lifestyle",
  duolingo: "lifestyle", health: "lifestyle", fitness: "lifestyle",
  spotify: "music", music: "music", applemusic: "music", ytmusic: "music", amazonmusic: "music",
  pandora: "music", soundcloud: "music", tidal: "music", deezer: "music", shazam: "music",
  amazon: "shop", walmart: "shop", target: "shop", ebay: "shop", etsy: "shop", costco: "shop", bestbuy: "shop",
  uber: "lifestyle", lyft: "travel", doordash: "lifestyle", ubereats: "food", maps: "travel",
  chatgpt: "ai", grok: "ai", gemini: "ai", claude: "ai",
  phone: "utilities", messages: "utilities", mail: "work", calendar: "work", notes: "work", web: "utilities"
};
function catOf(c) {
  var id = String((c && c.id) || "").replace(/^p-/, "").toLowerCase();
  if (id && APP_CAT_BY_ID[id]) return APP_CAT_BY_ID[id];
  var hay = (c.id || "") + " " + (c.name || "");
  for (var i = 0; i < APP_CATS.length; i++) if (APP_CATS[i].match.test(hay)) return APP_CATS[i].id;
  return "more";
}
function appCatOf(a) {
  if (!a) return "more";
  var id = String(a.id || "").replace(/^p-/, "").toLowerCase();
  if (id && APP_CAT_BY_ID[id]) return APP_CAT_BY_ID[id];
  return catOf({ id: id || a.id, name: a.name });
}
function openAddApp(opt) {
  opt = opt || {};
  var html = '<label class="field find-field"><span class="find-label">FIND AN APP</span><input id="pkFilter" placeholder="Find an app…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="cat-chips" id="pkCats" role="tablist"></div>' +
    '<div class="pick-hint" id="pkHint">Suggested</div>' +
    '<div class="pick" id="pkGrid"></div>' +
    '<div class="custom-fold">' +
    '<button type="button" class="btn alt" id="caToggle">＋ Add custom app</button>' +
    '<div id="caPanel" hidden>' +
    '<label class="field">NAME<input id="caName" maxlength="14" placeholder="e.g. Instagram" autocomplete="off"></label>' +
    '<label class="field">LINK OR APP LINK<input id="caUrl" placeholder="e.g. instagram.com or instagram://" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="field">ICON</div><div class="glyphs" id="caG"></div>' +
    '<div class="field">COLOR</div><div class="colors" id="caC"></div>' +
    '<button class="btn" id="caAdd">＋ ADD CUSTOM APP</button>' +
    "</div></div>";
  sheet("⌕ FIND APPS", html, function (b) {
    try { $("#sheet").classList.add("finder-sheet"); } catch (e) {}
    var gSel = "letter", cSel = CUSTOM_COLORS[0], cat = "all", recent = [];
    try { recent = Store.getLocal("recentPins", []) || []; } catch (e) { recent = []; }
    function has(c) { return APPS.some(function (a) { return a.id === "p-" + c.id || a.id === c.id || (a.name && a.name === c.name); }); }
    function saveRecent(id) {
      recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 12);
      try { Store.setLocal("recentPins", recent); } catch (e) {}
    }
    function drawCats() {
      var chips = [{ id: "all", name: "All", icon: "▦" }].concat(APP_CATS).concat([{ id: "more", name: "More", icon: "…" }]);
      b.querySelector("#pkCats").innerHTML = chips.map(function (c) {
        var ic = c.icon ? '<span class="ci" aria-hidden="true">' + c.icon + "</span>" : "";
        return '<button type="button" class="cat-chip' + (c.id === cat ? " on" : "") + '" data-cat="' + c.id + '" role="tab" aria-selected="' + (c.id === cat) + '">' + ic + esc(c.name) + "</button>";
      }).join("");
    }
    function drawGrid() {
      var fq = ((b.querySelector("#pkFilter") || {}).value || "").trim().toLowerCase();
      var list;
      if (fq) {
        list = CATALOG.filter(function (c) {
          if ((c.name || "").toLowerCase().indexOf(fq) >= 0) return true;
          return (c.aliases || []).some(function (al) { return String(al).toLowerCase().indexOf(fq) >= 0; });
        });
        b.querySelector("#pkHint").textContent = list.length ? (list.length + " match" + (list.length === 1 ? "" : "es")) : "No matches — try another name";
      } else if (cat === "all") {
        var sug = recent.map(function (id) { return CATALOG.filter(function (c) { return c.id === id; })[0]; }).filter(Boolean);
        var rest = CATALOG.filter(function (c) { return recent.indexOf(c.id) < 0; });
        list = sug.concat(rest);
        b.querySelector("#pkHint").textContent = sug.length ? "Recent & suggested" : "Popular apps — tap to pin";
      } else {
        list = CATALOG.filter(function (c) { return catOf(c) === cat; });
        b.querySelector("#pkHint").textContent = list.length + " in " + (APP_CATS.concat([{ id: "more", name: "More" }]).filter(function (x) { return x.id === cat; })[0] || {}).name;
      }
      b.querySelector("#pkGrid").innerHTML = list.slice(0, 96).map(function (c) {
        var on = has(c);
        return '<button class="pk' + (on ? " added" : "") + '" data-pk="' + c.id + '" aria-label="' + (on ? "Added: " : "Add ") + esc(c.name) + '"><img src="' + c.icon + '" alt="" loading="lazy" decoding="async"><span>' + esc(c.name) + "</span>" + (on ? '<i class="pk-check">✓</i>' : "") + "</button>";
      }).join("") || '<p class="note">No matches.</p>';
    }
    b.querySelector("#pkCats").addEventListener("click", function (e) {
      var x = e.target.closest("[data-cat]"); if (!x) return;
      cat = x.getAttribute("data-cat"); drawCats(); drawGrid();
    });
    var pkF = b.querySelector("#pkFilter");
    if (pkF) {
      pkF.addEventListener("input", function () { cat = "all"; drawCats(); drawGrid(); });
      if (opt.focusSearch) setTimeout(function () { pkF.focus(); }, 60);
      if (opt.query) { pkF.value = opt.query; }
    }
    b.querySelector("#pkGrid").addEventListener("click", function (e) {
      var x = e.target.closest("[data-pk]"); if (!x) return;
      var c = CATALOG.filter(function (q) { return q.id === x.getAttribute("data-pk"); })[0];
      if (!c) return;
      if (has(c)) { toast(c.name + " is already on your grid"); return; }
      var a = { id: "p-" + c.id, name: c.name, url: c.url, icon: c.icon, glyph: "letter", letter: c.name, bg: "#111827", on: true, custom: true, pick: true };
      if (c.web) a.web = c.web; if (c.pkg) a.pkg = c.pkg;
      APPS.push(a); saveApps(); renderApps(); saveRecent(c.id); drawGrid();
      x.classList.add("pop"); toast(c.name + " pinned");
    });
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
      saveApps(); renderApps();
      b.querySelector("#caName").value = ""; b.querySelector("#caUrl").value = ""; drawPick();
      toast(nm + " added to your apps");
    });
    var caT = b.querySelector("#caToggle"), caP = b.querySelector("#caPanel");
    if (caT && caP) caT.addEventListener("click", function () {
      var open = caP.hidden; caP.hidden = !open;
      caT.textContent = open ? "▾ Hide custom app" : "＋ Add custom app";
      if (open) setTimeout(function () { try { caP.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }, 30);
    });
    drawCats(); drawGrid(); drawPick();
  });
}

// ----- theme picker -----
function wallpaperMode() {
  var m = "neon";
  try { m = Store.getLocal("wallpaper", "neon") || "neon"; } catch (e) {}
  if (m !== "neon" && m !== "stars" && m !== "off") m = "neon";
  return m;
}
function applyWallpaper(mode) {
  mode = (mode === "stars" || mode === "off" || mode === "neon") ? mode : "neon";
  try { Store.setLocal("wallpaper", mode); } catch (e) {}
  try {
    if (window.ZAPWALL) window.ZAPWALL.setMode(mode);
    else document.documentElement.setAttribute("data-wallpaper", mode);
  } catch (e2) {}
  return mode;
}
function openTheme() {
  function rowsHTML() {
    return THEMES.map(function (t) {
      var v = t.v, on = t.id === THEME.id;
      return '<button class="thm' + (on ? " on" : "") + '" data-th="' + t.id + '" aria-pressed="' + on + '" style="background:' + v.panel + ';color:' + v.cream + '"><span class="sw4" aria-hidden="true"><i style="background:' + v.void + '"></i><i style="background:' + v.cream + '"></i><i style="background:' + v.amber + '"></i><i style="background:' + v.cyan + '"></i></span><span><b style="color:' + v.amber + '">' + t.name + '</b><small>' + t.sub + '</small></span><span class="ck" style="color:' + v.cyan + '">' + (on ? "✓" : "") + "</span></button>";
    }).join("");
  }
  function wpHTML() {
    var cur = wallpaperMode();
    return [["neon","Neon City"],["stars","Stars"],["off","Off"]].map(function (r) {
      return '<button type="button" class="wp-chip' + (cur === r[0] ? " on" : "") + '" data-wp="' + r[0] + '">' + r[1] + "</button>";
    }).join("");
  }
  sheet("◐ THEME",
    '<p class="note" style="margin-bottom:10px">ZAPWISE//OS <b>v' + VERSION + '</b> · tap a theme to switch. Saved on this device.</p>' +
    '<div id="thList">' + rowsHTML() + "</div>",
    function (b) {
      b.querySelector("#thList").addEventListener("click", function (e) {
        var x = e.target.closest("[data-th]"); if (!x) return;
        applyTheme(x.getAttribute("data-th")); Store.set("theme", THEME.id); b.querySelector("#thList").innerHTML = rowsHTML(); toast("Theme: " + THEME.name);
      });
    });
}
$$("[data-theme-btn]").forEach(function (b) { b.addEventListener("click", openTheme); });

// ----- weather location -----
function openCity() {
  sheet("☁ WEATHER LOCATION",
    '<button class="btn alt" id="useGps">◎ Use my location</button>' +
    '<h3>OR TYPE A CITY</h3><label class="field">CITY<input id="cityQ" placeholder="e.g. Chicago" autocomplete="off"></label><div id="cityRes"></div>',
    function (b) {
      b.querySelector("#useGps").addEventListener("click", function () { LOC = { mode: "gps" }; saveLoc(); WX = null; closeSheet(); toast("Using your location"); refreshWeather(true); });
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
                saveLoc(); WX = null; closeSheet(); toast("Weather set to " + r.name); refreshWeather(true);
              });
            });
          }).catch(function () { b.querySelector("#cityRes").innerHTML = '<p class="note">Search is offline. Try again in a moment.</p>'; });
        }, 350);
      });
      setTimeout(function () { var i = b.querySelector("#cityQ"); i && i.focus && i.focus({ preventScroll: true }); }, 50);
    });
}


// ----- accounts (brokers / exchanges / wallets) + read-only public wallets -----
var ACCOUNT_CATALOG = [
  { id: "robinhood", name: "Robinhood", kind: "broker", url: "robinhood://", pkg: "com.robinhood.android", web: "https://robinhood.com", icon: "/os/icons/robinhood.jpg", bg: "#00c805", letter: "R" },
  { id: "webull", name: "Webull", kind: "broker", url: "webull://", pkg: "com.webull.trade", web: "https://www.webull.com", icon: "", bg: "#0d64f0", letter: "W" },
  { id: "fidelity", name: "Fidelity", kind: "broker", url: "fidelity://", pkg: "com.fidelity.android", web: "https://www.fidelity.com", icon: "", bg: "#4a90e2", letter: "F" },
  { id: "schwab", name: "Schwab", kind: "broker", url: "schwabmobile://", web: "https://www.schwab.com", icon: "", bg: "#00a0df", letter: "S" },
  { id: "etrade", name: "E*TRADE", kind: "broker", url: "etrade://", web: "https://us.etrade.com", icon: "", bg: "#6633cc", letter: "E" },
  { id: "vanguard", name: "Vanguard", kind: "broker", url: "vanguard://", web: "https://investor.vanguard.com", icon: "", bg: "#c41230", letter: "V" },
  { id: "public", name: "Public", kind: "broker", url: "public://", web: "https://public.com", icon: "", bg: "#111111", letter: "P" },
  { id: "sofi", name: "SoFi", kind: "bank", url: "sofi://", web: "https://www.sofi.com", icon: "", bg: "#00a1e0", letter: "S" },
  { id: "cashapp", name: "Cash App", kind: "bank", url: "cashme://", pkg: "com.square.cash", web: "https://cash.app", icon: "/os/icons/cashapp.jpg", bg: "#00d632", letter: "C" },
  { id: "coinbase", name: "Coinbase", kind: "exchange", url: "coinbase://", pkg: "com.coinbase.android", web: "https://www.coinbase.com", icon: "/os/icons/coinbase.jpg", bg: "#0052ff", letter: "C" },
  { id: "kraken", name: "Kraken", kind: "exchange", url: "kraken://", web: "https://www.kraken.com", icon: "", bg: "#5741d9", letter: "K" },
  { id: "binance", name: "Binance", kind: "exchange", url: "bnc://", pkg: "com.binance.dev", web: "https://www.binance.com", icon: "/os/icons/binance.jpg", bg: "#f0b90b", letter: "B" },
  { id: "cryptocom", name: "Crypto.com", kind: "exchange", url: "crypto://", web: "https://crypto.com", icon: "", bg: "#103f68", letter: "C" },
  { id: "gemini", name: "Gemini", kind: "exchange", url: "gemini://", web: "https://www.gemini.com", icon: "/os/icons/gemini.jpg", bg: "#00dcfa", letter: "G" },
  { id: "paypal", name: "PayPal", kind: "bank", url: "paypal://", pkg: "com.paypal.android.p2pmobile", web: "https://www.paypal.com", icon: "/os/icons/paypal.jpg", bg: "#0070ba", letter: "P" },
  { id: "chase", name: "Chase", kind: "bank", url: "chase://", pkg: "com.chase.sig.android", web: "https://www.chase.com", icon: "/os/icons/chase.jpg", bg: "#117aca", letter: "C" },
  { id: "bofa", name: "Bank of America", kind: "bank", url: "https://www.bankofamerica.com", web: "https://www.bankofamerica.com", icon: "", bg: "#e31837", letter: "B" },
  { id: "wellsfargo", name: "Wells Fargo", kind: "bank", url: "https://www.wellsfargo.com", web: "https://www.wellsfargo.com", icon: "", bg: "#d71e28", letter: "W" },
  { id: "capitalone", name: "Capital One", kind: "bank", url: "https://www.capitalone.com", web: "https://www.capitalone.com", icon: "", bg: "#004879", letter: "C" },
  { id: "citi", name: "Citi", kind: "bank", url: "https://www.citi.com", web: "https://www.citi.com", icon: "", bg: "#056dae", letter: "C" },
  { id: "usbank", name: "U.S. Bank", kind: "bank", url: "https://www.usbank.com", web: "https://www.usbank.com", icon: "", bg: "#0c2074", letter: "U" },
  { id: "pnc", name: "PNC", kind: "bank", url: "https://www.pnc.com", web: "https://www.pnc.com", icon: "", bg: "#ef6a00", letter: "P" },
  { id: "truist", name: "Truist", kind: "bank", url: "https://www.truist.com", web: "https://www.truist.com", icon: "", bg: "#2e1a47", letter: "T" },
  { id: "usaa", name: "USAA", kind: "bank", url: "https://www.usaa.com", web: "https://www.usaa.com", icon: "", bg: "#12395b", letter: "U" },
  { id: "navyfederal", name: "Navy Federal", kind: "bank", url: "https://www.navyfederal.org", web: "https://www.navyfederal.org", icon: "", bg: "#00305f", letter: "N" },
  { id: "chime", name: "Chime", kind: "bank", url: "https://www.chime.com", web: "https://www.chime.com", icon: "", bg: "#1ec677", letter: "C" },
  { id: "ally", name: "Ally", kind: "bank", url: "https://www.ally.com", web: "https://www.ally.com", icon: "", bg: "#650360", letter: "A" },
  { id: "discover", name: "Discover", kind: "bank", url: "https://www.discover.com", web: "https://www.discover.com", icon: "", bg: "#ff6000", letter: "D" },
  { id: "venmo", name: "Venmo", kind: "bank", url: "https://venmo.com", web: "https://venmo.com", icon: "", bg: "#008cff", letter: "V" },
  { id: "varo", name: "Varo", kind: "bank", url: "https://www.varomoney.com", web: "https://www.varomoney.com", icon: "", bg: "#1c3a5f", letter: "V" },
  { id: "current", name: "Current", kind: "bank", url: "https://current.com", web: "https://current.com", icon: "", bg: "#1a1a1a", letter: "C" },
  { id: "bank-custom", name: "Custom bank", kind: "bank", url: "", web: "", icon: "", bg: "#334155", letter: "＋" },
  { id: "metamask", name: "MetaMask", kind: "wallet", chainHint: "eth", url: "https://metamask.app.link/", web: "https://metamask.io", icon: "", bg: "#f6851b", letter: "M" },
  { id: "phantom", name: "Phantom", kind: "wallet", chainHint: "sol", url: "phantom://", web: "https://phantom.app", icon: "", bg: "#ab9ff2", letter: "P" },
  { id: "wallet-btc", name: "Bitcoin wallet", kind: "wallet", chainHint: "btc", url: "", web: "https://mempool.space", icon: "", bg: "#f7931a", letter: "₿" },
  { id: "wallet-eth", name: "Ethereum wallet", kind: "wallet", chainHint: "eth", url: "", web: "https://etherscan.io", icon: "", bg: "#627eea", letter: "Ξ" },
  { id: "wallet-sol", name: "Solana wallet", kind: "wallet", chainHint: "sol", url: "", web: "https://solscan.io", icon: "", bg: "#14f195", letter: "S" }
];
function loadAccounts() {
  try { migrateWalletsToAccounts(); } catch (e) {}
  var a = Store.get("accounts", null);
  return Array.isArray(a) ? a : [];
}
function saveAccounts(list) { Store.set("accounts", list); }
function migrateWalletsToAccounts() {
  if (Store.getLocal("acctMigrated", null)) return;
  var legacy = Store.get("wallets", null);
  var accts = Store.get("accounts", null);
  if (!Array.isArray(accts)) accts = [];
  if (Array.isArray(legacy) && legacy.length) {
    legacy.forEach(function (w) {
      var exists = accts.some(function (a) { return a.kind === "wallet" && a.address && w.address && a.address.toLowerCase() === String(w.address).toLowerCase(); });
      if (exists) return;
      accts.push({
        id: w.id || ("a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
        catalogId: w.chain === "btc" ? "wallet-btc" : w.chain === "eth" ? "wallet-eth" : w.chain === "sol" ? "wallet-sol" : "metamask",
        kind: "wallet",
        name: w.label || ({ btc: "Bitcoin wallet", eth: "Ethereum wallet", sol: "Solana wallet" }[w.chain] || "Wallet"),
        icon: "", bg: w.chain === "btc" ? "#f7931a" : w.chain === "eth" ? "#627eea" : "#14f195",
        letter: w.chain === "btc" ? "₿" : w.chain === "eth" ? "Ξ" : "S",
        chain: w.chain, address: w.address, bal: w.bal, balAt: w.balAt, err: w.err || null,
        url: "", web: w.chain === "btc" ? "https://mempool.space/address/" + encodeURIComponent(w.address) : w.chain === "eth" ? "https://etherscan.io/address/" + encodeURIComponent(w.address) : "https://solscan.io/account/" + encodeURIComponent(w.address)
      });
    });
    saveAccounts(accts);
  }
  try { Store.setLocal("acctMigrated", 1); } catch (e) {}
}
function accountIconHTML(a) {
  if (a.icon) return '<span class="at-ico"><img src="' + esc(a.icon) + '" alt=""></span>';
  return '<span class="at-ico" style="background:' + esc(a.bg || "#111827") + '"><span class="let">' + esc((a.letter || a.name || "?").charAt(0)) + "</span></span>";
}
function accountSubtotal(a) {
  var total = 0, n = 0, priced = 0, day = 0;
  if (a.kind === "bank") {
    n++;
    if (a.bal != null && !isNaN(a.bal)) { total += +a.bal; priced++; }
    return { total: total, n: n, priced: priced, day: null, bank: true };
  }
  if (a.kind === "wallet") {
    var usd = walletUsd(a);
    if (usd != null && !isNaN(usd)) {
      total += usd; priced++;
      var wch = walletChange(a);
      if (wch != null && !isNaN(wch)) day += usd * (wch / (100 + wch));
    }
    n++;
  }
  loadHoldings().forEach(function (h) {
    if (h.accountId !== a.id) return;
    n++;
    var px = holdingPrice(h), qty = +h.qty || 0;
    if (px == null || isNaN(px)) return;
    var val = px * qty;
    total += val; priced++;
    var ch = holdingChange(h);
    if (ch != null && !isNaN(ch)) day += val * (ch / (100 + ch));
  });
  return { total: total, n: n, priced: priced, day: day };
}
function renderAccounts() {
  var host = $("#acctGrid"); if (!host) return;
  var list = loadAccounts().filter(function (a) { return a.kind !== "bank"; }); /* v4.9.6: banks live in #hBk */
  if (!list.length) {
    host.innerHTML = '<p class="note acct-empty" role="listitem">No brokers or wallets yet. Tap <b>＋ ACCOUNT</b> — banks are in the Bank box under the ticker.</p>';
    return;
  }
  host.innerHTML = list.map(function (a) {
    var st = accountSubtotal(a);
    var chg = "";
    if (st.priced && st.day != null && !isNaN(st.day)) {
      chg = '<span class="at-chg ' + (st.day >= 0 ? "up" : "dn") + '">' + signedMoney(st.day) + "</span>";
    } else {
      chg = '<span class="at-chg">—</span>';
    }
    return '<button type="button" class="acct-tile" data-acct="' + esc(a.id) + '" role="listitem" aria-label="' + esc(a.name) + '">' +
      accountIconHTML(a) +
      '<span class="at-name">' + esc(a.name) + "</span>" +
      '<span class="at-val">' + (st.priced ? money(st.total) : "—") + "</span>" +
      chg + "</button>";
  }).join("");
}
function openAccountApp(a) {
  if (!a) return;
  if (a.kind === "wallet" && a.address) {
    var web = a.web || (a.chain === "btc" ? "https://mempool.space/address/" + encodeURIComponent(a.address)
      : a.chain === "eth" ? "https://etherscan.io/address/" + encodeURIComponent(a.address)
      : a.chain === "sol" ? "https://solscan.io/account/" + encodeURIComponent(a.address) : "");
    if (web) go(web);
    else toast("No link for this wallet");
    return;
  }
  if (a.kind === "bank") {
    /* v4.9.5: banks open the official site / universal link (opens the bank app if installed). Never an app store. */
    var andr = /android/i.test(navigator.userAgent || "");
    if (andr && a.pkg && a.url) { openApp(a); return; }
    var bw = a.web || (/^https?:/i.test(a.url || "") ? a.url : "");
    if (bw) { go(bw); return; }
    if (a.url) { openApp(a); return; }
    toast("No link yet — hold the tile to add one"); return;
  }
  if (!a.url && !a.web) { toast("No app link — long-press to edit"); return; }
  openApp({ id: a.catalogId || a.id, name: a.name, url: a.url || a.web, pkg: a.pkg, web: a.web || a.url });
}
function openEditAccount(acctId) {
  var list = loadAccounts();
  var a = list.filter(function (x) { return x.id === acctId; })[0];
  if (!a) return;
  if (a.kind === "bank") { try { refreshBankAccountsFromLink({ refresh: true }); } catch (e) {} return; }
  var isWal = a.kind === "wallet";
  sheet("✎ " + (a.name || "ACCOUNT").toUpperCase(),
    '<label class="field">NAME<input id="acName" maxlength="28" value="' + esc(a.name || "") + '"></label>' +
    (isWal
      ? ('<label class="field wal-field">PUBLIC ADDRESS<div class="wal-row"><input id="acAddr" ' + walletAddrAttrs() + ' value="' + esc(a.address || "") + '"><button type="button" class="btn wal-paste" data-wal-paste="1" aria-label="Paste address">PASTE</button></div></label><p class="note wal-detect" id="acDetect">Read-only. Never enter a seed phrase.</p>')
      : '<p class="note">Holdings assigned to this account roll into your net worth. Tap the tile to open the real app/site (never the App Store).</p>') +
    '<button class="btn" id="acSave" style="margin-top:12px">SAVE</button>' +
    '<button class="btn warn" id="acDel" style="margin-top:8px">Remove account</button>',
    function (b) {
      if (isWal) try { bindWalletAddrField(b, "acAddr", "acDetect"); } catch (eB) {}
      b.querySelector("#acSave").addEventListener("click", function () {
        var nm = (b.querySelector("#acName").value || "").trim().slice(0, 28) || a.name;
        var next = loadAccounts().map(function (x) {
          if (x.id !== a.id) return x;
          var row = Object.assign({}, x, { name: nm });
          if (isWal) {
            var addr = (b.querySelector("#acAddr").value || "").replace(/\s+/g, " ").trim();
            var chain = detectChain(addr);
            if (!chain) { toast("Need a valid BTC, ETH, or SOL address"); return x; }
            if (chain === "eth") addr = "0x" + addr.slice(2);
            row.address = addr; row.chain = chain; row.err = null; row.bal = null;
          }
          return row;
        });
        saveAccounts(next); closeSheet(); renderAccounts(); if (isWal) refreshWallets(true); renderHoldings(); toast("Account saved");
      });
      b.querySelector("#acDel").addEventListener("click", function () {
        if (!confirm("Remove " + (a.name || "this account") + "? Holdings stay, but become unassigned.")) return;
        saveAccounts(loadAccounts().filter(function (x) { return x.id !== a.id; }));
        var hs = loadHoldings().map(function (h) { if (h.accountId === a.id) { var c = Object.assign({}, h); delete c.accountId; return c; } return h; });
        saveHoldings(hs);
        closeSheet(); renderAccounts(); renderHoldings(); toast("Account removed");
      });
    });
}
function openAddAccount() {
  var cats = [
    { id: "all", name: "All" }, { id: "broker", name: "Brokers" }, { id: "exchange", name: "Exchanges" }, { id: "wallet", name: "Wallets" }
  ]; /* v4.9.6: banks via Bank box */
  var html = '<label class="field find-field"><span class="find-label">FIND AN ACCOUNT</span><input id="acFilter" placeholder="Chase, Robinhood, Coinbase, MetaMask…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="cat-chips" id="acCats" role="tablist"></div>' +
    '<div class="pick-hint" id="acHint">Tap to add — banks are in the Bank box under the ticker</div>' +
    '<div class="pick" id="acGrid"></div>' +
    '<div class="custom-fold"><button type="button" class="btn alt" id="acCustom">＋ Custom account</button></div>';
  sheet("＋ ADD ACCOUNT", html, function (b) {
    try { $("#sheet").classList.add("finder-sheet"); } catch (e) {}
    var cat = "all";
    function drawCats() {
      b.querySelector("#acCats").innerHTML = cats.map(function (c) {
        return '<button type="button" class="cat-chip' + (c.id === cat ? " on" : "") + '" data-cat="' + c.id + '">' + esc(c.name) + "</button>";
      }).join("");
    }
    function drawGrid() {
      var fq = ((b.querySelector("#acFilter") || {}).value || "").trim().toLowerCase();
      var list = ACCOUNT_CATALOG.filter(function (c) {
        if (c.kind === "bank") return false; /* v4.9.6 */
        if (cat !== "all" && c.kind !== cat) return false;
        if (!fq) return true;
        return (c.name || "").toLowerCase().indexOf(fq) >= 0 || c.id.indexOf(fq) >= 0;
      });
      b.querySelector("#acHint").textContent = list.length ? (list.length + " option" + (list.length === 1 ? "" : "s")) : "No matches — try Custom";
      b.querySelector("#acGrid").innerHTML = list.map(function (c) {
        var ic = c.icon ? '<img src="' + esc(c.icon) + '" alt="" loading="lazy">' : '<span class="mi" style="background:' + esc(c.bg || "#111") + ';display:grid;place-items:center;width:40px;height:40px;border-radius:12px;font-weight:900;color:#fff">' + esc(c.letter || c.name.charAt(0)) + "</span>";
        return '<button class="pk" data-ac="' + c.id + '" type="button">' + ic + "<span>" + esc(c.name) + "</span></button>";
      }).join("") || '<p class="note">No matches.</p>';
    }
    b.querySelector("#acCats").addEventListener("click", function (e) {
      var x = e.target.closest("[data-cat]"); if (!x) return; cat = x.getAttribute("data-cat"); drawCats(); drawGrid();
    });
    b.querySelector("#acFilter").addEventListener("input", function () { cat = "all"; drawCats(); drawGrid(); });
    b.querySelector("#acGrid").addEventListener("click", function (e) {
      var x = e.target.closest("[data-ac]"); if (!x) return;
      var c = ACCOUNT_CATALOG.filter(function (q) { return q.id === x.getAttribute("data-ac"); })[0];
      if (!c) return;
      closeSheet();
      if (c.kind === "wallet") openAddWalletAccount(c);
      else if (c.kind === "bank") openLinkBankStub();
      else commitAccountFromCatalog(c);
    });
    b.querySelector("#acCustom").addEventListener("click", function () { closeSheet(); openCustomAccount(); });
    drawCats(); drawGrid();
    setTimeout(function () { var i = b.querySelector("#acFilter"); i && i.focus && i.focus({ preventScroll: true }); }, 40);
  });
}
function commitAccountFromCatalog(c, extra) {
  var list = loadAccounts();
  if (list.length >= 24) { toast("Up to 24 accounts"); return; }
  var row = Object.assign({
    id: "a" + Date.now().toString(36),
    catalogId: c.id,
    kind: c.kind,
    name: c.name,
    icon: c.icon || "",
    bg: c.bg || "#111827",
    letter: c.letter || c.name.charAt(0),
    url: c.url || "",
    pkg: c.pkg,
    web: c.web || ""
  }, extra || {});
  list.push(row);
  saveAccounts(list);
  renderAccounts(); renderHoldings(); try { renderBanks(); } catch (eR) {}
  toast(c.name + " added");
  if (row.kind === "wallet") refreshWallets(true);
}
function openAddWalletAccount(c) {
  sheet("＋ " + (c.name || "WALLET").toUpperCase(),
    '<p class="note" style="margin-bottom:10px;color:#9ff0c8"><b>Read-only.</b> Never enter your seed phrase or private key. Public address only.</p>' +
    '<label class="field wal-field">PUBLIC ADDRESS' +
      '<div class="wal-row">' +
        '<input id="walAddr" ' + walletAddrAttrs() + ' placeholder="Paste your public wallet address">' +
        '<button type="button" class="btn wal-paste" data-wal-paste="1" aria-label="Paste address">PASTE</button>' +
      '</div></label>' +
    '<label class="field">NAME (OPTIONAL)<input id="walLabel" maxlength="24" placeholder="' + esc(c.name) + '" autocomplete="off"></label>' +
    '<p class="note wal-detect" id="walDetect">Paste an address — we auto-detect BTC, ETH, or SOL.</p>' +
    '<button class="btn" id="walSave" style="margin-top:12px">TRACK ADDRESS</button>',
    function (b) {
      bindWalletAddrField(b, "walAddr", "walDetect");
      setTimeout(function () { var i = b.querySelector("#walAddr"); i && i.focus && i.focus({ preventScroll: true }); }, 40);
      b.querySelector("#walSave").addEventListener("click", function () {
        var addr = (b.querySelector("#walAddr").value || "").replace(/\s+/g, " ").trim();
        var label = (b.querySelector("#walLabel").value || "").trim().slice(0, 24);
        var chain = detectChain(addr) || c.chainHint;
        if (!detectChain(addr)) { toast("Need a valid BTC, ETH, or SOL address"); return; }
        if (chain === "eth") addr = "0x" + addr.slice(2);
        var dup = loadAccounts().some(function (w) { return w.kind === "wallet" && w.address && w.address.toLowerCase() === addr.toLowerCase(); });
        if (dup) { toast("That address is already tracked"); return; }
        closeSheet();
        commitAccountFromCatalog(c, {
          kind: "wallet", chain: chain, address: addr, name: label || c.name,
          web: chain === "btc" ? "https://mempool.space/address/" + encodeURIComponent(addr)
            : chain === "eth" ? "https://etherscan.io/address/" + encodeURIComponent(addr)
            : "https://solscan.io/account/" + encodeURIComponent(addr)
        });
      });
    });
}
function openCustomAccount() {
  sheet("＋ CUSTOM ACCOUNT",
    '<label class="field">NAME<input id="caName" maxlength="28" placeholder="e.g. Ally Invest"></label>' +
    '<label class="field">WEBSITE OR APP LINK<input id="caUrl" placeholder="ally.com or ally://" autocomplete="off" autocapitalize="off"></label>' +
    '<button class="btn" id="caSave" style="margin-top:12px">ADD ACCOUNT</button>',
    function (b) {
      b.querySelector("#caSave").addEventListener("click", function () {
        var nm = (b.querySelector("#caName").value || "").trim().slice(0, 28);
        var u = (b.querySelector("#caUrl").value || "").trim();
        if (!nm) { toast("Type a name"); return; }
        if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u.replace(/^\/+/, "");
        commitAccountFromCatalog({ id: "custom", name: nm, kind: "custom", url: u, web: /^https?:/i.test(u) ? u : "", icon: "", bg: "#5eead4", letter: nm.charAt(0).toUpperCase() });
        closeSheet();
      });
    });
}

/* ===== v4.8.0 iOS-safe wallet address field (paste + chain detect) ===== */
function walletAddrAttrs() {
  return 'type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-form-type="other" data-lpignore="true"';
}
function bindWalletAddrField(root, inputId, detectId) {
  var inp = root.querySelector("#" + inputId); if (!inp) return;
  try {
    inp.removeAttribute("maxlength");
    inp.removeAttribute("pattern");
    inp.setAttribute("type", "text");
    inp.setAttribute("inputmode", "text");
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("autocapitalize", "off");
    inp.setAttribute("autocorrect", "off");
    inp.setAttribute("spellcheck", "false");
    inp.style.fontSize = "16px";
  } catch (eA) {}
  function setVal(v) {
    v = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    inp.value = v;
    try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
  }
  function updateDetect() {
    var a = (inp.value || "").trim();
    var chain = detectChain(a);
    var el = detectId ? root.querySelector("#" + detectId) : null;
    if (!el) return;
    if (!a) { el.textContent = "Paste an address — we auto-detect BTC, ETH, or SOL."; el.className = "note wal-detect"; return; }
    if (!chain) { el.textContent = "That doesn't look like a BTC (bc1/1/3), ETH (0x…), or SOL address yet."; el.className = "note wal-detect bad"; return; }
    el.textContent = "Detected: " + ({ btc: "Bitcoin", eth: "Ethereum", sol: "Solana" }[chain]) + " · read-only balance.";
    el.className = "note wal-detect ok";
  }
  inp.addEventListener("input", updateDetect);
  inp.addEventListener("paste", function (e) {
    /* allow native paste — never preventDefault */
    setTimeout(function () { setVal(inp.value); updateDetect(); }, 0);
  });
  var pasteBtn = root.querySelector("[data-wal-paste]");
  if (pasteBtn) {
    pasteBtn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      function apply(text) {
        if (!text) { toast("Clipboard empty — long-press the field to paste"); return; }
        setVal(text); updateDetect();
        toast("Address pasted");
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(apply).catch(function () {
          /* iOS Safari often needs user paste gesture — focus + hint */
          try { inp.focus(); } catch (eF) {}
          toast("Long-press the field → Paste (clipboard blocked)");
        });
      } else {
        try { inp.focus(); } catch (eF2) {}
        toast("Long-press the field → Paste");
      }
    });
  }
  updateDetect();
  return { updateDetect: updateDetect, setVal: setVal };
}

function shortAddr(a) {
  a = String(a || "");
  if (a.length <= 14) return a;
  return a.slice(0, 6) + "…" + a.slice(-4);
}
function detectChain(addr) {
  addr = String(addr || "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return "eth";
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/i.test(addr)) return "btc";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) && !/^bc1/i.test(addr)) return "sol";
  return null;
}
function walletCoinId(chain) {
  return chain === "btc" ? "bitcoin" : chain === "eth" ? "ethereum" : chain === "sol" ? "solana" : "";
}
function walletUsd(w) {
  if (!w || w.bal == null || isNaN(+w.bal)) return null;
  var id = walletCoinId(w.chain);
  var q = MK && MK.d && MK.d[id];
  if (!q || q.usd == null) return null;
  return (+w.bal) * (+q.usd);
}
function walletChange(w) {
  var id = walletCoinId(w && w.chain);
  var q = MK && MK.d && MK.d[id];
  return q ? q.usd_24h_change : null;
}
function fetchBtcBalance(addr) {
  return getJSON("https://mempool.space/api/address/" + encodeURIComponent(addr), 12000).then(function (j) {
    var cs = j && j.chain_stats || {};
    var sat = (cs.funded_txo_sum || 0) - (cs.spent_txo_sum || 0);
    return sat / 1e8;
  });
}
function fetchEthBalance(addr) {
  return postJSON("https://ethereum.publicnode.com", {
    jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"]
  }, 12000).then(function (j) {
    if (!j || j.error || j.result == null) throw new Error((j && j.error && j.error.message) || "ETH RPC");
    var hex = String(j.result);
    if (typeof BigInt !== "undefined") {
      try { return Number(BigInt(hex)) / 1e18; } catch (e) {}
    }
    var wei = parseInt(hex, 16);
    if (!isFinite(wei)) throw new Error("ETH parse");
    return wei / 1e18;
  });
}
function fetchSolBalance(addr) {
  return postJSON("https://solana.publicnode.com", {
    jsonrpc: "2.0", id: 1, method: "getBalance", params: [addr]
  }, 12000).then(function (j) {
    if (!j || j.error || !j.result) throw new Error((j && j.error && j.error.message) || "SOL RPC");
    return (j.result.value || 0) / 1e9;
  });
}
function fetchWalletBalance(w) {
  if (w.chain === "btc") return fetchBtcBalance(w.address);
  if (w.chain === "eth") return fetchEthBalance(w.address);
  if (w.chain === "sol") return fetchSolBalance(w.address);
  return Promise.reject(new Error("unknown chain"));
}
var _walBusy = false;
function loadWallets() {
  // Compat: wallet-kind accounts
  return loadAccounts().filter(function (a) { return a.kind === "wallet" && a.address; });
}
function refreshWallets(force) {
  var list = loadAccounts();
  var idxs = [];
  list.forEach(function (a, i) { if (a.kind === "wallet" && a.address) idxs.push(i); });
  if (!idxs.length) { try { renderAccounts(); } catch (e) {} return Promise.resolve(); }
  if (_walBusy && !force) return Promise.resolve();
  _walBusy = true;
  return Promise.all(idxs.map(function (i) {
    var w = list[i];
    return fetchWalletBalance(w).then(function (bal) {
      list[i] = Object.assign({}, w, { bal: bal, balAt: Date.now(), err: null });
    }).catch(function (err) {
      list[i] = Object.assign({}, w, { err: (err && err.message) || "offline" });
    });
  })).then(function () {
    saveAccounts(list); _walBusy = false;
    try { renderAccounts(); } catch (e) {}
    try { renderHoldings(); } catch (e) {}
  }).catch(function () { _walBusy = false; });
}
function openAddWallet(editIdx) {
  // legacy entry → account catalog wallets
  if (editIdx != null) {
    var w = loadWallets()[editIdx];
    if (w) openEditAccount(w.id);
    return;
  }
  openAddAccount();
}

// ----- markets edit -----
function openEditCoins() {
  sheet("₿ EDIT WATCHLIST",
    '<div id="cList"></div><h3>ADD A COIN</h3><label class="field">SEARCH<input id="coinQ" placeholder="e.g. Ethereum, SOL, Dogecoin" autocomplete="off" autocapitalize="off"></label><div id="coinRes"></div>' +
    '<p class="note" style="margin-top:10px">Prices come from CoinGecko. Stock tickers aren\'t available here: there\'s no free stock price feed a web page can use without a key.</p>' +
    '<button class="btn alt" id="coinReset" style="margin-top:12px">Reset to BTC + Gold</button>',
    function (b) {
      function drawList() {
        var L = b.querySelector("#cList"); L.innerHTML = COINS.length ? "" : '<p class="note">Empty. Search below to add a coin.</p>';
        COINS.forEach(function (c, i) {
          var r = document.createElement("div"); r.className = "erow";
          r.innerHTML = '<span class="en"><b style="color:var(--cyan)">' + esc(c.sym) + '</b> <small style="color:var(--dim)">' + esc(c.name) + '</small></span>' +
            '<button class="sq" data-m="up" aria-label="Move up"' + (i ? "" : " disabled") + '>▲</button><button class="sq" data-m="dn" aria-label="Move down"' + (i < COINS.length - 1 ? "" : " disabled") + '>▼</button><button class="sq" data-m="del" aria-label="Remove ' + esc(c.sym) + '" style="color:#ff4d5e">✕</button>';
          r.addEventListener("click", function (e) {
            var m = e.target.closest("[data-m]"); if (!m) return; m = m.getAttribute("data-m");
            if (m === "up" && i) { COINS.splice(i, 1); COINS.splice(i - 1, 0, c); }
            else if (m === "dn" && i < COINS.length - 1) { COINS.splice(i, 1); COINS.splice(i + 1, 0, c); }
            else if (m === "del") COINS.splice(i, 1);
            saveCoins(); renderMarkets(); drawList();
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
                COINS.push({ id: r.id, sym: String(r.symbol).toUpperCase().slice(0, 8), name: r.name }); saveCoins(); drawList(); renderMarkets(); refreshMarkets(); toast(r.symbol + " added");
              });
            });
          }).catch(function () { b.querySelector("#coinRes").innerHTML = '<p class="note">Search is busy or offline. Try again in a moment.</p>'; });
        }, 450);
      });
      b.querySelector("#coinReset").addEventListener("click", function () { COINS = clone(DEFAULT_COINS); saveCoins(); drawList(); refreshMarkets(); toast("Watchlist reset"); });
      drawList();
    });
}

function openAddHolding(editIdx) {
  var editing = editIdx != null ? loadHoldings()[editIdx] : null;
  var title = editing ? "✎ EDIT HOLDING" : "＋ ADD HOLDING";
  sheet(title,
    '<p class="note" style="margin-bottom:8px">Crypto &amp; gold price live via CoinGecko. Stocks: enter a manual price.</p>' +
    (editing ? "" : '<div class="qa-h" style="margin-bottom:6px">QUICK PICKS</div><div class="qa-row" id="holdQuick" role="list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>') +
    (editing ? "" : '<label class="field">SEARCH TICKER<input id="holdQ" placeholder="BTC, ETH, PAXG, AAPL…" autocomplete="off" autocapitalize="characters"></label><div id="holdRes"></div>') +
    '<div id="holdForm"' + (editing ? "" : ' hidden') + '>' +
    '<label class="field">SYMBOL<input id="holdSym" maxlength="12" value="' + esc(editing ? editing.sym : "") + '" ' + (editing ? "readonly" : "") + '></label>' +
    '<label class="field">NAME<input id="holdName" maxlength="40" value="' + esc(editing ? (editing.name || "") : "") + '"></label>' +
    '<label class="field">QUANTITY<input id="holdQty" type="number" step="any" min="0" value="' + esc(editing ? String(editing.qty) : "") + '" placeholder="e.g. 0.5"></label>' +
    '<label class="field">COST BASIS / UNIT (OPTIONAL)<input id="holdCost" type="number" step="any" min="0" value="' + esc(editing && editing.cost != null ? String(editing.cost) : "") + '" placeholder="What you paid"></label>' +
    '<label class="field" id="holdPxWrap"' + ((editing && editing.kind === "stock") || false ? "" : (editing ? " hidden" : " hidden")) + '>MANUAL PRICE (STOCKS)<input id="holdPx" type="number" step="any" min="0" value="' + esc(editing && editing.manualPrice != null ? String(editing.manualPrice) : "") + '" placeholder="Current USD price"></label>' +
    '<label class="field">ACCOUNT<select id="holdAcct"><option value="">Unassigned</option></select></label>' +
    '<input type="hidden" id="holdKind" value="' + esc(editing ? editing.kind : "crypto") + '">' +
    '<input type="hidden" id="holdId" value="' + esc(editing ? (editing.id || "") : "") + '">' +
    '<button class="btn" id="holdSave" style="margin-top:12px">' + (editing ? "SAVE" : "ADD HOLDING") + "</button></div>",
    function (b) {
      var picked = editing ? { id: editing.id, sym: editing.sym, name: editing.name, kind: editing.kind } : null;
      (function fillQuick() {
        var hq = b.querySelector("#holdQuick"); if (!hq) return;
        var have = {};
        loadHoldings().forEach(function (h) { if (h.id) have[h.id] = 1; if (h.sym) have[String(h.sym).toUpperCase()] = 1; });
        hq.innerHTML = QUICK_PICKS.map(function (p) {
          var on = !!(have[p.id] || have[p.sym]);
          return '<button type="button" class="chip' + (on ? " on" : "") + '" data-hq="' + esc(p.id) + '"' + (on ? " disabled" : "") + '>' + esc(p.sym) + "</button>";
        }).join("");
        hq.addEventListener("click", function (e) {
          var x = e.target.closest("[data-hq]"); if (!x || x.disabled) return;
          var p = QUICK_PICKS.filter(function (q) { return q.id === x.getAttribute("data-hq"); })[0];
          if (!p) return;
          closeSheet();
          try { quickAddHolding(p); } catch (err) {}
        });
      })();
      (function fillAccts() {
        var sel = b.querySelector("#holdAcct"); if (!sel) return;
        var cur = editing && editing.accountId || "";
        loadAccounts().filter(function (a) { return a.kind !== "wallet"; }).forEach(function (a) {
          var o = document.createElement("option"); o.value = a.id; o.textContent = a.name; if (a.id === cur) o.selected = true; sel.appendChild(o);
        });
      })();
      function showForm(p) {
        picked = p;
        b.querySelector("#holdForm").hidden = false;
        b.querySelector("#holdSym").value = p.sym;
        b.querySelector("#holdName").value = p.name || "";
        b.querySelector("#holdKind").value = p.kind;
        b.querySelector("#holdId").value = p.id || "";
        var wrap = b.querySelector("#holdPxWrap");
        if (wrap) wrap.hidden = p.kind !== "stock";
      }
      function addStockManual(sym) {
        showForm({ id: "", sym: sym.toUpperCase(), name: sym.toUpperCase(), kind: "stock" });
      }
      var tm, qEl = b.querySelector("#holdQ");
      if (qEl) qEl.addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 1) { b.querySelector("#holdRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          var uq = q.toUpperCase();
          // Gold shortcuts
          var goldHit = /^(PAXG|GOLD|XAU)$/i.test(q);
          getJSON("https://api.coingecko.com/api/v3/search?query=" + encodeURIComponent(q)).then(function (j) {
            var R = (j.coins || []).slice(0, 6);
            if (goldHit && !R.some(function (r) { return r.id === "pax-gold"; })) {
              R.unshift({ id: "pax-gold", symbol: "PAXG", name: "PAX Gold" });
            }
            var html = R.map(function (r, i) {
              var kind = r.id === "pax-gold" ? "gold" : "crypto";
              return '<button class="res" data-ci="' + i + '" data-kind="' + kind + '"><b>' + esc(String(r.symbol).toUpperCase()) + '</b> <small>' + esc(r.name) + '</small><span class="add">＋</span></button>';
            }).join("");
            html += '<button class="res" data-stock="1"><b>' + esc(uq) + '</b> <small>Stock / ETF · manual price</small><span class="add">＋</span></button>';
            b.querySelector("#holdRes").innerHTML = html || '<p class="note">No match.</p>';
            $$("[data-ci]", b.querySelector("#holdRes")).forEach(function (x) {
              x.addEventListener("click", function () {
                var r = R[+x.getAttribute("data-ci")];
                showForm({ id: r.id, sym: String(r.symbol).toUpperCase().slice(0, 10), name: r.name, kind: x.getAttribute("data-kind") || "crypto" });
              });
            });
            var st = b.querySelector("[data-stock]");
            if (st) st.addEventListener("click", function () { addStockManual(uq); });
          }).catch(function () {
            b.querySelector("#holdRes").innerHTML = '<button class="res" data-stock="1"><b>' + esc(uq) + '</b> <small>Stock / ETF · manual price</small><span class="add">＋</span></button><p class="note">Coin search offline — you can still add a stock with a manual price.</p>';
            var st = b.querySelector("[data-stock]");
            if (st) st.addEventListener("click", function () { addStockManual(uq); });
          });
        }, 400);
      });
      b.querySelector("#holdSave").addEventListener("click", function () {
        var sym = (b.querySelector("#holdSym").value || "").trim().toUpperCase().slice(0, 12);
        var name = (b.querySelector("#holdName").value || "").trim().slice(0, 40) || sym;
        var qty = parseFloat(b.querySelector("#holdQty").value);
        var costRaw = b.querySelector("#holdCost").value;
        var cost = costRaw === "" ? null : parseFloat(costRaw);
        var kind = b.querySelector("#holdKind").value || "crypto";
        var id = b.querySelector("#holdId").value || "";
        var pxEl = b.querySelector("#holdPx");
        var manualPrice = pxEl && pxEl.value !== "" ? parseFloat(pxEl.value) : null;
        if (!sym) { toast("Pick a ticker"); return; }
        if (!(qty > 0)) { toast("Enter a quantity"); return; }
        if (kind === "stock" && !(manualPrice > 0)) { toast("Stocks need a manual price"); return; }
        var list = loadHoldings();
        var acctId = (b.querySelector("#holdAcct") && b.querySelector("#holdAcct").value) || "";
        var row = { id: id, sym: sym, name: name, kind: kind, qty: qty, cost: cost };
        if (kind === "stock") row.manualPrice = manualPrice;
        if (acctId) row.accountId = acctId;
        if (editIdx != null && list[editIdx]) list[editIdx] = row;
        else {
          if (list.length >= 20) { toast("Up to 20 holdings"); return; }
          list.push(row);
        }
        saveHoldings(list);
        closeSheet();
        renderMarkets();
        refreshMarkets();
        toast(sym + (editIdx != null ? " updated" : " added"));
      });
      if (editing) showForm({ id: editing.id, sym: editing.sym, name: editing.name, kind: editing.kind });
    });
}
function openEditHolding(i) { openAddHolding(i); }

// ----- settings -----
function settingsHtml(sndOn, liteOn, tiltOn, motionOn) {
  return '<label class="field">YOUR NAME (FOR THE GREETING)<input id="stName" maxlength="20" placeholder="e.g. Sam" value="' + esc(S.name) + '" autocomplete="off"></label>' +
    '<div class="field">TEMPERATURE</div><div class="seg" id="stU"><button type="button" data-v="F">°F · mph</button><button type="button" data-v="C">°C · km/h</button></div>' +
    '<div class="field">ASSISTANT</div><p class="note">Tap the mic in the top bar to talk to ZAP AI (weather, directions, apps, calls). Mute its voice with the speaker button. No account required.</p>' +
    '<div class="field">MOTION</div><div class="seg" id="stAnim"><button type="button" data-v="1">On</button><button type="button" data-v="0">Off</button></div><p class="note">Hologram shine, map ring and the moving price tape. Off keeps everything still.</p>' +
    '<button class="btn" id="stSave" type="button">SAVE</button>' +
    '<h3>UPDATES</h3><button class="btn" id="stUpdate" type="button">Check for updates</button>' +
    '<p class="note">Running v' + VERSION + '. Theme: tap the color dot in the top bar.</p>' +
    '<h3>RESET</h3><button class="btn warn" id="stReset" type="button">Reset everything to defaults</button>';
}
function bindSettings(b, closeAfterSave) {
  var sndOn = !!Store.getLocal("uiSounds", false);
  var liteOn = !!Store.getLocal("liteMode", false);
  var tiltOn = Store.getLocal("tiltCards", null); if (tiltOn == null) tiltOn = false; else tiltOn = !!tiltOn;
  var motionOn = !!Store.getLocal("motionTilt", false);
  var u = S.units, snd = sndOn ? "1" : "0", lite = liteOn ? "1" : "0", tilt = tiltOn ? "1" : "0", motion = motionOn ? "1" : "0";
  function seg() { $$("#stU button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === u); }); }
  function segS() {}
  function segL() { $$("#stLite button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === lite); }); }
  function segT() { $$("#stTilt button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === tilt); }); }
  function segM() { $$("#stMotion button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === motion); }); }
  b.querySelector("#stU").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { u = x.getAttribute("data-v"); seg(); } });
  /* v4.4: UI sounds removed */
  var _stLite = b.querySelector("#stLite"); if (_stLite) _stLite.addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { lite = x.getAttribute("data-v"); segL(); } });
  var _stTilt = b.querySelector("#stTilt"); if (_stTilt) _stTilt.addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { tilt = x.getAttribute("data-v"); segT(); } });
  var _stMotion = b.querySelector("#stMotion"); if (_stMotion) _stMotion.addEventListener("click", function (e) {
    var x = e.target.closest("[data-v]"); if (!x) return;
    if (x.getAttribute("data-v") === "1") {
      loadFx3d().then(function (fx) {
        if (!fx) { motion = "0"; segM(); toast("3D layer unavailable"); return; }
        fx.requestMotionPermission().then(function (ok) {
          motion = ok ? "1" : "0"; segM();
          toast(ok ? "Motion tilt on" : "Motion permission denied");
        });
      }).catch(function () { motion = "0"; segM(); });
    } else { motion = "0"; segM(); if (window.ZAPFX3D) window.ZAPFX3D.setMotionEnabled(false); }
  });
  b.querySelector("#stSave").addEventListener("click", function () {
    var uc = u !== S.units; S.name = b.querySelector("#stName").value.trim().slice(0, 20); S.units = u; Store.set("settings", S);
    setUiSounds(false);
    try {
      Store.setLocal("liteMode", lite === "1");
      Store.setLocal("tiltCards", tilt === "1");
      Store.setLocal("motionTilt", motion === "1");
    } catch (e) {}
    if (window.ZAPCINE) {
      try { window.ZAPCINE.setEnabled(lite !== "1"); } catch (eC) {}
    }
    if (window.ZAPFX3D) {
      window.ZAPFX3D.setLite(lite === "1");
      window.ZAPFX3D.setTiltEnabled(tilt === "1");
      window.ZAPFX3D.setMotionEnabled(motion === "1");
    } else if (lite !== "1") {
      initCinematic().then(function (c) { if (!c) initFx3dLayer(); });
    } else {
      document.documentElement.classList.add("fx-lite");
      document.documentElement.classList.remove("fx-3d");
      document.documentElement.classList.remove("zw-cine");
    }
    minute(new Date());
    if (closeAfterSave) closeSheet();
    toast("Saved"); if (uc) refreshWeather(true);
  });
  var stUp = b.querySelector("#stUpdate");
  if (stUp) stUp.addEventListener("click", function () { try { checkForAppUpdate(true); } catch (e) { toast("Update check failed"); } });
  b.querySelector("#stReset").addEventListener("click", function () {
    if (!confirm("Reset apps, watchlist, weather city and settings to the defaults?")) return;
    Store.reset(); location.reload();
  });
  function segA() { var on = Store.getLocal("uiMotion", true) !== false; $$("#stAnim button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === (on ? "1" : "0")); }); }
  var _stAnim = b.querySelector("#stAnim"); if (_stAnim) _stAnim.addEventListener("click", function (e) {
    var x = e.target.closest("[data-v]"); if (!x) return;
    Store.setLocal("uiMotion", x.getAttribute("data-v") === "1"); applyMotion(); segA();
    toast(x.getAttribute("data-v") === "1" ? (motionWanted() ? "Motion on" : "Motion stays off: your phone asks for reduced motion") : "Motion off");
  });
  seg(); segS(); segL(); segT(); segM(); segA();
}
function mountSettingsScreen() {
  /* v4.2: settings live in MENU sheet only — keep mount for parity */
  openSettings();
}
function openSettings() {
  var sndOn = (function () { var v = Store.getLocal("uiSounds", null); return v === null || v === undefined ? true : !!v; })();
  var liteOn = !!Store.getLocal("liteMode", false);
  var tiltOn = Store.getLocal("tiltCards", null); if (tiltOn == null) tiltOn = false; else tiltOn = !!tiltOn;
  var motionOn = !!Store.getLocal("motionTilt", false);
  try { sfxOpen(); } catch (e) {}
  sheet("SETTINGS", settingsHtml(sndOn, liteOn, tiltOn, motionOn), function (b) {
    bindSettings(b, true);
    try { bindMuteBtn(); } catch (e2) {}
  });
}

// ----- help -----
function openHelp() {
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  sheet("? ADD TO HOME SCREEN",
    (standalone ? '<p class="note" style="color:#3ddc84;margin-bottom:10px">✓ You\'re already using it from your Home Screen.</p>' : "") +
    '<ol class="steps"><li><b>iPhone:</b> open <b>zapwiseai.com/os</b> in Safari → Share → Add to Home Screen.</li>' +
    '<li><b>Android:</b> open it in Chrome → menu ⋮ → Install app / Add to Home screen.</li>' +
    '<li><b>Computer:</b> bookmark the page or Install from the browser menu. It works in Chrome, Edge, Firefox and Safari.</li></ol>' +
    '<h3>GOOD TO KNOW</h3><p class="note">One tap opens an app if it\'s installed. If it isn\'t, its website opens after about a second. On a computer the website opens in a new tab. The live map shows your area (OpenStreetMap) with optional TomTom traffic colors; tap OPEN for turn-by-turn. ETA is an estimate. Weather asks for location once; tap Allow, or set a city in the menu. Your choices stay on this device only.</p>',
    null);
}

// ========== 12. return-to-app: keep the exact view + scroll, refresh live data quietly ==========
function saveScroll(now) {
  var sc = Object.assign({}, Store.ui().scroll);
  VIEWS.forEach(function (t) { var v = $("#v-" + t); if (v && !v.hidden) sc[t] = Math.round(v.scrollTop); });
  Store.setUI({ view: VIEW, scroll: sc }, now);
}
function restoreScroll() {
  var y = (Store.ui().scroll || {})[VIEW] || 0, v = $("#v-" + VIEW);
  if (v && Math.abs(v.scrollTop - y) > 1) v.scrollTop = y;
}
VIEWS.forEach(function (t) { var el = $("#v-" + t); if (el) el.addEventListener("scroll", function () { saveScroll(false); }, { passive: true }); });
var lastLive = Date.now();
function onReturn() {
  if (Store.ui().view && Store.ui().view !== VIEW) show(Store.ui().view); else restoreScroll();
  tick(); renderMap();
  if (Date.now() - lastLive < 20000) return; lastLive = Date.now(); // refresh live data, at most every 20 s
  refreshWeather(); refreshGPS();
  if (!MK || Date.now() - MK.at > 120000) refreshMarkets();
  try { refreshBankAccountsFromLink(); } catch (eBk) {}
}
function onLeave() { saveScroll(true); }
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") onReturn(); else onLeave(); });
window.addEventListener("pagehide", onLeave);
window.addEventListener("pageshow", function (e) { if (e.persisted) onReturn(); });
// when shared prefs change from elsewhere (stage 2 sync, or another tab), re-read them and redraw
function rehydrate() {
  S = Object.assign({}, DEFAULT_SET, Store.get("settings", {})); APPS = Store.get("apps", null); migrateApps();
  COINS = Store.get("coins", null) || clone(DEFAULT_COINS); LOC = readLoc();
  (function migrateThemeId() {
  var tid = Store.get("theme", "zapwise");
  var map = { neon: "zapwise", "neon-night": "zapwise", "amber-ops": "amber-cyan", arctic: "ice", terminal: "acid", sunset: "amber-cyan", mono: "ice", light: "ice", "ghost-white": "ice" };
  if (map[tid]) { tid = map[tid]; try { Store.set("theme", tid); } catch (e) {} }
  applyTheme(tid);
})(); renderApps(); renderMarkets(); minute(new Date()); refreshWeather(); refreshMarkets();
}
Store.onChange(function (k, v, src) { if (src === "remote") rehydrate(); });
window.addEventListener("storage", function (e) { if (e.key === "zapos.state" && e.newValue) { try { Store.applyRemote(JSON.parse(e.newValue)); } catch (x) {} } });
// ========== v3.0 phase 0: Phone = dial pad + favorites inside the dashboard (tel: works every time on iPhone) ==========
var FAVS = Store.get("favs", []);
function saveFavs() { Store.set("favs", FAVS); }
function cleanNum(n) { return String(n || "").replace(/[^0-9+*#]/g, ""); }
function fmtNum(n) { var d = n.replace(/\D/g, ""); if (/^\+/.test(n) || d.length !== 10) return n; return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6); }
function loadCallLog() {
  var log = Store.getLocal("callLog", null);
  return Array.isArray(log) ? log : [];
}
function saveCallLog(log) { Store.setLocal("callLog", log.slice(0, 40)); }
function favNameFor(num) {
  num = cleanNum(num);
  var hit = (FAVS || []).filter(function (f) { return cleanNum(f.num) === num; })[0];
  return hit ? hit.name : "";
}
function relCallTime(at) {
  var s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}
function logCall(n, name, tag) {
  n = cleanNum(n); if (!n) return;
  var log = loadCallLog();
  log.unshift({ n: n, name: name || favNameFor(n) || "", at: Date.now(), tag: tag || "OUT" });
  saveCallLog(log);
  try { renderLastCalls(); } catch (e) {}
}
function callNum(n) {
  n = cleanNum(n);
  if (!n) { toast("Type a number first"); return; }
  logCall(n);
  location.href = "tel:" + n;
}
function textNum(n) { n = cleanNum(n); location.href = n ? "sms:" + n : "sms:"; }
function renderLastCalls(host) {
  host = host || document.getElementById("dlLast");
  if (!host) return;
  var log = loadCallLog();
  var sig = Math.min(5, Math.max(1, Math.round((navigator.onLine === false ? 1 : 4))));
  var bars = "";
  for (var i = 0; i < 5; i++) bars += "<i class=\"" + (i < sig ? "on" : "") + "\"></i>";
  host.classList.add("comms-log");
  var head = '<div class="lc-h comms-h">' +
    '<span class="comms-title"><span class="lc-brack">◈</span> COMMS LOG</span>' +
    '<span class="lc-sig comms-sig" title="signal">' + bars + "</span>" +
    '<button type="button" class="lc-logcall" id="lcLogCall" title="Log a call manually">＋ LOG</button>' +
    (log.length ? '<button type="button" class="lc-clear" id="lcClear">CLR</button>' : "") +
    "</div>";
  if (!log.length) {
    host.innerHTML = head + '<div class="lc-empty">No outbound dials logged yet · tap ＋ LOG or call a favorite</div>';
    return;
  }
  host.innerHTML = head + '<div class="lc-list comms-list">' + log.slice(0, 12).map(function (c, i) {
    var label = c.name ? esc(c.name) : esc(fmtNum(c.n));
    var sub = c.name ? esc(fmtNum(c.n)) : "OUT";
    var tag = c.tag || "OUT";
    return '<button type="button" class="lc-row comms-row" data-lc="' + i + '" title="Tap to redial">' +
      '<span class="comms-idx">' + pad2(i + 1) + "</span>" +
      '<span class="lc-main"><b>' + label + '</b><small>' + sub + "</small></span>" +
      '<span class="lc-meta"><span class="comms-tag">' + esc(tag) + '</span><span class="lc-ago">' + relCallTime(c.at) + '</span><span class="lc-go">↺</span></span></button>';
  }).join("") + "</div>";
  try { host.classList.remove("comms-in"); void host.offsetWidth; host.classList.add("comms-in"); } catch (eA) {}
}
function bindLastCalls(host) {
  if (!host || host.dataset.bound === "1") return;
  host.dataset.bound = "1";
  var holdT = null, held = false;
  host.addEventListener("pointerdown", function (e) {
    var row = e.target.closest("[data-lc]"); if (!row) return;
    held = false; clearTimeout(holdT);
    holdT = setTimeout(function () {
      held = true;
      var i = +row.getAttribute("data-lc");
      var log = loadCallLog();
      if (!log[i]) return;
      log.splice(i, 1); saveCallLog(log); renderLastCalls(host); toast("Removed from COMMS LOG");
    }, 550);
  });
  host.addEventListener("pointerup", function () { clearTimeout(holdT); });
  host.addEventListener("pointerleave", function () { clearTimeout(holdT); });
  host.addEventListener("pointercancel", function () { clearTimeout(holdT); });
  host.addEventListener("click", function (e) {
    if (e.target.closest("#lcLogCall")) {
      e.preventDefault();
      var n = (prompt("Number to log?") || "").trim();
      if (!n) return;
      var nm = (prompt("Name (optional)?") || "").trim().slice(0, 24);
      logCall(cleanNum(n), nm);
      toast("Logged to COMMS LOG");
      return;
    }
    if (e.target.closest("#lcClear")) {
      e.preventDefault();
      if (!confirm("Clear COMMS LOG on this device?")) return;
      saveCallLog([]); renderLastCalls(host); toast("COMMS LOG cleared");
      return;
    }
    var row = e.target.closest("[data-lc]"); if (!row) return;
    if (held) { held = false; return; }
    var i = +row.getAttribute("data-lc");
    var log = loadCallLog();
    if (log[i]) {
      log[i].tag = "REDIAL";
      saveCallLog(log);
      callNum(log[i].n);
    }
  });
  host.addEventListener("contextmenu", function (e) { if (e.target.closest("[data-lc]")) e.preventDefault(); });
}
function dialerHtml() {
  var keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  return '<div class="dl-num empty" id="dlNum" aria-live="polite">Enter a number</div>' +
    '<div class="dl-pad" id="dlPad">' + keys.map(function (k) { return '<button type="button" class="dl-k" data-k="' + k[0] + '" aria-label="' + k[0] + '"><b>' + k[0] + "</b><small>" + k[1] + "</small></button>"; }).join("") + "</div>" +
    '<div class="dl-act"><button type="button" class="dl-sv" id="dlSave" aria-label="Save as favorite">☆</button><button type="button" class="dl-call" id="dlCall" aria-label="Call">CALL</button><button type="button" class="dl-sv" id="dlDel" aria-label="Delete last digit">⌫</button></div>' +
    '<div class="lc-strip comms-log" id="dlLast" aria-label="COMMS LOG"></div>' +
    '<h3>FAVORITES</h3><div id="dlFavs"></div>' +
    '<p class="note">Opens your phone dialer. COMMS LOG &amp; favorites stay on this device only.</p>';
}
function bindDialer(b) {
  var num = "";
  function draw() { var n = b.querySelector("#dlNum"); if (n) { n.textContent = num ? fmtNum(num) : "Enter a number"; n.classList.toggle("empty", !num); } }
  function drawFavs() {
    var host = b.querySelector("#dlFavs"); if (!host) return;
    host.innerHTML = FAVS.length ? FAVS.map(function (f, i) {
      return '<div class="dl-fav"><span class="grow"><b>' + esc(f.name) + "</b><small>" + esc(fmtNum(f.num)) + '</small></span>' +
        '<button type="button" class="sq" data-f="text" data-i="' + i + '" aria-label="Text ' + esc(f.name) + '">💬</button>' +
        '<button type="button" class="sq" data-f="call" data-i="' + i + '" aria-label="Call ' + esc(f.name) + '" style="color:var(--green)">📞</button>' +
        '<button type="button" class="sq" data-f="del" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '" style="color:var(--red)">✕</button></div>';
    }).join("") : '<button type="button" class="fav-add-tile" id="favEmptyAdd">＋ Add favorite</button>';
  }
  var pad = b.querySelector("#dlPad");
  if (pad) pad.addEventListener("click", function (e) { var k = e.target.closest("[data-k]"); if (!k || num.length >= 20) return; num += k.getAttribute("data-k"); draw(); });
  var del = b.querySelector("#dlDel"); if (del) del.addEventListener("click", function () { num = num.slice(0, -1); draw(); });
  var callB = b.querySelector("#dlCall"); if (callB) callB.addEventListener("click", function () { callNum(num); });
  var save = b.querySelector("#dlSave"); if (save) save.addEventListener("click", function () {
    if (!cleanNum(num)) { toast("Type a number first"); return; }
    var nm = (prompt("Name for this favorite?") || "").trim().slice(0, 24); if (!nm) return;
    FAVS.push({ name: nm, num: cleanNum(num) }); saveFavs(); drawFavs(); toast(nm + " saved to favorites");
  });
  var favs = b.querySelector("#dlFavs");
  if (favs) favs.addEventListener("click", function (e) {
    if (e.target.closest("#favEmptyAdd")) {
      e.preventDefault();
      if (!cleanNum(num)) { toast("Type a number, then tap ☆ or ＋ Add favorite"); return; }
      var nm = (prompt("Name for this favorite?") || "").trim().slice(0, 24); if (!nm) return;
      FAVS.push({ name: nm, num: cleanNum(num) }); saveFavs(); drawFavs(); toast(nm + " saved to favorites");
      return;
    }
    var x = e.target.closest("[data-f]"); if (!x) return; var f = FAVS[+x.getAttribute("data-i")], m = x.getAttribute("data-f"); if (!f) return;
    if (m === "call") callNum(f.num); else if (m === "text") textNum(f.num);
    else if (confirm("Remove " + f.name + " from favorites?")) { FAVS.splice(+x.getAttribute("data-i"), 1); saveFavs(); drawFavs(); }
  });
  b.addEventListener("keydown", function (e) { if (/^[0-9*#+]$/.test(e.key)) { num += e.key; draw(); } else if (e.key === "Backspace") { num = num.slice(0, -1); draw(); } else if (e.key === "Enter") callNum(num); });
  draw(); drawFavs();
  try { var lc = b.querySelector("#dlLast"); renderLastCalls(lc); bindLastCalls(lc); } catch (eLc) {}
}
function mountPhoneScreen() {
  var host = document.getElementById("phoneMount");
  if (!host) return;
  if (host.dataset.ready === "1") return;
  host.innerHTML = '<div class="places-h phone-h"><b>PHONE</b><span class="dim phone-sub">DIAL · FAVS</span></div>' + dialerHtml();
  host.dataset.ready = "1";
  bindDialer(host);
}
function openDial() {
  var host = document.getElementById("phoneMount");
  if (host) { mountPhoneScreen(); try { setHudTab("phone", { silent: true }); } catch (e) {} return; }
  sheet("PHONE", dialerHtml(), function (b) { bindDialer(b); });
}


// ========== v3.2 live app search (bundled catalog) — never App Store ==========
function catalogMatchScore(a, q) {
  var n = (a.name || "").toLowerCase();
  if (n === q) return 100;
  if (n.indexOf(q) === 0) return 80;
  if (n.indexOf(q) > 0) return 50;
  var als = a.aliases || [];
  for (var i = 0; i < als.length; i++) {
    var al = String(als[i]).toLowerCase();
    if (al === q) return 90;
    if (al.indexOf(q) === 0) return 70;
    if (al.indexOf(q) >= 0) return 40;
  }
  return 0;
}
function searchPool() {
  var seen = {}, out = [];
  function add(a) {
    if (!a || !a.name) return;
    var idk = (a.id || "").toLowerCase().replace(/^p-/, "");
    var nk = (a.name || "").toLowerCase();
    if (seen[idk] || seen["n:" + nk]) return;
    if (idk) seen[idk] = 1;
    seen["n:" + nk] = 1;
    out.push(a);
  }
  APPS.forEach(add);
  Object.keys(MEDIA).forEach(function (k) { add(Object.assign({ id: k }, MEDIA[k])); });
  CATALOG.forEach(add);
  return out;
}
function findApps(q, limit) {
  q = (q || "").trim().toLowerCase(); if (!q) return [];
  limit = limit || 12;
  return searchPool().map(function (a) { return { a: a, s: catalogMatchScore(a, q) }; })
    .filter(function (x) { return x.s > 0; })
    .sort(function (p, q) { return q.s - p.s || (p.a.name || "").localeCompare(q.a.name || ""); })
    .slice(0, limit).map(function (x) { return x.a; });
}
function findApp(q) { return findApps(q, 1)[0] || null; }
function isPinned(c) {
  return APPS.some(function (a) { return a.id === "p-" + c.id || a.id === c.id || (a.name && a.name === c.name); });
}
function pinFromCatalog(c) {
  if (!c) return;
  if (isPinned(c)) { toast(c.name + " is already on your grid"); return; }
  var a = { id: "p-" + c.id, name: c.name, url: c.url, icon: c.icon || ("/os/icons/" + c.id + ".jpg"), glyph: "letter", letter: c.name, bg: "#111827", on: true, custom: true, pick: true };
  if (c.web) a.web = c.web; if (c.pkg) a.pkg = c.pkg;
  APPS.push(a); saveApps(); renderApps(); toast(c.name + " pinned to your apps");
}
/* v4.15.0 web search provider (saved on this device) */
var SEARCH_PROVIDERS = {
  google: { name: "Google", url: "https://www.google.com/search?q=" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=" }
};
function searchProvKey() { var k = Store.getLocal("searchProv", "google"); return SEARCH_PROVIDERS[k] ? k : "google"; }
function searchProv() { return SEARCH_PROVIDERS[searchProvKey()]; }
function webSearchUrl(q) { return searchProv().url + encodeURIComponent(String(q || "").trim()); }
function runSearch(q) {
  q = (q || "").trim(); if (!q) return;
  var hits = findApps(q, 1);
  if (hits[0]) { openApp(hits[0]); return; }
  go(webSearchUrl(q));
}
(function () {
  var f = $("#srch"), inp = $("#srchQ"), hint = $("#srchHint"), drop = $("#srchDrop");
  if (!f || !inp || !drop) return;
  var active = -1, lastHits = [];
  function setHint(t) { if (hint) hint.textContent = t || ""; }
  function hideDrop() {
    drop.classList.remove("on"); drop.hidden = true; drop.innerHTML = ""; active = -1; lastHits = [];
    f.classList.remove("focus"); inp.setAttribute("aria-expanded", "false");
  }
  function paintActive() {
    var items = drop.querySelectorAll(".srch-item");
    items.forEach(function (el, i) { el.classList.toggle("active", i === active); });
  }
  function renderDrop(q) {
    q = (q || "").trim();
    if (!q) { hideDrop(); setHint(""); return; }
    lastHits = findApps(q, 10);
    var html = lastHits.map(function (a, i) {
      var pinned = isPinned(a);
      var catId = a.id && String(a.id).indexOf("p-") === 0 ? a.id.slice(2) : a.id;
      return '<button type="button" class="srch-item" role="option" data-i="' + i + '" id="srchOpt' + i + '">' +
        '<img src="' + esc(a.icon || ("/os/icons/" + catId + ".jpg")) + '" alt="" loading="lazy" decoding="async">' +
        '<span class="meta"><b>' + esc(a.name) + '</b><small>' + (a.web ? "APP OR WEB" : "OPEN") + "</small></span>" +
        '<span class="pin' + (pinned ? " on" : "") + '" data-pin="' + i + '" title="' + (pinned ? "Pinned" : "Pin to grid") + '" aria-label="' + (pinned ? "Pinned" : "Pin " + esc(a.name)) + '">' + (pinned ? "✓" : "+") + "</span></button>";
    }).join("");
    if (!lastHits.length) {
      html = '<div class="srch-empty">No catalog match — press Enter to search the web</div>' +
        '<button type="button" class="srch-item web" data-web="1"><span class="meta"><b>Search the web for “' + esc(q) + '”</b><small>GOOGLE</small></span></button>';
    }
    drop.innerHTML = html;
    drop.hidden = false; drop.classList.add("on"); f.classList.add("focus");
    inp.setAttribute("aria-expanded", "true");
    active = lastHits.length ? 0 : -1; paintActive();
    setHint(lastHits[0] ? ("↵ " + lastHits[0].name.toUpperCase()) : "↵ WEB");
  }
  try { f.setAttribute("novalidate", ""); } catch (e0) {}
  document.addEventListener("error", function (ev) { var t = ev.target; if (t && t.tagName === "IMG" && t.closest && t.closest(".srch-drop")) t.style.opacity = ".2"; }, true);
  f.addEventListener("submit", function (e) {
    e.preventDefault(); e.stopPropagation();
    var v = inp.value;
    if (active >= 0 && lastHits[active]) openApp(lastHits[active]);
    else runSearch(v);
    inp.blur(); inp.value = ""; hideDrop(); setHint("");
  });
  var tmr;
  inp.addEventListener("input", function () {
    clearTimeout(tmr);
    var v = inp.value;
    tmr = setTimeout(function () { renderDrop(v); }, 40);
  });
  inp.addEventListener("focus", function () { if (inp.value.trim()) renderDrop(inp.value); f.classList.add("focus"); });
  inp.addEventListener("keydown", function (e) {
    if (!drop.classList.contains("on")) return;
    var n = lastHits.length;
    if (e.key === "ArrowDown") { e.preventDefault(); if (!n) return; active = (active + 1) % n; paintActive(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!n) return; active = (active - 1 + n) % n; paintActive(); }
    else if (e.key === "Escape") { hideDrop(); }
  });
  drop.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep focus
  drop.addEventListener("click", function (e) {
    var pin = e.target.closest("[data-pin]");
    if (pin) {
      e.stopPropagation();
      var i = +pin.getAttribute("data-pin");
      pinFromCatalog(lastHits[i]);
      renderDrop(inp.value);
      return;
    }
    var web = e.target.closest("[data-web]");
    if (web) { go(webSearchUrl(inp.value)); inp.value = ""; hideDrop(); return; }
    var item = e.target.closest("[data-i]");
    if (!item) return;
    var i = +item.getAttribute("data-i");
    if (lastHits[i]) openApp(lastHits[i]);
    inp.value = ""; hideDrop();
  });
  document.addEventListener("click", function (e) { if (!f.contains(e.target)) hideDrop(); });
})();
window.ZAPOS = { store: Store, version: VERSION, openCardDetail: openCardDetail, closeCardDetail: closeCardDetail, toggleXp: toggleXp, setHudTab: setHudTab, forceCardsVisible: forceCardsVisible, armTapShield: armTapShield, openMapsHere: openMapsHere, closeMapOverlay: closeMapOverlay, catalog: CATALOG.length, accounts: ACCOUNT_CATALOG.length, openDirectionsTo: openDirectionsTo, placeLL: placeLL, showMapPlaceCard: showMapPlaceCard, loadAccounts: loadAccounts, loadPlaces: loadPlaces, setGPS: function (g) { GPS = g; Store.setLocal("gps", GPS); try { updateGpsLockChip(); } catch (e) {} }, mapFollow: function (on) { MAP.follow = !!on; }, updateSkyline: updateSkyline, setUiSounds: setUiSounds, sfxTap: sfxTap, sfxSuccess: sfxSuccess, sfxError: sfxError, sunPeriodNow: sunPeriodNow }; // for the stage 2 sync add-on + QA

// ========== v3.1 concept chrome: menu, today ==========
var menuBtn = $("#menuBtn"); if (menuBtn) menuBtn.addEventListener("click", openMenu);
/* Work Mode removed in v3.5 — no visible effect for users */
(function bindToday() {
  var cal = $("#tdCal"), note = $("#tdNote");
  function findById(id) { return APPS.filter(function (a) { return a.id === id; })[0]; }
  if (cal) cal.addEventListener("click", function () { try { v6Agenda(); } catch (eAg) { var a = findById("calendar"); if (a) openApp(a); else openApp({ url: "calshow://", web: "https://calendar.google.com" }); } });
  if (note) note.addEventListener("click", function () { var a = findById("notes"); if (a) openApp(a); else openApp({ url: "mobilenotes://", web: "https://keep.google.com" }); });
})();


// ========== v3.8 cyberpunk pack (original designs) ==========
var UI_SOUNDS = false;
function setUiSounds() { UI_SOUNDS = false; try { Store.setLocal("uiSounds", false); } catch (e) {} }
function sfxTone() {}
function sfxTap() {}
function sfxOpen() {}
function sfxBoot() {}
function sfxSuccess() {}
function sfxError() {}
function sfxChime() {}
function sfxCharge() {}
function primeUiAudio() {}
function bindMuteBtn() {}
function bindChargeUp() {
  var root = $("#app"); if (!root || root._chargeBound) return;
  root._chargeBound = true;
  root.addEventListener("pointerdown", function (e) {
    var card = e.target && e.target.closest ? e.target.closest(".card.br, .acct-tile, .place-chip, .thm, .btn, .dock button, .tab") : null;
    if (!card) return;
    card.classList.add("charge");
    sfxCharge();
    var clear = function () { card.classList.remove("charge"); };
    card.addEventListener("pointerup", clear, { once: true });
    card.addEventListener("pointerleave", clear, { once: true });
    card.addEventListener("pointercancel", clear, { once: true });
  }, { passive: true });
}
function sunPeriodNow() {
  try {
    var ll = GPS || (LOC && LOC.lat != null ? { lat: +LOC.lat, lon: +LOC.lon } : null);
    if (!ll || !window.Sky || !Sky.sunAltAz) {
      var h = new Date().getHours();
      if (h < 6) return "night"; if (h < 8) return "dawn"; if (h < 16) return "day"; if (h < 18) return "golden"; if (h < 20) return "sunset"; if (h < 22) return "dusk"; return "night";
    }
    var alt = Sky.sunAltAz(new Date(), ll.lat, ll.lon).alt;
    if (alt > 18) return "day";
    if (alt > 6) return "golden";
    if (alt > -0.5) return "sunset";
    if (alt > -6) return "dusk";
    if (alt > -12) return "dawn";
    return "night";
  } catch (e) { return "night"; }
}
function wxOverlayKind() {
  try {
    if (!WX || !WX.j || !WX.j.current) return "";
    var code = +WX.j.current.weather_code, day = !!WX.j.current.is_day;
    var k = (typeof fxKind === "function") ? fxKind(code, day) : "";
    if (k === "rain" || k === "storm") return "rain";
    if (k === "snow") return "snow";
    if (k === "fog") return "fog";
    return "";
  } catch (e) { return ""; }
}
function updateSkyline() {
  var el = $("#skyline"); if (!el) return;
  var period = sunPeriodNow();
  el.setAttribute("data-period", period);
  var wx = wxOverlayKind();
  el.setAttribute("data-wx", wx);
  var wxEl = $("#skyWx");
  if (wxEl) wxEl.className = "sky-wx" + (wx ? " on " + wx : "");
}
function ensureMapNeon(v) {
  if (!v) return;
  v.classList.add("map-neon");
  var host = v.querySelector("#mapMarkers") || v;
  if (!v.querySelector(".map-neon-ring")) {
    var ring = document.createElement("i");
    ring.className = "map-neon-ring";
    ring.setAttribute("aria-hidden", "true");
    host.appendChild(ring);
  } else {
    var ring2 = v.querySelector(".map-neon-ring");
    if (ring2 && host && ring2.parentNode !== host) host.appendChild(ring2);
  }
}
function placeNeonRing(v, dx, dy) {
  var ring = v && v.querySelector(".map-neon-ring");
  if (!ring) return;
  ring.style.left = dx + "px";
  ring.style.top = dy + "px";
  ring.style.transform = "translate(-50%, -50%)";
}

// ========== v3.2 cyber HUD (original) — Reduce Motion + visibility aware ==========
(function cyberHUD() {
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var boot = $("#boot"), bootMsg = $("#bootMsg"), bootSkip = $("#bootSkip");
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function finishBoot() {
    if (!boot || boot.classList.contains("go")) return;
    boot.classList.add("go");
    boot.setAttribute("aria-hidden", "true");
    try { Store.setLocal("bootDay", todayKey()); } catch (e) {}
  }
  if (boot) {
    var day = todayKey(), last = "";
    try { last = Store.getLocal("bootDay", "") || ""; } catch (e) {}
    var sess = false; try { sess = sessionStorage.getItem("zapos.skipBoot") === day; } catch (e) {}
    // v4.5: skip splash in standalone / after first day / Lite / Reduce Motion.
    var standalone = false;
    try { standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); } catch (eS) {}
    if (RM || last === day || sess || standalone || !fx3dWanted()) { finishBoot(); }
    else {
      boot.setAttribute("aria-hidden", "false");
      var nm = ((S && S.name) || "").trim() || "operator";
      var msgs = [
        nm ? ("Hello, " + nm + ".") : "Ready.",
        "SENSORS LINKED",
        "READY"
      ];
      var mi = 0, t0 = Date.now(), cancelled = false, cancelFx = null;
      if (bootMsg) bootMsg.textContent = msgs[0];
      // Particle title forms then disperses (lazy fx3d; skip if slow)
      loadFx3d().then(function (fx) {
        if (!fx || cancelled || boot.classList.contains("go")) return;
        cancelFx = fx.runParticleBoot({});
      }).catch(function () {});
      var iv = setInterval(function () {
        mi++;
        if (bootMsg) bootMsg.textContent = msgs[Math.min(mi, msgs.length - 1)];
        if (mi >= msgs.length - 1 || Date.now() - t0 > 1450) {
          clearInterval(iv);
          setTimeout(finishBoot, 80);
        }
      }, 360);
      function skipBoot() {
        cancelled = true; clearInterval(iv);
        try { if (typeof cancelFx === "function") cancelFx(); } catch (e) {}
        finishBoot();
      }
      if (bootSkip) bootSkip.onclick = skipBoot;
      boot.addEventListener("click", function (e) {
        if (e.target && e.target.id === "bootSkip") return;
        skipBoot();
      }, { once: true });
      try { sessionStorage.setItem("zapos.skipBoot", day); } catch (e) {}
    }
  }
  try { bindChargeUp(); updateSkyline(); buildClockTicks(); ensureHudTicks(); initBatteryHud(); updateGpsLockChip(); startZapWave(); } catch (e) {}

  try { bindHudTabs(); try { bindMuteBtn(); } catch (eMute) {} try { Store.setLocal("uiSounds", false); } catch (eSnd) {} ensurePanelsVisible(); } catch (e) {}
  try {
    var uv = (Store.ui() || {}).view || "";
    if (String(uv).indexOf("hud:") === 0) setHudTab(String(uv).slice(4), { silent: true });
    else setHudTab("home", { silent: true });
  } catch (e) { try { setHudTab("home", { silent: true }); } catch (e2) {} }

  try {
    setTimeout(function () {
      initCinematic().then(function (cine) {
        // Cinematic owns the 3D stage; do NOT call fx3d with lite:true (that adds fx-lite and hides the city).
        if (cine && cine.ready && cine.ready()) {
          try {
            document.documentElement.classList.remove("fx-lite");
            document.documentElement.classList.add("fx-3d");
          } catch (eC) {}
          try { guardHeaderTop(); } catch (eG1) {}
          return;
        }
        initFx3dLayer();
        try { guardHeaderTop(); } catch (eG2) {}
      }).catch(function () { try { guardHeaderTop(); } catch (eG3) {} });
    }, 350);
  } catch (e) {}
  // decode / typing effect on brand
  var dec = $("#brandDecode");
  if (false && dec && !RM) { /* v4.9.2: no brand glyph flicker */
    var glyphs = "01ABCDEF#$%";
    function pulseDecode() {
      if (document.visibilityState !== "visible") return;
      var n = 3, i = 0;
      var t = setInterval(function () {
        dec.textContent = Array.from({ length: n }, function () { return glyphs[Math.floor(Math.random() * glyphs.length)]; }).join("");
        i++;
        if (i > 8) { clearInterval(t); dec.textContent = "//"; }
      }, 45);
    }
    pulseDecode(); setInterval(pulseDecode, 12000);
  }
  // tile ripple
  document.addEventListener("pointerdown", function (e) {
    var tile = e.target.closest(".tile");
    if (!tile) return;
    tile.classList.remove("rip"); void tile.offsetWidth; tile.classList.add("rip");
    setTimeout(function () { tile.classList.remove("rip"); }, 480);
  }, { passive: true });
  // pause CSS animations via class when hidden
  function syncVis() {
    document.documentElement.classList.toggle("fx-paused", document.visibilityState !== "visible");
    try {
      if (window.ZAPFX3D) {
        if (document.visibilityState !== "visible") window.ZAPFX3D.pause();
        else window.ZAPFX3D.resume();
      }
      if (window.ZAPCINE) {
        if (document.visibilityState !== "visible") window.ZAPCINE.pause();
        else window.ZAPCINE.resume();
      }
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", syncVis); syncVis();
})();



// v3.3 find app CTA
(function () {
  var b = $("#findApp");
  if (b) b.addEventListener("click", function () { openAddApp({ focusSearch: true }); });
  // mark standalone for CSS Safari/safe-area padding
  var st = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  document.documentElement.classList.toggle("standalone", !!st);
  document.documentElement.classList.toggle("in-browser", !st);
  try {
    $$(".ver,[data-app-ver]").forEach(function (el) { el.textContent = "v" + VERSION; });
    var meta = document.querySelector('meta[name="zapos-version"]');
    if (meta) meta.setAttribute("content", VERSION);
  } catch (eV) {}
})();


(function cardsAlwaysVisible() {
  /* v4.6.1 CRITICAL: .card.reveal { opacity:0 } + IntersectionObserver left only
     in-view Music visible after pull-to-refresh / overscroll. Cards paint instantly. */
  try { forceCardsVisible(); } catch (e0) {
    $$(".card").forEach(function (el) { el.classList.add("in"); el.classList.remove("reveal"); });
  }
  function watchdog() {
    try {
      var stuck = false;
      $$(".card").forEach(function (el) {
        var st = window.getComputedStyle(el);
        var op = parseFloat(st.opacity);
        var hidden = st.visibility === "hidden" || st.display === "none";
        var tr = st.transform || "";
        var translated = tr.indexOf("matrix") >= 0 && tr !== "none" && /translate/i.test(el.style.transform || "");
        if ((!hidden && op < 0.5) || el.classList.contains("reveal") && !el.classList.contains("in") || translated) stuck = true;
      });
      if (stuck) forceCardsVisible();
      /* if every major card has ~0 height or opacity, restore */
      ["hPlay","hWx","hMap","hMk","appsSection"].forEach(function (id) {
        var el = document.getElementById(id); if (!el) return;
        var r = el.getBoundingClientRect();
        var st = window.getComputedStyle(el);
        if (r.height < 4 || parseFloat(st.opacity) < 0.5) forceCardsVisible();
      });
    } catch (e1) {}
  }
  setTimeout(watchdog, 200);
  setTimeout(watchdog, 800);
  setInterval(watchdog, 2500);
  window.addEventListener("pageshow", function () {
    try { clearScrollLockHard(); } catch (e0) {}
    try { forceCardsVisible(); } catch (e) {}
    try { guardHeaderTop(); } catch (e1) {}
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      try { clearScrollLockHard(); } catch (e0) {}
      try { forceCardsVisible(); } catch (e) {}
      try { guardHeaderTop(); } catch (e1) {}
    }
  });
})();

(function stickyTop() {
  var top = $("#top"); if (!top) return;
  var onScroll = function () { top.classList.toggle("scrolled", (window.scrollY || document.documentElement.scrollTop) > 8); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();
/* v4.9.2: no double-tap zoom (iOS ignores user-scalable=no). Second tap within 300ms on a
   non-input element gets preventDefault on touchend — single taps, inputs and scrolling untouched. */
(function noDoubleTapZoom() {
  var last = 0, lx = 0, ly = 0;
  document.addEventListener("touchend", function (e) {
    if (!e.changedTouches || e.changedTouches.length !== 1 || (e.touches && e.touches.length)) return;
    var t = e.target; if (t && t.nodeType === 3) t = t.parentElement;
    if (t && t.closest && t.closest("input,textarea,select,[contenteditable=true],label")) { last = 0; return; }
    var p = e.changedTouches[0], now = Date.now();
    if (now - last < 300 && Math.abs(p.clientX - lx) < 40 && Math.abs(p.clientY - ly) < 40) {
      try { if (e.cancelable) e.preventDefault(); } catch (err) {}
      last = 0; return;
    }
    last = now; lx = p.clientX; ly = p.clientY;
  }, { passive: false });
  /* v4.14.0: pinch zoom allowed (accessibility) — gesturestart no longer blocked */
})();
// ========== 13. boot ==========
try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (eSR) {}
try { clearScrollLockHard(); } catch (eCL0) {}
try { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (eSc0) {}
try { forceCardsVisible(); } catch (eFV0) {}
try { guardHeaderTop(); } catch (eGH0) {}
document.body.classList.add("on-home"); applyTheme(THEME.id);
renderApps(); renderNowPlaying(); try { renderNet(); } catch (e) {}
tick(); setInterval(tick, 1000);
renderWeather(); renderMarkets(); renderMap(); try { renderPlacesRow(); } catch (e) {}
window.addEventListener("offline", renderNet);
setInterval(function () { if (COINS.length > 2 && document.visibilityState === "visible" && !document.documentElement.classList.contains("detail-open") && !document.documentElement.classList.contains("sheet-open")) { mkPage++; renderMarkets(); } }, 12000);
setTimeout(loop, 60);
show(Q.get("tab") || Store.ui().view || "home");
requestAnimationFrame(restoreScroll); setTimeout(restoreScroll, 400); // again after late content (weather, icons) settles
refreshWeather(); refreshMarkets(); refreshGPS(); setTimeout(function () { try { refreshPlaceEtas(); } catch (e) {} }, 1200);
setInterval(function () { if (document.visibilityState === "visible") { refreshWeather(); refreshGPS(); } }, 5 * 60000);
setInterval(function () { if (document.visibilityState === "visible") refreshMarkets(); }, 15 * 1000);
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") { try { refreshMarkets(); } catch (e) {} }
}); // mkVisRefresh: pause polling when hidden (interval no-ops), kick immediately when shown
window.addEventListener("online", function () { renderNet(); refreshWeather(true); refreshMarkets(); geocode(); });
(function registerAndWatchUpdates() {
  var canSW = "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if (!canSW) return;
  navigator.serviceWorker.register("/os/sw.js", { scope: "/os/", updateViaCache: "none" }).then(function (reg) {
    try { reg.update(); } catch (e) {}
  }).catch(function () {});
})();
// Live update check: compare /os/version.json to running APP_VERSION
var _updBusy = false;
function waitForNewSW(reg, ms) {
  return new Promise(function (resolve) {
    var done = false;
    function finish() { if (done) return; done = true; resolve(); }
    setTimeout(finish, ms || 2500);
    if (!reg) { finish(); return; }
    function track(worker) {
      if (!worker) return;
      try { if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" }); } catch (e) {}
      worker.addEventListener("statechange", function () {
        try { if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" }); } catch (e) {}
        if (worker.state === "activated") finish();
      });
    }
    track(reg.installing); track(reg.waiting);
    reg.addEventListener("updatefound", function () { track(reg.installing); });
    var onCtrl = function () { navigator.serviceWorker.removeEventListener("controllerchange", onCtrl); finish(); };
    navigator.serviceWorker.addEventListener("controllerchange", onCtrl);
  });
}
function checkForAppUpdate(manual) {
  if (_updBusy && !manual) return;
  var guardKey = "zapos.reloadedFor";
  var url = "/os/version.json?t=" + Date.now();
  _updBusy = true;
  fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }).then(function (r) {
    if (!r.ok) throw new Error("version " + r.status);
    return r.json();
  }).then(function (j) {
    var remote = String((j && j.version) || "").trim();
    if (!remote) throw new Error("no version");
    if (remote === APP_VERSION) {
      if (manual) toast("You're on v" + APP_VERSION + " — up to date");
      return null;
    }
    try {
      if (sessionStorage.getItem(guardKey) === remote) {
        if (manual) toast("Update v" + remote + " ready — fully close & reopen the app once");
        return null;
      }
    } catch (e) {}
    function doReload() {
      try { sessionStorage.setItem(guardKey, remote); } catch (e) {}
      try { sessionStorage.setItem("zapos.pendingToast", "Updated to v" + remote); } catch (e) {}
      location.reload();
    }
    // Kick SW update, but never block reload more than ~2.5s
    var swKick = Promise.resolve();
    if ("serviceWorker" in navigator) {
      swKick = navigator.serviceWorker.getRegistration("/os/").then(function (reg) {
        if (!reg) return;
        var upd = Promise.resolve();
        try { upd = reg.update(); } catch (e) {}
        return Promise.race([
          Promise.resolve(upd).then(function () { return waitForNewSW(reg, 2500); }).catch(function () {}),
          new Promise(function (r) { setTimeout(r, 2500); })
        ]);
      }).catch(function () {});
    }
    return Promise.race([
      swKick,
      new Promise(function (r) { setTimeout(r, 2800); })
    ]).then(doReload, doReload);
  }).catch(function () {
    if (manual) toast("Couldn't check right now — try again online");
  }).then(function () { _updBusy = false; });
}
// Fire after reload toast
try {
  var pt = sessionStorage.getItem("zapos.pendingToast");
  if (pt) { sessionStorage.removeItem("zapos.pendingToast"); setTimeout(function () { toast(pt); }, 600); }
} catch (e) {}
function scheduleUpdateChecks() {
  function safeCheck() {
    // Never auto-reload while typing or map overlay open (iOS PWA focus/keyboard false positives).
    var ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
    if (document.documentElement.classList.contains("map-fs-open")) return;
    checkForAppUpdate(false);
  }
  safeCheck();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") setTimeout(safeCheck, 400);
  });
  // pageshow only for bfcache restores — not every focus (keyboard open used to flash-reload)
  window.addEventListener("pageshow", function (ev) {
    if (ev && ev.persisted) setTimeout(safeCheck, 400);
  });
  setInterval(function () {
    if (document.visibilityState === "visible") safeCheck();
  }, 5 * 60 * 1000);
}

// ========== v4.7.0 ZAP AI (intent router → Pollinations / WebLLM / FAQ fallback + voice) ==========
var ZAP_LLM = { engine: null, loading: false, modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", progress: 0 };
var ZAP_QUEUE = { busy: false, q: [], lastAt: 0, backoffMs: 0 };
var ZAP_HIST_KEY = "zapChat";
function loadAssistantPrefs() {
  var a = Store.get("assistant", null);
  if (!a || typeof a !== "object") a = { enabled: true, webllm: false, suggest: true, voiceOut: true, modelCached: false, smartMode: true };
  if (a.smartMode == null) a.smartMode = true;
  if (a.voiceOut == null) a.voiceOut = true; // assistant speaks; rest of app stays silent
  return a;
}
function saveAssistantPrefs(a) { Store.set("assistant", a); }
function hasWebGPU() {
  try { return !!(navigator.gpu); } catch (e) { return false; }
}
function hasSpeechIn() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function loadZapHist() {
  var h = Store.getLocal(ZAP_HIST_KEY, null);
  return Array.isArray(h) ? h : [];
}
function saveZapHist(h) {
  Store.setLocal(ZAP_HIST_KEY, (h || []).slice(-80));
}
function paintZapHist() {
  var log = $("#zapLog"); if (!log) return;
  log.innerHTML = "";
  loadZapHist().forEach(function (m) {
    if (!m || !m.t) return;
    var d = document.createElement("div");
    d.className = "zap-msg " + (m.role === "user" ? "user" : "bot");
    d.textContent = m.t;
    log.appendChild(d);
  });
  if (!log.children.length) {
    // v4.9.4: first-run welcome (not saved to history) + one-tap starters
    var w = document.createElement("div");
    w.className = "zap-msg bot zap-welcome";
    w.textContent = "Hi, I'm ZAP AI. Ask me anything, or tap a starter below. Say \"call Mom\", \"directions to home\" or \"open Spotify\" and I'll do it.";
    log.appendChild(w);
    var row = document.createElement("div");
    row.className = "zap-chips zap-start";
    [["Weather","weather"],["Directions home","directions to home"],["Start focus","start focus"],["Markets","markets"],["What can you do?","help"]].forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "zap-chip"; b.textContent = c[0];
      b.addEventListener("click", function () { try { row.remove(); } catch (e) {} zapHandle(c[1]); });
      row.appendChild(b);
    });
    log.appendChild(row);
  }
  log.scrollTop = log.scrollHeight;
}
function openZapAssistant() {
  var sheet = $("#zapSheet"); if (!sheet) return;
  try { portalToBody(sheet); } catch (eP) {}
  sheet.hidden = false;
  sheet.style.transform = "";
  sheet.scrollTop = 0;
  crispifyOverlay(sheet);
  lockPageScroll();
  showScrim("zap");
  overlayPushHistory();
  try {
    paintZapHist();
    updateZapBadge();
    renderZapChips();
    refreshZapAiBar();
    var mute = $("#zapMute");
    var pref = loadAssistantPrefs();
    if (mute) { mute.textContent = pref.voiceOut ? "🔊" : "🔇"; mute.setAttribute("aria-pressed", pref.voiceOut ? "true" : "false"); }
    var mic = $("#zapMic"), tip = $("#zapMicTip");
    if (!hasSpeechIn()) {
      if (mic) { mic.classList.add("fallback"); mic.setAttribute("aria-label", "Type instead — voice not supported"); }
      if (tip) { tip.hidden = false; tip.textContent = "Voice not supported here — type below"; }
    } else if (tip) tip.hidden = true;
  } catch (e) {}
  setTimeout(function () { try { $("#zapIn").focus(); } catch (e) {} }, 40);
}
function closeZapAssistant(skipHist) {
  var sheet = $("#zapSheet"); if (sheet) { sheet.hidden = true; sheet.style.transform = ""; }
  try { stopZapListen(); } catch (e) {}
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e2) {}
  hideScrimIfIdle();
  overlayClearHistory();
  try { unlockPageScroll(); } catch (eU) {}
}
function updateZapBadge() {
  var b = $("#zapBadge"); if (!b) return;
  var offline = navigator.onLine === false;
  var a = loadAssistantPrefs();
  var brain = !!(ZAP_LLM.engine || a.modelCached);
  b.textContent = offline ? (brain ? "OFFLINE AI" : "OFFLINE") : (brain ? "ZAP AI" : "LIVE");
  b.classList.toggle("live", !offline);
}
function zapSanitize(text) {
  var s = String(text == null ? "" : text);
  s = s.replace(/\r/g, "");
  // strip common markdown chrome the free model sometimes adds
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1").replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^\s*[-•]\s+/gm, "");
  // drop regurgitated dashboard / powered-by footers
  s = s.replace(/\n{0,2}\*?\s*Powered by open models\.?\s*\*?/ig, "");
  s = s.replace(/\n{0,2}(Local time:|App: ZAPWISE|Focus sessions today:|BTC \$|GOLD \$)[^\n]*/ig, "");
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}
function zapAppend(role, text, action, opts) {
  opts = opts || {};
  if (role !== "user" && text && !opts.streaming) text = zapSanitize(text);
  var log = $("#zapLog"); if (!log) return null;
  var d = document.createElement("div");
  d.className = "zap-msg " + role + (opts.streaming ? " streaming" : "");
  d.textContent = text || "";
  if (opts.kind) { d.setAttribute("data-kind", opts.kind); d.classList.add("has-kind"); }
  if (action && action.label && action.run) {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "zap-act"; btn.textContent = action.label;
    btn.addEventListener("click", function () { try { action.run(); } catch (e) { toast("Action failed"); } });
    d.appendChild(document.createElement("br"));
    d.appendChild(btn);
  }
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  if (!opts.skipHist && text) {
    var h = loadZapHist();
    h.push({ role: role === "user" ? "user" : "bot", t: String(text).slice(0, 800), at: Date.now() });
    saveZapHist(h);
  }
  try { if (role === "bot" && !opts.streaming && loadAssistantPrefs().voiceOut) zapSpeak(text); } catch (e) {}
  try { if (role === "bot") renderZapChipsFromReply(text); } catch (e2) {}
  return d;
}
function zapStreamInto(el, full, done) {
  if (!el) { if (done) done(); return; }
  full = zapSanitize(full);
  var i = 0, step = Math.max(1, Math.floor(String(full).length / 40));
  /* v4.9.5: typing effect only when Motion is on (Settings) and reduced-motion is off — otherwise show the reply at once */
  if (!document.documentElement.classList.contains("motion-on")) step = String(full).length || 1;
  el.classList.add("streaming");
  function tick() {
    i = Math.min(String(full).length, i + step);
    el.textContent = String(full).slice(0, i);
    var log = $("#zapLog"); if (log) log.scrollTop = log.scrollHeight;
    if (i < String(full).length) requestAnimationFrame(tick);
    else {
      el.classList.remove("streaming");
      try {
        var h = loadZapHist();
        h.push({ role: "bot", t: String(full).slice(0, 800), at: Date.now() });
        saveZapHist(h);
      } catch (e) {}
      try { if (loadAssistantPrefs().voiceOut) zapSpeak(full); } catch (e2) {}
      try { renderZapChipsFromReply(full); } catch (e3) {}
      if (done) done();
    }
  }
  requestAnimationFrame(tick);
}
function renderZapChips() {
  var host = $("#zapChips"); if (!host) return;
  // Only conversation follow-ups — never static AI prompt tiles on home
  if (!host.dataset.dyn) { host.hidden = true; host.innerHTML = ""; }
}
function renderZapChipsFromReply(text) {
  var host = $("#zapChips"); if (!host) return;
  var t = String(text || "").toLowerCase();
  var chips = [];
  function add(label, q) {
    if (chips.length >= 4) return;
    if (chips.some(function (c) { return c.q === q; })) return;
    chips.push({ t: label, q: q });
  }
  if (/weather|forecast|°|rain/.test(t)) add("Weather detail", "weather");
  if (/btc|bitcoin|gold|market|portfolio|net worth|holding/.test(t)) add("Markets", "markets");
  if (/focus|timer|sprint/.test(t)) add("Start focus", "start focus");
  if (/call|favorite|dial/.test(t)) add("Open phone", "open phone");
  if (/map|direction|drive|home|work/.test(t)) add("Directions home", "directions to home");
  if (/theme/.test(t)) add("Themes", "switch theme");
  if (!chips.length) {
    add("Net worth", "net worth");
    add("Weather", "weather");
  }
  host.dataset.dyn = "1";
  host.hidden = false;
  host.innerHTML = "";
  chips.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "zap-chip"; b.textContent = c.t;
    b.addEventListener("click", function () { zapHandle(c.q); });
    host.appendChild(b);
  });
}
function pickSpeakVoice() {
  try {
    var voices = window.speechSynthesis.getVoices() || [];
    var prefer = voices.filter(function (v) { return /^en(-|_)/i.test(v.lang) && /google|samantha|daniel|karen|moira|female|natural/i.test(v.name); })[0];
    if (prefer) return prefer;
    return voices.filter(function (v) { return /^en(-|_)/i.test(v.lang); })[0] || null;
  } catch (e) { return null; }
}
function zapSpeak(text) {
  try {
    if (!window.speechSynthesis) return;
    var clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 320);
    if (!/[A-Za-z0-9]/.test(clean)) return; // v4.9.4: never speak the "…" thinking placeholder
    if (!clean) return;
    var u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.02; u.pitch = 1; u.lang = "en-US";
    var v = pickSpeakVoice(); if (v) u.voice = v;
    try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("speak"); } catch (e) {}
    u.onend = function () { try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("idle"); } catch (e) {} };
    u.onerror = u.onend;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
try { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () {}; } catch (eVo) {}
var _zapRec = null, _zapListening = false;
function stopZapListen() {
  _zapListening = false;
  var mic = $("#zapMic"); if (mic) mic.classList.remove("on");
  try { if (_zapRec) _zapRec.stop(); } catch (e) {}
}
function startZapListen() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast("Voice not supported — type your question");
    try { $("#zapIn").focus(); } catch (e) {}
    return;
  }
  if (_zapListening) { stopZapListen(); return; }
  _zapRec = new SR();
  _zapRec.lang = "en-US";
  _zapRec.interimResults = false;
  _zapRec.onresult = function (ev) {
    var t = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
    if (t) { var inp = $("#zapIn"); if (inp) inp.value = t; zapHandle(t); }
  };
  _zapRec.onerror = function () { stopZapListen(); toast("Mic unavailable — type instead"); try { $("#zapIn").focus(); } catch (e) {} };
  _zapRec.onend = function () { stopZapListen(); };
  _zapListening = true;
  var mic = $("#zapMic"); if (mic) mic.classList.add("on");
  try { _zapRec.start(); } catch (e) { stopZapListen(); toast("Mic unavailable — type instead"); }
}
function setThemeByQuery(q) {
  var map = [
    { re: /pink|magenta|zapwise|default|classic|neon/, id: "zapwise" },
    { re: /amber|cyan|classic\s*neon/, id: "amber-cyan" },
    { re: /acid|yellow/, id: "acid" },
    { re: /ice|blue|arctic/, id: "ice" }
  ];
  for (var i = 0; i < map.length; i++) {
    if (map[i].re.test(q)) {
      applyTheme(map[i].id); Store.set("theme", THEME.id);
      return { skill: "theme.set", text: "Theme set to " + THEME.name + ".", action: { label: "Themes", run: function () { closeZapAssistant(); openTheme(); } } };
    }
  }
  var order = ["zapwise", "amber-cyan", "acid", "ice"];
  var cur = THEME && THEME.id, idx = order.indexOf(cur);
  var next = order[(idx + 1) % order.length];
  applyTheme(next); Store.set("theme", THEME.id);
  return { skill: "theme.set", text: "Switched to " + THEME.name + ".", action: { label: "Themes", run: function () { closeZapAssistant(); openTheme(); } } };
}
function zapDashContext() {
  var bits = [];
  try {
    var d = new Date();
    bits.push("Local time: " + DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate() + " " + ((d.getHours() % 12) || 12) + ":" + pad2(d.getMinutes()) + (d.getHours() < 12 ? " AM" : " PM"));
  } catch (e) {}
  try {
    if (WX && WX.j) {
      var cur = WX.j.current_weather || WX.j.current || {};
      var t = cur.temperature != null ? cur.temperature : cur.temp;
      bits.push("Weather: " + (WX.place || "here") + " " + (t != null ? Math.round(+t) + "°" : "--"));
    }
  } catch (e2) {}
  try {
    /* v4.17: portfolio / bank numbers are never sent to the online model */
  } catch (e3) {}
  try {
    var md = MK && MK.d || {};
    if (md.bitcoin) bits.push("BTC " + money(md.bitcoin.usd));
    if (md["pax-gold"]) bits.push("GOLD " + money(md["pax-gold"].usd));
  } catch (e4) {}
  bits.push("App: ZAPWISE//OS v" + VERSION + ". Focus sessions today: " + focusSessionsToday() + ".");
  return bits.join(". ");
}
function zapLoadNotes() {
  try { return Store.getLocal("zapNotes", []) || []; } catch (e) { return []; }
}
function zapSaveNotes(arr) {
  try { Store.setLocal("zapNotes", (arr || []).slice(0, 80)); } catch (e) {}
}
function zapLoadReminders() {
  try { return Store.getLocal("zapReminders", []) || []; } catch (e) { return []; }
}
function zapSaveReminders(arr) {
  try { Store.setLocal("zapReminders", (arr || []).slice(0, 40)); } catch (e) {}
}
function zapWxSummary(kind) {
  kind = kind || "now";
  if (!WX || !WX.j) return "Weather still loading — open Weather for the full card.";
  var j = WX.j, place = WX.place || "Here", u = (S.units === "C" ? "°C" : "°F");
  var cur = j.current || j.current_weather || {};
  var t = cur.temperature_2m != null ? cur.temperature_2m : cur.temperature;
  var bits = [place];
  if (t != null) bits.push(Math.round(+t) + u);
  try {
    if (j.daily) {
      bits.push("H " + Math.round(j.daily.temperature_2m_max[0]) + "° / L " + Math.round(j.daily.temperature_2m_min[0]) + "°");
      var rain0 = j.daily.precipitation_probability_max[0] || 0;
      bits.push("rain chance " + rain0 + "%");
    }
  } catch (e) {}
  if (kind === "rain" || /rain|umbrella|wet/.test(kind)) {
    var rain = (j.daily && j.daily.precipitation_probability_max[0]) || 0;
    return place + ": rain chance today " + rain + "%." + (rain >= 40 ? " Bring a jacket." : " Looking mostly dry.");
  }
  if (kind === "later" || kind === "forecast") {
    try {
      var H = j.hourly || {};
      var now = new Date();
      var key = now.toISOString().slice(0, 13);
      var hi = (H.time || []).findIndex(function (t) { return t.slice(0, 13) === key; });
      if (hi < 0) hi = 0;
      var later = Math.min(hi + 4, (H.time || []).length - 1);
      var tL = H.temperature_2m && H.temperature_2m[later];
      var pL = H.precipitation_probability && H.precipitation_probability[later];
      var when = H.time[later] ? H.time[later].slice(11, 16) : "later";
      return place + " around " + when + ": " + (tL != null ? Math.round(tL) + u : "--") +
        (pL != null ? (", rain " + pL + "%") : "") + ". " + bits.join(" · ");
    } catch (e2) {}
  }
  return bits.join(" · ");
}
function zapEvalMath(expr) {
  var e = String(expr || "").replace(/[^0-9+\-*/().%\s]/g, "").trim();
  if (!e || e.length > 80) return null;
  try {
    // eslint-disable-next-line no-new-func
    var v = Function('"use strict"; return (' + e + ");")();
    if (typeof v !== "number" || !isFinite(v)) return null;
    return (Math.round(v * 1e8) / 1e8);
  } catch (err) { return null; }
}
function zapOfflineFaq(raw) {
  var q = String(raw || "").trim().toLowerCase();
  // Exact / near-exact greetings & help only — never swallow real questions
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))[!?.]*$/.test(q)) {
    return "Hey — I'm ZAP AI. Ask weather, markets, call a favorite, start focus, open an app, convert currency, or just chat.";
  }
  if (/^(thanks|thank you|thx|ty)[!?.]*$/.test(q)) return "Anytime.";
  if (/^(who are you|what are you|your name)[!?.]*$/.test(q)) {
    return "I'm ZAP AI inside ZAPWISE//OS. Short answers, live dashboard when I can, open models when online.";
  }
  if (/^(help|what can you( do)?|commands|\?)[!?.]*$/.test(q)) return HELP_TEXT;
  if (/how (do i|to).*(home screen|install|add (an? )?app|add to)/.test(q)) {
    return "On iPhone: Share → Add to Home Screen. On Android: Get ZAP//OS for the free APK, or Add to Home Screen in Chrome.";
  }
  if (/how (do i|to).*(theme|color)/.test(q)) return "Tap THEME in the top bar, or say “switch theme”. Themes stay on this device.";
  if (/how (do i|to).*(favorite|dial|call|phone)/.test(q)) return "Open Phone, type a number, tap ☆ to save. Say “call ” + a favorite name anytime.";
  if (/how (do i|to).*(focus|timer|pomodoro)/.test(q)) return "On Focus, pick 15 / 25 / 50, then Start. It keeps time even if you leave the app.";
  if (/how (do i|to).*(market|holding|portfolio|btc|gold|wallet)/.test(q)) return "Tap Markets, then ＋ Add. Paste a wallet or add a holding. Totals stay on this device.";
  if (/how (do i|to).*(map|direction)/.test(q)) return "Open the map card, save Home or Work, then ask “directions to home”.";
  if (/how (do i|to).*(note|calendar|reminder)/.test(q)) return "Say “add note …” or “remind me …”. Today’s card also opens Calendar and Notes.";
  if (/offline|no internet|airplane/.test(q)) return "You're offline. Phone, focus, notes, math, and saved data still work. Free-form chat needs a connection.";
  if (/^(mute|unmute)( voice)?[!?.]*$|^(voice|speak|talk)$/.test(q)) return "Tap the speaker in this chat to mute or unmute my voice. The rest of the OS stays silent.";
  if (/download|offline brain|webllm|private ai/.test(q)) return "On WebGPU devices, tap Download offline brain (~290 MB) once. After it loads, chat answers are made on this device. The first load needs internet.";
  if (/^(joke|tell me a joke|funny)[!?.]*$/.test(q)) return "Why did the HUD go to therapy? Too many unresolved overlays.";
  return "Try: weather later, will it rain, how's BTC, portfolio, open Spotify, call mom, start focus 25, directions home, add note buy milk, remind me, convert 50 usd to eur, or ask anything.";
}
function routeZapIntent(raw) {
  var q = String(raw || "").trim().toLowerCase();
  var orig = String(raw || "").trim();
  if (!q) return { skill: "help", text: HELP_TEXT };
  var _rt = zapRoutine(q, orig) || zaIntent(q, orig); if (_rt) return _rt;

  // Exact FAQ / greetings only
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))[!?.]*$/.test(q) ||
      /^(thanks|thank you|thx|ty)[!?.]*$/.test(q) ||
      /^(who are you|what are you|your name)[!?.]*$/.test(q) ||
      /^(help|what can you( do)?|commands|\?)[!?.]*$/.test(q) ||
      /^(joke|tell me a joke)[!?.]*$/.test(q)) {
    return { skill: "chat.local", text: zapOfflineFaq(q) };
  }
  if (/^how (do i|to)\b/.test(q) && /(home screen|install|add (an? )?app|theme|favorite|dial|call|phone|focus|timer|market|holding|portfolio|map|direction|note|calendar|reminder|wallet)/.test(q)) {
    return { skill: "chat.local", text: zapOfflineFaq(q) };
  }

  if (/\b(what('?s| is)?\s+)?(the\s+)?(time|date|day)\b/.test(q) || /^(time|date)$/.test(q)) {
    var d = new Date();
    var line = DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate() + " · " + ((d.getHours() % 12) || 12) + ":" + pad2(d.getMinutes()) + (d.getHours() < 12 ? " AM" : " PM");
    return { skill: "time.now", text: line };
  }

  // Math: "what is 12*8", "calculate 2+2", bare expression
  if (/^(what('?s| is)|calculate|compute|math)\b/.test(q) || /^[\d(][\d+\-*/().%\s]+$/.test(q)) {
    var expr = orig.replace(/^(what('?s| is)|calculate|compute|math)\s+/i, "").replace(/\?+$/, "").trim();
    if (/^[\d(][\d+\-*/().%\s]+$/.test(expr)) {
      var mv = zapEvalMath(expr);
      if (mv != null) return { skill: "math.eval", text: expr.replace(/\s+/g, "") + " = " + mv };
    }
  }

  // Currency / unit convert via frankfurter
  var cm = q.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-z]{3})\s+(?:to|in|into)\s+([a-z]{3})\b/) ||
           q.match(/(\d+(?:\.\d+)?)\s*(usd|eur|gbp|jpy|cad|aud|chf|mxn|inr)\s+(?:to|in)\s+(usd|eur|gbp|jpy|cad|aud|chf|mxn|inr)\b/);
  if (cm) {
    var amt = parseFloat(cm[1]), fr = cm[2].toUpperCase(), to = cm[3].toUpperCase();
    return {
      skill: "fx.convert",
      text: "Converting " + amt + " " + fr + " → " + to + "…",
      async: true,
      runAsync: function () {
        return fetch("https://open.er-api.com/v6/latest/" + encodeURIComponent(fr), { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var rate = j && j.rates && j.rates[to];
            if (rate == null) throw new Error("no rate");
            var v = amt * rate;
            return amt + " " + fr + " ≈ " + (Math.round(v * 100) / 100) + " " + to + ".";
          })
          .catch(function () { return "Couldn't reach the free FX rate. Try again online."; });
      }
    };
  }

  // Define
  var dm = q.match(/^(define|definition of|what does|what is)\s+([a-z][a-z\-']{1,40})\??$/i) ||
           q.match(/^define\s+([a-z][a-z\-']{1,40})\??$/);
  if (dm) {
    var word = (dm[2] || dm[1] || "").toLowerCase();
    if (word && !/weather|bitcoin|btc|gold|time|date|portfolio|focus/.test(word)) {
      return {
        skill: "dict.define",
        text: "Looking up “" + word + "”…",
        async: true,
        runAsync: function () {
          return fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word), { cache: "no-store" })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              var m = j && j[0] && j[0].meanings && j[0].meanings[0];
              var def = m && m.definitions && m.definitions[0] && m.definitions[0].definition;
              return def ? (word + ": " + def) : ("No short definition for “" + word + "”.");
            })
            .catch(function () { return "Dictionary offline — try again when connected."; });
        }
      };
    }
  }

  // Quick facts (small local set; else chat)
  var facts = {
    "earth": "Earth is the third planet from the Sun; one day ≈ 24 hours, one year ≈ 365.25 days.",
    "moon": "The Moon is Earth's only natural satellite; average distance ≈ 384,400 km.",
    "sun": "The Sun is a G-type main-sequence star; light takes about 8 minutes to reach Earth.",
    "bitcoin": "Bitcoin is a decentralized digital currency launched in 2009. Ask “how's BTC” for the live quote.",
    "zapwise": "ZAPWISE//OS is your personal home-screen OS — weather, markets, focus, phone, and ZAP AI."
  };
  var fm = q.match(/^(quick )?fact(s)? (about |on |for )?([a-z][a-z0-9 \-]{1,40})$/) ||
           q.match(/^tell me (a |something )?about\s+([a-z][a-z0-9 \-]{1,40})$/);
  if (fm) {
    var topic = (fm[4] || fm[2] || "").trim().toLowerCase();
    if (facts[topic]) return { skill: "fact.local", text: facts[topic] };
  }

  // Notes
  var nm = orig.match(/^(?:add\s+)?note(?:s)?\s+(?:that\s+|to\s+|:)?.+$/i) || orig.match(/^add note\s+(.+)$/i);
  if (/\b(add|new|save)\s+note\b/.test(q) || /^note\s+\S/.test(q)) {
    var body = orig.replace(/^(?:please\s+)?(?:add\s+)?(?:a\s+)?note(?:s)?\s*(?:that\s+|to\s+|:\s*)?/i, "").trim();
    if (!body || /^(open|list|show)$/i.test(body)) {
      var notes = zapLoadNotes();
      return { skill: "notes.list", text: notes.length ? ("Notes: " + notes.slice(0, 5).map(function (n) { return n.t; }).join(" · ")) : "No notes yet. Say “add note buy milk”.",
        action: { label: "Notes", run: function () { closeZapAssistant(); try { $("#tdNote").click(); } catch (e) {} } } };
    }
    return { skill: "notes.add", text: "Save this note on this device: “" + body.slice(0, 80) + "”?", action: { label: "Save note", confirm: true, run: function () { var arr = zapLoadNotes(); arr.unshift({ t: body.slice(0, 160), at: Date.now() }); zapSaveNotes(arr); toast("Note saved"); } } };
  }
  if (/^(list|show|my)\s+notes?\b|^notes\b/.test(q) && !/add/.test(q)) {
    var ns = zapLoadNotes();
    return { skill: "notes.list", text: ns.length ? ("Notes: " + ns.slice(0, 6).map(function (n) { return n.t; }).join(" · ")) : "No notes yet." };
  }

  // Reminders
  if (/\b(remind me|set (a )?reminder|reminder)\b/.test(q)) {
    var rb = orig.replace(/^(please\s+)?(remind me( to)?|set (a )?reminder( to| for)?|reminder:?)\s*/i, "").trim() || "something";
    return { skill: "reminder.add", text: "Save reminder “" + rb.slice(0, 80) + "”? It’s listed here only — ZAPWISE can’t send phone alerts yet.", action: { label: "Save reminder", confirm: true, run: function () { var rem = zapLoadReminders(); rem.unshift({ t: rb.slice(0, 160), at: Date.now() }); zapSaveReminders(rem); toast("Reminder saved"); } } };
  }

  if (/^call\b|\bdial\b/.test(q) || (/\bphone\b/.test(q) && /call|dial|favorite/.test(q))) {
    var want = q.replace(/^(please\s+)?(call|dial|phone)\s+(me\s+)?/, "").trim();
    var favs = (typeof FAVS !== "undefined" && FAVS && FAVS.length) ? FAVS : (Store.get("favs", []) || []);
    var hit = null;
    if (want) hit = favs.filter(function (f) { return (f.name || "").toLowerCase().indexOf(want) >= 0; })[0];
    if (!hit && favs.length === 1) hit = favs[0];
    if (!hit) return { skill: "call.fav", text: favs.length ? ("Say “call ” + a favorite: " + favs.map(function (f) { return f.name; }).join(", ")) : "No favorites yet. Save one from Phone.", action: { label: "Phone", run: function () { closeZapAssistant(); openDial(); } } };
    return {
      skill: "call.fav",
      text: "Calling " + hit.name + ".",
      action: { label: "Call", run: function () { closeZapAssistant(); try { logCall(hit.num, hit.name, "OUT"); } catch (e) {} callNum(hit.num); } }
    };
  }
  if (/open\s+phone|show\s+(the\s+)?(dialer|keypad)|phone\s+pad/.test(q)) {
    return { skill: "phone.open", text: "Opening Phone.", action: { label: "Phone", run: function () { closeZapAssistant(); openDial(); } } };
  }
  if (/^(search|google|look up|web)\b/.test(q) || /\bsearch (the )?web\b/.test(q)) {
    var sq = q.replace(/^(please\s+)?(search( the web)?|google|look up|web)\s+(for\s+)?/, "").trim();
    if (!sq) return { skill: "web.search", text: "Say “search web …” with a query." };
    return {
      skill: "web.search",
      text: "Search the web for “" + sq + "”?",
      action: { label: "Search", run: function () { closeZapAssistant(); go(webSearchUrl(sq)); } }
    };
  }
  if (/\b(switch|change|set)\s+theme\b|\btheme\b.*(neon|amber|ghost|white)|^(neon night|amber ops|ghost white)$/.test(q)) {
    return setThemeByQuery(q);
  }
  if (/\b(add|new)\s+(holding|account|asset|broker)\b|\badd holding\b/.test(q)) {
    return {
      skill: "holdings.add",
      text: "Open the add-holding sheet?",
      action: { label: "Add holding", run: function () { closeZapAssistant(); try { openAddHolding(); } catch (e) { toggleXp("mk"); } } }
    };
  }
  if (/net\s*worth|portfolio|balance|how much.*(worth|have|portfolio)|my holdings/.test(q) || /^(portfolio|holdings)$/.test(q)) {
    var st = portfolioStats();
    var txt = st.priced
      ? ("Net worth " + money(st.total) + (st.day != null ? (" · today " + signedMoney(st.day)) : ""))
      : "No priced holdings yet. Add an account from Markets.";
    return { skill: "portfolio.total", text: txt, action: { label: "Open portfolio", run: function () { closeZapAssistant(); toggleXp("mk"); } } };
  }

  // Weather — now / later / rain
  if (/weather|forecast|temperature|temp\b|rain|umbrella|hot|cold|humid/.test(q)) {
    var kind = /later|tonight|afternoon|evening|forecast|tomorrow/.test(q) ? "later" : (/rain|umbrella|wet/.test(q) ? "rain" : "now");
    return { skill: "weather." + kind, text: zapWxSummary(kind), action: { label: "Open weather", run: function () { closeZapAssistant(); toggleXp("wx"); } } };
  }

  // Directions — require go/drive/navigate/directions OR explicit "directions home"
  if (/\b(go|drive|navigate|directions?)\b/.test(q) || /^(home|work)$/.test(q) || /\bdirections (to )?(home|work)\b/.test(q)) {
    var places = loadPlaces();
    var wantP = null;
    var m = q.match(/(?:directions?|drive|navigate|go)\s+(?:to\s+)?(.+)$/);
    if (m) wantP = m[1].replace(/[?.!]+$/, "").trim();
    if (!wantP) wantP = /\bwork\b/.test(q) ? "work" : (/\bhome\b/.test(q) ? "home" : null);
    var hitP = null;
    if (wantP) hitP = places.filter(function (p) { return (p.name || "").toLowerCase().indexOf(wantP) >= 0 || (p.id || "").toLowerCase() === wantP; })[0];
    if (!hitP && places.length) {
      hitP = places.filter(function (p) { return q.indexOf((p.name || "").toLowerCase()) >= 0; })[0] || (wantP ? null : places[0]);
    }
    if (!hitP) return { skill: "places.go", text: "No saved places yet. Add Home or Work on the map card." };
    return {
      skill: "places.go",
      text: "Directions to " + (hitP.name || "place") + ".",
      action: { label: "Go", run: function () { closeZapAssistant(); openDirectionsTo(hitP); } }
    };
  }
  if (/places|saved places|list places/.test(q)) {
    var ps = loadPlaces();
    return { skill: "places.list", text: ps.length ? ("Saved: " + ps.map(function (p) { return p.name; }).join(", ")) : "No saved places yet." };
  }
  if (/^open\s+/.test(q) || /\blaunch\b/.test(q)) {
    var name = q.replace(/^(open|launch)\s+/, "").trim();
    var apps = APPS.filter(function (a) { return a.on; });
    var app = apps.filter(function (a) { return (a.name || "").toLowerCase().indexOf(name) >= 0 || (a.id || "") === name; })[0];
    if (!app) {
      try {
        var cat = (typeof CATALOG !== "undefined" ? CATALOG : []).filter(function (c) { return (c.name || "").toLowerCase().indexOf(name) >= 0; })[0];
        if (cat) app = { id: cat.id, name: cat.name, url: cat.url, pkg: cat.pkg, web: cat.web };
      } catch (e) {}
    }
    if (!app) return { skill: "apps.open", text: "Couldn't find \"" + name + "\" in your apps. Try another name." };
    return { skill: "apps.open", text: "Open " + app.name + "?", action: { label: "Open", run: function () { closeZapAssistant(); openApp(app); } } };
  }
  if (/maps|where am i|locate/.test(q)) {
    return { skill: "maps.here", text: GPS ? ("You are near " + ((PLACE && (PLACE.road || PLACE.city)) || (GPS.lat.toFixed(4) + ", " + GPS.lon.toFixed(4)))) : "Location off or still finding you.", action: { label: "Open Maps", run: function () { closeZapAssistant(); openMapsHere(); } } };
  }
  if (/focus|pomodoro|timer/.test(q)) {
    var mins = 25;
    var mm = q.match(/\b(\d{1,3})\s*(m|min|mins|minutes)?\b/);
    if (mm) mins = Math.max(1, Math.min(180, parseInt(mm[1], 10)));
    else if (/50|long/.test(q)) mins = 50;
    else if (/15|short/.test(q)) mins = 15;
    return {
      skill: "focus.start",
      text: "Start a " + mins + "-minute focus session?",
      action: {
        label: "Start focus",
        confirm: true,
        run: function () {
          try { FOC = { st: "idle", mins: mins }; Store.setLocal("focus", FOC); if (FOC.st !== "run") focusToggle(); setHudTab("focus", { silent: true }); } catch (e) {}
        }
      }
    };
  }
  if (/btc|bitcoin|gold|paxg|markets?|how('?s| is) (btc|bitcoin|gold)/.test(q)) {
    var dmk = MK && MK.d || {};
    var btc = dmk.bitcoin, gold = dmk["pax-gold"];
    var bits = [];
    if (btc) bits.push("BTC " + money(btc.usd) + (btc.usd_24h_change != null ? (" (" + (btc.usd_24h_change >= 0 ? "+" : "") + btc.usd_24h_change.toFixed(1) + "%)") : ""));
    if (gold) bits.push("GOLD " + money(gold.usd));
    return { skill: "markets.quote", text: bits.length ? bits.join(" · ") : "Markets still loading.", action: { label: "Markets", run: function () { closeZapAssistant(); toggleXp("mk"); } } };
  }
  if (/\bnote|notes\b/.test(q)) {
    return { skill: "notes.open", text: "Open Notes?", action: { label: "Notes", run: function () { closeZapAssistant(); try { $("#tdNote").click(); } catch (e) {} } } };
  }
  // Not an action — hand off to online/offline AI (never hard-fail)
  return { skill: "chat", text: "" };
}
var HELP_TEXT = "I'm ZAP AI. Try: call <favorite>, directions to home, weather, markets, start focus, open <app>, add holding, switch theme, time. Ask anything else — I'll answer. Runs on open models when online.";
var ZAP_SYS = "You are ZAP AI inside ZAPWISE//OS. Short, helpful, simple words. Never claim you are a proprietary model. Do not invent balances or secrets. Prefer under 40 words. Plain text only — no markdown, no bullets, no asterisks. Dashboard context is for you only: never paste or list it unless the user asks for weather, markets, time, or portfolio.";

function refreshZapAiBar() {
  var bar = $("#zapAiBar"); if (!bar) return;
  var st = $("#zapAiStatus"), btn = $("#zapAiBtn"), del = $("#zapAiDel"), prog = $("#zapAiProg"), note = $("#zapAiNote");
  var a = loadAssistantPrefs();
  var gpu = hasWebGPU();
  // Show bar for offline-brain download / status (not home prompt tiles)
  bar.hidden = false; bar.removeAttribute("aria-hidden");
  if (prog) { prog.hidden = !ZAP_LLM.loading; prog.value = ZAP_LLM.progress || 0; }
  if (del) del.hidden = !(a.modelCached || ZAP_LLM.engine);
  var smart = $("#zapSmart"); if (smart) smart.checked = !!a.smartMode;
  if (!gpu) {
    if (st) st.textContent = "Offline actions + FAQ ready";
    if (btn) btn.hidden = true;
    if (note) { note.hidden = false; note.textContent = "Offline brain needs WebGPU. Online answers still work when connected."; }
    return;
  }
  if (note) note.hidden = true;
  if (btn) btn.hidden = false;
  if (ZAP_LLM.engine || a.modelCached) { if (note) { note.hidden = false; note.textContent = "Offline brain: Qwen2.5 0.5B (~290 MB) in this browser’s storage. With BRAIN ON, chat answers are made on this device."; } }
  if (ZAP_LLM.loading) {
    if (st) st.textContent = "Downloading offline brain… " + Math.round((ZAP_LLM.progress || 0) * 100) + "%";
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
  } else if (ZAP_LLM.engine || a.modelCached) {
    if (st) st.textContent = a.webllm ? "Offline brain ready" : "Offline brain paused";
    if (btn) { btn.disabled = false; btn.textContent = a.webllm ? "BRAIN ON" : "BRAIN OFF"; }
  } else {
    if (st) st.textContent = "Optional offline brain";
    if (btn) { btn.disabled = false; btn.textContent = "Download offline brain (~290 MB)"; }
    if (note) { note.hidden = false; note.textContent = "Qwen2.5 0.5B via WebLLM. One-time ~290 MB download saved in this browser; needs WebGPU and about 1 GB of graphics memory. After it loads, answers are made on this device and your question isn’t sent anywhere. Quality is basic."; }
  }
}

async function loadWebLLMEngine() {
  if (ZAP_LLM.engine || ZAP_LLM.loading) return ZAP_LLM.engine;
  if (!hasWebGPU()) throw new Error("WebGPU required");
  ZAP_LLM.loading = true; ZAP_LLM.progress = 0; refreshZapAiBar();
  try {
    var mod = await import("https://esm.run/@mlc-ai/web-llm");
    var CreateMLCEngine = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
    if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
    var engine = await CreateMLCEngine(ZAP_LLM.modelId, {
      initProgressCallback: function (p) {
        try {
          ZAP_LLM.progress = (p && typeof p.progress === "number") ? p.progress : ZAP_LLM.progress;
          var st = $("#zapAiStatus");
          if (st) st.textContent = (p && p.text) ? String(p.text).slice(0, 72) : ("Downloading… " + Math.round(ZAP_LLM.progress * 100) + "%");
          var prog = $("#zapAiProg"); if (prog) { prog.hidden = false; prog.value = ZAP_LLM.progress || 0; }
        } catch (e) {}
      }
    });
    ZAP_LLM.engine = engine;
    var a = loadAssistantPrefs(); a.webllm = true; a.modelCached = true; saveAssistantPrefs(a);
    return engine;
  } finally {
    ZAP_LLM.loading = false; refreshZapAiBar();
  }
}

async function deleteWebLLMCache() {
  try { if (ZAP_LLM.engine && ZAP_LLM.engine.unload) await ZAP_LLM.engine.unload(); } catch (e) {}
  ZAP_LLM.engine = null;
  try {
    if (window.caches && caches.keys) {
      var keys = await caches.keys();
      await Promise.all(keys.filter(function (k) {
        return /webllm|mlc|wasm|model/i.test(k);
      }).map(function (k) { return caches.delete(k); }));
    }
  } catch (e) {}
  try {
    if (indexedDB && indexedDB.databases) {
      var dbs = await indexedDB.databases();
      (dbs || []).forEach(function (db) {
        if (db && db.name && /webllm|mlc|tvm/i.test(db.name)) {
          try { indexedDB.deleteDatabase(db.name); } catch (e2) {}
        }
      });
    }
  } catch (e) {}
  var a = loadAssistantPrefs(); a.webllm = false; a.modelCached = false; saveAssistantPrefs(a);
  refreshZapAiBar();
  toast("Offline brain removed");
}

async function zapAskLLM(q) {
  var engine = ZAP_LLM.engine;
  if (!engine) engine = await loadWebLLMEngine();
  var sys = ZAP_SYS + " Dashboard context: " + zapDashContext();
  var reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: sys },
      { role: "user", content: String(q).slice(0, 400) }
    ],
    temperature: 0.45,
    max_tokens: 120
  });
  var text = "";
  try { text = reply.choices[0].message.content; } catch (e) {}
  return String(text || "").trim() || zapOfflineFaq(q);
}

function zapEnqueueSmart(q) {
  return new Promise(function (resolve, reject) {
    ZAP_QUEUE.q.push({ q: q, resolve: resolve, reject: reject });
    zapPumpQueue();
  });
}
function zapPumpQueue() {
  if (ZAP_QUEUE.busy) return;
  var job = ZAP_QUEUE.q.shift();
  if (!job) return;
  ZAP_QUEUE.busy = true;
  var wait = Math.max(0, ZAP_QUEUE.backoffMs - (Date.now() - ZAP_QUEUE.lastAt));
  setTimeout(function () {
    zapAskSmartOnce(job.q).then(function (txt) {
      ZAP_QUEUE.lastAt = Date.now();
      ZAP_QUEUE.backoffMs = 0;
      ZAP_QUEUE.busy = false;
      job.resolve(txt);
      zapPumpQueue();
    }).catch(function (err) {
      ZAP_QUEUE.lastAt = Date.now();
      var msg = String(err && err.message || err || "");
      var retry = /rate|429|402|retry/i.test(msg);
      ZAP_QUEUE.backoffMs = retry ? Math.min(120000, Math.max(15000, (ZAP_QUEUE.backoffMs || 15000) * 1.6)) : 4000;
      ZAP_QUEUE.busy = false;
      job.reject(err);
      zapPumpQueue();
    });
  }, wait);
}
async function zapAskSmartOnce(q) {
  var sys = ZAP_SYS + " Live dashboard (no secrets): " + zapDashContext();
  var url = "https://text.pollinations.ai/" + encodeURIComponent(String(q).slice(0, 400)) +
    "?system=" + encodeURIComponent(sys) + "&temperature=0.5";
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var to = setTimeout(function () { try { ctrl && ctrl.abort(); } catch (e) {} }, 22000);
  try {
    var res = await fetch(url, { method: "GET", signal: ctrl ? ctrl.signal : undefined, cache: "no-store" });
    clearTimeout(to);
    if (!res.ok) {
      var retry = res.headers && res.headers.get && res.headers.get("Retry-After");
      throw new Error(res.status === 402 || res.status === 429
        ? ("Rate limited" + (retry ? (" — retry in " + retry + "s") : ". Try again shortly."))
        : ("Online AI HTTP " + res.status));
    }
    var txt = (await res.text()).trim();
    if (txt.charAt(0) === "<") txt = txt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return (txt.slice(0, 700) || zapOfflineFaq(q));
  } catch (e) {
    clearTimeout(to);
    throw e;
  }
}

function zapFinishBot(elOrNull, text, action, kind) {
  var log = $("#zapLog");
  if (elOrNull && elOrNull.parentNode) {
    try { elOrNull.parentNode.removeChild(elOrNull); } catch (e) {}
  } else if (log && log.lastChild && log.lastChild.classList.contains("bot") && /…|Thinking|Smart|Rate|Private|Online/.test(log.lastChild.textContent || "")) {
    try { log.removeChild(log.lastChild); } catch (e2) {}
  }
  var el = zapAppend("bot", "", null, { skipHist: true, streaming: true, kind: kind || ZAP_KIND_CHAT() });
  zapStreamInto(el, text, function () {
    if (action && action.label && action.run && el) { var b2 = document.createElement("button"); b2.type = "button"; b2.className = "zap-act"; b2.textContent = action.label; b2.addEventListener("click", function () { try { action.run(); } catch (e) { toast("Action failed"); } }); el.appendChild(document.createElement("br")); el.appendChild(b2); }
    updateZapBadge();
  });
}

/* v4.17: every reply says what it is — an answer, a recommendation, an action on this device, or a hand-off to another service */
var ZAP_EXTERNAL_SKILLS = { "apps.open": 1, "places.go": 1, "web.search": 1, "call.fav": 1, "maps.here": 1 };
function ZAP_KIND_CHAT() {
  var a = loadAssistantPrefs();
  if (a.webllm && hasWebGPU() && (ZAP_LLM.engine || a.modelCached)) return "ANSWER · OFFLINE BRAIN ON THIS DEVICE";
  if (navigator.onLine === false || !a.smartMode) return "ANSWER · BUILT-IN HELP ON THIS DEVICE";
  return "ANSWER · POLLINATIONS (ONLINE OPEN MODEL)";
}
function zapKindFor(intent) {
  var sk = intent.skill || "";
  if (intent.kind) return intent.kind;
  if (sk === "fx.convert") return "ANSWER · OPEN.ER-API.COM RATES";
  if (sk === "dict.define") return "ANSWER · DICTIONARYAPI.DEV";
  if (intent.action && ZAP_EXTERNAL_SKILLS[sk]) return "NEEDS ANOTHER APP · TAP TO CONFIRM";
  if (intent.action && intent.action.auto) return "ACTION ON THIS DEVICE · DONE";
  if (intent.action && intent.action.confirm) return "ACTION ON THIS DEVICE · TAP TO CONFIRM";
  return "ANSWER · ON THIS DEVICE";
}
function zapHandle(raw) {
  var q = String(raw || "").trim();
  if (!q) return;
  var inp = $("#zapIn"); if (inp) inp.value = "";
  zapAppend("user", q);
  var intent = routeZapIntent(q);
  if (intent.skill !== "chat") {
    var kind = zapKindFor(intent);
    if (intent.async && typeof intent.runAsync === "function") {
      var thinkA = zapAppend("bot", intent.text || "…", null, { skipHist: true, kind: kind });
      Promise.resolve()
        .then(function () { return intent.runAsync(); })
        .then(function (txt) { zapFinishBot(thinkA, txt || intent.text, intent.action, kind); updateZapBadge(); })
        .catch(function () { zapFinishBot(thinkA, intent.text || "Couldn't finish that.", intent.action, kind); updateZapBadge(); });
      return;
    }
    var bm = zapAppend("bot", intent.text, intent.action, { kind: kind });
    if (intent.extra && bm) { try { intent.extra(bm); } catch (eX) {} }
    if (intent.action && intent.action.auto) {
      try { intent.action.run(); } catch (eA) {}
    }
    updateZapBadge();
    return;
  }
  var a = loadAssistantPrefs();
  var offline = navigator.onLine === false;

  function useFaq(prefix) {
    var txt = (prefix ? prefix + " " : "") + zapOfflineFaq(q);
    zapFinishBot(null, txt, null, "ANSWER · BUILT-IN HELP ON THIS DEVICE");
  }

  // Offline path: WebLLM if ready, else solid FAQ — always reply
  if (offline) {
    if (a.webllm && hasWebGPU() && (ZAP_LLM.engine || a.modelCached)) {
      var think0 = zapAppend("bot", "Thinking offline…", null, { skipHist: true });
      var p0 = ZAP_LLM.engine ? zapAskLLM(q) : loadWebLLMEngine().then(function () { return zapAskLLM(q); });
      p0.then(function (txt) { zapFinishBot(think0, txt); })
        .catch(function () { zapFinishBot(think0, zapOfflineFaq(q) + " When you're online I can answer more.", null, "ANSWER · BUILT-IN HELP ON THIS DEVICE"); });
      return;
    }
    useFaq("You're offline.");
    return;
  }

  // Online: prefer actions already handled; free-form → Pollinations queue; WebLLM optional first if enabled
  if (a.webllm && hasWebGPU() && (ZAP_LLM.engine || a.modelCached)) {
    var think1 = zapAppend("bot", "Thinking…", null, { skipHist: true });
    var p1 = ZAP_LLM.engine ? zapAskLLM(q) : loadWebLLMEngine().then(function () { return zapAskLLM(q); });
    p1.then(function (txt) { zapFinishBot(think1, txt); })
      .catch(function () {
        if (a.smartMode) {
          if (think1) think1.textContent = "Trying online…";
          zapEnqueueSmart(q).then(function (txt) { zapFinishBot(think1, txt, null, "ANSWER · POLLINATIONS (ONLINE OPEN MODEL)"); })
            .catch(function (e2) { zapFinishBot(think1, zapOfflineFaq(q) + " (" + (e2 && e2.message ? e2.message : "online busy") + ")", null, "ANSWER · BUILT-IN HELP ON THIS DEVICE"); });
        } else {
          zapFinishBot(think1, zapOfflineFaq(q), null, "ANSWER · BUILT-IN HELP ON THIS DEVICE");
        }
      });
    return;
  }

  if (a.smartMode) {
    try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("think"); } catch (e) {}
    var think2 = zapAppend("bot", "…", null, { skipHist: true });
    zapEnqueueSmart(q).then(function (txt) {
      try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("idle"); } catch (e) {}
      zapFinishBot(think2, txt);
    }).catch(function (err) {
      try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("idle"); } catch (e) {}
      var note = err && err.message ? err.message : "Online AI busy.";
      zapFinishBot(think2, zapOfflineFaq(q) + " " + note, null, "ANSWER · BUILT-IN HELP ON THIS DEVICE");
    });
    return;
  }

  useFaq("");
}
(function bindZapAssistant() {
  var fab = $("#zapFab"); if (fab) fab.addEventListener("click", openZapAssistant);
  (function bindZapHint() {
    var h = $("#zapHint"); if (!h) return; h.hidden = true; h.classList.remove("on"); return;
  })();
  var close = $("#zapClose"); if (close) close.addEventListener("click", function () { dismissTopOverlay(false); });
  var form = $("#zapForm");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); zapHandle(($("#zapIn") && $("#zapIn").value) || ""); });
  var mic = $("#zapMic");
  if (mic) {
    // Always show mic: unsupported devices fall back to focusing the text field
    mic.addEventListener("click", startZapListen);
  }
  var mute = $("#zapMute");
  if (mute) mute.addEventListener("click", function () {
    var a = loadAssistantPrefs();
    a.voiceOut = !a.voiceOut;
    saveAssistantPrefs(a);
    mute.setAttribute("aria-pressed", a.voiceOut ? "true" : "false");
    mute.textContent = a.voiceOut ? "🔊" : "🔇";
    if (!a.voiceOut) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }
    toast(a.voiceOut ? "ZAP AI voice on" : "ZAP AI voice muted");
  });
  var aiBtn = $("#zapAiBtn");
  if (aiBtn) aiBtn.addEventListener("click", function () {
    var a = loadAssistantPrefs();
    if (!hasWebGPU()) { toast("WebGPU not available on this device"); return; }
    if (ZAP_LLM.engine && a.webllm) {
      a.webllm = false; saveAssistantPrefs(a); refreshZapAiBar(); toast("Offline brain paused"); return;
    }
    if (ZAP_LLM.engine && !a.webllm) {
      a.webllm = true; saveAssistantPrefs(a); refreshZapAiBar(); toast("Offline brain on"); return;
    }
    if (!confirm("Download offline brain (~1 GB)? Stays on this device. No keys. One-time.")) return;
    loadWebLLMEngine().then(function () {
      toast("Offline brain ready");
      refreshZapAiBar();
    }).catch(function (err) {
      toast("Download failed: " + (err && err.message ? err.message : "error"));
      refreshZapAiBar();
    });
  });
  var del = $("#zapAiDel");
  if (del) del.addEventListener("click", function () {
    if (!confirm("Delete the offline brain from this device?")) return;
    deleteWebLLMCache();
  });
  var smart = $("#zapSmart");
  if (smart) {
    try { smart.checked = !!loadAssistantPrefs().smartMode; } catch (e) { smart.checked = true; }
    smart.addEventListener("change", function () {
      var a = loadAssistantPrefs();
      a.smartMode = !!smart.checked;
      saveAssistantPrefs(a);
      toast(a.smartMode ? "Online answers on" : "Online answers off — actions + FAQ only");
    });
  }
  try {
    var pref = loadAssistantPrefs();
    if (mute) { mute.textContent = pref.voiceOut ? "🔊" : "🔇"; mute.setAttribute("aria-pressed", pref.voiceOut ? "true" : "false"); }
    refreshZapAiBar();
  } catch (e) {}
})();

scheduleUpdateChecks();
try {
  window.checkForAppUpdate = checkForAppUpdate;
  if (window.ZAPOS) window.ZAPOS.checkForUpdate = function (m) { checkForAppUpdate(!!m); };
} catch (e) {}
try {
  window.ZAPOS = window.ZAPOS || {};
  window.ZAPOS.setGPS = function (lat, lon, meta) {
    if (lat && typeof lat === "object") { meta = lon || {}; setGPS(+lat.lat, +(lat.lon != null ? lat.lon : lat.lng), Object.assign({}, meta, { accuracy: lat.acc != null ? lat.acc : lat.accuracy, heading: lat.heading, speed: lat.speed })); return; }
    setGPS(lat, lon, meta || {});
  };
  window.ZAPOS.mapFollow = function (on) { MAP.follow = !!on; if (on) { MAP.offX = 0; MAP.offY = 0; } renderMap(true); };
  window.ZAPOS.openSettings = openSettings;
  window.ZAPOS.openTheme = openTheme;
  window.ZAPOS.openMenu = openMenu;
  window.ZAPOS.openZap = openZapAssistant;
  window.ZAPOS.closeZap = closeZapAssistant;
  window.ZAPOS.closeSheet = closeSheet;
  window.ZAPOS.openAddAccount = openAddAccount;
  window.ZAPOS.openCardDetail = openCardDetail;
  window.ZAPOS.dismissOverlay = function () { dismissTopOverlay(false); };
  window.ZAPOS.parseLocalYMD = parseLocalYMD;
  window.ZAPOS.localYMD = localYMD;
  window.ZAPOS.currentFeels = currentFeels;
  window.ZAPOS.getWxDay = function () { return WX_DAY; };
  window.ZAPOS.routeZap = routeZapIntent;
  window.ZAPOS.setFavs = function (arr) { FAVS = Array.isArray(arr) ? arr : []; saveFavs(); return FAVS; };
  window.ZAPOS.seedWx = function (wx) { try { WX = wx; Store.setLocal("wx", wx); syncWxDayIndex(wx && wx.j); try { renderWeather(); } catch (eR) {} } catch (e) {} };
  window.ZAPOS.detectChain = detectChain;
  window.ZAPOS.applyWallpaper = applyWallpaper;
  window.ZAPOS.wallpaperMode = wallpaperMode;
  window.ZAPOS.logCall = logCall;
  window.ZAPOS.zapHandle = zapHandle;
  /* v4.9.4: read-only QA hooks */
  window.ZAPOS.qa = { map: function () { return { follow: MAP.follow, offX: MAP.offX, offY: MAP.offY, z: MAP.z, gps: GPS ? { lat: GPS.lat, lon: GPS.lon } : null, geoOff: GEO_OFF, traffic: trafficWanted(), trafficDead: !!TRAFFIC.dead, trafTiles: (document.getElementById("mapTraffic") && !document.getElementById("mapTraffic").hidden) ? document.querySelectorAll("#mapTraffic img").length : 0 , ensureCardHolos: ensureCardHolos, openUpdateBalance: openUpdateBalance, bankAsOfStr: bankAsOfStr, getBankAccounts: getBankAccounts, bankLinkConfigured: bankLinkConfigured }; }, savePlaces: savePlaces, refreshPlaceEtas: refreshPlaceEtas, renderMap: renderMap, loadPlaces: loadPlaces, setTraffic: setTrafficWanted, trafficWanted: trafficWanted };
} catch (e) {}


/* ========== v4.13.0 Banks — Plaid auto only (no manual entry) ========== */
var BANK_NOTE = "Balances via Plaid · last 4 only · stay on this phone.";
var BANK_LINK = {
  mode: "auto",
  endpoint: "https://zapwise-bank.zapwisehq.workers.dev",
  balancesPath: "/balances",
  labelAuto: "Auto · Plaid"
};
var _bankRows = []; /* in-memory auto rows for UI */
var _bankAsOf = null;
var _bankLastRefresh = 0;
function bankLinkConfigured() {
  return !!(BANK_LINK.endpoint && /^https:\/\//i.test(BANK_LINK.endpoint));
}
function bankDeviceReady() {
  try { return !!(window.ZAP_BANK_PLAID && ZAP_BANK_PLAID.hasToken && ZAP_BANK_PLAID.hasToken()); } catch (e) { return false; }
}
function sanitizeLast4(v) {
  var d = String(v == null ? "" : v).replace(/\D/g, "");
  if (d.length > 4) d = d.slice(-4);
  return d.length === 4 ? d : (d || "");
}
function formatLast4(last4, show) {
  var d = sanitizeLast4(last4);
  if (!d || d.length !== 4) return "";
  return show ? ("••" + d) : "••••";
}
function parseMoneyInput(v) {
  v = String(v == null ? "" : v).replace(/[$,\s]/g, "");
  if (!v) return null;
  var n = parseFloat(v); return isNaN(n) ? NaN : Math.round(n * 100) / 100;
}
function migrateManualBanksOut() {
  /* one-time: drop any typed/manual bank rows so they never show beside Plaid */
  try {
    if (Store.getLocal("bankManualCleared_v413", false)) return;
    var list = loadAccounts();
    var next = list.filter(function (a) { return !(a && a.kind === "bank" && (a.source || "manual") !== "auto"); });
    /* also drop stale auto rows — Plaid last_good / fetch rehydrates them */
    next = next.filter(function (a) { return !(a && a.kind === "bank"); });
    if (next.length !== list.length) saveAccounts(next);
    Store.setLocal("bankManualCleared_v413", true);
  } catch (e) {}
}
function normalizeBankRow(a, source) {
  if (!a) return null;
  var last4 = sanitizeLast4(a.last4 || a.mask || "");
  var bal = (a.bal != null && !isNaN(+a.bal)) ? +a.bal : ((a.balance != null && !isNaN(+a.balance)) ? +a.balance : null);
  var avail = (a.available != null && !isNaN(+a.available)) ? +a.available : ((a.avail != null && !isNaN(+a.avail)) ? +a.avail : null);
  var asOf = a.balAt || a.asOf || null;
  if (asOf && typeof asOf === "string") {
    var parsed = Date.parse(asOf); asOf = isNaN(parsed) ? null : parsed;
  }
  return {
    id: a.id || ("bk_" + Math.random().toString(36).slice(2, 9)),
    catalogId: a.catalogId || null,
    kind: "bank",
    name: a.name || "Bank",
    acctName: a.acctName || "Checking",
    bal: bal,
    available: avail,
    balAt: asOf,
    last4: last4.length === 4 ? last4 : null,
    inTotal: a.inTotal !== false,
    icon: a.icon || "",
    bg: a.bg || "#111827",
    letter: a.letter || (a.name || "B").charAt(0),
    url: a.url || "",
    web: a.web || a.url || "",
    source: "auto",
    _raw: null
  };
}
function mergePlaidRowsIntoStore(rows) {
  if (!Array.isArray(rows)) return;
  var mapped = [];
  rows.forEach(function (row) {
    var n = normalizeBankRow({
      name: row.institution || row.name || "Bank",
      acctName: row.officialName || row.subtype || row.type || "Account",
      balance: row.balance,
      available: row.available,
      asOf: row.asOf,
      last4: row.last4,
      inTotal: true,
      id: row.account_id ? ("plaid_" + String(row.account_id).slice(-12)) : undefined
    }, "auto");
    if (n) mapped.push(n);
  });
  _bankRows = mapped;
  if (mapped.length) {
    var newest = null;
    mapped.forEach(function (r) { if (r.balAt && (!newest || r.balAt > newest)) newest = r.balAt; });
    _bankAsOf = newest || Date.now();
  }
  /* keep accounts store free of bank rows (Plaid-only memory + last_good) */
  try {
    var local = loadAccounts();
    var cleaned = local.filter(function (a) { return !(a && a.kind === "bank"); });
    if (cleaned.length !== local.length) saveAccounts(cleaned);
  } catch (eC) {}
}
function getBankAccounts() {
  try { migrateManualBanksOut(); } catch (eM) {}
  if (_bankRows && _bankRows.length) return _bankRows.slice();
  try {
    var lg = window.ZAP_BANK_PLAID && ZAP_BANK_PLAID.loadLastGood && ZAP_BANK_PLAID.loadLastGood();
    if (lg && lg.rows && lg.rows.length) {
      mergePlaidRowsIntoStore(lg.rows);
      if (lg.at) _bankAsOf = lg.at;
      return _bankRows.slice();
    }
  } catch (e0) {}
  return [];
}
function refreshBankAccountsFromLink(opts) {
  opts = opts || {};
  if (!bankLinkConfigured() || !bankDeviceReady()) {
    try {
      var lg = window.ZAP_BANK_PLAID && ZAP_BANK_PLAID.loadLastGood && ZAP_BANK_PLAID.loadLastGood();
      if (lg && lg.rows && lg.rows.length) {
        mergePlaidRowsIntoStore(lg.rows);
        if (lg.at) _bankAsOf = lg.at;
      }
    } catch (e0) {}
    try { renderBanks(); } catch (e) {}
    return Promise.resolve(getBankAccounts());
  }
  return ZAP_BANK_PLAID.fetchBalances(!!opts.refresh).then(function (data) {
    var rows = (data && data.accounts) || [];
    mergePlaidRowsIntoStore(rows);
    _bankLastRefresh = Date.now();
    if (!_bankAsOf) _bankAsOf = Date.now();
    try { renderBanks(); } catch (e) {}
    try { renderAccounts(); } catch (e2) {}
    try { renderHoldings(); } catch (e3) {}
    return getBankAccounts();
  }).catch(function () {
    try {
      var lg2 = ZAP_BANK_PLAID.loadLastGood && ZAP_BANK_PLAID.loadLastGood();
      if (lg2 && lg2.rows) {
        mergePlaidRowsIntoStore(lg2.rows);
        if (lg2.at) _bankAsOf = lg2.at;
      }
    } catch (e4) {}
    try { renderBanks(); } catch (e5) {}
    return getBankAccounts();
  });
}
function bankSourceLabel() { return BANK_LINK.labelAuto; }
function openBankSettings() {
  var ready = bankDeviceReady();
  var html = '<p class="note">Auto-link uses Plaid. Your bank password stays on their screen. Only balances and last 4 digits are stored on this device.</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
    '<button class="btn" type="button" id="bkGoLink">' + (ready ? "Link another bank" : "Link bank") + "</button>" +
    '<button class="btn" type="button" id="bkShowPair"' + (ready ? "" : " disabled") + ">Show pair code</button>" +
    '<button class="btn" type="button" id="bkAddDevice">Add this device</button>' +
    '<button class="btn" type="button" id="bkRefreshAuto"' + (ready ? "" : " disabled") + ">Refresh balances</button>" +
    '<button class="btn warn" type="button" id="bkUnlink"' + (ready ? "" : " disabled") + ">Unlink bank</button>" +
    "</div>" +
    '<p class="note" id="bkSetStatus" style="margin-top:10px"></p>';
  sheet("Bank link", html, function (b) {
    function st(msg) { var el = b.querySelector("#bkSetStatus"); if (el) el.textContent = msg || ""; }
    b.querySelector("#bkGoLink").addEventListener("click", function () {
      closeSheet();
      location.href = (window.ZAP_BANK_PLAID && ZAP_BANK_PLAID.linkPage) || "/os/link/";
    });
    b.querySelector("#bkShowPair").addEventListener("click", function () {
      if (!window.ZAP_BANK_PLAID) return;
      st("Making a code…");
      ZAP_BANK_PLAID.pairCode().then(function (d) {
        st("Code " + (d.code || "") + " · expires in about 10 minutes. Enter it on your other device.");
      }).catch(function () { st("Could not make a code."); });
    });
    b.querySelector("#bkAddDevice").addEventListener("click", function () {
      var code = prompt("Enter the 8-character pair code from your other device:");
      if (!code) return;
      st("Pairing…");
      ZAP_BANK_PLAID.pairWithCode(code).then(function () {
        st("This device is paired. Pulling balances…");
        return refreshBankAccountsFromLink({ refresh: true });
      }).then(function () {
        try { renderBanks(); } catch (e) {}
        toast("Device added");
        closeSheet();
      }).catch(function () { st("That code didn’t work. Try a fresh one."); });
    });
    b.querySelector("#bkRefreshAuto").addEventListener("click", function () {
      st("Refreshing…");
      refreshBankAccountsFromLink({ refresh: true }).then(function () {
        st("Updated.");
        try { renderBanks(); } catch (e) {}
      }).catch(function () { st("Could not refresh."); });
    });
    b.querySelector("#bkUnlink").addEventListener("click", function () {
      if (!confirm("Unlink your bank from Zapwise on all devices?")) return;
      st("Unlinking…");
      ZAP_BANK_PLAID.unlink().then(function () {
        _bankRows = [];
        _bankAsOf = null;
        try {
          var next = loadAccounts().filter(function (a) { return !(a && a.kind === "bank"); });
          saveAccounts(next);
        } catch (eU) {}
        try { renderBanks(); } catch (e) {}
        toast("Bank unlinked");
        closeSheet();
      }).catch(function () { st("Could not unlink."); });
    });
  });
}
function openLinkBankStub() {
  if (!bankLinkConfigured()) {
    toast("Bank link isn’t set up yet.");
    return;
  }
  if (!bankDeviceReady()) {
    location.href = (window.ZAP_BANK_PLAID && ZAP_BANK_PLAID.linkPage) || "/os/link/";
    return;
  }
  openBankSettings();
}
function bankMoney(n) {
  var v = (n == null || isNaN(+n)) ? 0 : +n;
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function bankDateStr(t) {
  if (!t) return "";
  try { return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; }
}
function bankClockStr(t) {
  if (!t) return "";
  try { return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; }
}
function bankAsOfStr(t) {
  if (!t) return "";
  try {
    return "Auto · Plaid · updated " + bankClockStr(t);
  } catch (e) { return ""; }
}
function bankAcctLabel(a) {
  var bank = (a && a.name) || "Bank";
  var acct = (a && a.acctName) ? String(a.acctName).trim() : "Checking";
  if (!acct) acct = "Checking";
  return bank + " · " + acct;
}
function bankPrivacyOn() {
  try { return !!Store.getLocal("bankPrivacy", false); } catch (e) { return false; }
}
function setBankPrivacy(on) {
  try { Store.setLocal("bankPrivacy", !!on); } catch (e) {}
  var host = $("#hBk"); if (host) host.classList.toggle("bk-private", !!on);
  var pm = $("#panelMoney"); if (pm) pm.classList.toggle("bk-private", !!on);
  var eye = $("#hBkEye");
  if (eye) {
    eye.setAttribute("aria-pressed", on ? "true" : "false");
    eye.setAttribute("aria-label", on ? "Show balances and last 4" : "Hide balances and last 4");
    eye.textContent = on ? "🙈" : "👁";
  }
}
function bankStats() {
  var total = 0, n = 0, priced = 0;
  getBankAccounts().forEach(function (a) {
    n++;
    if (a.bal != null && !isNaN(a.bal)) { total += +a.bal; priced++; }
  });
  return { total: total, n: n, priced: priced };
}
/* stubs — manual bank UI removed in v4.13.0 */
function openAddBankPicker() { openLinkBankStub(); }
function openAddBank() { openLinkBankStub(); }
function openEditBank() { /* no-op */ }
function openUpdateBalance() { /* no-op */ }
function renderBanks() {
  var host = $("#hBkGrid"), totalEl = $("#hBkTotal"), subEl = $("#hBkSub"), card = $("#hBk");
  if (!host) return;
  try { migrateManualBanksOut(); } catch (eM) {}
  var priv = bankPrivacyOn();
  if (card) card.classList.toggle("bk-private", priv);
  var pm2 = $("#panelMoney"); if (pm2) pm2.classList.toggle("bk-private", priv);
  setBankPrivacy(priv);
  var banks = getBankAccounts();
  var st = bankStats();
  var ready = bankDeviceReady();
  var linked = ready && banks.length > 0;
  if (totalEl) totalEl.textContent = priv ? "••••••" : (banks.length && st.priced ? bankMoney(st.total) : "—");
  if (subEl) {
    if (!ready && !banks.length) subEl.textContent = "Link your bank · balances stay on this phone";
    else if (!banks.length) subEl.textContent = "Pulling balances…";
    else subEl.textContent = st.n + " account" + (st.n === 1 ? "" : "s") + (priv ? " · privacy on" : "");
  }
  var asLine = bankAsOfStr(_bankAsOf || (banks[0] && banks[0].balAt));
  var foot = $("#hBkFoot");
  if (foot) {
    if (linked) foot.textContent = "Tap a card to refresh · eye hides balances + last 4";
    else foot.textContent = "Only last 4 digits · never full account numbers";
  }
  if (!banks.length) {
    var cta = ready
      ? '<button type="button" class="bk-link-auto" id="bkLinkAuto">Refresh / manage link</button><span class="bk-link-note">Source: Auto · Plaid</span>'
      : '<button type="button" class="bk-link-auto" id="bkLinkAuto">Link bank</button><span class="bk-link-note">Plaid · read-only balances</span>';
    host.innerHTML = cta;
    return;
  }
  host.innerHTML = banks.map(function (a) {
    var hasBal = a.bal != null && !isNaN(a.bal);
    var balTxt = priv ? "••••••" : bankMoney(hasBal ? +a.bal : 0);
    var showAvail = !priv && a.available != null && !isNaN(+a.available) && hasBal && Math.abs(+a.available - +a.bal) >= 0.01;
    var availHtml = showAvail ? ('<span class="bk-avail">Avail ' + esc(bankMoney(+a.available)) + "</span>") : "";
    var l4 = formatLast4(a.last4, !priv);
    var l4html = l4 ? ('<span class="bk-last4"><span class="bk-last4-digits">' + esc(l4) + "</span></span>") : "";
    return '<article class="bk-card bk-card-auto" data-bk="' + esc(a.id) + '" role="listitem" tabindex="0" aria-label="' + esc(bankAcctLabel(a)) + '">' +
      '<div class="bk-card-top"><b class="bk-bank-name">' + esc(a.name) + "</b>" + l4html + "</div>" +
      '<div class="bk-card-mid"><span class="bk-acct-name">' + esc(a.acctName || "Account") + '</span><span class="bk-bal">' + esc(balTxt) + "</span></div>" +
      (availHtml ? ('<div class="bk-card-bot">' + availHtml + "</div>") : "") +
      "</article>";
  }).join("") +
    (asLine ? ('<p class="bk-asof-line">' + esc(asLine) + "</p>") : "") +
    '<button type="button" class="bk-link-manage" id="bkLinkAuto" aria-label="Bank link settings">Manage link</button>';
}
(function bindBankCard() {
  var grid = $("#hBkGrid"), eye = $("#hBkEye");
  if (eye) eye.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    setBankPrivacy(!bankPrivacyOn());
    try { renderBanks(); } catch (err) {}
  });
  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest && e.target.closest("#bkLinkAuto");
    if (!link) return;
    e.preventDefault(); e.stopPropagation();
    openLinkBankStub();
  }, true);
  if (!grid) return;
  grid.addEventListener("click", function (e) {
    var tile = e.target.closest("[data-bk]"); if (!tile) return;
    e.preventDefault();
    toast("Refreshing…");
    refreshBankAccountsFromLink({ refresh: true }).then(function () {
      toast("Balances updated");
    }).catch(function () { toast("Couldn’t refresh"); });
  });
})();
try { migrateManualBanksOut(); } catch (eMig) {}
try { renderBanks(); } catch (eInitBk) {}
try {
  var justLinked = /[?&](linked=1|bank=linked)(&|$)/.test(location.search);
  if (justLinked) {
    /* v4.14.0: returned from /os/link/ — toast, fresh balances, clean URL */
    try {
      var cu = new URL(location.href);
      cu.searchParams.delete("linked"); cu.searchParams.delete("bank");
      history.replaceState(null, "", cu.pathname + (cu.search || "") + cu.hash);
    } catch (eCu) {}
    setTimeout(function () {
      toast("Bank linked");
      refreshBankAccountsFromLink({ refresh: true }).then(function () { try { renderBanks(); } catch (eR2) {} }).catch(function () {});
      try { var hb = document.getElementById("hBk"); if (hb) hb.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (eSc) {}
    }, 300);
  } else if (bankDeviceReady()) {
    refreshBankAccountsFromLink().then(function () { try { renderBanks(); } catch (eR) {} });
  }
} catch (eAutoBk) {}
/* bank auto-refresh: every 15 min while visible + on focus via onReturn */
setInterval(function () {
  try {
    if (document.visibilityState !== "visible") return;
    if (!bankDeviceReady()) return;
    refreshBankAccountsFromLink({ refresh: true });
  } catch (eBr) {}
}, 15 * 60 * 1000);
try { ensureCardHolos(); } catch (eHolo) {}
setInterval(function () {
  try {
    var el = document.getElementById("hBk");
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > (window.innerHeight || 800)) return;
    renderBanks();
  } catch (eAs) {}
}, 60000);

/* ========== v4.9.5 page tour ("?" in the top bar) + one-time welcome card ========== */
function tourSteps() {
  var S = [
    ["#srch", "Search", "Search your apps, or the web with the provider you pick. The mic searches by voice."],
    ["#panelToday", "Today", "Time, date and weather. Tap the weather for hourly and days ahead. Calendar and Note open below."],
    ["#cardPlay", "Now Playing", "Pick your music app, then tap to open it."],
    ["#mFocus", "Focus", "A focus timer. Pick 15, 25 or 50 minutes, or tap ✎ for your own length."],
    ["#panelNav", "Navigate", "Live map with traffic plus your saved places. Tap a place for directions."],
    ["#panelMoney", "Banking", "Your linked bank via Plaid. Only the last 4 digits show. The eye hides balances."],
    ["#cardInvest", "Investments", "Crypto prices, your holdings and watchlist. Tap View Portfolio for details."],
    ["#phoneMount", "Phone", "Dial pad and favorite people. Tap to call."],
    ["#appsSection", "Apps", "Six categories of your apps. Tap one to open its apps, ＋ to add, View All for the full grid."],
    ["#v5Sug", "Suggestions", "Ideas from simple rules on this phone (time of day, your saved places). Nothing happens until you tap Accept."],
    [".top-r", "ZAP AI, gestures and help", "Tap the mic to ask ZAP AI. Swipe down at the top to search, left for app categories, right for Quick Actions. On a computer press / to search, A for apps, Q for Quick Actions. Tap ? anytime for this tour."]
  ];
  return S.filter(function (s) { var el = document.querySelector(s[0]); return el && !el.hidden && el.getClientRects().length; });
}
function tourSafe() {
  var p = document.getElementById("tourSafe");
  if (!p) { p = document.createElement("div"); p.id = "tourSafe"; p.setAttribute("aria-hidden", "true"); document.body.appendChild(p); }
  var cs = getComputedStyle(p);
  return { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}
function startTour() {
  if (TOUR.on) return;
  try { closeZapAssistant(true); } catch (e) {}
  try { closeSheet(true); } catch (e) {}
  try { closeCardDetail(true); } catch (e) {}
  try { if (document.documentElement.classList.contains("map-fs-open")) closeMapOverlay(); } catch (e) {}
  try { hideMapPlaceCard(); } catch (e) {}
  try { hideScrimIfIdle(); } catch (e) {}
  try { dismissWelcome(); } catch (e) {}
  TOUR.steps = tourSteps(); if (!TOUR.steps.length) return;
  TOUR.on = true; TOUR.i = 0;
  var r = document.createElement("div");
  r.id = "tour"; r.className = "tour"; r.setAttribute("role", "dialog"); r.setAttribute("aria-modal", "true"); r.setAttribute("aria-label", "Page tour");
  r.innerHTML = '<div class="tour-spot" id="tourSpot" aria-hidden="true"></div>' +
    '<div class="tour-tip" id="tourTip"><div class="tour-k" id="tourK"></div><b id="tourT"></b><p id="tourP"></p>' +
    '<div class="tour-btns"><button type="button" class="tour-skip" id="tourSkip">Skip</button><span class="tour-sp"></span>' +
    '<button type="button" class="tour-b" id="tourBack">Back</button><button type="button" class="tour-b tour-next" id="tourNext">Next</button></div></div>';
  document.body.appendChild(r);
  TOUR.root = r;
  r.querySelector("#tourSkip").addEventListener("click", function (e) { e.stopPropagation(); endTour(); });
  r.querySelector("#tourBack").addEventListener("click", function (e) { e.stopPropagation(); if (TOUR.i > 0) tourGo(TOUR.i - 1); });
  r.querySelector("#tourNext").addEventListener("click", function (e) { e.stopPropagation(); if (TOUR.i < TOUR.steps.length - 1) tourGo(TOUR.i + 1); else endTour(); });
  window.addEventListener("scroll", tourPlace, { passive: true });
  window.addEventListener("resize", tourPlace, { passive: true });
  overlayPushHistory();
  tourGo(0);
}
function tourGo(i) {
  if (!TOUR.on) return;
  TOUR.i = i;
  var s = TOUR.steps[i], el = document.querySelector(s[0]); if (!el) { endTour(); return; }
  var r = TOUR.root;
  r.querySelector("#tourK").textContent = "Step " + (i + 1) + " of " + TOUR.steps.length;
  r.querySelector("#tourT").textContent = s[1];
  r.querySelector("#tourP").textContent = s[2];
  r.querySelector("#tourBack").disabled = i === 0;
  r.querySelector("#tourNext").textContent = i === TOUR.steps.length - 1 ? "Done" : "Next";
  var fixedTop = !!el.closest(".top");
  if (!fixedTop) {
    var rect = el.getBoundingClientRect(), vh = window.innerHeight;
    var y = (window.scrollY || 0) + rect.top - (rect.height > vh * 0.55 ? 76 : Math.max(76, (vh - rect.height) / 2 - 60));
    var smooth = motionWanted();
    try { window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" }); } catch (e) { window.scrollTo(0, Math.max(0, y)); }
  }
  tourPlace();
  clearTimeout(TOUR.t); TOUR.t = setTimeout(tourPlace, 500);
  setTimeout(tourPlace, 900);
  try { r.querySelector("#tourNext").focus({ preventScroll: true }); } catch (e) {}
}
function tourPlace() {
  if (!TOUR.on || !TOUR.root) return;
  var s = TOUR.steps[TOUR.i], el = s && document.querySelector(s[0]); if (!el) return;
  var spot = TOUR.root.querySelector("#tourSpot"), tip = TOUR.root.querySelector("#tourTip");
  var rc = el.getBoundingClientRect(), pad = 6, vh = window.innerHeight, sf = tourSafe();
  var top = Math.max(sf.t + 2, rc.top - pad), bot = Math.min(vh - 2, rc.bottom + pad);
  spot.style.top = top + "px"; spot.style.left = Math.max(2, rc.left - pad) + "px";
  spot.style.width = Math.min(window.innerWidth - 4, rc.width + pad * 2) + "px"; spot.style.height = Math.max(20, bot - top) + "px";
  var th = tip.offsetHeight || 150, gap = 12, ty;
  if (vh - bot - sf.b >= th + gap * 2) ty = bot + gap;
  else if (top - sf.t >= th + gap * 2) ty = top - gap - th;
  else ty = vh - sf.b - th - gap;
  ty = Math.max(sf.t + gap, Math.min(vh - sf.b - th - gap, ty));
  tip.style.top = Math.round(ty) + "px";
}
function endTour() {
  if (!TOUR.on) return;
  TOUR.on = false; clearTimeout(TOUR.t);
  window.removeEventListener("scroll", tourPlace); window.removeEventListener("resize", tourPlace);
  try { if (TOUR.root) TOUR.root.remove(); } catch (e) {}
  TOUR.root = null;
  scheduleHistSync();
}
document.addEventListener("keydown", function (e) {
  if (!TOUR.on) return;
  if (e.key === "ArrowRight") { e.preventDefault(); $("#tourNext") && $("#tourNext").click(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); if (TOUR.i > 0) tourGo(TOUR.i - 1); }
}, true);
(function bindTourBtn() {
  var b = $("#tourBtn"); if (!b) return;
  b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); startTour(); });
})();
/* one-time welcome: small card, never blocks the page; tour only if they tap it */
function dismissWelcome() {
  var w = $("#welcomeCard"); if (!w) return;
  w.remove();
  document.removeEventListener("pointerdown", welcomeOutside, true);
}
function welcomeOutside(e) {
  var w = $("#welcomeCard"); if (!w) { document.removeEventListener("pointerdown", welcomeOutside, true); return; }
  if (!w.contains(e.target)) dismissWelcome();
}
function showWelcomeOnce() {
  if (Store.getLocal("welcomeSeen", false)) return;
  try { Store.setLocal("welcomeSeen", true); } catch (e) {}
  var w = document.createElement("div");
  w.id = "welcomeCard"; w.className = "welcome-card"; w.setAttribute("role", "status");
  w.innerHTML = '<button type="button" class="wc-x" id="wcClose" aria-label="Close">✕</button>' +
    '<b>Welcome to ZAPWISE//OS</b><p>Tap <span class="wc-q">?</span> up top anytime for a quick tour.</p>' +
    '<div class="wc-row"><button type="button" class="chip" id="wcTour">Take the tour</button><button type="button" class="chip" id="wcHome">Set Home &amp; Work</button><button type="button" class="chip" id="wcMusic">Pick music app</button></div>';
  document.body.appendChild(w);
  w.querySelector("#wcClose").addEventListener("click", dismissWelcome);
  w.querySelector("#wcTour").addEventListener("click", function () { dismissWelcome(); startTour(); });
  w.querySelector("#wcHome").addEventListener("click", function () { dismissWelcome(); try { openPlaceEditor("home"); } catch (e) {} });
  w.querySelector("#wcMusic").addEventListener("click", function () { dismissWelcome(); try { openMedia(); } catch (e) {} });
  setTimeout(function () { document.addEventListener("pointerdown", welcomeOutside, true); }, 50);
}

try { startCompass(false); } catch (e) {}
try { window.ZAPOS.startTour = startTour; window.ZAPOS.endTour = endTour; window.ZAPOS.renderBanks = renderBanks; window.ZAPOS.openAddBankPicker = openLinkBankStub; window.ZAPOS.sanitizeLast4 = sanitizeLast4; window.ZAPOS.bankPrivacyOn = bankPrivacyOn; window.ZAPOS.setBankPrivacy = setBankPrivacy; window.ZAPOS.qa.compass = function () { return { c: COMPASS, gps: GPS && GPS.lat, hd: currentHeading() }; }; window.ZAPOS.qa.hist = function () { return { depth: HIST.depth, expect: HIST.expect, layers: overlayLayers(), state: history.state, len: history.length }; }; window.ZAPOS.qa.banks = function () { var rows = getBankAccounts(); return { n: rows.length, privacy: bankPrivacyOn(), total: bankStats().total, last4s: rows.map(function (a) { return a.last4 || null; }), source: "auto" }; }; window.ZAPOS.qa.holo = function () { return { motion: motionWanted(), live: document.querySelectorAll(".card.br.is-live .card-holo-foil").length, foil: !!document.querySelector(".card-holo-foil"), glow: !!document.querySelector(".card-holo-glow") }; }; } catch (eQ) {}
setTimeout(showWelcomeOnce, 1400);
if (!Store.getLocal("seenHelp", false)) { var _sa = false; try { _sa = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); } catch (eTip) {} if (!_sa) { Store.setLocal("seenHelp", true); } else { Store.setLocal("seenHelp", true); } }

/* ========== v4.14.0 keyboard: Enter/Space activate role=button cards (e.g. Markets, bank cards) ========== */
document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  var t = e.target;
  if (!t || !t.matches) return;
  if (t.matches("button, a, input, select, textarea, [contenteditable]")) return;
  if (!t.matches('[role="button"][tabindex], .bk-card[tabindex]')) return;
  e.preventDefault();
  try { t.click(); } catch (err) {}
});

/* ========== v4.15.0 layout glue (search provider, Today city, GPS pill, Banking/Investments, 6 app categories, custom focus) ========== */
(function v5Layout() {
  /* --- search provider + voice --- */
  var prov = $("#srchProv");
  if (prov) {
    prov.value = searchProvKey();
    prov.addEventListener("change", function () {
      try { Store.setLocal("searchProv", prov.value); } catch (e) {}
      toast("Web search: " + searchProv().name);
    });
  }
  var mic = $("#srchMic"), inp = $("#srchQ");
  if (mic && inp) mic.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { try { openZapAssistant(); } catch (eZ) {} return; }
    try {
      var r = new SR(); r.lang = navigator.language || "en-US"; r.interimResults = false; r.maxAlternatives = 1;
      mic.classList.add("on"); toast("Listening…");
      r.onresult = function (ev) {
        var t = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || "";
        inp.value = t; inp.focus();
        try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch (eI) {}
      };
      r.onerror = function () { toast("Didn’t catch that"); };
      r.onend = function () { mic.classList.remove("on"); };
      r.start();
    } catch (eR) { mic.classList.remove("on"); try { openZapAssistant(); } catch (eZ2) {} }
  });

  /* --- Today: city pin + weather opens detail --- */
  function paintCity() {
    var el = $("#tdCityV"); if (!el) return;
    var name = (WX && WX.place) ? String(WX.place) : "";
    var t = name || (GEO_OFF ? "Set your city" : "Locating…");
    if (el.textContent !== t) el.textContent = t;
  }
  var city = $("#tdCity");
  if (city) city.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    try { var hw = $("#hWx"); if (hw) hw.click(); } catch (eC) {}
  });

  /* --- Navigate: GPS pill --- */
  function paintGps() {
    var pill = $("#v5Gps"); if (!pill) return;
    var live = !!(GPS && GPS.at && Date.now() - GPS.at < 5 * 60000) && !GEO_OFF;
    var t = live ? "GPS LIVE" : (GEO_OFF ? "GPS OFF" : "GPS …");
    pill.lastChild.textContent = t;
    pill.classList.toggle("live", live);
    pill.classList.toggle("off", !live);
  }

  /* --- Banking extras: institution name + verified, View Account --- */
  function bankCatalogEntry(name) {
    var n = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!n || typeof ACCOUNT_CATALOG === "undefined") return null;
    for (var i = 0; i < ACCOUNT_CATALOG.length; i++) {
      var c = ACCOUNT_CATALOG[i];
      var cn = String(c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cn && (n === cn || n.indexOf(cn) === 0 || cn.indexOf(n) === 0)) return c;
    }
    return null;
  }
  function v5BankExtras() {
    var banks = []; try { banks = getBankAccounts() || []; } catch (e) {}
    var nm = $("#v5BkName");
    if (nm) {
      if (banks.length) {
        var inst = banks[0].name || "Bank";
        nm.innerHTML = esc(inst) + ' <span class="v5-ver" title="Linked through Plaid" aria-label="Verified link through Plaid">✓</span>';
        nm.hidden = false;
      } else nm.hidden = true;
    }
    var v = $("#v5BankView");
    if (v) { v.textContent = "View Account"; v.hidden = !banks.length; }
  }
  try {
    var _rb = renderBanks;
    renderBanks = function () { var r = _rb.apply(this, arguments); try { v5BankExtras(); } catch (e) {} return r; };
  } catch (eRb) {}
  var bv = $("#v5BankView");
  if (bv) bv.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    var banks = []; try { banks = getBankAccounts() || []; } catch (e1) {}
    if (!banks.length) { openLinkBankStub(); return; }
    var c = bankCatalogEntry(banks[0].name);
    if (c) openApp(c); else openLinkBankStub();
  });

  /* --- Investments: honest counts + View Portfolio --- */
  function paintInvest() {
    var el = $("#v5InvCounts"); if (!el) return;
    var h = 0, w = 0;
    try { h = loadHoldings().length; } catch (e) {}
    try { w = (COINS || []).length; } catch (e2) {}
    var t = "Holdings: " + h + " | Watchlist: " + w + (_plaidHoldN ? " | Linked: " + _plaidHoldN : "");
    if (el.textContent !== t) el.textContent = t;
  }
  var iv = $("#v5InvView");
  if (iv) iv.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    try { openCardDetail("mk", { fromUser: true }); } catch (eO) {}
  });

  /* --- Apps: 6 colored categories --- */
  var V5_GROUPS = [
    { id: "social", name: "Social", cats: ["social"], color: "#3d8bff" },
    { id: "entertainment", name: "Entertainment", cats: ["entertainment", "music", "games"], color: "#a45bff" },
    { id: "productivity", name: "Productivity", cats: ["work", "utilities", "money", "lifestyle"], color: "#ffb02e" },
    { id: "ai", name: "AI", cats: ["ai"], color: "#3dff9e" },
    { id: "navigation", name: "Navigation", cats: ["travel"], color: "#05d9e8" },
    { id: "shopping", name: "Shopping", cats: ["shop", "food"], color: "#ff4fa3" }
  ];
  function groupApps(g) {
    var on = (APPS || []).filter(function (a) { return a.on; });
    return on.filter(function (a) { var c = "more"; try { c = appCatOf(a); } catch (e) {} return g.cats.indexOf(c) >= 0; });
  }
  function v5RenderCats() {
    var box = $("#v5Cats"); if (!box) return;
    var html = V5_GROUPS.map(function (g) {
      var list = groupApps(g);
      var icons = list.slice(0, 3).map(function (a) { return '<span class="v5-ai">' + iconHTML(a) + "</span>"; }).join("");
      return '<div class="v5-cat" role="listitem" style="--cc:' + g.color + '">' +
        '<button type="button" class="v5-cat-main" data-v5cat="' + g.id + '" aria-label="' + esc(g.name) + ", " + list.length + ' apps">' +
          '<span class="v5-cat-h"><b>' + esc(g.name) + "</b></span>" +
          '<span class="v5-cat-ic">' + (icons || '<span class="v5-empty">No apps yet</span>') + "</span>" +
        "</button>" +
        '<div class="v5-cat-f"><small>' + list.length + (list.length === 1 ? " app" : " apps") + '</small>' +
        '<button type="button" class="v5-cat-add" data-v5add="' + g.id + '" aria-label="Add an app to ' + esc(g.name) + '">＋</button></div>' +
      "</div>";
    }).join("");
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
  }
  function openGroup(id) {
    var g = V5_GROUPS.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    var list = groupApps(g);
    var html = '<div class="apps v5-sheet-apps" role="list">' + list.map(function (a, i) {
      return '<button type="button" class="tile" role="listitem" data-gi="' + i + '" aria-label="Open ' + esc(a.name) + '"><span class="ic">' + iconHTML(a) + '</span><span class="lb">' + esc(a.name) + "</span></button>";
    }).join("") + '<button type="button" class="tile add" data-gadd="1" aria-label="Add an app"><span class="ic" aria-hidden="true">＋</span><span class="lb">Add</span></button></div>' +
      (list.length ? "" : '<p class="note">No ' + esc(g.name) + " apps on your grid yet. Tap ＋ to add one.</p>");
    sheet(g.name.toUpperCase() + " · " + list.length, html, function (b) {
      b.addEventListener("click", function (e) {
        var t = e.target.closest("[data-gi],[data-gadd]"); if (!t) return;
        if (t.hasAttribute("data-gadd")) { closeSheet(); openAddApp({ focusSearch: true }); return; }
        var a = list[+t.getAttribute("data-gi")]; if (a) openApp(a);
      });
    });
  }
  var cats = $("#v5Cats");
  if (cats) cats.addEventListener("click", function (e) {
    var add = e.target.closest("[data-v5add]");
    if (add) { e.preventDefault(); openAddApp({ focusSearch: true }); return; }
    var m = e.target.closest("[data-v5cat]");
    if (m) { e.preventDefault(); openGroup(m.getAttribute("data-v5cat")); }
  });
  function setAllOpen(open) {
    var full = $("#v5AppsFull"), btn = $("#v5AppsAll");
    if (full) full.hidden = !open;
    if (btn) { btn.setAttribute("aria-expanded", open ? "true" : "false"); btn.textContent = open ? "HIDE ALL" : "VIEW ALL"; }
    try { Store.setLocal("v5AppsOpen", !!open); } catch (e) {}
  }
  var allBtn = $("#v5AppsAll");
  if (allBtn) allBtn.addEventListener("click", function (e) { e.preventDefault(); setAllOpen($("#v5AppsFull").hidden); });
  setAllOpen(!!Store.getLocal("v5AppsOpen", false));
  try {
    var _ra = renderApps;
    renderApps = function () { var r = _ra.apply(this, arguments); try { v5RenderCats(); } catch (e) {} return r; };
  } catch (eRa) {}

  /* --- Focus: custom length --- */
  function paintCustom() {
    var b = $("#focCustom"); if (!b) return;
    var m = +Store.getLocal("focusCustom", 0) || 0;
    if (m > 0 && [15, 25, 50].indexOf(m) < 0) { b.hidden = false; b.textContent = m + "m"; b.setAttribute("data-foc-min", String(m)); }
    else { b.hidden = true; b.removeAttribute("data-foc-min"); }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("#focEdit"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (FOC.st === "run" || FOC.st === "pause") { toast("Reset first to change length"); return; }
    var cur = +Store.getLocal("focusCustom", 0) || FOC.mins || 25;
    var v = window.prompt("Focus length in minutes (1–180)", String(cur));
    if (v == null) return;
    var m = Math.round(+String(v).replace(/[^0-9.]/g, ""));
    if (!(m >= 1 && m <= 180)) { toast("Pick 1 to 180 minutes"); return; }
    try { Store.setLocal("focusCustom", m); } catch (e2) {}
    paintCustom(); focusSetMins(m); toast("Focus set to " + m + " min");
  }, true);

  /* map: OPEN joins the map tools so the card stays compact */
  try { var mo = $("#mapOpen"), mt = document.querySelector("#panelNav .map-tools"); if (mo && mt && mo.parentNode !== mt) mt.appendChild(mo); } catch (eMo) {}
  /* map: re-render tiles when the card resizes (grid rows stretch after first paint) */
  try {
    var mv = $("#mapV"), lastSz = "";
    if (mv && window.ResizeObserver) new ResizeObserver(function () {
      var sz = mv.clientWidth + "x" + mv.clientHeight; if (sz === lastSz) return; lastSz = sz;
      clearTimeout(mv._v5t); mv._v5t = setTimeout(function () { try { MAP._key = null; MAP._trafKey = null; renderMap(true); } catch (eM) {} }, 120);
    }).observe(mv);
  } catch (eRo) {}
  function tick() { try { paintCity(); } catch (e) {} try { paintGps(); } catch (e2) {} try { paintInvest(); } catch (e3) {} try { paintCustom(); } catch (e4) {} }
  tick();
  try { v5BankExtras(); } catch (eB) {}
  try { v5RenderCats(); } catch (eC) {}
  try { renderNowPlaying(); } catch (eN) {}
  setInterval(tick, 5000);
  try { Store.onChange(function () { tick(); try { v5RenderCats(); } catch (e) {} }); } catch (eS) {}
})();

/* ========== v4.16.0 gestures, universal search, Quick Actions, on-device suggestions ========== */
(function v5Actions() {
  function placeBy(re) { try { return loadPlaces().filter(function (p) { return re.test(String(p.id || "") + " " + String(p.name || "")) && placeLL(p); })[0] || null; } catch (e) { return null; } }
  function openZap(cmd) { try { openZapAssistant(); } catch (e) {} if (cmd) setTimeout(function () { try { zapHandle(cmd); } catch (e2) {} }, 250); }
  function focusSearch() {
    try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e) { window.scrollTo(0, 0); }
    var i = $("#srchQ"); if (i) { try { i.focus({ preventScroll: true }); } catch (e2) { i.focus(); } }
  }
  /* ---- action catalog (every action is real and runs only after a tap) ---- */
  var QA = {
    focus: { n: "Start focus", ic: "◔", run: function () { if (FOC.st !== "run") focusToggle(); var f = $("#mFocus"); if (f) f.scrollIntoView({ block: "center", behavior: "smooth" }); } },
    home: { n: "Take me home", ic: "⌂", run: function () { var p = placeBy(/home/i); if (p) openDirectionsTo(p); else toast("Add Home in Navigate → ＋ ADD first"); } },
    work: { n: "Directions to Work", ic: "▣", run: function () { var p = placeBy(/work/i); if (p) openDirectionsTo(p); else toast("Add Work in Navigate → ＋ ADD first"); } },
    weather: { n: "Weather detail", ic: "☁", run: function () { var w = $("#hWx"); if (w) w.click(); } },
    zap: { n: "Ask ZAP AI", ic: "✦", run: function () { openZap(); } },
    search: { n: "Search", ic: "⌕", run: function () { focusSearch(); } },
    music: { n: "Play music", ic: "♪", run: function () { openApp(currentMedia()); } },
    call: { n: "Phone", ic: "☏", run: function () { var ph = $("#phoneMount"); if (ph) ph.scrollIntoView({ block: "start", behavior: "smooth" }); } },
    bank: { n: "Refresh balances", ic: "$", run: function () { if (!bankDeviceReady()) { openLinkBankStub(); return; } toast("Refreshing…"); refreshBankAccountsFromLink({ refresh: true }).then(function () { toast("Balances updated"); }).catch(function () { toast("Couldn’t refresh"); }); } },
    portfolio: { n: "Portfolio", ic: "↗", run: function () { openCardDetail("mk", { fromUser: true }); } },
    notes: { n: "My notes", ic: "✎", run: function () { openZap("list notes"); } },
    calendar: { n: "Calendar", ic: "▦", run: function () { var c = $("#tdCal"); if (c) c.click(); } },
    theme: { n: "Theme", ic: "◐", run: function () { openTheme(); } },
    tour: { n: "Page tour", ic: "?", run: function () { startTour(); } }
  };
  /* v4.21: Quick Actions run through the shared ZAP ACTIONS registry */
  var QA_MAP = { focus: "focus.start", home: "nav.home", work: "nav.work", weather: "weather.show", zap: "zap.ask", music: "media.open", bank: "bank.refresh", portfolio: "portfolio.open", calendar: "cal.agenda" };
  Object.keys(QA_MAP).forEach(function (k) { if (QA[k]) QA[k].run = function () { zaRun(QA_MAP[k]); }; });
  QA.event = { n: "New calendar event", ic: "▦", run: function () { zaRun("cal.event"); } };
  QA.reminder = { n: "Save a reminder", ic: "⏰", run: function () { zaRun("reminder.add"); } };
  QA.shop = { n: "Shop", ic: "🛍", run: function () { zaRun("shop.search"); } };
  QA.connect = { n: "ZAP Connect", ic: "⇄", run: function () { zaRun("connect.open"); } };
  var QA_DEFAULT = ["focus", "home", "work", "weather", "zap", "music", "bank", "portfolio"];
  function qaList() { var l = Store.getLocal("quickActions", null); if (!Array.isArray(l)) l = QA_DEFAULT.slice(); return l.filter(function (k) { return QA[k]; }); }
  function runQA(k) { var a = QA[k]; if (!a) return; try { closeSheet(); } catch (e) {} setTimeout(function () { try { a.run(); } catch (e2) {} }, 80); }

  /* ---- on-device suggestions: simple time / place / state rules, shown as cards; nothing runs without a tap ---- */
  function dayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function sugState() { var s = Store.getLocal("sugState", null); if (!s || s.day !== dayKey()) s = { day: dayKey(), done: {} }; return s; }
  function sugMark(id) { var s = sugState(); s.done[id] = 1; try { Store.setLocal("sugState", s); } catch (e) {} }
  function suggestions() {
    var now = new Date(), h = now.getHours(), wd = now.getDay() >= 1 && now.getDay() <= 5, out = [];
    var home = placeBy(/home/i), work = placeBy(/work/i);
    var here = (GPS && GPS.lat != null) ? { lat: GPS.lat, lon: GPS.lon } : null;
    function far(p) { var ll = placeLL(p); return !here || !ll || haversineKm(here, ll) > 1; }
    if (wd && h >= 6 && h < 10 && work && far(work)) out.push({ id: "work", t: "Heading to Work?", d: "Directions in your maps app", qa: "work", why: "Weekday morning, Work is saved" });
    if (h >= 16 && h < 21 && home && far(home)) out.push({ id: "home", t: "Take me home", d: "Directions to Home", qa: "home", why: "Evening, you’re away from Home" });
    if (h >= 6 && h < 11) out.push({ id: "cal", t: "Check today’s calendar", d: "Opens your Calendar app", qa: "calendar", why: "Morning" });
    var sess = 0; try { sess = focusSessionsToday(); } catch (e) {}
    if (h >= 9 && h < 18 && !sess && FOC.st !== "run") out.push({ id: "focus", t: "Start a " + (FOC.mins || 25) + "-min focus", d: "No focus session yet today", qa: "focus", why: "Daytime, 0 sessions today" });
    if (h >= 21 || h < 2) out.push({ id: "relax", t: "Wind down", d: "Open " + currentMedia().name, qa: "music", why: "Late evening" });
    try { if (bankDeviceReady() && _bankAsOf && Date.now() - _bankAsOf > 20 * 3600000) out.push({ id: "bank", t: "Refresh balances", d: "Last update over 20 hours ago", qa: "bank", why: "Balances are old" }); } catch (e2) {}
    var st = sugState();
    return out.filter(function (x) { return !st.done[x.id]; });
  }
  function sugHTML(list, max) {
    return list.slice(0, max).map(function (x) {
      return '<div class="v5-sug" role="group" aria-label="Suggestion: ' + esc(x.t) + '" data-sug="' + x.id + '" data-qa="' + x.qa + '">' +
        '<span class="v5-sug-t"><b>' + esc(x.t) + "</b><small>" + esc(x.d) + " · " + esc(x.why) + "</small></span>" +
        '<button type="button" class="v5-sug-ok" data-sug-ok="1">Accept</button>' +
        '<button type="button" class="v5-sug-no" data-sug-no="1" aria-label="Dismiss suggestion">✕</button></div>';
    }).join("");
  }
  function paintSug() {
    var box = $("#v5Sug"); if (!box) return;
    var list = suggestions();
    var html = sugHTML(list, 1);
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
    box.hidden = !list.length;
  }
  document.addEventListener("click", function (e) {
    var card = e.target.closest && e.target.closest(".v5-sug"); if (!card) return;
    var ok = e.target.closest("[data-sug-ok]"), no = e.target.closest("[data-sug-no]");
    if (!ok && !no) return;
    e.preventDefault(); e.stopPropagation();
    sugMark(card.getAttribute("data-sug"));
    if (ok) runQA(card.getAttribute("data-qa"));
    else toast("Hidden for today");
    paintSug();
    var inSheet = $("#qaSug"); if (inSheet) inSheet.innerHTML = sugHTML(suggestions(), 3);
  }, true);

  /* ---- Quick Actions sheet (customizable) ---- */
  function qaBody(edit) {
    var on = qaList();
    if (!edit) {
      var sg = suggestions();
      return (sg.length ? '<div class="qa-sec">SUGGESTED · ON THIS DEVICE</div><div id="qaSug" class="qa-sug">' + sugHTML(sg, 3) + "</div>" : "") +
        '<div class="qa-sec">QUICK ACTIONS</div><div class="qa-grid">' + on.map(function (k) {
          return '<button type="button" class="qa-btn" data-qa-run="' + k + '"><i aria-hidden="true">' + QA[k].ic + "</i><span>" + esc(QA[k].n) + "</span></button>";
        }).join("") + '</div><button type="button" class="v5-btn qa-edit" data-qa-edit="1">Customize</button>';
    }
    return '<p class="note">Pick the actions you want. They run only when you tap them.</p><div class="qa-pick">' + Object.keys(QA).map(function (k) {
      var c = on.indexOf(k) >= 0;
      return '<button type="button" class="qa-opt' + (c ? " on" : "") + '" role="checkbox" aria-checked="' + c + '" data-qa-tog="' + k + '"><i aria-hidden="true">' + QA[k].ic + "</i><span>" + esc(QA[k].n) + '</span><b aria-hidden="true">' + (c ? "✓" : "") + "</b></button>";
    }).join("") + '</div><button type="button" class="v5-btn" data-qa-done="1">Done</button>';
  }
  function qaTitle(edit) { return edit ? "CUSTOMIZE QUICK ACTIONS" : "⚡ QUICK ACTIONS"; }
  function openQuickActions(edit) {
    sheet(qaTitle(edit), qaBody(edit), function (b) {
      b.addEventListener("click", function (e) {
        var r = e.target.closest("[data-qa-run]"); if (r) { runQA(r.getAttribute("data-qa-run")); return; }
        var sw = e.target.closest("[data-qa-edit],[data-qa-done]");
        if (sw) { var ed = sw.hasAttribute("data-qa-edit"); b.innerHTML = qaBody(ed); var tt = $("#sheetTitle"); if (tt) tt.textContent = qaTitle(ed); return; }
        var t = e.target.closest("[data-qa-tog]");
        if (t) {
          var k = t.getAttribute("data-qa-tog"), l = qaList(), i = l.indexOf(k);
          if (i >= 0) l.splice(i, 1); else l.push(k);
          try { Store.setLocal("quickActions", l); } catch (e2) {}
          var c = i < 0; t.classList.toggle("on", c); t.setAttribute("aria-checked", String(c)); t.querySelector("b").textContent = c ? "✓" : "";
        }
      });
    });
  }
  function openAppsSheet() {
    var cats = $("#v5Cats");
    var html = '<div class="v5-cats v5-cats-sheet">' + (cats ? cats.innerHTML : "") + "</div>";
    sheet("APPS · CATEGORIES", html, function (b) {
      b.addEventListener("click", function (e) {
        var add = e.target.closest("[data-v5add]"), m = e.target.closest("[data-v5cat]");
        if (!add && !m) return;
        e.preventDefault(); closeSheet();
        setTimeout(function () {
          if (add) openAddApp({ focusSearch: true });
          else { var src = document.querySelector('#v5Cats [data-v5cat="' + m.getAttribute("data-v5cat") + '"]'); if (src) src.click(); }
        }, 60);
      });
    });
  }
  window.ZAPOS = window.ZAPOS || {};
  window.ZAPOS.openQuickActions = openQuickActions; window.ZAPOS.openAppsSheet = openAppsSheet; window.ZAPOS.suggestions = suggestions;

  /* ---- gestures: down (at top) = search, left = apps, right = quick actions. Never on map / scrollers / inputs / sheets ---- */
  var g = null;
  var NOSWIPE = "#mapV, .map-v, input, textarea, select, [contenteditable], .places-scroller, .hw-hrs, .mk-ticker, .wx-temp-chart, .wx-sw, .sheet, .zap-sheet, .xp, .np-list, #dlPad, .srch-drop, .v6-orbit";
  document.addEventListener("touchstart", function (e) {
    g = null;
    if (!e.touches || e.touches.length !== 1) return;
    var t = e.target; if (t && t.nodeType === 3) t = t.parentElement;
    if (t && t.closest && t.closest(NOSWIPE)) return;
    try { if (anyOverlayOpen()) return; } catch (eO) {}
    var p = e.touches[0];
    if (p.clientX < 28 || p.clientX > innerWidth - 28) return; /* leave iOS edge-swipe back/forward alone */
    g = { x: p.clientX, y: p.clientY, t: Date.now(), top: (window.scrollY || document.documentElement.scrollTop || 0) <= 16 };
  }, { passive: true, capture: true });
  document.addEventListener("touchend", function (e) {
    if (!g) return;
    var p = e.changedTouches && e.changedTouches[0]; var s = g; g = null; if (!p) return;
    var dx = p.clientX - s.x, dy = p.clientY - s.y, dt = Date.now() - s.t;
    if (dt > 700) return;
    if (Math.abs(dx) > 90 && Math.abs(dy) < 45) {
      try { e.stopPropagation(); } catch (eS) {} /* a swipe is not a tap on the card underneath */
      setTimeout(function () { if (dx < 0) openAppsSheet(); else openQuickActions(false); }, 0);
      return;
    }
    if (s.top && dy > 110 && Math.abs(dx) < 50) { try { e.stopPropagation(); } catch (eS2) {} focusSearch(); }
  }, { passive: true, capture: true });
  document.addEventListener("touchcancel", function () { g = null; }, { passive: true, capture: true });

  /* ---- desktop keys: / search, A apps, Q quick actions ---- */
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target; if (t && t.matches && t.matches("input, textarea, select, [contenteditable]")) return;
    try { if (anyOverlayOpen()) return; } catch (eO) {}
    if (e.key === "/") { e.preventDefault(); focusSearch(); }
    else if (e.key === "a" || e.key === "A") { e.preventDefault(); openAppsSheet(); }
    else if (e.key === "q" || e.key === "Q") { e.preventDefault(); openQuickActions(false); }
  });

  /* ---- universal search: add places, notes and commands under the app results ---- */
  var drop = $("#srchDrop"), inp = $("#srchQ"), busy = false, uHits = [];
  function norm(x) { return String(x || "").toLowerCase(); }
  function uResults(q) {
    q = norm(q).trim(); if (q.length < 2) return [];
    var out = [];
    try { loadPlaces().forEach(function (p) { if (norm(p.name).indexOf(q) >= 0) out.push({ k: "place", label: p.name, sub: "PLACE · DIRECTIONS", run: function () { openDirectionsTo(p); } }); }); } catch (e) {}
    try { zapLoadNotes().forEach(function (n) { if (norm(n.t).indexOf(q) >= 0 && out.length < 12) out.push({ k: "note", label: n.t, sub: "NOTE", run: function () { openZap("list notes"); } }); }); } catch (e2) {}
    out.forEach(function (o) { if (o.k === "place") o.sub = "SAVED PLACE · OPENS DIRECTIONS IN YOUR MAPS APP"; if (o.k === "note") o.sub = "NOTE · ON THIS DEVICE"; });
    try { out = out.concat(zaSearchExtras(q, inp.value)); } catch (eX) {}
    out.push({ k: "zap", label: "Ask ZAP AI: “" + String(inp.value).trim().slice(0, 40) + "”", sub: "AI QUESTION · " + (v6SmartOn() ? "ANSWERED ONLINE (POLLINATIONS) UNLESS IT’S A COMMAND" : "ANSWERED ON THIS DEVICE"), run: function () { zaRun("zap.ask", { q: String(inp.value).trim() }); } });
    return out.slice(0, 14);
  }
  function augment() {
    if (busy || !drop || !inp || drop.hidden) return;
    busy = true;
    try {
      var old = drop.querySelector(".u-sec"); if (old) old.remove();
      uHits = uResults(inp.value);
      if (uHits.length) {
        var sec = document.createElement("div"); sec.className = "u-sec";
        sec.innerHTML = '<div class="u-h">PLACES · NOTES · ACTIONS · PRODUCTS · WEB · AI</div>' + uHits.map(function (h, i) {
          return '<button type="button" class="srch-item u-item" role="option" data-u="' + i + '"><span class="u-ic u-' + h.k + '" aria-hidden="true"></span><span class="meta"><b>' + esc(h.label) + "</b><small>" + esc(h.sub) + "</small></span></button>";
        }).join("");
        drop.appendChild(sec);
      }
    } catch (e) {}
    busy = false;
  }
  if (drop && inp && window.MutationObserver) {
    new MutationObserver(function (recs) {
      /* only react to the app search re-rendering, never to our own .u-sec insert (prevents a loop) */
      var ours = recs.every(function (r) {
        if (r.type !== "childList") return false;
        var nodes = [].slice.call(r.addedNodes).concat([].slice.call(r.removedNodes));
        return nodes.length > 0 && nodes.every(function (n) { return n.nodeType === 1 && n.classList && n.classList.contains("u-sec"); });
      });
      if (!ours && !busy) augment();
    }).observe(drop, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    drop.addEventListener("click", function (e) {
      var it = e.target.closest("[data-u]"); if (!it) return;
      e.preventDefault(); e.stopPropagation();
      var h = uHits[+it.getAttribute("data-u")];
      inp.value = ""; try { inp.blur(); } catch (eB) {}
      drop.hidden = true; drop.classList.remove("on"); drop.innerHTML = "";
      if (h) h.run();
    }, true);
  }

  /* ---- suggestion strip under search ---- */
  var srch = $("#srch");
  if (srch && !$("#v5Sug")) {
    var box = document.createElement("div"); box.id = "v5Sug"; box.className = "v5-sugbar"; box.hidden = true; box.setAttribute("aria-live", "polite");
    srch.parentNode.insertBefore(box, srch.nextSibling);
  }
  paintSug();
  setInterval(paintSug, 60000);
  try { Store.onChange(function () { paintSug(); }); } catch (eS) {}
})();
/* ========== v4.17 HOME: ZAP AI entry, orbit menu, destinations, honest states ========== */
var V6_KIND_REC = "RECOMMENDATION · FROM DATA ON THIS DEVICE";
function v6Btns(el, list) {
  if (!el) return;
  var row = document.createElement("div"); row.className = "zap-acts";
  list.forEach(function (x) {
    if (!x) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "zap-act" + (x.ext ? " ext" : ""); b.textContent = x.label;
    if (x.ext) b.title = "Opens another app or site";
    b.addEventListener("click", function () { try { x.run(); } catch (e) { toast("Action failed"); } });
    row.appendChild(b);
  });
  el.appendChild(row);
}
function v6Clock() { var d = new Date(); return ((d.getHours() % 12) || 12) + ":" + pad2(d.getMinutes()) + (d.getHours() < 12 ? " AM" : " PM"); }
function v6Place(rx) { var ps = []; try { ps = loadPlaces(); } catch (e) {} return ps.filter(function (p) { return rx.test((p.name || "") + " " + (p.id || "")); })[0] || null; }
function v6StartFocus(m) { closeZapAssistant(); try { FOC = { st: "idle", mins: m }; Store.setLocal("focus", FOC); focusToggle(); } catch (e) {} v6GoCard("mFocus"); }
function v6Reminders() { var r = []; try { r = zapLoadReminders(); } catch (e) {} return r; }
function zapRoutine(q, orig) {
  if (/(get|got) me ready for work|ready for work|morning (brief|routine)|start my (work ?)?day/.test(q)) {
    var work = v6Place(/work|office|job/i), rem = v6Reminders();
    var lines = ["It’s " + v6Clock() + "."];
    lines.push(WX && WX.j ? zapWxSummary("now") : "Weather isn’t loaded yet — set your city on the Today card.");
    lines.push("Calendar: ZAPWISE can’t read your calendar, so tap Calendar to open it.");
    lines.push(work ? ("Commute: “" + work.name + "” is saved — Directions opens your Maps app with live traffic.") : "Commute: save Work on the Navigate card for one-tap directions.");
    lines.push(rem.length ? ("Reminders: " + rem.slice(0, 3).map(function (x) { return x.t; }).join(" · ")) : "No reminders saved.");
    return { skill: "routine.work", kind: V6_KIND_REC, text: lines.join("\n"), extra: function (el) {
      v6Btns(el, [
        { label: "Weather", run: function () { closeZapAssistant(); toggleXp("wx"); } },
        { label: "Calendar", ext: 1, run: function () { closeZapAssistant(); $("#tdCal").click(); } },
        work ? { label: "Directions to " + work.name, ext: 1, run: function () { closeZapAssistant(); openDirectionsTo(work); } } : { label: "Save Work", run: function () { closeZapAssistant(); v6GoCard("panelNav"); } },
        { label: "Start 25-min focus", run: function () { v6StartFocus(25); } }
      ]);
    } };
  }
  if (/take me home|(go|head|heading|drive|get me) home\b/.test(q)) {
    var home = v6Place(/home|house/i);
    var t = home ? ("Directions to “" + home.name + "” open in your Maps app (that app shows the route and live traffic). The Navigate map here shows TomTom traffic colors.") : "No Home saved yet. Add Home on the Navigate card, then ask again.";
    t += "\nHome devices: none connected, so there’s nothing to switch on yet.";
    return { skill: "routine.home", kind: home ? "NEEDS ANOTHER APP · TAP TO CONFIRM" : V6_KIND_REC, text: t, extra: function (el) {
      v6Btns(el, [
        home ? { label: "Directions home", ext: 1, run: function () { closeZapAssistant(); openDirectionsTo(home); } } : { label: "Add Home", run: function () { closeZapAssistant(); v6GoCard("panelNav"); } },
        { label: "Traffic map", run: function () { closeZapAssistant(); v6GoCard("panelNav"); } },
        { label: "Smart Home", run: function () { closeZapAssistant(); v6OpenDest("smarthome"); } }
      ]);
    } };
  }
  if (/plan (my|the|out my) day|plan today|organi[sz]e my day|what('?s| is) (on )?my day/.test(q)) {
    var rem2 = v6Reminders(), notes = []; try { notes = zapLoadNotes(); } catch (e) {}
    var fs = 0; try { fs = focusSessionsToday(); } catch (e2) {}
    var l2 = ["Here’s what this device knows for today:"];
    l2.push(rem2.length ? ("Reminders (" + rem2.length + "): " + rem2.slice(0, 4).map(function (x) { return x.t; }).join(" · ")) : "Reminders: none saved — say “remind me to …”.");
    l2.push("Notes: " + notes.length + " saved.");
    l2.push("Focus: " + fs + " session" + (fs === 1 ? "" : "s") + " today. Suggestion: block a " + (fs ? "25" : "50") + "-minute focus session for your top task.");
    l2.push("Appointments live in your calendar app — tap Calendar.");
    return { skill: "routine.plan", kind: V6_KIND_REC, text: l2.join("\n"), extra: function (el) {
      v6Btns(el, [
        { label: "Start " + (fs ? 25 : 50) + "-min focus", run: function () { v6StartFocus(fs ? 25 : 50); } },
        { label: "Calendar", ext: 1, run: function () { closeZapAssistant(); $("#tdCal").click(); } },
        { label: "Notes", ext: 1, run: function () { closeZapAssistant(); $("#tdNote").click(); } }
      ]);
    } };
  }
  if (/^(help me )?(relax|wind down|chill)\b|help me relax/.test(q)) {
    var m = currentMedia();
    return { skill: "routine.relax", kind: "NEEDS ANOTHER APP · TAP TO CONFIRM", text: "Want some music? I’ll open " + m.name + " (your music app — playback happens there). Or take a 15-minute break timer.", extra: function (el) {
      v6Btns(el, [
        { label: "Open " + m.name, ext: 1, run: function () { closeZapAssistant(); var b = document.querySelector("#cardPlay .np-play"); if (b) b.click(); } },
        { label: "15-min break timer", run: function () { v6StartFocus(15); } }
      ]);
    } };
  }
  var sm = q.match(/^(?:find|shop for|buy|compare|get) (?:me )?(?:the |a |an |some )?(?:best |cheap(?:est)? |good |new )?(.{2,60}?)[?.!]*$/);
  if (sm && !/\b(place|restaurant|food|movie|show|my|way|route|direction)\b/.test(sm[1])) {
    var item = sm[1].trim();
    return { skill: "shop.find", kind: "NEEDS ANOTHER SERVICE · STORE SEARCH", text: "I can’t see live prices, stock or reviews, so I won’t make them up. Shop opens real store searches for “" + item + "” so you can compare there.", extra: function (el) {
      v6Btns(el, [{ label: "Open Shop for “" + item.slice(0, 24) + "”", run: function () { closeZapAssistant(); v6OpenDest("shop", { q: item }); } }]);
    } };
  }
  return null;
}

/* ---- destinations ---- */
var V6_IC = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  shop: "M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8zM9 8V6a3 3 0 0 1 6 0v2",
  watch: "M3 5h18v12H3zM10 8.5v5l4.5-2.5zM8 20h8",
  listen: "M4 16v-4a8 8 0 0 1 16 0v4M4 15h3v5H4zM17 15h3v5h-3z",
  food: "M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1.2-3.5 4-3.5 7.5H17",
  navigate: "M12 21s-7-6.6-7-12a7 7 0 0 1 14 0c0 5.4-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  smarthome: "M3 11.5l9-7.5 9 7.5M6 9.5V20h12V9.5M9 15.2a4.2 4.2 0 0 1 6 0M12 18h.01",
  finance: "M4 20v-7M10 20V5M16 20v-9M3 20.5h18",
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  zap: "M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"
};
var V6_DEST = [
  { id: "home", n: "Home", s: "Today & your dashboard", c: "#05d9e8" },
  { id: "shop", n: "Shop", s: "Search real stores", c: "#ff4fd8" },
  { id: "watch", n: "Watch", s: "Find where to stream", c: "#b26bff" },
  { id: "listen", n: "Listen", s: "Your music app", c: "#ff4fd8" },
  { id: "food", n: "Food", s: "Restaurants & delivery", c: "#ffb547" },
  { id: "navigate", n: "Navigate", s: "Map, places, directions", c: "#2ee6ff" },
  { id: "smarthome", n: "Smart Home", s: "Your connected devices", c: "#3dff9e" },
  { id: "finance", n: "Finance", s: "Banking & investments", c: "#3dff9e" },
  { id: "apps", n: "Apps", s: "All your apps", c: "#05d9e8" },
  { id: "zap", n: "ZAP AI", s: "Say what you want to do", c: "#b26bff" }
];
function v6Svg(id, sz) { return '<svg viewBox="0 0 24 24" width="' + (sz || 22) + '" height="' + (sz || 22) + '" aria-hidden="true" focusable="false"><path d="' + V6_IC[id] + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
function v6Flash(el) { if (!el) return; el.classList.remove("v6-flash"); void el.offsetWidth; el.classList.add("v6-flash"); setTimeout(function () { el.classList.remove("v6-flash"); }, 1600); }
function v6GoCard(id) {
  var el = document.getElementById(id); if (!el) return;
  try { dashPeek(id); } catch (eP) {}
  var reduce = !document.documentElement.classList.contains("motion-on");
  try { el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); }
  v6Flash(el); v6ShowBack(true);
  setTimeout(function () { try { var f = el.querySelector("button,a,[tabindex='0']"); if (f) f.focus({ preventScroll: true }); } catch (e2) {} }, 450);
}
function v6GoHome() {
  try { closeSheet(); } catch (e) {}
  var h = document.getElementById("v6Hero");
  var reduce = !document.documentElement.classList.contains("motion-on");
  try { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); } catch (e2) { window.scrollTo(0, 0); }
  v6ShowBack(false);
  setTimeout(function () { try { var a = document.querySelector("#v6Orbit .v6-item[tabindex='0']") || $("#v6Ask"); if (a) a.focus({ preventScroll: true }); } catch (e3) {} }, 350);
}
var V6_LASTGO = 0;
function v6ShowBack(on) { if (on) V6_LASTGO = Date.now(); var b = $("#v6Back"); if (b) b.hidden = !on; }
function v6Lists() { var o = Store.getLocal("v6lists", null); if (!o || typeof o !== "object") o = {}; ["shop", "watch", "food"].forEach(function (k) { if (!Array.isArray(o[k])) o[k] = []; }); return o; }
function v6SaveLists(o) { Store.setLocal("v6lists", o); }
var V6_STORES = {
  shop: [
    ["Amazon", "https://www.amazon.com/s?k="], ["Walmart", "https://www.walmart.com/search?q="], ["Target", "https://www.target.com/s?searchTerm="],
    ["Best Buy", "https://www.bestbuy.com/site/searchpage.jsp?st="], ["eBay", "https://www.ebay.com/sch/i.html?_nkw="], ["Google Shopping", "https://www.google.com/search?tbm=shop&q="]
  ],
  watch: [
    ["JustWatch (where to stream)", "https://www.justwatch.com/us/search?q="], ["YouTube", "https://www.youtube.com/results?search_query="], ["Netflix", "https://www.netflix.com/search?q="],
    ["Prime Video", "https://www.amazon.com/s?i=instant-video&k="], ["Google", "https://www.google.com/search?q=where+to+watch+"]
  ],
  food: [
    ["Google Maps", "https://www.google.com/maps/search/"], ["DoorDash", "https://www.doordash.com/search/store/"], ["Uber Eats", "https://www.ubereats.com/search?q="],
    ["Grubhub", "https://www.grubhub.com/search?queryText="], ["Yelp", "https://www.yelp.com/search?find_desc="]
  ]
};
function v6StoreUrl(kind, base, q) {
  if (kind === "food" && /google\.com\/maps/.test(base)) return base + encodeURIComponent(q + " near me");
  if (/doordash/.test(base)) return base + encodeURIComponent(q) + "/";
  return base + encodeURIComponent(q);
}
var V6_COPY = {
  shop: { t: "SHOP", lead: "Search real stores side by side. ZAPWISE doesn’t invent prices, stock or reviews — each button opens that store’s own results.", ph: "What are you shopping for?", next: "Type a product, then pick a store", saveL: "Shopping list", note: "No sponsored results and no affiliate links here. Prices and stock are on the store’s page." },
  watch: { t: "WATCH", lead: "Find where a movie or show is streaming. ZAPWISE can’t see your streaming accounts, so Continue Watching stays in each app.", ph: "Movie or show title", next: "Type a title, then check where it streams", saveL: "Watchlist", note: "Links open the service’s own search. Availability is shown there." },
  food: { t: "FOOD", lead: "Find restaurants near you or order delivery in the app you already use. Order status stays in that app.", ph: "Pizza, tacos, a restaurant name…", next: "Type what you’re craving, then pick a service", saveL: "Favorite spots", note: "ZAPWISE doesn’t place orders or take payments." }
};
function v6OpenDest(id, o) {
  o = o || {};
  if (id === "home") { v6GoHome(); v6GoCard("panelToday"); return; }
  if (id === "navigate") { v6GoCard("panelNav"); return; }
  if (id === "finance") { v6GoCard("panelMoney"); return; }
  if (id === "apps") { try { window.ZAPOS.openAppsSheet(); } catch (e) { v6GoCard("appsSection"); } return; }
  if (id === "zap") { openZapAssistant(); return; }
  if (id === "listen") { v6Listen(); return; }
  if (id === "smarthome") { v6Smart(); return; }
  var C = V6_COPY[id]; if (!C) return;
  var lists = v6Lists(), saved = lists[id];
  var html = '<div class="v6-dest" data-dest="' + id + '">' +
    '<p class="v6-lead">' + esc(C.lead) + '</p>' +
    '<div class="v6-next"><small>NEXT USEFUL ACTION</small><b>' + esc(C.next) + '</b></div>' +
    '<form class="v6-dform" id="v6DForm" autocomplete="off"><input id="v6DQ" type="search" enterkeyhint="search" placeholder="' + esc(C.ph) + '" aria-label="' + esc(C.ph) + '" value="' + esc(o.q || "") + '" maxlength="80"><button type="submit" class="chip accent">' + (id === "watch" ? "Find" : "Search") + '</button></form>' +
    '<div class="v6-stores" id="v6Stores" role="list">' + V6_STORES[id].map(function (s, i) { return '<button type="button" class="v6-store" role="listitem" data-store="' + i + '"><b>' + esc(s[0]) + '</b><small>Opens ' + esc(s[0].replace(/ \(.*\)/, "")) + ' ↗</small></button>'; }).join("") + '</div>' +
    '<p class="note">' + esc(C.note) + '</p>' +
    '<div class="v6-list-h"><b>' + esc(C.saveL).toUpperCase() + ' · ON THIS DEVICE</b><button type="button" class="chip" id="v6DSave">＋ Save typed item</button></div>' +
    '<div class="v6-saved" id="v6Saved" role="list"></div>' +
    (id === "shop" ? '<button type="button" class="chip accent" id="v6Cmp">⇄ Compare saved items</button>' : "") +
    '<button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
  sheet(C.t, html, function (b) {
    var inp = b.querySelector("#v6DQ");
    function q() { return (inp.value || "").trim(); }
    function paintSaved() {
      var L = v6Lists()[id], host = b.querySelector("#v6Saved");
      host.innerHTML = L.length ? L.map(function (x, i) { return '<div class="v6-sv" role="listitem"><button type="button" class="v6-sv-use" data-use="' + i + '">' + esc(x.t) + (x.price ? ' <small class="v6-px">' + esc(x.price) + (x.store ? " · " + esc(x.store) : "") + '</small>' : "") + '</button>' + (id === "shop" ? '<button type="button" class="chip" data-edit="' + i + '" aria-label="Add price, store or link for ' + esc(x.t) + '">✎</button>' : "") + (id !== "food" ? '<button type="button" class="chip v6-done' + (x.done ? " on" : "") + '" data-done="' + i + '" aria-pressed="' + (!!x.done) + '" aria-label="Mark ' + esc(x.t) + (id === "watch" ? ' as watched' : ' as got it') + '">' + (x.done ? (id === "watch" ? "✓ Watched" : "✓ Got it") : (id === "watch" ? "Watched?" : "Got it?")) + '</button>' : "") + '<button type="button" class="chip" data-del="' + i + '" aria-label="Remove ' + esc(x.t) + '">✕</button></div>'; }).join("") : '<p class="dim v6-empty">Nothing saved yet. Type something above and tap ＋ Save.</p>';
    }
    paintSaved();
    b.querySelector("#v6DForm").addEventListener("submit", function (e) { e.preventDefault(); if (!q()) { inp.focus(); toast("Type something first"); return; } var first = b.querySelector(".v6-store"); if (first) first.focus(); toast("Pick a " + (id === "shop" ? "store" : "service") + " below"); });
    b.querySelector("#v6Stores").addEventListener("click", function (e) {
      var s = e.target.closest("[data-store]"); if (!s) return;
      if (!q()) { inp.focus(); toast("Type something first"); return; }
      var st = V6_STORES[id][+s.getAttribute("data-store")]; go(v6StoreUrl(id, st[1], q()));
    });
    b.querySelector("#v6DSave").addEventListener("click", function () {
      if (!q()) { inp.focus(); toast("Type something first"); return; }
      var L = v6Lists(); if (L[id].some(function (x) { return x.t.toLowerCase() === q().toLowerCase(); })) { toast("Already saved"); return; }
      if (L[id].length >= 50) { toast("Up to 50 items"); return; }
      L[id].unshift({ t: q().slice(0, 80), at: Date.now() }); v6SaveLists(L); paintSaved(); toast("Saved on this device");
    });
    b.querySelector("#v6Saved").addEventListener("click", function (e) {
      var u = e.target.closest("[data-use]"), d = e.target.closest("[data-del]"), dn = e.target.closest("[data-done]"), L = v6Lists();
      if (u) { inp.value = L[id][+u.getAttribute("data-use")].t; inp.focus(); }
      if (dn) { var it = L[id][+dn.getAttribute("data-done")]; it.done = !it.done; v6SaveLists(L); paintSaved(); }
      var ed = e.target.closest("[data-edit]"); if (ed) { v6EditItem(id, +ed.getAttribute("data-edit")); return; }
      if (d) { var i = +d.getAttribute("data-del"), gone = L[id][i]; L[id].splice(i, 1); v6SaveLists(L); paintSaved(); toast("Removed “" + gone.t.slice(0, 30) + "”"); }
    });
    b.addEventListener("click", function (e) { if (e.target.closest("[data-v6-home]")) v6GoHome(); if (e.target.closest("#v6Cmp")) v6Compare(); });
    if (!o.q) setTimeout(function () { try { if (matchMedia("(pointer:fine)").matches) inp.focus(); } catch (e) {} }, 80);
  });
}
function v6EditItem(id, i) {
  var L = v6Lists(), x = L[id][i]; if (!x) return;
  var html = '<form class="v6-dest" id="v6EF" autocomplete="off"><p class="v6-lead">Add what you saw so you can compare later. Only you type these; ZAPWISE doesn’t check prices.</p>' +
    '<label class="v6-fl">Item<input id="v6Et" maxlength="80" value="' + esc(x.t) + '"></label>' +
    '<label class="v6-fl">Price you saw<input id="v6Ep" inputmode="decimal" maxlength="20" placeholder="e.g. 199.99" value="' + esc(x.price || "") + '"></label>' +
    '<label class="v6-fl">Store<input id="v6Es" maxlength="40" placeholder="e.g. Best Buy" value="' + esc(x.store || "") + '"></label>' +
    '<label class="v6-fl">Product link (optional)<input id="v6Eu" type="url" inputmode="url" maxlength="400" placeholder="https://…" value="' + esc(x.url || "") + '"></label>' +
    '<div class="v6-row"><button type="submit" class="chip accent">Save</button><button type="button" class="chip" id="v6EBack">← Back to Shop</button></div></form>';
  sheet("EDIT ITEM", html, function (b) {
    b.querySelector("#v6EBack").addEventListener("click", function () { v6OpenDest(id); });
    b.querySelector("#v6EF").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = b.querySelector("#v6Et").value.trim(), pr = b.querySelector("#v6Ep").value.trim().replace(/^\$/, ""), st = b.querySelector("#v6Es").value.trim(), u = b.querySelector("#v6Eu").value.trim();
      if (!t) { toast("Item name is empty"); return; }
      if (pr && !/^\d{1,7}(\.\d{1,2})?$/.test(pr.replace(/,/g, ""))) { toast("Price: numbers only, like 199.99"); return; }
      if (u && !/^https:\/\/[^\s]+$/i.test(u)) { toast("Link must start with https://"); return; }
      var L2 = v6Lists(), it = L2[id][i]; if (!it) return;
      it.t = t.slice(0, 80); it.price = pr ? "$" + (+pr.replace(/,/g, "")).toFixed(2) : ""; it.store = st.slice(0, 40); it.url = u;
      v6SaveLists(L2); toast("Saved on this device"); v6OpenDest(id);
    });
  });
}
function v6Compare() {
  var L = v6Lists().shop.slice();
  var priced = L.filter(function (x) { return x.price; }).sort(function (a, b) { return parseFloat(a.price.slice(1)) - parseFloat(b.price.slice(1)); });
  var rest = L.filter(function (x) { return !x.price; });
  var rows = priced.concat(rest);
  var html = '<div class="v6-dest"><p class="v6-lead">Your saved items side by side, lowest price you entered first.</p>' +
    (rows.length ? '<div class="v6-cmp" role="table" aria-label="Compare saved items"><div class="v6-cmp-r h" role="row"><span role="columnheader">Item</span><span role="columnheader">Store</span><span role="columnheader">Price you saw</span><span role="columnheader">Link</span></div>' +
      rows.map(function (x, k) { return '<div class="v6-cmp-r" role="row"><span role="cell">' + esc(x.t) + (x.done ? " ✓" : "") + '</span><span role="cell">' + esc(x.store || "—") + '</span><span role="cell">' + esc(x.price || "—") + (k === 0 && x.price && priced.length > 1 ? ' <small class="v6-low">LOWEST</small>' : "") + '</span><span role="cell">' + (x.url ? '<button type="button" class="chip" data-cmp-url="' + k + '">Open ↗</button>' : "—") + '</span></div>'; }).join("") + '</div>'
      : '<p class="dim v6-empty">Save a few items in Shop first, then tap ✎ to add the price you saw.</p>') +
    '<p class="note">Prices here are the ones you typed on this device. ZAPWISE doesn’t check them, so confirm on the store’s page before buying.</p>' +
    '<div class="v6-row"><button type="button" class="chip" id="v6CBack">← Back to Shop</button><button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div></div>';
  sheet("COMPARE", html, function (b) {
    b.addEventListener("click", function (e) {
      if (e.target.closest("#v6CBack")) { v6OpenDest("shop"); return; }
      if (e.target.closest("[data-v6-home]")) { v6GoHome(); return; }
      var c = e.target.closest("[data-cmp-url]"); if (c) { var x = rows[+c.getAttribute("data-cmp-url")]; if (x && /^https:\/\//i.test(x.url)) go(x.url); }
    });
  });
}
function v6Listen() {
  var cur = currentMedia();
  var html = '<div class="v6-dest"><p class="v6-lead">Music plays in your music app. ZAPWISE opens the one you choose — it can’t show the live track or control playback, because that needs each service’s sign-in, which isn’t connected.</p>' +
    '<div class="v6-next"><small>NEXT USEFUL ACTION</small><b>Open ' + esc(cur.name) + '</b><button type="button" class="chip accent" id="v6LOpen">Open ' + esc(cur.name) + ' ↗</button></div>' +
    '<div class="v6-list-h"><b>YOUR MUSIC APP</b></div><div class="v6-stores" role="radiogroup" aria-label="Music app">' +
    HUB.map(function (k) { var m = MEDIA[k], on = m === cur; return '<button type="button" class="v6-store' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-mk="' + k + '"><b>' + esc(m.name) + (on ? " ✓" : "") + '</b><small>' + (on ? "Current provider" : "Use this app") + '</small></button>'; }).join("") +
    '</div><button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
  sheet("LISTEN", html, function (b) {
    b.querySelector("#v6LOpen").addEventListener("click", function () { closeSheet(); var p = document.querySelector("#cardPlay .np-play"); if (p) p.click(); });
    b.addEventListener("click", function (e) {
      if (e.target.closest("[data-v6-home]")) { v6GoHome(); return; }
      var k = e.target.closest("[data-mk]"); if (!k) return;
      var opt = document.querySelector('#npList [data-m="' + k.getAttribute("data-mk") + '"]');
      if (opt) opt.click(); else { MEDIA_KEY = k.getAttribute("data-mk"); Store.setLocal("mediaKey", MEDIA_KEY); try { renderNowPlaying(); } catch (e2) {} }
      setTimeout(v6Listen, 60);
    });
  });
}
var V6_HOMEAPPS = [
  ["Google Home", "https://home.google.com/"], ["SmartThings", "https://my.smartthings.com/"], ["Amazon Alexa", "https://alexa.amazon.com/"], ["Philips Hue", "https://www.philips-hue.com/"]
];
function v6Smart() {
  var ha = Store.getLocal("v6ha", "") || "";
  var html = '<div class="v6-dest"><div class="v6-state"><b>No devices connected yet.</b><span>ZAPWISE//OS runs in your browser, and browsers can’t talk to lights, locks or thermostats directly. So nothing here is switched on or off by ZAPWISE today.</span></div>' +
    '<p class="v6-lead">What works now: open the home app you already use in one tap. If you run Home Assistant, save its address and ZAPWISE opens your dashboard.</p>' +
    '<div class="v6-next"><small>NEXT USEFUL ACTION</small><b>Open your home app</b></div>' +
    '<div class="v6-stores" role="list">' + (IOS ? '<button type="button" class="v6-store" role="listitem" data-ha-ios="1"><b>Apple Home</b><small>Opens Home ↗</small></button>' : "") +
    V6_HOMEAPPS.map(function (s, i) { return '<button type="button" class="v6-store" role="listitem" data-ha-app="' + i + '"><b>' + esc(s[0]) + '</b><small>Opens ' + esc(s[0]) + ' ↗</small></button>'; }).join("") + '</div>' +
    '<div class="v6-list-h"><b>HOME ASSISTANT</b></div>' +
    '<form class="v6-dform" id="v6HaF" autocomplete="off"><input id="v6HaU" type="url" inputmode="url" placeholder="https://your-home-assistant:8123" aria-label="Home Assistant address" value="' + esc(ha) + '" maxlength="200"><button class="chip accent" type="submit">Save</button></form>' +
    (ha ? '<button type="button" class="chip" id="v6HaOpen">Open Home Assistant ↗</button> <button type="button" class="chip" id="v6HaDel">Forget address</button>' : "") +
    '<p class="note">Saved only on this device. ZAPWISE never asks for your home-app password.</p>' +
    '<button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
  sheet("SMART HOME", html, function (b) {
    b.addEventListener("click", function (e) {
      if (e.target.closest("[data-v6-home]")) { v6GoHome(); return; }
      if (e.target.closest("[data-ha-ios]")) { openApp({ id: "applehome", name: "Home", url: "com.apple.home://", web: "https://www.apple.com/home-app/" }); return; }
      var a = e.target.closest("[data-ha-app]"); if (a) { go(V6_HOMEAPPS[+a.getAttribute("data-ha-app")][1]); return; }
      if (e.target.closest("#v6HaOpen")) { go(Store.getLocal("v6ha", "")); return; }
      if (e.target.closest("#v6HaDel")) { Store.setLocal("v6ha", ""); toast("Address removed"); v6Smart(); }
    });
    b.querySelector("#v6HaF").addEventListener("submit", function (e) {
      e.preventDefault(); var u = (b.querySelector("#v6HaU").value || "").trim();
      if (!/^https?:\/\/[^\s]{3,}$/i.test(u)) { toast("Enter an address starting with http:// or https://"); return; }
      Store.setLocal("v6ha", u); toast("Saved on this device"); v6Smart();
    });
  });
}

/* ---- orbit menu ---- */
(function v6Orbit() {
  var host = $("#v6Orbit"); if (!host) return;
  var N = V6_DEST.length, step = Math.PI * 2 / N, rot = 0, cur = 0, list = !!Store.getLocal("v6List", false);
  host.insertAdjacentHTML("beforeend", V6_DEST.map(function (d, i) {
    return '<button type="button" class="v6-item" role="menuitem" data-dest="' + d.id + '" data-i="' + i + '" tabindex="' + (i ? "-1" : "0") + '" style="--c:' + d.c + '" aria-label="' + esc(d.n) + ': ' + esc(d.s) + '"><span class="v6-ic">' + v6Svg(d.id, 22) + '</span><span class="v6-lbl">' + esc(d.n) + '</span><span class="v6-sub">' + esc(d.s) + '</span></button>';
  }).join(""));
  var items = [].slice.call(host.querySelectorAll(".v6-item"));
  var tog = $("#v6View");
  function layout() {
    host.classList.toggle("is-list", list);
    if (tog) { tog.setAttribute("aria-pressed", list ? "true" : "false"); tog.textContent = list ? "◎ ORBIT VIEW" : "☰ LIST VIEW"; }
    if (list) { items.forEach(function (it) { it.style.transform = ""; it.style.zIndex = ""; it.style.opacity = ""; it.classList.remove("front"); }); return; }
    var W = host.clientWidth, H = host.clientHeight; if (!W || !H) return;
    var iw = items[0].offsetWidth || 76, ih = items[0].offsetHeight || 70;
    var rx = Math.max(60, W / 2 - iw / 2 - 4), ry = Math.max(60, H / 2 - ih / 2 - 4);
    if (W > 700) rx = Math.min(rx, H * 1.25);
    items.forEach(function (it, i) {
      var a = i * step + rot, x = Math.sin(a) * rx, y = Math.cos(a) * ry, dep = (Math.cos(a) + 1) / 2;
      var sc = 0.8 + 0.2 * dep;
      it.style.transform = "translate(" + (W / 2 + x - iw / 2).toFixed(1) + "px," + (H / 2 + y - ih / 2).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      it.style.zIndex = String(10 + Math.round(dep * 10));
      it.style.opacity = (0.78 + 0.22 * dep).toFixed(2);
      it.classList.toggle("front", i === cur);
    });
  }
  function setCur(i, focus, spin) {
    cur = (i + N) % N;
    items.forEach(function (it, k) { it.setAttribute("tabindex", k === cur ? "0" : "-1"); });
    if (spin && !list) {
      var target = -cur * step, d = target - rot;
      d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; rot += d;
    }
    layout();
    if (focus) items[cur].focus({ preventScroll: true });
  }
  host.addEventListener("keydown", function (e) {
    var k = e.key, i = items.indexOf(document.activeElement); if (i < 0) return;
    if (!list && document.documentElement.classList.contains("tv-nav") && (k === "ArrowUp" || k === "ArrowDown")) return; /* remote: up/down leave the ring */
    var nx = null;
    if (k === "ArrowRight" || k === "ArrowDown") nx = i + 1;
    else if (k === "ArrowLeft" || k === "ArrowUp") nx = i - 1;
    else if (k === "Home") nx = 0; else if (k === "End") nx = N - 1;
    if (nx == null) return;
    e.preventDefault(); e.stopPropagation(); setCur(nx, true, true);
  });
  var lastPtr = 0;
  host.addEventListener("pointerdown", function () { lastPtr = Date.now(); }, true);
  /* keyboard / remote focus turns the ring; pointer focus must not move the item out from under the tap */
  host.addEventListener("focusin", function (e) { if (Date.now() - lastPtr < 800) return; var i = items.indexOf(e.target); if (i >= 0 && i !== cur) setCur(i, false, true); });
  /* drag / swipe the ring (orbit view only); a tap still opens */
  var dr = null, suppress = 0;
  host.addEventListener("pointerdown", function (e) { if (list || (e.pointerType === "mouse" && e.button !== 0)) return; dr = { x: e.clientX, r: rot, moved: false }; });
  host.addEventListener("pointermove", function (e) {
    if (!dr) return; var dx = e.clientX - dr.x;
    if (!dr.moved && Math.abs(dx) < 10) return;
    dr.moved = true; host.classList.add("dragging"); rot = dr.r + dx / Math.max(120, host.clientWidth / 2) * 1.4; layout();
  });
  function endDrag() {
    if (!dr) return; var mv = dr.moved; dr = null; host.classList.remove("dragging");
    if (mv) { suppress = Date.now(); var best = Math.round(-rot / step); setCur(((best % N) + N) % N, false, true); }
  }
  host.addEventListener("pointerup", endDrag); host.addEventListener("pointercancel", endDrag); host.addEventListener("pointerleave", endDrag);
  host.addEventListener("click", function (e) {
    var it = e.target.closest(".v6-item"); if (!it) return;
    if (Date.now() - suppress < 350) { e.preventDefault(); return; }
    zaRun("dest." + it.getAttribute("data-dest"));
    setCur(+it.getAttribute("data-i"), false, true);
  });
  if (tog) tog.addEventListener("click", function () { list = !list; Store.setLocal("v6List", list); layout(); });
  layout();
  try { new ResizeObserver(function () { layout(); }).observe(host); } catch (e) { window.addEventListener("resize", layout); }
  window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.v6 = { openDest: v6OpenDest, goHome: v6GoHome, setCur: function (i) { setCur(i, true, true); }, cur: function () { return cur; } };
})();

/* ---- ZAP AI entry ---- */
(function v6Entry() {
  var ask = $("#v6Ask");
  if (ask) ask.addEventListener("click", function () { openZapAssistant(); });
  var rt = $("#v6Routines");
  if (rt) rt.addEventListener("click", function (e) {
    var b = e.target.closest("[data-zap]"); if (!b) return;
    var cmd = b.getAttribute("data-zap");
    openZapAssistant(); setTimeout(function () { try { zapHandle(cmd); } catch (e2) {} }, 200);
  });
  var back = $("#v6Back"); if (back) back.addEventListener("click", v6GoHome);
  var hero = $("#v6Hero");
  if (hero && window.IntersectionObserver) new IntersectionObserver(function (en) { if (en[0] && en[0].isIntersecting && Date.now() - V6_LASTGO > 1500) v6ShowBack(false); }, { threshold: 0.25 }).observe(hero);
  /* voice: show mics only where speech recognition exists */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { ["#srchMic", "#zapMic"].forEach(function (s) { var m = $(s); if (m) { m.hidden = true; m.style.display = "none"; } }); var tip = $("#zapMicTip"); if (tip) { tip.hidden = true; tip.style.display = "none"; } }
  var zi = $("#zapIn"); if (zi) zi.placeholder = "What do you want to do?";
  /* weather retry */
  var wr = $("#tdWxRetry");
  if (wr) wr.addEventListener("click", function (e) { e.stopPropagation(); toast(navigator.onLine === false ? "You’re offline — showing saved weather" : "Refreshing weather…"); refreshWeather(true); });
  /* markets retry (inside the clickable Investments card) */
  document.addEventListener("click", function (e) {
    var r = e.target && e.target.closest && e.target.closest("[data-mk-retry]"); if (!r) return;
    e.preventDefault(); e.stopPropagation(); toast("Retrying prices…"); refreshMarkets();
  }, true);
})();


/* ---- v4.19 calendar: import an .ics file; events stay on this device ---- */
function v6OpenCalApp() { var a = APPS.filter(function (x) { return x.id === "calendar"; })[0]; if (a) openApp(a); else openApp({ url: "calshow://", web: "https://calendar.google.com" }); }
function v6IcsDate(v, params) {
  if (!v) return null;
  var m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if (!m) return null;
  if (!m[4]) return { t: new Date(+m[1], +m[2] - 1, +m[3]).getTime(), allDay: true };
  var d = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return { t: d.getTime(), allDay: false };
}
function v6ParseIcs(txt) {
  var lines = String(txt).replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/), out = [], ev = null, rec = 0;
  lines.forEach(function (ln) {
    if (ln === "BEGIN:VEVENT") { ev = {}; return; }
    if (ln === "END:VEVENT") { if (ev && ev.s) { out.push(ev); if (ev.r) rec++; } ev = null; return; }
    if (!ev) return;
    var i = ln.indexOf(":"); if (i < 0) return;
    var key = ln.slice(0, i), val = ln.slice(i + 1), name = key.split(";")[0].toUpperCase();
    if (name === "SUMMARY") ev.t = val.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ").slice(0, 120);
    else if (name === "LOCATION") ev.l = val.replace(/\\,/g, ",").replace(/\\n/gi, " ").slice(0, 120);
    else if (name === "DTSTART") { var d = v6IcsDate(val.trim(), key); if (d) { ev.s = d.t; ev.a = d.allDay; } }
    else if (name === "DTEND") { var d2 = v6IcsDate(val.trim(), key); if (d2) ev.e = d2.t; }
    else if (name === "RRULE") ev.r = 1;
  });
  return { events: out, recurring: rec };
}
function v6Cal() { var c = Store.getLocal("v6cal", null); return c && Array.isArray(c.ev) ? c : null; }
function v6DayEvents(day) {
  var c = v6Cal(); if (!c) return [];
  var d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(), d1 = d0 + 864e5;
  return c.ev.filter(function (e) { var en = e.e || (e.s + (e.a ? 864e5 : 0)); return e.s < d1 && (en > d0 || e.s >= d0); }).sort(function (a, b) { return a.s - b.s; });
}
function v6EvTime(e) { if (e.a) return "All day"; var d = new Date(e.s), h = d.getHours(); return ((h % 12) || 12) + ":" + pad2(d.getMinutes()) + (h < 12 ? " AM" : " PM"); }
function v6PaintCalLine() {
  var v = $("#tdCalV"); if (!v) return;
  var c = v6Cal(); if (!c) { v.textContent = "Open today’s schedule"; return; }
  var now = Date.now(), list = v6DayEvents(new Date()).filter(function (e) { return e.a || (e.e || e.s) > now; });
  v.textContent = list.length ? (v6EvTime(list[0]) + " · " + (list[0].t || "Event")) : "Nothing else today";
}
function v6Agenda() {
  var c = v6Cal(), today = v6DayEvents(new Date()), tm = new Date(Date.now() + 864e5), tomorrow = v6DayEvents(tm);
  function li(list) { return list.length ? list.map(function (e) { return '<div class="v6-ev"><b>' + esc(v6EvTime(e)) + '</b><span>' + esc(e.t || "Event") + (e.l ? '<small>' + esc(e.l) + '</small>' : "") + '</span></div>'; }).join("") : '<p class="dim v6-empty">No events.</p>'; }
  var html = '<div class="v6-dest">' + (c
    ? '<div class="v6-list-h"><b>TODAY</b></div>' + li(today) + '<div class="v6-list-h"><b>TOMORROW</b></div>' + li(tomorrow) +
      '<p class="note">From the calendar file you imported ' + esc(new Date(c.at).toLocaleDateString()) + ' (' + c.ev.length + ' events). It doesn’t update by itself — import a fresh file to refresh.' + (c.rec ? ' ' + c.rec + (c.rec === 1 ? ' repeating event shows only its first date.' : ' repeating events show only their first date.') : "") + '</p>'
    : '<p class="v6-lead">ZAPWISE can’t read your calendar account. To see today’s agenda here, export your calendar as an .ics file (Google Calendar: Settings → Import &amp; export → Export) and import it below. It stays on this device.</p>') +
    '<div class="v6-next"><small>NEXT USEFUL ACTION</small><b>' + (c ? "Open your calendar app for changes" : "Import a calendar file") + '</b></div>' +
    '<div class="v6-row"><button type="button" class="chip accent" id="v6CalApp">Open calendar app ↗</button><label class="chip" id="v6CalImpL">⇪ Import .ics<input type="file" id="v6CalImp" accept=".ics,text/calendar" hidden></label>' + (c ? '<button type="button" class="chip" id="v6CalDel">Remove imported calendar</button>' : "") + '</div>' +
    '<button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
  sheet("TODAY’S AGENDA", html, function (b) {
    b.querySelector("#v6CalApp").addEventListener("click", function () { closeSheet(); v6OpenCalApp(); });
    b.addEventListener("click", function (e) { if (e.target.closest("[data-v6-home]")) v6GoHome(); if (e.target.closest("#v6CalDel")) { Store.setLocal("v6cal", null); v6PaintCalLine(); toast("Imported calendar removed"); v6Agenda(); } });
    b.querySelector("#v6CalImp").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { toast("File is over 5 MB"); return; }
      var r = new FileReader();
      r.onload = function () {
        var res = v6ParseIcs(r.result || ""), now = Date.now();
        var keep = res.events.filter(function (x) { return (x.e || x.s) > now - 864e5 && x.s < now + 60 * 864e5; }).slice(0, 800);
        if (!res.events.length) { toast("No events found in that file"); return; }
        Store.setLocal("v6cal", { at: now, ev: keep, rec: res.recurring });
        v6PaintCalLine(); toast(keep.length + " upcoming events imported"); v6Agenda();
      };
      r.onerror = function () { toast("Couldn’t read that file"); };
      r.readAsText(f);
    });
  });
}
try { v6PaintCalLine(); setInterval(v6PaintCalLine, 60000); } catch (eCl) {}

/* ---- v4.19 TV / remote: arrow keys move between controls on big screens ---- */
(function v6Tv() {
  var root = document.documentElement;
  function upd() { var on = innerWidth >= 1900 || /[?&]tv=1/.test(location.search); root.classList.toggle("tv-nav", on); }
  upd(); window.addEventListener("resize", upd);
  var SEL = "#osPage button:not([disabled]), #osPage a[href], #osPage [tabindex='0'], #osPage select, #top button";
  document.addEventListener("keydown", function (e) {
    if (!root.classList.contains("tv-nav")) return;
    var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var a = document.activeElement;
    if (a && (a.closest("input,textarea,select,[contenteditable],#mapV,.wx-sw") || (a.closest("#v6Orbit:not(.is-list)") && dir[0] !== 0) || /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
    try { if (anyOverlayOpen()) return; } catch (eO) {}
    var from = (a && a !== document.body && a.getBoundingClientRect) ? a.getBoundingClientRect() : { left: innerWidth / 2, top: -1, width: 0, height: 0 };
    var fx = from.left + from.width / 2, fy = from.top + from.height / 2, best = null, bs = 1e9;
    [].slice.call(document.querySelectorAll(SEL)).forEach(function (el) {
      if (el === a || el.closest("[hidden]") || el.closest("#v6Orbit .v6-item[tabindex='-1']")) return;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (el.classList.contains("v6-item") && !el.closest(".is-list") && !(a && a.closest && a.closest("#v6Orbit"))) r = el.parentNode.getBoundingClientRect(); /* the ring is one stop for the remote */
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = cx - fx, dy = cy - fy;
      var along = dx * dir[0] + dy * dir[1]; if (along <= 4) return;
      var across = Math.abs(dx * dir[1] + dy * dir[0]);
      var ov = dir[0] ? (r.top < from.top + from.height && r.bottom > from.top) : (r.left < from.left + from.width && r.right > from.left);
      var sc = along + (ov ? across * 0.3 : across * 2.2 + 1600); if (sc < bs) { bs = sc; best = el; }
    });
    if (!best) return;
    e.preventDefault();
    best.focus({ preventScroll: true });
    try { best.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (eS) {}
  });
})();

/* ========== v4.20 ZAP CONNECT: every service, what it reads, what it shares, and how to turn it off ========== */
function v6Ago(t) { if (!t) return "never"; var m = Math.round((Date.now() - t) / 60000); if (m < 1) return "just now"; if (m < 60) return m + " min ago"; var h = Math.round(m / 60); if (h < 48) return h + " h ago"; return Math.round(h / 24) + " days ago"; }
function v6SmartOn() { try { return !!loadAssistantPrefs().smartMode; } catch (e) { return false; } }
function v6SetSmart(on) {
  var a = loadAssistantPrefs(); a.smartMode = !!on; saveAssistantPrefs(a);
  var c = $("#zapSmart"); if (c) c.checked = !!on;
  v6PaintSmartState();
}
function v6PaintSmartState() {
  var on = v6SmartOn(), el = $("#zapSmartState");
  if (el) { el.textContent = on ? "ON · Pollinations" : "OFF · on this device only"; el.className = "v6-st " + (on ? "warn" : "ok"); }
}
var V6_GEO_PERM = "unknown";
try { if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (p) { V6_GEO_PERM = p.state; p.onchange = function () { V6_GEO_PERM = p.state; }; }).catch(function () {}); } catch (eGp) {}
function v6Services() {
  var S = [];
  var bankOn = false, bankLg = null; try { bankOn = bankDeviceReady(); bankLg = ZAP_BANK_PLAID.loadLastGood(); } catch (e) {}
  var bankAcc = []; try { bankAcc = getBankAccounts(); } catch (e2) {}
  S.push({ id: "plaid", n: "Bank (Plaid)", grp: "money", on: bankOn,
    st: bankOn ? ("Connected · " + bankAcc.length + " account" + (bankAcc.length === 1 ? "" : "s") + " · updated " + v6Ago(_bankLastRefresh || (bankLg && bankLg.at))) : "Not linked on this device",
    err: bankOn && _bankLastRefresh === 0 && bankLg && Date.now() - bankLg.at > 36e5 ? "Couldn’t refresh lately — showing the last balances we saved." : "",
    reads: V6_PLAID_READS(),
    shares: "This device sends a private device token to the ZAPWISE bank service (zapwise-bank Worker). The Worker talks to Plaid; your bank password never touches ZAPWISE.",
    perms: bankOn ? v25PermRows() : null,
    acts: bankOn ? [["refresh", "Refresh balances"], ["bankhide", "Hide/show balances"], ["bankforget", "Forget on this device"]].concat(_bankProd && _bankProd.tx === "needs" ? [["spendallow", "Allow spending in Plaid ↗"]] : []).concat(_bankProd && (_bankProd.inv === "unsupported" || _bankProd.inv === "needs") ? [["brokerlink", "Link a brokerage ↗"]] : []) : [["banklink", "Link your bank ↗"]] });
  var gpsOn = !!(GPS && GPS.lat != null);
  S.push({ id: "loc", n: "Location (GPS)", grp: "device", on: gpsOn,
    st: GEO_OFF || V6_GEO_PERM === "denied" ? "Off — blocked in browser settings" : (gpsOn ? "On · last fix " + v6Ago(GPS.at) : (V6_GEO_PERM === "prompt" ? "Not allowed yet" : "Waiting for a fix")),
    reads: "Your position while ZAPWISE is open (for the map, weather and ETAs).",
    shares: "Rounded coordinates go to Open-Meteo (weather) and BigDataCloud (city name); map and traffic tiles for your area load from OpenStreetMap and TomTom (via the zapwise-traffic Worker).",
    note: "To fully turn location off, change it in your browser or phone settings — a web page can’t revoke its own permission.",
    acts: [["loccity", "Use a city instead"], ["locclear", "Forget last position"]] });
  S.push({ id: "wx", n: "Weather (Open-Meteo)", grp: "data", on: !!(WX && WX.at),
    st: WX && WX.at ? "Live · updated " + v6Ago(WX.at) + " · " + (WX.place || "") : (navigator.onLine === false ? "Offline" : "No weather yet — set a city"),
    reads: "Forecast for your location or chosen city.", shares: "Coordinates only. Free, no account.", acts: [["wxretry", "Refresh"], ["loccity", "Change city"]] });
  var cal = null; try { cal = v6Cal(); } catch (e3) {}
  S.push({ id: "cal", n: "Calendar file (.ics)", grp: "data", on: !!cal,
    st: cal ? (cal.ev.length + " events · imported " + v6Ago(cal.at)) : "Nothing imported",
    reads: "Only the file you choose. Events for the next 60 days are kept.", shares: "Nothing. The file is read on this device.",
    acts: cal ? [["calopen", "Open agenda"], ["calclear", "Remove imported calendar"]] : [["calopen", "Import a calendar file"]] });
  var ap = {}; try { ap = loadAssistantPrefs(); } catch (e4) {}
  S.push({ id: "ai", n: "Online answers (Pollinations)", grp: "ai", on: !!ap.smartMode,
    st: ap.smartMode ? "ON — questions that aren’t commands are sent online" : "OFF — every question stays on this device",
    reads: "The question you type or say, when it isn’t a ZAPWISE command.",
    shares: "Question + local time, weather and BTC/Gold prices go to text.pollinations.ai (a free open-model service). Never bank or portfolio numbers, notes or places.",
    toggle: "smart" });
  S.push({ id: "brain", n: "Offline brain (WebLLM)", grp: "ai", on: !!(ap.modelCached || ZAP_LLM.engine),
    st: !hasWebGPU() ? "Not available — this browser has no WebGPU" : (ap.modelCached || ZAP_LLM.engine ? (ap.webllm ? "Downloaded · ON" : "Downloaded · paused") : "Not downloaded (~290 MB)"),
    reads: "Your chat questions, on this device.", shares: "Nothing after the one-time model download from Hugging Face / esm.run.",
    acts: (ap.modelCached || ZAP_LLM.engine) ? [["braindel", "Delete the model"]] : (hasWebGPU() ? [["zapopen", "Open ZAP AI to download"]] : []) });
  S.push({ id: "traffic", n: "Live traffic (TomTom)", grp: "data", on: trafficWanted() && !TRAFFIC.dead,
    st: !trafficWanted() ? "Off" : (TRAFFIC.dead ? "Error — traffic service isn’t answering" : (TRAFFIC.lastOk ? "On · tiles loaded " + v6Ago(TRAFFIC.lastOk) : "On")),
    reads: "Traffic colors for the map area you’re looking at.", shares: "Map tile numbers (area + zoom) go to the zapwise-traffic Worker, which asks TomTom. The TomTom key stays on the server.", toggle: "traffic" });
  S.push({ id: "mk", n: "Market prices (CoinGecko / Binance)", grp: "data", on: !!(MK && MK.at) && !mkErr,
    st: mkErr ? "Error — price service didn’t answer" + (MK && MK.at ? " · last prices " + v6Ago(MK.at) : "") : (MK && MK.at ? "Live · updated " + v6Ago(MK.at) : "Loading"),
    reads: "Public prices for the coins in your watchlist and holdings.", shares: "Coin names only — never your amounts.", acts: [["mkretry", "Retry"]] });
  var prov = "Google"; try { prov = searchProv().name || prov; } catch (e5) {}
  S.push({ id: "search", n: "Web search (" + prov + ")", grp: "data", on: true, st: "Used only when you choose a web search",
    reads: "Nothing in the background.", shares: "Your search words go to " + prov + " when you pick a web result. Change the provider in the search bar.", acts: [] });
  return S;
}
function V6_PLAID_READS() { return "Read-only: account names, type, balances and last 4 digits" + (_bankProd && _bankProd.tx === "on" ? "; transactions (merchant, amount, date, category)" : "") + (_bankProd && _bankProd.inv === "on" ? "; investment holdings and values" : "") + ". ZAPWISE can’t move money or trade."; }
var V6_AVAIL = [
  ["Spotify", "Show the song that’s playing and play/pause from ZAPWISE.", "A free Spotify developer app and your sign-in (OAuth). Not set up."],
  ["Google Calendar (live)", "Today’s events without importing a file.", "Google sign-in with calendar read permission. Until then, use the .ics import."],
  ["Home Assistant (controls)", "Switch lights and devices from ZAPWISE.", "A Home Assistant long-lived token stored on this device. Today ZAPWISE only opens your dashboard."],
  ["Apple Music / HomeKit / CarPlay", "Native Apple features.", "A native iPhone app (Apple Developer Program, paid). A website can’t use them."]
];
function openConnect() {
  var S = v6Services();
  var html = '<div class="v6-dest v6-connect"><p class="v6-lead">Everything ZAPWISE connects to, what it can read, what leaves this device, and how to turn it off.</p>' +
    '<div class="v6-list-h"><b>CONNECTED &amp; IN USE</b></div>' +
    S.map(function (s) {
      var stc = s.err || /Error|Off —|blocked|isn’t answering/.test(s.st) ? "bad" : (s.on ? "ok" : "idle");
      return '<section class="v6-svc" aria-label="' + esc(s.n) + '"><div class="v6-svc-h"><b>' + esc(s.n) + '</b><span class="v6-st ' + stc + '">' + esc(s.st) + '</span></div>' +
        (s.err ? '<p class="v6-svc-err" role="status">' + esc(s.err) + '</p>' : "") +
        '<dl><dt>Can read</dt><dd>' + esc(s.reads) + '</dd><dt>Shared</dt><dd>' + esc(s.shares) + '</dd></dl>' +
        (s.perms ? '<ul class="v25-perms" aria-label="Bank permissions">' + s.perms.map(function (p) { return '<li><b>' + esc(p[0]) + '</b><span class="v6-st ' + p[2] + '">' + esc(p[1]) + '</span></li>'; }).join("") + '</ul>' : "") +
        (s.note ? '<p class="note">' + esc(s.note) + '</p>' : "") +
        '<div class="v6-row">' + (s.toggle ? '<button type="button" class="chip' + (s.on ? " accent" : "") + '" role="switch" aria-checked="' + (!!s.on) + '" data-cx="tog-' + s.toggle + '">' + (s.on ? "ON · tap to turn off" : "OFF · tap to turn on") + '</button>' : "") +
        (s.acts || []).map(function (a) { return '<button type="button" class="chip" data-cx="' + a[0] + '">' + esc(a[1]) + '</button>'; }).join("") + '</div></section>';
    }).join("") +
    '<div class="v6-list-h"><b>AVAILABLE · NOT CONNECTED</b></div>' +
    V6_AVAIL.map(function (a) { return '<section class="v6-svc idle"><div class="v6-svc-h"><b>' + esc(a[0]) + '</b><span class="v6-st idle">Not connected</span></div><dl><dt>Would let you</dt><dd>' + esc(a[1]) + '</dd><dt>Needs</dt><dd>' + esc(a[2]) + '</dd></dl></section>'; }).join("") +
    '<button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
  sheet("ZAP CONNECT", html, function (b) {
    b.addEventListener("click", function (e) {
      if (e.target.closest("[data-v6-home]")) { v6GoHome(); return; }
      var x = e.target.closest("[data-cx]"); if (!x) return; var k = x.getAttribute("data-cx");
      var again = function () { setTimeout(openConnect, 250); };
      if (k === "tog-smart") { v6SetSmart(!v6SmartOn()); toast(v6SmartOn() ? "Online answers on" : "Online answers off — questions stay here"); again(); }
      else if (k === "tog-traffic") { setTrafficWanted(!trafficWanted()); toast(trafficWanted() ? "Live traffic on" : "Live traffic off"); again(); }
      else if (k === "refresh") { toast("Refreshing balances…"); refreshBankAccountsFromLink({ refresh: true }).then(again, again); }
      else if (k === "bankhide") { var eye = $("#hBkEye"); if (eye) eye.click(); toast("Balance privacy switched"); }
      else if (k === "bankforget") {
        if (!confirm("Forget the bank link on this device? Balances disappear here. Your bank stays linked on the ZAPWISE server; use Unlink in Bank settings to remove it there.")) return;
        try { ZAP_BANK_PLAID.setToken(""); localStorage.removeItem("zapwise_bank_last_good"); } catch (eF) {}
        try { renderBanks(); } catch (eR) {}
        toast("Forgotten on this device"); again();
      }
      else if (k === "banklink") { location.href = "/os/link/"; }
      else if (k === "spendallow") { location.href = "/os/link/?update=1"; }
      else if (k === "brokerlink") { location.href = "/os/link/?brokerage=1"; }
      else if (k === "loccity") { openCity(); }
      else if (k === "locclear") { try { Store.setLocal("gpsLoc", null); Store.setLocal("gps", null); GPS = null; renderMap(true); } catch (eL) {} toast("Last position forgotten"); again(); }
      else if (k === "wxretry") { refreshWeather(true); toast("Refreshing weather…"); again(); }
      else if (k === "calopen") { v6Agenda(); }
      else if (k === "calclear") { if (!confirm("Remove the imported calendar from this device?")) return; Store.setLocal("v6cal", null); try { v6PaintCalLine(); } catch (eC) {} toast("Calendar removed"); again(); }
      else if (k === "braindel") { if (!confirm("Delete the offline brain from this device?")) return; deleteWebLLMCache(); again(); }
      else if (k === "zapopen") { closeSheet(); openZapAssistant(); }
      else if (k === "mkretry") { refreshMarkets(); toast("Retrying prices…"); again(); }
    });
  });
}
(function v6ConnectBoot() {
  var row = $("#zapSmartRow");
  if (row && !$("#zapSmartState")) { var s = document.createElement("span"); s.id = "zapSmartState"; s.setAttribute("role", "status"); row.querySelector(".zap-smart-lab").appendChild(s); }
  var c = $("#zapSmart"); if (c) c.addEventListener("change", function () { setTimeout(v6PaintSmartState, 0); });
  v6PaintSmartState();
  window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.openConnect = openConnect; window.ZAPOS.services = v6Services;
})();

/* ========== v4.21 ZAP ACTIONS: one action registry for search, ZAP AI, Quick Actions, the orbit and TV ==========
   Each action says what kind it is: "device" (done here), "handoff" (opens another app/site — never reported as completed)
   or "prepare" (makes something you finish yourself, like a calendar file). confirm:true asks first. */
var _ZA = null;
function zaDefs() {
  if (_ZA) return _ZA;
  function place(rx) { return v6Place(rx); }
  _ZA = {
    "focus.start": { n: "Start focus", ic: "◔", kind: "device", run: function (a) { var m = (a && a.mins) || FOC.mins || 25; if (FOC.st === "run") return { status: "done", msg: "Focus is already running" }; FOC = { st: "idle", mins: m }; Store.setLocal("focus", FOC); focusToggle(); v6GoCard("mFocus"); return { status: "done", msg: m + "-minute focus started" }; } },
    "reminder.add": { n: "Save a reminder", ic: "⏰", kind: "device", confirm: function (a) { return "Save reminder “" + (a.text || "").slice(0, 80) + "” on this device? It won’t send phone alerts."; }, run: function (a) { if (!a || !a.text) { zaPrefillZap("remind me to "); return { status: "cancelled" }; } var r = zapLoadReminders(); r.unshift({ t: String(a.text).slice(0, 160), at: Date.now() }); zapSaveReminders(r); return { status: "done", msg: "Reminder saved on this device" }; } },
    "note.add": { n: "Save a note", ic: "✎", kind: "device", confirm: function (a) { return "Save this note on this device: “" + (a.text || "").slice(0, 80) + "”?"; }, run: function (a) { if (!a || !a.text) { zaPrefillZap("add note "); return { status: "cancelled" }; } var n = zapLoadNotes(); n.unshift({ t: String(a.text).slice(0, 160), at: Date.now() }); zapSaveNotes(n); return { status: "done", msg: "Note saved" }; } },
    "cal.event": { n: "Prepare a calendar event", ic: "▦", kind: "prepare", run: function (a) { zaEventSheet(a || {}); return { status: "opened" }; } },
    "cal.agenda": { n: "Today’s agenda", ic: "▦", kind: "device", run: function () { v6Agenda(); return { status: "done" }; } },
    "search.web": { n: "Search the web", ic: "⌕", kind: "handoff", run: function (a) { if (!a || !a.q) { v6GoHome(); setTimeout(function () { var i = $("#srchQ"); if (i) i.focus(); }, 300); return { status: "cancelled" }; } go(webSearchUrl(a.q)); return { status: "handoff", msg: "Opened " + searchProv().name + " — results are there" }; } },
    "site.open": { n: "Open website", ic: "↗", kind: "handoff", run: function (a) { var u = zaSafeUrl(a && a.url); if (!u) return { status: "failed", msg: "That isn’t a valid web address" }; go(u); return { status: "handoff", msg: "Opened " + u.replace(/^https:\/\//, "").slice(0, 40) }; } },
    "nav.place": { n: "Directions to a saved place", ic: "➤", kind: "handoff", run: function (a) { var p = a && a.place; if (!p) return { status: "failed", msg: "Save the place in Navigate first" }; openDirectionsTo(p); return { status: "handoff", msg: "Opened your maps app with directions to " + (p.name || "the place") }; } },
    "nav.home": { n: "Take me home", ic: "⌂", kind: "handoff", run: function () { var p = place(/home|house/i); if (!p) { v6GoCard("panelNav"); return { status: "failed", msg: "Add Home in Navigate → ＋ ADD first" }; } openDirectionsTo(p); return { status: "handoff", msg: "Opened your maps app with directions home" }; } },
    "nav.work": { n: "Directions to Work", ic: "▣", kind: "handoff", run: function () { var p = place(/work|office/i); if (!p) { v6GoCard("panelNav"); return { status: "failed", msg: "Add Work in Navigate → ＋ ADD first" }; } openDirectionsTo(p); return { status: "handoff", msg: "Opened your maps app with directions to Work" }; } },
    "nav.search": { n: "Find on the map", ic: "⌖", kind: "handoff", run: function (a) { var q = (a && a.q) || ""; go((IOS ? "https://maps.apple.com/?q=" : "https://www.google.com/maps/search/") + encodeURIComponent(q)); return { status: "handoff", msg: "Opened maps for “" + q.slice(0, 30) + "”" }; } },
    "media.open": { n: "Play music", ic: "♪", kind: "handoff", run: function () { var m = currentMedia(); openApp(m); return { status: "handoff", msg: "Opened " + m.name + " — playback happens there" }; } },
    "shop.search": { n: "Shop", ic: "🛍", kind: "device", run: function (a) { v6OpenDest("shop", { q: a && a.q }); return { status: "done" }; } },
    "watch.search": { n: "Find something to watch", ic: "▶", kind: "device", run: function (a) { v6OpenDest("watch", { q: a && a.q }); return { status: "done" }; } },
    "food.search": { n: "Find food", ic: "🍴", kind: "device", run: function (a) { v6OpenDest("food", { q: a && a.q }); return { status: "done" }; } },
    "app.open": { n: "Open an app", ic: "▦", kind: "handoff", run: function (a) { if (!a || !a.app) { try { window.ZAPOS.openAppsSheet(); } catch (e) {} return { status: "cancelled" }; } openApp(a.app); return { status: "handoff", msg: "Opened " + (a.app.name || "the app") }; } },
    "weather.show": { n: "Weather detail", ic: "☁", kind: "device", run: function () { toggleXp("wx"); return { status: "done" }; } },
    "bank.refresh": { n: "Refresh balances", ic: "$", kind: "device", run: function () { if (!bankDeviceReady()) { location.href = "/os/link/"; return { status: "handoff", msg: "Opening bank link" }; } refreshBankAccountsFromLink({ refresh: true }).then(function () { toast("Balances updated"); }, function () { toast("Couldn’t refresh — showing saved balances"); }); return { status: "pending", msg: "Refreshing balances…" }; } },
    "portfolio.open": { n: "Portfolio", ic: "↗", kind: "device", run: function () { openCardDetail("mk", { fromUser: true }); return { status: "done" }; } },
    "connect.open": { n: "ZAP Connect", ic: "⇄", kind: "device", run: function () { openConnect(); return { status: "done" }; } },
    "zap.ask": { n: "Ask ZAP AI", ic: "✦", kind: "device", run: function (a) { openZapAssistant(); if (a && a.q) setTimeout(function () { try { zapHandle(a.q); } catch (e) {} }, 250); return { status: "done" }; } },
    "dash.edit": { n: "Customize dashboard", ic: "⚙", kind: "device", run: function () { openDashEdit(); return { status: "done" }; } }
  };
  V6_DEST.forEach(function (d) { _ZA["dest." + d.id] = { n: d.n, ic: "◎", kind: "device", run: function (a) { v6OpenDest(d.id, a || {}); return { status: "done" }; } }; });
  return _ZA;
}
function zaPrefillZap(t) { openZapAssistant(); setTimeout(function () { var i = $("#zapIn"); if (i) { i.value = t; i.focus(); } }, 120); }
function zaSafeUrl(u) {
  u = String(u || "").trim(); if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { var x = new URL(u); if (!/^https?:$/.test(x.protocol) || !/\./.test(x.hostname) || /\s/.test(u)) return ""; return x.protocol === "http:" ? "https://" + x.host + x.pathname + x.search : x.href; } catch (e) { return ""; }
}
function zaConfirm(text, yes) {
  sheet("CONFIRM", '<div class="v6-dest"><p class="v6-lead">' + esc(text) + '</p><div class="v6-row"><button type="button" class="chip accent" id="zaYes">Confirm</button><button type="button" class="chip" id="zaNo">Cancel</button></div></div>', function (b) {
    b.querySelector("#zaYes").addEventListener("click", function () { closeSheet(); setTimeout(yes, 60); });
    b.querySelector("#zaNo").addEventListener("click", function () { closeSheet(); toast("Cancelled — nothing changed"); });
    setTimeout(function () { try { b.querySelector("#zaYes").focus(); } catch (e) {} }, 60);
  });
}
/* the one entry point: run(id, args, {source}) → reports honestly what happened */
function zaRun(id, args, opt) {
  if (document.documentElement.classList.contains("car-mode") && /^(shop\.|dest\.shop|dest\.food|food\.|watch\.|dest\.watch)/.test(id)) { toast("Not available in car view — exit car view first"); return { status: "failed", msg: "Not available in car view" }; }
  opt = opt || {};
  var d = zaDefs()[id]; if (!d) { toast("Unknown action"); return; }
  function go2() {
    var r; try { r = d.run(args || {}) || { status: "done" }; } catch (e) { r = { status: "failed", msg: "That didn’t work — try again" }; }
    if (r.msg && !opt.quiet) toast(r.msg);
    try { var log = Store.getLocal("zaLog", null) || []; log.unshift({ id: id, s: r.status, at: Date.now() }); Store.setLocal("zaLog", log.slice(0, 30)); } catch (eL) {}
    return r;
  }
  if (d.confirm && !opt.confirmed) { zaConfirm(typeof d.confirm === "function" ? d.confirm(args || {}) : String(d.confirm), go2); return { status: "asking" }; }
  return go2();
}
function zaLabel(id) { var d = zaDefs()[id]; return d ? d.n : id; }
function zaKindTag(id) { var d = zaDefs()[id]; if (!d) return ""; return d.kind === "handoff" ? "OPENS ANOTHER APP" : (d.kind === "prepare" ? "YOU FINISH IT" : "ON THIS DEVICE"); }
/* calendar event → .ics file you add yourself (ZAPWISE can’t write to your calendar) */
function zaIcsStamp(d) { return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + "00Z"; }
function zaIcsEsc(s) { return String(s || "").replace(/[\\;,]/g, function (c) { return "\\" + c; }).replace(/\r?\n/g, "\\n"); }
function zaMakeIcs(title, start, mins, loc) {
  var end = new Date(start.getTime() + mins * 60000);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ZAPWISE//OS//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "-" + Math.random().toString(36).slice(2) + "@zapwiseai.com", "DTSTAMP:" + zaIcsStamp(new Date()), "DTSTART:" + zaIcsStamp(start), "DTEND:" + zaIcsStamp(end), "SUMMARY:" + zaIcsEsc(title)].concat(loc ? ["LOCATION:" + zaIcsEsc(loc)] : []).concat(["END:VEVENT", "END:VCALENDAR"]).join("\r\n");
}
function zaParseWhen(q) {
  var d = new Date(), out = {};
  if (/\btomorrow\b/.test(q)) d.setDate(d.getDate() + 1);
  var wd = q.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/); if (wd && !/\btomorrow|today\b/.test(q)) { var tgt = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(wd[1]); var add = (tgt - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add); }
  var tm = q.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || q.match(/\bat\s+(\d{1,2})(?::(\d{2}))\b/);
  if (tm) { var h = +tm[1] % 12; if (tm[3] === "pm") h += 12; if (!tm[3]) h = +tm[1]; d.setHours(h, +(tm[2] || 0), 0, 0); out.time = true; }
  out.date = d; return out;
}
function zaEventSheet(a) {
  var w = a.when || new Date(Date.now() + 36e5); var dv = w.getFullYear() + "-" + pad2(w.getMonth() + 1) + "-" + pad2(w.getDate()), tv = pad2(w.getHours()) + ":" + pad2(a.hasTime ? w.getMinutes() : 0);
  var html = '<form class="v6-dest" id="zaEvF" autocomplete="off"><p class="v6-lead">ZAPWISE can’t write to your calendar, so it prepares a calendar file. Open it and your phone or computer asks where to add it.</p>' +
    '<label class="v6-fl">Title<input id="zaEvT" maxlength="100" required value="' + esc(a.title || "") + '"></label>' +
    '<div class="v6-row"><label class="v6-fl">Date<input id="zaEvD" type="date" required value="' + dv + '"></label><label class="v6-fl">Time<input id="zaEvH" type="time" required value="' + tv + '"></label><label class="v6-fl">Minutes<input id="zaEvM" type="number" min="5" max="1440" step="5" value="' + (a.mins || 60) + '"></label></div>' +
    '<label class="v6-fl">Location (optional)<input id="zaEvL" maxlength="120" value="' + esc(a.loc || "") + '"></label>' +
    '<div class="v6-row"><button type="submit" class="chip accent">Prepare calendar file</button><button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div></form>';
  sheet("NEW EVENT", html, function (b) {
    b.addEventListener("click", function (e) { if (e.target.closest("[data-v6-home]")) v6GoHome(); });
    b.querySelector("#zaEvF").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = b.querySelector("#zaEvT").value.trim(), dd = b.querySelector("#zaEvD").value, hh = b.querySelector("#zaEvH").value, mm = Math.max(5, Math.min(1440, +b.querySelector("#zaEvM").value || 60)), loc = b.querySelector("#zaEvL").value.trim();
      var m = dd.match(/^(\d{4})-(\d{2})-(\d{2})$/), h = hh.match(/^(\d{2}):(\d{2})$/);
      if (!t || !m || !h) { toast("Add a title, date and time"); return; }
      var st = new Date(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]);
      zaConfirm("Prepare “" + t.slice(0, 60) + "” on " + st.toLocaleDateString() + " at " + v6EvTime({ s: st.getTime() }) + "? You’ll add it to your calendar yourself.", function () {
        try {
          var blob = new Blob([zaMakeIcs(t.slice(0, 100), st, mm, loc.slice(0, 120))], { type: "text/calendar" });
          var url = URL.createObjectURL(blob), aEl = document.createElement("a");
          aEl.href = url; aEl.download = (t.replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "event") + ".ics"; document.body.appendChild(aEl); aEl.click();
          setTimeout(function () { URL.revokeObjectURL(url); aEl.remove(); }, 4000);
          toast("Calendar file ready — open it to add the event. It isn’t in your calendar until you do.");
        } catch (eB) { toast("Couldn’t prepare the file"); }
      });
    });
  });
}
/* universal search extras: websites, products, map, watch, food, actions, web, AI — each with its next action */
function zaSearchExtras(q, raw) {
  var out = [], r = String(raw || "").trim();
  if (r.length < 2) return out;
  if (/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(r) && zaSafeUrl(r)) out.push({ k: "web", label: "Open " + r.replace(/^https?:\/\//, "").slice(0, 40), sub: "WEBSITE · OPENS IN BROWSER", run: function () { zaRun("site.open", { url: r }); } });
  Object.keys(zaDefs()).forEach(function (id) { var d = zaDefs()[id]; if (id.indexOf("dest.") === 0) return; if (d.n.toLowerCase().indexOf(q) >= 0) out.push({ k: "cmd", label: d.n, sub: "ACTION · " + zaKindTag(id), run: function () { zaRun(id); } }); });
  out.push({ k: "shop", label: "Shop for “" + r.slice(0, 30) + "”", sub: "PRODUCTS · COMPARE STORES (OPENS STORE SEARCH)", run: function () { zaRun("shop.search", { q: r }); } });
  out.push({ k: "place", label: "Find “" + r.slice(0, 30) + "” on the map", sub: "MAPS · OPENS YOUR MAPS APP", run: function () { zaRun("nav.search", { q: r }); } });
  out.push({ k: "web", label: "Search " + searchProv().name + " for “" + r.slice(0, 30) + "”", sub: "WEB · OPENS " + searchProv().name.toUpperCase(), run: function () { zaRun("search.web", { q: r }); } });
  return out;
}
/* ZAP AI → actions from natural language */
function zaIntent(q, orig) {
  var ev = q.match(/^(?:add|create|make|new|schedule|put)\s+(?:an?\s+)?(?:event|meeting|appointment)\s*(?:called|for|:)?\s*(.*)$/) || q.match(/^schedule\s+(.+)$/);
  if (ev) {
    var w = zaParseWhen(q), title = orig.replace(/^(?:add|create|make|new|schedule|put)\s+(?:an?\s+)?(?:event|meeting|appointment)?\s*(?:called|for|:)?\s*/i, "").replace(/\b(today|tomorrow|on\s+\w+day|(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)|at\s+\d{1,2}:\d{2})\b/gi, "").replace(/\s+/g, " ").trim();
    return { skill: "cal.event", kind: "PREPARES A FILE · YOU ADD IT", text: "I’ll prepare a calendar file for “" + (title || "New event") + "”" + (w.time ? " on " + w.date.toLocaleDateString() + " at " + v6EvTime({ s: w.date.getTime() }) : "") + ". ZAPWISE can’t write to your calendar — you add it.", action: { label: "Review event", run: function () { closeZapAssistant(); zaRun("cal.event", { title: title, when: w.date, hasTime: w.time }); } } };
  }
  var wt = q.match(/^(?:watch|stream|where (?:can i|to) watch)\s+(.{2,60})$/);
  if (wt) return { skill: "watch.search", kind: "NEEDS ANOTHER SERVICE · STREAMING SEARCH", text: "I can’t see what’s streaming where, so Watch opens real searches for “" + wt[1] + "”.", action: { label: "Open Watch", run: function () { closeZapAssistant(); zaRun("watch.search", { q: wt[1] }); } } };
  var fd = q.match(/^(?:order|i want|i'?m hungry for|get me|find)\s+(?:some\s+)?(pizza|tacos?|sushi|burgers?|wings|thai|chinese|indian|mexican|coffee|breakfast|lunch|dinner|food.*)$/);
  if (fd) return { skill: "food.search", kind: "NEEDS ANOTHER SERVICE · ORDERING APP", text: "ZAPWISE doesn’t place orders. Food opens restaurants near you and your delivery apps for “" + fd[1] + "”.", action: { label: "Open Food", run: function () { closeZapAssistant(); zaRun("food.search", { q: fd[1] }); } } };
  var nv = q.match(/^(?:navigate|directions|drive|take me)\s+to\s+(.{2,60})$/);
  if (nv && !v6Place(new RegExp(nv[1].replace(/[^\w ]/g, ""), "i"))) return { skill: "nav.search", kind: "NEEDS ANOTHER APP · TAP TO CONFIRM", text: "“" + nv[1] + "” isn’t a saved place. I can open your maps app to find it — the route and traffic are shown there.", action: { label: "Open maps for “" + nv[1].slice(0, 24) + "”", run: function () { closeZapAssistant(); zaRun("nav.search", { q: nv[1] }); } } };
  return null;
}


/* ===== v4.22 CUSTOMIZABLE DASHBOARD ===== */
var DASH_CARDS = [
  { id: "v6Hero", n: "Start here (ZAP AI + menu)", lock: true },
  { id: "panelToday", n: "Today & weather" },
  { id: "cardPlay", n: "Now playing" },
  { id: "mFocus", n: "Focus mode" },
  { id: "panelNav", n: "Navigate" },
  { id: "panelMoney", n: "Banking" },
  { id: "cardInvest", n: "Investments & markets" },
  { id: "appsSection", n: "Apps" },
  { id: "phoneMount", n: "Dial pad & favorites" },
  { id: "cardZap", n: "ZAP AI" },
  { id: "cardShop", n: "Shop smart" },
  { id: "cardQA", n: "Quick actions" }
];
var DASH_DESK = ["panelToday", "cardPlay", "cardZap", "mFocus", "panelNav", "cardShop", "panelMoney", "cardInvest", "cardQA", "v6Hero", "appsSection", "phoneMount"];
var DASH_PHONE = ["v6Hero", "panelToday", "cardPlay", "mFocus", "panelNav", "cardShop", "panelMoney", "cardInvest", "cardQA", "cardZap", "appsSection", "phoneMount"];
function dashLoad() {
  var d = Store.getLocal("dash", null), ids = (innerWidth >= 1024 ? DASH_DESK : DASH_PHONE).slice();
  DASH_CARDS.forEach(function (c) { if (ids.indexOf(c.id) < 0) ids.push(c.id); });
  var order = (d && Array.isArray(d.order)) ? d.order.filter(function (x) { return ids.indexOf(x) >= 0; }) : [];
  ids.forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });
  var off = (d && Array.isArray(d.off)) ? d.off.filter(function (x) { return ids.indexOf(x) >= 0 && x !== "v6Hero"; }) : (innerWidth >= 1024 ? [] : ["cardZap"]);
  return { order: order, off: off };
}
function dashSave(d) { Store.setLocal("dash", { order: d.order.slice(), off: d.off.slice() }); }
function dashName(id) { for (var i = 0; i < DASH_CARDS.length; i++) if (DASH_CARDS[i].id === id) return DASH_CARDS[i]; return { n: id }; }
function applyDash() {
  var pg = document.getElementById("osPage"); if (!pg) return;
  var d = dashLoad(), anchor = document.getElementById("dashEditRow") || document.getElementById("settingsMount");
  d.order.forEach(function (id) {
    var el = document.getElementById(id); if (!el || el.parentNode !== pg) return;
    pg.insertBefore(el, anchor);
    el.classList.toggle("dash-off", d.off.indexOf(id) >= 0);
    el.classList.remove("dash-peek");
  });
  var mk = document.getElementById("xpMk"), wx = document.getElementById("xpWx");
  [wx, mk].forEach(function (x) { if (x && x.parentNode === pg) pg.insertBefore(x, anchor); });
}
function dashPeek(id) {
  var el = document.getElementById(id);
  if (el && el.classList.contains("dash-off")) { el.classList.add("dash-peek"); toast("Showing a hidden card — Customize dashboard to keep it on"); }
}
function openDashEdit() {
  var html = '<p class="note" style="margin-bottom:10px">Switch a card on or off and use ▲ ▼ to move it. Saved on this device only. Hidden cards still open from the menu, search and ZAP AI.</p><div id="dashList"></div>' +
    '<button class="btn alt" id="dashReset" style="margin-top:12px">Reset dashboard to default</button>';
  sheet("⚙ CUSTOMIZE DASHBOARD", html, function (b) {
    function draw() {
      var d = dashLoad(), L = b.querySelector("#dashList"); L.innerHTML = "";
      d.order.forEach(function (id, i) {
        var c = dashName(id), on = d.off.indexOf(id) < 0, r = document.createElement("div");
        r.className = "erow" + (on ? "" : " off");
        r.innerHTML = '<span class="en">' + esc(c.n) + (c.lock ? ' <small class="note">(always on)</small>' : "") + '</span>' +
          '<button class="sq" data-m="up" aria-label="Move ' + esc(c.n) + ' up"' + (i ? "" : " disabled") + '>▲</button>' +
          '<button class="sq" data-m="dn" aria-label="Move ' + esc(c.n) + ' down"' + (i < d.order.length - 1 ? "" : " disabled") + '>▼</button>' +
          (c.lock ? "" : '<button class="sw" role="switch" aria-checked="' + on + '" aria-label="Show ' + esc(c.n) + '" data-m="tog"></button>');
        r.addEventListener("click", function (e) {
          var m = e.target.closest("[data-m]"); if (!m || m.disabled) return; m = m.getAttribute("data-m");
          var dd = dashLoad(), j = dd.order.indexOf(id);
          if (m === "tog") { var k = dd.off.indexOf(id); if (k >= 0) dd.off.splice(k, 1); else dd.off.push(id); }
          else if (m === "up" && j > 0) { dd.order.splice(j, 1); dd.order.splice(j - 1, 0, id); }
          else if (m === "dn" && j < dd.order.length - 1) { dd.order.splice(j, 1); dd.order.splice(j + 1, 0, id); }
          dashSave(dd); applyDash(); draw();
          var nb = b.querySelector('#dashList .erow:nth-child(' + (dd.order.indexOf(id) + 1) + ') [data-m="' + m + '"]');
          if (nb && !nb.disabled) nb.focus();
        });
        L.appendChild(r);
      });
    }
    b.querySelector("#dashReset").addEventListener("click", function () {
      if (!confirm("Reset the dashboard to the default order with every card shown?")) return;
      Store.setLocal("dash", null); applyDash(); draw(); toast("Dashboard reset");
    });
    draw();
  });
}
(function dashInit() {
  try {
    var pg = document.getElementById("osPage"), sm = document.getElementById("settingsMount");
    if (pg && sm && !document.getElementById("dashEditRow")) {
      var r = document.createElement("div"); r.id = "dashEditRow"; r.className = "v6-dashrow";
      r.innerHTML = '<button type="button" class="chip" id="dashEditBtn">⚙ Customize dashboard</button>';
      pg.insertBefore(r, sm);
      r.querySelector("#dashEditBtn").addEventListener("click", function () { openDashEdit(); });
    }
    applyDash();
  } catch (e) {}
  window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.openDashEdit = openDashEdit; window.ZAPOS.applyDash = applyDash;
})();


/* ===== v4.23 LAYOUT: desktop sidebar + top bar, ZAP AI / Shop Smart / Quick Actions cards, phone bottom bar, TV Discover, car view ===== */
var V7_SIDE = [
  { id: "home", n: "Home", ic: "⌂" }, { id: "shop", n: "Shop", ic: "◆" }, { id: "watch", n: "Watch", ic: "▶" }, { id: "listen", n: "Listen", ic: "♫" },
  { id: "food", n: "Food", ic: "✻" }, { id: "navigate", n: "Maps", ic: "➤" }, { id: "smarthome", n: "Smart Home", ic: "◈" }, { id: "finance", n: "Finance", ic: "$" },
  { id: "apps", n: "Apps", ic: "▦" }, { id: "more", n: "More", ic: "⋯" }
];
var V7_TV_STREAM = [
  { n: "Netflix", u: "https://www.netflix.com" }, { n: "YouTube", u: "https://www.youtube.com" }, { n: "Prime Video", u: "https://www.primevideo.com" },
  { n: "Disney+", u: "https://www.disneyplus.com" }, { n: "Max", u: "https://www.max.com" }, { n: "Spotify", u: "https://open.spotify.com" }
];
function v7Desk() { return innerWidth >= 1024; }
function v7Car() { return document.documentElement.classList.contains("car-mode"); }
function v7Tv() { return document.documentElement.classList.contains("tv-mode"); }
function v7SideGo(id) {
  if (id === "home") { v6GoHome(); return; }
  if (id === "more") { openMenu(); return; }
  zaRun("dest." + id, {}, { quiet: true });
}
function v7Inbox() {
  var R = zapLoadReminders(), c = v6Cal(), today = c ? v6DayEvents(new Date()) : [], now = Date.now();
  var left = today.filter(function (e) { return (e.e || e.s) > now; });
  var sug = []; try { sug = window.ZAPOS.suggestions() || []; } catch (e) {}
  var html = '<div class="v6-dest">' +
    '<div class="v6-list-h"><b>REMINDERS</b></div>' +
    (R.length ? R.slice(0, 12).map(function (r, i) { return '<div class="v6-sv"><span class="v6-sv-use">' + esc(r.t) + ' <small class="v6-px">' + esc(new Date(r.at).toLocaleDateString()) + '</small></span><button type="button" class="chip" data-rdel="' + i + '" aria-label="Remove reminder ' + esc(r.t) + '">✕</button></div>'; }).join("") : '<p class="dim v6-empty">No reminders saved.</p>') +
    '<div class="v6-list-h"><b>LATER TODAY</b></div>' +
    (c ? (left.length ? left.slice(0, 8).map(function (e) { return '<div class="v6-ev"><b>' + esc(v6EvTime(e)) + '</b><span>' + esc(e.t || "Event") + '</span></div>'; }).join("") : '<p class="dim v6-empty">Nothing else in your imported calendar today.</p>') : '<p class="dim v6-empty">No calendar imported — Today’s agenda can import an .ics file.</p>') +
    '<div class="v6-list-h"><b>SUGGESTED</b></div>' +
    (sug.length ? sug.slice(0, 3).map(function (s) { return '<p class="dim">' + esc(s.t) + ' — ' + esc(s.d) + '</p>'; }).join("") : '<p class="dim v6-empty">No suggestions right now.</p>') +
    '<p class="note">Saved on this device. ZAPWISE can’t send phone notifications — check here or ask ZAP AI.</p></div>';
  sheet("🔔 INBOX", html, function (b) {
    b.addEventListener("click", function (e) {
      var d = e.target.closest("[data-rdel]"); if (!d) return;
      var r = zapLoadReminders(); r.splice(+d.getAttribute("data-rdel"), 1); zapSaveReminders(r); v7PaintBell(); v7Inbox();
    });
  });
}
function v7PaintBell() {
  var n = 0; try { n = zapLoadReminders().length; var c = v6Cal(), now = Date.now(); if (c) n += v6DayEvents(new Date()).filter(function (e) { return (e.e || e.s) > now; }).length; } catch (e) {}
  var b = $("#v7Bell"); if (!b) return;
  var badge = b.querySelector(".v7-badge"); badge.textContent = n > 9 ? "9+" : String(n); badge.hidden = !n;
  b.setAttribute("aria-label", "Inbox" + (n ? ", " + n + " item" + (n === 1 ? "" : "s") : ", empty"));
}
function v7PaintClock() {
  var c = $("#v7Clock"); if (!c) return; var d = new Date();
  c.innerHTML = "<b>" + esc(t12(d)) + "</b><small>" + esc(d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })) + "</small>";
}
function v7PaintShop() {
  var host = $("#v7ShopList"); if (!host) return;
  var L = v6Lists().shop.filter(function (x) { return !x.done; }).slice(0, 3);
  host.innerHTML = L.length ? L.map(function (x, i) { return '<button type="button" class="v7-shop-it" data-shop-q="' + esc(x.t) + '"><span>' + esc(x.t) + '</span><small>' + (x.price ? esc(x.price) + (x.store ? " · " + esc(x.store) : "") : "No price saved") + '</small></button>'; }).join("")
    : '<p class="dim v6-empty">Nothing saved yet. Save items in Shop, add the price you saw, then compare.</p>';
  var cmp = $("#v7ShopCmp"); if (cmp) cmp.hidden = !L.length;
}
function v7PaintNext() {
  var t = $("#v7NextT"); if (!t) return; var s = [];
  try { s = window.ZAPOS.suggestions() || []; } catch (e) {}
  t.textContent = s.length ? s[0].t : "Ask anything or say what to do";
}
function v7PaintZapMode() { var m = $("#v7ZapMode"); if (m) m.textContent = v6SmartOn() ? "ONLINE ANSWERS ON" : "ON THIS DEVICE"; }
function v7SetCar(on) {
  document.documentElement.classList.toggle("car-mode", !!on);
  try { Store.setLocal("v7car", on ? 1 : 0); } catch (e) {}
  var c = $("#v7Car"); if (c) c.hidden = !on;
  if (on) { try { window.scrollTo(0, 0); } catch (e2) {} setTimeout(function () { var b = $("#v7Car .v7-car-b"); if (b) b.focus({ preventScroll: true }); }, 100); }
}
function v7SetTv(on) {
  document.documentElement.classList.toggle("tv-mode", !!on);
  try { Store.setLocal("v7tv", on ? 1 : 0); } catch (e) {}
  var t = $("#v7Tv"); if (t) t.hidden = !on;
}
(function v7Init() {
  var app = $("#app"), pg = $("#osPage"), top = $("#top"); if (!app || !pg) return;
  /* sidebar */
  var side = document.createElement("nav"); side.id = "v7Side"; side.className = "v7-side"; side.setAttribute("aria-label", "Main");
  side.innerHTML = '<div class="v7-side-brand" aria-hidden="true">ZAPWISE<b>//OS</b></div>' + V7_SIDE.map(function (s) { return '<button type="button" class="v7-si" data-side="' + s.id + '"' + (s.id === "home" ? ' aria-current="page"' : "") + '><span class="v7-si-ic" aria-hidden="true">' + s.ic + '</span><span>' + esc(s.n) + '</span></button>'; }).join("");
  app.insertBefore(side, app.firstChild);
  side.addEventListener("click", function (e) { var b = e.target.closest("[data-side]"); if (b) v7SideGo(b.getAttribute("data-side")); });
  /* top bar: clock, bell, profile */
  var tr = top && top.querySelector(".top-r"), mb = $("#menuBtn");
  if (tr && mb) {
    var w = document.createElement("span"); w.className = "v7-tr";
    w.innerHTML = '<button type="button" class="v7-bell" id="v7Bell" aria-label="Inbox"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"/></svg><span class="v7-badge" hidden></span></button>' +
      '<button type="button" class="v7-prof" id="v7Prof" aria-label="Profile and settings"><span aria-hidden="true">' + esc(((S && S.name) || "Z").trim().charAt(0).toUpperCase() || "Z") + '</span></button>' +
      '<span class="v7-clock" id="v7Clock" aria-hidden="true"></span>';
    tr.insertBefore(w, mb);
    $("#v7Bell").addEventListener("click", v7Inbox);
    $("#v7Prof").addEventListener("click", function () { openSettings(); });
  }
  var sq = $("#srchQ"); if (sq) { sq.placeholder = "Search or ask ZAP AI…"; sq.setAttribute("aria-label", "Search or ask ZAP AI"); }
  /* new cards */
  var anchor = $("#dashEditRow") || $("#settingsMount");
  function card(id, cls, label, acc, inner) { var s = document.createElement("section"); s.className = "card br v5c " + cls; s.id = id; s.setAttribute("aria-label", label); s.style.setProperty("--acc", acc); s.innerHTML = inner; pg.insertBefore(s, anchor); return s; }
  var cz = card("cardZap", "v7-zap", "ZAP AI", "#b26bff",
    '<div class="v5h"><b>ZAP AI</b><small class="v7-mode" id="v7ZapMode"></small></div>' +
    '<div class="v7-orb" aria-hidden="true"><span>Z</span></div><p class="v7-q">How can I help you today?</p>' +
    '<div class="v7-chips"><button type="button" class="chip" data-zq="help me plan my day">Plan my day</button><button type="button" class="chip" data-zq="what\'s the weather today">Weather today</button><button type="button" class="chip" data-zq="what can you do">What can you do?</button></div>' +
    '<button type="button" class="btn v7-ask" id="v7Ask">Ask ZAP AI →</button>');
  cz.addEventListener("click", function (e) {
    var q = e.target.closest("[data-zq]");
    if (q) { var cmd = q.getAttribute("data-zq"); openZapAssistant(); setTimeout(function () { try { zapHandle(cmd); } catch (e2) {} }, 200); return; }
    if (e.target.closest("#v7Ask")) openZapAssistant();
  });
  var cs = card("cardShop", "v7-shop", "Shop smart", "#ff4fd8",
    '<div class="v5h"><b>SHOP SMART</b></div><div class="v7-shop-l" id="v7ShopList"></div>' +
    '<div class="v6-row"><button type="button" class="chip accent" id="v7ShopCmp">⇄ Compare prices</button><button type="button" class="chip" id="v7ShopOpen">Open Shop →</button></div>' +
    '<p class="note">Prices are the ones you saved. Store links open the store’s own search.</p>');
  cs.addEventListener("click", function (e) {
    var it = e.target.closest("[data-shop-q]");
    if (it) { zaRun("dest.shop", { q: it.getAttribute("data-shop-q") }, { quiet: true }); return; }
    if (e.target.closest("#v7ShopCmp")) { if (v7Car()) return; v6Compare(); return; }
    if (e.target.closest("#v7ShopOpen")) zaRun("dest.shop", {}, { quiet: true });
  });
  var qa = card("cardQA", "v7-qa", "Quick actions", "#2ee6ff",
    '<div class="v5h"><b>QUICK ACTIONS</b></div><div class="v7-qa-g">' +
    [["nav.home", "⌂", "Home"], ["nav.work", "▣", "Work"], ["focus.start", "◔", "Focus"], ["cal.event", "▦", "Event"], ["reminder.add", "⏰", "Remind"], ["more", "⋯", "More"]]
      .map(function (a) { return '<button type="button" class="v7-qa-b" data-za="' + a[0] + '"><span aria-hidden="true">' + a[1] + '</span>' + a[2] + '</button>'; }).join("") + '</div>');
  qa.addEventListener("click", function (e) {
    var b = e.target.closest("[data-za]"); if (!b) return; var id = b.getAttribute("data-za");
    if (id === "more") { try { window.ZAPOS.openQuickActions(); } catch (e2) {} return; }
    zaRun(id);
  });
  /* phone bottom bar + next-action strip */
  var bot = document.createElement("nav"); bot.id = "v7Bot"; bot.className = "v7-bot"; bot.setAttribute("aria-label", "Bottom");
  bot.innerHTML = '<button type="button" class="v7-next" id="v7Next"><span class="v7-next-ic" aria-hidden="true">✦</span><span class="v7-next-tx"><small>ZAP AI · YOUR NEXT ACTION</small><b id="v7NextT">Ask anything</b></span><span class="v7-next-mic" aria-hidden="true">🎤</span></button>' +
    '<div class="v7-bot-r"><button type="button" class="v7-bb" data-bot="home"><span aria-hidden="true">⌂</span>Home</button><button type="button" class="v7-bb" data-bot="search"><span aria-hidden="true">⌕</span>Search</button><button type="button" class="v7-bb" data-bot="profile"><span aria-hidden="true">◉</span>Profile</button></div>';
  app.appendChild(bot);
  bot.addEventListener("click", function (e) {
    if (e.target.closest("#v7Next")) { openZapAssistant(); return; }
    var b = e.target.closest("[data-bot]"); if (!b) return; var k = b.getAttribute("data-bot");
    if (k === "home") v6GoHome();
    else if (k === "search") { try { closeSheet(); } catch (e2) {} window.scrollTo(0, 0); var q = $("#srchQ"); if (q) setTimeout(function () { q.focus(); }, 60); }
    else openSettings();
  });
  /* TV Discover */
  var tv = document.createElement("section"); tv.id = "v7Tv"; tv.className = "v7-tv"; tv.hidden = true; tv.setAttribute("aria-label", "Discover");
  tv.innerHTML = '<nav class="v7-tv-side" aria-label="TV">' + [["home", "Home"], ["movies", "Movies"], ["shows", "Shows"], ["music", "Music"], ["shop", "Shop"], ["apps", "Apps"], ["settings", "Settings"]].map(function (x) { return '<button type="button" class="v7-si" data-tv="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</nav>' +
    '<div class="v7-tv-main"><div class="v7-tv-hero"><h2>Discover more with ZAPWISE</h2><p>Your watchlist, your services and ZAP AI on the big screen.</p><button type="button" class="btn" data-tv="explore">Explore →</button></div>' +
    '<div class="v7-tv-ask"><b>ZAP AI</b><p>Find something to watch?</p><button type="button" class="chip accent" data-tv="ask">Ask now →</button></div>' +
    '<div class="v7-tv-row"><h3>YOUR WATCHLIST</h3><div class="v7-tv-cards" id="v7TvList"></div></div>' +
    '<div class="v7-tv-row"><h3>OPEN A SERVICE</h3><div class="v7-tv-cards">' + V7_TV_STREAM.map(function (s, i) { return '<button type="button" class="v7-tv-c" data-tvs="' + i + '"><b>' + esc(s.n) + '</b><small>Opens ' + esc(s.n) + ' ↗</small></button>'; }).join("") + '</div></div>' +
    '<button type="button" class="chip" data-tv="exit">Exit TV view</button></div>';
  pg.insertBefore(tv, pg.firstChild);
  tv.addEventListener("click", function (e) {
    var s = e.target.closest("[data-tvs]"); if (s) { var o = V7_TV_STREAM[+s.getAttribute("data-tvs")]; zaRun("site.open", { url: o.u, name: o.n }); return; }
    var w = e.target.closest("[data-tvw]"); if (w) { zaRun("dest.watch", { q: w.getAttribute("data-tvw") }, { quiet: true }); return; }
    var b = e.target.closest("[data-tv]"); if (!b) return; var k = b.getAttribute("data-tv");
    if (k === "home") v6GoHome(); else if (k === "movies" || k === "shows" || k === "explore") zaRun("dest.watch", {}, { quiet: true });
    else if (k === "music") zaRun("dest.listen", {}, { quiet: true }); else if (k === "shop") zaRun("dest.shop", {}, { quiet: true });
    else if (k === "apps") zaRun("dest.apps", {}, { quiet: true }); else if (k === "settings") openSettings();
    else if (k === "ask") { openZapAssistant(); } else if (k === "exit") v7SetTv(false);
  });
  /* car view */
  var car = document.createElement("section"); car.id = "v7Car"; car.className = "v7-car"; car.hidden = true; car.setAttribute("aria-label", "Car view");
  car.innerHTML = '<div class="v7-car-h"><b>CAR VIEW</b><small>Navigation · voice · audio. Shopping is off while driving.</small></div><div class="v7-car-g">' +
    '<button type="button" class="v7-car-b" data-car="home"><span aria-hidden="true">⌂</span>Home</button>' +
    '<button type="button" class="v7-car-b" data-car="work"><span aria-hidden="true">▣</span>Work</button>' +
    '<button type="button" class="v7-car-b" data-car="voice"><span aria-hidden="true">🎤</span>Speak</button>' +
    '<button type="button" class="v7-car-b" data-car="music"><span aria-hidden="true">♫</span>Music</button></div>' +
    '<button type="button" class="chip" data-car="exit">Exit car view</button>';
  pg.insertBefore(car, pg.firstChild);
  car.addEventListener("click", function (e) {
    var b = e.target.closest("[data-car]"); if (!b) return; var k = b.getAttribute("data-car");
    if (k === "home") zaRun("nav.home"); else if (k === "work") zaRun("nav.work");
    else if (k === "voice") { openZapAssistant(); setTimeout(function () { try { startZapListen(); } catch (e2) {} }, 250); }
    else if (k === "music") zaRun("media.open"); else v7SetCar(false);
  });
  /* modes from URL / saved */
  var qs = location.search, carOn = /[?&]car=1/.test(qs) ? 1 : /[?&]car=0/.test(qs) ? 0 : Store.getLocal("v7car", 0);
  var tvUA = /SmartTV|SMART-TV|Tizen|Web0S|webOS.TV|AFT[A-Z]|CrKey|Android TV|BRAVIA|GoogleTV/i.test(navigator.userAgent);
  var tvOn = /[?&]tv=1/.test(qs) ? 1 : /[?&]tv=0/.test(qs) ? 0 : (Store.getLocal("v7tv", null) == null ? (tvUA ? 1 : 0) : Store.getLocal("v7tv", 0));
  v7SetTv(tvOn); v7SetCar(carOn);
  function paintW() { var l = $("#v7TvList"); if (!l) return; var W = v6Lists().watch.filter(function (x) { return !x.done; }).slice(0, 6); l.innerHTML = W.length ? W.map(function (x) { return '<button type="button" class="v7-tv-c" data-tvw="' + esc(x.t) + '"><b>' + esc(x.t) + '</b><small>Find where to watch ↗</small></button>'; }).join("") : '<p class="dim v6-empty">Nothing on your watchlist yet — add titles in Watch.</p>'; }
  function paintAll() { v7PaintClock(); v7PaintBell(); v7PaintShop(); v7PaintNext(); v7PaintZapMode(); paintW(); }
  paintAll(); setInterval(function () { if (!document.hidden) { v7PaintClock(); v7PaintNext(); } }, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) paintAll(); });
  /* repaint after sheets close (lists, reminders, smart mode may have changed) */
  var sh = $("#sheet"); if (sh && window.MutationObserver) new MutationObserver(function () { if (sh.hidden) paintAll(); }).observe(sh, { attributes: true, attributeFilter: ["hidden"] });
  var zs = $("#zapSheet"); if (zs && window.MutationObserver) new MutationObserver(function () { if (zs.hidden) paintAll(); }).observe(zs, { attributes: true, attributeFilter: ["hidden"] });
  /* sidebar current item follows the open destination sheet */
  window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.run = zaRun; window.ZAPOS.v7 = { setCar: v7SetCar, setTv: v7SetTv, inbox: v7Inbox, paint: paintAll };
  try { applyDash(); } catch (e3) {}
  var lastDesk = v7Desk(); addEventListener("resize", function () { var d = v7Desk(); if (d !== lastDesk) { lastDesk = d; if (!Store.getLocal("dash", null)) applyDash(); } });
})();


/* ========== v4.25 Spending (Plaid Transactions) + linked investments (Plaid Investments) ==========
   Real data only, from the zapwise-bank Worker (device token). Honest states: loading, ready, empty,
   needs your OK in Plaid, still gathering, not available at this bank, error + retry. Eye hides amounts. */
var _bankProd = null;   /* { tx: "on"|"needs"|"unsupported"|"unknown", inv: …, at } */
var _plaidHoldN = 0;
function v25PermRows() {
  var P = _bankProd;
  if (!P) return [["Balances", "Allowed", "ok"], ["Spending (transactions)", "Checking…", "idle"], ["Investments", "Checking…", "idle"]];
  function lab(v, what) {
    if (v === "on") return ["Allowed", "ok"];
    if (v === "needs") return ["Needs your OK in Plaid", "bad"];
    if (v === "unsupported") return ["Not available at " + (P.inst || "this bank"), "idle"];
    return ["Couldn’t check", "idle"];
  }
  var t = lab(P.tx), i = lab(P.inv);
  return [["Balances", "Allowed", "ok"], ["Spending (transactions)", t[0], t[1]], ["Investments", i[0], i[1]]];
}
(function v25Money() {
  var spend = $("#hBkSpend"), sBody = $("#hBkSpendBody"), inv = $("#invPlaid"), iBody = $("#invPlaidBody");
  var TX = { days: Store.getLocal("v25days", 30) || 30, data: null, state: "idle", at: 0, busy: false };
  var HD = { data: null, state: "idle", at: 0, busy: false };
  if ([30, 60, 90].indexOf(+TX.days) < 0) TX.days = 30;
  function priv() { try { return bankPrivacyOn(); } catch (e) { return false; } }
  function money(n, cur) {
    if (n == null || isNaN(+n)) return "—";
    if (priv()) return "••••";
    try { return (+n).toLocaleString("en-US", { style: "currency", currency: cur || "USD" }); } catch (e) { return bankMoney(+n); }
  }
  function l4(x) { return x ? (priv() ? " · ••••" : " · ••" + esc(x)) : ""; }
  function dstr(d) { if (!d) return ""; try { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return d; } }
  function ago(t) { try { return v6Ago(t); } catch (e) { return bankClockStr(t); } }
  function stateFrom(res) {
    var b = (res && res.body) || {};
    if (res.http === 0) return b.state === "no_device" ? "no_device" : "offline";
    if (res.http === 401) return "no_device";
    if (res.http === 429) return "rate";
    return b.state || (res.http >= 400 ? "error" : "ok");
  }
  function msgBox(text, btns) {
    return '<p class="bk-spend-msg">' + esc(text) + '</p>' + (btns ? '<div class="bk-spend-acts">' + btns + '</div>' : "");
  }
  var BTN_ALLOW = '<button type="button" class="v5-btn bk-allow" data-v25="allow">Allow spending in Plaid</button>';
  var BTN_RETRY = '<button type="button" class="chip" data-v25="retry">↻ Retry</button>';
  /* ---- Spending ---- */
  function paintSpend() {
    if (!spend || !sBody) return;
    var ready = bankDeviceReady();
    spend.hidden = !ready;
    if (!ready) return;
    [].forEach.call(spend.querySelectorAll(".bk-d"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-days") === +TX.days)); });
    var st = TX.state, d = TX.data;
    if (st === "idle" || (st === "loading" && !d)) { sBody.innerHTML = '<p class="bk-spend-msg dim">Loading spending from Plaid…</p>'; return; }
    if (st === "needs_consent") { sBody.innerHTML = msgBox("Spending needs one more OK. Plaid will ask you to share transactions from your bank (read-only, free).", BTN_ALLOW); return; }
    if (st === "needs_update") { sBody.innerHTML = msgBox("Your bank asked you to sign in again. Reconnect in Plaid to keep spending up to date.", BTN_ALLOW.replace("Allow spending in Plaid", "Reconnect in Plaid")); return; }
    if (st === "not_ready") { sBody.innerHTML = msgBox("Plaid is still gathering your transactions. This can take a few minutes after you allow it.", BTN_RETRY); return; }
    if (st === "not_supported") { sBody.innerHTML = msgBox("Your bank doesn’t share transactions through Plaid.", ""); return; }
    if (st === "no_device") { sBody.innerHTML = msgBox("This device isn’t paired with your bank link.", ""); return; }
    if (st !== "ok" || !d) {
      sBody.innerHTML = msgBox(st === "offline" ? "You’re offline — spending will load when you’re back online." : (st === "rate" ? "Too many refreshes — try again in a minute." : "Couldn’t load spending from Plaid."), BTN_RETRY);
      return;
    }
    var tx = d.transactions || [], sum = d.summary || [];
    if (!tx.length) { sBody.innerHTML = msgBox("No transactions in the last " + TX.days + " days.", BTN_RETRY); return; }
    var max = sum.length ? sum[0].total : 0;
    var cats = sum.slice(0, 4).map(function (c) {
      var w = max > 0 ? Math.max(4, Math.round(c.total / max * 100)) : 0;
      return '<li><span class="bk-cat-n">' + esc(c.category) + '</span><span class="bk-cat-bar" aria-hidden="true"><i style="width:' + w + '%"></i></span><b class="bk-amt">' + esc(money(c.total)) + '</b></li>';
    }).join("");
    var rows = tx.slice(0, 5).map(rowHtml).join("");
    sBody.innerHTML =
      '<div class="bk-spend-tot"><span>Spent · ' + TX.days + ' days</span><b class="bk-amt">' + esc(money(d.spent)) + '</b>' + (d.income ? '<small>In ' + esc(money(d.income)) + '</small>' : "") + '</div>' +
      (cats ? '<ul class="bk-cats" aria-label="Top categories">' + cats + '</ul>' : '<p class="bk-spend-msg dim">No spending in this period — only money in.</p>') +
      '<div class="bk-tx-h"><b>RECENT</b></div><ul class="bk-tx" aria-label="Recent transactions">' + rows + '</ul>' +
      '<div class="bk-spend-acts"><button type="button" class="chip" data-v25="all">All ' + (d.count || tx.length) + ' transactions</button>' + BTN_RETRY.replace("↻ Retry", "↻ Refresh") + '</div>' +
      '<p class="bk-asof-line">Plaid · updated ' + esc(ago(d.asOf)) + ' · read-only</p>';
  }
  function rowHtml(x) {
    var out = x.amount > 0;
    return '<li class="' + (out ? "out" : "in") + '"><span class="bk-tx-m"><b>' + esc(x.merchant) + (x.pending ? ' <em>pending</em>' : "") + '</b><small>' + esc(x.category) + ' · ' + esc(dstr(x.date)) + l4(x.last4) + '</small></span><b class="bk-amt">' + (out ? "−" : "+") + esc(money(Math.abs(x.amount), x.currency)) + '</b></li>';
  }
  function loadSpend(refresh) {
    if (!bankDeviceReady() || !window.ZAP_BANK_PLAID || !ZAP_BANK_PLAID.fetchTransactions) { paintSpend(); return Promise.resolve(); }
    if (TX.busy) return Promise.resolve();
    TX.busy = true; if (!TX.data) TX.state = "loading"; paintSpend();
    return ZAP_BANK_PLAID.fetchTransactions(TX.days, !!refresh).then(function (res) {
      var st = stateFrom(res);
      TX.state = st; TX.at = Date.now();
      if (st === "ok") TX.data = res.body; else if (st !== "offline" && st !== "rate") TX.data = null;
      if (st === "ok" && _bankProd) _bankProd.tx = "on";
      if (st === "needs_consent" && _bankProd) _bankProd.tx = "needs";
    }).catch(function () { TX.state = "error"; }).then(function () { TX.busy = false; paintSpend(); });
  }
  function allSheet() {
    var d = TX.data; if (!d) return;
    var by = {};
    (d.transactions || []).forEach(function (x) { (by[x.date] = by[x.date] || []).push(x); });
    var html = '<div class="v6-dest bk-all"><p class="v6-lead">Last ' + TX.days + ' days from your linked bank via Plaid. Read-only. Showing ' + (d.transactions || []).length + ' of ' + (d.count || 0) + '.</p>' +
      Object.keys(by).sort().reverse().map(function (k) { return '<h3>' + esc(dstr(k)) + '</h3><ul class="bk-tx">' + by[k].map(rowHtml).join("") + '</ul>'; }).join("") +
      (d.summary && d.summary.length ? '<h3>BY CATEGORY</h3><ul class="bk-cats">' + d.summary.map(function (c) { return '<li><span class="bk-cat-n">' + esc(c.category) + ' (' + c.count + ')</span><b class="bk-amt">' + esc(money(c.total)) + '</b></li>'; }).join("") + '</ul>' : "") +
      '<button type="button" class="v6-home-btn" data-v6-home="1">⌂ Back to Home</button></div>';
    sheet("SPENDING", html, function (b) { b.addEventListener("click", function (e) { if (e.target.closest("[data-v6-home]")) { try { v6GoHome(); } catch (e2) { closeSheet(); } } }); });
  }
  /* ---- Linked investments ---- */
  function paintCounts() {
    var el = $("#v5InvCounts"); if (!el) return;
    var t = el.textContent.replace(/ \| Linked: \d+$/, "") + (_plaidHoldN ? " | Linked: " + _plaidHoldN : "");
    if (el.textContent !== t) el.textContent = t;
  }
  function paintInv() {
    if (!inv || !iBody) return;
    var ready = bankDeviceReady();
    inv.hidden = !ready;
    if (!ready) { _plaidHoldN = 0; paintCounts(); return; }
    var st = HD.state, d = HD.data;
    var brk = '<button type="button" class="chip" data-v25="broker">Link a brokerage ↗</button>';
    if (st === "idle" || (st === "loading" && !d)) { iBody.innerHTML = '<p class="bk-spend-msg dim">Checking Plaid for investment accounts…</p>'; return; }
    if (st === "not_supported" || st === "empty" || (st === "needs_consent" && _bankProd && _bankProd.inv === "unsupported")) {
      _plaidHoldN = 0; paintCounts();
      iBody.innerHTML = msgBox("No investment accounts in your Plaid link" + (_bankProd && _bankProd.inst ? " (" + _bankProd.inst + " doesn’t share them)" : "") + ". Link a brokerage to see real holdings here — free, read-only, can’t trade.", brk);
      return;
    }
    if (st === "needs_consent") { iBody.innerHTML = msgBox("Investments need your OK in Plaid.", brk); return; }
    if (st === "no_device") { iBody.innerHTML = msgBox("This device isn’t paired with your bank link.", ""); return; }
    if (st !== "ok" || !d) { iBody.innerHTML = msgBox(st === "offline" ? "You’re offline." : "Couldn’t load holdings from Plaid.", BTN_RETRY.replace('data-v25="retry"', 'data-v25="iretry"')); return; }
    var H = d.holdings || [];
    _plaidHoldN = H.length; paintCounts();
    iBody.innerHTML = '<div class="inv-plaid-tot"><span>Value</span><b class="bk-amt">' + esc(money(d.total)) + '</b><small>' + (d.accounts || []).length + ' account' + ((d.accounts || []).length === 1 ? "" : "s") + '</small></div>' +
      (H.length ? '<ul class="bk-tx inv-h" aria-label="Holdings">' + H.slice(0, 4).map(function (h) {
        return '<li><span class="bk-tx-m"><b>' + esc(h.ticker || h.name) + '</b><small>' + esc(h.ticker ? h.name : (h.type || "")) + (h.quantity != null ? " · " + (priv() ? "••" : esc(String(+(+h.quantity).toFixed(4)))) + " sh" : "") + l4(h.last4) + '</small></span><b class="bk-amt">' + esc(money(h.value, h.currency)) + '</b></li>';
      }).join("") + '</ul>' : '<p class="bk-spend-msg dim">No holdings in these accounts.</p>') +
      '<p class="bk-asof-line">Plaid · updated ' + esc(ago(d.asOf)) + ' · separate from Banking</p>';
  }
  function loadInv(refresh) {
    if (!bankDeviceReady() || !window.ZAP_BANK_PLAID || !ZAP_BANK_PLAID.fetchHoldings) { paintInv(); return Promise.resolve(); }
    if (HD.busy) return Promise.resolve();
    HD.busy = true; if (!HD.data) HD.state = "loading"; paintInv();
    return ZAP_BANK_PLAID.fetchHoldings(!!refresh).then(function (res) {
      var st = stateFrom(res); HD.state = st; HD.at = Date.now();
      if (st === "ok") HD.data = res.body; else if (st !== "offline" && st !== "rate") HD.data = null;
    }).catch(function () { HD.state = "error"; }).then(function () { HD.busy = false; paintInv(); });
  }
  /* ---- Permissions (for ZAP Connect) ---- */
  function loadProducts() {
    if (!bankDeviceReady() || !window.ZAP_BANK_PLAID || !ZAP_BANK_PLAID.itemProducts) return Promise.resolve();
    return ZAP_BANK_PLAID.itemProducts().then(function (res) {
      var b = res.body || {}, it = (b.items || [])[0];
      if (res.http !== 200 || !it) { _bankProd = { tx: "unknown", inv: "unknown", at: Date.now() }; return; }
      function v(p) {
        if ((it.not_supported || []).indexOf(p) >= 0) return "unsupported";
        if ((it.needs_consent || []).indexOf(p) >= 0) return "needs";
        return "on";
      }
      _bankProd = { tx: v("transactions"), inv: v("investments"), inst: it.institution || "", at: Date.now() };
      /* several Items: investments count as on if any linked brokerage exists */
      if ((b.items || []).some(function (x) { return (x.products || []).concat(x.consented_products || [], x.billed_products || []).indexOf("investments") >= 0; })) _bankProd.inv = "on";
    }).catch(function () {}).then(function () {
      paintInv();
      if (document.querySelector(".v6-connect")) { try { openConnect(); } catch (e) {} }
    });
  }
  /* ---- events ---- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-v25], .bk-d");
    if (!t || !(spend && spend.contains(t)) && !(inv && inv.contains(t)) && !t.closest(".bk-all")) return;
    e.preventDefault(); e.stopPropagation();
    if (t.classList.contains("bk-d")) { TX.days = +t.getAttribute("data-days") || 30; Store.setLocal("v25days", TX.days); TX.data = null; TX.state = "loading"; loadSpend(false); return; }
    var k = t.getAttribute("data-v25");
    if (k === "allow") location.href = (ZAP_BANK_PLAID && ZAP_BANK_PLAID.updateLinkPage) || "/os/link/?update=1";
    else if (k === "broker") location.href = (ZAP_BANK_PLAID && ZAP_BANK_PLAID.brokerageLinkPage) || "/os/link/?brokerage=1";
    else if (k === "retry") loadSpend(true);
    else if (k === "iretry") loadInv(true);
    else if (k === "all") allSheet();
  }, true);
  var eye = $("#hBkEye"); if (eye) eye.addEventListener("click", function () { setTimeout(function () { paintSpend(); paintInv(); }, 0); });
  /* returned from Plaid update mode */
  var justUpdated = /[?&]updated=1(&|$)/.test(location.search);
  if (justUpdated) {
    try { var cu = new URL(location.href); cu.searchParams.delete("updated"); history.replaceState(null, "", cu.pathname + (cu.search || "") + cu.hash); } catch (eU) {}
    setTimeout(function () { toast("Plaid updated — loading spending"); try { var hb = $("#hBk"); if (hb) hb.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (eS) {} }, 300);
  }
  var justLinked = /[?&](linked=1|bank=linked)(&|$)/.test(location.search);
  function boot() {
    paintSpend(); paintInv();
    if (!bankDeviceReady()) return;
    loadProducts();
    loadSpend(justUpdated || justLinked);
    loadInv(justUpdated || justLinked);
  }
  boot();
  setInterval(function () { if (document.visibilityState === "visible" && bankDeviceReady()) { loadSpend(false); loadInv(false); } }, 15 * 60 * 1000);
  window.ZAPOS = window.ZAPOS || {}; window.ZAPOS.money = { spend: TX, hold: HD, reload: boot, products: function () { return _bankProd; } };
})();

})(); /* end ZAPWISE//OS app scope */
