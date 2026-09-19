import { esc, jsonLdScript } from "./html.js";
import { ORIGIN, SITE_NAME, PUBLISHER_LOGO, OG_DEFAULT, PLAY_URL, LEGAL_NAME } from "./site.js";
import { cleanHeadline, articlePath } from "./slug.js";
import { bullets, metaDescription, modifiedAt, truncateAtWord } from "./text.js";
import { slidesFor, posterFor, artworkFor } from "./media.js";
import { categoryById, hubPath } from "./categories.js";
import { safeUrl } from "./html.js";

const meta = (name, content) => (content ? `  <meta name="${name}" content="${esc(content)}" />\n` : "");
const prop = (property, content) => (content ? `  <meta property="${property}" content="${esc(content)}" />\n` : "");

const publisher = {
  "@type": "NewsMediaOrganization",
  "@id": `${ORIGIN}/#organization`,
  name: SITE_NAME,
  legalName: LEGAL_NAME,
  url: `${ORIGIN}/`,
  logo: { "@type": "ImageObject", url: PUBLISHER_LOGO.url, width: PUBLISHER_LOGO.width, height: PUBLISHER_LOGO.height },
  sameAs: [PLAY_URL],
};

export function breadcrumbLd(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem", position: i + 1, name: t.name, item: ORIGIN + t.path,
    })),
  };
}

/* trail for an article: Home > News > Section > Headline (section skipped
 * when the post's category_id isn't one we publish a hub for) */
export function articleTrail(post, title) {
  const cat = categoryById(post.category_id);
  return [
    { name: "Home", path: "/" },
    { name: "News", path: "/news/" },
    ...(cat ? [{ name: cat.label, path: hubPath(cat) }] : []),
    { name: truncateAtWord(title, 60), path: articlePath(post) },
  ];
}

export function articleHead(post) {
  const title = cleanHeadline(post.headline);
  const points = bullets(post.detail_body);
  const desc = metaDescription(points);
  const url = ORIGIN + articlePath(post);
  const slides = slidesFor(post);
  const poster = posterFor(post);
  const artwork = artworkFor(post);
  /* what the article page actually shows: the artwork alone */
  const heroImages = artwork ? [{ url: artwork, artwork: true }] : slides.slice(0, 1);
  const cat = categoryById(post.category_id);
  const source = safeUrl(post.source_url);
  const keywords = Array.isArray(post.keywords) ? post.keywords.filter(Boolean).slice(0, 10) : [];

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: truncateAtWord(title, 110),
    description: desc,
    /* the bullets are the article — same text the reader sees */
    articleBody: points.join("\n"),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: new Date(post.published_at).toISOString(),
    dateModified: modifiedAt(post),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    /* the picture on the page first, then the rendered cards */
    image: [...new Set([...heroImages.map((h) => h.url), ...slides.map((s) => s.url)])],
    publisher,
    /* the desk, not the individual writer — user_name is an internal CMS
     * login and is not shown on the page either */
    author: { "@type": "Organization", name: SITE_NAME, url: `${ORIGIN}/` },
    ...(cat ? { articleSection: cat.label } : {}),
    ...(keywords.length ? { keywords } : {}),
    /* we summarise someone else's reporting — say so in the markup */
    ...(source ? { isBasedOn: source, citation: source } : {}),
  };

  const head =
    meta("description", desc) +
    `  <link rel="canonical" href="${url}" />\n` +
    meta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1") +
    prop("og:type", "article") +
    prop("og:site_name", SITE_NAME) +
    prop("og:locale", "en_IN") +
    prop("og:title", title) +
    prop("og:description", desc) +
    prop("og:url", url) +
    prop("og:image", poster) +
    (poster ? prop("og:image:width", "920") + prop("og:image:height", "1700") + prop("og:image:alt", title) : "") +
    prop("article:published_time", new Date(post.published_at).toISOString()) +
    prop("article:modified_time", modifiedAt(post)) +
    (cat ? prop("article:section", cat.label) : "") +
    keywords.map((k) => prop("article:tag", k)).join("") +
    meta("twitter:card", "summary_large_image") +
    meta("twitter:title", title) +
    meta("twitter:description", desc) +
    meta("twitter:image", poster) +
    (poster ? meta("twitter:image:alt", title) : "") +
    `  ${jsonLdScript(ld)}\n` +
    `  ${jsonLdScript(breadcrumbLd(articleTrail(post, title)))}\n`;

  return { title, desc, head, url, slides, heroImages, poster, points, cat, source };
}

export function hubHead({ title, description, path, posts, page = 1, hasNext = false, trail }) {
  const url = ORIGIN + path;
  const canonical = page > 1 ? `${url}page/${page}/` : url;
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "en-IN",
    isPartOf: { "@id": `${ORIGIN}/#website` },
    publisher,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: (page - 1) * posts.length + i + 1,
        url: ORIGIN + articlePath(p),
        name: cleanHeadline(p.headline),
      })),
    },
  };
  const head =
    meta("description", description) +
    `  <link rel="canonical" href="${canonical}" />\n` +
    meta("robots", "index,follow,max-image-preview:large") +
    (page > 1 ? `  <link rel="prev" href="${page === 2 ? url : `${url}page/${page - 1}/`}" />\n` : "") +
    (hasNext ? `  <link rel="next" href="${url}page/${page + 1}/" />\n` : "") +
    prop("og:type", "website") +
    prop("og:site_name", SITE_NAME) +
    prop("og:title", title) +
    prop("og:description", description) +
    prop("og:url", canonical) +
    prop("og:image", OG_DEFAULT.url) +
    meta("twitter:card", "summary_large_image") +
    meta("twitter:title", title) +
    meta("twitter:description", description) +
    meta("twitter:image", OG_DEFAULT.url) +
    `  ${jsonLdScript(ld)}\n` +
    `  ${jsonLdScript(breadcrumbLd(trail))}\n`;
  return { head, canonical };
}

export const noindexHead = (desc) =>
  meta("description", desc) + meta("robots", "noindex,follow");
