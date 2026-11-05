/* Thin shell: always load LIVE OS. Honor version.json for hard refresh. */
(function () {
  var LIVE = "https://zapwiseai.com/os/";
  var VER = "https://zapwiseai.com/os/version.json";
  var frame = document.getElementById("frame");
  var boot = document.getElementById("boot");
  var last = "";
  function hideBoot() { if (boot) boot.style.display = "none"; }
  if (frame) {
    frame.addEventListener("load", hideBoot);
    setTimeout(hideBoot, 4000);
  }
  function check() {
    fetch(VER + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var v = String((j && j.version) || "");
        if (!v) return;
        if (!last) { last = v; return; }
        if (v !== last) {
          last = v;
          if (frame) frame.src = LIVE + "?src=ext-newtab&v=" + encodeURIComponent(v) + "&t=" + Date.now();
        }
      })
      .catch(function () {});
  }
  check();
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });
})();
