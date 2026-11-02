/* Server-rendered SEO for the News Studio app (/news-studio/*). The app itself
 * renders in the browser; this fills in what crawlers and link previews read
 * before any script runs, following the /news article rules (seo.js):
 *   - URL    /news-studio/<headline-slug>-<id>, any other spelling 301s to it
 *   - title  the cleaned headline; H1 the same
 *   - meta description, canonical, Open Graph, Twitter, NewsArticle JSON-LD,
 *     breadcrumb
 * The title/description/slug rules are shared with the app
 * (news-studio/src/lib/seo.js + routes.js), so both always agree. */
import { esc, jsonLdScript, safeUrl } from "./html.js";
import { ORIGIN, SITE_NAME, OG_DEFAULT, AUTHOR } from "./site.js";
import { publisher, website, breadcrumbLd } from "./seo.js";
import { CACHE } from "./http.js";
import { BASE, parseSlugId, storyPath, topicPath } from "../../news-studio/src/lib/routes.js";
import { FEED_SEO, storySeo, topicSeo } from "../../news-studio/src/lib/seo.js";
import { decodeEntities, stripArtifacts } from "../../news-studio/src/lib/text.js";
import { cleanHeadline } from "./slug.js";

/* the News Studio Supabase project — public values, the same ones the app
 * bundles (news-studio/src/lib/supabaseClient.js); RLS guards the data */
const SUPABASE_URL = (process.env.NEWS_STUDIO_SUPABASE_URL || "https://ygxdrphajvrbjcaxhvcn.supabase.co").replace(/\/+$/, "");
const ANON_KEY = process.env.NEWS_STUDIO_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlneGRycGhhanZyYmpjYXhodmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDU0MjEsImV4cCI6MjA5NDkyMTQyMX0.odfY4E1DCxjb8kaXOkax4c_VI96QrzhoIW7cF6WMbes";

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, rows: await res.json() };
}

/* same visibility as the app (content.js): the public feed view, completed
 * statuses only; the base table and the image-less column list are fallbacks
 * for a staggered deploy, exactly as the app falls back */
const COLS = "id,title,edited_title,summary,edited_summary,source,url,topic,category,status,reviewed_at,scraped_at,created_at";
const STATUSES = "status=in.(summarized,approved,sent)";

async function fetchStories(filter, what) {
  const q = (rel, cols) => rest(`${rel}?${filter}&${STATUSES}&select=${cols}`);
  let r = await q("public_articles_feed", `${COLS},image_url`);
  if (!r.ok && r.status === 404) r = await q("articles", `${COLS},image_url`);
  if (!r.ok && r.status === 400) r = await q("public_articles_feed", COLS);
  if (!r.ok) throw new Error(`${what} failed (${r.status})`);
  return r.rows.map(toItem);
}

async function fetchStory(id) {
  return (await fetchStories(`id=eq.${id}&limit=1`, "story lookup"))[0] || null;
}

/* the newest stories, for the feed's crawlable list */
const fetchLatest = (limit) => fetchStories(`order=created_at.desc&limit=${limit}`, "latest stories");

function toItem(row) {
  const summary = stripArtifacts(decodeEntities(row.edited_summary || row.summary || ""));
  return {
    id: row.id,
    headline: decodeEntities(row.edited_title || row.title),
    summary,
    body: summary,
    source: decodeEntities(row.source || ""),
    sourceUrl: (row.url || "").split("#shortly")[0],
    topic: row.topic || null,
    publishedAt: row.reviewed_at || row.scraped_at || row.created_at,
    modifiedAt: row.reviewed_at || row.scraped_at || row.created_at,
    image: row.image_url || null,
  };
}

/* the app only shows topics with 3+ approved members (content.js) */
const TOPIC_COLS = "id,title,description,approved_at,topic_articles(position,added_at,articles(id,title,edited_title,status,image_url,reviewed_at,scraped_at,created_at))";
const PUBLIC = new Set(["summarized", "approved", "sent"]);

