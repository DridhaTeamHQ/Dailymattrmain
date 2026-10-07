# Daily Mattr — marketing site

Scroll-driven marketing site for the Daily Mattr / Shortly app, built from the Figma design. A real 3D iPhone (three.js) flies through the hero, tilts into the "More than news" showcase, and holds the center of a pinned features section while Articles / Qix / Trax content scrolls past it.

## Stack
- [Vite](https://vitejs.dev/) — dev server & build
- [GSAP](https://gsap.com/) + ScrollTrigger — scroll choreography
- [three.js](https://threejs.org/) — the 3D phone (`public/assets/iphone.glb`)

## Develop
```bash
npm install
npm run dev      # http://localhost:5199
```

## Build
```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Support form
The `/support/` form validates its fields client-side and inserts the request
into the Supabase table `support_requests` (see `src/support.js` and
`src/supabaseClient.js`). The browser uses the publishable key only; the table
is write-only from the client via row level security (migration in
`supabase/migrations/`).

Required env vars (`.env` locally, Vercel project settings in production):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Download link (`/download`)
`https://dailymattr.com/download` is the one link everyone shares. Vercel
rewrites it to `api/download.js`, which sends a server-side 302 (iOS ignores
script redirects): iPhone, iPad and Mac go to the App Store, everything else
to Google Play. Link-preview bots (WhatsApp, Facebook, Twitter, Telegram,
Slack, Discord, LinkedIn) get a small Open Graph page with both store buttons.
Responses are `no-store`. Referral credit comes from the code typed into the
app, not from the link.

## SEO
- Every page carries a canonical URL, Open Graph / Twitter tags and JSON-LD.
- `public/robots.txt` and `public/sitemap-pages.xml` cover the static pages.
- Share images and the publisher logo live at `public/assets/og-default.jpg`
  (1200×630) and `public/assets/publisher-logo.png` (rectangular).

## News (`/news`)

Every approved Pix gets a server-rendered page built from the Pixie CMS
database (Supabase project `PixAgent`). Nothing is pre-built: Vercel rewrites
`/news/*` to `api/news.js`, which renders HTML and is cached at the edge, so
new stories appear without a deploy.

| URL | What it is |
| --- | --- |
| `/news/` | latest stories, 30 per page (`/news/page/2/` …) |
| `/news/<category>/` | one of india, world, business, technology, sports, entertainment, lifestyle, states |
| `/news/<slug>-<published_id>` | one story; resolved by the trailing id, so a stale slug 301s to the canonical URL |

Each story page carries `NewsArticle` + `BreadcrumbList` JSON-LD, the bullet
text as real HTML, and the Pix cards as a keyboard-accessible carousel. A post
that was published and later rejected returns 410, not 404.

Routing, rendering and SEO live in `api/_lib/`; `api/news.js` is the Vercel
entry point and the same router is mounted on the dev server by the `news-dev`
plugin in `vite.config.js`, so `npm run dev` serves `/news` too.

### Where the card images come from

Each story's carousel is the finished Pix cards (poster + text slides). The
site looks for them in this order:

1. `pix_posts.web_pages` — the cards the Pixie CMS copies to the public
   `pix-media` bucket when QA publishes (added September 2026). This is the
   normal path.
2. The app backend's copies on `shortly-bucket.s3.ap-south-1.amazonaws.com`
   — only if `PIX_MEDIA_CDN` names a public host in front of that private
   bucket. Unset by default; kept as an escape hatch.
3. The background artwork the card was built on (`main_image_url`), which
   every story has had from the start.

Stories published before the CMS started copying its cards only have (3), so
they show the background picture with the bullet text below it. Republishing
a story from the CMS fills in its cards.

### Local development

`npm run dev` serves `/news` from `api/_data/pix-snapshot.json`, a sample of
recent live posts, because `pix_posts` has no anonymous read policy. With
`PIX_SUPABASE_SERVICE_ROLE_KEY` set it reads the real database instead.

```bash
node scripts/smoke-news.mjs          # renders every route shape and checks the SEO payload
node scripts/pull-pix-snapshot.mjs   # refresh the local sample (needs the service-role key)
```

## Structure
- `index.html` — page markup (hero, showcase, features, FAQ, footer)
- `src/main.js` — GSAP timeline; a single pose proxy drives the phone hero → showcase → features
- `src/phone3d.js` — three.js renderer for the GLB; app screenshots are mapped onto the screen mesh, with a PNG-mockup fallback if WebGL/GLB fails
- `src/style.css` — all styling and design tokens
- `public/assets/` — 3D model, app screenshots, icons

## Credits
3D iPhone model sourced from Sketchfab — verify its license before production use.

## SEO audit follow-through (7 October 2026)

The supplied Daily Mattr_Audit.pdf was compared with the current implementation.
NewsArticle, BreadcrumbList, canonical URLs, pagination and date-filter noindex
already existed; they should not be duplicated or removed. The homepage now has
descriptive search/social metadata, WebPage and NewsMediaOrganization markup,
the Daily Mattr alternate brand name and official social profiles. News schema
now explicitly connects articles, their WebPage and the WebSite entity.

Robots.txt lists the static sitemap and news sitemap index only. The 48-hour
Google News sitemap remains inside the news index alongside monthly archives;
these serve different purposes. Static sitemap dates reflect page edits, while
changing news hubs omit unsupported lastmod dates. Admin pages and date filters
remain crawlable so their existing noindex directives can be read. Do not block
public news, pagination, images or CSS to try to fix indexing.

Local raster images now have measured width/height attributes. CMS artwork with
unknown source dimensions still needs dimensions recorded at upload time; do not
invent aspect ratios. The homepage intro is disabled when JavaScript is off.

Validation: `npm run check:seo` checks static page metadata, structured data,
image attributes, sitemap references, generated article schema, pagination and
noindex filters without database credentials. `npm run build` checks the bundle.
The separate `node scripts/smoke-news.mjs` requires live data or a local snapshot.

Additional crawlability fixes: homepage feature descriptions stay readable at
all viewport sizes with JavaScript disabled, with an H2 above the feature H3s.
News feeds and monthly sitemap queries use a unique ID to break publication-time
ties, preventing unstable ordering across query pages. Run
`node scripts/check-news-pagination.mjs` for the offline query regression check.

Remaining account/production steps:
- Deploy, then use Search Console URL Inspection on the homepage to check the
  selected canonical, crawl result and indexing exclusion reason. The audit's
  330 indexed pages figure is not independently verified by the local changes.
- Submit `/sitemap-pages.xml` and `/news/sitemap-index.xml` in Search Console.
  Validate a deployed article with Google's Rich Results Test and Schema Validator.
- GA4/GTM and Search Console setup needs property/container IDs and verification
  access. No placeholder trackers, third-party accounts or passwords were added.
- Relevant editorial backlinks require outreach and original reporting; no
  backlink purchases or automatic disavow actions were performed.

References: https://developers.google.com/search/docs/crawling-indexing/robots/intro
and https://developers.google.com/search/docs/appearance/structured-data/article

### Brand-query follow-through (7 October 2026)

The live homepage returned 200, allowed indexing, declared the www homepage as
canonical, and already supplied `WebSite.name = DailyMattr` with
`alternateName = Daily Mattr`. These checks establish crawl eligibility, not
Google's indexed state or position for a particular search. Capitalization
changes alone are not a ranking fix.

The original homepage wording and layout are preserved. The brand is written
as lowercase `dailymattr` in public-facing text, titles and metadata; the spaced
alternate name remains in structured data. `/index.html` now has a permanent
redirect to `/` in `vercel.json`; this takes effect on the next deployment.

Live redirect finding: `https://dailymattr.com/` returned 307 to
`https://www.dailymattr.com/`. Change that existing redirect to 301 or 308 at the
service that owns it, preserving paths and query strings. The connected
`dailymattrmain` Vercel project's domain list contains `www.dailymattr.com` and
its vercel.app hostname, but does not list the apex domain. Do not reassign the
apex or change DNS without locating its current redirect configuration.

After deployment, inspect `https://www.dailymattr.com/` in Search Console:
1. Check the indexed result, last crawl, and Google-selected canonical.
2. Test the live URL; if it is indexable, request indexing once.
3. In Performance > Search results, compare exact query filters `dailymattr`
   and `daily mattr`, including country/device and the landing page. Compare
   impressions and position; a manual search alone is not a complete diagnosis.
4. Confirm official app-store and social profiles consistently name DailyMattr
   and link to `https://www.dailymattr.com/`.

Google controls recrawling and ranking; these changes do not promise a position
or a deadline. Site-name markup is checked with Schema Markup Validator and
URL Inspection; Google's Rich Results Test does not support site names.

Guidance: https://developers.google.com/search/docs/appearance/site-names
and https://developers.google.com/search/docs/crawling-indexing/301-redirects
