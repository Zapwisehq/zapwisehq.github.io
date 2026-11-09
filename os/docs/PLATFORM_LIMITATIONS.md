# ZAPWISE//OS — platform limitations (v4.24)

Internal document. Not linked from the app. What a web app on each platform can and can't do, and how ZAPWISE handles it honestly.

## All platforms (it's a web app / PWA)
- **Opening other apps is a hand-off.** ZAPWISE opens Maps, Spotify, stores, etc. It can't see what happens there, so it never says an action is "done" — it says "Opened …".
- **No background work.** Reminders are saved lists; there are no phone notifications, alarms or background location. The Inbox bell only shows what's saved on the device.
- **Calendar.** No account access (no OAuth). Events are imported from an .ics file and new events are prepared as .ics downloads you open to add. Imported calendars don't auto-update and repeating events show only their first date.
- **Storage is per device / per browser.** Lists, layout, notes and settings live in that browser's storage. Clearing site data or using a different browser starts fresh. iPhone: the Home Screen app and Safari have separate storage.
- **Shopping.** No product catalogue or price API is used. Shop Smart shows only items and prices you saved; store buttons open the store's own search.
- **Smart home.** No device control yet; the Smart Home screen says "No devices connected yet" and links to vendor apps.
- **Online answers** (Pollinations) need internet and can be wrong; they can be switched off in ZAP Connect. Commands and on-device answers work offline.
- **Offline brain** needs WebGPU (recent Chrome/Edge desktop, some Android; Safari support varies) and a large one-time download.
- **Banking** is read-only through Plaid via the private ZAPWISE Worker. Balances refresh at most every few minutes; full account and routing numbers are never shown. Linking/re-consent must be done by the account owner in Plaid Link.
- **Traffic tiles** come through a rate-limited proxy; heavy panning can briefly show the map without traffic.
- **Rate limits** on the Workers are per Cloudflare location and approximate.

## iPhone / iPad (Safari, Home Screen app)
- Speech recognition only in Safari versions that expose it; otherwise the mic falls back to typing.
- Opening other apps from a Home Screen app may show a "Open in …?" prompt.
- No Web Bluetooth/NFC; no vibration API; WebGPU limited.
- Storage can be cleared by iOS if the app isn't used for weeks.
- Bank OAuth (e.g. bank sign-in pages) leaves the app and returns via /os/link/.

## Android (Chrome)
- Install prompt via Chrome menu; app links depend on which apps are installed.
- Speech recognition uses Chrome's online service.

## Desktop browsers
- App deep links (spotify://, maps://) open the web version when the desktop app isn't installed.
- Location is approximate (Wi-Fi/IP) or off; the map labels the default area "not you".

## TV browsers
- Navigation is by arrow keys / remote (spatial navigation). Many TV browsers can't open other apps, so service tiles open the service's website. Voice is usually unavailable.

## Car
- Car view is a simplified layout in the browser, not CarPlay or Android Auto. It hides shopping and keeps navigation, voice and audio hand-offs. Don't interact while driving.

## Not possible without new accounts or paid services (not done)
- Live calendar sync, Spotify playback control, Home Assistant/HomeKit control, push notifications, product price feeds.
