/* Renders every /news route shape and asserts the SEO payload is present and
 * safe. Reads the real database when PIX_SUPABASE_SERVICE_ROLE_KEY is set
 * (env, .env.local or .env), otherwise the dev snapshot. Read-only.
 * Run: node scripts/smoke-news.mjs */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* same loader as pull-pix-snapshot.mjs; values are never printed */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

process.env.NEWS_DEV = "1";
const { routeNews } = await import("../api/_lib/router.js");
const { dataSource, listLive } = await import("../api/_lib/queries.js");
const { slugify, cleanHeadline } = await import("../api/_lib/slug.js");

let failures = 0;
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${extra ? " — " + extra : ""}`); failures++; }
};

console.log("data source:", dataSource());
if (dataSource() === "none") {
  console.error("\nNo data to render: set PIX_SUPABASE_URL and PIX_SUPABASE_SERVICE_ROLE_KEY (env, .env.local or .env),\nor pull the dev snapshot with scripts/pull-pix-snapshot.mjs.");
  process.exit(2);
}

const { posts } = await listLive({ page: 1, size: 1 });
const sample = posts[0];
const canonicalTail = `${slugify(sample.headline)}-${sample.published_id}`;

console.log("\n/news/ (feed)");
{
  const r = await routeNews({ rest: "" });
  check("200", r.status === 200, `got ${r.status}`);
  check("has article links", (String(r.body).match(/href="\/news\/[a-z0-9-]+-\d+"/g) || []).length >= 20);
  check("CollectionPage + ItemList", String(r.body).includes('"CollectionPage"') && String(r.body).includes('"ItemList"'));
  check("canonical", String(r.body).includes('rel="canonical" href="https://www.dailymattr.com/news/"'));
  check("images are real <img>", (String(r.body).match(/<img[^>]+src="https:\/\//g) || []).length >= 20);
  check("thumbs are responsive", (String(r.body).match(/srcset="[^"]+320w[^"]*480w"/g) || []).length >= 20);
  check("every resized URL keeps aspect", (() => {
    const urls = String(r.body).match(/render\/image\/public\/[^"\s]+/g) || [];
    return urls.length > 0 && urls.every((u) => u.includes("resize=contain"));
  })());
  check("first 3 eager, rest lazy", String(r.body).includes('fetchpriority="high"') && String(r.body).includes('loading="lazy"'));
}

console.log("\n/news (no slash)");
{
  const r = await routeNews({ rest: "", bare: true });
  check("301 -> /news/", r.status === 301 && r.location === "/news/", JSON.stringify(r.location));
}

console.log("\n/news/india/ (hub)");
{
  const r = await routeNews({ rest: "india/" });
  check("200", r.status === 200, `got ${r.status}`);
  check("h1", String(r.body).includes("<h1>India news</h1>"));
  check("canonical", String(r.body).includes('href="https://www.dailymattr.com/news/india/"'));
  check("breadcrumb", String(r.body).includes('"BreadcrumbList"'));
}

console.log("\n/news/india (no slash)");
{
  const r = await routeNews({ rest: "india" });
  check("301 -> /news/india/", r.status === 301 && r.location === "/news/india/", JSON.stringify(r.location));
}

console.log("\n/news/page/2/");
{
  const r = await routeNews({ rest: "page/2/" });
  check("200", r.status === 200, `got ${r.status}`);
  check("prev link", String(r.body).includes('rel="prev"'));
  check("canonical is page 2", String(r.body).includes('href="https://www.dailymattr.com/news/page/2/"'));
}
{
  const r = await routeNews({ rest: "page/1/" });
  check("page/1/ -> 301 /news/", r.status === 301 && r.location === "/news/");
}

console.log("\narticle");
{
  const r = await routeNews({ rest: canonicalTail });
  const body = String(r.body);
  check("200", r.status === 200, `got ${r.status}`);
  check("NewsArticle", body.includes('"NewsArticle"'));
  check("BreadcrumbList", body.includes('"BreadcrumbList"'));
  check("canonical self", body.includes(`href="https://www.dailymattr.com/news/${canonicalTail}"`));
  check("mainEntityOfPage is self", body.includes(`"@id":"https://www.dailymattr.com/news/${canonicalTail}"`));
  check("max-image-preview:large", body.includes("max-image-preview:large"));
  check("og:type article", body.includes('property="og:type" content="article"'));
  check("twitter large image", body.includes('content="summary_large_image"'));
  check("h1 has no accent markers", /<h1>[^<]*<\/h1>/.test(body) && !/<h1>[^<]*[\[\]{}][^<]*<\/h1>/.test(body));
  check("carousel present", (body.match(/class="article-slides"/g) || []).length === 1);
  check("slide has alt text", /<ol class="article-slides"[\s\S]*?<img[^>]+alt="[^"]{10,}"/.test(body));
  check("slide images are reachable hosts only", !body.includes("shortly-bucket"));
  check("slides use the resizer", /render\/image\/public\/.*?width=\d+/.test(body));
  check("srcset present", body.includes("srcset="));
  check("bullets rendered", (body.match(/<li>[^<]{30,}<\/li>/g) || []).length >= 3);
  check("no related grid", !body.includes("news-related"));
  check("story has prev/next data", /data-story[^>]*data-(prev|next)="/.test(body));
  check("neighbour links are real anchors", (body.match(/data-story-step="(prev|next)"/g) || []).length >= 1);
  check("at most 3 older + 3 newer listed", (() => {
    const more = body.match(/<div class="story-more">[\s\S]*?<\/div>\s*<\/div>/);
    return !more || (more[0].match(/<li><a href="\/news\//g) || []).length <= 6;
  })());
  check("app prompt present and hidden", body.includes('id="app-gate"') && /id="app-gate"[^>]*\shidden/.test(body));
  check("prompt has a close and a skip", body.includes("app-gate-close") && body.includes("app-gate-skip"));
  check("story nav script injected", body.includes("dm.prompts") && body.includes("data-story-step"));
  check("no swipe handler", !body.includes("touchstart") && !body.includes("touchend"));
  check("prompt shows all three app screens", ["app-brief", "app-qix", "app-pix"].every((n) => body.includes(`/assets/${n}.webp`)));
  check("app screens carry alt text", (() => {
    const stage = body.match(/<div class="app-gate-stage">[\s\S]*?<\/div>/);
    return stage && (stage[0].match(/alt="[^"]{15,}"/g) || []).length === 3;
  })());
  check("prompt has the two store actions", (body.match(/class="app-gate-cta app-gate-(play|apple)"/g) || []).length === 2);
  check("dateModified >= datePublished", (() => {
    const ld = JSON.parse(body.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"NewsArticle".*?)<\/script>/)[1]);
    return new Date(ld.dateModified) >= new Date(ld.datePublished);
  })());
  check("articleBody is the bullets", (() => {
    const ld = JSON.parse(body.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"NewsArticle".*?)<\/script>/)[1]);
    return ld.articleBody.length > 100 && !ld.articleBody.includes("[");
  })());
}

console.log("\narticle redirects / errors");
{
  const r = await routeNews({ rest: `wrong-slug-${sample.published_id}` });
  check("bad slug -> 301 canonical", r.status === 301 && r.location === `/news/${canonicalTail}`, JSON.stringify(r.location));
}
{
  const r = await routeNews({ rest: `${canonicalTail}/` });
  check("trailing slash -> 301", r.status === 301 && r.location === `/news/${canonicalTail}`);
}
{
  const r = await routeNews({ rest: String(sample.published_id) });
  check("bare id -> 301 canonical", r.status === 301 && r.location === `/news/${canonicalTail}`);
}
{
  const r = await routeNews({ rest: "definitely-not-a-story-999999999" });
  check("unknown id -> 404", r.status === 404);
}
{
  const r = await routeNews({ rest: "not-a-category/" });
  check("unknown path -> 404", r.status === 404);
}
{
  const r = await routeNews({ rest: "page/999/" });
  check("page past end -> 404", r.status === 404);
}

console.log("\nescaping");
{
  const { html, esc, safeJsonLd } = await import("../api/_lib/html.js");
  const nasty = `</script><img src=x onerror=alert(1)>"&'`;
  check("esc neutralises tags+quotes", esc(nasty) === "&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;&quot;&amp;&#39;");
  check("html`` escapes interpolation", !String(html`<p>${nasty}</p>`).includes("<img"));
  check("safeJsonLd escapes <", !safeJsonLd({ a: nasty }).includes("</script>"));
}

