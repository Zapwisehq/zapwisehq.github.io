# ZAPWISE architecture (Nov 9, 2026 · OS v4.26.0)

## 1. Company and product
One company (Zapwise AI) with two front doors that share one design system:

| Surface | URL | Purpose | Index |
|---|---|---|---|
| Company site | `/`, `/features.html`, `/access.html`, `/support.html`, `/security.html` | Explain ZAPWISE, show what works today, lead to the demo | `/` indexed; inner company pages `noindex,follow` until launch |
| Learn hub | `/shortcuts.html`, `/shorts/`, guides, `/tools.html`, `/ai-prompt-builder.html` | AI shortcuts, Shorts and free guides (the original Zapwise AI audience) | indexed |
| Shop | `/p/*.html` (+ `/shortcuts.html#shop`) | Digital products (prompt pack, cheat sheet, kits) sold through third-party checkout links | indexed |
| Policies | `/privacy.html` (with a ZAPWISE//OS section), `/terms.html`, `/affiliate-disclosure.html`, `/corrections.html` | Trust | indexed |
| ZAPWISE//OS | `/os/` (PWA) | The product: the live demo and the everyday app | `noindex,nofollow` (GO-PUBLIC SWITCH comment in `os/index.html`) |

User journey: **discover** (home / a Short / a guide) → **understand** (Features, status chips) → **try** (`/os/`, no account) → **install** (Get access → Add to Home Screen) → **connect** (ZAP Connect, opt-in) → **support** (Support, Security) → **upgrade** (future, see business-model.md).

## 2. The six systems (inside ZAPWISE//OS)
| System | Job | v4.26 surface |
|---|---|---|
| ZAP HOME | Personal dashboard | One screen: Today → Now Playing → Navigate → Focus → Money → Apps → Customize; empty cards hidden |
| ZAP SEARCH | One bar for everything | "Search or ask ZAP AI": apps, places, notes, commands, web (Google/DDG/Bing/Brave), shopping, map |
| ZAP ACTIONS | Do the next step | Quick Actions (swipe right / `Q` / Menu → Shortcuts), routines (chips), confirm-first actions, "Opened" not "Done" |
| ZAP AI | Assistant | In the search bar. On-device commands, optional online answers (Pollinations), optional WebLLM offline brain; every reply labeled |
| ZAP CONNECT | Permissions | Menu → ZAP Connect: per-service status, what it reads, what leaves the device, refresh/hide/forget/off |
| ZAP LIFE | Wider life | Apps tiles: Shop, Watch, Food, Smart Home, Phone, More; TV and car views (Menu → View) |

All six share one action system in `os/app.js` (destinations + commands; `catalog.js` is the app list), so search, ZAP AI, Quick Actions and tiles run the same actions.

## 3. Code layout (repo `zapwise` → GitHub Pages)
```
/index.html, features/access/support/security.html   ← site_tools/master/build_company.py (+ common.py)
/assets/zw.css, zw.js                                 ← design system for company pages
/assets/zw-legacy.css                                 ← bridge stylesheet for older pages
/shortcuts.html, /shorts/*, /p/*, guides, policies    ← site_tools/build_shop.py etc. (legacy generators),
                                                         then site_tools/master/apply_legacy.py (header, footer, colors, CSP)
                                                         and fix_shortcuts.py / fix_privacy.py (idempotent content edits)
/img/os/*                                             ← real OS screenshots (WebP + JPG)
/os/                                                  ← ZAPWISE//OS (separate owner; own build.sh, CHANGELOG, version.json, QA suites)
/docs-internal/                                       ← these docs (excluded from deploy)
```
Rebuild order after any legacy regeneration: `build_shop.py` → `master/fix_shortcuts.py` → `master/apply_legacy.py` → `master/build_company.py` → `master/check_csp.py`.

## 4. Services (no secrets in the browser)
| Service | Used for | Where secrets live |
|---|---|---|
| `zapwise-bank.zapwisehq.workers.dev` | Plaid Link token, exchange, balances, transactions, investments (read-only) | Plaid keys + access tokens in Worker secrets/KV only |
| `zapwise-traffic.zapwisehq.workers.dev` | TomTom traffic tiles proxy | TomTom key in Worker secret |
| `zapwise-ask.zapwisehq.workers.dev` | Learn-hub guide chat answers | Worker |
| Open-Meteo, OpenStreetMap, mempool.space, public RPC, Pollinations | Weather, map, markets, optional online answers | Keyless public APIs |
| WebLLM (in browser) | Optional offline brain | none |

## 5. Security model
- Static hosting (GitHub Pages) means no custom headers: CSP is a `<meta>` tag on every page (`check_csp.py` enforces it). Company pages: `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, `form-action 'none'`. Legacy pages allow inline scripts/styles they still need, the ask Worker and youtube-nocookie frames, and use `form-action 'self'`.
- No trackers or analytics on company pages. `zw.js` makes no network calls.
- OS: device-local storage, read-only Plaid, last-4 only, eye toggle hides balances, confirm-first for anything that saves or opens elsewhere.

## 6. Devices
Phone (one column), tablet (2 columns), desktop (3 columns, no sidebar), TV (`?tv=1`, remote focus), car (`?car=1`, big buttons, shopping off). Watch, CarPlay/Android Auto, smart-home control and AR are future and need native apps or partner programs (see PLATFORM_LIMITATIONS.md in `os/docs`).
