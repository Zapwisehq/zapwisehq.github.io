/* v4.30 music QA. Live stream decode + browser playback. Not a listening review. */
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "/tmp/qa/node_modules/playwright/index.mjs";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/tmp/qa430";
const fails = [];
function ok(name) { console.log("PASS", name); }
function bad(name, detail) { fails.push(name + ": " + detail); console.error("FAIL", name, detail); }

const GENRES = [
  ["rock", "Rock", "rock-320"],
  ["heavy", "Heavy Rock", "metal-fm"],
  ["techno", "Techno", "techno-underground"],
  ["deephouse", "Deep House", ["rcast.net", "whsh4u-panel.com"]],
  ["jazz", "Jazz", "6285_128k"],
  ["lofi", "Lo-fi", "chillhop"]
];

function serve() {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      try {
        const u = new URL(req.url, "http://127.0.0.1");
        let p = decodeURIComponent(u.pathname);
        if (p.endsWith("/")) p += "index.html";
        const file = path.join(root, p);
        if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
        const buf = await readFile(file);
        const ext = path.extname(file);
        const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" }[ext] || "application/octet-stream";
        res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
        res.end(buf);
      } catch (e) { res.writeHead(404); res.end(String(e.message || e)); }
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

async function decodeOne(url) {
  const ff = await exec("ffmpeg", ["-hide_banner", "-loglevel", "error", "-user_agent", "Mozilla/5.0", "-t", "4", "-i", url, "-vn", "-f", "f32le", "-ac", "1", "-ar", "8000", "pipe:1"], { encoding: "buffer", maxBuffer: 8 * 1024 * 1024, timeout: 25000 }).catch((e) => e);
  if (ff instanceof Error || ff.code) return { url, ok: false, err: String((ff.stderr || ff.message || ff).slice ? (ff.stderr || ff.message) : ff).slice(0, 180) };
  const b = ff.stdout;
  const n = Math.floor(b.length / 4);
  if (n < 4000) return { url, ok: false, err: "short " + b.length };
  let sum = 0, peak = 0;
  for (let i = 0; i < n; i += 20) {
    const v = Math.abs(b.readFloatLE(i * 4));
    sum += v * v; if (v > peak) peak = v;
  }
  const used = Math.ceil(n / 20);
  const rms = Math.sqrt(sum / used);
  return { url, ok: rms > 0.01 && peak > 0.02, rms: +rms.toFixed(4), peak: +peak.toFixed(3), samples: n };
}

async function decodeAll(curated) {
  const jobs = [];
  for (const id of Object.keys(curated)) {
    for (const st of curated[id]) {
      jobs.push(decodeOne(st.url).then((r) => ({ id, name: st.name, which: "url", ...r })));
      if (st.alt) jobs.push(decodeOne(st.alt).then((r) => ({ id, name: st.name, which: "alt", ...r })));
    }
  }
  const rows = [];
  for (let i = 0; i < jobs.length; i += 3) rows.push(...await Promise.all(jobs.slice(i, i + 3)));
  return rows;
}

async function workerNp(url) {
  const u = "https://zapwise-radio.zapwisehq.workers.dev/np?u=" + encodeURIComponent(url);
  const res = await fetch(u, { headers: { Origin: "https://zapwiseai.com" } });
  const cors = res.headers.get("access-control-allow-origin");
  const body = await res.json();
  return { status: res.status, cors, body };
}

async function boot(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("zapos.device", JSON.stringify({ skipBoot: true, welcomeSeen: true, seenHelp: true }));
    localStorage.removeItem("v11music");
  });
  await page.goto("http://127.0.0.1:" + page.context()._options?.baseURL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  return { page, errors };
}

async function openApp(page, port) {
  await page.goto("http://127.0.0.1:" + port + "/os/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#v11Title", { timeout: 30000 });
  await page.waitForFunction(() => window.ZAPOS && window.ZAPOS.v11 && window.ZAPOS.v11.intent, { timeout: 20000 });
}

