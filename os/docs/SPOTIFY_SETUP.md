# Switching on Spotify in ZAPWISE//OS (one-time, free)

The Now Playing card already has the full Spotify sign-in (Authorization Code with PKCE, no client secret). It stays in the "Connect Spotify" state until a Client ID is added.

1. Sign in at https://developer.spotify.com/dashboard with the Spotify account that has **Premium** (Spotify requires the owner of a Development Mode app to have Premium).
2. **Create app**: any name (e.g. "ZAPWISE OS"), description, website `https://zapwiseai.com`.
3. **Redirect URI**: `https://zapwiseai.com/os/` (exactly, with the trailing slash).
4. **Which API**: tick **Web API**. Accept the terms, Save.
5. Copy the **Client ID** (not the secret; the secret is never used).
6. Put it in `/os/spotify.json`: `{"clientId": "<your client id>"}` and push to main.
7. Development Mode allows up to 5 Spotify users: add each person in the app's **User Management** tab (name + Spotify email). Wider use needs Spotify's extended quota review.

Scopes asked: `user-read-currently-playing user-read-playback-state user-modify-playback-state`.
Play / pause / next / previous from ZAPWISE need Spotify Premium on the listening account. Spotify does not give apps the audio itself, so the visualizer for Spotify moves with play state; music played from this device uses the real audio spectrum.
Tokens stay in this browser only (`localStorage` key `zapos.spotify`); "··· → Disconnect Spotify" removes them.
