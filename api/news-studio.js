import fs from "node:fs/promises";
import path from "node:path";
import { routeStudio } from "./_lib/studio.js";
import { send, redirect301, param, CACHE } from "./_lib/http.js";

/* Vercel adapter. vercel.json rewrites /news-studio and /news-studio/* here
 * (real files under /news-studio/ — images, the built shell — are served
 * before rewrites apply), passing the path tail as ?p=. */

/* The built app shell. vercel.json bundles dist/news-studio/index.html with
 * this function (includeFiles); if that is ever missing, it is fetched from
 * the deployment itself, where it is a plain static file. */
let shellCache = null;
async function loadShell(req) {
  if (shellCache) return shellCache;
  try {
    shellCache = await fs.readFile(path.join(process.cwd(), "dist/news-studio/index.html"), "utf8");
  } catch {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const res = await fetch(`https://${host}/news-studio/index.html`);
    if (!res.ok) throw new Error(`shell fetch failed (${res.status})`);
    shellCache = await res.text();
  }
  return shellCache;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, { status: 405, type: "text", cache: CACHE.error, headers: { Allow: "GET, HEAD" }, body: "Method Not Allowed\n" });
  }
  let shell = null;
  try {
    shell = await loadShell(req);
    /* the visitor's own query string, minus the ?p= the rewrite added */
    const qs = new URLSearchParams(req.query || {});
    qs.delete("p");
    const search = qs.toString() ? `?${qs}` : "";
    const out = await routeStudio({ rest: param(req, "p"), search, shell });
    if (out.status === 301) return redirect301(res, out.location);
    return send(res, out);
  } catch (err) {
    console.error("[news-studio]", err);
    /* the app can still render client-side — serve the plain shell */
    if (shell) return send(res, { status: 200, cache: CACHE.error, body: shell });
    return send(res, { status: 500, type: "text", cache: CACHE.error, body: "Something went wrong\n" });
  }
}
