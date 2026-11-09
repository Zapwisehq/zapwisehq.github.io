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
