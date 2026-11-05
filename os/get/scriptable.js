// ZAPWISE//OS — Scriptable large widget (free)
// Live time + weather + BTC + GOLD. Tap opens https://zapwiseai.com/os/
const OS_URL = "https://zapwiseai.com/os/?src=scriptable";
const BG = new Color("#070814");
const INK = new Color("#f4efe4");
const AMBER = new Color("#f0a202");
const CYAN = new Color("#5ce1e6");
const OK = new Color("#3ddc97");
const BAD = new Color("#ff5c7a");
const DIM = new Color("#f4efe4", 0.45);

function money(n) {
  if (n == null || isNaN(n)) return "--";
  n = Number(n);
  if (Math.abs(n) >= 1000) return "$" + Math.round(n).toLocaleString("en-US");
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function chStr(ch) {
  if (ch == null || isNaN(ch)) return "--";
  const s = (ch >= 0 ? "+" : "") + Number(ch).toFixed(2) + "%";
  return s;
}

async function fetchJSON(url) {
  const req = new Request(url);
  req.timeoutInterval = 12;
  return await req.loadJSON();
}

async function weatherLine() {
  try {
    Location.setAccuracyToKilometer();
    const loc = await Location.current();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`;
    const j = await fetchJSON(url);
    const t = j.current_weather && j.current_weather.temperature;
    return t == null ? "WX --" : `${Math.round(t)}°`;
  } catch (e) {
    return "WX --";
  }
}

async function markets() {
  try {
    const j = await fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=usd&include_24hr_change=true");
    return {
      btc: j.bitcoin && j.bitcoin.usd,
      btcCh: j.bitcoin && j.bitcoin.usd_24h_change,
      gold: j["pax-gold"] && j["pax-gold"].usd,
      goldCh: j["pax-gold"] && j["pax-gold"].usd_24h_change
    };
  } catch (e) {
    return {};
  }
}

function row(parent, left, right, rightColor) {
  const s = parent.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  const L = s.addText(left);
  L.font = Font.boldSystemFont(13);
  L.textColor = CYAN;
  s.addSpacer();
  const R = s.addText(right);
  R.font = Font.mediumSystemFont(13);
  R.textColor = rightColor || INK;
  s.addSpacer(4);
}

const w = new ListWidget();
w.backgroundColor = BG;
w.setPadding(16, 16, 16, 16);
w.url = OS_URL;

const brand = w.addText("ZAPWISE//OS");
brand.font = Font.boldSystemFont(12);
brand.textColor = AMBER;
brand.textOpacity = 0.95;
w.addSpacer(8);

const now = new Date();
const h = now.getHours();
const clock = w.addText(((h % 12) || 12) + ":" + String(now.getMinutes()).padStart(2, "0") + (h < 12 ? " AM" : " PM"));
clock.font = Font.boldSystemFont(34);
clock.textColor = INK;

const wx = await weatherLine();
const mk = await markets();
w.addSpacer(6);
const sub = w.addText(wx + "  ·  LIVE");
sub.font = Font.mediumSystemFont(12);
sub.textColor = DIM;

w.addSpacer(12);
row(w, "BTC", money(mk.btc) + "  " + chStr(mk.btcCh), (mk.btcCh >= 0 ? OK : BAD));
w.addSpacer(6);
row(w, "GOLD", money(mk.gold) + "  " + chStr(mk.goldCh), (mk.goldCh >= 0 ? OK : BAD));

w.addSpacer();
const foot = w.addText("tap → open OS");
foot.font = Font.mediumSystemFont(10);
foot.textColor = DIM;

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentLarge();
}
Script.complete();
