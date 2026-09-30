/* URL slugs. One deterministic function shared by the article route, the
 * hubs and the sitemaps so every link to a post is byte-identical. */

/* Pixie writers wrap words in [brackets], (parens) or {braces} to pick an
 * accent colour on the poster. The words stay, the markers go. */
const MARKERS = /[\[\]\(\)\{\}]/g;

export function cleanHeadline(h) {
  return String(h || "").replace(MARKERS, "").replace(/\s+/g, " ").trim();
}

export function slugify(h) {
  let s = cleanHeadline(h)
    .replace(/₹/g, " rs ")
    .replace(/&/g, " and ")
    .replace(/%/g, " percent ")
    .replace(/[‘’“”'"`]/g, "")   // quotes vanish rather than becoming hyphens
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")               // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > 80) {
    s = s.slice(0, 80);
    const cut = s.lastIndexOf("-");
    if (cut > 40) s = s.slice(0, cut);          // don't end on a chopped word
  }
  return s || "story";
}

/* published_id is the app's sequential id — short, stable, unique per live
 * post — so it is the part of the URL the route actually resolves on. */
export const isValidId = (id) => /^\d{1,12}$/.test(String(id || ""));

/* the id comes from the database, so it is checked before it reaches a URL;
 * a malformed one (which the route could never resolve anyway) links to the
 * feed instead of carrying arbitrary text into href/data attributes */
export const articlePath = (post) =>
  isValidId(post.published_id) ? `/news/${slugify(post.headline)}-${post.published_id}` : "/news/";
