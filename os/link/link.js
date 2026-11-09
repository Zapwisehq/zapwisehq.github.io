/*! ZAPWISE//OS Plaid Link — OAuth-safe (redirect_uri + receivedRedirectUri). No secrets. */
(function () {
  "use strict";
  var WORKER = "https://zapwise-bank.zapwisehq.workers.dev";
  var TOKEN_KEY = "zapwise_bank_device_token";
  var LINK_TOKEN_KEY = "zapwise_plaid_link_token";
  var LINK_TOKEN_AT_KEY = "zapwise_plaid_link_token_at";
  var LINK_TOKEN_MAX_MS = 25 * 60 * 1000; /* link tokens expire ~30m; keep a margin */
  var statusEl = document.getElementById("status");
  var btn = document.getElementById("btnLink");
  var tipEl = document.getElementById("inAppTip");
  var btnCopy = document.getElementById("btnCopyLink");
  var btnBack = document.getElementById("btnBack");
  var RETURN_URL = "https://zapwiseai.com/os/?linked=1";
  var UPDATED_URL = "https://zapwiseai.com/os/?updated=1";
  var LINK_MODE_KEY = "zapwise_plaid_link_mode";
  /* v4.25: ?update=1 = add permissions to the existing bank link (Plaid update mode);
     ?brokerage=1 = link an investment account. Both need this device's bank token. */
  function urlMode() {
    try {
      var q = new URL(window.location.href).searchParams;
      if (q.get("update") === "1") return "update";
      if (q.get("brokerage") === "1") return "investments";
    } catch (e) {}
    return "";
  }
  function storedMode() { try { return localStorage.getItem(LINK_MODE_KEY) || ""; } catch (e) { return ""; } }
  var MODE = urlMode() || (oauthStateIdEarly() ? storedMode() : "") || "new";
  function oauthStateIdEarly() { try { return new URL(window.location.href).searchParams.get("oauth_state_id") || ""; } catch (e) { return ""; } }
  var HOME_URL = "https://zapwiseai.com/os/";

  /* v4.14.0: always give a way home. Show a prominent Back button and auto-return. */
  function showBack(label, href, primary) {
    if (!btnBack) return;
    btnBack.textContent = label || "Back to ZAPWISE//OS";
    btnBack.href = href || HOME_URL;
    btnBack.hidden = false;
    btnBack.className = "btn " + (primary ? "primary" : "ghost");
    if (primary && btn) btn.className = "btn ghost";
  }
  function goBack(href, delay) {
    showBack("Back to ZAPWISE//OS", href, true);
    setTimeout(function () {
      try { location.replace(href); } catch (e) { location.href = href; }
    }, delay == null ? 700 : delay);
  }
  function cleanUrl() {
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  function setStatus(msg, isErr) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.className = "link-status" + (isErr ? " err" : "");
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }

  function saveLinkToken(t) {
    try {
      localStorage.setItem(LINK_TOKEN_KEY, t);
      localStorage.setItem(LINK_TOKEN_AT_KEY, String(Date.now()));
      localStorage.setItem(LINK_MODE_KEY, MODE);
    } catch (e) {}
  }
  function loadLinkToken() {
    try {
      var t = localStorage.getItem(LINK_TOKEN_KEY) || "";
      var at = parseInt(localStorage.getItem(LINK_TOKEN_AT_KEY) || "0", 10) || 0;
      if (!t || !at || Date.now() - at > LINK_TOKEN_MAX_MS) return "";
      return t;
    } catch (e) { return ""; }
  }
  function clearLinkToken() {
    try {
      localStorage.removeItem(LINK_TOKEN_KEY);
      localStorage.removeItem(LINK_TOKEN_AT_KEY);
      localStorage.removeItem(LINK_MODE_KEY);
    } catch (e) {}
  }

  function headers() {
    var h = { "Content-Type": "application/json", Accept: "application/json" };
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function isInAppBrowser() {
    var ua = navigator.userAgent || "";
    return /GrokApp|Instagram|FBAN|FBAV|FBIOS|FB_IAB|Line\/|Twitter|LinkedInApp|Snapchat|TikTok|BytedanceWebview|MicroMessenger|WhatsApp|Discord|Pinterest|GSA\//i.test(ua);
  }

  function showInAppTip() {
    if (!isInAppBrowser()) return;
    if (tipEl) tipEl.hidden = false;
    if (btnCopy) {
      btnCopy.hidden = false;
      btnCopy.addEventListener("click", function () {
        var url = "https://zapwiseai.com/os/link/";
        function ok() { setStatus("Link copied. Paste it in Safari."); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(ok).catch(function () {
            window.prompt("Copy this link and open it in Safari:", url);
          });
        } else {
          window.prompt("Copy this link and open it in Safari:", url);
        }
      });
    }
  }

  function oauthStateId() {
    try {
      var u = new URL(window.location.href);
      return u.searchParams.get("oauth_state_id") || "";
    } catch (e) { return ""; }
  }

  async function createLinkToken() {
    var r = await fetch(WORKER + "/link-token", {
      method: "POST",
      credentials: "omit",
      headers: headers(),
      body: MODE === "new" ? "{}" : JSON.stringify({ mode: MODE }),
    });
    if (r.status === 401) { var e401 = new Error(MODE === "new" ? "setup_closed" : "not_paired"); e401.code = 401; throw e401; }
    if (!r.ok) throw new Error("Could not start bank link (" + r.status + ").");
    var data = await r.json();
    if (!data.link_token) throw new Error("No link token.");
    return data.link_token;
  }

  async function exchange(public_token) {
    var r = await fetch(WORKER + "/exchange", {
      method: "POST",
      credentials: "omit",
      headers: headers(),
      body: JSON.stringify({ public_token: public_token }),
    });
    if (r.status === 401) { var e401 = new Error("setup_closed"); e401.code = 401; throw e401; }
    if (!r.ok) throw new Error("Could not finish linking (" + r.status + ").");
    var data = await r.json();
    if (!data.device_token) throw new Error("No device token.");
    setToken(data.device_token);
    return data;
  }

  function openPlaid(link_token, receivedRedirectUri) {
    return new Promise(function (resolve, reject) {
      if (!window.Plaid || !window.Plaid.create) {
        reject(new Error("Plaid Link failed to load."));
        return;
      }
      var cfg = {
        token: link_token,
        onSuccess: function (public_token) {
          resolve(public_token);
        },
        onExit: function (err) {
          if (err) reject(new Error(err.display_message || err.error_message || "Link closed."));
          else reject(new Error("cancelled"));
        },
      };
      if (receivedRedirectUri) cfg.receivedRedirectUri = receivedRedirectUri;
      var handler = window.Plaid.create(cfg);
      handler.open();
    });
  }

  async function finishWithPublicToken(public_token) {
    if (MODE === "update") {
      /* update mode: the access token doesn't change, nothing to exchange */
      clearLinkToken();
      cleanUrl();
      setStatus("Done. Taking you back to ZAPWISE//OS…");
      if (btn) btn.hidden = true;
      goBack(UPDATED_URL, 600);
      return;
    }
    setStatus("Saving link on this device…");
    await exchange(public_token);
    clearLinkToken();
    cleanUrl();
    setStatus("Bank linked. Taking you back to ZAPWISE//OS…");
    if (btn) btn.hidden = true;
    goBack(RETURN_URL, 600);
  }

  function handleError(e) {
    var msg = (e && e.message) || "Something went wrong.";
    cleanUrl();
    if (msg === "cancelled") {
      clearLinkToken();
      setStatus("Cancelled. Nothing was linked. You can try again or go back.");
      showBack("Back to ZAPWISE//OS", HOME_URL, false);
    } else if (msg === "not_paired") {
      clearLinkToken();
      notPaired();
    } else if (msg === "setup_closed") {
      clearLinkToken();
      if (getToken()) {
        setStatus("Already linked on this device. Taking you back…");
        if (btn) btn.hidden = true;
        goBack(RETURN_URL, 900);
        return;
      }
      setStatus("Already linked. A bank is already connected to ZAPWISE//OS. To use it on this device, open OS on your linked phone and use Add this device.", true);
      if (btn) btn.hidden = true;
      showBack("Back to ZAPWISE//OS", HOME_URL, true);
    } else {
      setStatus(msg, true);
      showBack("Back to ZAPWISE//OS", HOME_URL, false);
    }
    if (btn) btn.disabled = false;
  }

  async function runFresh() {
    if (btn) btn.disabled = true;
    setStatus("Opening secure bank login…");
    try {
      var link_token = await createLinkToken();
      saveLinkToken(link_token);
      var public_token = await openPlaid(link_token, null);
      await finishWithPublicToken(public_token);
    } catch (e) {
      handleError(e);
    }
  }

  async function runOAuthReturn() {
    if (btn) btn.disabled = true;
    setStatus("Finishing bank link…");
    var link_token = loadLinkToken();
    if (!link_token) {
      cleanUrl();
      if (getToken()) {
        /* Returned from the bank in a page that already has a device link: just go home. */
        setStatus("Bank sign-in finished. Taking you back to ZAPWISE//OS…");
        if (btn) btn.hidden = true;
        goBack(MODE === "update" ? UPDATED_URL : RETURN_URL, 900);
        return;
      }
      setStatus("Your bank sent you back to a new page, so the link step couldn't finish here. Tap Continue to bank login to try again in this browser, or go back.", true);
      showBack("Back to ZAPWISE//OS", HOME_URL, false);
      if (btn) btn.disabled = false;
      return;
    }
    try {
      var public_token = await openPlaid(link_token, window.location.href);
      await finishWithPublicToken(public_token);
    } catch (e) {
      handleError(e);
    }
  }

  function notPaired() {
    setStatus("This browser isn't connected to your ZAPWISE bank link yet. Open this page in Safari on the phone where you linked your bank — or in ZAPWISE//OS go to Banking → Manage link → Add this device first.", true);
    if (btn) { btn.hidden = true; btn.disabled = true; }
    showBack("Back to ZAPWISE//OS", HOME_URL, true);
  }
  function paintMode() {
    var h = document.querySelector("h1"), p = document.querySelector(".link-card > p"), n = document.querySelector(".link-card > p.note");
    if (MODE === "update") {
      if (h) h.textContent = "Allow spending in ZAPWISE";
      if (p) p.textContent = "Plaid will ask you to also share transactions from the bank you already linked. Read-only: ZAPWISE can't move money, and only merchant, amount, date, category and last 4 digits come back.";
      if (n) n.textContent = "Free · same bank link, no new account · about a minute.";
      if (btn) btn.textContent = "Continue in Plaid";
    } else if (MODE === "investments") {
      if (h) h.textContent = "Link an investment account";
      if (p) p.textContent = "Sign in on your brokerage's own screen. ZAPWISE only reads holdings and values — it can't trade or move money.";
      if (n) n.textContent = "Free read-only link · shows on the Investments card, separate from Banking.";
      if (btn) btn.textContent = "Continue to brokerage login";
    }
  }

  showInAppTip();
  paintMode();
  if (MODE !== "new" && !getToken() && !oauthStateId()) notPaired();
  if (btn) btn.addEventListener("click", runFresh);

  if (oauthStateId()) {
    /* Returning from bank OAuth (USAA etc.) — resume Link with same token */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { runOAuthReturn(); });
    } else {
      runOAuthReturn();
    }
  }
})();
