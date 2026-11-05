(function () {
  "use strict";
  var WORKER = "https://zapwise-bank.zapwisehq.workers.dev";
  var TOKEN_KEY = "zapwise_bank_device_token";
  var statusEl = document.getElementById("status");
  var btn = document.getElementById("btnLink");

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

  function headers() {
    var h = { "Content-Type": "application/json" };
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return h;
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

  function openPlaid(link_token) {
    return new Promise(function (resolve, reject) {
      if (!window.Plaid || !window.Plaid.create) {
        reject(new Error("Plaid Link failed to load."));
        return;
      }
      var handler = window.Plaid.create({
        token: link_token,
        onSuccess: function (public_token) {
          resolve(public_token);
        },
        onExit: function (err) {
          if (err) reject(new Error(err.display_message || err.error_message || "Link closed."));
          else reject(new Error("cancelled"));
        },
      });
      handler.open();
    });
  }

  async function run() {
    btn.disabled = true;
    setStatus("Opening secure bank login…");
    try {
      var link_token = await createLinkToken();
      var public_token = await openPlaid(link_token);
      setStatus("Saving link on this device…");
      await exchange(public_token);
      setStatus("Linked. Taking you back…");
      setTimeout(function () {
        location.href = "/os/?bank=linked";
      }, 600);
    } catch (e) {
      var msg = (e && e.message) || "Something went wrong.";
      if (msg === "cancelled") setStatus("Cancelled. You can try again anytime.");
      else setStatus(msg, true);
      btn.disabled = false;
    }
  }

  if (btn) btn.addEventListener("click", run);
})();