function toTopic(t) {
  if ((t.topic_articles || []).length < 3) return null;
  /* timeline order, as the app shows it: position, then when it was added */
  const members = [...t.topic_articles].sort((a, b) =>
    a.position != null && b.position != null ? a.position - b.position
      : a.position != null ? -1 : b.position != null ? 1
      : new Date(a.added_at || 0) - new Date(b.added_at || 0));
  const arts = members.map((m) => m.articles).filter(Boolean);
  const stories = arts.filter((a) => PUBLIC.has(a.status)).map((a) => ({
    id: a.id,
    headline: decodeEntities(a.edited_title || a.title || ""),
    publishedAt: a.reviewed_at || a.scraped_at || a.created_at,
  })).filter((s) => s.headline);
  const times = stories.map((s) => new Date(s.publishedAt).getTime()).filter((n) => n > 0);
  return {
    id: t.id,
    title: decodeEntities(t.title || ""),
    description: decodeEntities(t.description || ""),
    approvedAt: t.approved_at,
    modifiedAt: times.length ? new Date(Math.max(...times)).toISOString() : t.approved_at,
    image: arts.map((a) => a.image_url).find(Boolean) || null,
    stories,
  };
}

async function fetchTopic(id) {
  const r = await rest(`topics?id=eq.${id}&select=${TOPIC_COLS}&limit=1`);
  if (!r.ok) throw new Error(`topic lookup failed (${r.status})`);
  return r.rows[0] ? toTopic(r.rows[0]) : null;
}

/* every approved topic with a timeline, newest first (RLS hides the rest) */
async function fetchTopics() {
  const r = await rest(`topics?select=${TOPIC_COLS}&order=approved_at.desc`);
  if (!r.ok) throw new Error(`topics lookup failed (${r.status})`);
  return r.rows.map(toTopic).filter(Boolean);
}

/* ---------- head tags ---------- */

const meta = (name, content) => (content ? `    <meta name="${name}" content="${esc(content)}" />\n` : "");
const prop = (property, content) => (content ? `    <meta property="${property}" content="${esc(content)}" />\n` : "");
const iso = (d) => { if (!d) return undefined; const t = new Date(d); return Number.isNaN(t.getTime()) ? undefined : t.toISOString(); };
/* scraped lead images come from the outlets' own CDNs; only https ones are
 * used, anything else falls back to the site card */
const imageOf = (u) => { const s = safeUrl(u); return s.startsWith("https://") ? s : ""; };
const TOPIC_LABEL = { India: "National", World: "International", Technology: "Tech" };

