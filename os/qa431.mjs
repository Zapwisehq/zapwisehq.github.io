/* v4.31 compact home: layout, focus open, music expand without restart. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit } from "/tmp/qa/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/tmp/qa431";
const fails = [];
function ok(n) { console.log("PASS", n); }
function bad(n, d) { fails.push(n + ": " + d); console.error("FAIL", n, d); }

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
        const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" }[ext] || "application/octet-stream";
        res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
        res.end(buf);
      } catch (e) { res.writeHead(404); res.end(String(e.message || e)); }
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}
function wav() {
  const rate = 8000, n = rate * 4;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 440) * 6000), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(rate, 24); hdr.writeUInt32LE(rate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}
async function boot(page, port) {
  await page.addInitScript(() => localStorage.setItem("zapos.device", JSON.stringify({ skipBoot: true, welcomeSeen: true, seenHelp: true })));
  await page.goto("http://127.0.0.1:" + port + "/os/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#v12Foc", { timeout: 25000 });
  await page.waitForSelector("#cardPlay.v12-mini", { timeout: 15000 });
}
async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const play = document.querySelector("#cardPlay").getBoundingClientRect();
    const foc = document.querySelector("#mFocus");
    const chip = document.querySelector("#v12Foc").getBoundingClientRect();
    const pp = document.querySelector("#v11PP").getBoundingClientRect();
    const nx = document.querySelector('[data-m11="next"]').getBoundingClientRect();
    const hm = getComputedStyle(document.querySelector("#v10Hm")).fontSize;
    const mini = document.querySelector("#cardPlay").classList.contains("v12-mini");
    const targets = [["chip", chip], ["play", pp], ["next", nx]].filter(([, b]) => b.width < 44 || b.height < 44).map(([n, b]) => n + " " + Math.round(b.width) + "x" + Math.round(b.height));
    return {
      overflow: doc.scrollWidth > doc.clientWidth + 2,
      scrollW: doc.scrollWidth, clientW: doc.clientWidth,
      playH: Math.round(play.height), playW: Math.round(play.width),
      focusDisplay: getComputedStyle(foc).display,
      chipH: Math.round(chip.height),
      clockPx: parseFloat(hm),
      mini, targets,
      orbit: !!document.querySelector("#v9Orbit"),
      bank: !!document.querySelector("#panelMoney"),
      map: !!document.querySelector("#panelNav"),
      apps: !!document.querySelector("#appsSection"),
      robots: document.querySelector('meta[name="robots"]').content,
      ver: document.querySelector("[data-app-ver]").textContent
    };
  });
}

const srv = await serve();
const port = srv.address().port;
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "Ada Beat - Night Bus.wav"), wav());
await writeFile(path.join(outDir, "Ada Beat - Day Bus.wav"), wav());

const browser = await chromium.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await boot(page, port);

for (const [w, h] of [[320, 700], [360, 740], [390, 844], [768, 1024], [1366, 768], [1920, 1080]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(200);
  const m = await measure(page);
  const name = "layout " + w;
  if (m.overflow) bad(name, "overflow " + m.scrollW + ">" + m.clientW);
  else if (m.focusDisplay !== "none") bad(name, "focus card still shown " + m.focusDisplay);
  else if (m.playH > 120 || m.playH < 44) bad(name, "player height " + m.playH);
  else if (!m.mini) bad(name, "not compact");
  else if (m.clockPx < 48) bad(name, "clock " + m.clockPx);
  else if (m.targets.length) bad(name, "small " + m.targets.join(", "));
  else if (!m.orbit || !m.bank || !m.map || !m.apps) bad(name, "missing surface");
  else if (m.robots !== "noindex,nofollow") bad(name, m.robots);
  else if (m.ver.indexOf("4.32.0") < 0) bad(name, m.ver);
  else ok(name + " player " + m.playH + "px clock " + Math.round(m.clockPx) + "px");
  if (w === 390 || w === 1366) await page.screenshot({ path: path.join(outDir, "v" + w + ".png") });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.click("#v12Foc");
await page.waitForTimeout(200);
const opened = await page.evaluate(() => {
  const r = document.querySelector("#mFocus").getBoundingClientRect();
  const x = document.querySelector("#v12FocX").getBoundingClientRect();
  return { display: getComputedStyle(document.querySelector("#mFocus")).display, h: Math.round(r.height), w: Math.round(r.width), top: Math.round(r.top), x: Math.round(x.width), presets: document.querySelectorAll("#mFocus [data-foc-min]").length, full: !!document.querySelector("#v10Imm1") };
});
if (opened.display === "none" || opened.h < 200 || opened.presets < 3 || !opened.full || opened.x < 44) bad("focus open", JSON.stringify(opened));
else ok("focus open " + opened.w + "x" + opened.h);
await page.click("#focToggle");
await page.waitForTimeout(1300);
const times = await page.evaluate(() => ({ card: document.querySelector("#mFocV").textContent, chip: document.querySelector("#v12FocTime").textContent, st: document.querySelector("#v12FocSt").textContent }));
if (times.card !== times.chip || times.card === "25:00" || times.st !== "FOCUS") bad("focus timer", JSON.stringify(times));
else ok("focus timer " + times.card + " " + times.st);
await page.keyboard.press("Escape");
const closed = await page.evaluate(() => getComputedStyle(document.querySelector("#mFocus")).display);
if (closed !== "none") bad("focus escape", closed); else ok("focus escape");

await page.setInputFiles("#v11File", [path.join(outDir, "Ada Beat - Night Bus.wav"), path.join(outDir, "Ada Beat - Day Bus.wav")]);
for (let i = 0; i < 20; i++) {
  const ready = await page.evaluate(() => window.ZAPOS.v11.M.state === "playing" && document.querySelector("#v11Title").textContent === "Night Bus");
  if (ready) break;
  await page.waitForTimeout(200);
}
for (let i = 0; i < 20; i++) {
  const t = await page.evaluate(() => window.ZAPOS.v11.M.el.currentTime);
  if (t > 0.25) break;
  await page.waitForTimeout(100);
}
const before = await page.evaluate(() => ({ t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, title: document.querySelector("#v11Title").textContent, nav: Math.round(document.querySelector("#panelNav").getBoundingClientRect().top + window.scrollY), play: Math.round(document.querySelector("#cardPlay").getBoundingClientRect().height) }));
await page.waitForTimeout(400);
await page.click("#v12Exp");
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const sheet = document.querySelector("#v11").getBoundingClientRect();
  return { t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, title: document.querySelector("#v11Title").textContent, mini: document.querySelector("#cardPlay").classList.contains("v12-mini"), state: window.ZAPOS.v11.M.state, nav: Math.round(document.querySelector("#panelNav").getBoundingClientRect().top + window.scrollY), play: Math.round(document.querySelector("#cardPlay").getBoundingClientRect().height), sheetH: Math.round(sheet.height), fixed: getComputedStyle(document.querySelector("#v11")).position, st: document.querySelector("#v12St").textContent, genres: getComputedStyle(document.querySelector(".v11-row")).display !== "none" };
});
if (after.src !== before.src || after.title !== before.title || after.state !== "playing" || after.t <= before.t || after.mini || after.fixed !== "fixed" || after.sheetH < 180 || Math.abs(after.nav - before.nav) > 2 || Math.abs(after.play - before.play) > 2 || after.st !== "PLAYING") bad("expand keeps playback", JSON.stringify({ before, after }));
else ok("expand keeps playback t " + before.t.toFixed(2) + " -> " + after.t.toFixed(2) + " sheet " + after.sheetH + " nav shift " + (after.nav - before.nav));
await page.click("#v12Exp");
await page.waitForTimeout(300);
const back = await page.evaluate(() => ({ mini: document.querySelector("#cardPlay").classList.contains("v12-mini"), src: window.ZAPOS.v11.M.el.src, state: window.ZAPOS.v11.M.state, t: window.ZAPOS.v11.M.el.currentTime }));
if (!back.mini || back.src !== before.src || back.state !== "playing" || back.t < after.t) bad("collapse keeps playback", JSON.stringify(back));
else ok("collapse keeps playback");
await page.click("#v11PP");
await page.waitForTimeout(200);
const paused = await page.evaluate(() => window.ZAPOS.v11.M.state);
if (paused !== "paused") bad("pause", paused); else ok("pause");
await page.click("#v11PP");
let resumed = false;
for (let i = 0; i < 20; i++) {
  resumed = await page.evaluate(() => window.ZAPOS.v11.M.state === "playing");
  if (resumed) break;
  await page.waitForTimeout(200);
}
if (!resumed) bad("resume", "still paused"); else ok("resume");
await page.click('[data-m11="next"]');
let nextOk = false;
for (let i = 0; i < 20; i++) {
  nextOk = await page.evaluate(() => document.querySelector("#v11Title").textContent === "Day Bus");
  if (nextOk) break;
  await page.waitForTimeout(200);
}
if (!nextOk) bad("next track", await page.evaluate(() => document.querySelector("#v11Title").textContent));
else ok("next track");

await page.click("#v12Exp");
await page.click('[data-m11="pick"]');
await page.waitForTimeout(800);
const chips = await page.locator(".v11-chip").allTextContents();
if (chips.join("|") !== "Rock|Heavy Rock|Techno|Deep House|Jazz|Lo-fi") bad("genres", chips.join("|"));
else ok("six genres");

if (errors.length) bad("pageerror", errors.slice(0, 3).join(" | ")); else ok("chromium pageerror none");
await page.screenshot({ path: path.join(outDir, "expanded.png") });
await browser.close();

try {
  const wk = await webkit.launch({ headless: true });
  for (const [w, h] of [[390, 844], [1366, 768]]) {
    const wp = await wk.newPage({ viewport: { width: w, height: h } });
    try {
      await boot(wp, port);
      const play = await wp.locator("#cardPlay").boundingBox();
      const chip = await wp.locator("#v12Foc").boundingBox();
      const orbit = await wp.locator("#v9Orbit").boundingBox();
      const bank = await wp.locator("#panelMoney").count();
      const playH = play ? Math.round(play.height) : 0;
      const chipH = chip ? Math.round(chip.height) : 0;
      if (!play || playH > 120 || playH < 44 || !chip || chipH < 44 || !orbit || orbit.height < 200 || !bank) bad("webkit " + w, JSON.stringify({ playH, chipH, orbit: orbit && Math.round(orbit.height), bank }));
      else ok("webkit layout " + w + " player " + playH + "px focus " + chipH + "px orbit " + Math.round(orbit.height) + "px");
    } catch (e) {
      bad("webkit " + w, String(e.message || e).split("\n")[0]);
    }
    await wp.close().catch(() => {});
  }
  await Promise.race([wk.close(), new Promise((r) => setTimeout(r, 4000))]);
} catch (e) {
  bad("webkit", String(e.message || e).split("\n")[0]);
}

srv.close();
console.log(fails.length ? "FAILED " + fails.length : "ALL PASS");
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
