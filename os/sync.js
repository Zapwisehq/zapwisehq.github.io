/* ZAPWISE//OS sync.js v4.2.0 — Firebase Auth (Google) + Firestore prefs sync.
   Free Spark plan. Never syncs live GPS or wallet secrets. Offline-first. */
(function (global) {
  "use strict";
  var VERSION = "4.2.0";
  var FB_APP = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
  var FB_AUTH = "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js";
  var FB_FS = "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js";
  var CFG = {
    apiKey: "AIzaSyAcMp2UZLGi0rNW2SK08Krh_G1g0kQZ0FA",
    authDomain: "zapwise-os-611db.firebaseapp.com",
    projectId: "zapwise-os-611db",
    storageBucket: "zapwise-os-611db.firebasestorage.app",
    messagingSenderId: "48492481740",
    appId: "1:48492481740:web:9bfe09062388e4c2fb4669"
  };

  var state = {
    ready: false,
    user: null,
    status: "off", // off | loading | in | syncing | synced | error | offline
    lastError: "",
    lastSyncAt: 0,
    pushT: null,
    unsubAuth: null,
    unsubDoc: null,
    applying: false
  };
  var listeners = [];

  function emit() {
    var snap = getStatus();
    listeners.forEach(function (f) { try { f(snap); } catch (e) {} });
    try {
      var el = document.getElementById("hSync");
      if (!el) return;
      if (!state.user) return; // leave live-data chip alone when signed out
      if (state.status === "syncing") { el.innerHTML = '<i aria-hidden="true"></i>SYNCING'; el.title = "Uploading prefs…"; }
      else if (state.status === "synced") { el.innerHTML = '<i aria-hidden="true"></i>CLOUD'; el.title = "Account sync · " + (state.user.email || "signed in"); }
      else if (state.status === "error") { el.innerHTML = '<i aria-hidden="true"></i>SYNC ERR'; el.title = state.lastError || "Sync error"; }
      else if (state.status === "offline") { el.innerHTML = '<i aria-hidden="true"></i>OFFLINE'; el.title = "Will sync when back online"; }
      else if (state.status === "in") { el.innerHTML = '<i aria-hidden="true"></i>CLOUD'; el.title = state.user.email || "signed in"; }
    } catch (e) {}
  }

  function loadScript(url) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = url; s.async = true; s.crossOrigin = "anonymous";
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("load " + url)); };
      document.head.appendChild(s);
    });
  }

  function ensureFirebase() {
    if (global.firebase && global.firebase.apps && global.firebase.apps.length) {
      return Promise.resolve(global.firebase);
    }
    return loadScript(FB_APP).then(function () { return loadScript(FB_AUTH); }).then(function () { return loadScript(FB_FS); }).then(function () {
      if (!global.firebase.apps.length) global.firebase.initializeApp(CFG);
      try { global.firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
      return global.firebase;
    });
  }

  // Strip live GPS + any secret-looking fields before cloud write
  function sanitizePrefs(prefs) {
    var out = JSON.parse(JSON.stringify(prefs || {}));
    if (out.loc) {
      if (out.loc.mode === "city") {
        out.loc = { mode: "city", name: out.loc.name || "", lat: out.loc.lat, lon: out.loc.lon };
      } else {
        out.loc = { mode: "gps" }; // never upload live coords
      }
    }
    ["wallets", "accounts"].forEach(function (k) {
      if (!Array.isArray(out[k])) return;
      out[k] = out[k].map(function (row) {
        if (!row || typeof row !== "object") return row;
        var clean = {};
        Object.keys(row).forEach(function (key) {
          var lk = key.toLowerCase();
          if (/seed|mnemonic|private|secret|passphrase|password|wif|keystore/.test(lk)) return;
          clean[key] = row[key];
        });
        // wallets: keep public address only
        if (clean.kind === "wallet" || clean.address) {
          delete clean.seed; delete clean.mnemonic; delete clean.privateKey;
        }
        return clean;
      });
    });
    return out;
  }

  function getStatus() {
    return {
      ready: state.ready,
      signedIn: !!state.user,
      email: state.user && (state.user.email || ""),
      uid: state.user && state.user.uid,
      status: state.status,
      lastError: state.lastError,
      lastSyncAt: state.lastSyncAt
    };
  }

  function setStatus(s, err) {
    state.status = s;
    if (err != null) state.lastError = String(err || "");
    emit();
  }

  function docRef(uid) {
    return global.firebase.firestore().collection("users").doc(uid);
  }

  function pushNow() {
    if (!state.user || !global.ZAPOS || !global.ZAPOS.store) return Promise.resolve();
    if (state.applying) return Promise.resolve();
    if (navigator.onLine === false) { setStatus("offline"); return Promise.resolve(); }
    setStatus("syncing");
    var snap = global.ZAPOS.store.snapshot();
    var payload = {
      v: snap.v || 1,
      updatedAt: snap.updatedAt || Date.now(),
      prefs: sanitizePrefs(snap.prefs),
      syncedAt: Date.now(),
      client: "os-web/" + VERSION
    };
    return docRef(state.user.uid).set(payload, { merge: true }).then(function () {
      state.lastSyncAt = Date.now();
      setStatus("synced");
    }).catch(function (e) {
      setStatus("error", (e && e.message) || "push failed");
    });
  }

  function schedulePush() {
    if (!state.user) return;
    clearTimeout(state.pushT);
    state.pushT = setTimeout(function () { pushNow(); }, 900);
  }

  function pullAndMerge() {
    if (!state.user) return Promise.resolve();
    setStatus("syncing");
    return docRef(state.user.uid).get().then(function (doc) {
      if (!doc.exists) {
        // first sign-in: upload local
        return pushNow();
      }
      var remote = doc.data() || {};
      var local = global.ZAPOS.store.snapshot();
      var rAt = remote.updatedAt || 0;
      var lAt = local.updatedAt || 0;
      if (rAt > lAt && remote.prefs) {
        state.applying = true;
        try {
          // strip any GPS that slipped into remote
          if (remote.prefs.loc && remote.prefs.loc.mode !== "city") remote.prefs.loc = { mode: "gps" };
          global.ZAPOS.store.applyRemote({ v: remote.v || 1, updatedAt: rAt, prefs: remote.prefs });
          state.lastSyncAt = Date.now();
          setStatus("synced");
          // rehydrate app
          try { if (typeof global.ZAPOS.rehydrate === "function") global.ZAPOS.rehydrate(); } catch (e) {}
        } finally { state.applying = false; }
      } else if (lAt > rAt) {
        return pushNow();
      } else {
        state.lastSyncAt = Date.now();
        setStatus("synced");
      }
    }).catch(function (e) {
      setStatus("error", (e && e.message) || "pull failed");
    });
  }

  function watchDoc() {
    if (state.unsubDoc) { try { state.unsubDoc(); } catch (e) {} state.unsubDoc = null; }
    if (!state.user) return;
    state.unsubDoc = docRef(state.user.uid).onSnapshot(function (doc) {
      if (!doc.exists || state.applying) return;
      var remote = doc.data() || {};
      var local = global.ZAPOS.store.snapshot();
      if ((remote.updatedAt || 0) > (local.updatedAt || 0) && remote.prefs) {
        state.applying = true;
        try {
          if (remote.prefs.loc && remote.prefs.loc.mode !== "city") remote.prefs.loc = { mode: "gps" };
          if (global.ZAPOS.store.applyRemote({ v: remote.v || 1, updatedAt: remote.updatedAt, prefs: remote.prefs })) {
            try { if (typeof global.ZAPOS.rehydrate === "function") global.ZAPOS.rehydrate(); } catch (e) {}
          }
          state.lastSyncAt = Date.now();
          setStatus("synced");
        } finally { state.applying = false; }
      }
    }, function (err) {
      setStatus("error", (err && err.message) || "watch failed");
    });
  }

  function bindStore() {
    if (!global.ZAPOS || !global.ZAPOS.store || global.ZAPOS.store._syncBound) return;
    global.ZAPOS.store._syncBound = true;
    global.ZAPOS.store.onChange(function (k, v, src) {
      if (src === "remote" || src === "sync") return;
      if (!state.user) return;
      schedulePush();
    });
  }

  function start() {
    if (state.ready) return Promise.resolve(getStatus());
    setStatus("loading");
    return ensureFirebase().then(function () {
      state.ready = true;
      bindStore();
      state.unsubAuth = global.firebase.auth().onAuthStateChanged(function (user) {
        state.user = user || null;
        if (user) {
          setStatus("in");
          pullAndMerge().then(watchDoc);
        } else {
          if (state.unsubDoc) { try { state.unsubDoc(); } catch (e) {} state.unsubDoc = null; }
          setStatus("off");
        }
      });
      window.addEventListener("online", function () {
        if (state.user) pullAndMerge().then(function () { schedulePush(); });
      });
      window.addEventListener("offline", function () {
        if (state.user) setStatus("offline");
      });
      return getStatus();
    }).catch(function (e) {
      setStatus("error", (e && e.message) || "firebase load failed");
      return getStatus();
    });
  }

  function signIn() {
    return start().then(function () {
      var provider = new global.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return global.firebase.auth().signInWithPopup(provider).catch(function (err) {
        // popup blocked → redirect
        if (err && (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user")) {
          return global.firebase.auth().signInWithRedirect(provider);
        }
        throw err;
      });
    }).then(function () { return getStatus(); }).catch(function (e) {
      setStatus("error", (e && e.message) || "sign-in failed");
      throw e;
    });
  }

  function signOut() {
    return start().then(function () {
      return global.firebase.auth().signOut();
    }).then(function () { setStatus("off"); return getStatus(); });
  }

  function syncNow() {
    return start().then(function () {
      if (!state.user) return getStatus();
      return pullAndMerge().then(function () { return pushNow(); }).then(function () { return getStatus(); });
    });
  }

  function onChange(f) { listeners.push(f); try { f(getStatus()); } catch (e) {} }

  global.ZAPSYNC = {
    version: VERSION,
    start: start,
    signIn: signIn,
    signOut: signOut,
    syncNow: syncNow,
    status: getStatus,
    onChange: onChange,
    sanitizePrefs: sanitizePrefs
  };
})(typeof window !== "undefined" ? window : this);
