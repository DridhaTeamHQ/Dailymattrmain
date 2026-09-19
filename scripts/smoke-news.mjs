/* Renders every /news route shape against the dev snapshot and asserts the
 * SEO payload is present and safe. Run: node scripts/smoke-news.mjs */

process.env.NEWS_DEV = "1";
const { routeNews } = await import("../api/_lib/router.js");
const { dataSource } = await import("../api/_lib/queries.js");
const { slugify, cleanHeadline } = await import("../api/_lib/slug.js");
const { snapshot } = await import("../api/_lib/snapshot.js");

let failures = 0;
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${extra ? " — " + extra : ""}`); failures++; }
};

console.log("data source:", dataSource());

const { posts } = await snapshot.listLive({ page: 1, size: 1 });
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
  check("og/thumb poster is the rendered card, not the artwork", posterFor(withWeb).endsWith("1-poster.jpg"));
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

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
