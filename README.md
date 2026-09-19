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
