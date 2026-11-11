/** Session flag: full cinematic intro has finished or been skipped. */
export const INTRO_KEY = "lj-cinematic-intro";

/**
 * Runs before the page is painted. The envelope waits for a gesture.
 * If that UI never mounts, the site is shown instead of a black screen.
 *
 * Also pins first paint to the top unless the URL hash intentionally
 * targets a section (e.g. /#rsvp). Browser scroll restoration otherwise
 * can reopen the RSVP block after a prior visit.
 */
export const INTRO_BOOT = `(function(){
  try {
    var key = "${INTRO_KEY}";
    var root = document.documentElement;
    var home = location.pathname === "/" || location.pathname === "";
    var hash = (location.hash || "").replace(/^#/, "");
    var intentionalHash = hash === "home" || hash === "mixtape" || hash === "watch" || hash === "arcade" || hash === "lineup" || hash === "rsvp";

    if ("scrollRestoration" in history) {
      try { history.scrollRestoration = "manual"; } catch (e) {}
    }

    function pinTop() {
      if (!(window.scrollX || window.scrollY)) return;
      // Don't fight a guest who already scrolled deep (footer / host link).
      if (window.scrollY > Math.min(480, window.innerHeight * 0.55)) return;
      var prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
      var active = document.activeElement;
      if (active && active.closest && active.closest("#rsvp") && typeof active.blur === "function") {
        active.blur();
      }
    }

    function goHash() {
      if (!intentionalHash) return;
      var el = document.getElementById(hash);
      if (el) el.scrollIntoView();
    }

    function afterIntro() {
      if (intentionalHash) goHash();
      else pinTop();
    }

    function onFirstPaint() {
      // Even with /#rsvp, stay at the top while the envelope covers the page.
      var intro = root.dataset.intro;
      var busy = intro === "invite" || intro === "opening" || intro === "reveal";
      if (busy || !intentionalHash) pinTop();
      else goHash();
    }

    // Defeat late scroll restoration / focus jumps on first load.
    onFirstPaint();
    document.addEventListener("DOMContentLoaded", onFirstPaint);
    window.addEventListener("load", function () {
      onFirstPaint();
      window.requestAnimationFrame(onFirstPaint);
    });
    window.addEventListener("pageshow", onFirstPaint);
    // Keep pinning briefly so restoration that fires after DOMContentLoaded loses.
    if (!intentionalHash) {
      var guardUntil = Date.now() + 900;
      var guard = window.setInterval(function () {
        var nowHash = (location.hash || "").replace(/^#/, "");
        if (Date.now() > guardUntil || nowHash) {
          window.clearInterval(guard);
          return;
        }
        if (window.scrollY > 0) pinTop();
      }, 50);
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; } catch (e) {}
    if (!home || reduce || seen) {
      root.dataset.intro = "done";
      root.dataset.motion = reduce ? "off" : "armed";
      // Intro already done — honor an intentional hash after paint.
      if (intentionalHash) {
        document.addEventListener("DOMContentLoaded", goHash);
        window.addEventListener("load", goHash);
      }
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
        afterIntro();
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
          afterIntro();
        }
      }, 3900);
    });
    window.setTimeout(function () {
      if (root.dataset.intro === "invite" && !document.getElementById("invite-envelope")) {
        root.dataset.intro = "done";
        afterIntro();
      }
    }, 4500);
  } catch (err) {
    document.documentElement.dataset.intro = "done";
    try { window.scrollTo(0, 0); } catch (e) {}
  }
})();`;
