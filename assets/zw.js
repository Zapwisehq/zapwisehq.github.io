/* ZAPWISE company pages: tiny helpers, no network calls, no tracking. */
(function () {
  var d = document;
  /* Old homepage anchors (/#shop, /#free, ...) moved to /shortcuts.html. */
  var MOVED = ["free", "prompts", "shop", "shorts", "live", "feed", "how-we-test", "try", "inside", "free-pack", "prompt_pack", "path7", "pathway", "bundle", "cheat_sheet", "spreadsheet_kit", "toolkit", "pal"];
  if ((location.pathname === "/" || location.pathname === "/index.html") && location.hash) {
    var h = location.hash.slice(1);
    if (MOVED.indexOf(h) >= 0 && !d.getElementById(h)) location.replace("/shortcuts.html#" + h);
  }
  /* Mobile menu: close after choosing a link or pressing Escape. */
  var m = d.querySelector(".zw-menu");
  if (m) {
    m.addEventListener("click", function (e) { if (e.target.closest("a")) m.removeAttribute("open"); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && m.hasAttribute("open")) { m.removeAttribute("open"); m.querySelector("summary").focus(); } });
    d.addEventListener("click", function (e) { if (m.hasAttribute("open") && !m.contains(e.target)) m.removeAttribute("open"); });
  }
})();
