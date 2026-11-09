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
