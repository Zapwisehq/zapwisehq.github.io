/* ZAPWISE//OS web app v4.1.0 (Nov 5, 2026). Tabbed cyberpunk HUD + calm Three.js city backdrop; keeps MapLibre/Lite/Smart/honest traffic. Static, no API keys. */
(function () {
"use strict";
var VERSION = "4.1.0";
var APP_VERSION = VERSION;

// ========== v3.12 3D FX (lazy) ==========
var _fx3dLoading = null;
function fx3dWanted() {
  try {
    if (Store.getLocal("liteMode", false)) return false;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch (e) {}
  return true;
}
function loadFx3d() {
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


// ========== v4.1 HUD tabs (one screen per section, nothing hidden) ==========
var HUD_TABS = ["home","apps","map","markets","weather","phone","music","settings"];
var HUD_TAB = "home";
function hudScreen(id) { return document.getElementById("screen-" + id); }
function setHudTab(id, opts) {
  opts = opts || {};
  if (HUD_TABS.indexOf(id) < 0) id = "home";
  HUD_TAB = id;
  try { if (typeof closeZapAssistant === "function") closeZapAssistant(); } catch (e0) {}
  HUD_TABS.forEach(function (k) {
    var el = hudScreen(k);
    if (!el) return;
    var on = k === id;
    el.classList.toggle("on", on);
    if (on) el.removeAttribute("hidden"); else el.setAttribute("hidden", "");
  });
  var tabs = document.getElementById("hudTabs");
  if (tabs) {
    tabs.querySelectorAll("[data-tab]").forEach(function (b) {
      var on = b.getAttribute("data-tab") === id;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
  }
  try { if (window.ZAPCINE && window.ZAPCINE.setTab) window.ZAPCINE.setTab(HUD_TABS.indexOf(id)); } catch (e) {}
  try { Store.setUI({ view: "hud:" + id }); } catch (e1) { try { Store.setUI({ view: "hud:" + id }); } catch (e2) {} }
  if (id === "phone") { try { mountPhoneScreen(); } catch (e) {} }
  if (id === "settings") { try { mountSettingsScreen(); } catch (e) {} }
  if (id === "map") { try { setTimeout(function () { renderMap(true); window.dispatchEvent(new Event("resize")); }, 60); } catch (e) {} }
  if (id === "weather") { try { if (typeof renderConditions === "function") renderConditions(); } catch (e) {} }
  if (id === "markets") { try { if (typeof renderMarkets === "function") renderMarkets(); } catch (e) {} }
  if (!opts.silent) {
    try { var main = document.querySelector("main"); if (main) main.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {}
  }
}
function bindHudTabs() {
  var tabs = document.getElementById("hudTabs");
  if (!tabs || tabs._bound) return;
  tabs._bound = true;
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (!b) return;
    setHudTab(b.getAttribute("data-tab"));
  });
  var startX = 0, startY = 0, tracking = false;
  var root = document.getElementById("v-home") || document.querySelector("main");
  if (!root) return;
  root.addEventListener("touchstart", function (e) {
    if (!e.touches || !e.touches[0]) return;
    if (e.target.closest("input,textarea,select,.map-v,.dl-pad,.apps,.sheet,.zap-sheet")) { tracking = false; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (!tracking) return; tracking = false;
    var touch = e.changedTouches && e.changedTouches[0]; if (!touch) return;
    var dx = touch.clientX - startX, dy = touch.clientY - startY;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    var i = HUD_TABS.indexOf(HUD_TAB);
    if (dx < 0 && i < HUD_TABS.length - 1) setHudTab(HUD_TABS[i + 1]);
    else if (dx > 0 && i > 0) setHudTab(HUD_TABS[i - 1]);
  }, { passive: true });
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go-tab]");
    if (!go) return;
    e.preventDefault();
    setHudTab(go.getAttribute("data-go-tab"));
  });
}
function ensurePanelsVisible() {
  ["xpWx","xpMk"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.hidden = false; el.removeAttribute("hidden"); }
  });
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
    var tilt = true; try { var tv = Store.getLocal("tiltCards", null); tilt = tv == null ? true : !!tv; } catch (e) {}
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
  var DEVICE_KEYS = ["gps", "place", "wx", "mk", "focus", "seenHelp", "gpsLoc", "themeCss", "mediaKey", "skipBoot", "bootDay", "uiSounds", "recentPins", "wxDay", "wxMode", "portHist", "acctMigrated", "liteMode", "tiltCards", "motionTilt"]; // this device only
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
  { id: "zapwise", name: "ZAPWISE", sub: "Default · void, cream, amber, cyan", v: { void: "#070814", panel: "#0d1226", panel2: "#111833", cream: "#f4efe4", amber: "#f0a202", cyan: "#5ce1e6", magenta: "#ff4fd8", dim: "#6b7896", on: "#070814" } },
  { id: "neon", name: "NEON PINK", sub: "Hot pink and violet on deep plum", v: { void: "#10040f", panel: "#1d0a1f", panel2: "#28102b", cream: "#fff5fb", amber: "#ffd166", cyan: "#7ef0ff", magenta: "#ff4fd8", dim: "#c9a8c8", on: "#10040f" } },
  { id: "terminal", name: "TERMINAL GREEN", sub: "Green phosphor on black", v: { void: "#020a05", panel: "#07170d", panel2: "#0b2013", cream: "#d8ffe2", amber: "#c6ff3d", cyan: "#3dff7e", magenta: "#7affc8", dim: "#57805f", on: "#020a05" } },
  { id: "arctic", name: "ARCTIC BLUE", sub: "Ice blue on midnight navy", v: { void: "#03101d", panel: "#081c30", panel2: "#0c253d", cream: "#eaf6ff", amber: "#a8e1ff", cyan: "#47a8ff", magenta: "#b9a6ff", dim: "#6d88a3", on: "#03101d" } },
  { id: "sunset", name: "SUNSET ORANGE", sub: "Warm orange and coral on dusk", v: { void: "#140806", panel: "#22100b", panel2: "#2d160f", cream: "#fff0e3", amber: "#ffc04d", cyan: "#ff7a3d", magenta: "#ff4f7b", dim: "#94705f", on: "#140806" } },
  { id: "mono", name: "MONO", sub: "Black, white and grey", v: { void: "#0a0a0b", panel: "#161618", panel2: "#1f1f22", cream: "#f2f2f2", amber: "#ffffff", cyan: "#cfcfd4", magenta: "#9a9aa2", dim: "#76767e", on: "#0a0a0b" } },
  { id: "light", name: "LIGHT", sub: "Dark text on a bright page", light: true, v: { void: "#f1efe9", panel: "#ffffff", panel2: "#e7e4dc", cream: "#16181e", amber: "#b45a00", cyan: "#0a6f8c", magenta: "#b0186e", dim: "#666c79", on: "#ffffff" } },
  { id: "neon-night", name: "NEON NIGHT", sub: "Void · cyan · magenta", v: { void: "#05060e", panel: "#0b1024", panel2: "#121a36", cream: "#e8f7ff", amber: "#5ce1e6", cyan: "#5ce1e6", magenta: "#ff4fd8", dim: "#6a7aa0", on: "#05060e" } },
  { id: "amber-ops", name: "AMBER OPS", sub: "Void · amber tactical", v: { void: "#0a0804", panel: "#16110a", panel2: "#1f180e", cream: "#ffe9c4", amber: "#f0a202", cyan: "#ffc04d", magenta: "#ff7a3d", dim: "#8a7348", on: "#0a0804" } },
  { id: "ghost-white", name: "GHOST WHITE", sub: "Light void · soft ink", light: true, v: { void: "#f7f8fc", panel: "#ffffff", panel2: "#eceef6", cream: "#12141c", amber: "#5b4cff", cyan: "#0a8c9e", magenta: "#c2186e", dim: "#6b7280", on: "#ffffff" } }
];
function hexRgb(h) { var n = parseInt(h.slice(1), 16); return (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255); }
var THEME = THEMES[0];
function applyTheme(id) {
  var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0], st = document.documentElement.style;
  Object.keys(t.v).forEach(function (k) { st.setProperty("--" + k, t.v[k]); st.setProperty("--" + k + "-rgb", hexRgb(t.v[k])); });
  // v3.1 layout tokens
  st.setProperty("--bg", t.v.void); st.setProperty("--ink", t.v.cream);
  // Readable secondary text — neon/purple especially needs stronger muted/dim
  var muteA = (t.id === "neon" || t.id === "neon-night") ? .78 : .62, dimA = (t.id === "neon" || t.id === "neon-night") ? .55 : .42;
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
      document.body.classList.toggle("theme-neon-night", t.id === "neon-night");
      document.body.classList.toggle("theme-amber-ops", t.id === "amber-ops");
      document.body.classList.toggle("theme-ghost", t.id === "ghost-white");
      document.body.classList.add("pack-cyber");
    }
  } catch (e) {}
}
applyTheme(Store.get("theme", "zapwise"));
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function t12(d) { var h = d.getHours(); return (h % 12 || 12) + ":" + pad2(d.getMinutes()) + (h < 12 ? "A" : "P"); }
function isoT12(iso) { var h = +iso.slice(11, 13), m = iso.slice(14, 16); return (h % 12 || 12) + ":" + m + (h < 12 ? "A" : "P"); }
function isoH(iso) { var h = +iso.slice(11, 13); return (h % 12 || 12) + (h < 12 ? "A" : "P"); }
function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.k); toast.k = setTimeout(function () { t.classList.remove("on"); }, 2600); }

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
  { id: "gemini", name: "Gemini", url: "googlegemini://", icon: "/os/icons/gemini.jpg", web: "https://gemini.google.com", glyph: "gem", bg: "linear-gradient(135deg,#4f7cff,#a25cff)", accent: "#8b9dff" }
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
function go(u) { var w = null; try { w = window.open(u, "_blank"); } catch (e) {} if (w) { try { w.opener = null; } catch (e) {} } else location.href = u; }
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
  if (!fb) { location.href = url; return; }
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
  try { location.href = url; } catch (e) { left = false; }
  openApp._fbTimer = setTimeout(function () {
    openApp._fbTimer = null;
    cleanup(); openApp._cleanup = null;
    if (openApp._tok !== token) return;
    // In-app browsers / soft launches: only fall back if still fully visible and never blurred.
    if (!left && document.visibilityState === "visible" && document.hasFocus && document.hasFocus()) {
      try { location.href = fb; } catch (e) {}
    }
  }, 1500);
}
function accentOf(a) {
  if (a.accent) return a.accent;
  var m = /#[0-9a-f]{6}/i.exec(a.bg || ""); if (!m) return "#f4efe4";
  var h = m[0], l = parseInt(h.slice(1, 3), 16) * .3 + parseInt(h.slice(3, 5), 16) * .59 + parseInt(h.slice(5, 7), 16) * .11;
  return l < 60 ? "#f4efe4" : h;
}
function renderApps() {
  var on = APPS.filter(function (a) { return a.on; });
  function mkTile(a) {
    var b = document.createElement("button");
    b.className = "tile"; b.type = "button"; b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "Open " + a.name); b.title = a.name;
    b.innerHTML = '<span class="ic">' + iconHTML(a) + '</span><span class="lb">' + esc(a.name) + '</span>';
    b.addEventListener("click", function () { openApp(a); });
    return b;
  }
  var box = $("#apps"); if (!box) return; box.innerHTML = "";
  on.forEach(function (a) { box.appendChild(mkTile(a)); });
  var ad = document.createElement("button");
  ad.className = "tile add"; ad.type = "button"; ad.id = "addApp"; ad.setAttribute("role", "listitem"); ad.setAttribute("aria-label", "Find and add an app");
  ad.innerHTML = '<span class="ic" aria-hidden="true">⌕</span><span class="lb">Find an app</span>';
  ad.addEventListener("click", function () { openAddApp({ focusSearch: true }); });
  box.appendChild(ad);
}

