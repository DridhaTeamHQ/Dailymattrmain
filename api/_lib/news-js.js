/* Progressive enhancement for the Pix carousel. The slides are plain <img>
 * elements in a scroll-snap row, so with JS disabled the reader still gets a
 * horizontal scroller and a crawler still sees every image. This only adds
 * the arrows, the dots and keyboard support. */

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
