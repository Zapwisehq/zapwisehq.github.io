# ZAPWISE//OS changelog

Newest last. Every entry was tested with Playwright (360/390/430/768/1366@1.25/1920) before it went live.

## v4.13.3 — 2026-11-09 — Bank link returns home
- /os/link/: after a successful link (and after a bank OAuth return with `oauth_state_id`) the page auto-returns with `location.replace('https://zapwiseai.com/os/?linked=1')` and shows a large "Back to ZAPWISE//OS" button.
- Cancel (onExit), Worker 401 "setup closed" ("Already linked"), lost-state OAuth returns, and exchange errors now all show the Back button instead of leaving you on the page.
- Service worker no longer intercepts /os/link/ (always fresh from the network).
- OS: `?linked=1` (and legacy `?bank=linked`) shows a "Bank linked" toast, refreshes balances, scrolls to Bank, and removes the parameter from the URL.
- QA: 8 mocked link scenarios (success, OAuth return, OAuth with/without state, cancel, 401, 401 with device, exchange 500) + layout/scroll suite.

## v4.14.0 — 2026-11-09 — Foundation (accessibility + honesty)
- Phase 1 audit written as a Page (ZAPWISE//OS Phase 1 Audit).
- Pinch zoom allowed: removed `maximum-scale=1, user-scalable=no` and the `gesturestart` blocker.
- All visible controls ≥44×44 px (Switch, Play, eye, traffic, focus presets, Start/Reset, Log call, chips). Playwright scan: 0 small targets, 0 unnamed controls, 0 images without alt.
- Skip link ("Skip to dashboard"); Enter/Space open keyboard-focusable cards (Markets, bank cards).
- New neon cyberpunk title, description, Open Graph + Twitter share preview (icon-512). Still `noindex,nofollow` — the GO-PUBLIC SWITCH comment marks the one line to change.
- No fake data: Bank total shows "—" until real Plaid balances arrive (was $0.00); weather shows "—" instead of "--°".
- ZAP AI panel now says plainly that, with Online answers on, non-command questions go to a free open model (Pollinations).
- Service worker: removed precache of missing /os/access.js.

## v4.15.0 — 2026-11-09 — New layout (vision board)
- Phone, top to bottom: header (ZAPWISE//OS, version, green LIVE pill, mic, ?, theme, settings gear) → full-width rounded search (mic + Google/DuckDuckGo/Bing/Brave dropdown, saved on device) → TODAY | NOW PLAYING → FOCUS | NAVIGATE → BANKING | INVESTMENTS → APPS (6 colored categories) → PHONE.
- TODAY: big time, date tags, weather icon + temp + condition (tap for the full hourly/days detail), city pin, Calendar + Note.
- NOW PLAYING: honest launcher — YouTube / Spotify / Apple Music / SoundCloud with a check on the chosen one, "Tap to open <app>", More apps sheet. No fake track or progress.
- FOCUS MODE: 15/25/50 plus ✎ custom length (1–180 min, saved), ring, sessions/streak/length, Start/Reset.
- NAVIGATE: existing map design kept (OSM + TomTom Clear/Slow/Jammed legend, +/−/◎, OPEN now in the tool stack), GPS LIVE/OFF pill, Home/Work/School chips + ＋ ADD. Map re-renders when its card resizes.
- BANKING (separate): bank icon, real Plaid institution name + ✓ verified, total, accounts with last 4 only, eye, View Account (opens the bank's site/app). No View Account until an account is linked.
- INVESTMENTS (separate): ticker, existing holdings/watchlist + sparkline, "Holdings: N | Watchlist: N" from real data, View Portfolio.
- APPS: Social (blue), Entertainment (purple), Productivity (amber), AI (green), Navigation (cyan), Shopping (pink) — 3 real app icons, real counts, ＋ to add, tap for that category's apps; VIEW ALL shows the full editable grid.
- Each card has its own neon edge glow; tablet = 2 columns, desktop ≥1100 px = 4-column grid with equal-height rows, Phone card splits dial pad | log + favorites.
- New file: /os/v5.css (layout layer, cached by the service worker).
- QA: layout suite at 6 sizes, 10 interaction checks, linked-bank mock at 390 and 1366.

## v4.16.0 — 2026-11-09 (Stage 3: gestures, search, Quick Actions)
- Swipes (phone/tablet): down at top → search/ZAP AI, left → Apps sheet, right → Quick Actions. Map, inputs, scrollers, sheets and screen edges are excluded.
- Desktop keys: `/` search, `A` apps, `Q` Quick Actions (ignored while typing).
- Universal search: results now include saved places, notes, commands and "Ask ZAP AI".
- Customizable Quick Actions (saved on device).
- On-device suggestion cards (Accept/Dismiss) from time of day, saved places, focus history and bank freshness. No data leaves the device.
- `?` tour adds suggestion and gestures/keys steps.
- QA: 6 sizes plus zoom, a11y, interaction, bank-link and link-return regressions all pass.

## v4.17.0 — 2026-11-09 (Spec steps 1–5: audit, honest states, ZAP AI entry, orbit menu)
- Backup `backups/pre_v417_20261109_130955`, git tag `checkpoint-v4.16.0`. Audit Page updated.
- **ZAP AI entry**: big "What do you want to do?" button under search + routine chips (Get me ready for work, Help me plan my day, Take me home, Find me the best headphones). Routines use only data on this device (time, weather, saved places, reminders, notes, focus count) and every step is a button you tap.
- **Reply labels**: every ZAP AI reply says ANSWER (and where: on this device, Pollinations, offline brain, open.er-api, dictionaryapi), RECOMMENDATION, ACTION ON THIS DEVICE · TAP TO CONFIRM, or NEEDS ANOTHER APP/SERVICE. Focus, notes and reminders now ask before acting.
- **Privacy**: portfolio totals are no longer sent to the online model; the panel lists exactly what is shared (question, local time, weather, BTC/Gold). Offline brain shows its real size (~290 MB Qwen2.5 0.5B via WebLLM, WebGPU + ~1 GB graphics memory).
- **Orbit menu** (original CSS/SVG): central Z, 10 labeled destinations (Home, Shop, Watch, Listen, Food, Navigate, Smart Home, Finance, Apps, ZAP AI). Mouse/touch tap, swipe to turn, arrow keys/Home/End/Enter (remote-style), list view toggle (saved), Motion toggle + reduced-motion respected.
- **Destinations**: Shop/Watch/Food sheets open real store/service searches (no invented prices, stock, reviews; no sponsored or affiliate links) + saved list on this device; Listen shows the current provider and switches it; Smart Home says "No devices connected yet" and explains why, with home-app shortcuts and an optional Home Assistant address. Every sheet has ⌂ Back to Home; jumping to a card shows a floating Back to Home pill.
- **Honest states**: portfolio shows "—" / "NOTHING ADDED YET" instead of $0; no invented sparklines or chart placeholders; watchlist shows "Price service didn't answer · ↻ Retry"; weather ↻ refresh button; map says "DEFAULT AREA (NOT YOU)" when location is off; mics hidden where voice isn't supported.
- **44px targets**: fixed 12 controls under 44px found in the audit.
- QA: 360/390/768/1024/1440/1920 + 1366@1.25 layout suite, 37 interaction checks (orbit keys/swipe/list, all destinations, routines, labels, markets error + retry, empty states), gestures/search regression, bank-link regression, a11y scan (0 small, 0 unnamed).

## v4.18.0 — 2026-11-09 (Spec steps 7–8: Shop/Discovery, Watch, Listen, Food)
- Shop: ✎ on any saved item to add the price you saw, the store and an https link; ⇄ Compare shows saved items side by side, lowest price you entered first, labeled "prices you typed — confirm on the store's page". Got-it checkmarks for the shopping list. Still no invented prices, stock, reviews or images; no sponsored or affiliate links.
- Watch: watchlist with Watched ✓ toggle; JustWatch/YouTube/Netflix/Prime Video/Google searches; says Continue Watching stays in each app.
- Food: favorite spots; Google Maps "near me", DoorDash, Uber Eats, Grubhub, Yelp searches; ZAPWISE never places orders or takes payment.
- Listen: current provider shown and switchable; plain note that live track/controls need each service's sign-in.
- QA: shop edit/compare/link validation, watch toggle, food links, plus the full v4.17 layout, interaction and gesture suites at all sizes.

## v4.19.0 — 2026-11-09 (Spec steps 9 + 11: Focus, Calendar, Navigation, TV)
- Calendar: tapping Calendar opens TODAY'S AGENDA. ZAPWISE can't read calendar accounts, so you can import an .ics export (Google Calendar → Settings → Import & export → Export); the next 60 days stay on this device. Today and tomorrow listed; the Today card shows the next event. Says when the file is stale and when repeating events show only their first date. Open calendar app ↗ is still one tap.
- Focus: header shows sessions and minutes focused today (e.g. "2 TODAY · 50 MIN"); pause/resume/reset/custom length unchanged.
- TV / remote: at 1900 px+ (or ?tv=1) arrow keys move between controls by position, the orbit is one stop (left/right turn it, up/down leave it), bigger focus rings and text.
- QA: agenda import (timed, all-day, UTC, repeating), focus minutes, TV arrow navigation, plus every v4.17/v4.18 suite, bank-link, gestures and a11y (0 small targets).

## v4.20.0 — 2026-11-09 (ZAP CONNECT)
- Backup `backups/pre_v420_20261109_134911`, git tag `checkpoint-v4.19.0`.
- New ZAP CONNECT sheet (☰ Menu → ZAP Connect): Bank (Plaid), Location, Weather (Open-Meteo), Calendar file, Online answers (Pollinations), Offline brain, Live traffic (TomTom), Market prices, Web search. Each shows live status, errors, exactly what it can read, what leaves the device, and its controls (refresh, hide balances, forget bank on this device — the server link is untouched, use a city, forget last position, remove calendar, delete model, traffic on/off, retry).
- Available but not connected: Spotify, Google Calendar (live), Home Assistant controls, Apple Music/HomeKit/CarPlay — each says what it would add and what it needs.
- Online answers: one-tap on/off in Connect and a clear ON/OFF status next to the switch in ZAP AI. With it off, answers are labeled "BUILT-IN HELP ON THIS DEVICE".
- QA: new qa420 (connect, toggle, labels) + full matrix (`site_tools/regress.sh`).

## v4.21.0 — 2026-11-09 — ZAP Actions
- One action registry (`zaDefs`/`zaRun`) used by universal search, ZAP AI, Quick Actions and the orbit: focus, reminder, note, calendar event (.ics), agenda, web search, open website, navigate (place/home/work/search), media, shop/watch/food search, apps, weather, bank refresh, portfolio, ZAP Connect, ask ZAP AI, every destination.
- Every action has a kind: on this device, opens another app (hand-off), or prepares a file. Hand-offs say "Opened …" — never "done".
- Reminders and notes save only after a tap; calendar events go through a form + confirmation and download as an .ics file ("isn’t in your calendar until you open it").
- Universal search shows websites, matching actions, "Shop for…", "Find on the map", web search and an AI question, each with its next action label.
- ZAP AI understands "add event … tomorrow at 3pm", "watch …", "order/find … food", "navigate to <any place>".
- Local action log (last 50, on this device only).
- QA: qa421 (website/product/map/web/AI results, handoff wording, quick actions via registry, event form → confirm → .ics content, reminder only after tap, orbit via registry) + full regression matrix.

## v4.22.0 — 2026-11-09 — Customizable dashboard
- "⚙ Customize dashboard" (button under the cards, Menu → Dashboard, search/ZAP Actions `dash.edit`): switch any card on/off and move it with ▲ ▼; "Start here" stays on so the orbit menu is always reachable.
- Order and hidden cards saved on this device (`dash`); "Reset dashboard to default" restores everything.
- Cards are moved in the DOM (keyboard/screen-reader order matches what you see). Hidden cards still open from the orbit, search and ZAP AI (shown temporarily with a note).
- QA: qa422 at 390 and 1440 (hide, reorder, focus kept, persists after reload, hidden card reachable, search finds action, reset) + full regression.

## v4.23.0 — 2026-11-09 — Layout toward the ecosystem image
- ≥1024 px: left sidebar (Home, Shop, Watch, Listen, Food, Maps, Smart Home, Finance, Apps, More) using the ZAP Actions registry; top bar adds an Inbox bell (saved reminders, rest of today from an imported calendar, suggestions — no fake notifications), profile button (Settings) and a clock (≥1280 px).
- Search bar now reads "Search or ask ZAP AI…".
- Default desktop grid is 3×3: Today | Now Playing | ZAP AI · Focus | Navigate | Shop Smart · Banking | Investments | Quick Actions, then Explore (orbit), Apps and Phone. New cards: ZAP AI (online/on-device status, ask + 3 prompts), Shop Smart (your saved items and prices only, compare, open Shop), Quick Actions (Home, Work, Focus, Event, Remind, More).
- Phone/tablet <1024 px: orbit kept; fixed bottom bar (Home, Search, Profile) with a "ZAP AI · your next action" strip; page padding so nothing hides under it.
- TV view (?tv=1, TV browsers, or Menu → View): Discover hero, TV sidebar (Home, Movies, Shows, Music, Shop, Apps, Settings), your watchlist and service link-outs only.
- Car view (?car=1 or Menu → View): big Home / Work / Speak / Music buttons + Navigate and Now Playing only; shopping, food and watch actions are refused in car view.
- Customize dashboard now lists 12 cards; default order depends on screen width until you save your own.
- Calmer card glow.
- QA: qa423 (sidebar, bell, profile, 3×3 positions, Quick Actions, ZAP card, honest empty Shop Smart, phone bar + strip + no content under the bar, car view at 390/1366 incl. shopping blocked, TV link-outs) + full regression.

## v4.24.0 — 2026-11-09 — Hardening
- Content Security Policy (meta) on /os/: scripts only from this site (+ hashed boot script) and esm.run/jsDelivr for the optional offline brain; network only to the services ZAPWISE really uses (Open-Meteo, BigDataCloud, OpenStreetMap/Nominatim, OSRM, CoinGecko, Binance, ExchangeRate-API, Free Dictionary, Pollinations, mempool/publicnode, the two ZAPWISE Workers, Hugging Face for model files); no frames, no plugins.
- /os/link/: CSP following Plaid’s documented Link directives (cdn.plaid.com script + frame, production.plaid.com, the bank Worker).
- Removed the last inline event handler (search icon fallback) so the CSP needs no 'unsafe-inline' for scripts on /os/.
- zapwise-bank Worker: Cloudflare Rate Limiting API (60/min per IP; 5/min on /pair, /pair-code, /exchange, /link-token, /unlink) on top of the per-isolate limits; KV guard of 10 wrong pairing codes per 15 min; 16 KB body cap; JSON-only POSTs; GET/POST only; no-store + nosniff + no-referrer headers. Auth unchanged.
- zapwise-traffic Worker: GET only, tile x/y range validation, rate limit (300 tiles/min per IP), nosniff.
- Keyboard: Now Playing picker shows a focus ring; keyboard pass (70 stops at 1440 and 390) finds no unnamed, invisible or ring-less stops.
- QA: qa424 (no CSP violations across destinations, search, ZAP AI dictionary/currency/online answer, map tiles, WebLLM module import; Plaid SDK loads on link page; landmarks; keyboard pass; performance baseline in qa/4.24.0/perf.json) + full regression.

## v4.25.0 — 2026-11-09 — Spending + linked investments (Plaid, approved "Yes to everything")
- Backup `backups/pre_v4250_*` (bank Worker), git tag `pre-v4.25.0` (site) and a new local git repo + tags `pre-v4.25.0` / `v4.25.0` for `bank-worker`.
- Plaid Trial plan check: Transactions and Investments are both in the free Trial bundle ($0, 10-Item cap; update mode doesn't use a new Item). Live check of the USAA Item: Transactions available but not yet consented; USAA doesn't offer Investments through Plaid.
- zapwise-bank Worker (read-only, device token only): `GET /transactions?days=30|60|90` (/transactions/sync, stored AES-GCM-encrypted in KV, 90 days max; returns merchant, amount, date, category, account last 4, pending), `GET /holdings` (/investments/holdings/get; name, ticker, quantity, price, value, cost basis, last 4), `GET /item-products` (which permissions each link has). `POST /link-token {"mode":"update"}` = Plaid update mode with `additional_consented_products` for the existing Item; `{"mode":"investments"}` = link a brokerage. Neither works with setup closed unless this device has its bank token. New bank links also ask for Transactions as optional. Brokerage accounts never appear in Banking balances. Expected states (needs consent, not ready, not supported) are 200 + `state`; rate limits, origin checks, body/method/JSON limits unchanged.
- /os/link/?update=1: "Allow spending in ZAPWISE" — Continue in Plaid → no token exchange (access token unchanged) → back to `/os/?updated=1`, including the bank OAuth return on iPhone Safari (mode saved with the link token). Without this device's bank token it says so and shows Back. /os/link/?brokerage=1 links an investment account.
- Banking card: SPENDING section — spent + money in for 30/60/90 days, top categories with bars, 5 recent transactions (merchant, category, date, ••last 4, pending tag), All transactions sheet, Refresh. States: loading, needs your OK in Plaid (Allow spending button), still gathering, empty, offline, error + Retry. The eye hides every amount and last 4.
- Investments card: LINKED ACCOUNTS · PLAID — real value, accounts, top holdings, "separate from Banking"; or "No investment accounts in your Plaid link (USAA doesn't share them)" + Link a brokerage. Manual holdings/watchlist unchanged; counts add "Linked: N".
- ZAP Connect: Bank (Plaid) lists Balances / Spending (transactions) / Investments with Allowed, Needs your OK in Plaid, or Not available at USAA, plus Allow spending / Link a brokerage buttons.
- QA: qa425 (mocked Worker) at 360/390/768/1024/1440/1366@1.25/1920 — ready, needs consent, not ready, empty, error + retry, no device token, eye, 30/60/90, All sheet, Connect rows, update-mode round trip, OAuth return in update mode, normal link still exchanges, brokerage link; zero console errors, no overflow, 44 px targets. Worker unit tests (mock Plaid) + deployed endpoint checks (401 without/with bad token, 403 bad origin, 405, admin key limited to /item-products). Full regression matrix.
