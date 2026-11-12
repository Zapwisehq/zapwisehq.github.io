import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, devices } from "/tmp/qa/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = "/tmp/qa4321";
const fails = [];
const ok = (n) => console.log("PASS", n);
const bad = (n, d) => { fails.push(n + ": " + d); console.error("FAIL", n, d); };
function serve() {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
        if (p.endsWith("/")) p += "index.html";
        const file = path.join(root, p);
        const buf = await readFile(file);
        const ext = path.extname(file);
        const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" }[ext] || "application/octet-stream";
        res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
        res.end(buf);
      } catch (e) { res.writeHead(404); res.end(); }
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}
function wav() {
  const rate = 8000, n = rate * 3, data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 440) * 7000), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(rate, 24); hdr.writeUInt32LE(rate * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}
async function boot(page, port) {
  await page.addInitScript(() => {
    let j = {};
    try { j = JSON.parse(localStorage.getItem("zapos.device") || "{}") || {}; } catch (e) {}
    if (!j.skipBoot) { j.skipBoot = true; j.welcomeSeen = true; j.seenHelp = true; if (j.uiMotion == null) j.uiMotion = true; localStorage.setItem("zapos.device", JSON.stringify(j)); }
  });
  await page.goto("http://127.0.0.1:" + port + "/os/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#cardPlay.v12-mini", { timeout: 20000 });
}
async function mock(page, spec) {
  const first = await page.evaluate((s) => {
    const M = window.ZAPOS.v11.M;
    M.mode = "radio"; M.gen = "jazz"; M.an = null; M.np = s.np || null;
    M.st = { id: "jazz24", name: "Jazz24", gen: "jazz", url: "data:," };
    if (!M.el) M.el = document.createElement("audio");
    M.el.setAttribute("src", "data:,");
    M.state = s.state;
    if (M.raf) { cancelAnimationFrame(M.raf); M.raf = 0; }
    window.ZAPOS.v11.paint();
    const title = document.querySelector("#v11Title");
    const art = document.querySelector("#v11ArtBox").getBoundingClientRect();
    const card = document.querySelector("#cardPlay").getBoundingClientRect();
    const pp = document.querySelector("#v11PP").getBoundingClientRect();
    const nx = document.querySelector('[data-m11="next"]').getBoundingClientRect();
    const after = getComputedStyle(document.querySelector("#v11ArtBox"), "::after").content;
    const before = getComputedStyle(document.querySelector("#v11"), "::before").content;
    return {
      title: title.textContent,
      artist: document.querySelector("#v11Artist").textContent,
      st: document.querySelector("#v12St").textContent,
      viz: document.querySelector("#v11Viz").dataset.viz,
      note: document.querySelector("#v13VizNote").textContent,
      titleH: Math.round(title.getBoundingClientRect().height),
      clipped: title.scrollHeight > title.clientHeight + 2,
      artOut: art.left < card.left + 1 || art.right > card.right - 1 || art.top < card.top + 1,
      after, before,
      pp: Math.round(pp.width) + "x" + Math.round(pp.height),
      nx: Math.round(nx.width) + "x" + Math.round(nx.height),
      playH: Math.round(card.height),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  }, spec);
  try {
    await page.waitForTimeout(60);
    const more = await page.evaluate(() => ({ viz: document.querySelector("#v11Viz").dataset.viz || "", note: document.querySelector("#v13VizNote").textContent || "" }));
    if (more.viz) first.viz = more.viz;
    if (more.note) first.note = more.note;
  } catch (e) { /* headless WebKit can crash once the canvas animates; the layout read above already happened */ }
  return first;
}
async function shot(page, name) {
  await page.locator("#cardPlay").scrollIntoViewIfNeeded();
  const box = await page.locator("#cardPlay").boundingBox();
  await page.screenshot({
    path: path.join(out, name + ".png"),
    clip: { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 8), width: Math.min(box.width + 8, 390), height: box.height + 16 }
  });
}

const srv = await serve();
const port = srv.address().port;
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "Ada Beat - Night Bus.wav"), wav());
const browser = await chromium.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await boot(page, port);

await shot(page, "390-idle");
const idle = await page.evaluate(() => document.querySelector("#v11Viz").dataset.viz);
if (idle && idle !== "idle") bad("idle viz", idle); else ok("idle viz " + idle);

const states = [
  ["390-buffer", { state: "loading", np: null }, "BUFFERING", "Jazz24"],
  ["390-radio-meta", { state: "playing", np: { title: "Every Time We Say Goodbye", artist: "Keith Jarrett / Charlie Haden" } }, "PLAYING", "Every Time We Say Goodbye"],
  ["390-radio-station", { state: "playing", np: null }, "PLAYING", "Jazz24"],
  ["390-paused", { state: "paused", np: { title: "Every Time We Say Goodbye", artist: "Keith Jarrett / Charlie Haden" } }, "PAUSED", "Every Time We Say Goodbye"]
];
for (const [name, spec, word, title] of states) {
  const m = await mock(page, spec);
  await page.waitForTimeout(80);
  await shot(page, name);
  const problems = [];
  if (m.title !== title) problems.push("title " + m.title);
  if (m.st !== word) problems.push("st " + m.st);
  if (m.clipped && title.length < 40) problems.push("title clipped");
  if (m.artOut) problems.push("art outside card");
  if (m.after && m.after !== "none") problems.push("ring " + m.after);
  if (m.before && m.before !== "none") problems.push("arc " + m.before);
  if (m.overflow) problems.push("overflow");
  if (name === "390-radio-meta" && m.viz !== "motion") problems.push("viz " + m.viz);
  if (name === "390-radio-meta" && m.note !== "MOTION · NOT THE AUDIO") problems.push("note " + m.note);
  if (name === "390-paused" && m.viz === "spectrum") problems.push("paused spectrum");
  if (parseInt(m.pp, 10) < 44 || parseInt(m.nx, 10) < 44) problems.push("targets " + m.pp + " " + m.nx);
  if (problems.length) bad(name, problems.join("; ") + " " + JSON.stringify(m));
  else ok(name + " " + m.viz + " h" + m.playH + " titleH" + m.titleH);
}

