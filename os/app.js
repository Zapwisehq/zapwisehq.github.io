/* ZAPWISE//OS web app v3.4.0 (Nov 4, 2026). Concept layout + live map. Static, no build step, no API keys.
   Data: Open-Meteo (weather + city search), api-bdc.io (city name for weather), CoinGecko (crypto + PAX Gold),
   OSM standard tiles (keyless, CSS dark filter) + Nominatim reverse geocoding (road + city, cached, re-queried only after moving > 40 m).

   SECTIONS
     1  config + DOM helpers        6  clock, meters, focus timer   11  sheets: menu, edit apps, add app,
     2  STATE (one versioned store)  7  weather FX (canvas)              theme, city, watchlist, settings, help
     3  themes                       8  weather data                12  return-to-app (restore view + scroll)
     4  apps: data + migration       9  markets                     13  boot
     5  apps: icons, open, render   10  map + tabs

   STATE: everything the user chooses lives in ONE object, zapos.state = { v, updatedAt, prefs, ui }.
     prefs = settings, theme, apps (list, order, on/off), coins (watchlist), loc (GPS mode or a saved city).
     ui    = last view + scroll position of each view.
   Live GPS coordinates, the street name, weather/market caches and the focus timer stay on this device only, in
   zapos.device, and never go in the shared state. Stage 2 (sync) plugs in through Store.onChange / Store.snapshot /
   Store.applyRemote below. */