console.log("\ncard source precedence");
{
  const { slidesFor, posterFor } = await import("../api/_lib/media.js");
  const sb = "https://coggfnbqqyiqfsxvtaym.supabase.co/storage/v1/object/public/pix-media/";
  const s3 = "https://shortly-bucket.s3.ap-south-1.amazonaws.com/processed/";
  const base = { main_image_url: sb + "bg/art.png", media_pages: [{ url: s3 + "a.webp", sort_order: 1 }, { url: s3 + "b.webp", sort_order: 2 }] };
  check("private S3 pages are dropped -> background only", slidesFor(base).length === 1 && slidesFor(base)[0].url.includes("/bg/art.png"));
  const withWeb = { ...base, web_pages: [{ url: sb + "web/x/2-text.jpg", width: 920, height: 1700, sort_order: 2 }, { url: sb + "web/x/1-poster.jpg", width: 920, height: 1700, sort_order: 1 }] };
  const ws = slidesFor(withWeb);
  check("web_pages win and are ordered by sort_order", ws.length === 2 && ws[0].url.endsWith("1-poster.jpg") && ws[1].url.endsWith("2-text.jpg"));
  check("og:image poster is the rendered card", posterFor(withWeb).endsWith("1-poster.jpg"));
  const { artworkFor } = await import("../api/_lib/media.js");
  check("page/grid artwork is the plain picture even when cards exist", artworkFor(withWeb).endsWith("/bg/art.png"));
  check("artwork falls back to the card when there is no picture", artworkFor({ ...withWeb, main_image_url: null }).endsWith("1-poster.jpg"));
  const badHost = { ...base, web_pages: [{ url: "https://evil.example/x.jpg", sort_order: 1 }] };
  check("web_pages on a foreign host are ignored", slidesFor(badHost)[0].url.includes("/bg/art.png"));
}

