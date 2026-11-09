# ZAPWISE//OS changelog

Newest last. Every entry was tested with Playwright (360/390/430/768/1366@1.25/1920) before it went live.

## v4.13.3 — 2026-11-09 — Bank link returns home
- /os/link/: after a successful link (and after a bank OAuth return with `oauth_state_id`) the page auto-returns with `location.replace('https://zapwiseai.com/os/?linked=1')` and shows a large "Back to ZAPWISE//OS" button.
- Cancel (onExit), Worker 401 "setup closed" ("Already linked"), lost-state OAuth returns, and exchange errors now all show the Back button instead of leaving you on the page.
- Service worker no longer intercepts /os/link/ (always fresh from the network).
- OS: `?linked=1` (and legacy `?bank=linked`) shows a "Bank linked" toast, refreshes balances, scrolls to Bank, and removes the parameter from the URL.
- QA: 8 mocked link scenarios (success, OAuth return, OAuth with/without state, cancel, 401, 401 with device, exchange 500) + layout/scroll suite.
