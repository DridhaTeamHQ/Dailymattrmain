import { esc } from "./html.js";
import { CACHE } from "./http.js";
import { ORIGIN, SITE_NAME } from "./site.js";
import { articlePath, cleanHeadline, isValidId } from "./slug.js";
import { modifiedAt } from "./text.js";
import { artworkFor } from "./media.js";
import { listRecentForNews, listBetween } from "./queries.js";

/* XML sitemaps for the news section, served by the same router:
 *   /news/sitemap.xml          Google News sitemap — stories from the last 48 h
 *   /news/sitemap-index.xml    the news sitemap plus one sitemap per month
 *   /news/sitemap-YYYY-MM.xml  every live story published that month (UTC)
 * Every value is from the CMS and is escaped; every URL is on ORIGIN. */

/* the first month with live stories — nothing before it to list */
const FIRST_MONTH = { y: 2026, m: 8 };

const XML_HEAD = `<?xml version="1.0" encoding="UTF-8"?>\n`;

const xml = (body, cache) => ({ status: 200, type: "xml", cache, tags: ["news", "news-sitemap"], body: XML_HEAD + body });

/* a row the article route can resolve; anything else is left out */
const listable = (p) => isValidId(p.published_id) && p.headline && p.published_at;

const pad = (n) => String(n).padStart(2, "0");
const monthKey = (y, m) => y * 12 + (m - 1);

function monthsSoFar(now = new Date()) {
  const out = [];
  const last = monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  for (let k = monthKey(FIRST_MONTH.y, FIRST_MONTH.m); k <= last; k++) out.push({ y: Math.floor(k / 12), m: (k % 12) + 1 });
  return out;
}

export async function newsSitemap() {
  const posts = (await listRecentForNews(48, 1000)).filter(listable);
  const urls = posts.map((p) => `  <url>
    <loc>${esc(ORIGIN + articlePath(p))}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(p.published_at).toISOString()}</news:publication_date>
      <news:title>${esc(cleanHeadline(p.headline))}</news:title>
    </news:news>
  </url>\n`).join("");
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}</urlset>\n`,
    CACHE.sitemapNews,
  );
}

export async function sitemapIndex() {
  const locs = [
    `${ORIGIN}/news/sitemap.xml`,
    ...monthsSoFar().map(({ y, m }) => `${ORIGIN}/news/sitemap-${y}-${pad(m)}.xml`),
  ];
  return xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map((l) => `  <sitemap><loc>${esc(l)}</loc></sitemap>\n`).join("")}</sitemapindex>\n`,
    CACHE.sitemapIndex,
  );
}

/* null when the month is outside [FIRST_MONTH, this month] */
export async function monthSitemap(y, m) {
  const now = new Date();
  const k = monthKey(y, m);
  if (m < 1 || m > 12 || k < monthKey(FIRST_MONTH.y, FIRST_MONTH.m) || k > monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1)) return null;
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  const posts = (await listBetween(start, end)).filter(listable);
  const urls = posts.map((p) => {
    const img = artworkFor(p);
    return `  <url>
    <loc>${esc(ORIGIN + articlePath(p))}</loc>
    <lastmod>${modifiedAt(p)}</lastmod>${img ? `
    <image:image><image:loc>${esc(img)}</image:loc></image:image>` : ""}
  </url>\n`;
  }).join("");
  const current = k === monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}</urlset>\n`,
    current ? CACHE.sitemapMonthCurrent : CACHE.sitemapMonthPast,
  );
}