await page.setInputFiles("#v11File", path.join(out, "Ada Beat - Night Bus.wav"));
for (let i = 0; i < 20; i++) {
  const ready = await page.evaluate(() => window.ZAPOS.v11.M.state === "playing" && document.querySelector("#v11Viz").dataset.viz === "spectrum");
  if (ready) break;
  await page.waitForTimeout(150);
}
const spec = await page.evaluate(() => ({ viz: document.querySelector("#v11Viz").dataset.viz, title: document.querySelector("#v11Title").textContent, note: document.querySelector("#v13VizNote").textContent }));
await shot(page, "390-spectrum");
if (spec.viz !== "spectrum" || spec.title !== "Night Bus" || spec.note !== "SPECTRUM · THIS AUDIO") bad("spectrum", JSON.stringify(spec));
else ok("spectrum " + spec.title);
const t0 = await page.evaluate(() => window.ZAPOS.v11.M.el.currentTime);
await page.click("#v12Exp");
await page.waitForTimeout(250);
const mid = await page.evaluate(() => ({ t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, mini: document.querySelector("#cardPlay").classList.contains("v12-mini") }));
await page.click("#v12Exp");
await page.waitForTimeout(150);
const back = await page.evaluate(() => ({ t: window.ZAPOS.v11.M.el.currentTime, src: window.ZAPOS.v11.M.el.src, mini: document.querySelector("#cardPlay").classList.contains("v12-mini"), state: window.ZAPOS.v11.M.state }));
if (!back.mini || back.src !== mid.src || back.state !== "playing" || back.t < t0) bad("expand", JSON.stringify({ t0, mid, back }));
else ok("expand keeps audio");

await page.emulateMedia({ reducedMotion: "reduce" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#cardPlay.v12-mini");
const hold = await mock(page, { state: "playing", np: { title: "Every Time We Say Goodbye", artist: "Keith Jarrett / Charlie Haden" } });
await shot(page, "390-reduced");
if (hold.viz !== "hold") bad("reduced", JSON.stringify(hold)); else ok("reduced motion hold");

await page.emulateMedia({ reducedMotion: "no-preference" });
for (const [w, h, name] of [[320, 568, "320"], [360, 740, "360"], [390, 844, "390"], [430, 932, "430"], [768, 1024, "tab"], [1024, 768, "land"], [1366, 768, "lap"], [1920, 1080, "desk"]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(80);
  const m = await mock(page, { state: "playing", np: { title: "Every Time We Say Goodbye", artist: "Keith Jarrett / Charlie Haden" } });
  if (m.overflow || m.artOut || (m.after && m.after !== "none") || m.clipped) bad("layout " + name, JSON.stringify(m));
  else ok("layout " + name + " play " + m.playH);
}

try {
  await page.evaluate(() => window.ZAPOS.v11.genre("jazz"));
  let live = null;
  for (let i = 0; i < 20; i++) {
    live = await page.evaluate(() => ({ state: window.ZAPOS.v11.M.state, title: document.querySelector("#v11Title").textContent, viz: document.querySelector("#v11Viz").dataset.viz, t: window.ZAPOS.v11.M.el && window.ZAPOS.v11.M.el.currentTime }));
    if (live.state === "playing" && live.t > 0.2) break;
    await page.waitForTimeout(400);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "390-live-jazz");
  if (live.state !== "playing" || !(live.t > 0.2)) bad("live jazz", JSON.stringify(live));
  else ok("live jazz " + live.title + " " + live.viz + " t" + live.t.toFixed(2));
} catch (e) { bad("live jazz", String(e).slice(0, 180)); }

await browser.close();

try {
  const wk = await webkit.launch({ headless: true });
  for (const name of ["iPhone SE", "iPhone 13", "iPhone 13 Pro Max"]) {
    const ctx = await wk.newContext({ ...devices[name] });
    const wp = await ctx.newPage();
    try {
      await boot(wp, port);
      const m = await mock(wp, { state: "playing", np: { title: "Every Time We Say Goodbye", artist: "Keith Jarrett / Charlie Haden" } });
      if (m.overflow || m.artOut || m.clipped || m.title !== "Every Time We Say Goodbye") bad("webkit " + name, JSON.stringify(m));
      else ok("webkit " + name + " " + devices[name].viewport.width + " viz " + m.viz);
      if (name === "iPhone 13") {
        try {
          await wp.locator("#cardPlay").scrollIntoViewIfNeeded();
          const box = await wp.locator("#cardPlay").boundingBox();
          await wp.screenshot({ path: path.join(out, "webkit-iphone13-radio.png"), clip: { x: Math.max(0, box.x - 2), y: Math.max(0, box.y - 4), width: box.width + 4, height: box.height + 8 }, animations: "disabled", timeout: 8000 });
        } catch (eShot) { console.log("NOTE webkit shot", String(eShot).split("\n")[0]); }
      }
    } catch (e) { bad("webkit " + name, String(e).slice(0, 160)); }
    try { await ctx.close(); } catch (eClose) {}
  }
  await wk.close();
} catch (e) { bad("webkit", String(e).slice(0, 160)); }

console.log(fails.length ? fails.length + " FAILED\n" + fails.join("\n") : "ALL PASSED");
if (fails.length) process.exit(1);
srv.close();