// ========== 6. clock, date, status, meters, focus ==========
var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function segs(el) { if (!el.children.length) el.innerHTML = new Array(17).join("<i></i>"); return el.children; }
function setSegs(el, pct, cls) { var c = segs(el), n = Math.round(Math.max(0, Math.min(1, pct)) * 16); for (var i = 0; i < 16; i++) c[i].className = i < n ? cls : ""; }
function tick() {
  var d = new Date(), h = d.getHours();
  var clk = $("#hClock");
  if (clk.firstChild && clk.firstChild.nodeType === 3) clk.firstChild.nodeValue = (h % 12 || 12) + ":" + pad2(d.getMinutes());
  else { var am = $("#hAmpm"); clk.textContent = ""; clk.appendChild(document.createTextNode((h % 12 || 12) + ":" + pad2(d.getMinutes()))); if (am) clk.appendChild(am); }
  $("#hAmpm").textContent = h < 12 ? "AM" : "PM";
  if (d.getSeconds() === 0 || !tick.done) { tick.done = true; minute(d); }
  renderFocus();
}
function minute(d) {
  var h = d.getHours();
  $("#hDate").textContent = DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate();
  var nm = (S.name || "").trim() || "operator";
  $("#greet").textContent = "Systems online, " + nm;
  try { updateSkyline(); } catch (e) {}
  var td = $("#tdDay"); if (td) td.textContent = pad2(d.getDate());
  $$(".ico .cal").forEach(function (c) { c.innerHTML = '<i>' + DOW[d.getDay()] + '</i><b>' + d.getDate() + '</b>'; });
  updateStamps();
  renderNowPlaying();
}
// FOCUS: a 25-minute sprint timer (the web can't read battery on iPhone, so this replaces the widget's PWR meter)
var FOC = Store.getLocal("focus", { st: "idle" });
function renderFocus() {
  var now = Date.now(), left = FOCUS_MS, line;
  if (FOC.st === "run") { left = FOC.end - now; if (left <= 0) { FOC = { st: "done" }; Store.setLocal("focus", FOC); left = 0; toast("Focus sprint done. Take 5."); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} } }
  else if (FOC.st === "pause") left = FOC.left;
  else if (FOC.st === "done") left = 0;
  var pct = FOC.st === "idle" ? 0 : (1 - left / FOCUS_MS), s = Math.ceil(left / 1000);
  var C = 2 * Math.PI * 52; // r=52
  var ring = $("#focRing");
  if (ring) {
    ring.style.strokeDasharray = String(C);
    ring.style.strokeDashoffset = String(C * (1 - pct));
    ring.style.stroke = FOC.st === "pause" ? "var(--amber)" : FOC.st === "done" ? "var(--ok)" : FOC.st === "run" ? "var(--cyan)" : "var(--amber)";
  }
  $("#mFocV").textContent = Math.floor(s / 60) + ":" + pad2(s % 60);
  line = FOC.st === "run" ? "FOCUSING" : FOC.st === "pause" ? "PAUSED" : FOC.st === "done" ? "DONE · TAP AGAIN" : "TAP TO START";
  if ($("#mFocL").textContent !== line) $("#mFocL").textContent = line;
  var card = $("#mFocus");
  if (card) { card.classList.toggle("running", FOC.st === "run"); card.classList.toggle("done", FOC.st === "done"); }
}
(function bindFocus() {
  var b = $("#mFocus"), hold = null, held = false;
  function down() { held = false; clearTimeout(hold); hold = setTimeout(function () { held = true; FOC = { st: "idle" }; Store.setLocal("focus", FOC); renderFocus(); toast("Focus timer reset"); }, 650); }
  function up() { clearTimeout(hold); }
  b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
  b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  b.addEventListener("click", function () {
    if (held) { held = false; return; }
    var now = Date.now();
    if (FOC.st === "run") FOC = { st: "pause", left: Math.max(0, FOC.end - now) };
    else if (FOC.st === "pause") FOC = { st: "run", end: now + FOC.left };
    else FOC = { st: "run", end: now + FOCUS_MS };
    Store.setLocal("focus", FOC); renderFocus();
  });
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
    chip.hidden = false;
    function paint() {
      var pct = Math.round((b.level || 0) * 100);
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
    el.innerHTML = on ? "<i aria-hidden=\"true\"></i>SYNCED" : "<i aria-hidden=\"true\"></i>OFFLINE";
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
  if (art) { art.src = m.icon || "/os/icons/music.jpg"; art.alt = m.name; }
  if (title) title.textContent = m.name;
  if (artist) artist.textContent = "Tap ▶ to open";
  if (live) live.textContent = "SWITCH ▾";
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
  var b = e.target.closest("[data-media-act]"); if (!b) return;
  e.preventDefault();
  var act = b.getAttribute("data-media-act");
  if (act === "play") openApp(currentMedia());
  else if (act === "pick") openMedia();
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
var lastT = performance.now();
function loop(now) {
  var dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (document.visibilityState === "visible") FXS.forEach(function (f) {
    if (!f.vis || !f.size()) return;
    if (f.kind === "none") { if (!f.drawn) { f.draw(now, 0); f.drawn = true; } return; }
    if (RM) { if (!f.drawn) { f.draw(now, 0); f.drawn = true; } return; }
    f.draw(now, dt);
  });
  requestAnimationFrame(loop);
}
var fxHud = new FX($("#fxHud")), fxMain = new FX($("#fxMain"));
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
    sky.lines.forEach(function (ln) {
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
    if (!RM) {
      c.fillStyle = "rgba(92,225,230,.75)"; c.font = "600 10px ui-sans-serif,system-ui,sans-serif";
      sky.labels.forEach(function (lb) { c.fillText(lb.name, lb.x, lb.y); });
    } else {
      c.fillStyle = "rgba(92,225,230,.85)"; c.font = "600 10px ui-sans-serif,system-ui,sans-serif";
      sky.labels.forEach(function (lb) { c.fillText(lb.name, lb.x, lb.y); });
    }
  }

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
try { WX_MODE = Store.getLocal("wxMode", "actual") || "actual"; } catch (e) {}

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
  c.strokeStyle = feels ? "rgba(232,180,255,.98)" : "rgba(244,239,228,.9)";
  c.lineWidth = feels ? 2.6 : 2; c.lineJoin = "round"; c.stroke();
  // H / L markers with degree labels
  var iHi = vals.indexOf(hi), iLo = vals.indexOf(lo);
  [[iHi, "H", hi, feels ? "#e9c6ff" : "rgba(244,239,228,.95)"], [iLo, "L", lo, feels ? "#c9a0ff" : "rgba(244,239,228,.85)"]].forEach(function (m) {
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
    var feel = v.feels != null ? ("Feels " + Math.round(v.feels) + "°. ") : "";
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
function renderConditions() {
  if (!WX || !WX.j) return;
  var j = WX.j, pick = $("#wxDayPick");
  if (!pick) return;
  WX_DAY = Math.max(0, Math.min(WX_DAY, j.daily.time.length - 1));
  var letters = ["S", "M", "T", "W", "T", "F", "S"];
  var html = "";
  for (var d = 0; d < j.daily.time.length; d++) {
    var dt = new Date(j.daily.time[d] + "T12:00:00");
    var wd = letters[dt.getDay()], dom = dt.getDate();
    var isToday = d === 0;
    html += '<button type="button" class="wx-day' + (d === WX_DAY ? " on" : "") + (isToday ? " today" : "") + '" data-d="' + d + '" role="tab" aria-selected="' + (d === WX_DAY) + '"><span class="wd">' + wd + '</span><span class="wn">' + dom + "</span></button>";
  }
  pick.innerHTML = html;
  var sel = new Date(j.daily.time[WX_DAY] + "T12:00:00");
  var lab = sel.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
  var ul = $("#wxUnitLbl"); if (ul) ul.textContent = (WX_MODE === "feels" ? "Feels like · " : "") + (S.units === "C" ? "Celsius (°C)" : "Fahrenheit (°F)");
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
  $$(".wx-tog-b").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-wxmode") === WX_MODE); });
  var cap = $("#wxModeCap"); if (cap) cap.textContent = WX_MODE === "feels" ? "Apparent temperature — violet line · H/L marked." : "The actual temperature.";
  var rain = j.daily.precipitation_probability_max[WX_DAY] || 0;
  var dayName = sel.toLocaleDateString("en-US", { weekday: "long" });
  var ps = $("#wxPrecipSum"); if (ps) ps.textContent = dayName + "'s chance: " + rain + "% · " + rainTiming(j, WX_DAY);
  var anim = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var tc = $("#wxTempChart"), pc = $("#wxPrecipChart");
  function drawAll() {
    drawTempChart(tc, j, WX_DAY, WX_MODE);
    drawPrecipChart(pc, j, WX_DAY);
  }
  if (anim && tc) { tc.style.opacity = "0.35"; setTimeout(function () { drawAll(); tc.style.transition = "opacity .28s ease"; tc.style.opacity = "1"; if (pc) { pc.style.transition = "opacity .28s ease"; pc.style.opacity = "1"; } }, 40); }
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
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-wxmode]"); if (!b) return;
    WX_MODE = b.getAttribute("data-wxmode"); try { Store.setLocal("wxMode", WX_MODE); } catch (err) {}
    renderConditions();
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
    return getJSON(url).then(function (j) { WX = { at: Date.now(), units: S.units, key: locKey(), place: L.name || "MY LOCATION", j: j }; Store.setLocal("wx", WX); $("#wxNote").textContent = ""; });
  }).catch(function (e) {
    if (e && e.geo) $("#wxNote").innerHTML = "Location is off for this app. Tap <b>◎ CHANGE</b> above to type your city instead.";
    else $("#wxNote").textContent = navigator.onLine === false ? "You're offline. Showing the last weather we saved." : "Weather service didn't answer. We'll retry in a few minutes.";
    var xn = $("#xpNote"); if (xn) xn.textContent = $("#wxNote").textContent;
    if (e && e.geo && !WX) {
      $("#wxPlace").textContent = "LOCATION OFF";
      $("#hwNow").textContent = "LOCATION OFF · TAP TO SET A CITY";
      $("#wxCond").textContent = "SET YOUR CITY";
      var adv = $("#hwAdvice"); if (adv) adv.textContent = "Turn on location or tap to pick a city";
      var ht = $("#hwTemp"); if (ht) ht.textContent = "--°";
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
    var dt = new Date(j.daily.time[d] + "T12:00:00"), nm = d === 0 ? "TODAY" : dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
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
  if (n >= 1000) return "$" + Math.round(n).toLocaleString("en-US");
  if (n >= 1) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "$" + n.toPrecision(3);
}
function refreshMarkets() {
  var ids = { bitcoin: 1, ethereum: 1, solana: 1 }; // always keep native wallet price feeds warm
  COINS.forEach(function (c) { if (c.id) ids[c.id] = 1; });
  loadHoldings().forEach(function (h) { if (h.kind !== "stock" && h.id) ids[h.id] = 1; });
  QUICK_PICKS.forEach(function (c) { if (c.id) ids[c.id] = 1; });
  var idList = Object.keys(ids);
  if (!idList.length) { renderMarkets(); try { refreshWallets(false); } catch (e) {} return; }
  getJSON("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(idList.join(",")) + "&vs_currencies=usd&include_24hr_change=true")
    .then(function (j) { MK = { at: Date.now(), d: Object.assign({}, MK && MK.d, j) }; Store.setLocal("mk", MK); mkErr = false; })
    .catch(function () { mkErr = true; })
    .then(function () { renderMarkets(); try { refreshWallets(false); } catch (e) {} });
}
function chHTML(ch) { if (ch == null || isNaN(ch)) return '<span class="dim">--</span>'; return '<span class="' + (ch >= 0 ? "up" : "dn") + '">' + (ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(2) + "%</span>"; }
function sparkSVG(ch, seed) {
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
  if (vals.length < 2) {
    // soft placeholder from current total direction
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

function renderHomeMarkets(stats, accts) {
  stats = stats || portfolioStats();
  accts = accts || loadAccounts();
  var port = $("#hMkPort"), quotes = $("#hMkQuotes"), body = $("#hMkBody");
  var hasAcct = (accts && accts.length) || loadHoldings().length;
  if (port) {
    if (!hasAcct) {
      port.innerHTML = '<span class="hmk-cta" data-hmk-add="1">Add your first account</span>';
    } else {
      var dayHtml = stats.priced
        ? ('<span class="hmk-day ' + (stats.day >= 0 ? "up" : "dn") + '">' + signedMoney(stats.day) + (stats.dayPct != null ? " · " + ((stats.dayPct >= 0 ? "+" : "") + stats.dayPct.toFixed(2) + "%") : "") + "</span>")
        : '<span class="hmk-day">—</span>';
      port.innerHTML = '<span class="hmk-total" data-hmk-port="1">' + money(stats.total) + "</span>" + dayHtml;
    }
  }
  if (quotes) {
    var d = (MK && MK.d) || {};
    function qRow(sym, id) {
      var q = d[id], ch = q ? q.usd_24h_change : null;
      var chCls = (ch == null || isNaN(ch)) ? "" : (ch >= 0 ? "up" : "dn");
      var chTxt = (ch == null || isNaN(ch)) ? "--" : ((ch >= 0 ? "+" : "") + Number(ch).toFixed(2) + "%");
      return '<span class="hmk-q" data-sym="' + sym + '"><b>' + sym + '</b> <span class="px">' + (q ? money(q.usd) : "--") + '</span> <i class="ch ' + chCls + '">' + chTxt + "</i></span>";
    }
    quotes.innerHTML = qRow("BTC", "bitcoin") + qRow("GOLD", "pax-gold");
  }
  if (body) body.hidden = false;
}

function renderHoldings() {
  var list = loadHoldings(), stats = portfolioStats(), accts = loadAccounts();
  pushPortHist(stats.total);
  animateHoldTotal(stats.total);
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
  renderQuickPicks();
  try { renderAccounts(); } catch (e) {}
  var byAcct = {};
  accts.forEach(function (a) { byAcct[a.id] = a; });
  var host = $("#holdList");
  if (host) {
    if (!list.length) host.innerHTML = '<p class="offline">No holdings yet. One-tap a pick above, or ＋ HOLDING for any ticker. Assign each to an account.</p>';
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
}
function renderMarkets() {
  var d = MK && MK.d || {}, list = "", mini = "";
  COINS.forEach(function (c, i) {
    var q = d[c.id];
    list += '<div class="row"><span class="sym">' + esc(c.sym) + '</span><span class="grow">' + esc(c.name) + '</span><span class="px">' + (q ? money(q.usd) : "--") + '</span><span class="ch">' + (q ? chHTML(q.usd_24h_change) : "") + "</span></div>";
  });
  var pages = Math.max(1, Math.ceil(COINS.length / 2) || 1), pg = mkPage % pages;
  COINS.slice(pg * 2, pg * 2 + 2).forEach(function (c, i) {
    var q = d[c.id], ch = q ? q.usd_24h_change : null;
    mini += '<div class="mk-row"><span class="sym">' + esc(c.sym) + '</span><span>' + sparkSVG(ch, (c.id || "").length + i) +
      '<div class="px">' + (q ? money(q.usd) : "--") + '</div></span><span class="ch ' + ((ch == null || isNaN(ch)) ? "" : (ch >= 0 ? "up" : "dn")) + '">' +
      ((ch == null || isNaN(ch)) ? "--" : ((ch >= 0 ? "+" : "") + ch.toFixed(2) + "%")) + "</span></div>";
  });
  if (!COINS.length) { list = '<p class="offline">Your watchlist is empty. Tap ✎ WATCHLIST to add a coin.</p>'; if (!loadHoldings().length) mini = '<span class="dim">WATCHLIST EMPTY · TAP TO ADD</span>'; }
  if (mkErr && !(MK && MK.at)) { list = '<p class="offline">Markets offline. We\'ll retry in 2 minutes.</p>'; mini = '<span class="dim">MARKETS OFFLINE · RETRYING</span>'; }
  else if (mkErr) list += '<p class="offline">Couldn\'t refresh. Showing the last prices we saved.</p>';
  var mk = $("#mkList"); if (mk) mk.innerHTML = list;
  if ($("#hMkList")) $("#hMkList").innerHTML = mini || $("#hMkList").innerHTML;
  if ($("#xpMkList")) $("#xpMkList").innerHTML = list;
  try { renderHoldings(); } catch (e) {}
  try { renderHomeMarkets(); } catch (e) {}
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
    if (MK && MK.at) hMkT.textContent = "Updated " + t12(new Date(MK.at)).replace(/([AP])$/, " $1M");
    else hMkT.textContent = "Updated --";
    hMkT.classList.toggle("old", !(MK && MK.at) || Date.now() - MK.at > 30 * 60000);
  }
  var last = Math.max(WX && WX.at || 0, MK && MK.at || 0);
  var sync = $("#hSync");
  if (sync) {
    if (navigator.onLine === false) sync.innerHTML = '<i aria-hidden="true"></i>OFFLINE';
    else sync.innerHTML = '<i aria-hidden="true"></i>SYNCED';
    sync.title = last ? ("Last live update " + short12(last)) : "Waiting for live data";
  }
  if (GPS) sh($("#hGps"), GPS.at, "GPS "); else { var g = $("#hGps"); if (g) g.textContent = GEO_OFF ? "GPS OFF" : "GPS --"; }
}
function short12(at) { return t12(new Date(at)).replace(/ ?([AP])M$/, "$1"); }

// ========== 10. map — OSM standard tiles (keyless) + dark filter, pan/zoom/recenter ==========
// Attribution: © OpenStreetMap contributors. No API key. CARTO basemaps removed (watermarked).
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
  GPS = {
    lat: lat, lon: lon, at: Date.now(),
    acc: meta.accuracy != null ? +meta.accuracy : (GPS && GPS.acc),
    heading: (meta.heading != null && !isNaN(+meta.heading) && +meta.heading >= 0) ? +meta.heading : (GPS && GPS.heading),
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
  getJSON("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=" + GPS.lat.toFixed(5) + "&lon=" + GPS.lon.toFixed(5), 10000)
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
function tileUrl(z, x, y) {
  // OSM standard raster tiles — free, no key. Subdomains a/b/c for parallel fetch.
  var s = ["a", "b", "c"][(x + y) % 3];
  return "https://" + s + ".tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
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
  if (head.getAttribute("data-init") !== "1") { head.hidden = true; head.setAttribute("data-init", "1"); }
  var dot = $("#mapDot");
  if (dot && dot.parentNode !== host) host.appendChild(dot);
  return { host: host, acc: acc, radar: radar, head: head };
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
  // accuracy circle
  if (layers.acc) {
    var accM = (GPS.acc != null && GPS.acc > 0) ? GPS.acc : 25;
    var px = Math.max(16, Math.min(160, metersToPixels(accM, GPS.lat, z)));
    layers.acc.style.width = px * 2 + "px";
    layers.acc.style.height = px * 2 + "px";
  }
  if (layers.head) {
    if (GPS.heading != null && !isNaN(GPS.heading)) {
      layers.head.hidden = false;
      layers.head.style.transform = "translate(-50%, -50%) rotate(" + GPS.heading + "deg)";
    } else layers.head.hidden = true;
  }
  try {
    ensureMapNeon(v);
    placeNeonRing(v, dx, dy);
    $$(".map-place-pin", v).forEach(function (pin) { pin.classList.add("neon-lit"); });
  } catch (e) {}
}
function renderMap(force) {
  renderPlace();
  var v = $("#mapV"), tl = $("#mapTiles"), msg = $("#mapMsg");
  if (!v || !tl) return;
  try { ensureMapNeon(v); } catch (e) {}
  if (!GPS) {
    // keep last tiles if any; just hide user layers
    if ($("#mapDot")) $("#mapDot").hidden = true;
    var rad = v.querySelector(".map-radar"); if (rad) rad.style.opacity = "0";
    if (msg) { msg.hidden = false; msg.textContent = GEO_OFF ? "LOCATION OFF · ALLOW IT IN SETTINGS TO SEE THE MAP" : "LOCATING…"; }
    return;
  }
  var W = v.clientWidth, H = v.clientHeight; if (!W || !H) return;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  var world = lonLatToWorld(GPS.lon, GPS.lat, z);
  var cx = world.x + MAP.offX, cy = world.y + MAP.offY;
  var ox = cx - W / 2, oy = cy - H / 2;
  var key = z + ":" + Math.round(ox) + ":" + Math.round(oy) + ":" + W + "x" + H + ":" + (MAP.follow ? "F" : "P");
  // Always update user layers even if tiles unchanged
  placeUserLayers(v, W, H, ox, oy, z);
  if (msg) msg.hidden = true;
  var rad = v.querySelector(".map-radar"); if (rad) rad.style.opacity = "1";
  var map3dLive = false;
  try { map3dLive = !!(window.ZAPFX3D && window.ZAPFX3D.mapReady()); } catch (e) {}
  if (map3dLive) {
    try { window.ZAPFX3D.syncMap({ lat: GPS.lat, lon: GPS.lon, z: z, follow: MAP.follow, snap: !!force && !!MAP.follow }); } catch (e) {}
  }
  if (!map3dLive && !force && MAP._key === key) {
    // still refresh pins positions
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
        img.onload = function () { img.classList.add("on"); };
        img.onerror = function () { img.classList.add("err"); };
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
  }
  // Saved place pins
  var pinHost = v.querySelector(".map-pins");
  if (!pinHost) { pinHost = document.createElement("div"); pinHost.className = "map-pins"; pinHost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5"; v.appendChild(pinHost); }
  var places = loadPlaces();
  pinHost.innerHTML = places.map(function (pl) {
    if (pl.lat == null) return "";
    var pw = lonLatToWorld(pl.lon, pl.lat, z);
    var px = pw.x - ox, py = pw.y - oy;
    if (px < -48 || py < -48 || px > W + 48 || py > H + 48) return "";
    return '<button type="button" class="map-place-pin neon-lit" data-place-go="' + esc(pl.id) + '" style="left:' + Math.round(px) + "px;top:" + Math.round(py) + 'px;pointer-events:auto"><span class="pin-dot" style="background:' + (pl.color || "#5dade2") + '">' + (pl.icon || "📍") + '</span><span class="pin-lab">' + esc(pl.name) + "</span></button>";
  }).join("");
  pinHost.onclick = function (e) {
    var g = e.target.closest("[data-place-go]"); if (!g) return;
    e.stopPropagation();
    var pl = loadPlaces().filter(function (x) { return x.id === g.getAttribute("data-place-go"); })[0];
    if (pl) showMapPlaceCard(pl);
  };
  // Recenter: visible only after pan/pinch breaks follow; tap re-enables follow
  var rec = $("#mapRec");
  if (rec) {
    rec.hidden = !!MAP.follow;
    rec.classList.toggle("on", !MAP.follow);
    rec.setAttribute("aria-label", MAP.follow ? "Following your location" : "Recenter on me");
  }
}
function mapRecenter() {
  MAP.follow = true; MAP.offX = 0; MAP.offY = 0; MAP.z = 16; MAP._key = null;
  var rec = $("#mapRec"); if (rec) { rec.hidden = true; rec.classList.remove("on"); }
  renderMap(true);
  toast("Following you");
  try { startGpsWatch(); } catch (e) {}
}
function mapZoom(d) {
  var next = Math.max(3, Math.min(19, (MAP.z | 0) + d));
  if (next === MAP.z) return;
  var f = Math.pow(2, next - MAP.z);
  MAP.offX *= f; MAP.offY *= f; MAP.z = next; MAP._key = null; renderMap(true);
}
(function bindMapGestures() {
  var v = $("#mapV"); if (!v) return;
  var startX = 0, startY = 0, baseOffX = 0, baseOffY = 0, pin0 = null;
  function pt(e) { var t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
  function onDown(e) {
    if (e.target.closest(".map-tool,.map-attr,.map-open,.map-place-pin")) return;
    MAP.dragging = true; MAP.moved = false;
    var p = pt(e); startX = p.x; startY = p.y; baseOffX = MAP.offX; baseOffY = MAP.offY;
    if (e.touches && e.touches.length === 2) {
      var a = e.touches[0], b = e.touches[1];
      pin0 = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: MAP.z };
    } else pin0 = null;
  }
  function onMove(e) {
    if (!MAP.dragging) return;
    if (e.touches && e.touches.length === 2 && pin0) {
      e.preventDefault();
      var a = e.touches[0], b = e.touches[1];
      var dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      var dz = Math.round(Math.log2(dist / pin0.dist));
      var nz = Math.max(3, Math.min(19, pin0.z + dz));
      if (nz !== MAP.z) { var f = Math.pow(2, nz - MAP.z); MAP.offX *= f; MAP.offY *= f; MAP.z = nz; pin0.dist = dist; pin0.z = nz; MAP._key = null; renderMap(true); }
      MAP.moved = true; MAP.follow = false; return;
    }
    var p = pt(e);
    var dx = p.x - startX, dy = p.y - startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) MAP.moved = true;
    if (MAP.moved) {
      if (e.cancelable) e.preventDefault();
      MAP.follow = false; // pan breaks auto-follow
      try { hideMapPlaceCard(); } catch (err) {}
      MAP.offX = baseOffX - dx; MAP.offY = baseOffY - dy; renderMap(true);
    }
  }
  function onUp() { MAP.dragging = false; pin0 = null; }
  v.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  v.addEventListener("touchstart", onDown, { passive: true });
  v.addEventListener("touchmove", onMove, { passive: false });
  v.addEventListener("touchend", onUp);
  v.addEventListener("wheel", function (e) {
    e.preventDefault();
    mapZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
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
  if (!GPS) return null;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  var world = lonLatToWorld(GPS.lon, GPS.lat, z);
  return worldToLonLat(world.x + MAP.offX, world.y + MAP.offY, z);
}
function openMapsHere() {
  if (!GPS) { toast(GEO_OFF ? "Turn on Location for this app to see where you are" : "Still finding you…"); return; }
  var c = mapCenterLL() || GPS;
  var ll = (+c.lat).toFixed(6) + "," + (+c.lon).toFixed(6);
  var q = (PLACE && (PLACE.road || PLACE.city)) ? [PLACE.road, PLACE.city].filter(Boolean).join(", ") : ll;
  openApp({ id: "maps", mapsHere: true, ll: ll, q: q, name: "Maps" });
}
var mapOpen = $("#mapOpen"); if (mapOpen) mapOpen.addEventListener("click", function (e) { e.stopPropagation(); openMapsHere(); });
var mapIn = $("#mapIn"); if (mapIn) mapIn.addEventListener("click", function (e) { e.stopPropagation(); mapZoom(1); });
var mapOut = $("#mapOut"); if (mapOut) mapOut.addEventListener("click", function (e) { e.stopPropagation(); mapZoom(-1); });
var mapRec = $("#mapRec"); if (mapRec) mapRec.addEventListener("click", function (e) { e.stopPropagation(); mapRecenter(); });
// avoid opening Maps when the user just panned
$("#hMap").addEventListener("click", function (e) {
  if (e.target.closest(".map-tool,.map-attr,.map-open,.map-v")) return;
});
window.addEventListener("resize", function () { clearTimeout(renderMap.t); renderMap.t = setTimeout(function () { MAP._key = null; renderMap(true); }, 150); });

// ----- tabs -----

// ========== 10b. Saved Places (Home / Work / School / custom) ==========
// No live traffic overlay: free keyless sources either need MapLibre MVT (Earth Traffic is Thailand-only —
// US tiles return 204) or require paid API keys (Google/TomTom/HERE). Map stays clean OSM + places.
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
  var list = loadPlaces(); if (!GPS || !list.length) { renderPlacesRow(); return; }
  list.forEach(function (pl) {
    if (pl.lat == null) return;
    var km = haversineKm(GPS, { lat: pl.lat, lon: pl.lon });
    PLACE_ETA[pl.id] = { km: km, sec: null };
    // OSRM public demo — light use only
    var url = "https://router.project-osrm.org/route/v1/driving/" + GPS.lon + "," + GPS.lat + ";" + pl.lon + "," + pl.lat + "?overview=false";
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
    }).join("") + '<button type="button" class="place-chip" data-place-new="custom" role="listitem"><span class="pc-ico" style="background:#8b5cf6">＋</span><span class="pc-name">Custom</span><span class="pc-eta">Add</span></button>';
    return;
  }
  host.innerHTML = list.map(function (pl) {
    var eta = PLACE_ETA[pl.id];
    var sub = eta ? formatEta(eta.sec, eta.km) : "…";
    var col = pl.color || "#5dade2";
    return '<button type="button" class="place-chip" data-place-go="' + esc(pl.id) + '" role="listitem"><span class="pc-ico" style="background:' + col + '">' + (pl.icon || "📍") + '</span><span class="pc-name">' + esc(pl.name) + '</span><span class="pc-eta">' + esc(sub) + "</span></button>";
  }).join("") + '<button type="button" class="place-chip" data-place-new="custom" role="listitem"><span class="pc-ico" style="background:#8b5cf6">＋</span><span class="pc-name">Add</span><span class="pc-eta">New</span></button>';
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
    getJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(job.q), 10000).then(function (R) {
      if (!R || !R[0]) return;
      var cur = loadPlaces();
      if (!cur[job.i]) return;
      cur[job.i] = Object.assign({}, cur[job.i], { lat: +R[0].lat, lon: +R[0].lon });
      savePlaces(cur); refreshPlaceEtas(); try { renderMap(true); } catch (e) {}
    }).catch(function () {});
  });
}
var _mapCardPl = null;
function hideMapPlaceCard() {
  _mapCardPl = null;
  var card = $("#mapPlaceCard"); if (card) card.hidden = true;
}
function showMapPlaceCard(pl) {
  if (!pl) return;
  _mapCardPl = pl;
  var v = $("#mapV"); if (!v) { openDirectionsTo(pl); return; }
  var card = $("#mapPlaceCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "mapPlaceCard"; card.className = "map-place-card"; card.hidden = true;
    card.innerHTML = '<div class="mpc-meta"><b id="mpcName"></b><small id="mpcEta"></small></div><button type="button" class="mpc-go" id="mpcGo">Go</button><button type="button" class="mpc-x" id="mpcX" aria-label="Close">✕</button>';
    v.appendChild(card);
    card.querySelector("#mpcGo").addEventListener("click", function (e) {
      e.stopPropagation();
      if (_mapCardPl) openDirectionsTo(_mapCardPl);
    });
    card.querySelector("#mpcX").addEventListener("click", function (e) { e.stopPropagation(); hideMapPlaceCard(); });
  }
  var eta = PLACE_ETA[pl.id];
  card.querySelector("#mpcName").textContent = pl.name || "Place";
  card.querySelector("#mpcEta").textContent = eta ? ("ETA · " + formatEta(eta.sec, eta.km)) : "Tap Go for turn-by-turn";
  card.hidden = false;
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
          getJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=" + encodeURIComponent(q), 10000).then(function (R) {
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
    '<button class="btn alt" id="plMap" style="margin-top:8px">⌖ Use map center</button>' +
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
        if (!GPS) { toast("Map needs your location first"); return; }
        var z = MAP.z | 0, world = lonLatToWorld(GPS.lon, GPS.lat, z);
        var cx = world.x + MAP.offX, cy = world.y + MAP.offY;
        // inverse web mercator
        var n = Math.pow(2, z);
        var lon = cx / (n * 256) * 360 - 180;
        var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * cy / (n * 256))));
        var lat = latRad * 180 / Math.PI;
        pick(lat, lon, "Map center");
      });
      var tm;
      b.querySelector("#plQ").addEventListener("input", function (e) {
        clearTimeout(tm); var q = e.target.value.trim(); if (q.length < 3) { b.querySelector("#plRes").innerHTML = ""; return; }
        tm = setTimeout(function () {
          getJSON("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&accept-language=en&q=" + encodeURIComponent(q), 10000).then(function (R) {
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
$("#hWx").addEventListener("click", function () { toggleXp("wx"); });
(function bindHomeMarketsCard() {
  var card = $("#hMk"); if (!card) return;
  function openPort() { toggleXp("mk"); }
  function openAdd(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    // reveal portfolio panel then open add-account sheet
    setHudTab("markets");
    try { openAddAccount(); } catch (err) { openPort(); }
  }
  card.addEventListener("click", function (e) {
    if (e.target.closest("#hMkAct,[data-hmk-add]")) { openAdd(e); return; }
    if (e.target.closest("[data-hmk-port],.hmk-total,.hmk-val")) { openPort(); return; }
    openPort();
  });
  card.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPort(); }
  });
  var act = $("#hMkAct");
  if (act) act.addEventListener("click", openAdd);
})();
function toggleXp(k) {
  if (k === "wx") { setHudTab("weather"); try { renderWeather(); renderConditions(); } catch (e) {} return; }
  if (k === "mk") { setHudTab("markets"); try { renderMarkets(); } catch (e) {} return; }
}
$("#xpCity").addEventListener("click", function () { openCity(); });
$("#xpMkEdit").addEventListener("click", function () { openEditCoins(); });
var _xpHoldAdd = $("#xpHoldAdd"); if (_xpHoldAdd) _xpHoldAdd.addEventListener("click", function () { openAddHolding(); });
var _xpAcctAdd = $("#xpAcctAdd"); if (_xpAcctAdd) _xpAcctAdd.addEventListener("click", function () { openAddAccount(); });
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
function sheet(title, html, bind) {
  // fresh body each time: listeners bound by the previous sheet must not fire here (the music list's
  // [data-m] handler used to close Edit Apps when you tapped ↑/↓/toggle, which also use data-m)
  var old = $("#sheetBody"), nb = old.cloneNode(false); old.parentNode.replaceChild(nb, old);
  $("#sheetTitle").textContent = title; nb.innerHTML = html; $("#sheet").hidden = false; $("#scrim").hidden = false;
  if (bind) bind($("#sheetBody"));
}
function closeSheet() { $("#sheet").hidden = true; $("#scrim").hidden = true; try { $("#sheet").classList.remove("finder-sheet"); } catch (e) {} }
$("#sheetClose").addEventListener("click", closeSheet);
$("#scrim").addEventListener("click", closeSheet);
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
$("#dEdit").addEventListener("click", function () { openEditApps(); });
$("#editMkBtn").addEventListener("click", function () { openEditCoins(); });
$("#cityBtn").addEventListener("click", function () { openCity(); });

function row(icon, label, sub, act) { return '<button class="mrow" data-go="' + act + '"><span class="mi" aria-hidden="true">' + icon + '</span><span class="grow">' + label + "<small>" + sub + '</small></span><span aria-hidden="true">›</span></button>'; }
function openMenu() {
  sheet("☰ MENU",
    "<h3>APPS</h3>" + row("▦", "Edit apps", "Add, remove, show, hide or reorder apps", "apps") +
    "<h3>WEATHER</h3>" + row("☁", "Weather location", LOC.mode === "city" ? "City: " + esc(LOC.name) : "Using my location", "city") +
    "<h3>MARKETS</h3>" + row("₿", "Edit watchlist", COINS.map(function (c) { return esc(c.sym); }).join(" · ") || "Empty", "coins") +
    "<h3>SETTINGS</h3>" + row("⚙", "Settings", "Name, units, Lite mode, tilt, sounds", "settings") +
    row("↻", "Check for updates", "Now running v" + VERSION, "update") +
    "<h3>HELP</h3>" + row("?", "Add to Home Screen", "3 steps to open it like a real app", "help") +
    '<p class="note" style="margin-top:12px">ZAPWISE//OS v' + VERSION + " · Everything you change is saved on this device only.</p>",
    function (b) {
      b.addEventListener("click", function (e) {
        var g = e.target.closest("[data-go]"); if (!g) return; var k = g.getAttribute("data-go");
        if (k === "apps") openEditApps();
        else if (k === "city") openCity();
        else if (k === "coins") openEditCoins();
        else if (k === "settings") openSettings();
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
  { id: "social", name: "Social Media", icon: "💬", match: /instagram|tiktok|facebook|snapchat|threads|reddit|linkedin|pinterest|bluesky|mastodon|tumblr|lemon8|bereal|vsco|x\b|twitter|apollo|redditisfun/i },
  { id: "entertainment", name: "Entertainment", icon: "🎬", match: /youtube|netflix|twitch|hulu|disney|max|peacock|paramount|primevideo|tubi|crunchyroll|vimeo|roku|appletv|plex|imdb|letterboxd|capcut|canva|adobe|lightroom|photoshop|davinci|descript/i },
  { id: "lifestyle", name: "Lifestyle", icon: "🌿", match: /fitness|strava|myfitnesspal|fitbit|calm|headspace|duolingo|kindle|goodreads|news|cnn|nytimes|bbc|wikipedia|ring|nest|alexa|findmy|photos|gphotos|camera|clock|weather|translate/i },
  { id: "music", name: "Music", icon: "🎵", match: /spotify|music|pandora|soundcloud|deezer|tidal|shazam|bandcamp|audible|podcast|ytmusic/i },
  { id: "shop", name: "Shopping", icon: "🛍️", match: /amazon|ebay|etsy|walmart|target|costco|shein|temu|poshmark|bestbuy|shopify|aliexpress|nike/i },
  { id: "money", name: "Money", icon: "💸", match: /venmo|cash|paypal|zelle|coinbase|binance|robinhood|chase|bank|amex|capital|chime|stripe|mint|creditkarma|wells|quickbooks|applepay|googlepay/i },
  { id: "food", name: "Food", icon: "🍔", match: /doordash|ubereats|grubhub|instacart|starbucks|mcdonald|chipotle|opentable|resy|yelp|toast/i },
  { id: "travel", name: "Travel", icon: "✈️", match: /uber|lyft|maps|waze|airbnb|booking|expedia|kayak|tripadvisor|delta|united|southwest|american|flightradar|citymapper|tesla|gasbuddy|googlemaps|applemaps/i },
  { id: "work", name: "Work", icon: "💼", match: /gmail|outlook|drive|docs|sheets|slides|notion|trello|asana|todoist|evernote|dropbox|onedrive|github|gitlab|figma|word|excel|powerpoint|calendar|mail|zoom|meet|slack|teams|keep|chrome|safari|edge|icloud|finder|shortcuts|notes|reminders|stackoverflow/i },
  { id: "ai", name: "AI", icon: "✨", match: /chatgpt|claude|gemini|grok|perplexity|copilot|character|midjourney|runway|eleven|poe|openai|chatgptalt/i },
  { id: "games", name: "Games", icon: "🎮", match: /fortnite|roblox|minecraft|steam|xbox|playstation|twitchigdb|spotifykids/i },
  { id: "utilities", name: "Utilities", icon: "🛠️", match: /settings|calculator|authenticator|lastpass|bitwarden|1password|phone|messages|whatsapp|messenger|telegram|discord|signal|skype|line|wechat|viber|groupme|zapwise/i }
];
function catOf(c) {
  var hay = (c.id || "") + " " + (c.name || "");
  for (var i = 0; i < APP_CATS.length; i++) if (APP_CATS[i].match.test(hay)) return APP_CATS[i].id;
  return "more";
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
function openTheme() {
  function rowsHTML() {
    return THEMES.map(function (t) {
      var v = t.v, on = t.id === THEME.id;
      return '<button class="thm' + (on ? " on" : "") + '" data-th="' + t.id + '" aria-pressed="' + on + '" style="background:' + v.panel + ';color:' + v.cream + '"><span class="sw4" aria-hidden="true"><i style="background:' + v.void + '"></i><i style="background:' + v.cream + '"></i><i style="background:' + v.amber + '"></i><i style="background:' + v.cyan + '"></i></span><span><b style="color:' + v.amber + '">' + t.name + '</b><small>' + t.sub + '</small></span><span class="ck" style="color:' + v.cyan + '">' + (on ? "✓" : "") + "</span></button>";
    }).join("");
  }
  sheet("◐ THEME", '<p class="note" style="margin-bottom:10px">Tap a theme to switch. It changes right away and is saved on this device.</p><div id="thList">' + rowsHTML() + "</div>", function (b) {
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
  { id: "sofi", name: "SoFi", kind: "broker", url: "sofi://", web: "https://www.sofi.com", icon: "", bg: "#00a1e0", letter: "S" },
  { id: "cashapp", name: "Cash App", kind: "broker", url: "cashme://", pkg: "com.square.cash", web: "https://cash.app", icon: "/os/icons/cashapp.jpg", bg: "#00d632", letter: "C" },
  { id: "coinbase", name: "Coinbase", kind: "exchange", url: "coinbase://", pkg: "com.coinbase.android", web: "https://www.coinbase.com", icon: "/os/icons/coinbase.jpg", bg: "#0052ff", letter: "C" },
  { id: "kraken", name: "Kraken", kind: "exchange", url: "kraken://", web: "https://www.kraken.com", icon: "", bg: "#5741d9", letter: "K" },
  { id: "binance", name: "Binance", kind: "exchange", url: "bnc://", pkg: "com.binance.dev", web: "https://www.binance.com", icon: "/os/icons/binance.jpg", bg: "#f0b90b", letter: "B" },
  { id: "cryptocom", name: "Crypto.com", kind: "exchange", url: "crypto://", web: "https://crypto.com", icon: "", bg: "#103f68", letter: "C" },
  { id: "gemini", name: "Gemini", kind: "exchange", url: "gemini://", web: "https://www.gemini.com", icon: "/os/icons/gemini.jpg", bg: "#00dcfa", letter: "G" },
  { id: "paypal", name: "PayPal", kind: "broker", url: "paypal://", pkg: "com.paypal.android.p2pmobile", web: "https://www.paypal.com", icon: "/os/icons/paypal.jpg", bg: "#0070ba", letter: "P" },
  { id: "chase", name: "Chase", kind: "broker", url: "chase://", pkg: "com.chase.sig.android", web: "https://www.chase.com", icon: "/os/icons/chase.jpg", bg: "#117aca", letter: "C" },
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
  var list = loadAccounts();
  function addTile() {
    return '<button type="button" class="acct-tile empty" data-acct-add="1" role="listitem" aria-label="Add account">' +
      '<span class="at-ico" aria-hidden="true">＋</span><span class="at-name">Add</span></button>';
  }
  if (!list.length) {
    host.innerHTML = addTile();
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
  }).join("") + addTile();
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
  if (!a.url && !a.web) { toast("No app link — long-press to edit"); return; }
  openApp({ id: a.catalogId || a.id, name: a.name, url: a.url || a.web, pkg: a.pkg, web: a.web || a.url });
}
function openEditAccount(acctId) {
  var list = loadAccounts();
  var a = list.filter(function (x) { return x.id === acctId; })[0];
  if (!a) return;
  var isWal = a.kind === "wallet";
  sheet("✎ " + (a.name || "ACCOUNT").toUpperCase(),
    '<label class="field">NAME<input id="acName" maxlength="28" value="' + esc(a.name || "") + '"></label>' +
    (isWal
      ? ('<label class="field">PUBLIC ADDRESS<input id="acAddr" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(a.address || "") + '"></label><p class="note">Read-only. Never enter a seed phrase.</p>')
      : '<p class="note">Holdings assigned to this account roll into your net worth. Tap the tile to open the real app/site (never the App Store).</p>') +
    '<button class="btn" id="acSave" style="margin-top:12px">SAVE</button>' +
    '<button class="btn warn" id="acDel" style="margin-top:8px">Remove account</button>',
    function (b) {
      b.querySelector("#acSave").addEventListener("click", function () {
        var nm = (b.querySelector("#acName").value || "").trim().slice(0, 28) || a.name;
        var next = loadAccounts().map(function (x) {
          if (x.id !== a.id) return x;
          var row = Object.assign({}, x, { name: nm });
          if (isWal) {
            var addr = (b.querySelector("#acAddr").value || "").trim();
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
  ];
  var html = '<label class="field find-field"><span class="find-label">FIND AN ACCOUNT</span><input id="acFilter" placeholder="Robinhood, Coinbase, MetaMask…" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="cat-chips" id="acCats" role="tablist"></div>' +
    '<div class="pick-hint" id="acHint">Tap to add — balances stay on this device</div>' +
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
  renderAccounts(); renderHoldings();
  toast(c.name + " added");
  if (row.kind === "wallet") refreshWallets(true);
}
function openAddWalletAccount(c) {
  sheet("＋ " + (c.name || "WALLET").toUpperCase(),
    '<p class="note" style="margin-bottom:10px;color:#9ff0c8"><b>Read-only.</b> Never enter your seed phrase or private key. Public address only.</p>' +
    '<label class="field">PUBLIC ADDRESS<input id="walAddr" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="bc1… / 0x… / Solana"></label>' +
    '<label class="field">NAME (OPTIONAL)<input id="walLabel" maxlength="24" placeholder="' + esc(c.name) + '"></label>' +
    '<p class="note" id="walDetect">Paste an address — we auto-detect BTC, ETH, or SOL.</p>' +
    '<button class="btn" id="walSave" style="margin-top:12px">TRACK ADDRESS</button>',
    function (b) {
      function updateDetect() {
        var a = (b.querySelector("#walAddr").value || "").trim();
        var chain = detectChain(a);
        var el = b.querySelector("#walDetect");
        if (!a) el.textContent = "Paste an address — we auto-detect BTC, ETH, or SOL.";
        else if (!chain) el.textContent = "Couldn't detect chain. Use a BTC (bc1/1/3), ETH (0x…), or SOL address.";
        else el.textContent = "Detected: " + ({ btc: "Bitcoin", eth: "Ethereum", sol: "Solana" }[chain]) + " · read-only balance.";
      }
      b.querySelector("#walAddr").addEventListener("input", updateDetect); updateDetect();
      setTimeout(function () { var i = b.querySelector("#walAddr"); i && i.focus && i.focus({ preventScroll: true }); }, 40);
      b.querySelector("#walSave").addEventListener("click", function () {
        var addr = (b.querySelector("#walAddr").value || "").trim();
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
    '<p class="note" style="margin-bottom:8px">Crypto &amp; gold price live via CoinGecko. Stocks: enter a manual price — no free keyless stock feed works from the browser (Yahoo/Stooq CORS blocked).</p>' +
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
    '<div class="field">SOFT UI SOUNDS</div><div class="seg" id="stSnd"><button type="button" data-v="0">OFF</button><button type="button" data-v="1">ON</button></div>' +
    '<p class="note">Soft synth taps when you press cards. Off by default.</p>' +
    '<div class="field">LITE MODE</div><div class="seg" id="stLite"><button type="button" data-v="0">3D ON</button><button type="button" data-v="1">LITE</button></div>' +
    '<p class="note">Lite skips WebGL (city backdrop), tilt, and particle boot. Auto-on for low-end / Reduce Motion.</p>' +
    '<div class="field">CARD TILT</div><div class="seg" id="stTilt"><button type="button" data-v="0">OFF</button><button type="button" data-v="1">ON</button></div>' +
    '<div class="field">MOTION TILT (iOS NEEDS TAP)</div><div class="seg" id="stMotion"><button type="button" data-v="0">OFF</button><button type="button" data-v="1">ENABLE</button></div>' +
    '<p class="note">Motion tilt asks for permission only when you tap Enable — never auto-prompted.</p>' +
    '<div class="field">ASSISTANT</div><p class="note">On-device commands for weather, net worth, places, and apps. Smart mode uses Pollinations. Optional private WebLLM on-device.</p>' +
    '<button class="btn" id="stSave" type="button">SAVE</button>' +
    '<h3>UPDATES</h3><button class="btn" id="stUpdate" type="button">Check for updates</button>' +
    '<p class="note">Running v' + VERSION + '. Themes: tap THEME in the top bar.</p>' +
    '<h3>RESET</h3><button class="btn warn" id="stReset" type="button">Reset everything to defaults</button>';
}
function bindSettings(b, closeAfterSave) {
  var sndOn = !!Store.getLocal("uiSounds", false);
  var liteOn = !!Store.getLocal("liteMode", false);
  var tiltOn = Store.getLocal("tiltCards", null); if (tiltOn == null) tiltOn = true; else tiltOn = !!tiltOn;
  var motionOn = !!Store.getLocal("motionTilt", false);
  var u = S.units, snd = sndOn ? "1" : "0", lite = liteOn ? "1" : "0", tilt = tiltOn ? "1" : "0", motion = motionOn ? "1" : "0";
  function seg() { $$("#stU button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === u); }); }
  function segS() { $$("#stSnd button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === snd); }); }
  function segL() { $$("#stLite button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === lite); }); }
  function segT() { $$("#stTilt button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === tilt); }); }
  function segM() { $$("#stMotion button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === motion); }); }
  b.querySelector("#stU").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { u = x.getAttribute("data-v"); seg(); } });
  b.querySelector("#stSnd").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { snd = x.getAttribute("data-v"); segS(); if (snd === "1") { setUiSounds(true); sfxTap(); } } });
  b.querySelector("#stLite").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { lite = x.getAttribute("data-v"); segL(); } });
  b.querySelector("#stTilt").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { tilt = x.getAttribute("data-v"); segT(); } });
  b.querySelector("#stMotion").addEventListener("click", function (e) {
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
    setUiSounds(snd === "1");
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
  seg(); segS(); segL(); segT(); segM();
}
function mountSettingsScreen() {
  var host = document.getElementById("settingsMount");
  if (!host) return;
  var sndOn = !!Store.getLocal("uiSounds", false);
  var liteOn = !!Store.getLocal("liteMode", false);
  var tiltOn = Store.getLocal("tiltCards", null); if (tiltOn == null) tiltOn = true; else tiltOn = !!tiltOn;
  var motionOn = !!Store.getLocal("motionTilt", false);
  host.innerHTML = settingsHtml(sndOn, liteOn, tiltOn, motionOn);
  bindSettings(host, false);
}
function openSettings() {
  var host = document.getElementById("settingsMount");
  if (host) { setHudTab("settings"); mountSettingsScreen(); return; }
  var sndOn = !!Store.getLocal("uiSounds", false);
  var liteOn = !!Store.getLocal("liteMode", false);
  var tiltOn = Store.getLocal("tiltCards", null); if (tiltOn == null) tiltOn = true; else tiltOn = !!tiltOn;
  var motionOn = !!Store.getLocal("motionTilt", false);
  sheet("SETTINGS", settingsHtml(sndOn, liteOn, tiltOn, motionOn), function (b) { bindSettings(b, true); });
}

// ----- help -----
function openHelp() {
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  sheet("? ADD TO HOME SCREEN",
    (standalone ? '<p class="note" style="color:#3ddc84;margin-bottom:10px">✓ You\'re already using it from your Home Screen.</p>' : "") +
    '<ol class="steps"><li><b>iPhone:</b> open <b>zapwiseai.com/os</b> in Safari → Share → Add to Home Screen.</li>' +
    '<li><b>Android:</b> open it in Chrome → menu ⋮ → Install app / Add to Home screen.</li>' +
    '<li><b>Computer:</b> bookmark the page or Install from the browser menu. It works in Chrome, Edge, Firefox and Safari.</li></ol>' +
    '<h3>GOOD TO KNOW</h3><p class="note">One tap opens an app if it\'s installed. If it isn\'t, its website opens after about a second. On a computer the website opens in a new tab. The live map shows your area from your location (OpenStreetMap tiles); tap it to open Maps. Weather asks for location once; tap Allow, or set a city in the menu. Your choices stay on this device only.</p>',
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
}
function onLeave() { saveScroll(true); }
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") onReturn(); else onLeave(); });
window.addEventListener("pagehide", onLeave);
window.addEventListener("pageshow", function (e) { if (e.persisted) onReturn(); });
// when shared prefs change from elsewhere (stage 2 sync, or another tab), re-read them and redraw
function rehydrate() {
  S = Object.assign({}, DEFAULT_SET, Store.get("settings", {})); APPS = Store.get("apps", null); migrateApps();
  COINS = Store.get("coins", null) || clone(DEFAULT_COINS); LOC = readLoc();
  applyTheme(Store.get("theme", "zapwise")); renderApps(); renderMarkets(); minute(new Date()); refreshWeather(); refreshMarkets();
}
Store.onChange(function (k, v, src) { if (src === "remote") rehydrate(); });
window.addEventListener("storage", function (e) { if (e.key === "zapos.state" && e.newValue) { try { Store.applyRemote(JSON.parse(e.newValue)); } catch (x) {} } });
// ========== v3.0 phase 0: Phone = dial pad + favorites inside the dashboard (tel: works every time on iPhone) ==========
var FAVS = Store.get("favs", []);
function saveFavs() { Store.set("favs", FAVS); }
function cleanNum(n) { return String(n || "").replace(/[^0-9+*#]/g, ""); }
function fmtNum(n) { var d = n.replace(/\D/g, ""); if (/^\+/.test(n) || d.length !== 10) return n; return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6); }
function callNum(n) { n = cleanNum(n); if (!n) { toast("Type a number first"); return; } location.href = "tel:" + n; }
function textNum(n) { n = cleanNum(n); location.href = n ? "sms:" + n : "sms:"; }
function dialerHtml() {
  var keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  return '<div class="dl-num" id="dlNum" aria-live="polite">&nbsp;</div>' +
    '<div class="dl-pad" id="dlPad">' + keys.map(function (k) { return '<button type="button" class="dl-k" data-k="' + k[0] + '" aria-label="' + k[0] + '"><b>' + k[0] + "</b><small>" + k[1] + "</small></button>"; }).join("") + "</div>" +
    '<div class="dl-act"><button type="button" class="dl-sv" id="dlSave" aria-label="Save as favorite">☆</button><button type="button" class="dl-call" id="dlCall" aria-label="Call">CALL</button><button type="button" class="dl-sv" id="dlDel" aria-label="Delete last digit">⌫</button></div>' +
    '<h3>FAVORITES</h3><div id="dlFavs"></div>' +
    '<p class="note" style="margin-top:10px">Call opens your phone\'s call screen with the number ready. Favorites are saved on this device.</p>';
}
function bindDialer(b) {
  var num = "";
  function draw() { var n = b.querySelector("#dlNum"); if (n) n.textContent = num ? fmtNum(num) : "\u00a0"; }
  function drawFavs() {
    var host = b.querySelector("#dlFavs"); if (!host) return;
    host.innerHTML = FAVS.length ? FAVS.map(function (f, i) {
      return '<div class="dl-fav"><span class="grow"><b>' + esc(f.name) + "</b><small>" + esc(fmtNum(f.num)) + '</small></span>' +
        '<button type="button" class="sq" data-f="text" data-i="' + i + '" aria-label="Text ' + esc(f.name) + '">💬</button>' +
        '<button type="button" class="sq" data-f="call" data-i="' + i + '" aria-label="Call ' + esc(f.name) + '" style="color:var(--green)">📞</button>' +
        '<button type="button" class="sq" data-f="del" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '" style="color:var(--red)">✕</button></div>';
    }).join("") : '<p class="note">No favorites yet. Type a number and tap ☆ to save it.</p>';
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
    var x = e.target.closest("[data-f]"); if (!x) return; var f = FAVS[+x.getAttribute("data-i")], m = x.getAttribute("data-f"); if (!f) return;
    if (m === "call") callNum(f.num); else if (m === "text") textNum(f.num);
    else if (confirm("Remove " + f.name + " from favorites?")) { FAVS.splice(+x.getAttribute("data-i"), 1); saveFavs(); drawFavs(); }
  });
  b.addEventListener("keydown", function (e) { if (/^[0-9*#+]$/.test(e.key)) { num += e.key; draw(); } else if (e.key === "Backspace") { num = num.slice(0, -1); draw(); } else if (e.key === "Enter") callNum(num); });
  draw(); drawFavs();
}
function mountPhoneScreen() {
  var host = document.getElementById("phoneMount");
  if (!host) return;
  if (host.dataset.ready === "1") return;
  host.innerHTML = dialerHtml();
  host.dataset.ready = "1";
  bindDialer(host);
}
function openDial() {
  var host = document.getElementById("phoneMount");
  if (host) { setHudTab("phone"); mountPhoneScreen(); return; }
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
function runSearch(q) {
  q = (q || "").trim(); if (!q) return;
  var hits = findApps(q, 1);
  if (hits[0]) { openApp(hits[0]); return; }
  go("https://www.google.com/search?q=" + encodeURIComponent(q));
}
(function () {
  var f = $("#srch"), inp = $("#srchQ"), hint = $("#srchHint"), drop = $("#srchDrop");
  if (!f || !inp || !drop) return;
  var active = -1, lastHits = [];
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
    if (!q) { hideDrop(); hint.textContent = ""; return; }
    lastHits = findApps(q, 10);
    var html = lastHits.map(function (a, i) {
      var pinned = isPinned(a);
      var catId = a.id && String(a.id).indexOf("p-") === 0 ? a.id.slice(2) : a.id;
      return '<button type="button" class="srch-item" role="option" data-i="' + i + '" id="srchOpt' + i + '">' +
        '<img src="' + esc(a.icon || ("/os/icons/" + catId + ".jpg")) + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=.2">' +
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
    hint.textContent = lastHits[0] ? ("↵ " + lastHits[0].name.toUpperCase()) : "↵ WEB";
  }
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = inp.value;
    if (active >= 0 && lastHits[active]) openApp(lastHits[active]);
    else runSearch(v);
    inp.blur(); inp.value = ""; hideDrop(); hint.textContent = "";
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
    if (web) { go("https://www.google.com/search?q=" + encodeURIComponent(inp.value.trim())); inp.value = ""; hideDrop(); return; }
    var item = e.target.closest("[data-i]");
    if (!item) return;
    var i = +item.getAttribute("data-i");
    if (lastHits[i]) openApp(lastHits[i]);
    inp.value = ""; hideDrop();
  });
  document.addEventListener("click", function (e) { if (!f.contains(e.target)) hideDrop(); });
})();
window.ZAPOS = { store: Store, version: VERSION, setHudTab: setHudTab, catalog: CATALOG.length, accounts: ACCOUNT_CATALOG.length, openDirectionsTo: openDirectionsTo, placeLL: placeLL, showMapPlaceCard: showMapPlaceCard, loadAccounts: loadAccounts, loadPlaces: loadPlaces, setGPS: function (g) { GPS = g; Store.setLocal("gps", GPS); try { updateGpsLockChip(); } catch (e) {} }, mapFollow: function (on) { MAP.follow = !!on; }, updateSkyline: updateSkyline, setUiSounds: setUiSounds, sunPeriodNow: sunPeriodNow }; // for the stage 2 sync add-on + QA

// ========== v3.1 concept chrome: menu, today ==========
var menuBtn = $("#menuBtn"); if (menuBtn) menuBtn.addEventListener("click", openMenu);
/* Work Mode removed in v3.5 — no visible effect for users */
(function bindToday() {
  var cal = $("#tdCal"), note = $("#tdNote");
  function findById(id) { return APPS.filter(function (a) { return a.id === id; })[0]; }
  if (cal) cal.addEventListener("click", function () { var a = findById("calendar"); if (a) openApp(a); else openApp({ url: "calshow://", web: "https://calendar.google.com" }); });
  if (note) note.addEventListener("click", function () { var a = findById("notes"); if (a) openApp(a); else openApp({ url: "mobilenotes://", web: "https://keep.google.com" }); });
})();


// ========== v3.8 cyberpunk pack (original designs) ==========
var UI_SOUNDS = !!Store.getLocal("uiSounds", false);
function setUiSounds(on) {
  UI_SOUNDS = !!on;
  try { Store.setLocal("uiSounds", UI_SOUNDS); } catch (e) {}
}
var _sfxCtx = null;
function sfxTone(freq, dur, type, gain) {
  if (!UI_SOUNDS || RM) return;
  if (document.visibilityState === "hidden") return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!_sfxCtx) _sfxCtx = new AC();
    if (_sfxCtx.state === "suspended") _sfxCtx.resume().catch(function () {});
    var t0 = _sfxCtx.currentTime, o = _sfxCtx.createOscillator(), g = _sfxCtx.createGain();
    o.type = type || "sine"; o.frequency.value = freq || 520;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.04, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.12));
    o.connect(g); g.connect(_sfxCtx.destination);
    o.start(t0); o.stop(t0 + (dur || 0.12) + 0.02);
  } catch (e) {}
}
function sfxTap() { sfxTone(640, 0.07, "triangle", 0.03); sfxTone(920, 0.05, "sine", 0.02); }
function sfxCharge() { sfxTone(280, 0.1, "sawtooth", 0.018); sfxTone(560, 0.12, "triangle", 0.028); }
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
    // Daily boot only (first open each calendar day). Skippable. Cap ~1.4s.
    if (RM || last === day || sess || !fx3dWanted()) { finishBoot(); }
    else {
      boot.setAttribute("aria-hidden", "false");
      var nm = ((S && S.name) || "").trim() || "operator";
      var msgs = [
        "Systems online, " + nm,
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

  try { bindHudTabs(); ensurePanelsVisible(); } catch (e) {}
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
          return;
        }
        initFx3dLayer();
      });
    }, 350);
  } catch (e) {}
  // decode / typing effect on brand
  var dec = $("#brandDecode");
  if (dec && !RM) {
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
})();


(function scrollReveal() {
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (RM || !("IntersectionObserver" in window)) {
    $$(".card").forEach(function (el) { el.classList.add("in"); });
    return;
  }
  $$(".card").forEach(function (el) { el.classList.add("reveal"); });
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".card.reveal").forEach(function (el) { io.observe(el); });
})();

(function stickyTop() {
  var top = $("#top"); if (!top) return;
  var onScroll = function () { top.classList.toggle("scrolled", (window.scrollY || document.documentElement.scrollTop) > 8); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();
// ========== 13. boot ==========
document.body.classList.add("on-home"); applyTheme(THEME.id);
renderApps(); renderNowPlaying(); try { renderNet(); } catch (e) {}
tick(); setInterval(tick, 1000);
renderWeather(); renderMarkets(); renderMap(); try { renderPlacesRow(); } catch (e) {}
window.addEventListener("offline", renderNet);
setInterval(function () { if (COINS.length > 2) { mkPage++; renderMarkets(); } }, 8000);
requestAnimationFrame(loop);
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
  checkForAppUpdate(false);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkForAppUpdate(false);
  });
  window.addEventListener("pageshow", function () { checkForAppUpdate(false); });
  window.addEventListener("focus", function () { checkForAppUpdate(false); });
  setInterval(function () {
    if (document.visibilityState === "visible") checkForAppUpdate(false);
  }, 5 * 60 * 1000);
}

// ========== v3.10 ZAP assistant (intents + voice + opt-in WebLLM) ==========
var ZAP_LLM = { engine: null, loading: false, modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", progress: 0 };
function loadAssistantPrefs() {
  var a = Store.get("assistant", null);
  if (!a || typeof a !== "object") a = { enabled: true, webllm: false, suggest: true, voiceOut: false, modelCached: false, smartMode: true };
  if (a.smartMode == null) a.smartMode = true;
  return a;
}
function saveAssistantPrefs(a) { Store.set("assistant", a); }
function hasWebGPU() {
  try { return !!(navigator.gpu); } catch (e) { return false; }
}
function hasSpeechIn() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function openZapAssistant() {
  var sheet = $("#zapSheet"); if (!sheet) return;
  sheet.hidden = false;
  try { updateZapBadge(); renderZapChips(); refreshZapAiBar(); } catch (e) {}
  try {
    if (fx3dWanted()) {
      loadFx3d().then(function (fx) {
        if (!fx) return;
        var fab = $("#zapFab");
        if (fab) fx.mountOrb(fab);
        fx.setOrbMood("idle");
      }).catch(function () {});
    }
  } catch (e) {}
  setTimeout(function () { try { $("#zapIn").focus(); } catch (e) {} }, 40);
}
function closeZapAssistant() {
  var sheet = $("#zapSheet"); if (sheet) sheet.hidden = true;
  try { stopZapListen(); } catch (e) {}
}
function updateZapBadge() {
  var b = $("#zapBadge"); if (!b) return;
  var stale = !(WX && WX.at && Date.now() - WX.at < 45 * 60000) || !(MK && MK.at && Date.now() - MK.at < 45 * 60000);
  b.textContent = navigator.onLine === false ? "OFFLINE" : (stale ? "CACHED" : "LIVE");
  b.classList.toggle("live", !stale && navigator.onLine !== false);
}
function zapAppend(role, text, action) {
  var log = $("#zapLog"); if (!log) return;
  var d = document.createElement("div");
  d.className = "zap-msg " + role;
  d.textContent = text;
  if (action && action.label && action.run) {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "zap-act"; btn.textContent = action.label;
    btn.addEventListener("click", function () { try { action.run(); } catch (e) { toast("Action failed"); } });
    d.appendChild(document.createElement("br"));
    d.appendChild(btn);
  }
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  try { if (role === "bot" && loadAssistantPrefs().voiceOut) zapSpeak(text); } catch (e) {}
}
function renderZapChips() {
  var host = $("#zapChips"); if (!host) return;
  var chips = [
    { t: "Net worth?", q: "net worth" },
    { t: "Weather", q: "weather" },
    { t: "Drive home", q: "directions to home" },
    { t: "Theme", q: "switch theme" },
    { t: "Help", q: "help" }
  ];
  host.innerHTML = "";
  chips.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = c.t;
    b.addEventListener("click", function () { zapHandle(c.q); });
    host.appendChild(b);
  });
}
function zapSpeak(text) {
  try {
    if (!window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(String(text).slice(0, 280));
    u.rate = 1.05;
    try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("speak"); } catch (e) {}
    u.onend = function () { try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("idle"); } catch (e) {} };
    u.onerror = u.onend;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  } catch (e) {}
}
var _zapRec = null, _zapListening = false;
function stopZapListen() {
  _zapListening = false;
  var mic = $("#zapMic"); if (mic) mic.classList.remove("on");
  try { if (_zapRec) _zapRec.stop(); } catch (e) {}
}
function startZapListen() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice input not supported here"); return; }
  if (_zapListening) { stopZapListen(); return; }
  _zapRec = new SR();
  _zapRec.lang = "en-US";
  _zapRec.interimResults = false;
  _zapRec.onresult = function (ev) {
    var t = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
    if (t) { var inp = $("#zapIn"); if (inp) inp.value = t; zapHandle(t); }
  };
  _zapRec.onerror = function () { stopZapListen(); };
  _zapRec.onend = function () { stopZapListen(); };
  _zapListening = true;
  var mic = $("#zapMic"); if (mic) mic.classList.add("on");
  try { _zapRec.start(); } catch (e) { stopZapListen(); toast("Mic unavailable"); }
}
function setThemeByQuery(q) {
  var map = [
    { re: /neon\s*night|neon/, id: "neon-night" },
    { re: /amber/, id: "amber-ops" },
    { re: /ghost/, id: "ghost-white" },
    { re: /\blight\b/, id: "light" },
    { re: /zapwise|default|classic/, id: "zapwise" },
    { re: /sunset/, id: "sunset" },
    { re: /terminal|green/, id: "terminal" },
    { re: /arctic|blue/, id: "arctic" },
    { re: /mono/, id: "mono" },
    { re: /pink/, id: "neon" }
  ];
  for (var i = 0; i < map.length; i++) {
    if (map[i].re.test(q)) {
      applyTheme(map[i].id); Store.set("theme", THEME.id);
      return { skill: "theme.set", text: "Theme: " + THEME.name, action: { label: "Themes", run: function () { closeZapAssistant(); openTheme(); } } };
    }
  }
  // cycle next cyber preset
  var order = ["neon-night", "amber-ops", "ghost-white"];
  var cur = THEME && THEME.id, idx = order.indexOf(cur);
  var next = order[(idx + 1) % order.length];
  applyTheme(next); Store.set("theme", THEME.id);
  return { skill: "theme.set", text: "Switched to " + THEME.name, action: { label: "Themes", run: function () { closeZapAssistant(); openTheme(); } } };
}
function routeZapIntent(raw) {
  var q = String(raw || "").trim().toLowerCase();
  if (!q) return { skill: "help", text: HELP_TEXT };
  // help
  if (/^(help|what can you|commands|\?)$/.test(q) || /\bhelp\b/.test(q) && q.length < 24) {
    return { skill: "help", text: HELP_TEXT };
  }
  // time / date
  if (/\b(what('?s| is)?\s+)?(the\s+)?(time|date|day)\b/.test(q) || /^(time|date)$/.test(q)) {
    var d = new Date();
    var line = DOW[d.getDay()] + " " + MON[d.getMonth()] + " " + d.getDate() + " · " + ((d.getHours() % 12) || 12) + ":" + pad2(d.getMinutes()) + (d.getHours() < 12 ? " AM" : " PM");
    return { skill: "time.now", text: line };
  }
  // call favorite
  if (/^call\b|\bdial\b|\bphone\b/.test(q)) {
    var want = q.replace(/^(please\s+)?(call|dial|phone)\s+(me\s+)?/, "").trim();
    var favs = FAVS || [];
    var hit = null;
    if (want) hit = favs.filter(function (f) { return (f.name || "").toLowerCase().indexOf(want) >= 0; })[0];
    if (!hit && favs.length === 1) hit = favs[0];
    if (!hit) return { skill: "call.fav", text: favs.length ? ("Say “call ” + a favorite: " + favs.map(function (f) { return f.name; }).join(", ")) : "No favorites yet. Save one from the Dialer." };
    return {
      skill: "call.fav",
      text: "Call " + hit.name + "?",
      action: { label: "Call", run: function () { closeZapAssistant(); callNum(hit.num); } }
    };
  }
  // search web
  if (/^(search|google|look up|web)\b/.test(q) || /\bsearch (the )?web\b/.test(q)) {
    var sq = q.replace(/^(please\s+)?(search( the web)?|google|look up|web)\s+(for\s+)?/, "").trim();
    if (!sq) return { skill: "web.search", text: "Say “search web …” with a query." };
    return {
      skill: "web.search",
      text: "Search the web for “" + sq + "”?",
      action: { label: "Search", run: function () { closeZapAssistant(); go("https://www.google.com/search?q=" + encodeURIComponent(sq)); } }
    };
  }
  // switch theme
  if (/\b(switch|change|set)\s+theme\b|\btheme\b.*(neon|amber|ghost|white)|^(neon night|amber ops|ghost white)$/.test(q)) {
    return setThemeByQuery(q);
  }
  // add holding / account
  if (/\b(add|new)\s+(holding|account|asset|broker)\b|\badd holding\b/.test(q)) {
    return {
      skill: "holdings.add",
      text: "Open the add-holding sheet?",
      action: { label: "Add holding", run: function () { closeZapAssistant(); try { openAddHolding(); } catch (e) { toggleXp("mk"); } } }
    };
  }
  // portfolio
  if (/net\s*worth|portfolio|balance|how much|holdings/.test(q)) {
    var st = portfolioStats();
    var txt = st.priced
      ? ("Net worth " + money(st.total) + (st.day != null ? (" · today " + signedMoney(st.day)) : ""))
      : "No priced holdings yet. Add an account from Markets.";
    return { skill: "portfolio.total", text: txt, action: { label: "Open portfolio", run: function () { closeZapAssistant(); toggleXp("mk"); } } };
  }
  // weather
  if (/weather|forecast|temperature|temp\b|rain|hot|cold/.test(q)) {
    var line = "Weather unavailable yet.";
    try {
      if (WX && WX.j) {
        var cur = WX.j.current_weather || (WX.j.current) || {};
        var t = cur.temperature != null ? cur.temperature : cur.temp;
        var place = (WX.place || "Here");
        line = place + " · " + (t != null ? (Math.round(+t) + "°") : "--");
      }
    } catch (e) {}
    return { skill: "weather.now", text: line, action: { label: "Open weather", run: function () { closeZapAssistant(); toggleXp("wx"); } } };
  }
  // directions to <place>
  if (/\b(go|drive|navigate|directions?)\b/.test(q) || /\bhome\b/.test(q) || /\bwork\b/.test(q)) {
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
      text: "Directions to " + (hitP.name || "place") + "?",
      action: { label: "Go", run: function () { closeZapAssistant(); openDirectionsTo(hitP); } }
    };
  }
  if (/places|saved places|list places/.test(q)) {
    var ps = loadPlaces();
    return { skill: "places.list", text: ps.length ? ("Saved: " + ps.map(function (p) { return p.name; }).join(", ")) : "No saved places yet." };
  }
  // apps
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
    if (!app) return { skill: "apps.open", text: "Couldn't find \"" + name + "\" in your apps." };
    return { skill: "apps.open", text: "Open " + app.name + "?", action: { label: "Open", run: function () { closeZapAssistant(); openApp(app); } } };
  }
  if (/maps|where am i|locate/.test(q)) {
    return { skill: "maps.here", text: GPS ? ("You are near " + ((PLACE && (PLACE.road || PLACE.city)) || (GPS.lat.toFixed(4) + ", " + GPS.lon.toFixed(4)))) : "Location off or still finding you.", action: { label: "Open Maps", run: function () { closeZapAssistant(); openMapsHere(); } } };
  }
  if (/focus|pomodoro|timer/.test(q)) {
    return { skill: "focus.start", text: "Start a 25-minute focus sprint?", action: { label: "Start focus", run: function () { closeZapAssistant(); try { $("#mFocus").click(); } catch (e) {} } } };
  }
  if (/btc|bitcoin|gold|paxg|markets?/.test(q)) {
    var d = MK && MK.d || {};
    var btc = d.bitcoin, gold = d["pax-gold"];
    var bits = [];
    if (btc) bits.push("BTC " + money(btc.usd));
    if (gold) bits.push("GOLD " + money(gold.usd));
    return { skill: "markets.quote", text: bits.length ? bits.join(" · ") : "Markets still loading.", action: { label: "Markets", run: function () { closeZapAssistant(); toggleXp("mk"); } } };
  }
  return { skill: "unknown", text: "Not sure. Try help, or enable private AI on a WebGPU device." };
}
var HELP_TEXT = "Commands (on-device): call <favorite>, directions to <place>, add holding, switch theme, search web <q>, time, date, weather, net worth, open <app>, focus, help. Smart mode answers free-form via Pollinations (toggle in Assistant). Private AI stays on-device.";

function refreshZapAiBar() {
  var bar = $("#zapAiBar"); if (!bar) return;
  bar.hidden = false;
  var st = $("#zapAiStatus"), btn = $("#zapAiBtn"), del = $("#zapAiDel"), prog = $("#zapAiProg"), note = $("#zapAiNote");
  var a = loadAssistantPrefs();
  var gpu = hasWebGPU();
  if (prog) { prog.hidden = !ZAP_LLM.loading; prog.value = ZAP_LLM.progress || 0; }
  if (del) del.hidden = !(a.modelCached || ZAP_LLM.engine);
  if (!gpu) {
    if (st) st.textContent = "Offline commands only";
    if (btn) { btn.hidden = true; }
    if (note) { note.hidden = false; note.textContent = "Private AI needs WebGPU. This device keeps the offline command router — nothing is sent to a server."; }
    return;
  }
  if (note) note.hidden = true;
  if (btn) btn.hidden = false;
  if (ZAP_LLM.loading) {
    if (st) st.textContent = "Downloading model… " + Math.round((ZAP_LLM.progress || 0) * 100) + "%";
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
  } else if (ZAP_LLM.engine || a.modelCached) {
    if (st) st.textContent = "Private AI ready (on-device)";
    if (btn) { btn.disabled = false; btn.textContent = a.webllm ? "AI ON" : "AI OFF"; }
  } else {
    if (st) st.textContent = "Private AI available";
    if (btn) { btn.disabled = false; btn.textContent = "Enable private AI (~1 GB)"; }
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
  toast("Private AI removed from this device");
}

async function zapAskLLM(q) {
  var engine = ZAP_LLM.engine;
  if (!engine) engine = await loadWebLLMEngine();
  var sys = "You are ZAP, a local OS assistant. Reply with ONE short helpful sentence under 40 words. Prefer concrete facts. Never invent balances. If the user wants an action (call, directions, theme, search, open app), say you can do it and keep it brief. No markdown.";
  var reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: sys },
      { role: "user", content: String(q).slice(0, 400) }
    ],
    temperature: 0.4,
    max_tokens: 96
  });
  var text = "";
  try { text = reply.choices[0].message.content; } catch (e) {}
  return String(text || "").trim() || "Got it.";
}

async function zapAskSmart(q) {
  // Pollinations Classic Text API — free, no key, CORS open. Rate-limited ~30s/IP.
  var sys = "You are ZAP for ZAPWISE//OS. Reply in under 50 words, plain text, helpful. No markdown. Do not invent account balances.";
  var url = "https://text.pollinations.ai/" + encodeURIComponent(String(q).slice(0, 320)) +
    "?system=" + encodeURIComponent(sys) + "&temperature=0.5";
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var to = setTimeout(function () { try { ctrl && ctrl.abort(); } catch (e) {} }, 20000);
  try {
    var res = await fetch(url, { method: "GET", signal: ctrl ? ctrl.signal : undefined });
    clearTimeout(to);
    if (!res.ok) {
      var retry = res.headers && res.headers.get && res.headers.get("Retry-After");
      throw new Error(res.status === 402 || res.status === 429
        ? ("Smart mode rate-limited" + (retry ? (" — retry in " + retry + "s") : ". Try again shortly."))
        : ("Smart mode HTTP " + res.status));
    }
    var txt = (await res.text()).trim();
    // strip accidental HTML wrappers
    if (txt.charAt(0) === "<") txt = txt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return txt.slice(0, 600) || "No answer.";
  } catch (e) {
    clearTimeout(to);
    throw e;
  }
}

function zapHandle(raw) {
  var q = String(raw || "").trim();
  if (!q) return;
  var inp = $("#zapIn"); if (inp) inp.value = "";
  zapAppend("user", q);
  var intent = routeZapIntent(q);
  if (intent.skill !== "unknown") {
    zapAppend("bot", intent.text, intent.action);
    updateZapBadge();
    return;
  }
  var a = loadAssistantPrefs();
  // Private on-device model first when enabled + ready
  if (a.webllm && hasWebGPU() && (ZAP_LLM.engine || a.modelCached)) {
    zapAppend("bot", "Thinking on-device…");
    var p = ZAP_LLM.engine ? zapAskLLM(q) : loadWebLLMEngine().then(function () { return zapAskLLM(q); });
    p.then(function (txt) {
      var log = $("#zapLog");
      if (log && log.lastChild && log.lastChild.classList.contains("bot")) log.removeChild(log.lastChild);
      zapAppend("bot", txt);
      updateZapBadge();
    }).catch(function (err) {
      var log = $("#zapLog");
      if (log && log.lastChild && log.lastChild.classList.contains("bot")) log.removeChild(log.lastChild);
      if (a.smartMode) {
        zapAppend("bot", "Private AI failed — trying Smart mode…");
        zapAskSmart(q).then(function (txt) {
          var log2 = $("#zapLog");
          if (log2 && log2.lastChild && log2.lastChild.classList.contains("bot")) log2.removeChild(log2.lastChild);
          zapAppend("bot", txt);
          updateZapBadge();
        }).catch(function (e2) {
          var log3 = $("#zapLog");
          if (log3 && log3.lastChild && log3.lastChild.classList.contains("bot")) log3.removeChild(log3.lastChild);
          zapAppend("bot", "Couldn't reach AI. " + (e2 && e2.message ? e2.message : "Try help for offline commands."));
          updateZapBadge();
        });
      } else {
        zapAppend("bot", "On-device AI failed. Try help for offline commands.");
        updateZapBadge();
      }
    });
    return;
  }
  // Default Smart mode (Pollinations) for free-form help
  if (a.smartMode) {
    try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("think"); } catch (e) {}
    zapAppend("bot", "Smart mode…");
    zapAskSmart(q).then(function (txt) {
      try { if (window.ZAPFX3D) window.ZAPFX3D.setOrbMood("idle"); } catch (e) {}
      var log = $("#zapLog");
      if (log && log.lastChild && log.lastChild.classList.contains("bot")) log.removeChild(log.lastChild);
      zapAppend("bot", txt);
      updateZapBadge();
    }).catch(function (err) {
      var log = $("#zapLog");
      if (log && log.lastChild && log.lastChild.classList.contains("bot")) log.removeChild(log.lastChild);
      zapAppend("bot", (err && err.message ? err.message : "Smart mode unavailable.") + " Offline commands still work — try help.");
      updateZapBadge();
    });
    return;
  }
  zapAppend("bot", intent.text);
  updateZapBadge();
}
(function bindZapAssistant() {
  var fab = $("#zapFab"); if (fab) fab.addEventListener("click", openZapAssistant);
  var close = $("#zapClose"); if (close) close.addEventListener("click", closeZapAssistant);
  var form = $("#zapForm");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); zapHandle(($("#zapIn") && $("#zapIn").value) || ""); });
  var mic = $("#zapMic");
  if (mic) {
    if (!hasSpeechIn()) { mic.hidden = true; mic.setAttribute("aria-hidden", "true"); }
    else mic.addEventListener("click", startZapListen);
  }
  var mute = $("#zapMute");
  if (mute) mute.addEventListener("click", function () {
    var a = loadAssistantPrefs();
    a.voiceOut = !a.voiceOut;
    saveAssistantPrefs(a);
    mute.setAttribute("aria-pressed", a.voiceOut ? "true" : "false");
    mute.textContent = a.voiceOut ? "🔊" : "🔇";
    toast(a.voiceOut ? "Voice replies on" : "Voice replies muted");
  });
  var aiBtn = $("#zapAiBtn");
  if (aiBtn) aiBtn.addEventListener("click", function () {
    var a = loadAssistantPrefs();
    if (!hasWebGPU()) { toast("WebGPU not available on this device"); return; }
    if (ZAP_LLM.engine && a.webllm) {
      a.webllm = false; saveAssistantPrefs(a); refreshZapAiBar(); toast("Private AI paused — commands still work"); return;
    }
    if (ZAP_LLM.engine && !a.webllm) {
      a.webllm = true; saveAssistantPrefs(a); refreshZapAiBar(); toast("Private AI on"); return;
    }
    if (!confirm("Enable private AI? Downloads ~1 GB once, stays on this device, nothing is sent to any server, no API keys.")) return;
    loadWebLLMEngine().then(function () {
      toast("Private AI ready");
      refreshZapAiBar();
    }).catch(function (err) {
      toast("AI download failed: " + (err && err.message ? err.message : "error"));
      refreshZapAiBar();
    });
  });
  var del = $("#zapAiDel");
  if (del) del.addEventListener("click", function () {
    if (!confirm("Delete the on-device AI model from this device?")) return;
    deleteWebLLMCache();
  });
  var smart = $("#zapSmart");
  if (smart) {
    try { smart.checked = !!loadAssistantPrefs().smartMode; } catch (e) { smart.checked = true; }
    smart.addEventListener("change", function () {
      var a = loadAssistantPrefs();
      a.smartMode = !!smart.checked;
      saveAssistantPrefs(a);
      toast(a.smartMode ? "Smart mode on — free-form goes to Pollinations" : "Smart mode off — offline commands only");
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
  window.ZAPOS.openZap = openZapAssistant;
  window.ZAPOS.routeZap = routeZapIntent;
} catch (e) {}
if (!Store.getLocal("seenHelp", false) && !(window.navigator.standalone === true)) { Store.setLocal("seenHelp", true); setTimeout(function () { toast("Tip: MENU → Help shows how to add this to your Home Screen"); }, 1500); }
})();
