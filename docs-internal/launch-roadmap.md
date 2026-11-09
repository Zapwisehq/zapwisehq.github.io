# Launch roadmap (from Nov 9, 2026)

Each phase ends with: tests pass (OS suites in `site_tools/`, `qa_main.mjs`, `qa_forms.mjs`, `check_csp.py`), screenshots retaken if the UI changed, and a short changelog.

## Phase 1: Foundation ✅ (done Nov 9)
- Audit of the main site and OS (Page canvas "ZAPWISE//OS Phase 1 Audit").
- Shared design system (tokens, type, header/footer) across the company site, the Learn hub and the OS.
- Company homepage + Features / Get access / Support / Security; Learn hub moved to `/shortcuts.html` with redirects.
- CSP on every page, no personal data, honest status labels, internal docs not deployed.
- OS v4.26.0: one simple screen (separate track).

## Phase 2: Core experience (next 2–3 weeks)
- First-run onboarding in the OS: 3 steps (location → pick music app → try a routine), skippable.
- Recheck that every company-site claim matches v4.26+ after each OS release (checklist in feature-integration-checklist.md).
- 5–10 real users try the demo with a script; fix the top 5 confusions.
- Add a domain email (e.g. hello@zapwiseai.com) and use it on Support.
- **External needs:** testers; domain email (free forwarding via Cloudflare Email Routing).

## Phase 3: Connected ecosystem (1–2 months)
- Accounts with passkeys + encrypted sync of settings/lists (pick one provider; Cloudflare D1/KV behind Workers keeps cost near zero).
- First OAuth integration end to end: Google Calendar read-only, then Spotify now-playing.
- Plaid moves from closed beta to Production for signed-in users only (needs Plaid Production approval and per-user token storage).
- Shopping: one authorized product/price source with affiliate disclosure.
- **External needs:** Google OAuth verification, Spotify developer app, Plaid Production review, affiliate program approval.

## Phase 4: Device experience (2–4 months)
- Polish tablet and desktop layouts; TV remote focus audit on a real TV browser; car view tested while parked.
- Investigate native shells (Capacitor) for widgets, watch and CarPlay/Android Auto; decide go/no-go per platform from cost and store rules.
- Home Assistant control (local URL + token on the device only).
- **External needs:** Apple Developer ($99/yr) and Google Play ($25 once) only if native ships.

## Phase 5: Company and launch (when phases 2–3 are stable)
- Flip OS `noindex` → `index` (GO-PUBLIC SWITCH) and inner company pages to `index,follow`; submit sitemap.
- Pricing page from business-model.md; checkout via Stripe Payment Links or Lemon Squeezy (no custom payment code).
- Cookieless analytics disclosed in privacy.html; a status/changelog page.
- Launch: Shorts series + demo video (demo-script.md), Product Hunt, newsletter of existing audience.
- **Launch gate:** security review of Workers, privacy policy updated for accounts, support inbox monitored, rollback plan (git tag per release).
