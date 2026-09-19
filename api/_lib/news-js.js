/* Progressive enhancement for the Pix carousel. The slides are plain <img>
 * elements in a scroll-snap row, so with JS disabled the reader still gets a
 * horizontal scroller and a crawler still sees every image. This only adds
 * the arrows, the dots and keyboard support. */

/* Story-to-story navigation: arrows on every device, plus the left and right
 * keys. Every destination is already an <a> in the page, so with JavaScript
 * off the links still work — this only adds the keys and the app prompt.
 *
 * The prompt appears after a run of stories, and X (or "Keep reading")
 * continues to the story that was pending, so nobody loses the swipe they
 * just made. It gives up after a few appearances per visit rather than
 * standing in front of someone who is reading a long run. */
export const STORY_NAV_JS = `
(() => {
  const article = document.querySelector("[data-story]");
  if (!article) return;

  const RUN = 3;          // stories between prompts
  const MAX_PROMPTS = 3;  // per visit, then never again
  const KEY_RUN = "dm.run";
  const KEY_SEEN = "dm.prompts";

  const store = {
    get(k) { try { return +sessionStorage.getItem(k) || 0; } catch { return 0; } },
    set(k, v) { try { sessionStorage.setItem(k, String(v)); } catch {} },
  };

  const gate = document.getElementById("app-gate");
  let pending = "";

  const closeGate = () => {
    if (gate) gate.hidden = true;
    document.body.style.overflow = "";
    const url = pending;
    pending = "";
    if (url) location.href = url;
  };

  const openGate = (url) => {
    if (!gate) { location.href = url; return; }
    pending = url;
    gate.hidden = false;
    document.body.style.overflow = "hidden";
    const close = gate.querySelector(".app-gate-close");
    if (close) close.focus();
  };

  const go = (dir) => {
    const url = article.getAttribute(dir === "next" ? "data-next" : "data-prev");
    if (!url) return;
    const run = store.get(KEY_RUN) + 1;
    const seen = store.get(KEY_SEEN);
    if (run >= RUN && seen < MAX_PROMPTS) {
      store.set(KEY_RUN, 0);
      store.set(KEY_SEEN, seen + 1);
      openGate(url);
      return;
    }
    store.set(KEY_RUN, run);
    location.href = url;
  };

  // the arrows and the previous/next cards are real links; intercept so the
  // run is counted, and let a modified click (new tab) through untouched
  document.querySelectorAll("[data-story-step]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      go(el.getAttribute("data-story-step"));
    });
  });

  if (gate) {
    gate.querySelectorAll("[data-gate-dismiss]").forEach((el) => el.addEventListener("click", closeGate));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !gate.hidden) closeGate(); });
  }

  document.addEventListener("keydown", (e) => {
    if (!gate || !gate.hidden) return;
    const t = e.target;
    if (t && (t.closest("input, textarea, select") || t.isContentEditable)) return;
    if (e.key === "ArrowRight") go("next");
    if (e.key === "ArrowLeft") go("prev");
  });

})();
`;

export const CAROUSEL_JS = `
(() => {
  const pix = document.querySelector(".pix");
  if (!pix) return;
  const rail = pix.querySelector(".article-slides");
  const slides = [...rail.children];
  if (slides.length < 2) return;

  const prev = pix.querySelector(".pix-nav.prev");
  const next = pix.querySelector(".pix-nav.next");
  const dots = [...pix.querySelectorAll(".pix-dots button")];
  const count = pix.querySelector(".pix-count b");
  let at = 0;

  const go = (i) => {
    at = Math.max(0, Math.min(slides.length - 1, i));
    slides[at].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const sync = () => {
    // nearest slide to the rail's centre wins
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    at = best;
    prev.disabled = at === 0;
    next.disabled = at === slides.length - 1;
    dots.forEach((d, i) => d.setAttribute("aria-current", String(i === at)));
    if (count) count.textContent = String(at + 1);
  };

  prev.addEventListener("click", () => go(at - 1));
  next.addEventListener("click", () => go(at + 1));
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)));

  let raf;
  rail.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });

  rail.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
  });

  pix.setAttribute("data-ready", "1");
  sync();
})();
`;