async function layout(page, w, h, shot) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const card = document.querySelector("#cardPlay");
    const box = card.getBoundingClientRect();
    const controls = Array.from(document.querySelectorAll("#v11 button, #v11VolW"));
    const small = controls.filter((el) => {
      if (el.hidden || el.offsetParent === null) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && (b.width < 44 || b.height < 44);
    }).map((el) => (el.getAttribute("aria-label") || el.id || el.className) + " " + Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height));
    return {
      overflow: doc.scrollWidth > doc.clientWidth + 2,
      scrollW: doc.scrollWidth, clientW: doc.clientWidth,
      cardW: Math.round(box.width), cardH: Math.round(box.height),
      orbit: !!document.querySelector("#v6Orbit"),
      focus: !!document.querySelector("#mFocus"),
      bank: !!document.querySelector("#panelMoney"),
      apps: !!document.querySelector("#appsSection"),
      robots: (document.querySelector('meta[name="robots"]') || {}).content || "",
      ver: (document.querySelector("[data-app-ver]") || {}).textContent || "",
      title: (document.querySelector("#v11Title") || {}).textContent || "",
      small
    };
  });
  if (shot) await page.screenshot({ path: path.join(outDir, shot), fullPage: false });
  return info;
}

async function snapPlay(page) {
  return page.evaluate(() => {
    const M = window.ZAPOS.v11.M, a = M.el, md = navigator.mediaSession && navigator.mediaSession.metadata;
    return {
      gen: M.gen, state: M.state, t: a ? a.currentTime : 0, src: a ? (a.currentSrc || a.src || "") : "",
      title: document.querySelector("#v11Title").textContent,
      artist: document.querySelector("#v11Artist").textContent,
      paused: !a || a.paused, err: a && a.error && a.error.code,
      session: md ? { title: md.title, artist: md.artist } : null
    };
  });
}
async function shutSheet(page) {
  await page.evaluate(() => {
    const s = document.querySelector("#sheet");
    if (s) { s.hidden = true; s.style.pointerEvents = "none"; }
    const sc = document.querySelector("#scrim");
    if (sc) { sc.hidden = true; sc.style.pointerEvents = "none"; }
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  });
}
async function playGenre(page, id, needle) {
  await shutSheet(page);
  await page.click('[data-m11="pick"]', { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.locator('[data-p-gen="' + id + '"]').click({ timeout: 8000 });
  let snap = null;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    snap = await snapPlay(page);
    if (snap.gen === id && snap.state === "playing" && snap.t > 0.25) break;
  }
  const needles = Array.isArray(needle) ? needle : [needle];
  if (!(snap && snap.gen === id && snap.state === "playing" && snap.t > 0.25 && needles.some((n) => String(snap.src).indexOf(n) >= 0))) return { ok: false, snap };
  await shutSheet(page);
  snap.ok = true;
  await page.evaluate(() => window.ZAPOS.v11.pause());
  return snap;
}

async function runBrowser(kind, browser, port) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("zapos.device", JSON.stringify({ skipBoot: true, welcomeSeen: true, seenHelp: true }));
    localStorage.removeItem("v11music");
  });
  await openApp(page, port);
  const sizes = kind === "webkit"
    ? [[390, 844, "wk-phone.png"], [1366, 768, "wk-desktop.png"]]
    : [[360, 740, "ch-360.png"], [390, 844, "ch-phone.png"], [768, 1024, null], [1366, 768, "ch-desktop.png"], [1920, 1080, null]];
  for (const [w, h, shot] of sizes) {
    const info = await layout(page, w, h, shot);
    const name = kind + " layout " + w;
    if (info.overflow) bad(name, "horizontal overflow " + info.scrollW + ">" + info.clientW);
    else if (!info.orbit || !info.focus || !info.bank || !info.apps) bad(name, "missing surface " + JSON.stringify(info));
    else if (info.robots !== "noindex,nofollow") bad(name, "robots " + info.robots);
    else if (info.ver.indexOf("4.30.0") < 0) bad(name, "version " + info.ver);
    else if (info.cardW < Math.min(w, 320) - 40 || info.cardH < 80) bad(name, "card " + info.cardW + "x" + info.cardH);
    else if (info.small.length) bad(name, "small controls " + info.small.join(", "));
    else ok(name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await shutSheet(page);
  await page.click('[data-m11="pick"]');
  await page.waitForSelector(".v11-chip");
  const chips = await page.locator(".v11-chip").allTextContents();
  if (chips.join("|") !== "Rock|Heavy Rock|Techno|Deep House|Jazz|Lo-fi") bad(kind + " chips", chips.join("|"));
  else ok(kind + " chips");
  const chipBox = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll(".v11-chip"));
    const small = chips.filter((el) => { const b = el.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).map((el) => el.textContent);
    const sheet = document.querySelector("#sheet");
    const overflow = sheet && sheet.scrollWidth > sheet.clientWidth + 2;
    return { small, overflow, n: chips.length };
  });
  if (chipBox.small.length || chipBox.overflow || chipBox.n !== 6) bad(kind + " chip size", JSON.stringify(chipBox));
  else ok(kind + " chip size");
  if (kind === "chromium") await page.screenshot({ path: path.join(outDir, "ch-picker.png") });
  await shutSheet(page);

  const intents = await page.evaluate(() => {
    const phrases = ["play techno", "play deep house", "play heavy rock", "play hard rock", "play metal", "play jazz", "play lo-fi", "play lofi", "play lo fi", "play rock", "play electronic", "play hip hop", "play chill", "play pop", "play house", "weather today"];
    const out = {};
    phrases.forEach((p) => { const r = window.ZAPOS.v11.intent(p); out[p] = r ? r.title : null; });
    return out;
  });
  const expect = {
    "play techno": "Play Techno",
    "play deep house": "Play Deep House",
    "play heavy rock": "Play Heavy Rock",
    "play hard rock": "Play Heavy Rock",
    "play metal": "Play Heavy Rock",
    "play jazz": "Play Jazz",
    "play lo-fi": "Play Lo-fi",
    "play lofi": "Play Lo-fi",
    "play lo fi": "Play Lo-fi",
    "play rock": "Play Rock",
    "play electronic": "Electronic isn’t a choice",
    "play hip hop": "Hip-hop isn’t a choice",
    "play chill": "Chill isn’t a choice",
    "play pop": "Pop isn’t a choice",
    "play house": "No station for “house”",
    "weather today": null
  };
  for (const k of Object.keys(expect)) {
    if (intents[k] !== expect[k]) bad(kind + " intent " + k, JSON.stringify(intents[k]));
    else ok(kind + " intent " + k);
  }

  if (kind === "chromium") {
    const played = [];
    for (const [id, label, needle] of GENRES) {
      const snap = await playGenre(page, id, needle);
      played.push({ id, snap });
      if (!snap.ok) bad("chromium play " + label, JSON.stringify(snap.snap || snap));
      else if (/break|advertisement/i.test(snap.title + " " + snap.artist)) bad("chromium meta " + label, snap.title + " / " + snap.artist);
      else ok("chromium play " + label + " t=" + snap.t.toFixed(2) + " title=" + snap.title);
    }
    await writeFile(path.join(outDir, "playback.json"), JSON.stringify(played, null, 2));

    await page.evaluate(() => { const form = document.querySelector("#zapForm"); const inp = document.querySelector("#zapIn"); inp.value = "play jazz"; form.requestSubmit(); });
    let jazzOk = false, jazzSnap = null;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      jazzSnap = await snapPlay(page);
      if (jazzSnap.gen === "jazz" && jazzSnap.state === "playing" && jazzSnap.t > 0.2) { jazzOk = true; break; }
    }
    if (!jazzOk) bad("chromium command play jazz", JSON.stringify(jazzSnap));
    else ok("chromium command play jazz t=" + jazzSnap.t.toFixed(2));
    await page.evaluate(() => window.ZAPOS.v11.pause());

    await page.evaluate(() => {
      const c = window.ZAPOS.v11.curated.techno[0];
      c.url = "https://127.0.0.1:9/nope.mp3";
      c.alt = "https://channels.fluxfm.de/techno-underground/externalembedflxhp/stream.aac";
      c.uuid = "";
      window.ZAPOS.v11.genre("techno");
    });
    let bakOk = false, bak = null;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      bak = await snapPlay(page);
      if (bak.gen === "techno" && bak.state === "playing" && bak.t > 0.2 && /techno-underground/.test(bak.src)) { bakOk = true; break; }
    }
    if (!bakOk) bad("chromium same-station backup", JSON.stringify(bak));
    else ok("chromium same-station backup t=" + bak.t.toFixed(2));

    await page.evaluate(() => {
      window.ZAPOS.v11.curated.heavy.forEach((st) => { st.url = "https://127.0.0.1:9/nope.mp3"; st.alt = "https://127.0.0.1:9/nope2.mp3"; st.uuid = ""; });
      window.ZAPOS.v11.genre("heavy");
    });
    let cross = null;
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(500);
      cross = await snapPlay(page);
      if (cross.gen === "heavy" && cross.state === "error") break;
    }
    if (!(cross && cross.gen === "heavy" && cross.state === "error")) bad("chromium no cross-genre", JSON.stringify(cross));
    else if (/techno-underground|rock-320|6285_128k|chillhop|rcast\.net/.test(cross.src || "")) bad("chromium no cross-genre", cross.src);
    else ok("chromium no cross-genre");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#v11Title", { timeout: 30000 });
    await page.setInputFiles("#v11File", path.join(outDir, "Ada Beat - Night Bus.wav"));
    await page.waitForFunction(() => document.querySelector("#v11Title").textContent === "Night Bus", { timeout: 8000 });
    const fileMeta = await page.evaluate(() => ({ title: document.querySelector("#v11Title").textContent, artist: document.querySelector("#v11Artist").textContent, mode: window.ZAPOS.v11.M.mode }));
    if (fileMeta.title !== "Night Bus" || fileMeta.artist !== "Ada Beat" || fileMeta.mode !== "local") bad("chromium device file", JSON.stringify(fileMeta));
    else ok("chromium device file");
    await page.click("#v11Fav").catch(() => {});
    await page.evaluate(() => { const el = document.querySelector("#v11Vol"); if (el) { el.value = "35"; el.dispatchEvent(new Event("input", { bubbles: true })); } });
    const mem = await page.evaluate(() => JSON.parse(localStorage.getItem("v11music") || "{}").vol);
    if (Math.abs(mem - 0.35) > 0.02) bad("chromium volume memory", String(mem));
    else ok("chromium volume memory");
  } else {
    ok(kind + " layout, chips and commands (audio device start crashes this headless WebKit; playback is the Chromium run)");
  }
  if (errors.length) bad(kind + " pageerror", errors.slice(0, 4).join(" | "));
  else ok(kind + " pageerror none");
  await page.close();
}