console.log("\nslug");
{
  check("markers stripped", slugify("[Daayra opens at ₹85 lakh], becomes Kareena Kapoor's lowest") === "daayra-opens-at-rs-85-lakh-becomes-kareena-kapoors-lowest",
    slugify("[Daayra opens at ₹85 lakh], becomes Kareena Kapoor's lowest"));
  check("percent spelled out", slugify("Trump 100% tariffs") === "trump-100-percent-tariffs", slugify("Trump 100% tariffs"));
  check("ascii only", /^[a-z0-9-]+$/.test(slugify("Volker Türk urges — action")), slugify("Volker Türk urges — action"));
  check("length capped", slugify("a".repeat(200)).length <= 80);
  check("cleanHeadline keeps words", cleanHeadline("(KTR demands answers) over arrest") === "KTR demands answers over arrest");
}

console.log("\npage numbers");
{
  const r = await routeNews({ rest: "page/0/" });
  check("/news/page/0/ -> 404", r.status === 404, `got ${r.status}`);
  const z = await routeNews({ rest: "page/0002/" });
  check("/news/page/0002/ -> 301 /news/page/2/", z.status === 301 && z.location === "/news/page/2/", JSON.stringify(z.location));
  const h = await routeNews({ rest: "india/page/0/" });
  check("/news/india/page/0/ -> 404", h.status === 404, `got ${h.status}`);
  const hz = await routeNews({ rest: "india/page/02/" });
  check("/news/india/page/02/ -> 301", hz.status === 301 && hz.location === "/news/india/page/2/", JSON.stringify(hz.location));
  const p2 = String((await routeNews({ rest: "page/2/" })).body);
  const ld = JSON.parse(p2.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"CollectionPage".*?)<\/script>/)[1]);
  check("page 2 ItemList starts after page 1", ld.mainEntity.itemListElement[0].position === 31);
  check("page 2 description is its own", /<meta name="description" content="[^"]* — page 2"/.test(p2));
}

