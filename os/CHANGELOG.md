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

## v4.26.0 — 2026-11-09 — One simple screen
Why: the founder's iPhone recording showed a home screen with too many ways in (big AI card, orbit ring, floating "next action" pill, bottom bar, sidebar on desktop), a two-column phone grid with stretched empty cards, and text that looked doubled.

**Removed from the home screen**
- Big "What do you want to do?" ZAP AI card, the EXPLORE orbit ring and list view, the floating "ZAP AI · YOUR NEXT ACTION" pill, the fixed Home/Search/Profile bottom bar, the desktop sidebar, the bell/profile/clock header group, the header mic/?/theme buttons and the "Back to Home" floating pill.
- Decorative holographic sweep layers on cards (`.card-holo`) — semi-transparent moving text-colored layers that read as "ghost text" when scrolled or blurred.
- Automatic TV view (≥1900 px or TV user agent). TV (`?tv=1`) and car (`?car=1`) views now only turn on when you choose them (Menu → View).

**Moved**
- ZAP AI → the search bar ("Search or ask ZAP AI"); chips under it: ✦ Ask ZAP AI (uses what you typed), Get me ready for work, Plan my day, What can you do?. Typing also offers "Ask ZAP AI: …" in the results.
- Destinations → tiles in the Apps card: Shop, Watch, Food, Smart Home, Phone, More (More = every destination, also Menu → Shortcuts → All destinations).
- Phone dial pad, comms log and favorites → the Phone tile (opens in a sheet, same dialer).
- Quick Actions → swipe right, `Q`, or Menu → Shortcuts. Inbox → Menu → Shortcuts. Theme and Page tour → Menu.
- Investments → when nothing is linked, a one-line row inside Money ("Nothing linked yet · watching BTC, GOLD", Watchlist, Link a brokerage when the bank is set up on this device). The full Investments card returns as soon as there are holdings (manual or Plaid). Banking and investment data stay separate.

