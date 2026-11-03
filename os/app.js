/* ZAPWISE//OS web app v2.1 (Nov 2, 2026). Static, no build step, no API keys.
   Data: Open-Meteo (weather + city search), api-bdc.io (city name for weather), CoinGecko (crypto + PAX Gold),
   OpenStreetMap tiles + Nominatim reverse geocoding (road + city, cached, re-queried only after moving > 40 m).

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
var VERSION = "2.1.1";
var STATUS_MSGS = ["> SHORTCUTS ARMED", "> NET SECURE", "> AI LINK STABLE", "> SIGNAL CLEAN", "> APPS READY"];
var FOCUS_MS = 25 * 60000, DOCK_N = 5;
var DAY_START = 7, DAY_END = 23;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var Q = new URLSearchParams(location.search);
var FORCE_FX = Q.get("fx");
function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

// ========== 2. STATE: one versioned object + one save/load layer ==========
var Store = (function () {
  var STATE_KEY = "zapos.state", DEVICE_KEY = "zapos.device", VER = 1;
  var PREF_KEYS = ["settings", "theme", "apps", "coins", "loc"];                     // shared state (sync-ready)
  var DEVICE_KEYS = ["gps", "place", "wx", "mk", "focus", "seenHelp", "gpsLoc", "themeCss"]; // this device only
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
  document.documentElement.classList.toggle("light", !!t.light);
  if (document.body) document.body.classList.toggle("light", !!t.light);
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t.v.void);
  THEME = t;
  // a copy of the colors for the tiny script in <head>, so the saved theme paints on the first frame (no flash)
  Store.setLocal("themeCss", { light: !!t.light, css: ":root{" + Object.keys(t.v).map(function (k) { return "--" + k + ":" + t.v[k] + ";--" + k + "-rgb:" + hexRgb(t.v[k]); }).join(";") + "}", meta: t.v.void });
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
  { id: "gemini", name: "Gemini", url: "googlegemini://", icon: "/os/icons/gemini.jpg", web: "https://gemini.google.com", glyph: "gem", bg: "linear-gradient(135deg,#4f7cff,#a25cff)", accent: "#8b9dff" },
  { id: "maps", name: "Maps", url: "maps://", icon: "/os/icons/maps.jpg", web: "https://maps.apple.com/", glyph: "map", bg: "linear-gradient(135deg,#3ddc84,#2a9df4)", accent: "#3ddc84" },
  { id: "messages", name: "Messages", url: "sms:", icon: "/os/icons/messages.jpg", mac: "sms:", desk: "https://messages.google.com/web", glyph: "bubble", bg: "linear-gradient(180deg,#5af575,#16c13c)", accent: "#3ddc84" },
  { id: "phone", name: "Phone", url: "tel:", icon: "/os/icons/phone.jpg", ios: "mobilephone://", mac: "facetime://", desk: "https://voice.google.com", glyph: "phone", bg: "linear-gradient(180deg,#5af575,#16c13c)", accent: "#3ddc84" },
  { id: "mail", name: "Mail", url: "mailto:", icon: "/os/icons/mail.jpg", web: "https://www.icloud.com/mail", glyph: "mail", bg: "linear-gradient(180deg,#1ea1ff,#1166dd)", accent: "#1ea1ff" },
  { id: "calendar", name: "Calendar", url: "calshow://", icon: "/os/icons/calendar.jpg", web: "https://www.icloud.com/calendar", glyph: "cal", bg: "#fff", accent: "#ff4d5e" },
  { id: "notes", name: "Notes", url: "mobilenotes://", icon: "/os/icons/notes.jpg", web: "https://www.icloud.com/notes", glyph: "notes", bg: "linear-gradient(180deg,#fff6c2 0 28%,#ffd23f 28%)", accent: "#ffd23f" }
];
DEFAULT_APPS.forEach(function (a) { a.on = true; });
// music apps live in the PLAY hub only (not in the dock or app grid, so nothing shows twice)
var MEDIA = {
  music: { name: "Apple Music", url: "music://", web: "https://music.apple.com", icon: "/os/icons/music.jpg" },
  spotify: { name: "Spotify", url: "spotify://", web: "https://open.spotify.com", icon: "/os/icons/spotify.jpg" },
  ytmusic: { name: "YouTube Music", url: "youtubemusic://", web: "https://music.youtube.com", icon: "/os/icons/ytmusic.jpg" },
  podcasts: { name: "Podcasts", url: "podcasts://", web: "https://podcasts.apple.com", icon: "/os/icons/podcasts.jpg" },
  pandora: { name: "Pandora", url: "pandora://", web: "https://www.pandora.com", icon: "/os/icons/pandora.jpg" },
  soundcloud: { name: "SoundCloud", url: "soundcloud://", web: "https://soundcloud.com", icon: "/os/icons/soundcloud.jpg" }
};
var HUB = ["music", "spotify", "ytmusic"];
// + ADD APP picker (v2.0.2): real icons from App Store artwork, served from /os/icons. url = app link (or https, which opens the
// app when installed), web = website fallback on a phone and what opens on a computer. No App Store links.
var CATALOG = [
  { id: "instagram", name: "Instagram", url: "instagram://", web: "https://www.instagram.com" },
  { id: "tiktok", name: "TikTok", url: "https://www.tiktok.com" },
  { id: "facebook", name: "Facebook", url: "fb://", web: "https://www.facebook.com" },
  { id: "whatsapp", name: "WhatsApp", url: "whatsapp://", web: "https://web.whatsapp.com" },
  { id: "snapchat", name: "Snapchat", url: "snapchat://", web: "https://web.snapchat.com" },
  { id: "messenger", name: "Messenger", url: "fb-messenger://", web: "https://www.messenger.com" },
  { id: "threads", name: "Threads", url: "barcelona://", web: "https://www.threads.com" },
  { id: "telegram", name: "Telegram", url: "tg://", web: "https://web.telegram.org" },
  { id: "discord", name: "Discord", url: "discord://", web: "https://discord.com/app" },
  { id: "reddit", name: "Reddit", url: "reddit://", web: "https://www.reddit.com" },
  { id: "linkedin", name: "LinkedIn", url: "linkedin://", web: "https://www.linkedin.com" },
  { id: "pinterest", name: "Pinterest", url: "pinterest://", web: "https://www.pinterest.com" },
  { id: "netflix", name: "Netflix", url: "nflx://", web: "https://www.netflix.com" },
  { id: "twitch", name: "Twitch", url: "twitch://", web: "https://www.twitch.tv" },
  { id: "amazon", name: "Amazon", url: "https://www.amazon.com" },
  { id: "uber", name: "Uber", url: "uber://", web: "https://m.uber.com" },
  { id: "gmail", name: "Gmail", url: "googlegmail://", web: "https://mail.google.com" },
  { id: "drive", name: "Drive", url: "googledrive://", web: "https://drive.google.com" },
  { id: "gphotos", name: "Google Photos", url: "googlephotos://", web: "https://photos.google.com" },
  { id: "photos", name: "Photos", url: "photos-redirect://", web: "https://www.icloud.com/photos/" },
  { id: "claude", name: "Claude", url: "https://claude.ai" },
  { id: "perplexity", name: "Perplexity", url: "https://www.perplexity.ai" },
  { id: "copilot", name: "Copilot", url: "https://copilot.microsoft.com" },
  { id: "capcut", name: "CapCut", url: "capcut://", web: "https://www.capcut.com" },
  { id: "canva", name: "Canva", url: "canva://", web: "https://www.canva.com" },
  { id: "venmo", name: "Venmo", url: "venmo://", web: "https://venmo.com" },
  { id: "cashapp", name: "Cash App", url: "https://cash.app" }
];
CATALOG.forEach(function (c) { c.icon = "/os/icons/" + c.id + ".jpg"; });
var DEFAULT_COINS = [{ id: "bitcoin", sym: "BTC", name: "Bitcoin" }, { id: "pax-gold", sym: "GOLD", name: "Gold (PAX Gold)" }];
var DEFAULT_SET = { name: "", units: "F" };

var S = Object.assign({}, DEFAULT_SET, Store.get("settings", {}));
var APPS = Store.get("apps", null);
// keeps saved built-in apps up to date with the latest links/icons and adds any new defaults
function migrateApps() {
  if (!APPS || !APPS.length) { APPS = clone(DEFAULT_APPS); return; }
  var OLD_ORDER = "x,youtube,chatgpt,grok,gemini,maps,messages,phone,mail,calendar,notes,web";
  APPS = APPS.filter(function (a) { return a.custom || (a.id !== "music" && a.id !== "spotify"); }); // now in the PLAY hub
  APPS.forEach(function (a) { var d = DEFAULT_APPS.filter(function (x) { return x.id === a.id; })[0]; if (d && !a.custom) { var on = a.on; Object.keys(d).forEach(function (k) { a[k] = d[k]; }); delete a.fb; delete a.store; a.on = on; } });
  if (APPS.map(function (a) { return a.id; }).join(",") === OLD_ORDER) APPS.sort(function (p, q) { return DEFAULT_APPS.findIndex(function (d) { return d.id === p.id; }) - DEFAULT_APPS.findIndex(function (d) { return d.id === q.id; }); });
  // picked apps follow the catalog's current links (v2.1.1: TikTok / Cash App went website-only: their app links
  // aren't officially documented for opening, and an unknown link makes iPhone say "invalid address")
  APPS.forEach(function (a) { if (!a.pick || String(a.id).indexOf("p-") !== 0) return; var c = CATALOG.filter(function (x) { return "p-" + x.id === a.id; })[0]; if (c) { a.url = c.url; if (c.web) a.web = c.web; else delete a.web; } });
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
  var url = a.url || "";
  if (/^https?:/i.test(url)) { go(url); return; }
  if (!MOBILE) {
    var d = (MAC && a.mac) || a.desk || a.web || url;
    if (/^https?:/i.test(d)) go(d); else location.href = d;
    return;
  }
  if (IOS && a.ios) url = a.ios;
  var fb = a.web;
  if (!fb) { location.href = url; return; }
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
function dockGlyph(a) {
  if (a.glyph === "cal") return '<span class="dcal"><i>' + DOW[new Date().getDay()] + '</i><b>' + new Date().getDate() + "</b></span>";
  if (a.icon) return '<img class="dimg" src="' + esc(a.icon) + '" alt="">';
  if (a.glyph === "letter" || !G[a.glyph]) return '<b class="dlet">' + esc((a.letter || a.name || "?").trim().charAt(0).toUpperCase()) + "</b>";
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + G[a.glyph].replace(/#fff|#5a4500/g, "currentColor") + "</svg>";
}
function renderApps() {
  var on = APPS.filter(function (a) { return a.on; });
  var dock = on.slice(0, DOCK_N), rest = on.slice(DOCK_N);
  var dt = $("#dTiles"); dt.innerHTML = "";
  dock.forEach(function (a) {
    var b = document.createElement("button");
    b.className = "d-tile"; b.style.color = accentOf(a); b.setAttribute("aria-label", "Open " + a.name); b.title = a.name;
    b.innerHTML = dockGlyph(a);
    b.addEventListener("click", function () { openApp(a); });
    dt.appendChild(b);
  });
  var box = $("#apps"); box.innerHTML = "";
  rest.forEach(function (a) {
    var b = document.createElement("a");
    b.className = "app"; b.href = "#"; b.setAttribute("role", "listitem"); b.setAttribute("aria-label", "Open " + a.name);
    b.innerHTML = iconHTML(a) + '<span class="nm">' + esc(a.name) + '</span>';
    b.addEventListener("click", function (e) { e.preventDefault(); openApp(a); });
    box.appendChild(b);
  });
  var ad = document.createElement("a");
  ad.className = "app add"; ad.href = "#"; ad.id = "addApp"; ad.setAttribute("role", "listitem"); ad.setAttribute("aria-label", "Add an app");
  ad.innerHTML = '<span class="ico" aria-hidden="true">＋</span><span class="nm">ADD APP</span>';
  ad.addEventListener("click", function (e) { e.preventDefault(); openAddApp(); });
  box.appendChild(ad);
  if (!dock.length) dt.innerHTML = '<span class="d-none">NO APPS ON · TAP EDIT APPS</span>';
}

// ========== 6. clock, date, status, meters, focus ==========
var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function segs(el) { if (!el.children.length) el.innerHTML = new Array(17).join("<i></i>"); return el.children; }
function setSegs(el, pct, cls) { var c = segs(el), n = Math.round(Math.max(0, Math.min(1, pct)) * 16); for (var i = 0; i < 16; i++) c[i].className = i < n ? cls : ""; }
function tick() {
  var d = new Date(), h = d.getHours();
  $("#hClock").firstChild.nodeValue = (h % 12 || 12) + ":" + pad2(d.getMinutes());
  $("#hAmpm").textContent = h < 12 ? "AM" : "PM";
  if (d.getSeconds() === 0 || !tick.done) { tick.done = true; minute(d); }
  renderFocus();
}
function minute(d) {
  var h = d.getHours();
  $("#hDate").textContent = DOW[d.getDay()] + " · " + pad2(d.getDate()) + " " + MON[d.getMonth()];
  $("#hStatus").textContent = STATUS_MSGS[Math.floor(d.getMinutes() / 5) % STATUS_MSGS.length];
  var part = h < 5 ? "LATE NIGHT" : h < 12 ? "GOOD MORNING" : h < 17 ? "GOOD AFTERNOON" : h < 22 ? "GOOD EVENING" : "LATE NIGHT";
  var nm = (S.name || "").trim().toUpperCase();
  $("#greet").textContent = "> " + part + (nm ? ", " + nm : "");
  var hrs = h + d.getMinutes() / 60;
  var pct = Math.max(0, Math.min(1, (hrs - DAY_START) / (DAY_END - DAY_START)));
  var remain = Math.max(0, DAY_END - hrs), lh = Math.floor(remain), lm = Math.round((remain - lh) * 60);
  if (lm === 60) { lh++; lm = 0; }
  setSegs($("#mDay"), pct, "on-c"); $("#mDayV").textContent = Math.round(pct * 100) + "%";
  $("#mDayL").textContent = hrs < DAY_START ? "DAY STARTS AT 7A" : pct >= 1 ? "DAY COMPLETE" :
    lh + "H " + pad2(lm) + "M LEFT TODAY · " + (hrs < 15 ? "KEEP GOING" : "FINISH STRONG");
  $$(".app .cal").forEach(function (c) { c.innerHTML = '<i>' + DOW[d.getDay()] + '</i><b>' + d.getDate() + '</b>'; });
  $$(".d-tile .dcal").forEach(function (c) { c.innerHTML = '<i>' + DOW[d.getDay()] + '</i><b>' + d.getDate() + '</b>'; });
  updateStamps();
}
// FOCUS: a 25-minute sprint timer (the web can't read battery on iPhone, so this replaces the widget's PWR meter)
var FOC = Store.getLocal("focus", { st: "idle" });
function renderFocus() {
  var now = Date.now(), left = FOCUS_MS, line;
  if (FOC.st === "run") { left = FOC.end - now; if (left <= 0) { FOC = { st: "done" }; Store.setLocal("focus", FOC); left = 0; toast("Focus sprint done. Take 5."); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} } }
  else if (FOC.st === "pause") left = FOC.left;
  else if (FOC.st === "done") left = 0;
  var pct = 1 - left / FOCUS_MS, s = Math.ceil(left / 1000);
  setSegs($("#mFoc"), FOC.st === "idle" ? 0 : pct, FOC.st === "pause" ? "on-a" : "on-g");
  $("#mFocV").textContent = Math.floor(s / 60) + ":" + pad2(s % 60);
  $("#mFocV").className = "m-v " + (FOC.st === "pause" ? "c-amber" : FOC.st === "idle" ? "c-dim" : "c-green");
  line = FOC.st === "run" ? "FOCUSING · TAP TO PAUSE · HOLD TO RESET" : FOC.st === "pause" ? "PAUSED · TAP TO RESUME · HOLD TO RESET" : FOC.st === "done" ? "SPRINT DONE · TAKE 5, THEN TAP FOR ANOTHER" : "TAP FOCUS TO START A 25-MIN SPRINT";
  if ($("#mFocL").textContent !== line) $("#mFocL").textContent = line;
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
function renderNet() { var on = navigator.onLine !== false; $("#hNet").classList.toggle("off", !on); $("#hNet b").textContent = on ? "ONLINE" : "OFFLINE"; }

// PLAY hub: Apple Music, Spotify, YouTube Music, and … for more
$("#hPlay").addEventListener("click", function (e) {
  var b = e.target.closest("[data-media]"); if (!b) return; var k = b.getAttribute("data-media");
  if (k === "more") openMedia(); else openApp(MEDIA[k]);
});
function openMedia() {
  var html = '<p class="note" style="margin-bottom:10px">Opens the app if it\'s on this phone, otherwise its website (on a computer, the website opens right away).</p>' +
    Object.keys(MEDIA).filter(function (k) { return HUB.indexOf(k) < 0; }).map(function (k) { return '<button class="mrow" data-m="' + k + '"><img class="mimg" src="' + esc(MEDIA[k].icon) + '" alt=""><span class="grow">' + esc(MEDIA[k].name) + '</span><span aria-hidden="true">↗</span></button>'; }).join("");
  sheet("♪ MORE MUSIC APPS", html, function (b) { b.addEventListener("click", function (e) { var x = e.target.closest("[data-m]"); if (x) { closeSheet(); openApp(MEDIA[x.getAttribute("data-m")]); } }); });
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
    navigator.geolocation.getCurrentPosition(function (p) { setGPS(p.coords.latitude, p.coords.longitude); res({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); }, function (e) { GEO_OFF = !!(e && e.code === 1); renderMap(); rej(e); }, { timeout: 15000, maximumAge: 120000, enableHighAccuracy: true });
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
    if (e && e.geo && !WX) { $("#wxPlace").textContent = "LOCATION OFF"; $("#hwNow").textContent = "LOCATION OFF · TAP TO SET A CITY"; $("#wxCond").textContent = "SET YOUR CITY"; }
    else if (!WX) $("#hwNow").textContent = navigator.onLine === false ? "OFFLINE · NO WEATHER SAVED YET" : "WEATHER BUSY · RETRYING SOON";
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
  // HUD weather panel (matches the widget)
  var hi = Math.round(j.daily.temperature_2m_max[0]), lo = Math.round(j.daily.temperature_2m_min[0]), rain = j.daily.precipitation_probability_max[0] || 0;
  $("#hwIc").textContent = wxEmoji(code, day);
  $("#hwNow").textContent = Math.round(cu.temperature_2m) + "° " + wxText(code);
  $("#hwHL").textContent = "H " + hi + "° L " + lo + "°";
  $("#hwFeels").textContent = "FEELS " + Math.round(cu.apparent_temperature) + "°";
  $("#hwRain").textContent = "RAIN " + rain + "%";
  $("#hSunset").textContent = "SUNSET " + (j.daily.sunset[0] ? isoT12(j.daily.sunset[0]).replace(/ ?([AP])M$/, "$1") : "--");
  $("#hWind").textContent = Math.round(cu.wind_speed_10m) + " " + wu.toUpperCase().replace("KM/H", "KM/H");
  // hourly: NOW + next 11 hours
  var key = cu.time.slice(0, 13), idx = j.hourly.time.findIndex(function (t) { return t.slice(0, 13) === key; }); if (idx < 0) idx = 0;
  var h4 = "";
  for (var q = 1; q <= 4 && idx + q < j.hourly.time.length; q++) {
    var iq = idx + q, rq = j.hourly.precipitation_probability[iq] || 0;
    h4 += '<span class="hh' + (rq >= 40 ? " wet" : "") + '"><small>' + isoH(j.hourly.time[iq]) + "</small> " + wxEmoji(j.hourly.weather_code[iq], j.hourly.is_day[iq] === 1) + " <b>" + Math.round(j.hourly.temperature_2m[iq]) + "°</b></span>";
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
function renderMarkets() {
  var d = MK && MK.d || {}, list = "", mini = "";
  COINS.forEach(function (c, i) {
    var q = d[c.id];
    list += '<div class="mkr"><span class="sym">' + esc(c.sym) + '</span><span class="nm2">' + esc(c.name) + '</span><span class="px">' + (q ? money(q.usd) : "--") + '</span><span class="ch">' + (q ? chHTML(q.usd_24h_change) : "") + "</span></div>";
  });
  var pages = Math.max(1, Math.ceil(COINS.length / 2)), pg = mkPage % pages;
  COINS.slice(pg * 2, pg * 2 + 2).forEach(function (c) { var q = d[c.id]; mini += '<span class="mki"><b>' + esc(c.sym) + "</b> " + (q ? money(q.usd) : "--") + " " + (q ? chHTML(q.usd_24h_change) : "") + "</span>"; });
  if (!COINS.length) { list = '<p class="offline">Your watchlist is empty. Tap ✎ EDIT to add a coin.</p>'; mini = '<span class="mki dim">WATCHLIST EMPTY · TAP TO ADD</span>'; }
  if (mkErr && !(MK && MK.at)) { list = '<p class="offline">Markets offline. We\'ll retry in 2 minutes.</p>'; mini = '<span class="mki dim">MARKETS OFFLINE · RETRYING</span>'; }
  else if (mkErr) list += '<p class="offline">Couldn\'t refresh. Showing the last prices we saved.</p>';
  $("#mkList").innerHTML = list; $("#hMkList").innerHTML = mini;
  updateStamps();
}
function updateStamps() {
  var st = function (el, at) { if (!el) return; if (!at) { el.textContent = "UPDATED --"; el.classList.add("old"); return; } el.textContent = "UPDATED " + t12(new Date(at)); el.classList.toggle("old", Date.now() - at > 30 * 60000); };
  st($("#wxStamp"), WX && WX.at); st($("#mkStamp"), MK && MK.at);
  var sh = function (el, at, pre) { el.textContent = pre + (at ? short12(at) : "--"); el.classList.toggle("old", !at || Date.now() - at > 30 * 60000); };
  sh($("#hwUpd"), WX && WX.at, "UPD "); sh($("#hMkT"), MK && MK.at, "");
  var last = Math.max(WX && WX.at || 0, MK && MK.at || 0); $("#hSync").textContent = "SYNC " + (last ? short12(last) : "--");
  if (GPS) sh($("#hGps"), GPS.at, "GPS "); else $("#hGps").textContent = "";
}
function short12(at) { return t12(new Date(at)).replace(/ ?([AP])M$/, "$1"); }

// ========== 10. map (OpenStreetMap tiles + Nominatim road · city) and tabs ==========
// The street and city always come from your live location; nothing is hard-coded. Nominatim is only asked again after you move > 40 m.
var GPS = Store.getLocal("gps", null), PLACE = Store.getLocal("place", null), GEO_OFF = false, mapDrawn = null, nomBusy = false, nomLast = 0;
function meters(a, b) { var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function setGPS(lat, lon) { GPS = { lat: lat, lon: lon, at: Date.now() }; Store.setLocal("gps", GPS); GEO_OFF = false; renderMap(); updateStamps(); geocode(); }
function geocode() {
  if (!GPS || nomBusy || navigator.onLine === false) return;
  if (PLACE && meters(PLACE, GPS) <= 40) return;
  if (Date.now() - nomLast < 60000) return; // never more than one request a minute (policy allows 1/s)
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
  $("#hPlace").textContent = t;
}
function renderMap() {
  renderPlace();
  var v = $("#mapV"), tl = $("#mapTiles"), msg = $("#mapMsg");
  if (!GPS) { tl.innerHTML = ""; $("#mapDot").hidden = true; msg.hidden = false; msg.textContent = GEO_OFF ? "LOCATION OFF · ALLOW IT IN SETTINGS TO SEE THE MAP" : "LOCATING…"; mapDrawn = null; return; }
  var W = v.clientWidth, H = v.clientHeight; if (!W || !H) return;
  if (mapDrawn && mapDrawn.w === W && mapDrawn.h === H && meters(mapDrawn, GPS) <= 40) return;
  var z = 17, n = Math.pow(2, z), la = GPS.lat * Math.PI / 180;
  var px = (GPS.lon + 180) / 360 * n * 256, py = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n * 256;
  var ox = px - W / 2, oy = py - H / 2, html = "";
  for (var tx = Math.floor(ox / 256); tx <= Math.floor((ox + W) / 256); tx++) for (var ty = Math.floor(oy / 256); ty <= Math.floor((oy + H) / 256); ty++) {
    if (ty < 0 || ty >= n) continue;
    html += '<img alt="" draggable="false" src="https://tile.openstreetmap.org/' + z + "/" + ((tx % n + n) % n) + "/" + ty + '.png" style="left:' + Math.round(tx * 256 - ox) + "px;top:" + Math.round(ty * 256 - oy) + 'px" onerror="this.style.visibility=\'hidden\'">';
  }
  tl.innerHTML = html; $("#mapDot").hidden = false; msg.hidden = true;
  mapDrawn = { lat: GPS.lat, lon: GPS.lon, w: W, h: H };
}
// every tile failed (offline / tile server down): say so instead of an empty dark box, and redraw next time
$("#mapTiles").addEventListener("error", function (e) {
  if (e.target && e.target.tagName === "IMG") e.target.style.visibility = "hidden";
  var im = $("#mapTiles").querySelectorAll("img"), bad = 0;
  for (var i = 0; i < im.length; i++) if (im[i].style.visibility === "hidden") bad++;
  if (im.length && bad === im.length) { var m = $("#mapMsg"); m.textContent = "MAP OFFLINE · RETRYING SOON"; m.hidden = false; mapDrawn = null; }
}, true);
window.addEventListener("online", function () { mapDrawn = null; renderMap(); });
function refreshGPS() { getPos().catch(function () {}); }
$("#hMap").addEventListener("click", function (e) {
  if (e.target.closest(".map-attr")) return;
  if (!GPS) { toast(GEO_OFF ? "Turn on Location for this app to see where you are" : "Still finding you…"); return; }
  var ll = GPS.lat.toFixed(6) + "," + GPS.lon.toFixed(6);
  openApp({ url: "maps://?ll=" + ll, web: "https://maps.apple.com/?ll=" + ll + "&q=" + encodeURIComponent("You are here") });
});
$("#hMap").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#hMap").click(); } });
window.addEventListener("resize", function () { clearTimeout(renderMap.t); renderMap.t = setTimeout(renderMap, 150); });

// ----- tabs -----
var VIEWS = ["home", "weather", "markets"], VIEW = "home";
function show(tab) {
  if (tab === "menu") { openMenu(); return; }
  if (VIEWS.indexOf(tab) < 0) tab = "home";
  VIEW = tab;
  VIEWS.forEach(function (t) { $("#v-" + t).hidden = t !== tab; });
  document.body.classList.toggle("on-home", tab === "home");
  Store.setUI({ view: tab }); restoreScroll();
  if (tab === "home") setTimeout(renderMap, 0);
  $$(".tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
}
$$(".tab").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-tab")); }); });
$("#hWx").addEventListener("click", function () { show("weather"); });
$("#hMk").addEventListener("click", function () { openEditCoins(); });

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
    '<p class="note" style="margin-bottom:10px">Switch an app on or off, use ▲ ▼ to move it, and ✕ to remove an app you added. The first 5 apps that are on sit in the dock; the rest show under MORE APPS. Music apps live in the PLAY box.</p><div id="eList"></div>' +
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

// ----- + add app: popular apps (one tap) + custom name and link -----
function openAddApp() {
  var html = '<p class="note" style="margin-bottom:10px">Tap an app to add it. It opens the app on your phone (or its website if the app isn\'t installed) and the website on a computer. Remove or move apps in ⚙ EDIT APPS.</p>' +
    '<div class="pick" id="pkGrid"></div>' +
    '<h3>CUSTOM APP</h3>' +
    '<label class="field">NAME<input id="caName" maxlength="14" placeholder="e.g. Instagram" autocomplete="off"></label>' +
    '<label class="field">LINK OR APP LINK<input id="caUrl" placeholder="e.g. instagram.com or instagram://" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
    '<div class="field">ICON</div><div class="glyphs" id="caG"></div>' +
    '<div class="field">COLOR</div><div class="colors" id="caC"></div>' +
    '<button class="btn" id="caAdd">＋ ADD CUSTOM APP</button>';
  sheet("＋ ADD APP", html, function (b) {
    var gSel = "letter", cSel = CUSTOM_COLORS[0];
    function has(c) { return APPS.some(function (a) { return a.id === "p-" + c.id || (a.custom && a.name === c.name); }); }
    function drawGrid() {
      b.querySelector("#pkGrid").innerHTML = CATALOG.map(function (c) {
        var on = has(c);
        return '<button class="pk' + (on ? " added" : "") + '" data-pk="' + c.id + '" aria-label="' + (on ? "Added: " : "Add ") + esc(c.name) + '"><img src="' + c.icon + '" alt="" loading="lazy"><span>' + esc(c.name) + "</span></button>";
      }).join("");
    }
    b.querySelector("#pkGrid").addEventListener("click", function (e) {
      var x = e.target.closest("[data-pk]"); if (!x) return;
      var c = CATALOG.filter(function (q) { return q.id === x.getAttribute("data-pk"); })[0];
      if (has(c)) { toast(c.name + " is already in your apps"); return; }
      var a = { id: "p-" + c.id, name: c.name, url: c.url, icon: c.icon, glyph: "letter", letter: c.name, bg: "#111827", on: true, custom: true, pick: true };
      if (c.web) a.web = c.web;
      APPS.push(a); saveApps(); renderApps(); drawGrid(); toast(c.name + " added to your apps");
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
    drawGrid(); drawPick();
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
    '<ol class="steps"><li>Open <b>zapwiseai.com/os</b> in <b>Safari</b> and tap the <b>Share</b> button (the square with an arrow ↑).</li>' +
    '<li>Scroll down and tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>' +
    '<li>Open <b>ZAP//OS</b> from the new icon on your Home Screen. It opens full screen, like an app.</li></ol>' +
    '<h3>GOOD TO KNOW</h3><p class="note">One tap opens an app if it\'s installed. If it isn\'t, its website opens after about a second. On a computer the website opens right away (Calendar, Notes and Mail open iCloud.com). The map shows your street from your live location; tap it to open Maps. Weather asks for your location once; tap Allow, or set a city in the menu. Your choices are saved on this phone only.</p>',
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
window.ZAPOS = { store: Store, version: VERSION }; // for the stage 2 sync add-on

// ========== 13. boot ==========
document.body.classList.add("on-home"); applyTheme(THEME.id);
renderApps(); renderNet(); tick(); setInterval(tick, 1000);
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
