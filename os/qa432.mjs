/* v4.32 focus halo + listening rail. Chromium and WebKit device matrix.
   Localhost traffic-tile CORS lines are the worker allow-list (zapwiseai.com only), not app errors. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, devices } from "/tmp/qa/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/tmp/qa432";
const fails = [];
function ok(n) { console.log("PASS", n); }
function bad(n, d) { fails.push(n + ": " + d); console.error("FAIL", n, d); }
const ignoreConsole = /zapwise-traffic|CORS policy|ERR_FAILED|net::ERR|Failed to load resource|favicon/i;

function serve() {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
        if (p.endsWith("/")) p += "index.html";
        const file = path.join(root, p);
        if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
        const buf = await readFile(file);
        const ext = path.extname(file);
        const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" }[ext] || "application/octet-stream";
        res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
        res.end(buf);
      } catch (e) { res.writeHead(404); res.end(String(e.message || e)); }
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}
function wav(nameHz) {
  const rate = 8000, n = rate * 4, data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * nameHz) * 7000), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(rate, 24); hdr.writeUInt32LE(rate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}
function track(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !ignoreConsole.test(m.text())) errors.push("console " + m.text().slice(0, 180)); });
  return errors;
}
async function boot(page, port) {
  await page.addInitScript(() => {
    let j = {};
    try { j = JSON.parse(localStorage.getItem("zapos.device") || "{}") || {}; } catch (e) {}
    if (!j.skipBoot) {
      j.skipBoot = true; j.welcomeSeen = true; j.seenHelp = true;
      if (j.uiMotion == null) j.uiMotion = true;
      localStorage.setItem("zapos.device", JSON.stringify(j));
    }
  });
  await page.goto("http://127.0.0.1:" + port + "/os/?v=432", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#v13Halo", { timeout: 25000 });
  await page.waitForSelector("#cardPlay.v12-mini", { timeout: 15000 });
}
async function layout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const q = (s) => document.querySelector(s);
    const r = (s) => { const el = q(s); return el ? el.getBoundingClientRect() : null; };
    const overlap = (a, b) => a && b && a.width > 2 && b.width > 2 && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const clock = r("#v10Hm"), halo = r("#v13Halo"), date = r("#v10Date"), go = r("#v13Go"), set = r("#v12Foc");
    const orbit = r("#v9OrbitCard"), play = r("#cardPlay"), pp = r("#v11PP"), nx = r('[data-m11="next"]'), title = r("#v11Title");
    const small = [];
    document.querySelectorAll("#v13Halo button, #cardPlay button, #v11 button").forEach((b) => {
      if (b.id === "v12Exp" || b.hidden || b.offsetParent === null) return;
      const box = b.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
      if (box.width < 44 || box.height < 44) small.push((b.id || b.getAttribute("aria-label") || b.className) + " " + Math.round(box.width) + "x" + Math.round(box.height));
    });
    const topEl = (box, dx) => {
      if (!box) return "";
      const x = box.left + (dx != null ? dx : box.width / 2), y = box.top + box.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return "offscreen";
      const el = document.elementFromPoint(x, y);
      if (!el) return "none";
      const hit = el.closest("[data-m11],#v12Exp") || el;
      return hit.id || hit.getAttribute("data-m11") || hit.tagName;
    };
    const ppHit = topEl(pp);
    const titleHit = topEl(title, Math.min(24, title ? title.width / 2 : 0));
    const inBrowser = document.documentElement.classList.contains("in-browser");
    const pad = parseFloat(getComputedStyle(document.querySelector("#app")).paddingBottom) || 0;
    return {
      overflow: doc.scrollWidth > doc.clientWidth + 2,
      scrollW: doc.scrollWidth, clientW: doc.clientWidth,
      clockH: clock ? Math.round(clock.height) : 0,
      haloH: halo ? Math.round(halo.height) : 0,
      playH: play ? Math.round(play.height) : 0,
      gapClock: clock && halo ? Math.round(halo.top - clock.bottom) : -99,
      overlapClock: overlap(clock, halo),
      overlapDate: overlap(halo, date),
      overlapOrbit: overlap(orbit, play),
      overlapGoSet: overlap(go, set),
      overlapPpTitle: overlap(pp, title),
      overlapPpNext: overlap(pp, nx),
      go: go && Math.round(go.width) + "x" + Math.round(go.height),
      set: set && Math.round(set.width) + "x" + Math.round(set.height),
      pp: pp && Math.round(pp.width) + "x" + Math.round(pp.height),
      nx: nx && Math.round(nx.width) + "x" + Math.round(nx.height),
      small, ppHit, titleHit,
      focusDisplay: getComputedStyle(q("#mFocus")).display,
      robots: q('meta[name="robots"]').content,
      ver: q("[data-app-ver]").textContent,
      orbit: !!q("#v9Orbit"), bank: !!q("#panelMoney"), map: !!q("#panelNav"), apps: !!q("#appsSection"),
      state: q("#v13Halo").dataset.state,
      st: q("#v12FocSt").textContent,
      inBrowser, pad: Math.round(pad),
      viz: q("#v11Viz") && q("#v11Viz").dataset.viz
    };
  });
}

const srv = await serve();
const port = srv.address().port;
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "Ada Beat - Night Bus.wav"), wav(440));
await writeFile(path.join(outDir, "Ada Beat - Day Bus.wav"), wav(660));

const SIZES = [
  [320, 568, "320"],
  [320, 480, "320-safari"],
  [360, 740, "360"],
  [375, 667, "se"],
  [375, 548, "se-safari"],
  [390, 844, "iphone13"],
  [390, 664, "iphone13-safari"],
  [393, 852, "iphone15"],
  [393, 680, "iphone15-safari"],
  [412, 915, "pixel"],
  [430, 932, "promax"],
  [430, 740, "promax-safari"],
  [768, 1024, "tab768"],
  [1024, 768, "tab768-land"],
  [1024, 1366, "tab1024"],
  [1366, 1024, "tab1024-land"],
  [1366, 768, "laptop"],
  [1920, 1080, "desk"]
];

const browser = await chromium.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = track(page);
await boot(page, port);

for (const [w, h, name] of SIZES) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(120);
  const m = await layout(page);
  const problems = [];
  if (m.overflow) problems.push("overflow " + m.scrollW + ">" + m.clientW);
  if (m.focusDisplay !== "none") problems.push("focus card shown");
  if (m.playH < 80 || m.playH > 150) problems.push("player " + m.playH);
  if (m.clockH < 48) problems.push("clock " + m.clockH);
  if (m.overlapClock) problems.push("clock overlaps halo");
  if (m.gapClock < -2 || m.gapClock > 24) problems.push("clock gap " + m.gapClock);
  if (m.overlapDate) problems.push("halo overlaps date");
  if (m.overlapOrbit) problems.push("music overlaps orbit");
  if (m.overlapGoSet) problems.push("start overlaps SET");
  if (m.overlapPpTitle) problems.push("play overlaps title");
  if (m.overlapPpNext) problems.push("play overlaps next");
  if (m.small.length) problems.push("small " + m.small.join(", "));
  if (m.ppHit !== "v11PP" && m.ppHit !== "offscreen") problems.push("play hit " + m.ppHit);
  if (m.titleHit !== "v12Exp" && m.titleHit !== "offscreen") problems.push("title hit " + m.titleHit);
  if (!m.orbit || !m.bank || !m.map || !m.apps) problems.push("missing surface");
  if (m.robots !== "noindex,nofollow") problems.push(m.robots);
  if (m.ver.indexOf("4.32.1") < 0) problems.push(m.ver);
  if (w <= 900 && (!m.inBrowser || m.pad < 70)) problems.push("browser gap " + m.pad);
  if (problems.length) bad("layout " + name, problems.join("; ") + " play " + m.playH);
  else ok("layout " + name + " play " + m.playH + " clock " + m.clockH + " halo " + m.haloH);
  if (["iphone13", "se", "promax", "pixel", "tab768", "tab768-land", "desk", "320"].includes(name)) {
    await page.screenshot({ path: path.join(outDir, "layout-" + name + ".png"), fullPage: false });
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await page.locator("#cardPlay").scrollIntoViewIfNeeded();
const onScreen = await layout(page);
if (onScreen.ppHit !== "v11PP" || onScreen.titleHit !== "v12Exp") bad("on-screen hits", onScreen.ppHit + " / " + onScreen.titleHit);
else ok("on-screen play hits play, title hits expand");
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(outDir, "hero-idle.png"), clip: { x: 0, y: 70, width: 390, height: 340 } });

const beforeStart = await page.evaluate(() => document.querySelector("#mFocus").hidden !== false && getComputedStyle(document.querySelector("#mFocus")).display);
await page.click("#v13Go");
await page.waitForTimeout(200);
const started = await page.evaluate(() => ({
  open: document.documentElement.classList.contains("focus-open"),
  state: document.querySelector("#v13Halo").dataset.state,
  st: document.querySelector("#v12FocSt").textContent,
  label: document.querySelector("#v13Go").getAttribute("aria-label"),
  stored: JSON.parse(localStorage.getItem("zapos.device")).focus
}));
if (started.open || started.state !== "run" || started.st !== "FOCUS" || started.stored.st !== "run" || !(started.stored.end > Date.now())) bad("focus start", JSON.stringify(started));
else ok("focus one-tap start, panel stays closed");

await page.click("#v13Go");
await page.waitForTimeout(150);
const paused = await page.evaluate(() => ({ state: document.querySelector("#v13Halo").dataset.state, st: document.querySelector("#v12FocSt").textContent, stored: JSON.parse(localStorage.getItem("zapos.device")).focus }));
if (paused.state !== "pause" || paused.st !== "PAUSED" || paused.stored.st !== "pause" || !(paused.stored.left > 0)) bad("focus pause", JSON.stringify(paused));
else ok("focus pause stores remainder");

await page.click("#v13Go");
await page.waitForTimeout(150);
const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem("zapos.device")).focus.st);
if (resumed !== "run") bad("focus resume", resumed); else ok("focus resume");

await page.evaluate(() => {
  const j = JSON.parse(localStorage.getItem("zapos.device"));
  j.focus.end = Date.now() + 3 * 60 * 1000 + 400;
  localStorage.setItem("zapos.device", JSON.stringify(j));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
await page.waitForTimeout(300);
const afterReload = await page.evaluate(() => ({
  state: document.querySelector("#v13Halo").dataset.state,
  st: document.querySelector("#v12FocSt").textContent,
  time: document.querySelector("#v12FocTime").textContent,
  stored: JSON.parse(localStorage.getItem("zapos.device")).focus
}));
const shown = afterReload.time.split(":").reduce((m, s) => m * 60 + (+s), 0);
const expect = Math.ceil((afterReload.stored.end - Date.now()) / 1000);
if (afterReload.state !== "run" || afterReload.st !== "FOCUS" || afterReload.stored.st !== "run" || Math.abs(shown - expect) > 2 || shown > 200 || shown < 160) bad("focus reload", JSON.stringify({ ...afterReload, shown, expect }));
else ok("focus reload reads the saved end timestamp " + afterReload.time);

await page.evaluate(() => {
  const j = JSON.parse(localStorage.getItem("zapos.device"));
  j.focus = { st: "run", end: Date.now() + 12 * 60 * 1000, mins: 25 };
  localStorage.setItem("zapos.device", JSON.stringify(j));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
await page.waitForTimeout(250);
const half = await page.evaluate(() => {
  const arc = document.querySelector("#v13Arc");
  const len = arc.getTotalLength() || 1;
  const off = +arc.getAttribute("stroke-dashoffset");
  return { time: document.querySelector("#v12FocTime").textContent, pct: 1 - off / len, state: document.querySelector("#v13Halo").dataset.state };
});
if (half.state !== "run" || !(half.pct > 0.42 && half.pct < 0.62) || !/^1[12]:/.test(half.time)) bad("focus midpoint arc", JSON.stringify(half));
else ok("focus midpoint " + half.time + " arc " + Math.round(half.pct * 100) + "%");
await page.screenshot({ path: path.join(outDir, "hero-running.png"), clip: { x: 0, y: 70, width: 390, height: 320 } });

await page.evaluate(() => {
  const j = JSON.parse(localStorage.getItem("zapos.device"));
  j.focus = { st: "pause", left: 5 * 60 * 1000, mins: 25 };
  localStorage.setItem("zapos.device", JSON.stringify(j));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
await page.waitForTimeout(200);
const pausedReload = await page.evaluate(() => ({ st: document.querySelector("#v12FocSt").textContent, time: document.querySelector("#v12FocTime").textContent, state: document.querySelector("#v13Halo").dataset.state }));
if (pausedReload.state !== "pause" || pausedReload.st !== "PAUSED" || pausedReload.time !== "5:00") bad("pause reload", JSON.stringify(pausedReload));
else ok("pause reload 5:00");

await page.evaluate(() => {
  const j = JSON.parse(localStorage.getItem("zapos.device"));
  j.focus = { st: "run", end: Date.now() - 2000, mins: 25 };
  localStorage.setItem("zapos.device", JSON.stringify(j));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
await page.waitForTimeout(300);
const done = await page.evaluate(() => ({ st: document.querySelector("#v12FocSt").textContent, state: document.querySelector("#v13Halo").dataset.state, stored: JSON.parse(localStorage.getItem("zapos.device")).focus.st }));
if (done.state !== "done" || done.st !== "DONE" || done.stored !== "idle") bad("focus done", JSON.stringify(done));
else ok("focus done then idle stored");
await page.screenshot({ path: path.join(outDir, "hero-done.png"), clip: { x: 0, y: 70, width: 390, height: 300 } });

await page.click("#v12Foc");
await page.waitForTimeout(200);
const opened = await page.evaluate(() => {
  const box = document.querySelector("#mFocus").getBoundingClientRect();
  const presets = [...document.querySelectorAll("#mFocus [data-foc-min]")].map((b) => b.textContent);
  const small = [...document.querySelectorAll("#mFocus button, #mFocus input")].filter((b) => {
    const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44);
  }).map((b) => (b.id || b.textContent) + " " + Math.round(b.getBoundingClientRect().width) + "x" + Math.round(b.getBoundingClientRect().height));
  return { display: getComputedStyle(document.querySelector("#mFocus")).display, h: Math.round(box.height), top: Math.round(box.top), bottom: Math.round(box.bottom), vh: window.innerHeight, presets, full: !!document.querySelector("#v10Imm1"), task: !!document.querySelector("#v10Task"), small };
});
if (opened.display === "none" || opened.h < 200 || opened.presets.length < 3 || !opened.full || !opened.task || opened.small.length || opened.top < 0 || opened.bottom > opened.vh - 40) bad("focus controls", JSON.stringify(opened));
else ok("focus controls fit above toolbar");
await page.screenshot({ path: path.join(outDir, "focus-sheet.png") });

page.once("dialog", (d) => d.accept("40"));
await page.click("#focEdit");
await page.waitForTimeout(200);
const custom = await page.evaluate(() => ({ mins: JSON.parse(localStorage.getItem("zapos.device")).focus.mins, time: document.querySelector("#mFocV").textContent }));
if (custom.mins !== 40 || custom.time !== "40:00") bad("custom length", JSON.stringify(custom));
else ok("custom 40 minutes");

await page.click("#focReset");
await page.waitForTimeout(100);
const reset = await page.evaluate(() => ({ st: document.querySelector("#mFocL").textContent, time: document.querySelector("#mFocV").textContent, stored: JSON.parse(localStorage.getItem("zapos.device")).focus.st }));
if (reset.stored !== "idle" || reset.time !== "40:00") bad("reset", JSON.stringify(reset));
else ok("reset keeps 40 and goes idle");

await page.click("#v10Imm1");
await page.waitForTimeout(200);
const imm = await page.evaluate(() => ({ open: !document.querySelector("#v10Imm").hidden, label: document.querySelector("#v10Imm").getAttribute("aria-label") }));
if (!imm.open) bad("fullscreen", JSON.stringify(imm)); else ok("fullscreen focus");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
const immClosed = await page.evaluate(() => document.querySelector("#v10Imm").hidden);
if (!immClosed) bad("fullscreen esc", "still open"); else ok("fullscreen escape");
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
const sheetClosed = await page.evaluate(() => getComputedStyle(document.querySelector("#mFocus")).display);
if (sheetClosed !== "none") bad("focus escape", sheetClosed); else ok("focus escape");

await page.setInputFiles("#v11File", [path.join(outDir, "Ada Beat - Night Bus.wav"), path.join(outDir, "Ada Beat - Day Bus.wav")]);
for (let i = 0; i < 25; i++) {
  const ready = await page.evaluate(() => window.ZAPOS.v11.M.state === "playing" && document.querySelector("#v11Title").textContent === "Night Bus");
  if (ready) break;
  await page.waitForTimeout(200);
}
for (let i = 0; i < 20; i++) {
  const t = await page.evaluate(() => window.ZAPOS.v11.M.el.currentTime);
  if (t > 0.2) break;
  await page.waitForTimeout(100);
}
await page.locator("#cardPlay").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outDir, "music-playing.png") });
const meta = await page.evaluate(() => ({ title: document.querySelector("#v11Title").textContent, artist: document.querySelector("#v11Artist").textContent, viz: document.querySelector("#v11Viz").dataset.viz, note: document.querySelector("#v13VizNote").textContent }));
if (meta.title !== "Night Bus" || meta.artist !== "Ada Beat" || meta.viz !== "spectrum") bad("real tags and spectrum", JSON.stringify(meta));
else ok("file title/artist and spectrum");
if (meta.note !== "SPECTRUM · THIS AUDIO") bad("spectrum label", meta.note); else ok("spectrum labeled as this audio");

const before = await page.evaluate(() => ({ t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, nav: Math.round(document.querySelector("#panelNav").getBoundingClientRect().top + window.scrollY), play: Math.round(document.querySelector("#cardPlay").getBoundingClientRect().height) }));
await page.click("#v12Exp");
await page.waitForTimeout(300);
const after = await page.evaluate(() => {
  const sheet = document.querySelector("#v11").getBoundingClientRect();
  const min = document.querySelector("#v12Exp").getBoundingClientRect();
  const title = document.querySelector("#v11Title").getBoundingClientRect();
  return { t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, mini: document.querySelector("#cardPlay").classList.contains("v12-mini"), state: window.ZAPOS.v11.M.state, nav: Math.round(document.querySelector("#panelNav").getBoundingClientRect().top + window.scrollY), play: Math.round(document.querySelector("#cardPlay").getBoundingClientRect().height), fixed: getComputedStyle(document.querySelector("#v11")).position, sheetH: Math.round(sheet.height), sheetBottom: Math.round(sheet.bottom), vh: window.innerHeight, note: document.querySelector("#v13VizNote").textContent, minOverlap: min.left < title.right - 2 && min.top < title.bottom - 2 };
});
if (after.src !== before.src || after.state !== "playing" || after.t < before.t || after.mini || after.fixed !== "fixed" || Math.abs(after.nav - before.nav) > 2 || Math.abs(after.play - before.play) > 2 || after.sheetBottom > after.vh + 2) bad("expand continuity", JSON.stringify({ before, after }));
else ok("expand keeps playback, page stays, sheet above toolbar");
if (after.minOverlap) bad("min overlaps title", "yes"); else ok("min clear of title");
await page.screenshot({ path: path.join(outDir, "music-sheet.png") });
await page.click('[data-m11="next"]');
let nextOk = false;
for (let i = 0; i < 20; i++) { nextOk = await page.evaluate(() => document.querySelector("#v11Title").textContent === "Day Bus"); if (nextOk) break; await page.waitForTimeout(150); }
if (!nextOk) bad("music next", await page.evaluate(() => document.querySelector("#v11Title").textContent));
else ok("music next");
await page.click('[data-m11="prev"]');
let prevOk = false;
for (let i = 0; i < 20; i++) { prevOk = await page.evaluate(() => document.querySelector("#v11Title").textContent === "Night Bus"); if (prevOk) break; await page.waitForTimeout(150); }
if (!prevOk) bad("music prev", await page.evaluate(() => document.querySelector("#v11Title").textContent));
else ok("music prev");
const atCollapse = await page.evaluate(() => ({ t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src }));
await page.waitForTimeout(200);
await page.click("#v12Exp");
await page.waitForTimeout(200);
const back = await page.evaluate(() => ({ mini: document.querySelector("#cardPlay").classList.contains("v12-mini"), src: window.ZAPOS.v11.M.el.src, state: window.ZAPOS.v11.M.state, t: window.ZAPOS.v11.M.el.currentTime }));
if (!back.mini || back.src !== atCollapse.src || back.state !== "playing" || back.t < atCollapse.t - 0.05) bad("collapse", JSON.stringify({ atCollapse, back }));
else ok("collapse keeps playback");

await page.click("#v11PP");
await page.waitForTimeout(200);
const pausedM = await page.evaluate(() => window.ZAPOS.v11.M.state);
if (pausedM !== "paused") bad("music pause", pausedM); else ok("music pause");
await page.click("#v11PP");
let resumedM = false;
for (let i = 0; i < 20; i++) { resumedM = await page.evaluate(() => window.ZAPOS.v11.M.state === "playing"); if (resumedM) break; await page.waitForTimeout(150); }
if (!resumedM) bad("music resume", "paused"); else ok("music resume");

await page.click("#v12Exp");
await page.click('[data-m11="pick"]');
await page.waitForTimeout(400);
const chips = await page.locator(".v11-chip").allTextContents();
if (chips.join("|") !== "Rock|Heavy Rock|Techno|Deep House|Jazz|Lo-fi") bad("genres", chips.join("|"));
else ok("six genres");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

await page.emulateMedia({ reducedMotion: "reduce" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
const motion = await page.evaluate(() => ({
  on: document.documentElement.classList.contains("motion-on"),
  dash: getComputedStyle(document.querySelector(".v13-arc .trk2")).animationName,
  reduce: matchMedia("(prefers-reduced-motion: reduce)").matches
}));
if (motion.on || (motion.dash && motion.dash !== "none")) bad("reduced motion", JSON.stringify(motion));
else ok("reduced motion stops the halo dash");

if (errors.length) bad("chromium errors", errors.slice(0, 6).join(" | ")); else ok("chromium console clean aside from localhost traffic CORS");

await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded" });
const home = await page.evaluate(() => ({ title: document.title, h1: (document.querySelector("h1") || {}).textContent || "" }));
const homeErrors = errors.filter((e) => e.indexOf("pageerror") === 0);
if (!/Zapwise/i.test(home.title)) bad("main site", JSON.stringify(home));
else ok("main site " + home.title.slice(0, 60));
await page.goto("http://127.0.0.1:" + port + "/os/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#v13Halo");
const robots = await page.locator('meta[name="robots"]').getAttribute("content");
if (robots !== "noindex,nofollow") bad("os robots", robots); else ok("os noindex,nofollow");
if (homeErrors.length) bad("main pageerror", homeErrors.join(" | "));

await browser.close();

let wkFails = 0;
try {
  const wk = await webkit.launch({ headless: true });
  const profiles = [
    ["iPhone SE", devices["iPhone SE"]],
    ["iPhone 13", devices["iPhone 13"]],
    ["iPhone 13 Pro Max", devices["iPhone 13 Pro Max"]],
    ["Pixel 7", devices["Pixel 7"]],
    ["iPad Mini", devices["iPad Mini"]],
    ["iPad Pro 11", devices["iPad Pro 11"]]
  ];
  for (const [name, device] of profiles) {
    const ctx = await wk.newContext({ ...device });
    const wp = await ctx.newPage();
    const werr = [];
    wp.on("pageerror", (e) => werr.push(String(e)));
    try {
      await boot(wp, port);
      const m = await layout(wp);
      const problems = [];
      if (m.overflow) problems.push("overflow");
      if (m.focusDisplay !== "none") problems.push("focus shown");
      if (m.playH < 80 || m.playH > 160) problems.push("play " + m.playH);
      if (m.overlapClock || m.overlapGoSet || m.overlapOrbit) problems.push("overlap");
      if (m.small.length) problems.push(m.small.join(","));
      if (m.robots !== "noindex,nofollow") problems.push(m.robots);
      if (problems.length) { bad("webkit " + name, problems.join("; ")); wkFails++; }
      else ok("webkit " + name + " " + device.viewport.width + "x" + device.viewport.height + " play " + m.playH);
      if (name === "iPhone 13" || name === "iPad Mini") {
        try { await wp.screenshot({ path: path.join(outDir, "webkit-" + name.replace(/\s+/g, "-") + ".png"), animations: "disabled", timeout: 8000 }); }
        catch (eShot) { console.log("NOTE webkit screenshot " + name, String(eShot).split("\n")[0]); }
      }
      if (werr.length) bad("webkit pageerror " + name, werr.slice(0, 2).join(" | "));
    } catch (e) { bad("webkit " + name, String(e).slice(0, 200)); wkFails++; }
    await ctx.close();
  }
  const land = await wk.newContext({ viewport: { width: 1024, height: 768 } });
  const lp = await land.newPage();
  try {
    await boot(lp, port);
    const m = await layout(lp);
    if (m.overflow || m.overlapOrbit || m.playH < 80) bad("webkit landscape 1024", JSON.stringify({ overflow: m.overflow, play: m.playH, overlap: m.overlapOrbit }));
    else ok("webkit landscape 1024 play " + m.playH);
    try { await lp.screenshot({ path: path.join(outDir, "webkit-land-1024.png"), animations: "disabled", timeout: 8000 }); }
    catch (eShot) { console.log("NOTE webkit landscape screenshot", String(eShot).split("\n")[0]); }
  } catch (e) { bad("webkit landscape", String(e).slice(0, 200)); }
  await land.close();
  await wk.close();
} catch (e) {
  bad("webkit launch", String(e).slice(0, 300));
}

console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nALL PASSED");
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
srv.close();
