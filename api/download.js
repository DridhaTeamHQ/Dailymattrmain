import { send } from "./_lib/http.js";
import { esc } from "./_lib/html.js";
import { ORIGIN, APP_STORE_URL, OG_DEFAULT } from "./_lib/site.js";

/* /download — the one link everyone shares (vercel.json rewrites it here).
 * Referral credit comes from the friend typing the code into the app, so the
 * link itself carries no code.
 *
 * This has to be a server-side 302: iOS will not hand a script redirect
 * (location.href = ...) to the App Store. Chat apps' link-preview bots get a
 * small page with Open Graph tags instead, so the shared link shows a card.
 * Nothing is cached, so a changed store link takes effect immediately. */

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.dailymattr";

const APPLE = /iphone|ipad|ipod|macintosh/i;
const PREVIEW_BOT = /whatsapp|facebookexternalhit|twitterbot|telegrambot|slackbot|discordbot|linkedinbot/i;

export const downloadTarget = (ua = "") => (APPLE.test(ua) ? APP_STORE_URL : PLAY_STORE_URL);
export const isPreviewBot = (ua = "") => PREVIEW_BOT.test(ua);

const TITLE = "Get dailymattr";
const DESCRIPTION = "100 fact-checked, human-picked stories a day. Download dailymattr on the App Store or Google Play.";

const previewPage = () => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESCRIPTION)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="dailymattr" />
<meta property="og:title" content="${esc(TITLE)}" />
<meta property="og:description" content="${esc(DESCRIPTION)}" />
<meta property="og:url" content="${esc(`${ORIGIN}/download`)}" />
<meta property="og:image" content="${esc(OG_DEFAULT.url)}" />
<meta property="og:image:width" content="${OG_DEFAULT.width}" />
<meta property="og:image:height" content="${OG_DEFAULT.height}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(TITLE)}" />
<meta name="twitter:description" content="${esc(DESCRIPTION)}" />
<meta name="twitter:image" content="${esc(OG_DEFAULT.url)}" />
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;color:#111;font:16px/1.4 system-ui,-apple-system,sans-serif}
main{padding:24px 16px;text-align:center}
h1{font-size:24px;margin:0 0 20px}
a{display:block;margin:12px auto;padding:14px 24px;max-width:260px;border-radius:12px;background:#111;color:#fff;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<main>
<h1>${esc(TITLE)}</h1>
<a href="${esc(APP_STORE_URL)}">Download on the App Store</a>
<a href="${esc(PLAY_STORE_URL)}">Get it on Google Play</a>
</main>
</body>
</html>
`;

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, { status: 405, type: "text", headers: { Allow: "GET, HEAD" }, body: "Method Not Allowed\n" });
  }
  const ua = String(req.headers["user-agent"] || "");
  /* the answer depends on who is asking, so no shared cache may keep it */
  const headers = { Vary: "User-Agent" };

  if (isPreviewBot(ua)) return send(res, { status: 200, type: "html", headers, body: previewPage() });

  const location = downloadTarget(ua);
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "User-Agent");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(`Found: ${location}\n`);
}