**Order (phone = one full-width column; tablet 2 columns, desktop 3 columns, no sidebar)**
Header (ZAPWISE//OS · LIVE · settings) → search / Ask ZAP AI + chips → Today → Now Playing → Navigate (same map) → Focus → Money (Banking + investments line) → Apps → Customize dashboard (last, nothing fixed over it).
- Empty cards are hidden until they have something: Shop smart (shows when you save an item), Investments (shows with holdings). "Home" appears once (Navigate places).
- Existing custom card orders are reset once so everyone gets the new order; Customize dashboard still shows/hides/reorders.
- Calmer look: lighter shadows, more padding, larger body text (15 px), cards keep their own height (no stretched rows).

**Kept**: gestures (down → search, left → Apps, right → Quick Actions), keyboard shortcuts (`/`, `A`, `Q`), ZAP Connect (Menu), Plaid banking + "Allow spending in Plaid", honest empty states, Motion toggle, car and TV views, every destination and action (via tiles, Menu, search and ZAP AI).

**Ghost text finding**: frame-by-frame review of the recording found no duplicated DOM text. The doubled look came from (1) the iOS Low Battery alert's glass blur at ~3.5–4.5 s, (2) scroll motion in the recording, (3) the semi-transparent fixed bottom bar showing cards through it, and (4) the moving `.card-holo` sweep layers. 1, 2 are outside the app; 3 and 4 are removed. A WebKit (iPhone 13 / SE / iPad mini) scan of every visible text node at every scroll position now finds 0 overlapping or duplicated text. The scan did find one real overlap — the map's "LOCATION OFF…" caption sitting on the OpenStreetMap/TomTom credits — fixed by lifting the caption.

**Also**: map caption no longer covers map credits; weather button is ≥44 px tall; CLS 0.002.

**QA**: new `qa426.mjs` — 9 sizes across WebKit (iPhone 13, iPhone SE, iPad mini, 1440) and Chromium (iPhone 13, Pixel 7, 1024, 1440, 1920): card order, removed UI absent, no fixed element over content while scrolling, Customize button reachable and uncovered at the bottom, no overlapping/duplicate visible text, 0 console errors, no horizontal overflow, ≥44 px targets, Phone sheet round-trip, All destinations, Ask ZAP AI (chip + typed), Menu shortcuts, `Q`, empty cards appear with content, `?tv=1`/`?car=1`, no automatic TV at 1920. Older suites (qa417_fn, qa419, qa421–qa424, interact_v5) updated where they asserted removed UI (orbit, sidebar, bottom bar, ZAP/Quick Actions cards, auto TV at 1920, 12 dashboard cards, 2 nav landmarks); originals backed up.

## v4.27.0 — 2026-11-09 — The Orbit + one-answer ZAP AI + cyber everywhere
**Why**: the owner loved the orbit, wanted everything "more cyber", a better Shop, and a smoother ZAP AI ("I type pizza but had to choose… so much option"). The main site still said "AI shortcuts for work".

**Orbit = the only navigation**
- Big original 3D-style orbit right under the search bar: glowing Z core, two rotating rings, perspective floor grid, 9 labeled destinations (Shop, Watch, Listen, Food, Navigate, Smart Home, Finance, Apps, ZAP AI).
- Drag to spin with inertia (velocity clamped, decays and snaps to the nearest item), mouse tilt + parallax, tap/click opens, ←/→/↑/↓/Home/End move, Enter opens (roving tabindex). Labels stay full size and readable at every rotation (only the icon scales with depth).
- Motion toggle and `prefers-reduced-motion` stop the ring animation, tilt and sweeps; orbit still works by tap and keys. Car mode hides it.
- Desktop ≥1200 px: the orbit is the hero (2 columns × 2 rows) beside Today and Now Playing.
- `?go=<dest>` deep link (used by the main-site mini orbit) opens that destination, then cleans the URL.
- Removed duplicate navigation: search chip row (#v8Chips) and the Apps destination tiles (#v8Dest). Still no sidebar, bottom bar or second AI box. Card order unchanged: Today → Now Playing → Navigate → Focus → Money → Apps.

**ZAP AI: one best answer**
- New on-device parser (keywords, synonyms, Levenshtein fuzzy match — "piza" still works) returns ONE result card under the search bar as you type; Enter runs its primary button.
- "pizza" → "Pizza near you" with one button (Google Maps search at your location, or your usual provider). "More ways" (small, collapsed) shows DoorDash, Uber Eats, Grubhub, Yelp; tapping one makes it your usual for food ("YOUR USUAL" tag + reset).
- Same pattern for weather (live reading inline), take me home/work, headphones (opens Shop with results), play music, watch, gas/parking near me, focus 25 (one Confirm tap), reminders/notes (confirm), apps, finance, smart home, calendar, Connect. Questions/maths still go to ZAP AI chat; typing in the ZAP AI sheet renders the same single card with no online call for direct intents.
- Food and Watch sheets open your usual service directly; your choice is remembered per intent (device keys `v9pref`, `v9use`).

**Shop**
- Search box + chips (Tech, Audio, Home, Gaming, Fashion, Deals). Results are handoff tiles (styled initials, no logos) to Amazon, Best Buy, Walmart, Target, eBay and Google Shopping search; Deals opens each store's real deals page.
- Wishlist and price compare (prices you type) kept.
- Product API research: Open Products Facts / Open Food Facts are free but barcode-only and have no prices; Open Prices is mostly groceries (France); Best Buy, eBay and Amazon APIs need keys/sign-ups. So Shop does not show any product, price or image it cannot verify — honest handoffs only.

**Cyber design (original)**
- New `v9.css`: neon cyan/magenta/purple on navy-black, chamfered cards, HUD corner brackets, grid lines, monospace `//` labels, glow on hover/focus, light sweep only when Motion is on. No glitch, no scanlines, no third-party assets. Targets ≥44 px.

**Kept**: map design, gestures (down/left/right), shortcuts (`/`, `A`, `Q`), ZAP Connect, Plaid banking + spending, honest empty states, noindex.

**Main site**: "AI shortcuts for work" positioning replaced everywhere (titles, meta, hero, header logo tagline → "// ONE DIGITAL COMMAND CENTER", nav, footer, OG image/alt, guide widget). Guides live under Learn. Homepage hero has an interactive mini orbit linking into `/os/?go=<dest>`; real v4.27 screenshots; new `zw-cyber.css` on main pages.

**QA**: new `qa427.mjs` (OS) and `qa427_site.mjs` (main site), WebKit iPhone 13/SE/iPad mini + Chromium phones/tablet/desktop — see the audit Page for numbers. qa426 is superseded (it asserts the removed chip row/tiles).

## v4.28.0 — 2026-11-10 — Declutter: time hero, real Now Playing, cyber Focus
**Why**: the owner: "remove all that don't help us… have time showing above the rotating explore… take out the wind down where it says Accept… show who and what music is playing… use us instead… make focus mode better… we look too crowded."

**Removed / tucked away**
- The suggestion strip ("Wind down · Open YouTube Music · Accept") is gone, and so is the one-time welcome card.
- The separate Today card: its time, date and weather now live in the hero; one clock engine, no duplicate clock.
- Header status pills (LIVE, battery, GPS lock) and the version chip; the GPS pill on Navigate; the orbit's "DRAG TO SPIN" hint and front caption; Focus's sessions/streak/length row.
- More space: 20–22 px between cards, roomier card padding on phones. Banking and Apps unchanged.

**Time hero**: big glowing digital time + AM/PM and the full date sit directly above the orbit, with a small weather chip (tap → forecast). Car mode hides it with the orbit.

**Now Playing (ours, not a hand-off)**
- Album art, title, artist, album, progress, and prev / play-pause / next inside ZAPWISE, plus a cyber equalizer.
- Music from this device: pick files; title/artist/album/cover come from the file's ID3 tags (or "Artist - Title" file names); plays here with the Media Session API (lock-screen controls and metadata); the equalizer is the real audio spectrum (Web Audio analyser).
- Spotify: full Authorization Code + PKCE flow (no client secret), token refresh, currently-playing poll (5 s playing / 12 s paused, paused when hidden), play/pause/next/previous, "play <song>" plays the top Spotify match. Needs a free Spotify developer app; until `/os/spotify.json` has a Client ID the card shows a clean "Connect Spotify" state that explains the one-time setup (docs/SPOTIFY_SETUP.md). Spotify gives no audio data, so its equalizer moves with play state only.
- The orbit's Listen and "play music" go to this player; opening another music app is now only under ···.
- No fake track data: "Nothing playing" until a real source exists. Motion toggle / reduced motion freeze the equalizer.
- CSP: connect-src adds accounts.spotify.com and api.spotify.com.

**Focus**: large gradient ring with the time inside, 15/25/50 (+ custom), Start/Pause, Reset, "Today · N min · N sessions", a task field ("What are you focusing on?", saved on device), and a full-screen focus view (ring + time + task + Pause/Reset/Exit, Esc closes, focus trapped, screen kept awake while running where supported).

**Desktop ≥1200 px**: time + orbit hero (2 columns) with Now Playing and Focus beside it; Navigate spans 2 columns next to Banking; Apps full width.

**QA**: new `qa428.mjs` — 9 sizes WebKit (iPhone 13/SE/iPad mini/1440) + Chromium (iPhone 13/Pixel 7/1024/1440/1920): time above the orbit and ≥56 px, no duplicate clock, no Wind down/Accept/onboarding anywhere (also on a first visit), card order, no overflow/overlap, ≥44 px targets, 0 console errors; Now Playing not-connected, connected-ready (PKCE authorize URL), connected (mocked Spotify in the test: track, artist, album art, progress, pause/next calls, URL cleanup, no secret), device files (ID3, Media Session, visualizer, next, pause); Focus ring, task, full screen, Esc, reset; plus all qa427 orbit/one-answer/Shop checks. 481/481. qa427 is superseded (it expects the Today card).

## v4.29.0 — 2026-11-10 — Music plays inside ZAPWISE (no sign-in)
- Now Playing is a real player now. You don't need an account, there are no keys, and it never hands you off to another app. It has big cover art, the song title, artist and album or station, play/pause, previous/next, a volume slider (iPhone uses its hardware buttons), favorites ★, and a live visualizer. The visualizer shows a real Web Audio spectrum where the stream allows CORS, and animates otherwise. It respects the Motion setting, and iOS skips Web Audio so playback keeps going when the screen locks.
- Sources (all free and legal to stream, credited on the card):
  - **Internet Archive netlabels**: full tracks, Creative Commons licenses only (the license is shown per track). Title, artist, album and cover come from the archive.org metadata API. Clips under 30 s are skipped, and a basic word filter drops explicit item names.
  - **Radio Browser** (radio-browser.info): community directory of public stations by genre. Only https streams that passed their last check are used, and plays are reported as the API asks.
  - **Station song info**: each station's own AzuraCast now-playing API or ICY StreamTitle, read through the new $0 Cloudflare Worker `zapwise-radio` (https://zapwise-radio.zapwisehq.workers.dev/np, CORS limited to zapwiseai.com, 15 s cache). When a station shares no song info, the card says so and shows only the station name.
  - SomaFM is **not** used: its terms (Sep 2026) forbid third-party apps.
- Genres: Lofi, Hip-hop, Electronic, Chill, Pop, Rock and Jazz, each as free tracks or live radio. The "Genres & stations" sheet adds the station list, Favorites, Recently played, Play files from this device, a sources note, and a tiny "Open … instead ↗" link (the only hand-off left).
- ZAP one-shot: "play music", "play lofi", "play hip hop", "jazz radio", "play <anything>" (searches CC music), "pause", "next", "skip" and "previous" act right away from the search bar or the ZAP sheet. The ZAP sheet closes itself. The orbit's Listen starts playback on the card.
- Lock screen: Media Session title/artist/album/artwork, play/pause/next/previous/seek, and position state.
- Remembers the last genre or station, volume, favorites and recent plays on this device (`v11music`).
- Spotify connect is removed from the card (the PKCE code stays dormant). Device files with ID3 tags still work.
- CSP: connect-src adds archive.org, the radio-browser hosts and the worker. media-src allows https streams.
- QA: qa429 556/556 (Chromium + WebKit iPhone/iPad/desktop matrix, mocked sources). qa429_live 11/11 (real IA tracks, real AzuraCast station song info through the deployed worker, a real radio-browser station, analyser spectrum, Media Session, no navigation, 0 console errors).

## v4.30.0 — 2026-11-10 — Six genre stations, no random match
- Now Playing genres are Rock, Heavy Rock, Techno, Deep House, Jazz and Lo-fi. One tap plays that genre. The old Electronic / Hip-hop / Chill / Pop chips and the Internet Archive keyword search are gone: "electronic" was a broad Archive and Radio Browser query and could start a different genre, including metal.
- Each genre is a short fixed list of free HTTPS stations. The operator names the genre (station page, channel subtitle, or ICY name/genre). A dead stream tries that station's other published address, then the other station in the same genre. It does not start a different genre. If both fail, the card says so.
- Song title and artist still come from the station through the existing worker `https://zapwise-radio.zapwisehq.workers.dev/np` when the station sends them. The worker allows that request only from zapwiseai.com. Otherwise the card names the station and says it doesn't share song info. Break announcements are not shown as songs.
- Kept: play / pause / next / back, visualizer, favorites, recent, volume memory, device files, Media Session, no sign-in. "play techno", "play deep house", "play heavy rock", "play jazz" and "play lo-fi" still start here. "play electronic", "play hip hop", "play chill" and "play pop" open the genre list and do not play something else. SomaFM is still not used.
- Radio Browser is only used to count a play and, if a saved station id has moved, to refresh that same station. A refreshed stream whose tags crossed into another genre is rejected.
- Checkpoint before the edit: git tag `checkpoint-pre-v4.30.0`.
- Stations, with the operator’s own words (checked 2026-11-10). This is source evidence, not a listening review:
  - Rock: Radio Paradise Rock Mix (ICY genre Rock, “modern and classic rock”, stream link published for other players) and FluxFM Radio Alternative (operator: indie rock).
  - Heavy Rock: FluxFM MetalFM (“Hauptsache heavy”, rock through metal) and Hard Rock Heaven (site: 80s hard rock and hair metal, and a stream for VLC and other players).
  - Techno: FluxFM Techno Underground (“24/7 Pure Techno”). One station; its other published address is the backup.
  - Deep House: Extreme Deep House (operator name and stream list for apps; ICY genre field says House) and FluxFM Berlin Beach House (“Slow, Deep … House Mixes”). Beach House’s longer text also says the mix runs from deep house toward chillout.
  - Jazz: Jazz24 (public jazz stream published for other players) and FluxFM Jazzradio Schwarzenstein (“nonstop Jazz”).
  - Lo-fi: FluxFM Chillhop (subtitle “Chill Beats & LoFi Hip Hop”; the longer text also names neo-soul, lounge, trip-hop and jazz) and REYFM #lofi (ICY name “#lofi”).
  - SomaFM is still not used.
- QA, live versus mocked: `os/qa430.mjs`. Every curated URL and its backup were decoded with ffmpeg (PCM energy, not listened to). Chromium then played each genre in the app: the audio element’s currentTime advanced on the station’s own URL (Rock, MetalFM, Techno Underground, Extreme Deep House, Jazz24, Chillhop). A dead Techno URL fell through to that station’s other address and played. Two dead Heavy Rock URLs ended in an error and did not start another genre. “play jazz” from the ZAP form started Jazz. Device-file name, volume memory, 360/390/768/1366/1920 layout, six chips, and the command phrases passed. The metadata worker, called with the zapwiseai.com origin, returned real ICY title/artist for Techno Underground and Jazz24; the in-app card on 127.0.0.1 stays on the station name because the worker’s CORS allow-list is zapwiseai.com only. WebKit 390 loaded the page with no horizontal overflow, the six chips, and the same commands; starting audio in this headless WebKit crashed the renderer (“Failed to start the audio device”), so WebKit playback was not completed. No production deploy was run.
