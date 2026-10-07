import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { articleHead, articleTrail, hubHead } from "../api/_lib/seo.js";
import { renderArticle } from "../api/_lib/render-article.js";
import { page } from "../api/_lib/layout.js";
import { sitemapIndex } from "../api/_lib/sitemap.js";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const schemas = (html) => [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { const data = JSON.parse(m[1]); return data["@graph"] || [data]; });
const types = (html) => schemas(html).map((n) => n["@type"]);
const paths = ["", "newsletter/", "support/", "editorialguidelines/", "privacypolicy/", "termsandconditions/"];
const titles = new Set();
for (const path of paths) {
  const html = read(`${path}index.html`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one H1`);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="https://www.dailymattr.com/${path}"`));
  assert.match(html, /name="robots" content="index,follow/);
  assert.match(html, /name="description"\s+content="[^"]+"/);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.ok(!titles.has(title), `Duplicate title: ${title}`);
  titles.add(title);
  assert.ok(types(html).includes("WebPage"), `${path}: WebPage schema`);
  if (path) assert.ok(types(html).includes("BreadcrumbList"));
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(img[0], /\balt="[^"]*"/);
    if (/src="\/assets\/[^"?]+\.(jpg|png|webp)/.test(img[0])) {
      assert.match(img[0], /\bwidth="\d+"/);
      assert.match(img[0], /\bheight="\d+"/);
    }
  }
}
const home = read("index.html");
const publisher = schemas(home).find((n) => n["@type"] === "NewsMediaOrganization");
const websites = schemas(home).filter((n) => n["@type"] === "WebSite");
assert.equal(websites.length, 1, "Homepage has one unambiguous WebSite entity");
assert.equal(websites[0].name, "dailymattr");
assert.equal(websites[0].alternateName, "Daily Mattr");
assert.equal(websites[0].url, "https://www.dailymattr.com/");
assert.match(home, /<title>dailymattr \|/);
assert.match(home, /property="og:site_name" content="dailymattr"/);
const hosting = JSON.parse(read("vercel.json"));
assert.ok(hosting.redirects.some((r) => r.source === "/index.html" && r.destination === "/" && r.permanent === true), "Duplicate homepage redirects permanently to the canonical root");
assert.equal(publisher.alternateName, "Daily Mattr");
assert.equal(publisher.sameAs.length, 6);
assert.match(home, /<noscript><style>\.intro/);
for (const path of ["admin/index.html", "admin/dashboard/index.html"]) {
  assert.match(read(path), /name="robots" content="noindex/);
}
const robots = read("public/robots.txt");
const sitemapRefs = [...robots.matchAll(/^Sitemap: (.+)$/gm)].map((m) => m[1].trim());
assert.equal(sitemapRefs.length, 2);
assert.equal(new Set(sitemapRefs).size, 2);
assert.ok(!sitemapRefs.some((s) => s.endsWith("/news/sitemap.xml")));
const index = await sitemapIndex();
assert.equal((index.body.match(/<loc>[^<]+\/news\/sitemap.xml<\/loc>/g) || []).length, 1);
const sitemap = read("public/sitemap-pages.xml");
for (const path of paths) assert.ok(sitemap.includes(`<loc>https://www.dailymattr.com/${path}</loc>`));
assert.ok(!sitemap.includes("/admin"));

const post = {
  published_id: 12345, headline: 'An example story with "quotes" & context',
  detail_body: "First fact with context.\nSecond fact about the story.",
  published_at: "2026-10-07T08:00:00Z", updated_at: "2026-10-07T09:00:00Z",
  source_url: "https://example.com/report", main_image_url: "", category_id: null,
};
const seo = articleHead(post);
seo.trail = articleTrail(post, seo.title);
const rendered = page({ title: seo.title, head: seo.head, main: renderArticle({ seo, post, neighbours: {} }) });
for (const type of ["NewsArticle", "WebPage", "WebSite", "BreadcrumbList"]) assert.ok(types(rendered).includes(type));
const article = schemas(rendered).find((n) => n["@type"] === "NewsArticle");
const webpage = schemas(rendered).find((n) => n["@type"] === "WebPage");
assert.equal(article.mainEntityOfPage["@id"], webpage["@id"]);
assert.equal(webpage.mainEntity["@id"], article["@id"]);
assert.deepEqual(article.publisher.sameAs, publisher.sameAs.slice(2).concat(publisher.sameAs.slice(0, 2)));
assert.equal((rendered.match(/<h1\b/g) || []).length, 1);
assert.match(rendered, /name="robots" content="index,follow/);
const args = { title: "Latest news", description: "Recent stories", path: "/news/", posts: [post], trail: [{name:"Home",path:"/"},{name:"News",path:"/news/"}] };
assert.equal(hubHead({ ...args, page: 2 }).canonical, "https://www.dailymattr.com/news/page/2/");
assert.match(hubHead({ ...args, date: "2026-10-07" }).head, /noindex,follow/);
console.log("SEO checks passed: six static pages, admin exclusions, sitemaps, article schema relationships, pagination and date filters.");