(function () {
"use strict";
var VERSION = "3.4.0";
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
  var PREF_KEYS = ["settings", "theme", "apps", "coins", "loc", "favs"];                     // shared state (sync-ready)
  var DEVICE_KEYS = ["gps", "place", "wx", "mk", "focus", "seenHelp", "gpsLoc", "themeCss", "mediaKey", "workMode", "skipBoot", "recentPins"]; // this device only
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
  { id: "neon", name: "NEON PINK", sub: "Hot pink and violet on deep plum", v: { void: "#10040f", panel: "#1d0a1f", panel2: "#28102b", cream: "#fde9f6", amber: "#ffd166", cyan: "#ff4fd8", magenta: "#9d7bff", dim: "#8f7393", on: "#10040f" } },
  { id: "terminal", name: "TERMINAL GREEN", sub: "Green phosphor on black", v: { void: "#020a05", panel: "#07170d", panel2: "#0b2013", cream: "#d8ffe2", amber: "#c6ff3d", cyan: "#3dff7e", magenta: "#7affc8", dim: "#57805f", on: "#020a05" } },
  { id: "arctic", name: "ARCTIC BLUE", sub: "Ice blue on midnight navy", v: { void: "#03101d", panel: "#081c30", panel2: "#0c253d", cream: "#eaf6ff", amber: "#a8e1ff", cyan: "#47a8ff", magenta: "#b9a6ff", dim: "#6d88a3", on: "#03101d" } },
  { id: "sunset", name: "SUNSET ORANGE", sub: "Warm orange and coral on dusk", v: { void: "#140806", panel: "#22100b", panel2: "#2d160f", cream: "#fff0e3", amber: "#ffc04d", cyan: "#ff7a3d", magenta: "#ff4f7b", dim: "#94705f", on: "#140806" } },
  { id: "mono", name: "MONO", sub: "Black, white and grey", v: { void: "#0a0a0b", panel: "#161618", panel2: "#1f1f22", cream: "#f2f2f2", amber: "#ffffff", cyan: "#cfcfd4", magenta: "#9a9aa2", dim: "#76767e", on: "#0a0a0b" } },
  { id: "light", name: "LIGHT", sub: "Dark text on a bright page", light: true, v: { void: "#f1efe9", panel: "#ffffff", panel2: "#e7e4dc", cream: "#16181e", amber: "#b45a00", cyan: "#0a6f8c", magenta: "#b0186e", dim: "#666c79", on: "#ffffff" } }
];
function hexRgb(h) { var n = parseInt(h.slice(1), 16); return (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255); }
var THEME = THEMES[0];
function applyTheme(id) {
  var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0], st = document.documentElement.style;
  Object.keys(t.v).forEach(function (k) { st.setProperty("--" + k, t.v[k]); st.setProperty("--" + k + "-rgb", hexRgb(t.v[k])); });
  // v3.1 layout tokens
  st.setProperty("--bg", t.v.void); st.setProperty("--ink", t.v.cream);
  st.setProperty("--muted", "rgba(" + hexRgb(t.v.cream) + ",.58)");
  st.setProperty("--dim", "rgba(" + hexRgb(t.v.cream) + ",.38)");
  document.documentElement.classList.toggle("light", !!t.light);
  if (document.body) document.body.classList.toggle("light", !!t.light);
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t.v.void);
  THEME = t;
  var css = ":root{" + Object.keys(t.v).map(function (k) { return "--" + k + ":" + t.v[k] + ";--" + k + "-rgb:" + hexRgb(t.v[k]); }).join(";") +
    ";--bg:" + t.v.void + ";--ink:" + t.v.cream + "}";
  Store.setLocal("themeCss", { light: !!t.light, css: css, meta: t.v.void });
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
  // Maps: use geo: on Android, maps:// on iOS, Google Maps website everywhere else
  if (a.id === "maps" || a.mapsHere) {
    var ll = a.ll || "";
    if (ANDROID) {
      url = ll ? ("geo:" + ll + "?q=" + ll) : "geo:0,0?q=";
      a = Object.assign({}, a, { url: url, web: ll ? ("https://www.google.com/maps?q=" + encodeURIComponent(ll)) : "https://www.google.com/maps" });
    } else if (IOS) {
      url = ll ? ("maps://?ll=" + ll + "&q=" + encodeURIComponent("You are here")) : "maps://";
      a = Object.assign({}, a, { url: url, web: ll ? ("https://maps.apple.com/?ll=" + ll + "&q=" + encodeURIComponent("You are here")) : "https://maps.apple.com/" });
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
  // Android: prefer intent:// (+ package when known) with browser fallback so Chrome doesn't stall
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
  // Android https + package: try market-free package launch via intent, else web
  if (ANDROID && a.pkg && /^https?:/i.test(url)) {
    try {
      location.href = "intent://#Intent;package=" + a.pkg + ";S.browser_fallback_url=" + encodeURIComponent(fb || url) + ";end";
      return;
    } catch (e) {}
  }
  var left = false;
  function gone() { left = true; }
  document.addEventListener("visibilitychange", gone, { once: true });
  window.addEventListener("pagehide", gone, { once: true });
  window.addEventListener("blur", gone, { once: true });
  location.href = url;
  setTimeout(function () {
    document.removeEventListener("visibilitychange", gone); window.removeEventListener("pagehide", gone); window.removeEventListener("blur", gone);
    if (!left && document.visibilityState === "visible") location.href = fb;
  }, 1200);
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
  var part = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";
  var nm = (S.name || "").trim() || "Snowfall";
  $("#greet").textContent = part + ", " + nm;
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
function renderNet() { var on = navigator.onLine !== false; var el = $("#hSync"); if (el) { el.classList.toggle("off", !on); if (!on) el.innerHTML = "<i aria-hidden=\"true\"></i>OFFLINE"; } }

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
  if (artist) artist.textContent = "Tap to switch · ▶ opens app";
  if (live) live.textContent = "MUSIC ▾";
  var bar = $("#npBar"); if (bar) bar.style.width = "0%";
  var cur = $("#npCur"); if (cur) cur.textContent = "0:00";
  var dur = $("#npDur"); if (dur) dur.textContent = "—";
}
function setMediaKey(k, open) {
  if (!MEDIA[k]) return;
  MEDIA_KEY = k;
  try { Store.setLocal("mediaKey", MEDIA_KEY); } catch (e) {}
  renderNowPlaying();
  toast(MEDIA[k].name);
  if (open) openApp(MEDIA[k]);
}
function cycleMedia(dir) {
  var i = HUB.indexOf(MEDIA_KEY); if (i < 0) i = 0;
  i = (i + dir + HUB.length) % HUB.length;
  setMediaKey(HUB[i], false);
}
$("#hPlay").addEventListener("click", function (e) {
  var b = e.target.closest("[data-media-act]"); if (!b) return;
  e.preventDefault();
  var act = b.getAttribute("data-media-act");
  if (act === "prev") cycleMedia(-1);
  else if (act === "next") cycleMedia(1);
  else if (act === "play") openApp(currentMedia());
  else if (act === "pick") openMedia();
});
function openMedia() {
  var html = '<p class="note" style="margin-bottom:10px">Pick your music app. We open the app on your phone if it\'s installed, otherwise its website — never the App Store.</p>' +
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
    c.fillStyle = THEME.v.panel; c.beginPath(); c.arc(W * .84 + Math.min(W, H) * .035, H * .2 - Math.min(W, H) * .02, Math.min(W, H) * .075, 0, 6.283); c.fill();
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
  if (c === 0) return day ? "☀️" : "🌙"; if (c === 1) return day ? "🌤️" : "🌙"; if (c === 2) return "⛅"; if (c === 3) return "☁️";
  if (c <= 48) return "🌫️"; if (c <= 57) return "🌦️"; if (c <= 67) return "🌧️"; if (c <= 77) return "🌨️";
  if (c <= 82) return "🌧️"; if (c <= 86) return "🌨️"; return "⛈️";
}
var FX_DEBUG = { rain: [63, 1], snow: [73, 1], sun: [0, 1], night: [0, 0], cloud: [3, 1], storm: [95, 1], fog: [45, 1] };

// ========== 8. weather data ==========
var WX = Store.getLocal("wx", null);
function unitQ() { return S.units === "C" ? "&temperature_unit=celsius&wind_speed_unit=kmh" : "&temperature_unit=fahrenheit&wind_speed_unit=mph"; }
function getJSON(url, ms) {
  var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, ms || 12000);
  return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
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
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
      "&hourly=temperature_2m,weather_code,is_day,precipitation_probability" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset" +
      unitQ() + "&timezone=auto&forecast_days=6";
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
  if (!WX || !WX.j) { if (fk) { fxHud.set(FORCE_FX); fxMain.set(FORCE_FX); } return; }
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
  $("#hwIc").textContent = wxEmoji(code, day);
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
  $("#wxHours").innerHTML = hs;
  var ds = "";
  for (var d = 0; d < 5 && d < j.daily.time.length; d++) {
    var dt = new Date(j.daily.time[d] + "T12:00:00"), nm = d === 0 ? "TODAY" : dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    var dc = j.daily.weather_code[d];
    ds += '<div class="day"><span class="d">' + nm + '</span><span>' + wxEmoji(dc, true) + '</span><span class="c">' + wxText(dc) + '</span><span class="r">' + (j.daily.precipitation_probability_max[d] || 0) + '%</span><span class="t">' + Math.round(j.daily.temperature_2m_max[d]) + '° <span>/ ' + Math.round(j.daily.temperature_2m_min[d]) + '°</span></span></div>';
  }
  $("#wxDays").innerHTML = ds;
  $("#xpHours").innerHTML = hs; $("#xpDays").innerHTML = ds;
  $("#xpPlace").textContent = "➤ " + WX.place.toUpperCase();
  $("#xpNote").textContent = $("#wxNote").textContent;
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
  if (!COINS.length) { renderMarkets(); return; }
  var ids = COINS.map(function (c) { return c.id; }).join(",");
  getJSON("https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(ids) + "&vs_currencies=usd&include_24hr_change=true")
    .then(function (j) { MK = { at: Date.now(), d: Object.assign({}, MK && MK.d, j) }; Store.setLocal("mk", MK); mkErr = false; })
    .catch(function () { mkErr = true; })
    .then(renderMarkets);
}
function chHTML(ch) { if (ch == null || isNaN(ch)) return '<span class="dim">--</span>'; return '<span class="' + (ch >= 0 ? "up" : "dn") + '">' + (ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(2) + "%</span>"; }
function sparkSVG(ch, seed) {
  // Lightweight sparkline from 24h change (no extra API key). Seed keeps shape stable per coin.
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
function renderMarkets() {
  var d = MK && MK.d || {}, list = "", mini = "";
  COINS.forEach(function (c, i) {
    var q = d[c.id];
    list += '<div class="row"><span class="sym">' + esc(c.sym) + '</span><span class="grow">' + esc(c.name) + '</span><span class="px">' + (q ? money(q.usd) : "--") + '</span><span class="ch">' + (q ? chHTML(q.usd_24h_change) : "") + "</span></div>";
  });
  var pages = Math.max(1, Math.ceil(COINS.length / 2)), pg = mkPage % pages;
  COINS.slice(pg * 2, pg * 2 + 2).forEach(function (c, i) {
    var q = d[c.id], ch = q ? q.usd_24h_change : null;
    mini += '<div class="mk-row"><span class="sym">' + esc(c.sym) + '</span><span>' + sparkSVG(ch, (c.id || "").length + i) +
      '<div class="px">' + (q ? money(q.usd) : "--") + '</div></span><span class="ch ' + ((ch == null || isNaN(ch)) ? "" : (ch >= 0 ? "up" : "dn")) + '">' +
      ((ch == null || isNaN(ch)) ? "--" : ((ch >= 0 ? "+" : "") + ch.toFixed(2) + "%")) + "</span></div>";
  });
  if (!COINS.length) { list = '<p class="offline">Your watchlist is empty. Tap ✎ EDIT to add a coin.</p>'; mini = '<span class="dim">WATCHLIST EMPTY · TAP TO ADD</span>'; }
  if (mkErr && !(MK && MK.at)) { list = '<p class="offline">Markets offline. We\'ll retry in 2 minutes.</p>'; mini = '<span class="dim">MARKETS OFFLINE · RETRYING</span>'; }
  else if (mkErr) list += '<p class="offline">Couldn\'t refresh. Showing the last prices we saved.</p>';
  var mk = $("#mkList"); if (mk) mk.innerHTML = list;
  $("#hMkList").innerHTML = mini; $("#xpMkList").innerHTML = list;
  try {
    var rows = COINS.map(function (c) {
      var q = d[c.id];
      return { sym: c.sym, name: c.name, price: q ? money(q.usd) : "--", chg: q ? q.usd_24h_change : 0 };
    });
    if (typeof paintTicker === "function") paintTicker(rows);
  } catch (e) {}
  updateStamps();
}
function updateStamps() {
  var st = function (el, at) { if (!el) return; if (!at) { el.textContent = "UPDATED --"; el.classList.add("old"); return; } el.textContent = "UPDATED " + t12(new Date(at)); el.classList.toggle("old", Date.now() - at > 30 * 60000); };
  st($("#wxStamp"), WX && WX.at); st($("#mkStamp"), MK && MK.at); st($("#xpMkStamp"), MK && MK.at);
  var sh = function (el, at, pre) { el.textContent = pre + (at ? short12(at) : "--"); el.classList.toggle("old", !at || Date.now() - at > 30 * 60000); };
  sh($("#hwUpd"), WX && WX.at, "UPD "); sh($("#hMkT"), MK && MK.at, "");
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
var MAP = { z: 16, offX: 0, offY: 0, dragging: false, moved: false, last: null };
function meters(a, b) { var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function setGPS(lat, lon) { GPS = { lat: lat, lon: lon, at: Date.now() }; Store.setLocal("gps", GPS); GEO_OFF = false; renderMap(true); updateStamps(); geocode(); }
function geocode() {
  if (!GPS || nomBusy || navigator.onLine === false) return;
  if (PLACE && meters(PLACE, GPS) <= 40) return;
  if (Date.now() - nomLast < 60000) return;
  nomBusy = true; nomLast = Date.now();
  getJSON("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=" + GPS.lat.toFixed(5) + "&lon=" + GPS.lon.toFixed(5), 10000)
    .then(function (j) {
      var a = j && j.address || {};
      var road = a.road || a.pedestrian || a.footway || a.path || a.residential || a.neighbourhood || a.hamlet || "";
      var city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || "";
      PLACE = { road: road.toUpperCase(), city: city.toUpperCase(), lat: GPS.lat, lon: GPS.lon, at: Date.now() }; Store.setLocal("place", PLACE);
    }).catch(function () {}).then(function () { nomBusy = false; renderPlace(); });
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
function renderMap(force) {
  renderPlace();
  var v = $("#mapV"), tl = $("#mapTiles"), msg = $("#mapMsg"), stage = $("#mapStage");
  if (!v || !tl) return;
  if (!GPS) {
    tl.innerHTML = ""; if ($("#mapDot")) $("#mapDot").hidden = true;
    if (msg) { msg.hidden = false; msg.textContent = GEO_OFF ? "LOCATION OFF · ALLOW IT IN SETTINGS TO SEE THE MAP" : "LOCATING…"; }
    return;
  }
  var W = v.clientWidth, H = v.clientHeight; if (!W || !H) return;
  var z = Math.max(3, Math.min(19, MAP.z | 0));
  var world = lonLatToWorld(GPS.lon, GPS.lat, z);
  var cx = world.x + MAP.offX, cy = world.y + MAP.offY;
  var ox = cx - W / 2, oy = cy - H / 2;
  var key = z + ":" + Math.round(ox) + ":" + Math.round(oy) + ":" + W + "x" + H;
  if (!force && MAP._key === key) return;
  MAP._key = key;
  var n = world.n, html = "";
  var x0 = Math.floor(ox / 256) - 1, x1 = Math.floor((ox + W) / 256) + 1;
  var y0 = Math.floor(oy / 256) - 1, y1 = Math.floor((oy + H) / 256) + 1;
  for (var ty = y0; ty <= y1; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (var tx = x0; tx <= x1; tx++) {
      var xx = ((tx % n) + n) % n;
      html += '<img alt="" decoding="async" draggable="false" src="' + tileUrl(z, xx, ty) + '" style="transform:translate(' + Math.round(tx * 256 - ox) + "px," + Math.round(ty * 256 - oy) + 'px)" loading="eager" onerror="this.style.opacity=0">';
    }
  }
  tl.innerHTML = html;
  if ($("#mapDot")) $("#mapDot").hidden = false;
  if (msg) msg.hidden = true;
  // keep user dot centered relative to GPS vs pan offset
  var dot = $("#mapDot");
  if (dot) {
    var dx = W / 2 - MAP.offX, dy = H / 2 - MAP.offY;
    dot.style.left = dx + "px";
    dot.style.top = dy + "px";
    dot.style.marginLeft = "-7px";
    dot.style.marginTop = "-7px";
  }
}
function mapRecenter() { MAP.offX = 0; MAP.offY = 0; MAP.z = 16; renderMap(true); toast("Centered on you"); }
function mapZoom(d) {
  var next = Math.max(3, Math.min(19, (MAP.z | 0) + d));
  if (next === MAP.z) return;
  // scale offset when zooming so focal point stays
  var f = Math.pow(2, next - MAP.z);
  MAP.offX *= f; MAP.offY *= f; MAP.z = next; renderMap(true);
}
(function bindMapGestures() {
  var v = $("#mapV"); if (!v) return;
  var startX = 0, startY = 0, baseOffX = 0, baseOffY = 0, pin0 = null;
  function pt(e) { var t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
  function onDown(e) {
    if (e.target.closest(".map-tool,.map-attr,.map-open")) return;
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
      if (nz !== MAP.z) { var f = Math.pow(2, nz - MAP.z); MAP.offX *= f; MAP.offY *= f; MAP.z = nz; pin0.dist = dist; pin0.z = nz; renderMap(true); }
      MAP.moved = true; return;
    }
    var p = pt(e);
    var dx = p.x - startX, dy = p.y - startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) MAP.moved = true;
    if (MAP.moved) {
      if (e.cancelable) e.preventDefault();
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
function refreshGPS() { getPos().catch(function () {}); }
function openMapsHere() {
  if (!GPS) { toast(GEO_OFF ? "Turn on Location for this app to see where you are" : "Still finding you…"); return; }
  var ll = GPS.lat.toFixed(6) + "," + GPS.lon.toFixed(6);
  openApp({ id: "maps", mapsHere: true, ll: ll, name: "Maps" });
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
var VIEWS = ["home", "weather", "markets"], VIEW = "home";
function show(tab) {
  if (tab === "menu") { openMenu(); return; }
  if (tab === "weather" && !Q.get("fx")) tab = "home"; if (tab === "markets") tab = "home"; // v3: cards expand on the main screen
  if (VIEWS.indexOf(tab) < 0) tab = "home";
  VIEW = tab;
  VIEWS.forEach(function (t) { $("#v-" + t).hidden = t !== tab; });
  document.body.classList.toggle("on-home", tab === "home");
  Store.setUI({ view: tab }); restoreScroll();
  if (tab === "home") setTimeout(function () { renderMap(true); }, 0);
  $$(".tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
}
$$(".tab").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-tab")); }); });
$("#hWx").addEventListener("click", function () { toggleXp("wx"); });
$("#hMk").addEventListener("click", function () { toggleXp("mk"); });
function toggleXp(k) {
  var el = $(k === "wx" ? "#xpWx" : "#xpMk"), btn = $(k === "wx" ? "#hWx" : "#hMk"), open = el.hidden;
  el.hidden = !open; btn.setAttribute("aria-expanded", String(open));
  if (open) { if (k === "wx") renderWeather(); else renderMarkets(); setTimeout(function () { try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }, 30); }
  setTimeout(function () { renderMap(true); }, 0);
}
$("#xpCity").addEventListener("click", function () { openCity(); });
$("#xpMkEdit").addEventListener("click", function () { openEditCoins(); });

// ========== 11. sheets ==========
function sheet(title, html, bind) {
  // fresh body each time: listeners bound by the previous sheet must not fire here (the music list's
  // [data-m] handler used to close Edit Apps when you tapped ↑/↓/toggle, which also use data-m)
  var old = $("#sheetBody"), nb = old.cloneNode(false); old.parentNode.replaceChild(nb, old);
  $("#sheetTitle").textContent = title; nb.innerHTML = html; $("#sheet").hidden = false; $("#scrim").hidden = false;
  if (bind) bind($("#sheetBody"));
}
function closeSheet() { $("#sheet").hidden = true; $("#scrim").hidden = true; }
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
    "<h3>SETTINGS</h3>" + row("⚙", "Settings", "Your name, °F / °C, reset", "settings") +
    "<h3>HELP</h3>" + row("?", "Add to Home Screen", "3 steps to open it like a real app", "help") +
    '<p class="note" style="margin-top:12px">ZAPWISE//OS v' + VERSION + " · Everything you change is saved on this device only.</p>",
    function (b) {
      b.addEventListener("click", function (e) {
        var g = e.target.closest("[data-go]"); if (!g) return; var k = g.getAttribute("data-go");
        if (k === "apps") openEditApps(); else if (k === "city") openCity(); else if (k === "coins") openEditCoins(); else if (k === "settings") openSettings(); else openHelp();
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
  { id: "social", name: "Social", match: /instagram|tiktok|facebook|snapchat|threads|reddit|linkedin|pinterest|bluesky|mastodon|tumblr|lemon8|bereal|beReal|vsco/i },
  { id: "msg", name: "Chat", match: /whatsapp|messenger|telegram|discord|signal|slack|teams|skype|line|wechat|viber|groupme|messages/i },
  { id: "music", name: "Music", match: /spotify|music|pandora|soundcloud|deezer|tidal|shazam|bandcamp|audible|podcast/i },
  { id: "video", name: "Video", match: /youtube|netflix|twitch|hulu|disney|max|peacock|paramount|primevideo|tubi|crunchyroll|vimeo|roku|appletv|plex/i },
  { id: "money", name: "Money", match: /venmo|cash|paypal|zelle|coinbase|binance|robinhood|chase|bank|amex|capital|chime|stripe|mint|creditkarma|wells|quickbooks|applepay|googlepay|1password|bitwarden|lastpass/i },
  { id: "work", name: "Work", match: /gmail|outlook|drive|docs|sheets|slides|notion|trello|asana|todoist|evernote|dropbox|onedrive|github|gitlab|figma|word|excel|powerpoint|calendar|mail|zoom|meet/i },
  { id: "ai", name: "AI", match: /chatgpt|claude|gemini|grok|perplexity|copilot|character|midjourney|runway|eleven|poe|openai/i },
  { id: "travel", name: "Travel", match: /uber|lyft|maps|waze|airbnb|booking|expedia|kayak|tripadvisor|delta|united|southwest|american|flightradar|citymapper|tesla|gasbuddy/i },
  { id: "food", name: "Food", match: /doordash|ubereats|grubhub|instacart|starbucks|mcdonald|chipotle|opentable|resy|yelp|toast/i },
  { id: "shop", name: "Shop", match: /amazon|ebay|etsy|walmart|target|costco|shein|temu|poshmark|bestbuy|shopify|aliexpress/i },
  { id: "games", name: "Games", match: /fortnite|roblox|minecraft|steam|xbox|playstation|twitchigdb/i }
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
    '<h3>CUSTOM APP</h3>' +
    '<label class="field">NAME<input id="caName" maxlength="14" placeholder="e.g. Instagram" autocomplete="off"></label>' +
    '<label class="field">LINK OR APP LINK<input id="caUrl" placeholder="e.g. instagram.com or instagram://" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="field">ICON</div><div class="glyphs" id="caG"></div>' +
    '<div class="field">COLOR</div><div class="colors" id="caC"></div>' +
    '<button class="btn" id="caAdd">＋ ADD CUSTOM APP</button>';
  sheet("＋ ADD APP", html, function (b) {
    var gSel = "letter", cSel = CUSTOM_COLORS[0], cat = "all", recent = [];
    try { recent = Store.getLocal("recentPins", []) || []; } catch (e) { recent = []; }
    function has(c) { return APPS.some(function (a) { return a.id === "p-" + c.id || a.id === c.id || (a.name && a.name === c.name); }); }
    function saveRecent(id) {
      recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 12);
      try { Store.setLocal("recentPins", recent); } catch (e) {}
    }
    function drawCats() {
      var chips = [{ id: "all", name: "All" }].concat(APP_CATS).concat([{ id: "more", name: "More" }]);
      b.querySelector("#pkCats").innerHTML = chips.map(function (c) {
        return '<button type="button" class="cat-chip' + (c.id === cat ? " on" : "") + '" data-cat="' + c.id + '" role="tab" aria-selected="' + (c.id === cat) + '">' + esc(c.name) + "</button>";
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

// ----- settings -----
function openSettings() {
  sheet("⚙ SETTINGS",
    '<label class="field">YOUR NAME (FOR THE GREETING)<input id="stName" maxlength="20" placeholder="e.g. Sam" value="' + esc(S.name) + '" autocomplete="off"></label>' +
    '<div class="field">TEMPERATURE</div><div class="seg" id="stU"><button data-v="F">°F · mph</button><button data-v="C">°C · km/h</button></div>' +
    '<button class="btn" id="stSave">SAVE</button>' +
    '<h3>RESET</h3><button class="btn warn" id="stReset">Reset everything to defaults</button>',
    function (b) {
      var u = S.units;
      function seg() { $$("#stU button", b).forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-v") === u); }); }
      b.querySelector("#stU").addEventListener("click", function (e) { var x = e.target.closest("[data-v]"); if (x) { u = x.getAttribute("data-v"); seg(); } });
      b.querySelector("#stSave").addEventListener("click", function () {
        var uc = u !== S.units; S.name = b.querySelector("#stName").value.trim().slice(0, 20); S.units = u; Store.set("settings", S);
        minute(new Date()); closeSheet(); toast("Saved"); if (uc) refreshWeather(true);
      });
      b.querySelector("#stReset").addEventListener("click", function () {
        if (!confirm("Reset apps, watchlist, weather city and settings to the defaults?")) return;
        Store.reset(); location.reload();
      });
      seg();
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
    '<h3>GOOD TO KNOW</h3><p class="note">One tap opens an app if it\'s installed. If it isn\'t, its website opens after about a second. On a computer the website opens in a new tab. The live map shows your area from your location (OpenStreetMap tiles); tap it to open Maps. Weather asks for location once; tap Allow, or set a city in the menu. Your choices stay on this device only.</p>',
    null);
}

// ========== 12. return-to-app: keep the exact view + scroll, refresh live data quietly ==========
function saveScroll(now) {
  var sc = Object.assign({}, Store.ui().scroll);
  VIEWS.forEach(function (t) { var v = $("#v-" + t); if (!v.hidden) sc[t] = Math.round(v.scrollTop); });
  Store.setUI({ view: VIEW, scroll: sc }, now);
}
function restoreScroll() {
  var y = (Store.ui().scroll || {})[VIEW] || 0, v = $("#v-" + VIEW);
  if (Math.abs(v.scrollTop - y) > 1) v.scrollTop = y;
}
VIEWS.forEach(function (t) { $("#v-" + t).addEventListener("scroll", function () { saveScroll(false); }, { passive: true }); });
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
function openDial() {
  var num = "";
  var keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  var html = '<div class="dl-num" id="dlNum" aria-live="polite">&nbsp;</div>' +
    '<div class="dl-pad" id="dlPad">' + keys.map(function (k) { return '<button class="dl-k" data-k="' + k[0] + '" aria-label="' + k[0] + '"><b>' + k[0] + "</b><small>" + k[1] + "</small></button>"; }).join("") + "</div>" +
    '<div class="dl-act"><button class="dl-sv" id="dlSave" aria-label="Save as favorite">☆</button><button class="dl-call" id="dlCall" aria-label="Call">📞 CALL</button><button class="dl-sv" id="dlDel" aria-label="Delete last digit">⌫</button></div>' +
    '<h3>FAVORITES</h3><div id="dlFavs"></div>' +
    '<p class="note" style="margin-top:10px">Call opens your phone\'s call screen with the number ready. Favorites are saved on this device.</p>';
  sheet("📞 PHONE", html, function (b) {
    function draw() { b.querySelector("#dlNum").textContent = num ? fmtNum(num) : "\u00a0"; }
    function drawFavs() {
      b.querySelector("#dlFavs").innerHTML = FAVS.length ? FAVS.map(function (f, i) {
        return '<div class="dl-fav"><span class="grow"><b>' + esc(f.name) + "</b><small>" + esc(fmtNum(f.num)) + '</small></span>' +
          '<button class="sq" data-f="text" data-i="' + i + '" aria-label="Text ' + esc(f.name) + '">💬</button>' +
          '<button class="sq" data-f="call" data-i="' + i + '" aria-label="Call ' + esc(f.name) + '" style="color:var(--green)">📞</button>' +
          '<button class="sq" data-f="del" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '" style="color:var(--red)">✕</button></div>';
      }).join("") : '<p class="note">No favorites yet. Type a number and tap ☆ to save it.</p>';
    }
    b.querySelector("#dlPad").addEventListener("click", function (e) { var k = e.target.closest("[data-k]"); if (!k || num.length >= 20) return; num += k.getAttribute("data-k"); draw(); });
    b.querySelector("#dlDel").addEventListener("click", function () { num = num.slice(0, -1); draw(); });
    b.querySelector("#dlCall").addEventListener("click", function () { callNum(num); });
    b.querySelector("#dlSave").addEventListener("click", function () {
      if (!cleanNum(num)) { toast("Type a number first"); return; }
      var nm = (prompt("Name for this favorite?") || "").trim().slice(0, 24); if (!nm) return;
      FAVS.push({ name: nm, num: cleanNum(num) }); saveFavs(); drawFavs(); toast(nm + " saved to favorites");
    });
    b.querySelector("#dlFavs").addEventListener("click", function (e) {
      var x = e.target.closest("[data-f]"); if (!x) return; var f = FAVS[+x.getAttribute("data-i")], m = x.getAttribute("data-f"); if (!f) return;
      if (m === "call") callNum(f.num); else if (m === "text") textNum(f.num);
      else if (confirm("Remove " + f.name + " from favorites?")) { FAVS.splice(+x.getAttribute("data-i"), 1); saveFavs(); drawFavs(); }
    });
    b.addEventListener("keydown", function (e) { if (/^[0-9*#+]$/.test(e.key)) { num += e.key; draw(); } else if (e.key === "Backspace") { num = num.slice(0, -1); draw(); } else if (e.key === "Enter") callNum(num); });
    draw(); drawFavs();
  });
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
window.ZAPOS = { store: Store, version: VERSION, catalog: CATALOG.length }; // for the stage 2 sync add-on

// ========== v3.1 concept chrome: menu, work mode, today ==========
var menuBtn = $("#menuBtn"); if (menuBtn) menuBtn.addEventListener("click", openMenu);
(function bindWorkMode() {
  var b = $("#workMode"); if (!b) return;
  var on = !!Store.getLocal("workMode", false);
  function paint() { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
  paint();
  b.addEventListener("click", function () { on = !on; Store.setLocal("workMode", on); paint(); toast(on ? "Work mode on" : "Work mode off"); });
})();
(function bindToday() {
  var cal = $("#tdCal"), note = $("#tdNote");
  function findById(id) { return APPS.filter(function (a) { return a.id === id; })[0]; }
  if (cal) cal.addEventListener("click", function () { var a = findById("calendar"); if (a) openApp(a); else openApp({ url: "calshow://", web: "https://calendar.google.com" }); });
  if (note) note.addEventListener("click", function () { var a = findById("notes"); if (a) openApp(a); else openApp({ url: "mobilenotes://", web: "https://keep.google.com" }); });
})();


// ========== v3.2 cyber HUD (original) — Reduce Motion + visibility aware ==========
(function cyberHUD() {
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var boot = $("#boot"), bootMsg = $("#bootMsg");
  var msgs = ["LINKING SENSORS…", "LOADING CATALOG…", "SYNCING MARKETS…", "MAP ONLINE…", "READY"];
  if (boot) {
    var skipB = false; try { skipB = !!Store.getLocal("skipBoot", false); } catch (e) {} try { if (sessionStorage.getItem("zapos.skipBoot")) skipB = true; } catch (e) {}
    if (RM || skipB) { boot.classList.add("go"); }
    else {
      var mi = 0;
      var iv = setInterval(function () {
        if (bootMsg) bootMsg.textContent = msgs[Math.min(mi, msgs.length - 1)];
        mi++;
        if (mi >= msgs.length) { clearInterval(iv); setTimeout(function () { boot.classList.add("go"); }, 180); }
      }, 160);
      try { Store.setLocal("skipBoot", true); } catch (e) { try { sessionStorage.setItem("zapos.skipBoot","1"); } catch (e2) {} }
    }
  }
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
  }
  document.addEventListener("visibilitychange", syncVis); syncVis();
})();

function paintTicker(rows) {
  var track = $("#mkTickerTrack"); if (!track) return;
  var bits = (rows || []).map(function (r) {
    var cls = (r.chg || 0) >= 0 ? "up" : "dn";
    var sign = (r.chg || 0) >= 0 ? "+" : "";
    return "<span><b>" + esc(r.sym || r.name || "?") + "</b> " + esc(r.price || "—") + ' <span class="' + cls + '">' + sign + (r.chg != null ? Number(r.chg).toFixed(2) : "0") + "%</span></span>";
  });
  if (!bits.length) bits = ["<span>MARKETS · waiting for feed</span>"];
  var line = bits.join("") + bits.join("");
  track.innerHTML = line;
}


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
renderWeather(); renderMarkets(); renderMap();
window.addEventListener("offline", renderNet);
setInterval(function () { if (COINS.length > 2) { mkPage++; renderMarkets(); } }, 8000);
requestAnimationFrame(loop);
show(Q.get("tab") || Store.ui().view || "home");
requestAnimationFrame(restoreScroll); setTimeout(restoreScroll, 400); // again after late content (weather, icons) settles
refreshWeather(); refreshMarkets(); refreshGPS();
setInterval(function () { if (document.visibilityState === "visible") { refreshWeather(); refreshGPS(); } }, 5 * 60000);
setInterval(function () { if (document.visibilityState === "visible") refreshMarkets(); }, 2 * 60000);
window.addEventListener("online", function () { renderNet(); refreshWeather(true); refreshMarkets(); geocode(); });
if ("serviceWorker" in navigator && location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/os/sw.js", { scope: "/os/" }).catch(function () {});
}
if (!Store.getLocal("seenHelp", false) && !(window.navigator.standalone === true)) { Store.setLocal("seenHelp", true); setTimeout(function () { toast("Tip: MENU → Help shows how to add this to your Home Screen"); }, 1500); }
})();
