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

/* ---------- article ---------- */
.article { width: min(760px, 100% - 40px); margin-inline: auto; }
.article h1 { font-size: clamp(25px, 3.6vw, 38px); line-height: 1.18; letter-spacing: -0.02em; }
.article .news-meta { margin-top: 14px; font-size: 13px; }

.article-slides { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 26px 0 30px; padding-bottom: 8px; list-style: none; }
/* ---------- Pix carousel ---------- */
.pix { position: relative; margin: 26px 0 32px; }
.article-slides { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; list-style: none; padding-bottom: 8px; justify-content: center; scrollbar-width: none; }
.article-slides::-webkit-scrollbar { display: none; }
/* the box owns the aspect ratio, so the layout never shifts as the image
   arrives; posters are not all the same size, and object-fit keeps the odd
   one letterboxed rather than stretched */
.article-slides li { flex: 0 0 auto; scroll-snap-align: center; aspect-ratio: 923 / 1704; height: min(74vh, 640px); }
.article-slides img { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: 18px; background: var(--coal); }
@media (max-width: 640px) { .article-slides { justify-content: flex-start; } .article-slides li { width: 80vw; height: auto; } }

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

.article-nav { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 34px 0; }
.article-nav a { text-decoration: none; color: var(--ink); border: 1px solid var(--mist); border-radius: 16px; padding: 14px 16px; }
.article-nav a:hover { border-color: var(--ink); }
.article-nav small { display: block; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 6px; }
.article-nav span { font-size: 14.5px; line-height: 1.4; font-weight: 600; }

.news-related { margin-top: 54px; }
.news-related h2 { font-size: 20px; margin-bottom: 20px; letter-spacing: -0.01em; }

.news-empty { padding: 60px 0; color: var(--ink-soft); }
.news-empty h1 { font-size: 30px; color: var(--ink); margin-bottom: 12px; }
.news-empty a { color: var(--blue); }
`;
