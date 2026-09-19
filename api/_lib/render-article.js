import { html, raw } from "./html.js";
import { articlePath, cleanHeadline } from "./slug.js";
import { formatDate, truncateAtWord, hostnameOf } from "./text.js";
import { artworkFor, thumbAttrs, slideAttrs } from "./media.js";
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
    <article class="article" data-story${raw(prev ? ` data-prev="${articlePath(prev)}"` : "")}${raw(next ? ` data-next="${articlePath(next)}"` : "")}>
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
              <li><img${raw(s.artwork ? ' class="is-artwork"' : "")} src="${img.src}" srcset="${img.srcset}" sizes="(max-width: 860px) 86vw, 420px" alt="${title}${slides.length > 1 ? ` — card ${i + 1} of ${slides.length}` : ""}"${raw(i === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')} decoding="async" /></li>`;
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

          <div class="article-cta">
            <p>Get 100 stories a day — read, watch and listen on DailyMattr.</p>
            <a href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">Download the app</a>
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
        <div class="app-gate-shot" aria-hidden="true">
          <img src="/assets/screen-home.jpg?v=5" width="900" height="2045" alt="" loading="lazy" decoding="async" />
        </div>
        <div class="app-gate-body">
          <p class="app-gate-mark">&ldquo;dailymattr&rdquo;</p>
          <h2 id="app-gate-title">Read 100 stories a&nbsp;day</h2>
          <p class="app-gate-copy">Text, video and audio explainers — fact-checked, human-picked, free.</p>
          <a class="app-gate-cta" href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">
            <svg width="17" height="17" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
            Get it on Google Play
          </a>
          <button class="app-gate-skip" type="button" data-gate-dismiss>Keep reading</button>
        </div>
      </div>
    </div>
`;
}
