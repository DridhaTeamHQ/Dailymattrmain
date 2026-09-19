/* Site-wide constants for the server-rendered /news pages. Anything the
 * marketing HTML hard-codes (nav items, store link, brand strings) is
 * mirrored here so the news pages read as the same site. */

export const ORIGIN = (process.env.SITE_ORIGIN || "https://dailymattr.com").replace(/\/+$/, "");
export const SITE_NAME = "DailyMattr";
export const LEGAL_NAME = "Dridha Technologies Private Limited";
export const SUPPORT_EMAIL = "support@dailymattr.com";
export const PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.dailymattr&pcampaignid=web_share";

/* rectangular raster logo for NewsArticle.publisher — Google rejects SVG
 * and square marks here. The file is supplied by the design team. */
export const PUBLISHER_LOGO = { url: `${ORIGIN}/assets/publisher-logo.png`, width: 600, height: 120 };
export const OG_DEFAULT = { url: `${ORIGIN}/assets/og-default.jpg`, width: 1200, height: 630 };

/* same order as index.html's <nav class="nav-links"> */
export const NAV = [
  { href: "/", label: "Home" },
  { href: "/#showcase", label: "What are we" },
  { href: "/#features", label: "Features" },
  { href: "/news/", label: "News" },
  { href: "/support/", label: "Support" },
];

/* Where the rendered Pix carousel pages live. The CMS records them on
 * shortly-bucket.s3.ap-south-1.amazonaws.com, which is private — a plain GET
 * returns AccessDenied — so they cannot be shown on the public web as-is.
 *
 * Set PIX_MEDIA_CDN to a public host that serves the same keys (a CloudFront
 * distribution in front of the bucket, or the bucket itself once
 * processed/* is public) and every carousel page appears with no code
 * change. Until then the poster, which the CMS also uploads to the public
 * Supabase bucket, is shown on its own. */
export const MEDIA_ORIGIN = "shortly-bucket.s3.ap-south-1.amazonaws.com";
export const MEDIA_CDN = (process.env.PIX_MEDIA_CDN || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

/* Only these hosts may appear in <img src> / og:image — every URL comes from
 * the CMS database and is treated as untrusted. */
export const IMAGE_HOSTS = new Set([
  "coggfnbqqyiqfsxvtaym.supabase.co",
  ...(MEDIA_CDN ? [MEDIA_CDN] : []),
]);

/* Supabase serves resized WebP from the same object through its render
 * endpoint: the 2.7 MB source PNG comes back at ~52 KB for a 320px card. */
export const IMAGE_WIDTHS = { thumb: [320, 480], slide: [480, 920] };

/* Pix carousel pages are always exported at this size */
export const SLIDE_W = 920;
export const SLIDE_H = 1700;

export const PAGE_SIZE = 30;
export const TIME_ZONE = "Asia/Kolkata";
