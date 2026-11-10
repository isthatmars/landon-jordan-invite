/** Session flag: full cinematic intro has finished or been skipped. */
export const INTRO_KEY = "lj-cinematic-intro";

/**
 * Runs before the page is painted. The envelope waits for a gesture.
 * If that UI never mounts, the site is shown instead of a black screen.
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
    root.dataset.intro = "invite";
    root.dataset.motion = "armed";
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (target.closest("#skip-intro")) {
        root.dataset.intro = "done";
        try { sessionStorage.setItem(key, "1"); } catch (e) {}
        return;
      }
      if (!target.closest("#open-invitation") || root.dataset.intro !== "invite") return;
      root.dataset.intro = "opening";
      window.setTimeout(function () {
        root.style.setProperty("--intro-shift", "0ms");
        root.dataset.intro = "reveal";
        window.__ljIntroStart = Date.now();
        try { sessionStorage.setItem(key, "1"); } catch (e) {}
      }, 1700);
      window.setTimeout(function () {
        if (root.dataset.intro === "reveal" || root.dataset.intro === "opening") {
          root.dataset.intro = "done";
        }
      }, 3900);
    });
    window.setTimeout(function () {
      if (root.dataset.intro === "invite" && !document.getElementById("invite-envelope")) {
        root.dataset.intro = "done";
      }
    }, 4500);
  } catch (err) {
    document.documentElement.dataset.intro = "done";
  }
})();`;