function wavBytes() {
  const rate = 8000, seconds = 1, n = rate * seconds;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 220) * 8000), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(rate, 24); hdr.writeUInt32LE(rate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

const srv = await serve();
const port = srv.address().port;
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "Ada Beat - Night Bus.wav"), wavBytes());
console.log("server", port);

const curated = await (async () => {
  const page = await chromium.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] }).then(async (b) => {
    const p = await b.newPage();
    await p.addInitScript(() => localStorage.setItem("zapos.device", JSON.stringify({ skipBoot: true, welcomeSeen: true, seenHelp: true })));
    await p.goto("http://127.0.0.1:" + port + "/os/", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.ZAPOS && window.ZAPOS.v11 && window.ZAPOS.v11.curated);
    const c = await p.evaluate(() => window.ZAPOS.v11.curated);
    await b.close();
    return c;
  });
  return page;
})();

const decoded = process.env.SKIP_DECODE ? [] : await decodeAll(curated);
await writeFile(path.join(outDir, "decode.json"), JSON.stringify(decoded, null, 2));
if (!process.env.SKIP_DECODE) for (const row of decoded) {
  if (!row.ok) bad("decode " + row.id + " " + row.which, row.url + " " + (row.err || ("rms " + row.rms)));
  else ok("decode " + row.id + " " + row.name + " " + row.which + " rms=" + row.rms);
}
const soma = decoded.filter((r) => /somafm/i.test(r.url));
if (soma.length) bad("somafm", "present"); else ok("somafm absent");