function baseTags({ title, description, url, type, image, robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" }) {
  return meta("description", description) +
    `    <link rel="canonical" href="${esc(url)}" />\n` +
    meta("robots", robots) +
    prop("og:type", type) +
    prop("og:site_name", SITE_NAME) +
    prop("og:locale", "en_IN") +
    prop("og:title", title) +
    prop("og:description", description) +
    prop("og:url", url) +
    prop("og:image", image || OG_DEFAULT.url) +
    (image ? "" : prop("og:image:width", String(OG_DEFAULT.width)) + prop("og:image:height", String(OG_DEFAULT.height))) +
    prop("og:image:alt", title) +
    meta("twitter:card", "summary_large_image") +
    meta("twitter:title", title) +
    meta("twitter:description", description) +
    meta("twitter:image", image || OG_DEFAULT.url);
}

const studioCrumb = { name: "News Studio", path: `${BASE}/` };
const homeCrumb = { name: "Home", path: "/" };
const ld = (obj) => `    ${jsonLdScript(obj)}\n`;
const webPage = (url, title, description, extra = {}) => ld({
  "@context": "https://schema.org",
  "@graph": [website, {
    "@type": "WebPage", "@id": url, url, name: title, description,
    inLanguage: "en-IN", isPartOf: { "@id": website["@id"] }, publisher: { "@id": publisher["@id"] }, ...extra,
  }],
});

function storyHead(item) {
  const { title, pageTitle, description, path } = storySeo(item);
  const url = ORIGIN + path;
  const image = imageOf(item.image);
  const source = safeUrl(item.sourceUrl);
  const section = item.topic ? TOPIC_LABEL[item.topic] || item.topic : null;
  const article = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    headline: title.length > 110 ? title.slice(0, 109) + "…" : title,
    description,
    articleBody: item.summary,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: iso(item.publishedAt),
    dateModified: iso(item.modifiedAt),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    image: [image || OG_DEFAULT.url],
    publisher,
    author: { "@type": "Organization", name: AUTHOR.name, url: ORIGIN + AUTHOR.path },
    ...(section ? { articleSection: section } : {}),
    /* a summary of someone else's reporting — say so in the markup */
    ...(source ? { isBasedOn: source, citation: source } : {}),
  };
  const head =
    baseTags({ title, description, url, type: "article", image }) +
    prop("article:published_time", iso(item.publishedAt)) +
    prop("article:modified_time", iso(item.modifiedAt)) +
    (section ? prop("article:section", section) : "") +
    webPage(url, title, description, { mainEntity: { "@id": article["@id"] } }) +
    ld(article) +
    ld(breadcrumbLd([homeCrumb, studioCrumb, { name: title.length > 60 ? title.slice(0, 59) + "…" : title, path }]));
  /* what crawlers that don't run scripts read; React replaces it on load */
  const body =
    `<main><article><h1>${esc(title)}</h1>` +
    (item.summary ? `<p>${esc(item.summary)}</p>` : "") +
    (source ? `<p><a href="${esc(source)}" rel="noopener">Read the source${item.source ? ` (${esc(item.source)})` : ""}</a></p>` : "") +
    `<p><a href="${BASE}/">More from News Studio</a></p></article></main>`;
  return { title: pageTitle, head, body };
}

function topicHead(topic) {
  const { title, pageTitle, description, path } = topicSeo(topic);
  const url = ORIGIN + path;
  const image = imageOf(topic.image);
  const stories = topic.stories.map((s) => ({ ...s, path: BASE + storyPath(s) }));
  const head =
    baseTags({ title, description, url, type: "website", image }) +
    webPage(url, title, description, {
      "@type": "CollectionPage",
      ...(iso(topic.modifiedAt) ? { dateModified: iso(topic.modifiedAt) } : {}),
      mainEntity: itemList(stories),
    }) +
    ld(breadcrumbLd([homeCrumb, studioCrumb, { name: title, path }]));
  const body =
    `<main><h1>${esc(title)}</h1><p>${esc(description)}</p>` +
    storyLinks(stories, "Timeline") +
    `<p><a href="${BASE}/">More from News Studio</a></p></main>`;
  return { title: pageTitle, head, body };
}

/* the feed lists the newest stories and the trending topics as plain links,
 * so crawlers reach every page from /news-studio/ without running the app */
function feedHead({ stories = [], topics = [] } = {}) {
  const { title, description, path } = FEED_SEO;
  const url = ORIGIN + path;
  const linked = stories.map((s) => ({ ...s, path: BASE + storyPath(s) }));
  const head =
    baseTags({ title, description, url, type: "website" }) +
    webPage(url, title, description, { "@type": "CollectionPage", ...(linked.length ? { mainEntity: itemList(linked) } : {}) }) +
    ld(breadcrumbLd([homeCrumb, studioCrumb]));
  const body =
    `<main><h1>News Studio</h1><p>${esc(description)}</p>` +
    (topics.length
      ? `<section><h2>Trending topics</h2><ul>${topics.map((t) =>
          `<li><a href="${BASE}${topicPath(t)}">${esc(cleanHeadline(t.title))}</a></li>`).join("")}</ul></section>`
      : "") +
    storyLinks(linked, "Latest stories") +
    `</main>`;
  return { title, head, body };
}

