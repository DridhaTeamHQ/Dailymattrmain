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

async function fetchStory(id) {
  const q = (rel, cols) => rest(`${rel}?id=eq.${id}&${STATUSES}&select=${cols}&limit=1`);
  let r = await q("public_articles_feed", `${COLS},image_url`);
  if (!r.ok && r.status === 404) r = await q("articles", `${COLS},image_url`);
  if (!r.ok && r.status === 400) r = await q("public_articles_feed", COLS);
  if (!r.ok) throw new Error(`story lookup failed (${r.status})`);
  const row = r.rows[0];
  if (!row) return null;
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
async function fetchTopic(id) {
  const r = await rest(`topics?id=eq.${id}&select=id,title,description,approved_at,topic_articles(articles(image_url,reviewed_at,scraped_at))&limit=1`);
  if (!r.ok) throw new Error(`topic lookup failed (${r.status})`);
  const t = r.rows[0];
  if (!t || (t.topic_articles || []).length < 3) return null;
  const arts = (t.topic_articles || []).map((m) => m.articles).filter(Boolean);
  return {
    id: t.id,
    title: decodeEntities(t.title || ""),
    description: decodeEntities(t.description || ""),
    approvedAt: t.approved_at,
    image: arts.map((a) => a.image_url).find(Boolean) || null,
  };
}

/* ---------- head tags ---------- */

const meta = (name, content) => (content ? `    <meta name="${name}" content="${esc(content)}" />\n` : "");
const prop = (property, content) => (content ? `    <meta property="${property}" content="${esc(content)}" />\n` : "");
const iso = (d) => { const t = new Date(d); return Number.isNaN(t.getTime()) ? undefined : t.toISOString(); };
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
  const { title, description, path } = storySeo(item);
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
  return { title, head, body };
}

function topicHead(topic) {
  const { title, description, path } = topicSeo(topic);
  const url = ORIGIN + path;
  const image = imageOf(topic.image);
  const head =
    baseTags({ title, description, url, type: "website", image }) +
    webPage(url, title, description) +
    ld(breadcrumbLd([homeCrumb, studioCrumb, { name: title, path }]));
  const body = `<main><h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${BASE}/">More from News Studio</a></p></main>`;
  return { title, head, body };
}

function feedHead() {
  const { title, description, path } = FEED_SEO;
  const url = ORIGIN + path;
  const head =
    baseTags({ title, description, url, type: "website" }) +
    webPage(url, title, description) +
    ld(breadcrumbLd([homeCrumb, studioCrumb]));
  return { title, head, body: `<main><h1>News Studio</h1><p>${esc(description)}</p></main>` };
}

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

  if (segs.length === 0) return { status: 200, cache: CACHE.feed, body: inject(shell, feedHead()) };

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