console.log("\nhead details");
{
  const body = String((await routeNews({ rest: canonicalTail })).body);
  const lds = [...body.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
  check("every JSON-LD block parses", lds.length >= 2 && lds.every((m) => { try { JSON.parse(m[1]); return true; } catch { return false; } }));
  const pre = body.match(/<link rel="preload" as="image" href="([^"]+)" imagesrcset="([^"]+)" imagesizes="([^"]+)"/);
  const img = body.match(/<ol class="article-slides"[\s\S]*?<img[^>]* src="([^"]+)" srcset="([^"]+)" sizes="([^"]+)"/);
  check("hero preload = hero <img> (src, srcset, sizes)", pre && img && pre[1] === img[1] && pre[2] === img[2] && pre[3] === img[3]);
  check("og:image is resized", /property="og:image" content="[^"]*\/render\/image\/public\/[^"]*width=\d+/.test(body));
  const w = body.match(/property="og:image:width" content="(\d+)"/);
  check("og:image:width only when known, never the old 920 guess", !w || (+w[1] > 0 && +w[1] <= 1200));
  check("supabase preconnect without crossorigin", body.includes('<link rel="preconnect" href="https://coggfnbqqyiqfsxvtaym.supabase.co" />'));
  check("nav is labelled", body.includes('<nav class="nav-links" aria-label="Main">'));
  const f = String((await routeNews({ rest: "page/2/", query: { date: "2026-09-01" } })).body);
  check("rel=prev keeps ?date", !f.includes('rel="prev"') || /<link rel="prev" href="[^"]*\?date=2026-09-01"/.test(f));
}

console.log("\ntitle escaping");
{
  const { page } = await import("../api/_lib/layout.js");
  const { articleHead } = await import("../api/_lib/seo.js");
  const nasty = `</title><script>x</script> & "q"`;
  const out = page({ title: articleHead({ headline: nasty, detail_body: "• x", published_at: "2026-09-01T00:00:00Z", published_id: "1" }).title, head: "", main: "" });
  check("<title> is escaped", out.includes("<title>&lt;/title&gt;&lt;script&gt;x&lt;/script&gt; &amp; &quot;q&quot;</title>"));
  check("no double escaping", !out.includes("&amp;amp;") && !out.includes("&amp;lt;"));
  const bad = articleHead({ headline: "x", detail_body: "• x", published_at: "2026-09-01T00:00:00Z", published_id: `1"><script>` });
  check("malformed published_id never reaches the head", !bad.head.includes(`"><script>`) && bad.url.endsWith("/news/"));
}

console.log("\nhandler");
{
  const { default: handler } = await import("../api/news.js");
  const call = async (method, query) => {
    const res = { headers: {}, statusCode: 0, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b = "") { this.body = String(b); } };
    await handler({ method, query }, res);
    return res;
  };
  const post = await call("POST", { p: "" });
  check("POST -> 405 + Allow", post.statusCode === 405 && post.headers.allow === "GET, HEAD");
  const head = await call("HEAD", { p: "" });
  check("HEAD -> 200", head.statusCode === 200, `got ${head.statusCode}`);
  const inj = await call("GET", { p: "india/", bare: "1" });
  check("visitor ?bare=1 is ignored", inj.statusCode === 200, `got ${inj.statusCode} ${inj.headers.location || ""}`);
  const bare = await call("GET", { p: "", bare: "1" });
  check("/news rewrite still 301s", bare.statusCode === 301 && bare.headers.location === "/news/");
}

console.log("\nsitemaps");
{
  const wellFormed = (x) => {
    const s = String(x);
    if (!s.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) return false;
    if (/&(?!amp;|lt;|gt;|quot;|#39;)/.test(s)) return false;
    const stack = [];
    for (const [, close, name, self] of s.replace(/<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([a-zA-Z:]+)[^>]*?(\/?)>/g)) {
      if (self) continue;
      if (close) { if (stack.pop() !== name) return false; } else stack.push(name);
    }
    return stack.length === 0;
  };
  const n = await routeNews({ rest: "sitemap.xml" });
  check("news sitemap 200 xml", n.status === 200 && n.type === "xml");
  check("news sitemap well-formed", wellFormed(n.body));
  check("news sitemap has news:news entries", (String(n.body).match(/<news:news>/g) || []).length >= 1);
  check("news sitemap uses ORIGIN", !/<loc>(?!https:\/\/www\.dailymattr\.com\/news\/)/.test(String(n.body)));
  const i = await routeNews({ rest: "sitemap-index.xml" });
  check("sitemap index well-formed", i.status === 200 && wellFormed(i.body));
  const first = String(i.body).match(/sitemap-(\d{4}-\d{2})\.xml/);
  const mth = first && (await routeNews({ rest: `sitemap-${first[1]}.xml` }));
  check("monthly sitemap well-formed", mth && mth.status === 200 && wellFormed(mth.body));
  check("month out of range -> 404", (await routeNews({ rest: "sitemap-1999-01.xml" })).status === 404);
}

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
