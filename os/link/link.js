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
      body: "{}",
    });
    if (r.status === 401) throw new Error("Setup is closed. Open OS on a linked phone and use Add this device.");
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
    setStatus("Saving link on this device…");
    await exchange(public_token);
    clearLinkToken();
    setStatus("Linked. Taking you back…");
    setTimeout(function () {
      location.href = "/os/?bank=linked";
    }, 500);
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
      var msg = (e && e.message) || "Something went wrong.";
      if (msg === "cancelled") {
        clearLinkToken();
        setStatus("Cancelled. You can try again anytime.");
      } else {
        setStatus(msg, true);
      }
      if (btn) btn.disabled = false;
    }
  }

  async function runOAuthReturn() {
    if (btn) btn.disabled = true;
    setStatus("Finishing bank link…");
    var link_token = loadLinkToken();
    if (!link_token) {
      setStatus("This bank sign-in opened in a new page and the first step was lost. Open this page in Safari, then tap Continue again.", true);
      if (btn) btn.disabled = false;
      return;
    }
    try {
      var public_token = await openPlaid(link_token, window.location.href);
      await finishWithPublicToken(public_token);
    } catch (e) {
      var msg = (e && e.message) || "Something went wrong.";
      if (msg === "cancelled") {
        clearLinkToken();
        setStatus("Cancelled. You can try again anytime.");
      } else {
        setStatus(msg, true);
      }
      if (btn) btn.disabled = false;
    }
  }

  showInAppTip();
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