const itemList = (stories) => ({
  "@type": "ItemList",
  itemListElement: stories.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: ORIGIN + s.path, name: cleanHeadline(s.headline) })),
});

const storyLinks = (stories, heading) => (stories.length
  ? `<section><h2>${esc(heading)}</h2><ol>${stories.map((s) =>
      `<li><a href="${esc(s.path)}">${esc(cleanHeadline(s.headline))}</a>` +
      (iso(s.publishedAt) ? ` <time datetime="${iso(s.publishedAt)}">${esc(new Date(s.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }))}</time>` : "") +
      `</li>`).join("")}</ol></section>`
  : "");

/* the feed's crawlable content; the page still renders if the lookup fails */
async function feedContent() {
  const [stories, topics] = await Promise.all([
    fetchLatest(FEED_LINKS).catch(() => []),
    fetchTopics().catch(() => []),
  ]);
  /* same as the app's rail: topics still getting coverage, freshest first */
  const fresh = topics.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0)).slice(0, 12);
  return { stories, topics: fresh };
}
const FEED_LINKS = 50;

const notFoundHead = () => ({
  title: "Story not found | dailymattr News Studio",
  head: meta("description", "This link doesn't match any story on dailymattr News Studio.") + meta("robots", "noindex,follow"),
  body: `<main><h1>Story not found</h1><p>Head back to <a href="${BASE}/">News Studio</a>.</p></main>`,
});

/* drawer-only URLs: the app opens a panel over the feed — never indexed */
const PRIVATE = new Set(["subscribe", "login", "profile"]);
const privateHead = () => ({ ...feedHead(), head: meta("description", FEED_SEO.description) + meta("robots", "noindex,follow") });

/* splice a page's SEO into the app shell (news-studio/index.html) */
function inject(shell, { title, head, body }) {
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<!-- studio-head[\s\S]*?<!-- \/studio-head -->\n?/, head)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

const moved = (location) => ({ status: 301, location });

/* `rest` is the path after /news-studio/ (may end in "/"), `search` the
 * visitor's query string ("" or "?…"). Returns { status, body, cache } or a
 * 301 { status, location }. */
export async function routeStudio({ rest, search = "", shell }) {
  const trailing = rest.endsWith("/") && rest !== "";
  const segs = rest.replace(/\/+$/, "").split("/").filter(Boolean);
  const keep = search && search !== "?" ? search : "";

  if (segs.length === 0) return { status: 200, cache: CACHE.feed, body: inject(shell, feedHead(await feedContent())) };

  if (segs.length === 1 && !trailing) {
    /* no News Studio sitemaps: its stories duplicate /news, which the /news
     * sitemaps already list */
    if (/^sitemap.*\.xml$/.test(segs[0])) return { status: 404, type: "text", cache: CACHE.gone, body: "Not found\n" };
  }

  if (segs.length === 1 && PRIVATE.has(segs[0])) {
    return { status: 200, cache: CACHE.feed, body: inject(shell, privateHead()) };
  }

  if (segs.length === 1 || (segs.length === 2 && segs[0] === "topic")) {
    const isTopic = segs.length === 2;
    const parsed = parseSlugId(segs[segs.length - 1]);
    /* no id: an old category link or a typo — the feed */
    if (!parsed) return moved(`${BASE}/`);
    const found = isTopic ? await fetchTopic(parsed.id) : await fetchStory(parsed.id);
    if (!found) return { status: 404, cache: CACHE.gone, body: inject(shell, notFoundHead()) };
    const canonical = BASE + (isTopic ? topicPath(found) : storyPath(found));
    /* one URL per page: wrong/old slug or a trailing slash → the canonical */
    if (trailing || `${BASE}/${segs.join("/")}` !== canonical) return moved(canonical + keep);
    return {
      status: 200,
      cache: CACHE.article,
      tags: [`news-studio-${found.id}`],
      body: inject(shell, isTopic ? topicHead(found) : storyHead(found)),
    };
  }

  return moved(`${BASE}/`);
}
