import { html, raw } from "./html.js";
import { NEWS_CSS } from "./news-css.js";
import { NAV, PLAY_URL, SITE_NAME, LEGAL_NAME, SUPPORT_EMAIL, ORIGIN } from "./site.js";
import { CATEGORIES, hubPath } from "./categories.js";

/* In production the marketing CSS is emitted at a stable path (see
 * vite.config.js assetFileNames); the dev server serves the source file. */
const SITE_CSS = process.env.NEWS_DEV === "1" ? "/src/style.css" : "/assets/site.css";

const FONT = "Be+Vietnam+Pro:wght@400;500;600;700;800";

const navHtml = (active) => html`
    <nav class="nav-links">
      ${NAV.map((n) => html`<a href="${n.href}"${raw(n.href === active ? ' class="active"' : "")}>${n.label}</a>`)}
    </nav>`;

/* mirrors the marketing footer, plus a column of news hubs so every article
 * links into every section (crawl depth stays flat) */
const footerHtml = () => html`
  <footer class="footer news-footer">
    <div class="news-wrap">
      <div class="footer-cols">
        <div class="footer-col">
          <h4>PRODUCT</h4>
          <a href="/">Home</a>
          <a href="/#showcase">What are we</a>
          <a href="/#features">Features</a>
          <a href="/news/">News</a>
          <a href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">Download APP</a>
        </div>
        <div class="footer-col">
          <h4>NEWS</h4>
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
      <p class="footer-legal">© 2026 <span class="legal-brand">${LEGAL_NAME.toUpperCase()}</span>. All rights reserved.</p>
    </div>
  </footer>`;

/* `head` is pre-escaped markup from seo.js; `main` likewise from a renderer */
export function page({ title, head, main, activeNav = "/news/", preloadImage = "", script = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
${head}
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg?v=2" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://coggfnbqqyiqfsxvtaym.supabase.co" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONT}&display=swap" /></noscript>
  <link rel="stylesheet" href="${SITE_CSS}" />
${preloadImage ? `  <link rel="preload" as="image" href="${preloadImage}" fetchpriority="high" />\n` : ""}  <style>${NEWS_CSS}</style>
</head>
<body class="news-body">
  <header class="nav">
    <a class="brand" href="/"><img src="/assets/logo.svg" alt="${SITE_NAME}" /></a>
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
