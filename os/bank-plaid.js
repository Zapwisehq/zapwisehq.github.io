/*! ZAPWISE//OS bank-plaid client — device token + Worker balances. No secrets. */
(function (global) {
  "use strict";
  var WORKER = "https://zapwise-bank.zapwisehq.workers.dev";
  var TOKEN_KEY = "zapwise_bank_device_token";
  var CACHE_KEY = "zapwise_bank_last_good";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }
  function hasToken() { return !!getToken(); }

  function saveLastGood(rows) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows: rows || [] }));
    } catch (e) {}
  }
  function loadLastGood() {
    try {
      var o = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return o && Array.isArray(o.rows) ? o : null;
    } catch (e) { return null; }
  }

  function authHeaders() {
    var h = { Accept: "application/json" };
    var t = getToken();
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  function fetchBalances(refresh) {
    var t = getToken();
    if (!t) return Promise.reject(new Error("no_token"));
    var url = WORKER + "/balances" + (refresh ? "?refresh=1" : "");
    return fetch(url, { credentials: "omit", cache: "no-store", headers: authHeaders() }).then(function (r) {
      if (r.status === 401) throw new Error("unauthorized");
      if (!r.ok) throw new Error("balances_" + r.status);
      return r.json();
    }).then(function (data) {
      var rows = (data && data.accounts) || [];
      saveLastGood(rows);
      return data;
    });
  }

  function pairCode() {
    return fetch(WORKER + "/pair-code", {
      method: "POST",
      credentials: "omit",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: "{}",
    }).then(function (r) {
      if (!r.ok) throw new Error("pair_code_" + r.status);
      return r.json();
    });
  }

  function pairWithCode(code) {
    return fetch(WORKER + "/pair", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: String(code || "").trim() }),
    }).then(function (r) {
      if (!r.ok) throw new Error("pair_" + r.status);
      return r.json();
    }).then(function (data) {
      if (data && data.device_token) setToken(data.device_token);
      return data;
    });
  }

  function unlink() {
    return fetch(WORKER + "/unlink", {
      method: "POST",
      credentials: "omit",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
      body: "{}",
    }).then(function (r) {
      if (!r.ok) throw new Error("unlink_" + r.status);
      setToken("");
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      return r.json();
    });
  }

  function status() {
    return fetch(WORKER + "/status", {
      credentials: "omit",
      headers: authHeaders(),
    }).then(function (r) { return r.ok ? r.json() : { linked: false, device: false }; }).catch(function () {
      return { linked: false, device: false };
    });
  }

  global.ZAP_BANK_PLAID = {
    WORKER: WORKER,
    TOKEN_KEY: TOKEN_KEY,
    hasToken: hasToken,
    getToken: getToken,
    setToken: setToken,
    fetchBalances: fetchBalances,
    loadLastGood: loadLastGood,
    pairCode: pairCode,
    pairWithCode: pairWithCode,
    unlink: unlink,
    status: status,
    linkPage: "/os/link/",
  };
})(typeof window !== "undefined" ? window : globalThis);
