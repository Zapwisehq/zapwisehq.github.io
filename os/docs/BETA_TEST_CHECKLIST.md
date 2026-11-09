# ZAPWISE//OS — beta test checklist (v4.24)

Internal document. Not linked from the app. Each line is one pass/fail check. Run on: iPhone Safari (installed to Home Screen and in the browser), Android Chrome, a desktop browser at 1366 and 1920 wide, and a TV browser or `?tv=1`.

Mark: ✅ pass · ❌ fail (note device + steps) · ➖ not applicable.

## 0. Install and update
- [ ] Opens at https://zapwiseai.com/os/ with no errors; version under the logo matches /os/version.json.
- [ ] Add to Home Screen works (Menu → Help → Add to Home Screen); launches full-screen; safe areas respected (notch, home bar).
- [ ] Menu → Check for updates says "up to date" or reloads to the new version.
- [ ] Offline (airplane mode): app opens from cache; weather/markets show saved values with an honest "offline/saved" note; nothing pretends to be live.

## 1. Home layout
- [ ] Phone: orbit menu turns by swipe, arrow keys and taps; each destination opens; bottom bar Home / Search / Profile work; "ZAP AI · your next action" strip opens ZAP AI.
- [ ] ≥1024 px: left sidebar items open the right destination; More opens the menu; bell opens Inbox; profile opens Settings; clock shows (≥1280 px).
- [ ] Desktop grid reads Today | Now Playing | ZAP AI · Focus | Navigate | Shop Smart · Banking | Investments | Quick Actions.
- [ ] Page scrolls on desktop with mouse wheel and keyboard; nothing is cut off at 360, 390, 768, 1024, 1440, 1920 and 1366 at 125 % zoom.
- [ ] Pinch zoom works on phone; tap outside any sheet closes it; Esc closes it on desktop.

## 2. Customize dashboard
- [ ] ⚙ Customize dashboard: switch a card off → it disappears; ▲ ▼ move cards; order survives a reload; Reset restores defaults.
- [ ] A hidden card still opens from the orbit / sidebar / search (shown with a note).

## 3. Search and ZAP Actions
- [ ] Typing shows apps, places, notes, actions (with "ON THIS DEVICE / OPENS ANOTHER APP / PREPARES A FILE"), "Shop for…", "Find on the map", web search and "Ask ZAP AI".
- [ ] Typing a web address offers "Open <site>"; `javascript:` and other unsafe links are refused.
- [ ] Hand-offs (maps, music, stores) say "Opened …" — never "done".
- [ ] Reminders and notes are saved only after tapping Save.
- [ ] "add event dentist tomorrow at 3pm" → NEW EVENT form → confirm → .ics file downloads → opening it adds the event in the calendar app (check on iPhone and Android).

## 4. ZAP AI
- [ ] Commands work offline (weather, focus, take me home, reminders, notes, convert, define).
- [ ] With Online answers ON, a general question gets an answer labelled as online (Pollinations); with it OFF, the panel says answers stay on this device.
- [ ] Voice button works where the browser supports speech (Chrome, Safari); hidden or falls back to typing elsewhere.
- [ ] Offline brain (optional): download size and WebGPU requirement are shown before download; Delete removes it.

## 5. ZAP Connect
- [ ] Every service shows status, what it reads, what it shares and an off/clear control.
- [ ] Location off → weather asks for a city; map says "default area (not you)".
- [ ] Bank: Refresh, Hide on this device and Forget on this device work; forgetting does not unlink the bank at the server.
- [ ] Online answers toggle matches the ZAP AI panel status.

## 6. Today, weather, calendar
- [ ] Weather matches the real conditions for the chosen place; retry works after an error.
- [ ] Calendar: import an .ics export → Today's agenda lists today/tomorrow; Remove imported calendar clears it.

## 7. Now Playing / Watch / Listen / Food / Shop
- [ ] Choosing a music app saves it; Play opens that app (hand-off only).
- [ ] Watch / Food / Shop lists save, edit, mark done and delete; store buttons open the store's own search.
- [ ] Compare shows only prices you typed, lowest first, with the "confirm on the store's page" note.

## 8. Navigate
- [ ] Map shows your area (or default area labelled "not you"); zoom, locate, traffic toggle work; traffic legend matches colours.
- [ ] Saved places: add, open directions (opens maps app), delete.

## 9. Banking and investments (real data only)
- [ ] Linked bank shows balances with last-4 digits only, "as of" time, and a working refresh (limited to every few minutes).
- [ ] Not linked / error / offline states say so plainly; no $0 or sample numbers shown as real.
- [ ] Investments: holdings you track and live prices; "Nothing tracked yet" when empty.

## 10. Focus
- [ ] 15 / 25 / 50 / custom minutes; start, pause, reset; today's sessions and minutes count up after a finished session.

## 11. TV view (`?tv=1` or Menu → View → TV view)
- [ ] Discover hero, TV sidebar and service tiles reachable with arrow keys / remote; Enter opens; link-outs open the service.
- [ ] Watchlist row shows your saved titles or an honest empty note.

## 12. Car view (`?car=1` or Menu → View → Car view)
- [ ] Only Home / Work / Speak / Music, Navigate and Now Playing show; buttons are large.
- [ ] Shopping, food and watch actions are refused with a message; Exit car view restores the dashboard.

## 13. Accessibility
- [ ] Tab order follows the screen; every control has a visible focus ring and a spoken name (VoiceOver / TalkBack).
- [ ] All touch targets at least 44 × 44 px; text readable at 200 % zoom.
- [ ] Motion off (Settings) stops animations.

## 14. Privacy and security
- [ ] No full account or routing numbers anywhere; no secrets in page source.
- [ ] Browser console shows no Content-Security-Policy violations during normal use.
- [ ] Everything you change is stored on this device only (clear site data → back to defaults).
