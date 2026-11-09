# ZAPWISE design system v1

One visual language for zapwiseai.com and ZAPWISE//OS. The code is in `/assets/zw.css` (company pages), `/assets/zw-legacy.css` (bridge for older pages) and `/os/v6.css` + `/os/app.css` (OS, owned separately). Token values match across all of them. If you change one, change the others.

## Principles
1. **Clear before cool.** Every screen answers: where am I, what can I do, what's the easiest next step.
2. **One idea per section.** The main site is a simple top bar and plain stacked sections. It does not copy the OS layout (no sidebar, orbit or multiple navigation bars).
3. **Restrained light.** Glow marks focus and the primary action. It is not decoration. No moving scanlines, scramble text or boot sweeps on the company site.
4. **Honest states.** Show the real status (`Available now`, `In beta`, `Future vision`) and say "Opened", never "Done", for hand-offs. No invented prices, counts or data.
5. **Accessible by default.** Tap targets ≥44 px, visible focus, one `h1`, skip link, `prefers-reduced-motion` respected, pinch zoom allowed.

## Tokens (`--zw-*`)
| Group | Token | Value | Use |
|---|---|---|---|
| Background | `--zw-bg` / `--zw-bg-2` | `#070814` / `#0b1026` | page, deep navy sections |
| Surface | `--zw-surface` / `--zw-surface-2` | `rgba(14,18,38,.72)` / `rgba(20,24,48,.86)` | glass cards, raised cards |
| Lines | `--zw-line` / `--zw-line-2` | cyan-white at 14% / 26% | borders, dividers |
| Text | `--zw-ink` / `--zw-dim` / `--zw-faint` | `#e9f6ff` / `#9fb3c8` / `#7c8ea3` | body / secondary / captions (all ≥4.5:1 on bg) |
| Brand | `--zw-cyan` | `#05d9e8` | primary actions, links, focus |
| | `--zw-cyan-soft` | `#5ce1e6` | links on dark cards |
| | `--zw-purple` / `--zw-magenta` | `#b26bff` / `#ff4fd8` | secondary accent, gradient end |
| Status | `--zw-ok` / `--zw-warn` / `--zw-bad` | `#3ddc97` / `#ffb020` / `#ff5c7a` | Available now / In beta / errors |
| On cyan | `--zw-on-cyan` | `#041016` | text on cyan buttons |
| Radius | `--zw-r-sm` / `--zw-r` / `--zw-r-lg` / `--zw-pill` | 10 / 16 / 24 / 999 px | |
| Space | `--zw-s1`…`--zw-s8` | 4, 8, 12, 16, 24, 32, 48, 72 px | |
| Motion | `--zw-ease` / `--zw-dur` | `cubic-bezier(.2,.7,.2,1)` / `.22s` | hovers, menus only |
| Layout | `--zw-max` / `--zw-tap` | 1180 px / 44 px | content width / min target |

Amber (`#ffb000`) from the old Learn hub is retired. `apply_legacy.py` maps it to cyan/purple.

## Type
- Headings: **Rajdhani** 600/700 (self-hosted `/fonts/rajdhani-*.woff2`, OFL), letter-spacing .01em. Nav labels are uppercase at 15 px with .06em spacing.
- Body: **Inter** variable (self-hosted), 16–17 px, line-height 1.6. Lead text is `.zw-lead`.
- Mono: JetBrains Mono / system mono for labels and code only.
- Scale: h1 `clamp(2.4rem, 6vw, 4.4rem)`, h2 `clamp(1.8rem, 3.6vw, 2.7rem)` (inner pages 1.7rem), h3 1.15–1.25rem.

## Components (company pages)
| Class | What it is |
|---|---|
| `.zw-hdr` + `.zw-nav` + `.zw-menu` | Shared header: logo, 4 links (Product, Learn, Support, Get access) and the "Try the demo" button. Shop, Shorts and Tools are in the footer and the Learn hub. At 720 px and below the links move into a `<details>` menu (no JS needed; `zw.js` closes it on Escape, outside click or link click). |
| `.zw-btn` (`.pri`, `.lg`) | Buttons. Primary = cyan fill + dark text. Secondary = outline. One primary per section. |
| `.zw-card` (`.hi`) | Glass card; `.hi` adds the brand edge for one highlighted card. |
| `.zw-chip` (`.now`, `.beta`, `.future`) | Status labels. Always used with text, not color alone. |
| `.zw-sys` | One of the six systems: icon, name, promise, body. |
| `.zw-shot` / `.zw-shots` | Real screenshot frame (WebP + JPG `<picture>`, width/height set, lazy below the fold). |
| `.zw-steps` / `.zw-step` | Numbered journey (open → try → install → connect). |
| `.zw-fl` | Feature list row: status chip + description. |
| `.zw-faq` | `<details>` FAQ. |
| `.zw-crumb`, `.zw-phead` | Breadcrumb and page heading block for inner pages. |
| `.zw-ftr`, `.zw-fcols` | Shared footer: ZAPWISE, Learn, Shop, Company, Support columns. |
| `.zw-note`, `.zw-cap`, `.zw-small`, `.zw-muted` | Notes, captions, fine print. |

## Rules
- No inline `style=""` or inline event handlers on company pages (CSP `style-src 'self'`).
- Images: real screenshots only, captioned with version and date. Retake them when the OS layout changes (`/tmp/pwm/shot426.mjs` is the recipe: fresh profile, NYC location, no bank linked, balances hidden with the eye).
- Icons: inline SVG, 1.75 px stroke, `currentColor`, `aria-hidden` when there's a text label.
- Breakpoints: 360, 390, 768, 1024, 1366@1.25, 1440, 1920. No horizontal overflow at any of them.
