import { defineConfig, loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
  build: {
    rollupOptions: {
      output: {
        // the server-rendered /news pages link the site stylesheet by name,
        // so it needs a stable path; everything else stays content-hashed
        assetFileNames: (info) => {
          const names = info.names ?? (info.name ? [info.name] : []);
          return names.includes("style.css") ? "assets/site.css" : "assets/[name]-[hash][extname]";
        },
      },
      // multi-page: legal pages live at /editorialguidelines, /privacypolicy
      // and /termsandconditions
      input: {
        main: path.resolve(root, "index.html"),
        newsletter: path.resolve(root, "newsletter/index.html"),
        support: path.resolve(root, "support/index.html"),
        editorialguidelines: path.resolve(root, "editorialguidelines/index.html"),
        privacypolicy: path.resolve(root, "privacypolicy/index.html"),
        termsandconditions: path.resolve(root, "termsandconditions/index.html"),
      },
    },
  },
  server: {
    // the dev server may be launched via the 8.3 short path (DAILYM~1),
    // which fails Vite's strict fs allow-list realpath check on Windows
    fs: { strict: false },
  },
  plugins: [
    {
      // dev-only mount of the /news serverless route. In production Vercel
      // rewrites /news/* to api/news.js; here the same router runs through
      // ssrLoadModule so edits under api/ take effect without a restart.
      name: "news-dev",
      apply: "serve",
      configureServer(server) {
        process.env.NEWS_DEV = "1";
        server.middlewares.use(async (req, res, next) => {
          const path = new URL(req.url, "http://localhost").pathname;
          if (path !== "/news" && !path.startsWith("/news/")) return next();
          try {
            const { routeNews } = await server.ssrLoadModule("/api/_lib/router.js");
            const out = await routeNews({
              rest: path === "/news" ? "" : path.slice("/news/".length),
              bare: path === "/news",
            });
            if (out.status === 301) {
              res.statusCode = 301;
              res.setHeader("Location", out.location);
              res.end();
              return;
            }
            res.statusCode = out.status;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
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
