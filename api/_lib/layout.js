import { html, raw, esc } from "./html.js";
import { NEWS_CSS } from "./news-css.js";
import { NAV, PLAY_URL, APP_STORE_URL, SITE_NAME, LEGAL_NAME, SUPPORT_EMAIL, ORIGIN } from "./site.js";
import { CATEGORIES, hubPath } from "./categories.js";

/* The build retains an uncached alias for server-rendered news pages.
 * Version its URL to bypass copies cached under the former immutable policy. */
const CSS_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || "revalidate-1";
const SITE_CSS = process.env.NEWS_DEV === "1"
  ? "/src/style.css"
  : `/assets/site.css?v=${encodeURIComponent(CSS_VERSION)}`;

const FONT = "Be+Vietnam+Pro:wght@400;500;600;700;800";

const navHtml = (active) => html`
    <nav class="nav-links" aria-label="Main">
      ${NAV.map((n) => html`<a href="${n.href}"${raw(n.href === active ? ' class="active"' : "")}>${n.label}</a>`)}
    </nav>`;

/* mirrors the marketing footer, plus a column of news hubs so every article
 * links into every section (crawl depth stays flat) */
const footerHtml = () => html`
  <footer class="footer" id="footer">
    <div class="footer-top">
      <div class="footer-brand">
        <p class="footer-logoline"><img class="footer-logo" src="/assets/logo.svg" alt="dailymattr" /><span>your deeper read.</span></p>
        <p class="footer-copy">dailymattr brings you the story behind the headline - with context, clarity, and perspective that help you understand what really matters.</p>
        <p class="footer-parent"><span style="color: #3979ff;">dailymattr</span> is a part of <span class="legal-brand2">DRIDHA TECHNOLOGIES PRIVATE LIMITED</span></p>
                <nav class="footer-socials" aria-label="Social media">
            <a href="https://www.instagram.com/dailymattr?stkn=MTF1bzNiZ25kNHJ6" target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in a new tab)" title="Instagram"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            <a href="https://youtube.com/@dailymattr?si=NUS1I012ywyA1c4u" target="_blank" rel="noopener noreferrer" aria-label="YouTube (opens in a new tab)" title="YouTube"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg></a>
            <a href="https://x.com/dailymattr_news" target="_blank" rel="noopener noreferrer" aria-label="X (opens in a new tab)" title="X"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.5L1 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20Z"/></svg></a>
            <a href="https://www.linkedin.com/company/https-www.dailymattr.com-/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)" title="LinkedIn"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.53 2.79-1.53 2.98 0 3.58 1.96 3.58 4.51v5.27Z"/></svg></a>
          </nav></div>
      <div class="footer-cols">
        <div class="footer-col">
          <h4>PRODUCT</h4>
          <a href="/">Home</a>
          <a href="/#showcase">What we are</a>
          <a href="/#features">Features</a>
          <a href="/newsletter/">Newsletter</a>
          <a href="/support/">Support</a>
          <a href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">Android App (Google Play)</a>
          <a href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer">iOS App (App Store)</a>
        </div>
        <div class="footer-col">
          <h4>NEWS</h4>
          <a href="/news/">Latest</a>
          ${CATEGORIES.map((c) => html`<a href="${hubPath(c)}">${c.label}</a>`)}
        </div>
        <div class="footer-col">
          <h4>LEGAL</h4>
          <a href="/editorialguidelines/">Editorial Guidelines</a>
          <a href="/privacypolicy/">Privacy Policy</a>
          <a href="/termsandconditions/">Terms &amp; Conditions</a>
        </div>
        <div class="footer-col footer-support">
          <h4>SUPPORT</h4>
          <a href="/support/">Get help</a>
          <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
        </div>
      </div>
    </div>
    <p class="footer-legal">© 2026 <span class="legal-brand">${LEGAL_NAME.toUpperCase()}</span>. All rights reserved.</p>
    <div class="footer-wordmark" aria-hidden="true"><img src="/assets/logo.svg" alt="" /></div>
  </footer>`;

/* `head` is pre-escaped markup from seo.js; `main` likewise from a renderer.
 * `title` is plain text and is escaped here. `preloadImage` is the hero's
 * { src, srcset, sizes } — the same attributes its <img> carries, so the
 * preload fetches the file the browser will actually pick. */
export function page({ title, head, main, activeNav = "/news/", preloadImage = null, script = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
${head}
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://coggfnbqqyiqfsxvtaym.supabase.co" />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" /></noscript>
  <link rel="stylesheet" href="${SITE_CSS}" />
${preloadImage?.src ? `  <link rel="preload" as="image" href="${esc(preloadImage.src)}" imagesrcset="${esc(preloadImage.srcset)}" imagesizes="${esc(preloadImage.sizes)}" fetchpriority="high" />\n` : ""}  <style>${NEWS_CSS}</style>
</head>
<body class="news-body">
  <header class="nav">
    <a class="brand" href="/"><img src="/assets/logo.svg" alt="${SITE_NAME}" /><span class="brand-tagline">Stories that mattr</span></a>
${navHtml(activeNav)}
    <div class="nav-cta">
      <a class="btn btn-dark shine" href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">Download App</a>
    </div>
  </header>

  <main class="news-page">
${main}
  </main>
${footerHtml()}
${script ? `  <script>${script}</script>\n` : ""}</body>
</html>
`;
}

export { ORIGIN };
