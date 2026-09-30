import { CACHE } from "./http.js";
import { page } from "./layout.js";
import { articlePath, slugify, isValidId, cleanHeadline } from "./slug.js";
import { articleHead, hubHead, articleTrail, noindexHead } from "./seo.js";
import { renderArticle, SLIDE_SIZES } from "./render-article.js";
import { slideAttrs } from "./media.js";
import { newsSitemap, sitemapIndex, monthSitemap } from "./sitemap.js";
import { renderHub } from "./render-hub.js";
import { renderError } from "./render-error.js";
import { CAROUSEL_JS, STORY_NAV_JS } from "./news-js.js";
import { categoryBySlug, hubPath, CATEGORIES } from "./categories.js";
import { getPostByPublishedId, getNeighbours, listLive } from "./queries.js";
import { SITE_NAME, PAGE_SIZE } from "./site.js";
import { isValidDateStr, formatDate } from "./text.js";

export const errorPage = (status) =>
  page({
    title: status === 410 ? `Story no longer available — ${SITE_NAME}`
      : status === 500 ? `Something went wrong — ${SITE_NAME}`
      : `Not found — ${SITE_NAME}`,
    head: noindexHead("This story is not available."),
    main: renderError(status),
  });

const fail = (status) => ({ status, type: "html", cache: CACHE.gone, body: errorPage(status), tags: ["news"] });
const moved = (location) => ({ status: 301, location, cache: CACHE.redirect });

/* `rest` is everything after "/news/"; `bare` marks a request for "/news"
 * with no trailing slash. Both come from the rewrite (or the dev middleware). */
export async function routeNews({ rest = "", bare = false, query = {} }) {
  const rawDate = query?.date ? String(query.date).trim() : null;
  const date = isValidDateStr(rawDate) ? rawDate : null;
  const querySuffix = date ? `?date=${encodeURIComponent(date)}` : "";

  if (bare) return moved(`/news/${querySuffix}`);

  const m = /^(?<body>.*?)(?<slash>\/?)$/.exec(rest);
  const body = m.groups.body;
  const trailing = m.groups.slash === "/";

  /* /news/sitemap.xml (Google News, last 48 h), /news/sitemap-index.xml and
   * the monthly /news/sitemap-YYYY-MM.xml it lists */
  if (rest === "sitemap.xml") return newsSitemap();
  if (rest === "sitemap-index.xml") return sitemapIndex();
  const month = /^sitemap-(\d{4})-(\d{2})\.xml$/.exec(rest);
  if (month) return (await monthSitemap(Number(month[1]), Number(month[2]))) || fail(404);

  /* /news/ and /news/page/N/ — page 0 doesn't exist, and a zero-padded
   * number redirects to the one canonical form like every other variant */
  if (body === "") return trailing || rest === "" ? feed({ page: 1, date }) : moved(`/news/${querySuffix}`);
  const feedPage = /^page\/(\d{1,4})$/.exec(body);
  if (feedPage) {
    const n = Number(feedPage[1]);
    if (n < 1) return fail(404);
    if (n === 1) return moved(`/news/${querySuffix}`);
    return trailing && feedPage[1] === String(n) ? feed({ page: n, date }) : moved(`/news/page/${n}/${querySuffix}`);
  }

  /* /news/<category>/ and /news/<category>/page/N/ */
  const hub = /^([a-z]{2,30})(?:\/page\/(\d{1,4}))?$/.exec(body);
  if (hub) {
    const cat = categoryBySlug(hub[1]);
    if (cat) {
      const n = hub[2] ? Number(hub[2]) : 1;
      if (n < 1) return fail(404);
      const base = hubPath(cat);
      if (hub[2] && n === 1) return moved(`${base}${querySuffix}`);
      const want = n === 1 ? `${base}${querySuffix}` : `${base}page/${n}/${querySuffix}`;
      return trailing && (!hub[2] || hub[2] === String(n)) ? feed({ page: n, cat, date }) : moved(want);
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
      preloadImage: seo.heroImages[0] ? { ...slideAttrs(seo.heroImages[0].url), sizes: SLIDE_SIZES } : null,
      script: (seo.heroImages.length > 1 ? CAROUSEL_JS : "") + STORY_NAV_JS,
    }),
  };
}

async function feed({ page: n, cat = null, date = null }) {
  const { posts, hasNext } = await listLive({ categoryId: cat?.id ?? null, page: n, size: PAGE_SIZE, date });
  if (!posts.length && n > 1) return fail(404);

  const path = cat ? hubPath(cat) : "/news/";
  const heading = cat ? `${cat.label} news` : "Latest news";
  const formattedDate = date ? formatDate(`${date}T00:00:00+05:30`) : "";
  const description = date
    ? `Browse ${cat ? cat.label.toLowerCase() : "latest"} news from ${formattedDate || date} on DailyMattr.`
    : cat
    ? cat.description
    : "The latest news in short from DailyMattr — 100 fact-checked, human-picked stories a day across India, world, business, technology, sports and entertainment.";
  const trail = [
    { name: "Home", path: "/" },
    ...(cat ? [{ name: "News", path: "/news/" }, { name: cat.label, path }] : [{ name: "News", path: "/news/" }]),
  ];

  const pageTitle = `${heading}${date ? ` (${formattedDate || date})` : ""}${n > 1 ? ` — page ${n}` : ""} — ${SITE_NAME}`;

  /* page 2+ would otherwise repeat page 1's meta description word for word;
   * the title already carries the same marker */
  const { head } = hubHead({
    title: pageTitle,
    description: n > 1 ? `${description} — page ${n}` : description,
    path, posts, page: n, hasNext, trail, date,
  });

  return {
    status: 200,
    type: "html",
    cache: date ? CACHE.error : CACHE.feed,
    tags: ["news", "news-hub", ...(cat ? [`news-cat-${cat.slug}`] : [])],
    body: page({
      title: pageTitle,
      head,
      main: renderHub({ heading, description, path, trail, posts, page: n, hasNext, date }),
    }),
  };
}

export { CATEGORIES, cleanHeadline };
