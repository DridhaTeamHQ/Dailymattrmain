import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const newsStudio = path.join(root, "news-studio");

// Tailwind + autoprefixer for the News Studio app only, so the rest of the
// site's hand-written CSS goes through the build untouched.
function newsStudioPostcss() {
  const processor = postcss([
    tailwindcss({ config: path.join(newsStudio, "tailwind.config.js") }),
    autoprefixer(),
  ]);
  return {
    postcssPlugin: "news-studio-only",
    async Once(css, { result }) {
      const file = css.source?.input.file;
      if (!file || !path.resolve(file).startsWith(newsStudio + path.sep)) return;
      const out = await processor.process(css, { ...result.opts, from: file });
      result.root = out.root;
      // tailwind's dependency messages keep HMR watching the content files
      result.messages.push(...out.messages);
    },
  };
}
newsStudioPostcss.postcss = true;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
      },
      // multi-page: legal pages live at /editorialguidelines, /privacypolicy
      // and /termsandconditions
      input: {
        main: path.resolve(root, "index.html"),
        newsletter: path.resolve(root, "newsletter/index.html"),
        support: path.resolve(root, "support/index.html"),
        unsubscribe: path.resolve(root, "unsubscribe/index.html"),
        editorialguidelines: path.resolve(root, "editorialguidelines/index.html"),
        privacypolicy: path.resolve(root, "privacypolicy/index.html"),
        termsandconditions: path.resolve(root, "termsandconditions/index.html"),
        about: path.resolve(root, "about/index.html"),
        // byline target on every news article (AUTHOR.path in api/_lib/site.js)
        author: path.resolve(root, "author/dailymattr-editorial-team/index.html"),
        // News Studio React app, served at /news-studio/* (SPA fallback in
        // vercel.json and the news-studio-dev plugin below)
        newsStudio: path.join(newsStudio, "index.html"),
      },
    },
  },
  css: {
    postcss: { plugins: [newsStudioPostcss()] },
  },
  server: {
    // the dev server may be launched via the 8.3 short path (DAILYM~1),
    // which fails Vite's strict fs allow-list realpath check on Windows, so
    // allow both spellings of the project root. Keep strict on: it is also
    // what stops the dev server from serving .env, .git and the rest of disk.
    fs: { allow: [root, fs.realpathSync.native(root)] },
  },
  plugins: [
    react({ include: /news-studio[\\/].*\.jsx?$/ }),
    {
      // dev mount of api/news-studio.js: every /news-studio page that isn't a
      // real file gets the app shell with that page's SEO head (studio.js),
      // and React Router takes it from there
      name: "news-studio-dev",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, "http://localhost");
          const pathname = url.pathname;
          if (pathname !== "/news-studio" && !pathname.startsWith("/news-studio/")) return next();
          const isXml = path.extname(pathname) === ".xml";
          if (!isXml && (path.extname(pathname) || !(req.headers.accept || "").includes("text/html"))) return next();
          try {
            const source = fs.readFileSync(path.join(newsStudio, "index.html"), "utf8");
            const shell = await server.transformIndexHtml(req.url, source);
            const { routeStudio } = await server.ssrLoadModule("/api/_lib/studio.js");
            const out = await routeStudio({
              rest: pathname === "/news-studio" ? "" : pathname.slice("/news-studio/".length),
              search: url.search,
              shell,
            });
            res.statusCode = out.status;
            if (out.status === 301) res.setHeader("Location", out.location);
            else res.setHeader("Content-Type",
              out.type === "xml" ? "application/xml; charset=utf-8"
              : out.type === "text" ? "text/plain; charset=utf-8"
              : "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(out.body || "");
          } catch (err) {
            server.ssrFixStacktrace?.(err);
            next(err);
          }
        });
      },
    },
    {
      name: "api-routes",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/api/support")) {
            const url = new URL(req.url, "http://localhost");
            req.query = Object.fromEntries(url.searchParams);
            server.ssrLoadModule("/api/support.js").then(({ default: handler }) => handler(req, res)).catch(next);
            return;
          }
          // same handler Vercel rewrites /download to
          if (req.url === "/download" || req.url?.startsWith("/download?")) {
            server.ssrLoadModule("/api/download.js").then(({ default: handler }) => handler(req, res)).catch(next);
            return;
          }
          // same as the Vercel rewrite: serve the page at /unsubscribe with
          // the query string (email, token, action) left intact
          if (req.url === "/unsubscribe" || req.url?.startsWith("/unsubscribe?")) {
            req.url = "/unsubscribe/" + req.url.slice("/unsubscribe".length);
            return next();
          }
          next();
        });
      },
    },
    {
      // News is rendered at request time, so retain an uncached alias for it.
      // Vite's HTML pages use the content-hashed stylesheet directly.
      name: "news-stylesheet-alias",
      apply: "build",
      generateBundle(_options, bundle) {
        const stylesheet = Object.values(bundle).find((asset) =>
          asset.type === "asset" &&
          (asset.names ?? [asset.name]).includes("style.css")
        );
        if (!stylesheet) this.error("Shared site stylesheet was not emitted");
        this.emitFile({ type: "asset", fileName: "assets/site.css", source: stylesheet.source });
      },
    },
    {
      // dev-only mount of the /news serverless route. In production Vercel
      // rewrites /news/* to api/news.js; here the same router runs through
      // ssrLoadModule so edits under api/ take effect without a restart.
      name: "news-dev",
      apply: "serve",
      configureServer(server) {
        process.env.NEWS_DEV = "1";
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, "http://localhost");
          const path = url.pathname;
          if (path !== "/news" && !path.startsWith("/news/")) return next();
          // same as api/news.js: read-only, and ?bare is never taken from
          // the visitor (bare is decided by the path alone below)
          if (req.method !== "GET" && req.method !== "HEAD") {
            res.statusCode = 405;
            res.setHeader("Allow", "GET, HEAD");
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end("Method Not Allowed\n");
            return;
          }
          try {
            const { routeNews } = await server.ssrLoadModule("/api/_lib/router.js");
            const query = Object.fromEntries(url.searchParams);
            const out = await routeNews({
              rest: path === "/news" ? "" : path.slice("/news/".length),
              bare: path === "/news",
              query,
            });
            if (out.status === 301) {
              res.statusCode = 301;
              res.setHeader("Location", out.location);
              res.end();
              return;
            }
            res.statusCode = out.status;
            // the router says what it returned (the sitemaps are XML)
            res.setHeader("Content-Type",
              out.type === "xml" ? "application/xml; charset=utf-8"
              : out.type === "html" || !out.type ? "text/html; charset=utf-8"
              : out.type);
            res.setHeader("Cache-Control", "no-store");
            res.end(String(out.body));
          } catch (err) {
            server.ssrFixStacktrace?.(err);
            next(err);
          }
        });
      },
    },
    {
      // dev-only sink for the offline phone capture (?capture=1):
      // the page POSTs the baked webp blobs here so they land in
      // public/assets without leaving the browser sandbox
      name: "capture-save",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__save", (req, res) => {
          const name = new URLSearchParams(req.url.split("?")[1] || "").get("name") || "";
          if (req.method !== "POST" || !/^[a-z0-9-]+\.(webp|png)$/.test(name)) {
            res.statusCode = 400;
            res.end("bad request");
            return;
          }
          const chunks = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => {
            const buf = Buffer.concat(chunks);
            fs.writeFileSync(path.join(server.config.root, "public", "assets", name), buf);
            res.end("saved " + name + " " + buf.length);
          });
        });
      },
    },
  ],
  };
});
