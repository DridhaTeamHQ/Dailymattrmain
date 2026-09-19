/* Layout skeleton for the /news pages. Deliberately restrained — it uses the
 * marketing site's own tokens (src/style.css) and adds no new colours, so the
 * visual design can be replaced later without touching the templates. */

export const NEWS_CSS = `
.news-page { padding-top: calc(var(--nav-h) + 28px); padding-bottom: 80px; background: var(--paper); }
.news-wrap { width: min(1120px, 100% - 40px); margin-inline: auto; }
.news-crumb { display: flex; flex-wrap: wrap; gap: 6px; font-size: 13px; color: var(--ink-soft); margin-bottom: 18px; }
.news-crumb a { color: var(--ink-soft); text-decoration: none; }
.news-crumb a:hover { color: var(--blue); }
.news-crumb span[aria-current] { color: var(--ink); }

.news-head { margin-bottom: 26px; }
.news-head h1 { font-size: clamp(26px, 4vw, 40px); line-height: 1.15; letter-spacing: -0.02em; }
.news-head p { margin-top: 10px; color: var(--ink-soft); max-width: 62ch; font-size: 15px; }

.news-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 30px; }
.news-tabs a { font-size: 13.5px; font-weight: 600; padding: 8px 14px; border-radius: 999px; text-decoration: none; color: var(--ink); background: #f3f3f6; }
.news-tabs a:hover { background: var(--mist); }
.news-tabs a[aria-current] { background: var(--blue); color: #fff; }

.news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 26px 22px; list-style: none; }
.news-card { display: flex; flex-direction: column; gap: 10px; }
.news-card a.news-thumb { display: block; overflow: hidden; border-radius: 16px; background: var(--mist); aspect-ratio: 3 / 4; }
.news-card a.news-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; transition: transform .35s ease; }
.news-card a.news-thumb:hover img { transform: scale(1.03); }
.news-card h2 { font-size: 15.5px; line-height: 1.35; font-weight: 600; letter-spacing: -0.01em; }
.news-card h2 a { color: var(--ink); text-decoration: none; }
.news-card h2 a:hover { color: var(--blue); }
.news-card .news-teaser { font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); }
.news-meta { font-size: 12px; color: var(--ink-soft); display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.news-meta a { color: var(--blue); text-decoration: none; font-weight: 600; }

.news-pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 48px; }
.news-pager a { font-size: 14px; font-weight: 600; color: var(--ink); text-decoration: none; padding: 10px 18px; border: 1px solid var(--mist); border-radius: 999px; }
.news-pager a:hover { border-color: var(--ink); }

/* ---------- article: cards on the left, words on the right ---------- */
.article { width: min(1120px, 100% - 40px); margin-inline: auto; }
.article-layout { display: grid; grid-template-columns: minmax(280px, 400px) minmax(0, 1fr); gap: clamp(28px, 4vw, 64px); align-items: start; }
/* the cards stay in view while the reader scrolls the text beside them */
.article-media { position: sticky; top: calc(var(--nav-h) + 20px); }
.article-text { min-width: 0; }
.article h1 { font-size: clamp(25px, 3.2vw, 38px); line-height: 1.18; letter-spacing: -0.02em; }
.article .news-meta { margin: 14px 0 26px; font-size: 13.5px; }
/* Phones: the card is pinned and the text slides up over it as a sheet —
   the way a story reads in the app. The media box sticks below the nav for
   as long as the layout lasts; the text column paints above it, starts
   overlapping by a little so its edge shows on first paint, and covers the
   card as the reader scrolls. When the text runs out the pinned card is
   released and the page continues normally. */
@media (max-width: 860px) {
  .article { width: 100%; }
  .article .news-crumb { padding: 0 20px; }
  .article-layout { display: block; }
  .article-media {
    position: sticky; top: var(--nav-h); z-index: 0;
    height: calc(76vh - var(--nav-h)); height: calc(76svh - var(--nav-h));
    background: var(--coal); overflow: hidden;
  }
  .article-media .pix { height: 100%; margin: 0; }
  .article-media::after {
    /* grounds the sheet's edge on the picture */
    content: ""; position: absolute; inset: auto 0 0 0; height: 96px; pointer-events: none;
    background: linear-gradient(to bottom, rgba(10,10,11,0), rgba(10,10,11,.55));
  }
  .article-text {
    position: relative; z-index: 1;
    margin-top: -28px; padding: 30px 20px 40px;
    background: var(--paper); border-radius: 26px 26px 0 0;
    box-shadow: 0 -14px 34px rgba(10,10,11,.22);
  }
  .article-text::before {
    content: ""; display: block; width: 40px; height: 4px; border-radius: 2px;
    background: var(--mist); margin: -12px auto 20px;
  }
}

/* ---------- Pix carousel ---------- */
.pix { position: relative; margin: 0 0 8px; }
/* start-aligned on purpose: with two or more full-width cards the row
   overflows, and centring it would centre the overflow, so the reader sees
   half of card 1 and half of card 2 with no way to scroll back to the start.
   A single card fills the column either way. (No backticks in these
   comments - the whole stylesheet is one JS template literal.) */
.article-slides { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; list-style: none; padding-bottom: 8px; scrollbar-width: none; }
.article-slides::-webkit-scrollbar { display: none; }
/* the box owns the aspect ratio, so the layout never shifts as the image
   arrives; posters are not all the same size, and object-fit keeps the odd
   one letterboxed rather than stretched */
.article-slides li { flex: 0 0 100%; scroll-snap-align: center; aspect-ratio: 923 / 1704; }
.article-slides img { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: 18px; background: var(--coal); }
/* a plain photograph is cropped to the box rather than letterboxed — only a
   designed card needs to be shown whole */
.article-slides img.is-artwork { object-fit: cover; }
@media (max-width: 860px) {
  /* inside the pinned box: one full-height card per swipe, no rounded
     corners against the dark surround, dots laid over the picture */
  .article-slides { height: 100%; gap: 0; padding: 0; justify-content: flex-start; }
  .article-slides li { flex-basis: 100%; height: 100%; aspect-ratio: auto; }
  .article-slides img { border-radius: 0; }
  .pix-nav { display: none; }
  .pix-dots { position: absolute; left: 0; right: 0; bottom: 44px; z-index: 1; margin: 0; }
  .pix-dots button { background: rgba(255,255,255,.45); }
  .pix-dots button[aria-current="true"] { background: #fff; }
  .pix-count { display: none; }
}

.pix-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border-radius: 50%; border: 0; background: rgba(10,10,11,.72); color: #fff; font-size: 19px; line-height: 1; cursor: pointer; display: grid; place-items: center; transition: background .2s ease, opacity .2s ease; }
.pix-nav:hover { background: var(--coal); }
.pix-nav[disabled] { opacity: .25; cursor: default; }
.pix-nav.prev { left: 6px; }
.pix-nav.next { right: 6px; }
.pix-dots { display: flex; gap: 7px; justify-content: center; margin-top: 14px; }
.pix-dots button { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; background: var(--mist); cursor: pointer; transition: background .2s ease, width .2s ease; }
.pix-dots button[aria-current="true"] { background: var(--blue); width: 22px; border-radius: 4px; }
.pix-count { text-align: center; margin-top: 10px; font-size: 12.5px; color: var(--ink-soft); }
/* without JS the row is still a horizontal scroller, so nothing is hidden */
.pix:not([data-ready]) .pix-nav, .pix:not([data-ready]) .pix-dots { display: none; }

.article-body ul { list-style: none; display: grid; gap: 14px; }
.article-body li { position: relative; padding-left: 20px; font-size: 16.5px; line-height: 1.6; }
.article-body li::before { content: ""; position: absolute; left: 2px; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: var(--blue); }
.article-source { margin-top: 26px; font-size: 13.5px; color: var(--ink-soft); }
.article-source a { color: var(--blue); }

.article-cta { margin: 40px 0; padding: 22px; border-radius: var(--radius-panel); background: var(--coal); color: #fff; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; }
.article-cta p { font-size: 15px; font-weight: 600; }
.article-cta a { background: var(--blue); color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 11px 20px; border-radius: 999px; }

/* ---------- story to story ---------- */
.story-nav { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 34px 0 30px; }
.story-nav a { text-decoration: none; color: var(--ink); border: 1px solid var(--mist); border-radius: 16px; padding: 14px 16px; }
.story-nav a:hover { border-color: var(--ink); }
.story-nav small { display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 6px; }
.story-nav span { font-size: 14.5px; line-height: 1.4; font-weight: 600; }

/* the rest of the run: plain links, so the chain stays crawlable without a
   wall of thumbnails */
.story-more { display: grid; gap: 22px clamp(24px, 4vw, 56px); grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin-bottom: 8px; padding-top: 24px; border-top: 1px solid var(--mist); }
.story-more h2 { font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; margin-bottom: 12px; }
.story-more ul { list-style: none; display: grid; gap: 11px; }
.story-more a { color: var(--ink); text-decoration: none; font-size: 14.5px; line-height: 1.45; font-weight: 500; }
.story-more a:hover { color: var(--blue); }

/* arrows beside the story, on every device */
.story-arrow { position: fixed; top: 50%; transform: translateY(-50%); z-index: 40; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; text-decoration: none; font-size: 26px; line-height: 1; color: var(--ink); background: var(--paper); border: 1px solid var(--mist); box-shadow: 0 6px 22px rgba(10,10,11,.10); transition: transform .18s ease, border-color .18s ease; }
.story-arrow:hover { border-color: var(--ink); transform: translateY(-50%) scale(1.06); }
.story-arrow.prev { left: clamp(8px, 2vw, 26px); }
.story-arrow.next { right: clamp(8px, 2vw, 26px); }
/* On a phone they sit in a bar along the bottom, within thumb reach. A bar
   rather than free-floating buttons: circles hovering over a headline cover
   words and look broken, and the page gets padding so nothing ends up
   permanently underneath them. */
@media (max-width: 860px) {
  .story-arrow { top: auto; bottom: calc(15px + env(safe-area-inset-bottom)); transform: none; width: 44px; height: 44px; box-shadow: none; }
  .story-arrow:hover { transform: none; }
  .story-arrow.prev { left: 16px; }
  .story-arrow.next { right: 16px; }
  .article::after {
    content: ""; position: fixed; z-index: 39; left: 0; right: 0; bottom: 0;
    height: calc(74px + env(safe-area-inset-bottom));
    background: var(--paper); border-top: 1px solid var(--mist);
  }
  /* so the end of the story is never stuck under the bar */
  .news-page { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }
}

/* ---------- app prompt ----------
   A quiet word from the newsroom, not an ad: the serif wordmark anchors it,
   the number carries the whole proposition, and the blue appears exactly once
   - on the thing to press. On dark, depth comes from tone and a hairline
   rather than shadows; the one shadow is there because the panel floats. */
.app-gate { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px; }
.app-gate[hidden] { display: none; }
.app-gate-backdrop { position: absolute; inset: 0; background: rgba(10,10,11,.62); animation: gate-fade .22s ease-out; }
@supports (backdrop-filter: blur(3px)) { .app-gate-backdrop { backdrop-filter: blur(3px); } }

/* Light, like the page it interrupts, so it reads as part of the site rather
   than an ad pasted over it. The app screen does the persuading — it is the
   only picture, and it runs off the bottom edge so the panel feels like a
   window onto something larger. */
.app-gate-panel {
  position: relative; width: min(500px, 100%); max-height: calc(100vh - 40px); overflow: hidden;
  display: grid; grid-template-columns: 152px minmax(0, 1fr); gap: 26px; align-items: center;
  background: var(--paper); color: var(--ink);
  border-radius: var(--radius-panel); padding: 34px 32px 34px 30px;
  box-shadow: 0 30px 80px rgba(10,10,11,.32);
  animation: gate-rise .24s cubic-bezier(.2,.7,.3,1);
}

.app-gate-shot { align-self: stretch; min-height: 232px; margin: -34px 0 -34px 0; border-radius: 20px; overflow: hidden; background: var(--mist); box-shadow: 0 10px 30px rgba(10,10,11,.18); }
.app-gate-shot img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; }

.app-gate-body { text-align: left; }
.app-gate-mark { font-family: var(--font-serif); font-size: 13.5px; color: var(--ink-soft); }
.app-gate-panel h2 { font-size: 25px; font-weight: 700; line-height: 1.14; letter-spacing: -0.025em; margin: 10px 0 0; }
.app-gate-copy { font-size: 14px; line-height: 1.5; color: var(--ink-soft); margin: 10px 0 0; }

.app-gate-cta { display: inline-flex; align-items: center; justify-content: center; gap: 9px; margin: 20px 0 0; background: var(--blue); color: #fff; text-decoration: none; font-weight: 700; font-size: 14.5px; padding: 12px 20px; border-radius: 999px; transition: background .18s ease, transform .18s ease; }
.app-gate-cta:hover { background: var(--blue-soft); transform: translateY(-1px); }
.app-gate-cta svg { margin-top: -1px; }
.app-gate-skip { display: block; background: none; border: 0; color: var(--ink-soft); font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 12px 2px 0; font-family: inherit; transition: color .18s ease; }
.app-gate-skip:hover { color: var(--ink); }

.app-gate-close { position: absolute; top: 12px; right: 12px; z-index: 2; width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 50%; background: rgba(10,10,11,.06); color: var(--ink-soft); cursor: pointer; transition: background .18s ease, color .18s ease; }
.app-gate-close:hover { background: rgba(10,10,11,.12); color: var(--ink); }

@keyframes gate-fade { from { opacity: 0; } }
@keyframes gate-rise { from { opacity: 0; transform: translateY(10px) scale(.97); } }

/* on a phone it arrives as a sheet from the bottom edge, where the thumb is */
@media (max-width: 560px) {
  .app-gate { place-items: end stretch; padding: 0; }
  .app-gate-panel {
    width: 100%; max-height: 90vh; grid-template-columns: 116px minmax(0, 1fr); gap: 20px;
    border-radius: 26px 26px 0 0; padding: 26px 22px calc(24px + env(safe-area-inset-bottom)) 20px;
    animation-name: gate-sheet;
  }
  .app-gate-shot { min-height: 200px; margin: -26px 0 calc(-24px - env(safe-area-inset-bottom)) 0; border-radius: 16px; }
  .app-gate-panel h2 { font-size: 22px; }
}
@keyframes gate-sheet { from { transform: translateY(100%); } }

@media (prefers-reduced-motion: reduce) {
  .app-gate-backdrop, .app-gate-panel { animation: none; }
  .app-gate-cta:hover { transform: none; }
}

.news-empty { padding: 60px 0; color: var(--ink-soft); }
.news-empty h1 { font-size: 30px; color: var(--ink); margin-bottom: 12px; }
.news-empty a { color: var(--blue); }
`;
