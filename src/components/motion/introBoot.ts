/** Session flag: full cinematic intro has finished or been skipped. */
export const INTRO_KEY = "lj-cinematic-intro";

/**
 * Runs before the hero is parsed so the first paint is the opening frame,
 * not a flash of the finished poster. Removed as soon as the timeline is live.
 */
export const INTRO_BOOT = `(function(){
  try {
    var key = "${INTRO_KEY}";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; } catch (e) {}
    var home = location.pathname === "/";
    var root = document.documentElement;
    if (!home || reduce || seen) {
      root.dataset.intro = "done";
      root.dataset.motion = reduce ? "off" : "armed";
      return;
    }
    root.dataset.intro = "play";
    root.dataset.motion = "armed";
    root.style.setProperty("--intro-shift", "0ms");
    window.__ljIntroStart = Date.now();
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest || !target.closest("#skip-intro")) return;
      root.dataset.intro = "done";
      try { sessionStorage.setItem(key, "1"); } catch (e) {}
    });
    var seenNode = null;
    var obs = new MutationObserver(function () {
      var node = document.querySelector(".hero-script");
      if (!node || node === seenNode) return;
      var previous = seenNode;
      seenNode = node;
      if (!previous) return;
      var elapsed = Date.now() - (window.__ljIntroStart || Date.now());
      root.style.setProperty("--intro-shift", "-" + elapsed + "ms");
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      if (document.documentElement.dataset.intro === "play") {
        document.documentElement.dataset.intro = "done";
        try { sessionStorage.setItem(key, "1"); } catch (e) {}
      }
    }, 7000);
  } catch (err) {
    document.documentElement.dataset.intro = "done";
  }
})();`;
