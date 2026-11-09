# Business model (recommendation, nothing implemented)

**Principle:** charge only for things that cost money to run or clearly save time. Keep everything that works today free. No ads, no selling data.

## Today's revenue (already live)
- Digital products on the Learn hub (`/p/*`: prompt pack, cheat sheet, spreadsheet kit, toolkit, bundle) through third-party checkout.
- Affiliate links, disclosed on `/affiliate-disclosure.html`.
- Sponsorships via `/advertise.html` / `/work-with-us.html`.

## Proposed ZAPWISE plans (after accounts exist, Phase 3+)
| Plan | Price (suggested) | What it includes | Why people pay |
|---|---|---|---|
| **Free** | $0 | Everything that's "Available now": dashboard, search, ZAP AI on-device + free online answers, Quick Actions, routines, Shop list, TV/car views | Try and keep using it |
| **ZAPWISE Plus** | ~$4–6 / month or ~$40 / year | Sync across devices, connected accounts (Calendar, Spotify), bank + spending + investments (Plaid has a per-item cost), better AI model with higher limits, price-drop alerts from authorized sources | Things that cost us money per user and save them time |
| **Founders (one-time, limited)** | ~$49 lifetime Plus for the first 500 | Early supporters; funds Plaid Production + AI costs | Community + cash before scale |

Bundle: existing digital-product buyers get 3 months of Plus.

## Unit costs to watch
- Plaid: per connected item per month (Production pricing on request), the biggest cost. Only enable it for paying users.
- AI: a Worker-proxied model with per-user daily caps.
- Cloudflare Workers/KV/D1: free tier covers early usage.
- GitHub Pages: free.

## Don'ts
- No checkout until accounts, a refund policy and the Terms update exist.
- Never show a price we can't verify; never claim a purchase was made.
- Don't paywall honesty features (ZAP Connect, data deletion, balance hiding).

## Checkout when ready
Stripe Payment Links or Lemon Squeezy (merchant of record, handles tax). No custom payment code on the site.
