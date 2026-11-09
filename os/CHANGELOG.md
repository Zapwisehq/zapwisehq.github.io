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
