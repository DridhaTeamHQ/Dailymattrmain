import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      // multi-page: legal pages live at /privacypolicy and /termsandconditions
      input: {
        main: path.resolve(root, "index.html"),
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
      // dev-only sink for the offline phone capture (?capture=1):
      // the page POSTs the baked webp blobs here so they land in
      // public/assets without leaving the browser sandbox
      name: "capture-save",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__save", (req, res) => {
          const name = new URLSearchParams(req.url.split("?")[1] || "").get("name") || "";
          if (req.method !== "POST" || !/^[a-z0-9-]+\.webp$/.test(name)) {
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
});
