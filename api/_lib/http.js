/* Response helpers. Cache-Control set here overrides vercel.json headers.
 * Vercel's CDN honours s-maxage / stale-while-revalidate and strips them
 * before the browser sees the response, so browsers only ever get max-age=0. */

export const CACHE = {
  article:  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  redirect: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
  gone:     "public, max-age=0, s-maxage=300, stale-while-revalidate=600",   // 404 and 410
  feed:     "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
  sitemapIndex:        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  sitemapNews:         "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  sitemapMonthCurrent: "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
  sitemapMonthPast:    "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
  error:    "no-store",
};

const TYPES = { html: "text/html; charset=utf-8", xml: "application/xml; charset=utf-8", text: "text/plain; charset=utf-8" };

export function send(res, { status = 200, body = "", type = "html", cache = CACHE.error, tags = [], headers = {} }) {
  res.statusCode = status;
  res.setHeader("Content-Type", TYPES[type] || type);
  res.setHeader("Cache-Control", cache);
  /* tags make `vercel cache invalidate --tag news-post-<id>` possible */
  if (tags.length) res.setHeader("Vercel-Cache-Tag", tags.join(","));
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(String(body));
}

export function redirect301(res, location) {
  res.statusCode = 301;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", CACHE.redirect);
  res.setHeader("Content-Type", TYPES.text);
  res.end(`Moved permanently: ${location}\n`);
}

/* query params arrive as string | string[] | undefined */
export const param = (req, key) => {
  const v = req.query?.[key];
  return Array.isArray(v) ? v[0] : v == null ? "" : String(v);
};
