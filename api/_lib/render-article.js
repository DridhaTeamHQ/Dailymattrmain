import { html, raw, esc } from "./html.js";
import { articlePath, cleanHeadline } from "./slug.js";
import { formatDate, truncateAtWord, hostnameOf } from "./text.js";
import { artworkFor, thumbAttrs, slideAttrs } from "./media.js";
import { categoryById, hubPath } from "./categories.js";
import { PLAY_URL, APP_STORE_URL } from "./site.js";

/* the hero's sizes attribute; the router's preload repeats it */
export const SLIDE_SIZES = "(max-width: 860px) 86vw, 420px";

const crumbs = (trail) => html`
      <nav class="news-crumb" aria-label="Breadcrumb">
        ${trail.map((t, i) =>
          i === trail.length - 1
            ? html`<span aria-current="page">${t.name}</span>`
            : html`<a href="${t.path}">${t.name}</a><span aria-hidden="true">›</span>`
        )}
      </nav>`;

/* compact card used by the hubs */
export function card(post, { eager = false } = {}) {
  const title = cleanHeadline(post.headline);
  const artwork = artworkFor(post);
  const cat = categoryById(post.category_id);
  const href = articlePath(post);
  const img = artwork ? thumbAttrs(artwork) : null;
  return html`
        <li class="news-card">
          ${img
            ? html`<a class="news-thumb" href="${href}" tabindex="-1" aria-hidden="true"><img src="${img.src}" srcset="${img.srcset}" sizes="(max-width: 640px) 90vw, 260px" alt=""${raw(eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')} decoding="async" /></a>`
            : ""}
          <h2><a href="${href}">${title}</a></h2>
          <p class="news-meta">
            <time datetime="${new Date(post.published_at).toISOString()}">${formatDate(post.published_at)}</time>
            ${cat ? html`<a href="${hubPath(cat)}">${cat.label}</a>` : ""}
          </p>
        </li>`;
}

export function renderArticle({ seo, post, neighbours }) {
  const { title, heroImages: slides, points, cat, source } = seo;
  const host = hostnameOf(source);
  const older = neighbours?.older || [];
  const newer = neighbours?.newer || [];
  /* one step back and one step forward — what the arrows and swipes follow */
  const prev = older[0] || null;
  const next = newer[0] || null;

  const arrow = (post, dir, label) =>
    post
      ? html`<a class="story-arrow ${dir}" href="${articlePath(post)}" rel="${dir === "prev" ? "prev" : "next"}" data-story-step="${dir}" aria-label="${label}: ${truncateAtWord(cleanHeadline(post.headline), 60)}"><span aria-hidden="true">${dir === "prev" ? "‹" : "›"}</span></a>`
      : "";

  /* Every neighbour is a real anchor, not a scripted jump: this is how a
     crawler walks from story to story now that the related grid is gone, and
     how the page still works with JavaScript off. */
  const moreList = (posts, heading) =>
    posts.length
      ? html`
        <div class="story-more-col">
          <h2>${heading}</h2>
          <ul>
            ${posts.map((p) => html`<li><a href="${articlePath(p)}">${truncateAtWord(cleanHeadline(p.headline), 90)}</a></li>`)}
          </ul>
        </div>`
      : "";

  return html`
    <article class="article" data-story${raw(prev ? ` data-prev="${esc(articlePath(prev))}"` : "")}${raw(next ? ` data-next="${esc(articlePath(next))}"` : "")}>
${crumbs(seo.trail)}
      <div class="article-layout">
        <div class="article-media">
      ${slides.length
        ? html`
          <div class="pix">
            <ol class="article-slides" tabindex="0" aria-label="Story cards">
              ${slides.map((s, i) => {
                const img = slideAttrs(s.url);
                return html`
              <li><img${raw(s.artwork ? ' class="is-artwork"' : "")} src="${img.src}" srcset="${img.srcset}" sizes="${SLIDE_SIZES}" alt="${title}${slides.length > 1 ? ` — card ${i + 1} of ${slides.length}` : ""}"${raw(i === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')} decoding="async" /></li>`;
              })}
            </ol>
            ${slides.length > 1
              ? html`
            <button class="pix-nav prev" type="button" aria-label="Previous card">‹</button>
            <button class="pix-nav next" type="button" aria-label="Next card">›</button>
            <div class="pix-dots" role="tablist" aria-label="Story cards">
              ${slides.map((_, i) => html`<button type="button" role="tab" aria-label="Card ${i + 1}" aria-current="${i === 0 ? "true" : "false"}"></button>`)}
            </div>
            <p class="pix-count">Card <b>1</b> of ${slides.length}</p>`
              : ""}
          </div>`
        : ""}
        </div>

        <div class="article-text">
          <h1>${title}</h1>
          <p class="news-meta">
            <time datetime="${new Date(post.published_at).toISOString()}">${formatDate(post.published_at)}</time>
            ${cat ? html`<a href="${hubPath(cat)}">${cat.label}</a>` : ""}
          </p>

          <!-- the same words the card carries as pixels, as real text: this is
               what search engines and screen readers read -->
          <div class="article-body">
            <ul>
              ${points.map((p) => html`<li>${p}</li>`)}
            </ul>
          </div>

          ${source ? html`<p class="article-source">Source: <a href="${source}" target="_blank" rel="noopener nofollow">${host}</a></p>` : ""}

          <div class="article-cta" role="group" aria-label="Get dailymattr App">
            <div class="acta-left">
              <div class="acta-icon" aria-hidden="true">
                <img src="/assets/apple-touch-icon.png" width="30" height="30" alt="" loading="lazy" decoding="async" />
              </div>
              <div class="acta-text">
                <span class="acta-title">Get 100 stories a day on the app</span>
                <span class="acta-sub">Read, watch &amp; listen · Free on iOS &amp; Android</span>
              </div>
            </div>
            <div class="acta-actions">
              <a class="acta-pill acta-play" href="${PLAY_URL}" target="_blank" rel="noopener noreferrer" aria-label="Get on Google Play">
                <svg width="15" height="15" viewBox="0 0 512 512" fill="none" aria-hidden="true">
                  <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#FFC107"/>
                  <path d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" fill="#00D2FF"/>
                  <path d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z" fill="#FF3A44"/>
                  <path d="M104.6 499l280.8-161.2-60.1-60.1L104.6 499z" fill="#00E676"/>
                </svg>
                <span>Google Play</span>
              </a>
              <a class="acta-pill acta-apple" href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer" aria-label="Download on App Store">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.8 1.11-1.92.99-3.04-1 .04-2.14.67-2.82 1.47-.6.69-1.12 1.83-1 2.93 1.12.09 2.17-.56 2.83-1.36z"/>
                </svg>
                <span>App Store</span>
              </a>
            </div>
          </div>

          ${prev || next
            ? html`
          <nav class="story-nav" aria-label="Previous and next story">
            ${prev ? html`<a href="${articlePath(prev)}" rel="prev" data-story-step="prev"><small>Previous</small><span>${truncateAtWord(cleanHeadline(prev.headline), 85)}</span></a>` : ""}
            ${next ? html`<a href="${articlePath(next)}" rel="next" data-story-step="next"><small>Next</small><span>${truncateAtWord(cleanHeadline(next.headline), 85)}</span></a>` : ""}
          </nav>`
            : ""}

          ${older.length || newer.length
            ? html`
          <div class="story-more">
            ${moreList(newer, "Newer")}
            ${moreList(older, "Older")}
          </div>`
            : ""}
        </div>
      </div>

      ${arrow(prev, "prev", "Previous story")}
      ${arrow(next, "next", "Next story")}
    </article>

    <!-- shown after a run of stories; hidden until the script opens it, so an
         empty dialog never flashes and nothing shifts -->
    <div class="app-gate" id="app-gate" hidden>
      <div class="app-gate-backdrop" data-gate-dismiss></div>
      <div class="app-gate-panel" role="dialog" aria-modal="true" aria-labelledby="app-gate-title">
        <button class="app-gate-close" type="button" data-gate-dismiss aria-label="Close and keep reading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
        <div class="app-gate-stage">
          <span class="app-gate-glow" aria-hidden="true"></span>
          <figure class="gs"><img src="/assets/app-brief.webp" width="416" height="741" alt="60-word summaries — context to impact" loading="lazy" decoding="async" /></figure>
          <figure class="gs"><img src="/assets/app-qix.webp" width="416" height="742" alt="Infotainment videos — visually appealing explainers" loading="lazy" decoding="async" /></figure>
          <figure class="gs"><img src="/assets/app-pix.webp" width="418" height="741" alt="News Shots — image-based news you swipe through" loading="lazy" decoding="async" /></figure>
        </div>
        <div class="app-gate-dots" role="tablist" aria-label="App features"></div>
        <div class="app-gate-body">
          <p class="app-gate-mark">&ldquo;dailymattr&rdquo;</p>
          <h2 id="app-gate-title">Read 100 stories a&nbsp;day</h2>
          <p class="app-gate-copy">Image, video and audio explainers — fact-checked, handpicked, free.</p>
          <div class="app-gate-buttons">
            <a class="app-gate-cta app-gate-play" href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">
              <svg width="17" height="17" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
              Google Play
            </a>
            <a class="app-gate-cta app-gate-apple" href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.8 1.11-1.92.99-3.04-1 .04-2.14.67-2.82 1.47-.6.69-1.12 1.83-1 2.93 1.12.09 2.17-.56 2.83-1.36z"/></svg>
              App Store
            </a>
          </div>
          <button class="app-gate-skip" type="button" data-gate-dismiss>Keep reading</button>
        </div>
      </div>
    </div>
`;
}
