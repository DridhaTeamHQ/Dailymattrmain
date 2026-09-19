import { CACHE } from "./http.js";
import { page } from "./layout.js";
import { articlePath, slugify, isValidId, cleanHeadline } from "./slug.js";
import { articleHead, hubHead, articleTrail, noindexHead } from "./seo.js";
import { renderArticle } from "./render-article.js";
import { renderHub } from "./render-hub.js";
import { renderError } from "./render-error.js";
import { CAROUSEL_JS, STORY_NAV_JS } from "./news-js.js";
import { categoryBySlug, hubPath, CATEGORIES } from "./categories.js";
import { getPostByPublishedId, getNeighbours, listLive } from "./queries.js";
import { SITE_NAME, PAGE_SIZE } from "./site.js";

const errorPage = (status) =>
  page({
    title: status === 410 ? `Story no longer available — ${SITE_NAME}` : `Not found — ${SITE_NAME}`,
    head: noindexHead("This story is not available."),
    main: renderError(status),
  });

const fail = (status) => ({ status, type: "html", cache: CACHE.gone, body: errorPage(status), tags: ["news"] });
const moved = (location) => ({ status: 301, location, cache: CACHE.redirect });

/* `rest` is everything after "/news/"; `bare` marks a request for "/news"
 * with no trailing slash. Both come from the rewrite (or the dev middleware). */
export async function routeNews({ rest = "", bare = false }) {
  if (bare) return moved("/news/");

  const m = /^(?<body>.*?)(?<slash>\/?)$/.exec(rest);
  const body = m.groups.body;
  const trailing = m.groups.slash === "/";

  /* /news/ and /news/page/N/ */
  if (body === "") return trailing || rest === "" ? feed({ page: 1 }) : moved("/news/");
  const feedPage = /^page\/(\d{1,4})$/.exec(body);
  if (feedPage) {
    const n = Number(feedPage[1]);
    if (n === 1) return moved("/news/");
    return trailing ? feed({ page: n }) : moved(`/news/page/${n}/`);
  }

  /* /news/<category>/ and /news/<category>/page/N/ */
  const hub = /^([a-z]{2,30})(?:\/page\/(\d{1,4}))?$/.exec(body);
  if (hub) {
    const cat = categoryBySlug(hub[1]);
    if (cat) {
      const n = hub[2] ? Number(hub[2]) : 1;
      const base = hubPath(cat);
      if (hub[2] && n === 1) return moved(base);
      const want = n === 1 ? base : `${base}page/${n}/`;
      return trailing ? feed({ page: n, cat }) : moved(want);
    }
  }

  /* /news/<slug>-<published_id> — resolution is by the trailing id only */
  const art = /^(?:(.*)-)?(\d{1,12})$/.exec(body);
  if (art && isValidId(art[2])) return article({ slug: art[1] || "", id: art[2], trailing });

  return fail(404);
}

async function article({ slug, id, trailing }) {
  const found = await getPostByPublishedId(id);
  if (!found) return fail(404);
  if (found.gone) return fail(410);

  const { post } = found;
  const canonical = articlePath(post);
  /* one URL per story: a stale or mistyped slug, or a stray trailing slash,
   * redirects rather than serving duplicate content */
  if (trailing || slug !== slugify(post.headline)) return moved(canonical);

  const neighbours = await getNeighbours(post, 3);

  const seo = articleHead(post);
  seo.trail = articleTrail(post, seo.title);

  return {
    status: 200,
    type: "html",
    cache: CACHE.article,
    tags: ["news", `news-post-${post.published_id}`, ...(seo.cat ? [`news-cat-${seo.cat.slug}`] : [])],
    body: page({
      title: seo.title,
      head: seo.head,
      main: renderArticle({ seo, post, neighbours }),
      preloadImage: seo.heroImages[0]?.url || "",
      script: (seo.heroImages.length > 1 ? CAROUSEL_JS : "") + STORY_NAV_JS,
    }),
  };
}

async function feed({ page: n, cat = null }) {
  const { posts, hasNext } = await listLive({ categoryId: cat?.id ?? null, page: n, size: PAGE_SIZE });
  if (!posts.length && n > 1) return fail(404);

  const path = cat ? hubPath(cat) : "/news/";
  const heading = cat ? `${cat.label} news` : "Latest news";
  const description = cat
    ? cat.description
    : "The latest news in short from DailyMattr — 100 fact-checked, human-picked stories a day across India, world, business, technology, sports and entertainment.";
  const trail = [
    { name: "Home", path: "/" },
    ...(cat ? [{ name: "News", path: "/news/" }, { name: cat.label, path }] : [{ name: "News", path: "/news/" }]),
  ];

  const { head } = hubHead({
    title: `${heading} — ${SITE_NAME}`,
    description, path, posts, page: n, hasNext, trail,
  });

  return {
    status: 200,
    type: "html",
    cache: CACHE.feed,
    tags: ["news", "news-hub", ...(cat ? [`news-cat-${cat.slug}`] : [])],
    body: page({
      title: `${heading}${n > 1 ? ` — page ${n}` : ""} — ${SITE_NAME}`,
      head,
      main: renderHub({ heading, description, path, trail, posts, page: n, hasNext }),
    }),
  };
}

export { CATEGORIES, cleanHeadline };
