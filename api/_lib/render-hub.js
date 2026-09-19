import { html, raw } from "./html.js";
import { CATEGORIES, hubPath } from "./categories.js";
import { card } from "./render-article.js";

const tabs = (activePath) => html`
      <nav class="news-tabs" aria-label="News sections">
        <a href="/news/"${raw(activePath === "/news/" ? ' aria-current="page"' : "")}>Latest</a>
        ${CATEGORIES.map((c) => html`<a href="${hubPath(c)}"${raw(activePath === hubPath(c) ? ' aria-current="page"' : "")}>${c.label}</a>`)}
      </nav>`;

const crumbs = (trail) => html`
      <nav class="news-crumb" aria-label="Breadcrumb">
        ${trail.map((t, i) =>
          i === trail.length - 1
            ? html`<span aria-current="page">${t.name}</span>`
            : html`<a href="${t.path}">${t.name}</a><span aria-hidden="true">›</span>`
        )}
      </nav>`;

export function renderHub({ heading, description, path, trail, posts, page, hasNext }) {
  const prevHref = page === 2 ? path : `${path}page/${page - 1}/`;
  return html`
    <div class="news-wrap">
${crumbs(trail)}
      <div class="news-head">
        <h1>${heading}${page > 1 ? ` — page ${page}` : ""}</h1>
        <p>${description}</p>
      </div>
${tabs(path)}

      ${posts.length
        ? html`
      <ol class="news-grid">
        ${posts.map((p, i) => card(p, { eager: i < 3 }))}
      </ol>`
        : html`<p class="news-empty">Nothing published here yet.</p>`}

      ${page > 1 || hasNext
        ? html`
      <nav class="news-pager" aria-label="Pagination">
        ${page > 1 ? html`<a href="${prevHref}" rel="prev">← Newer</a>` : html`<span></span>`}
        ${hasNext ? html`<a href="${path}page/${page + 1}/" rel="next">Older →</a>` : ""}
      </nav>`
        : ""}
    </div>
`;
}
