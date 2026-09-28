import { html, raw } from "./html.js";
import { CATEGORIES, hubPath } from "./categories.js";
import { card } from "./render-article.js";
import { formatDate, todayInTimezone } from "./text.js";

const tabs = (activePath, date) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return html`
      <nav class="news-tabs" aria-label="News sections">
        <a href="/news/${qs}"${raw(activePath === "/news/" ? ' aria-current="page"' : "")}>Latest</a>
        ${CATEGORIES.map((c) => html`<a href="${hubPath(c)}${qs}"${raw(activePath === hubPath(c) ? ' aria-current="page"' : "")}>${c.label}</a>`)}
      </nav>`;
};

const crumbs = (trail) => html`
      <nav class="news-crumb" aria-label="Breadcrumb">
        ${trail.map((t, i) =>
          i === trail.length - 1
            ? html`<span aria-current="page">${t.name}</span>`
            : html`<a href="${t.path}">${t.name}</a><span aria-hidden="true">›</span>`
        )}
      </nav>`;

export function renderHub({ heading, description, path, trail, posts, page, hasNext, date = null }) {
  const querySuffix = date ? `?date=${encodeURIComponent(date)}` : "";
  const prevHref = page === 2 ? `${path}${querySuffix}` : `${path}page/${page - 1}/${querySuffix}`;
  const nextHref = `${path}page/${page + 1}/${querySuffix}`;
  const today = todayInTimezone();
  const formattedDate = date ? formatDate(`${date}T00:00:00+05:30`) : "";

  return html`
    <div class="news-wrap">
${crumbs(trail)}
      <div class="news-head">
        <h1>${heading}${page > 1 ? ` — page ${page}` : ""}</h1>
        <p>${description}</p>
      </div>

      <div class="news-filter-bar">
${tabs(path, date)}
        <form class="news-date-filter" method="GET" action="${path}">
          <div class="date-picker-box">
            <svg class="date-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <label for="news-date-input" class="sr-only">Filter by date</label>
            <input
              type="date"
              id="news-date-input"
              name="date"
              class="news-date-input"
              value="${date || ""}"
              max="${today}"
              onchange="this.form.submit()"
              title="Select date to filter news"
            />
            <button type="submit" class="date-submit-btn" aria-label="Apply date filter">Filter</button>
          </div>
          ${date ? html`<a href="${path}" class="date-clear-pill" title="Clear date filter" aria-label="Clear date filter">✕ Clear</a>` : ""}
        </form>
      </div>

      ${date
        ? html`
      <div class="news-active-filter">
        <span>Filtered by date: <b>${formattedDate || date}</b></span>
        <a href="${path}" class="news-active-filter-clear">Clear filter</a>
      </div>`
        : ""}

      ${posts.length
        ? html`
      <ol class="news-grid">
        ${posts.map((p, i) => card(p, { eager: i < 3 }))}
      </ol>`
        : html`
      <div class="news-empty-state">
        <p class="news-empty">${date ? `No stories found for ${formattedDate || date}.` : "Nothing published here yet."}</p>
        ${date ? html`<p><a href="${path}" class="btn btn-dark" style="margin-top: 14px; display: inline-flex;">View all latest news</a></p>` : ""}
      </div>`}

      ${page > 1 || hasNext
        ? html`
      <nav class="news-pager" aria-label="Pagination">
        ${page > 1 ? html`<a href="${prevHref}" rel="prev">← Newer</a>` : html`<span></span>`}
        ${hasNext ? html`<a href="${nextHref}" rel="next">Older →</a>` : ""}
      </nav>`
        : ""}
    </div>
`;
}
