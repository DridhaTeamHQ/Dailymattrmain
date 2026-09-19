import { html, raw } from "./html.js";
import { articlePath, cleanHeadline } from "./slug.js";
import { formatDate, truncateAtWord, hostnameOf } from "./text.js";
import { posterFor, thumbAttrs, slideAttrs } from "./media.js";
import { categoryById, hubPath } from "./categories.js";
import { PLAY_URL } from "./site.js";

const crumbs = (trail) => html`
      <nav class="news-crumb" aria-label="Breadcrumb">
        ${trail.map((t, i) =>
          i === trail.length - 1
            ? html`<span aria-current="page">${t.name}</span>`
            : html`<a href="${t.path}">${t.name}</a><span aria-hidden="true">›</span>`
        )}
      </nav>`;

/* compact card used by the hubs, the related rail and prev/next thumbs */
export function card(post, { eager = false } = {}) {
  const title = cleanHeadline(post.headline);
  const poster = posterFor(post);
  const cat = categoryById(post.category_id);
  const href = articlePath(post);
  const img = poster ? thumbAttrs(poster) : null;
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

export function renderArticle({ seo, post, related, prev, next }) {
  const { title, slides, points, cat, source } = seo;
  const host = hostnameOf(source);
  return html`
    <article class="article">
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
              <li><img src="${img.src}" srcset="${img.srcset}" sizes="(max-width: 860px) 86vw, 420px" alt="${title}${slides.length > 1 ? ` — card ${i + 1} of ${slides.length}` : ""}"${raw(i === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')} decoding="async" /></li>`;
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

          <div class="article-body">
            <ul>
              ${points.map((p) => html`<li>${p}</li>`)}
            </ul>
          </div>

          ${source ? html`<p class="article-source">Source: <a href="${source}" target="_blank" rel="noopener nofollow">${host}</a></p>` : ""}

          <div class="article-cta">
            <p>Get 100 stories a day — read, watch and listen on DailyMattr.</p>
            <a href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">Download the app</a>
          </div>

          ${prev || next
            ? html`
          <nav class="article-nav" aria-label="More stories">
            ${prev ? html`<a href="${articlePath(prev)}" rel="prev"><small>Previous</small><span>${truncateAtWord(cleanHeadline(prev.headline), 85)}</span></a>` : ""}
            ${next ? html`<a href="${articlePath(next)}" rel="next"><small>Next</small><span>${truncateAtWord(cleanHeadline(next.headline), 85)}</span></a>` : ""}
          </nav>`
            : ""}
        </div>
      </div>
    </article>

    ${related.length
      ? html`
    <section class="news-wrap news-related">
      <h2>More in ${cat ? cat.label : "News"}</h2>
      <ol class="news-grid">
        ${related.map((p) => card(p))}
      </ol>
    </section>`
      : ""}
`;
}