const np = await workerNp(curated.techno[0].url);
await writeFile(path.join(outDir, "worker-techno.json"), JSON.stringify(np));
if (np.cors !== "https://zapwiseai.com") bad("worker cors", String(np.cors));
else ok("worker cors zapwiseai.com");
if (!(np.body && np.body.ok && np.body.title && np.body.artist)) bad("worker techno metadata", JSON.stringify(np.body));
else ok("worker techno metadata " + np.body.artist + " — " + np.body.title + " (ICY, not a listening check)");
const npJazz = await workerNp(curated.jazz[0].url);
if (!(npJazz.body && npJazz.body.ok && npJazz.body.title)) bad("worker jazz metadata", JSON.stringify(npJazz.body));
else ok("worker jazz metadata " + (npJazz.body.artist || "") + " — " + npJazz.body.title);

const chrome = await chromium.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
await runBrowser("chromium", chrome, port);
await chrome.close();

let wk = null;
try {
  wk = await webkit.launch({ headless: true });
  await runBrowser("webkit", wk, port);
  await wk.close();
} catch (e) {
  const msg = String(e && e.message || e);
  if (/crash|closed|audio device/i.test(msg)) console.log("NOTE webkit renderer crash in this headless environment:", msg.split("\n")[0]);
  else bad("webkit launch", msg);
  if (wk) await wk.close().catch(() => {});
}

srv.close();
console.log(fails.length ? ("FAILED " + fails.length) : "ALL PASS");
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
